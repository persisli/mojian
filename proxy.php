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
 *
 * 备用端点（可选，见 $FALLBACK_FETCH）：
 *   直连拿到目标站的 WAF 挑战页（掘金这类字节系站点对机房/共享 IP 必挑战）时，
 *   先在服务端解 SHA-256 工作量证明、带 _wafchallengeid Cookie 重抓（无需 JS 引擎）；
 *   仍解不开才改由配置的备用端点代抓。命中时响应头带 X-Proxy-Via: waf-solved / fallback。
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

// 备用抓取端点（可选，默认关闭）：
// 有些站点会给「可疑来源」——机房 / 共享 IP、非浏览器 TLS 指纹——返回一个 JS 挑战页
// （掘金等字节系站点最常见，Cloudflare 盾页同理）。浏览器能解，PHP 的 curl 解不了，
// 所以这类站点在虚拟主机上永远抓不到正文。配了这个端点后：
//   「直连拿到 WAF 挑战页」→ 自动改用它再抓一次
// 也就是说，把这一层挡路的检查交给一个「出口 IP 干净」的一方（自建 VPS / 家宽隧道 /
// 支持 JS 渲染的抓取 API），本机浏览器不用直连它，国内网络环境更省心。
//
// 用 {url} 占位目标地址（替换成 rawurlencode 之后的完整地址），例如：
//   $FALLBACK_FETCH = 'https://my-worker.example.workers.dev/?url={url}';
//   $FALLBACK_FETCH = 'https://api.scraperapi.com/?api_key=xxx&url={url}';
// 留空字符串 '' 表示不启用（行为与之前完全一致）；命中时响应头会带 X-Proxy-Via: fallback。
$FALLBACK_FETCH = '';

// 备用端点的总超时（秒）：中转链路更长，给得比直连宽一些。
// 注意「直连 12s + 备用 20s」是理论上限；实际只在直连「已经拿到 WAF 挑战页」时才走备用，
// 那时直连早就返回了，所以真实耗时 ≈ 直连耗时 + 20s，仍要留意主机的 max_execution_time。
$FALLBACK_TIMEOUT = 20;

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

/**
 * 拿到的是目标站的「反爬挑战页」吗？
 *
 * 掘金等字节系站点会给可疑来源返回约 2KB 的 JS 挑战页（waf-jschallenge / out-sha256.js），
 * Cloudflare 盾页同理。命中说明这不是内容，而是拦路虎 —— 可以改走备用端点。
 * 判定同时卡住体积：正常文章页动辄几十上百 KB，不会因为正文里出现 waf_js 字样被误判。
 */
function proxy_looks_like_waf(string $body): bool
{
    if ($body === '' || strlen($body) > 12000) {
        return false;
    }
    return preg_match(
        '/(waf-jschallenge|out-sha256\.js|waf_js|__cf_chl_|cdn-cgi\/challenge|Just a moment\.\.\.)/i',
        $body
    ) === 1;
}

/**
 * 解字节系 WAF 的 SHA-256 工作量证明，产出 _wafchallengeid Cookie 串
 *
 * 挑战页里塞着：对 i=0..1e6 求 SHA256(prefix || str(i)) == expect，命中后把
 * {v,s,d:btoa(str(i))} base64 编码成 _wafchallengeid Cookie 再 reload。
 * 浏览器靠 JS setInterval 暴力试；服务端挑的 i 通常很小（实测多为个位数），
 * PHP 直接 hash() 暴力试，毫秒级。无需 JS 引擎、无需外部服务。
 *
 * @return string|null  形如 "_wafchallengeid=..." 的 Cookie 串；解不开返回 null
 */
