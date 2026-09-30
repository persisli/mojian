<?php
/**
 * proxy.php - 本地同源抓取代理
 *
 * 用途：浏览器同源策略下无法直接抓取新闻站点（No 'Access-Control-Allow-Origin'），
 *       由本脚本在服务端代取，前端只需请求同源的 proxy.php，不再有跨域问题。
 *
 * 启动：在与 index.html 同目录下执行
 *         php -S localhost:8081
 *       然后浏览器打开 http://localhost:8081/index.html
 *       建议开启多进程（PHP 内置服务器默认单线程，抓取期间会阻塞其它请求）：
 *         PowerShell:  $env:PHP_CLI_SERVER_WORKERS=4; php -S localhost:8081
 *
 * 用法：
 *   proxy.php?ping=1                            探活，立即返回 JSON，不做任何外网请求（不需要令牌）
 *   proxy.php?url=https%3A%2F%2F...&token=xxx   抓取目标，原样返回上游响应体（保留 charset）
 *
 * 鉴权与限速（只作用于 url= 抓取，ping 不受影响）：
 *   1) 令牌：需带 ?token=xxx（或请求头 X-Proxy-Token），与脚本顶部 $PROXY_TOKEN 一致，否则 401
 *   2) 同源：只接受本站页面发起的请求（按 Sec-Fetch-Site / Origin / Referer 判断），跨站一律 403
 *   3) 限速：同一访客 IP 每 60 秒最多 10 次抓取，超出返回 429 + Retry-After，前端提示等待
 *   4) 重复链接：同一地址在 $REPEAT_TTL 秒内再次抓取不计入上述次数（响应头 X-RateLimit-Repeated: 1）
 *   5) 体积：单次响应体上限 $MAX_FETCH_BYTES，超出即中止下载并返回 502（不占内存也不转发）
 *
 * 失败：HTTP 400/401/403/429/502 + 纯文本原因
 *       （前端会自动切换到下一个抓取通道；429 限速、401 令牌错误除外，会直接提示用户）
 */

declare(strict_types=1);

// 内置服务器是单线程的，显式关闭长连接，避免请求互相排队
header('Connection: close');
header('Cache-Control: no-store');

/* ================================================================
 * 配置
 * ================================================================ */

// 【务必修改】访问令牌：必须与 scripts/reader/url-importer.js 里的 PROXY_TOKEN 完全一致。
// 下面的值是公开的占位符（README 里不再列出具体值），公网部署前请换成随机串：
//   php -r "echo bin2hex(random_bytes(16));"
// HTML 页面里拿不到真正的秘密，所以令牌只用于挡住「扫到 /proxy.php 就白用」的盲扫，
// 真正的防线是：同源校验 + 限速 + 服务端体积上限（如需强保护，请给整站加认证）。
// 置为空字符串 '' 表示不校验令牌（仅建议本机调试时使用）。
$PROXY_TOKEN = 'mojian-reader-proxy-token';

// 限速：同一访客 IP 在 $RATE_WINDOW 秒内最多 $RATE_MAX 次抓取，超出返回 429 让前端等待
$RATE_MAX    = 10;
$RATE_WINDOW = 60;

// 已抓取过的链接：$REPEAT_TTL 秒内再次抓取同一地址不占用上面的次数额度
// （前端也会直接复用已解析结果；这里主要覆盖「刷新页面后重新导入同一链接」的情况）
// 重复抓取仍有一个宽松上限（$RATE_MAX * 3 次/窗口），避免被拿同一个地址刷流量
$REPEAT_TTL = 600;

// 单次响应的体积上限（与前端 MAX_HTML_BYTES 对齐）：
// 一旦超过就立刻断开上游连接并返回 502，避免被别人拿大文件消耗带宽与内存
$MAX_FETCH_BYTES = 8 * 1024 * 1024;

