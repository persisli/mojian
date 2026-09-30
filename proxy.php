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
 *   2) 限速：同一访客 IP 每 60 秒最多 10 次抓取，超出返回 429 + Retry-After，前端提示等待
 *   3) 重复链接：同一地址在 $REPEAT_TTL 秒内再次抓取不计入上述次数（响应头 X-RateLimit-Repeated: 1）
 *
 * 失败：HTTP 400/401/429/502 + 纯文本原因
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
// 公网部署时请改成一串随机字符，例如：php -r "echo bin2hex(random_bytes(16));"
// 置为空字符串 '' 表示不校验令牌（仅建议本机调试时使用）。
$PROXY_TOKEN = 'mojian-reader-proxy-token';

// 限速：同一访客 IP 在 $RATE_WINDOW 秒内最多 $RATE_MAX 次抓取，超出返回 429 让前端等待
$RATE_MAX    = 10;
$RATE_WINDOW = 60;

// 已抓取过的链接：$REPEAT_TTL 秒内再次抓取同一地址不占用上面的次数额度
// （前端也会直接复用已解析结果；这里主要覆盖「刷新页面后重新导入同一链接」的情况）
// 重复抓取仍有一个宽松上限（$RATE_MAX * 3 次/窗口），避免被拿同一个地址刷流量
$REPEAT_TTL = 600;

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
$body  = false;
$ctype = '';
$code  = 0;
$err   = '';

if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 5,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT        => 12,
        CURLOPT_ENCODING       => '',          // 自动协商并解压 gzip/br
        CURLOPT_USERAGENT      => $UA,
        CURLOPT_SSL_VERIFYPEER => false,       // 本地调试，容忍证书链问题
        CURLOPT_SSL_VERIFYHOST => 0,
        CURLOPT_HTTPHEADER     => [
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8',
        ],
    ]);
    $body  = curl_exec($ch);
    $code  = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $ctype = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    if ($body === false) {
        $err = 'curl: ' . curl_error($ch) . ' (errno ' . curl_errno($ch) . ')';
    }
    curl_close($ch);
} elseif (ini_get('allow_url_fopen')) {
    $ctx = stream_context_create([
        'http' => [
            'method'          => 'GET',
            'timeout'         => 12,
            'header'          => "User-Agent: {$UA}\r\nAccept: */*\r\nAccept-Language: zh-CN,zh;q=0.9\r\n",
            'follow_location' => 1,
            'max_redirects'   => 5,
            'ignore_errors'   => true,
        ],
        'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
    ]);
    $body = @file_get_contents($url, false, $ctx);
    if (isset($http_response_header[0]) && preg_match('#\s(\d{3})\s#', $http_response_header[0], $m)) {
        $code = (int) $m[1];
    }
    foreach ((array) ($http_response_header ?? []) as $h) {
        if (stripos($h, 'content-type:') === 0) {
            $ctype = trim(substr($h, 13));
        }
    }
    if ($body === false) {
        $err = 'file_get_contents failed (allow_url_fopen 或网络不可用)';
    }
} else {
    $err = 'PHP 未启用 curl 扩展，且 allow_url_fopen=Off';
}

$elapsed = (int) round((microtime(true) - $t0) * 1000);

if ($body === false) {
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
header('Access-Control-Allow-Origin: *');
// 直接在本机打开本地址查看抓取结果时，禁止执行上游页面自带的脚本
// （统计/广告/推送脚本），既避免控制台噪声也避免第三方追踪
header("Content-Security-Policy: script-src 'none'; object-src 'none'; frame-src 'none'");
echo $body;