function proxy_solve_waf_cookie(string $challenge): ?string
{
    if (!preg_match('#cs="([A-Za-z0-9+/=]+)"#', $challenge, $m)) {
        return null;
    }
    $c = json_decode((string) base64_decode($m[1], true), true);
    if (!is_array($c) || !isset($c['v']['a'], $c['v']['c'], $c['s'])) {
        return null;
    }
    $prefix = base64_decode($c['v']['a'], true);          // 原始前缀字节
    $expect = bin2hex((string) base64_decode($c['v']['c'], true)); // 期望哈希（hex）
    if ($prefix === false || $prefix === '' || $expect === '') {
        return null;
    }
    $found = -1;
    for ($i = 0; $i <= 1000000; $i++) {
        if (hash('sha256', $prefix . (string) $i) === $expect) {
            $found = $i;
            break;
        }
    }
    if ($found < 0) {
        return null;
    }
    $c['d'] = base64_encode((string) $found);
    // 与浏览器 JSON.stringify 完全一致：不转义斜杠（否则 base64 长度对不上）
    $val = base64_encode((string) json_encode($c, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    return '_wafchallengeid=' . $val;
}

/**
 * 把一个 Cookie 写成 Netscape 格式的 jar 文件（供 curl 的 COOKIEFILE/COOKIEJAR 用）
 */
function proxy_write_cookie_jar(string $path, string $domain, string $name, string $value): void
{
    $d = ltrim($domain, '.');
    $line = '.' . $d . "\tTRUE\t/\tTRUE\t0\t" . $name . "\t" . $value . "\n";
    file_put_contents($path, "# Netscape HTTP Cookie File\n" . $line);
}

/**
 * 从 Netscape jar 里读出 "name=val; name=val" 形式的 Cookie 头（流封装分支用）
 */
function proxy_jar_to_cookie_header(string $jar): string
{
    if (!is_file($jar)) {
        return '';
    }
    $pairs = [];
    foreach (file($jar, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if ($line === '' || $line[0] === '#') {
            continue;
        }
        $f = explode("\t", $line);
        if (count($f) >= 7) {
            $pairs[] = $f[5] . '=' . $f[6];
        }
    }
    return implode('; ', $pairs);
}

/**
 * 出网抓取一个地址（首选 curl，没有扩展时退回 PHP 的 HTTP 流封装）
 *
 * 两条分支的请求形状与行为边界刻意对齐：同一套 UA / Accept / 跳转上限 / 总耗时上限 /
 * 体积上限。已知无法对齐的两点：流封装最高只到 HTTP/1.1（curl 在 https 下通常走 h2），
 * 且不支持 gzip/br 协商（所以显式声明 identity，宁可多传字节也不收压缩字节）。
 *
 * @param string $url        目标地址
 * @param string $ua         User-Agent
 * @param int    $maxBytes   响应体上限，超出即刻断开上游
 * @param int    $timeoutSec 整个传输的上限（秒）
 * @param string|null $cookie   显式 Cookie 头（curl 的 CURLOPT_COOKIE / 流封装的 Cookie: 头）
 * @param string|null $cookieJar Netscape 格式 cookie 文件路径（仅 curl：读+写，跟随跳转时自动带，并收服务端 Set-Cookie）
 * @return array{body:string,code:int,ctype:string,failed:bool,err:string,tooLarge:bool}
 */
function proxy_fetch_url(string $url, string $ua, int $maxBytes, int $timeoutSec, ?string $cookie = null, ?string $cookieJar = null): array
{
    $body     = '';
    $ctype    = '';
    $code     = 0;
    $err      = '';
    $failed   = false;
    $tooLarge = false;

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 5,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT        => $timeoutSec,
            CURLOPT_ENCODING       => '',          // 自动协商并解压 gzip/br
            CURLOPT_USERAGENT      => $ua,
            CURLOPT_SSL_VERIFYPEER => false,       // 本地调试，容忍证书链问题
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_MAXFILESIZE    => $maxBytes,   // 上游声明了 Content-Length 时可提前中断
            CURLOPT_HTTPHEADER     => [
                'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8',
            ],
        ]);
        // 用写回调自己累计（此时 CURLOPT_RETURNTRANSFER 失效，curl_exec 只返回 bool）：
        // 超过上限时回调返回 0（小于收到的块长度）就能让 curl 立刻断开，
        // 既不把超大响应读进内存，也不继续下载消耗带宽
        $grab = static function ($handle, string $chunk) use (&$body, $maxBytes, &$tooLarge): int {
            $body .= $chunk;
            if (strlen($body) > $maxBytes) {
                $tooLarge = true;
                return 0;
            }
            return strlen($chunk);
        };
        curl_setopt($ch, CURLOPT_WRITEFUNCTION, $grab);
        if ($cookie !== null) {
            curl_setopt($ch, CURLOPT_COOKIE, $cookie);
        }
        if ($cookieJar !== null) {
            // 读 jar 里已有的 Cookie 发出去（跟随跳转时每跳都带），并把服务端 Set-Cookie 写回 jar
            curl_setopt($ch, CURLOPT_COOKIEJAR, $cookieJar);
            curl_setopt($ch, CURLOPT_COOKIEFILE, $cookieJar);
        }
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
        $ctx = stream_context_create([
            'http' => [
                'method'           => 'GET',
                'timeout'          => $timeoutSec,
                'protocol_version' => '1.1',    // PHP 8 已是默认，写明确避免被 ini 改掉
                'header'           => "User-Agent: {$ua}\r\n"
                                      . "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8\r\n"
                                      . "Accept-Language: zh-CN,zh;q=0.9,en;q=0.8\r\n"
                                      . "Accept-Encoding: identity\r\n"
                                      . (function () use ($cookie, $cookieJar) {
                                          $h = $cookie ?? '';
                                          if ($cookieJar !== null) {
                                              $j = proxy_jar_to_cookie_header($cookieJar);
                                              $h = $h !== '' ? $h . '; ' . $j : $j;
                                          }
                                          return $h !== '' ? "Cookie: {$h}\r\n" : '';
                                      })(),
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
            $deadline       = microtime(true) + $timeoutSec;
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
            if ($declaredLength > $maxBytes) {
                $tooLarge = true;               // 声明就超了：一个字节都不用下
            }
            while (!$tooLarge && !$failed) {
                if (feof($fp)) {
                    break;
                }
                $remain = $deadline - microtime(true);
                if ($remain <= 0) {
                    $failed = true;
                    $err    = 'stream: total timeout (' . $timeoutSec . 's)';
                    break;
                }
                // 单次读等待不超过剩余预算，这样总耗时不会超过 $timeoutSec
                @stream_set_timeout($fp, (int) $remain, (int) (($remain - floor($remain)) * 1000000));
                $chunk = fread($fp, 65536);
                if ($chunk === false || !empty(stream_get_meta_data($fp)['timed_out'])) {
                    $failed = true;
                    $err    = 'stream: read stalled (' . $timeoutSec . 's)';
                    break;
                }
                if ($chunk === '') {
                    continue;                   // 既没数据也没 EOF：交给下一轮的剩余预算判断
                }
                $body .= $chunk;
                if (strlen($body) > $maxBytes) {
                    $tooLarge = true;
                }
            }
            fclose($fp);
        }
    } else {
        $failed = true;
        $err    = 'PHP 未启用 curl 扩展，且 allow_url_fopen=Off';
    }

    return [
        'body'     => $body,
        'code'     => $code,
        'ctype'    => $ctype,
        'failed'   => $failed,
        'err'      => $err,
        'tooLarge' => $tooLarge,
    ];
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
        'fallback' => $FALLBACK_FETCH !== '',
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

$t0    = microtime(true);
$fetch = proxy_fetch_url($url, $UA, $MAX_FETCH_BYTES, 12);
$via   = 'direct';

// 直连拿到目标站的 WAF 挑战页（掘金等字节系站点对机房/共享 IP 必挑战）：
// 先在服务端解 SHA-256 工作量证明、带 _wafchallengeid Cookie 重抓（最多两轮），
// 不需要 JS 引擎、不需要外部服务；解不开再退到 $FALLBACK_FETCH 备用端点
if (!$fetch['failed'] && !$fetch['tooLarge'] && $fetch['code'] < 400
    && proxy_looks_like_waf($fetch['body'])) {
    $jar = tempnam('/home/uploads', 'waf_');
    if ($jar === false) {
        $jar = tempnam(sys_get_temp_dir(), 'waf_');
    }
    try {
        for ($wafTry = 0; $wafTry < 2; $wafTry++) {
            $cookie = proxy_solve_waf_cookie($fetch['body']);
            if ($cookie === null) {
                break;
            }
            // 写进 jar：跟随跳转时每跳都带，并收服务端下发的验证 Cookie
            $host = (string) parse_url($url, PHP_URL_HOST);
            $eqPos = strpos($cookie, '=');
            $name = substr($cookie, 0, $eqPos);
            $val = substr($cookie, $eqPos + 1);   // base64 原值，不要 decode
            proxy_write_cookie_jar($jar, $host, $name, $val);
            $fetch = proxy_fetch_url($url, $UA, $MAX_FETCH_BYTES, 12, null, $jar);
            if ($fetch['failed'] || $fetch['tooLarge'] || $fetch['code'] >= 400) {
                break;
            }
            if (!proxy_looks_like_waf($fetch['body'])) {
                $via = 'waf-solved';
                break;
            }
        }
    } finally {
        @unlink($jar);
    }
}

// 仍被 WAF 挡且配了备用端点：再退到备用端点
if (!$fetch['failed'] && !$fetch['tooLarge'] && $fetch['code'] < 400
    && $via === 'direct' && $FALLBACK_FETCH !== '' && proxy_looks_like_waf($fetch['body'])) {
    $altUrl = str_replace('{url}', rawurlencode($url), $FALLBACK_FETCH);
    if (preg_match('#^https?://#i', $altUrl) && filter_var($altUrl, FILTER_VALIDATE_URL)) {
        $alt = proxy_fetch_url($altUrl, $UA, $MAX_FETCH_BYTES, $FALLBACK_TIMEOUT);
        // 备用端点也拿回挑战页（或失败）就当作没用：保留直连结果，前端仍会报「目标站有 WAF」
        if (!$alt['failed'] && !$alt['tooLarge'] && $alt['code'] < 400 && $alt['body'] !== ''
            && !proxy_looks_like_waf($alt['body'])) {
            $fetch = $alt;
            $via   = 'fallback';
        }
    }
}

$body     = $fetch['body'];
$code     = $fetch['code'];
$ctype    = $fetch['ctype'];
$failed   = $fetch['failed'];
$err      = $fetch['err'];
$tooLarge = $fetch['tooLarge'];

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
// direct = 直连目标站；waf-solved = 直连被 WAF 挑战页挡住、在服务端解了 SHA-256 工作量证明后重抓成功；fallback = 走了备用端点
header('X-Proxy-Via: ' . $via);
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