// 同源校验：只接受「本站页面」发起的抓取，挡住其它网站把这里当免费代理／肉鸡。
// 浏览器会强制带上 Sec-Fetch-Site，第三方网页无法伪造，因此这一项不影响本站的正常调用
// （前端、地址栏直接打开 proxy.php?url=... 都能通过）。
// 置 false 表示：连没有来源头（curl / 脚本直连）的请求也一并拒绝；
// 默认 true 是为了方便用 curl 自检 —— 注意这些头能被脚本伪造，
// 所以要挡脚本滥用请依赖随机令牌 + 限速 + 域名白名单／整站认证。
$ALLOW_NO_ORIGIN = true;

// 反向代理 / 多域名部署时的逃生口：当反代改写了 Host 导致本站 Origin 对不上，
// 把本站域名填进来（小写，可带端口），例如 ['mojian.example.com', 'example.com:8443']
$EXTRA_ALLOWED_HOSTS = [];

// 限速计数文件目录（默认系统临时目录；也可改成站点外的可写目录）
$RATE_DIR = sys_get_temp_dir() . '/mojian-proxy-rate';

// 站点跑在 Cloudflare / Nginx 反代后面时置为 true：
// 用 CF-Connecting-IP / X-Forwarded-For 的第一个地址当访客 IP。
// 直连公网时保持 false（请求头可伪造，默认只信 REMOTE_ADDR）。
$TRUST_PROXY_HEADER = false;

/* ================================================================
 * 工具
 * ================================================================ */

/** 访客 IP（用于限速分桶） */
function proxy_client_ip(bool $trustHeader): string
{
    if ($trustHeader) {
        $cf = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? '';
        if (is_string($cf) && $cf !== '') {
            return trim($cf);
        }
        $xff = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
        if (is_string($xff) && $xff !== '') {
            return trim(explode(',', $xff)[0]);
        }
    }
    return (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
}

/** 本站自身的 host:port（规范化成小写并补上默认端口），用于和 Origin / Referer 比对 */
function proxy_self_authority(bool $trustProxy): string
{
    $host = strtolower(trim((string) ($_SERVER['HTTP_HOST'] ?? '')));
    if ($host === '') {
        return '';
    }
    if (strpos($host, ':') !== false) {
        return $host;                                    // 已经带了端口（含 IPv6 的 [::1]:8081）
    }
    $https = (!empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off')
        || (int) ($_SERVER['SERVER_PORT'] ?? 0) === 443
        || ($trustProxy && strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https');
    return $host . ':' . ($https ? 443 : (int) ($_SERVER['SERVER_PORT'] ?? 80));
}

/**
 * 把错误信息压成可安全当 UTF-8 输出的 ASCII
 *
 * 系统本地化的报错（例如中文 Windows 的 getaddrinfo 提示）是 GBK 字节，
 * 直接拼进 charset=utf-8 的响应会变成乱码；这里把非 ASCII 字节折成 '?'，
 * 保留真正有用的部分（函数名、URL、errno 都是 ASCII）。
 */
function proxy_ascii_safe(string $text): string
{
    $out = '';
    for ($i = 0, $n = strlen($text); $i < $n; $i++) {
        $c = $text[$i];
        $o = ord($c);
        $out .= ($o === 9 || $o === 10 || $o === 13 || ($o >= 32 && $o <= 126)) ? $c : '?';
    }
    return (string) preg_replace('/\?{2,}/', '?', $out);
}

/** 从 Origin / Referer 这类完整地址里取出 host:port；取不到（含 Origin: null）返回 '' */
function proxy_url_authority(string $url): string
{
    $parts = parse_url($url);
    if (!is_array($parts) || empty($parts['host'])) {
        return '';
    }
    $scheme = strtolower((string) ($parts['scheme'] ?? 'http'));
    $port   = (int) ($parts['port'] ?? ($scheme === 'https' ? 443 : 80));
    return strtolower((string) $parts['host']) . ':' . $port;
}

/**
 * 同源校验：只放行本站页面（或直接在地址栏打开）发起的抓取
 *
 * @return string '' 表示放行；否则是拒绝原因（写进 403 响应体）
 */
function proxy_origin_deny_reason(bool $allowNoOrigin, array $extraHosts, bool $trustProxy): string
{
    // 1) Sec-Fetch-Site 由浏览器强制写入，第三方网页伪造不了：
    //    none = 地址栏/书签直接打开，same-origin = 本站页面发起；其余（cross-site / same-site）一律拒绝
    $site = strtolower(trim((string) ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '')));
    if ($site !== '') {
        if ($site !== 'none' && $site !== 'same-origin') {
            return 'cross-site request blocked (Sec-Fetch-Site: ' . $site . ')';
        }
        return '';
    }

    // 2) 浏览器没给 Sec-Fetch-* 时退回 Origin / Referer 比对
    $origin  = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
    $referer = trim((string) ($_SERVER['HTTP_REFERER'] ?? ''));
    $from    = $origin !== '' ? $origin : $referer;

    if ($from === '') {
        return $allowNoOrigin
            ? ''
            : 'missing Origin/Referer (set $ALLOW_NO_ORIGIN = true to allow curl / scripts)';
    }

    $authority = proxy_url_authority($from);
    if ($authority === '') {                             // Origin: null（file:// 、沙箱 iframe 等）
        return 'null origin blocked (open the page over http(s):// instead of file://)';
    }

    $self    = proxy_self_authority($trustProxy);
    $allowed = $self !== '' && $authority === $self;
    if (!$allowed && $extraHosts) {
        foreach ($extraHosts as $one) {
            $one = strtolower(trim((string) $one));
            if ($one === '') {
                continue;
            }
            // 允许只写域名（不带端口），也允许写完整的 host:port
            if ($one === $authority || $one === explode(':', $authority)[0]) {
                $allowed = true;
                break;
            }
        }
    }
    if (!$allowed) {
        return 'cross-origin blocked (' . $from . '; if you use a reverse proxy, ' .
            'add your domain to $EXTRA_ALLOWED_HOSTS)';
    }
    return '';
}

/**
 * 计数一次请求
 *
 * @param string $url       本次要抓取的地址；同一地址在 $repeatTtl 内重复抓取不占额度
 * @return array{retry:int,remaining:int,repeated:bool} retry>0 表示已超频，需等待 retry 秒
 */
function proxy_rate_limit(string $dir, string $ip, int $max, int $window, string $url, int $repeatTtl): array
{
    // 计数目录不可用时放行（不因为限速而整个功能不可用）
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return ['retry' => 0, 'remaining' => $max, 'repeated' => false];
    }
    $file = $dir . '/rate.json';
    $fh = @fopen($file, 'c+');
    if (!$fh) {
        return ['retry' => 0, 'remaining' => $max, 'repeated' => false];
    }

    $retry = 0;
    $remaining = $max;
    $repeated = false;
    $repeatLimit = $max * 3;                 // 重复抓取的宽松上限（/窗口）
    $hash = substr(sha1($url), 0, 16);
    $now = time();

    if (flock($fh, LOCK_EX)) {
        $data = json_decode((string) stream_get_contents($fh), true);
        if (!is_array($data)) {
            $data = [];
        }
        // 清理长时间无活动的 IP 记录（1 小时），避免统计文件无限增长
        foreach ($data as $key => $slot) {
            if (!is_array($slot) || (int) ($slot['seen'] ?? 0) + 3600 <= $now) {
                unset($data[$key]);
            }
        }

        $slot = is_array($data[$ip] ?? null) ? $data[$ip] : [];
        $slot['count'] = (int) ($slot['count'] ?? 0);
        $slot['reset'] = (int) ($slot['reset'] ?? 0);
        $slot['repeatCount'] = (int) ($slot['repeatCount'] ?? 0);
        $slot['repeatReset'] = (int) ($slot['repeatReset'] ?? 0);
        if (!is_array($slot['repeats'] ?? null)) {
            $slot['repeats'] = [];
        }
        $slot['seen'] = $now;

        // 窗口到点就地归零：不丢弃 repeats，这样「已抓取过的链接」能跨窗口记住 $repeatTtl 秒
        if ($slot['reset'] <= $now) {
            $slot['count'] = 0;
            $slot['reset'] = $now + $window;
        }
        if ($slot['repeatReset'] <= $now) {
            $slot['repeatCount'] = 0;
            $slot['repeatReset'] = $now + $window;
        }

        // 清理过期的「已抓取链接」记录
        foreach ($slot['repeats'] as $h => $ts) {
            if ((int) $ts + $repeatTtl <= $now) {
                unset($slot['repeats'][$h]);
            }
        }

        if (isset($slot['repeats'][$hash])) {
            // 同一链接的重复抓取：不计入正常额度（但仍受重复上限约束）
            if ($slot['repeatCount'] >= $repeatLimit) {
                $retry = max(1, $slot['reset'] - $now);
                $remaining = 0;
            } else {
                $slot['repeatCount']++;
                $repeated = true;
                $remaining = max(0, $max - $slot['count']);
            }
        } elseif ($slot['count'] < $max) {
            $slot['count']++;
            $slot['repeats'][$hash] = $now;
            $remaining = max(0, $max - $slot['count']);
        } else {
            $retry = max(1, $slot['reset'] - $now);
            $remaining = 0;
        }

        $data[$ip] = $slot;
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, (string) json_encode($data));
        fflush($fh);
        flock($fh, LOCK_UN);
    }
    fclose($fh);

    return ['retry' => $retry, 'remaining' => $remaining, 'repeated' => $repeated];
}

/* ---------------- 探活 ---------------- */
// 探活不校验令牌、不计限速：只回报环境信息，不发外网请求，便于部署后自检
if (isset($_GET['ping'])) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'ok'    => true,
        'php'   => PHP_VERSION,
        'curl'  => function_exists('curl_init'),
        'fopen' => (bool) ini_get('allow_url_fopen'),
        'token' => $PROXY_TOKEN !== '',
        'rate'  => $RATE_MAX . '/' . $RATE_WINDOW . 's',
        'repeat'=> 'reuse ' . $REPEAT_TTL . 's',
        'max'   => $MAX_FETCH_BYTES,
        'origin'=> $ALLOW_NO_ORIGIN ? 'allow-no-origin' : 'strict',
    ]);
    exit;
}

/* ---------------- 鉴权 ---------------- */
if ($PROXY_TOKEN !== '') {
    $sent = isset($_GET['token'])
        ? (string) $_GET['token']
        : (string) ($_SERVER['HTTP_X_PROXY_TOKEN'] ?? '');
    if ($sent === '' || !hash_equals($PROXY_TOKEN, $sent)) {
        http_response_code(401);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'unauthorized: bad or missing token';
        exit;
    }
}

/* ---------------- 抓取 ---------------- */
$url = isset($_GET['url']) ? trim((string) $_GET['url']) : '';

if ($url === '' || !preg_match('#^https?://#i', $url) || !filter_var($url, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'bad url';
    exit;
}

/* ---------------- 同源校验 ---------------- */
// 只接受本站页面发起的抓取：挡住「别的网站把这里当免费代理 / 肉鸡」的滥用。
// 放在限速之前，跨站请求不占用正常额度。
$denyReason = proxy_origin_deny_reason($ALLOW_NO_ORIGIN, $EXTRA_ALLOWED_HOSTS, $TRUST_PROXY_HEADER);
if ($denyReason !== '') {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'forbidden: ' . $denyReason;
    exit;
}

/* ---------------- 限速（按访客 IP） ---------------- */
// 放在真正出网抓取之前：非法请求不占额度，超频直接 429 让前端提示等待
$rate = proxy_rate_limit(
    $RATE_DIR,
    proxy_client_ip($TRUST_PROXY_HEADER),
    $RATE_MAX,
    $RATE_WINDOW,
    $url,
    $REPEAT_TTL
);
if ($rate['retry'] > 0) {
    http_response_code(429);
    header('Content-Type: text/plain; charset=utf-8');
    header('Retry-After: ' . $rate['retry']);
    header('X-RateLimit-Limit: ' . $RATE_MAX);
    header('X-RateLimit-Remaining: 0');
    echo 'rate limited: retry after ' . $rate['retry'] . 's';
    exit;
}

// 方便自检：本次请求后还剩多少额度；重复抓取同一链接时标记 X-RateLimit-Repeated
header('X-RateLimit-Limit: ' . $RATE_MAX);
header('X-RateLimit-Remaining: ' . max(0, (int) $rate['remaining']));
if ($rate['repeated']) {
    header('X-RateLimit-Repeated: 1');
}

$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
    . '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

$t0       = microtime(true);
$body     = '';
$tooLarge = false;
$failed   = false;
$ctype    = '';
$code     = 0;
$err      = '';

if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 5,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT        => 12,
        CURLOPT_ENCODING       => '',          // 自动协商并解压 gzip/br
        CURLOPT_USERAGENT      => $UA,
        CURLOPT_SSL_VERIFYPEER => false,       // 本地调试，容忍证书链问题
        CURLOPT_SSL_VERIFYHOST => 0,
        CURLOPT_MAXFILESIZE    => $MAX_FETCH_BYTES,   // 上游声明了 Content-Length 时可提前中断
        CURLOPT_HTTPHEADER     => [
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8',
        ],
    ]);
    // 用写回调自己累计（此时 CURLOPT_RETURNTRANSFER 失效，curl_exec 只返回 bool）：
    // 超过上限时回调返回 0（小于收到的块长度）就能让 curl 立刻断开，
    // 既不把超大响应读进内存，也不继续下载消耗带宽
    $grab = static function ($handle, string $chunk) use (&$body, $MAX_FETCH_BYTES, &$tooLarge): int {
        $body .= $chunk;
        if (strlen($body) > $MAX_FETCH_BYTES) {
            $tooLarge = true;
            return 0;
        }
        return strlen($chunk);
    };
    curl_setopt($ch, CURLOPT_WRITEFUNCTION, $grab);
    $ok    = curl_exec($ch);
    $code  = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $ctype = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    if ($ok === false && !$tooLarge) {
        $failed = true;
        $err    = 'curl: ' . curl_error($ch) . ' (errno ' . curl_errno($ch) . ')';
    }
    curl_close($ch);
} elseif (ini_get('allow_url_fopen')) {
    // 没有 curl 扩展时的兜底：用 PHP 内置的 HTTP 流封装（同样是真正的 HTTP GET）。
    // 这里把「目标站看到的请求」和「行为边界」尽量对齐 curl 分支，避免同一个 URL
    // 因为请求形状/时间边界不同而拿到不一样的结果（反爬按 UA/Accept/协议版本分流最常见）。
    // 已知无法对齐的两点：流封装最高只到 HTTP/1.1（curl 在 https 下通常走 h2）、
    // 不支持 gzip/br 协商（所以显式声明 identity，宁可多传字节也不要收到压缩字节）。
    $streamTimeout = 12;                        // 与 curl 分支的 CURLOPT_TIMEOUT 对齐：整个传输的上限
    $ctx = stream_context_create([
        'http' => [
            'method'           => 'GET',
            'timeout'          => $streamTimeout,
            'protocol_version' => '1.1',        // PHP 8 已是默认，写明确避免被 ini 改掉
            'header'           => "User-Agent: {$UA}\r\n"
                                  . "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8\r\n"
                                  . "Accept-Language: zh-CN,zh;q=0.9,en;q=0.8\r\n"
                                  . "Accept-Encoding: identity\r\n",
            'follow_location'  => 1,
            'max_redirects'    => 5,
            'ignore_errors'    => true,
        ],
        'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
    ]);
    // 流封装失败只会抛一个被 @ 抑制的 warning，这里把真实原因捞出来，对齐 curl 的 errno + message
    $streamError = '';
    set_error_handler(static function (int $no, string $str) use (&$streamError): bool {
        $streamError = $str;
        return true;
    });
    $fp = @fopen($url, 'rb', false, $ctx);
    restore_error_handler();
    if ($fp === false) {
        $failed = true;
        $err    = 'stream: ' . proxy_ascii_safe($streamError !== ''
            ? $streamError
            : 'fopen failed (allow_url_fopen 或网络不可用)');
    } else {
        // 这里不用 file_get_contents 而是自己读：为了对齐 curl 的两件事
        //   1) 总耗时上限（流封装的 timeout 只是单次读写等待，慢速滴流能拖很久）
        //   2) 上游声明 Content-Length 且超限时直接拒绝，不先下载满 8MB（对齐 CURLOPT_MAXFILESIZE）
        $deadline       = $t0 + $streamTimeout;
        $declaredLength = 0;
        $headers        = (array) (stream_get_meta_data($fp)['wrapper_data'] ?? []);
        foreach ($headers as $h) {
            if (!is_string($h)) {
                continue;
            }
            // 跟随跳转时每一跳的响应头都在这里：状态行/内容类型/长度都取最后一跳
            if (preg_match('#^HTTP/\S+\s+(\d{3})#i', $h, $m)) {
                $code           = (int) $m[1];
                $ctype          = '';
                $declaredLength = 0;
                continue;
            }
            if (stripos($h, 'content-type:') === 0) {
                $ctype = trim(substr($h, 13));
                continue;
            }
            if (preg_match('#^content-length:\s*(\d+)#i', $h, $m)) {
                $declaredLength = (int) $m[1];
            }
        }
        if ($declaredLength > $MAX_FETCH_BYTES) {
            $tooLarge = true;                   // 声明就超了：一个字节都不用下
        }
        while (!$tooLarge && !$failed) {
            if (feof($fp)) {
                break;
            }
            $remain = $deadline - microtime(true);
            if ($remain <= 0) {
                $failed = true;
                $err    = 'stream: total timeout (' . $streamTimeout . 's)';
                break;
            }
            // 单次读等待不超过剩余预算，这样总耗时不会超过 $streamTimeout
            @stream_set_timeout($fp, (int) $remain, (int) (($remain - floor($remain)) * 1000000));
            $chunk = fread($fp, 65536);
            if ($chunk === false || !empty(stream_get_meta_data($fp)['timed_out'])) {
                $failed = true;
                $err    = 'stream: read stalled (' . $streamTimeout . 's)';
                break;
            }
            if ($chunk === '') {
                continue;                       // 既没数据也没 EOF：交给下一轮的剩余预算判断
            }
            $body .= $chunk;
            if (strlen($body) > $MAX_FETCH_BYTES) {
                $tooLarge = true;
            }
        }
        fclose($fp);
    }
} else {
    $failed = true;
    $err    = 'PHP 未启用 curl 扩展，且 allow_url_fopen=Off';
}

$elapsed = (int) round((microtime(true) - $t0) * 1000);

if ($tooLarge) {
    // 已经断开上游连接：这里只回报原因，不返回半截内容（前端会换下一个通道）
    http_response_code(502);
    header('Content-Type: text/plain; charset=utf-8');
    header('X-Proxy-Elapsed: ' . $elapsed);
    echo 'too large: over ' . $MAX_FETCH_BYTES . ' bytes';
    exit;
}

if ($failed) {
    http_response_code(502);
    header('Content-Type: text/plain; charset=utf-8');
    header('X-Proxy-Elapsed: ' . $elapsed);
    echo $err !== '' ? $err : 'fetch failed';
    exit;
}

if ($code >= 400) {
    http_response_code(502);
    header('Content-Type: text/plain; charset=utf-8');
    header('X-Proxy-Elapsed: ' . $elapsed);
    echo 'upstream http ' . $code;
    exit;
}

if ($ctype === '') {
    $ctype = 'text/html; charset=utf-8';
}

header('Content-Type: ' . $ctype);
header('X-Proxy-Elapsed: ' . $elapsed);
header('X-Proxy-Bytes: ' . strlen($body));
// 只允许本站来源读取响应（同源请求本来不需要这个头，这里只是给「同端口调试」留的兼容）。
// 原先无条件发 *，等于让任意网站都能读到抓取结果，与同源校验的意图相冲突。
$reqOrigin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
if ($reqOrigin !== '' && proxy_url_authority($reqOrigin) === proxy_self_authority($TRUST_PROXY_HEADER)) {
    header('Access-Control-Allow-Origin: ' . $reqOrigin);
    header('Vary: Origin');
}
// 直接在本机打开本地址查看抓取结果时，禁止执行上游页面自带的脚本
// （统计/广告/推送脚本），既避免控制台噪声也避免第三方追踪
header("Content-Security-Policy: script-src 'none'; object-src 'none'; frame-src 'none'");
echo $body;
