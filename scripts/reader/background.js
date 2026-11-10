/**
 * reader/background.js - 背景管理 (纯色/文艺/国风/信笺 + 透明度) + 主题管理
 */

const backgroundPatterns = {
    artistic: {
        hexagon: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxOCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iLTkgLTEwIDE4IDIwIj48cGF0aCBkPSJNMCAtMTBMOC42NiAtNUw4LjY2IDVMMCAxMEwtOC42NiA1TC04LjY2IC01WiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIvPjxjaXJjbGUgY3g9IjAiIGN5PSItMTAiIHI9IjEuNSIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjguNjYiIGN5PSItNSIgcj0iMS41IiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iOC42NiIgY3k9IjUiIHI9IjEuNSIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjAiIGN5PSIxMCIgcj0iMS41IiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iLTguNjYiIGN5PSI1IiByPSIxLjUiIGZpbGw9IiNkMGQwZDAiLz48Y2lyY2xlIGN4PSItOC42NiIgY3k9Ii01IiByPSIxLjUiIGZpbGw9IiNkMGQwZDAiLz48L3N2Zz4=')",
        triangle: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIzNSIgdmlld0JveD0iMCAwIDIwIDM1Ij48cGF0aCBkPSJNMTAgMEwyMCAxNy4zMkwwIDE3LjMyWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIvPjxwYXRoIGQ9Ik0wIDE3LjMyTDIwIDE3LjMyTDEwIDM0LjY0WiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIvPjxjaXJjbGUgY3g9IjEwIiBjeT0iMCIgcj0iMS41IiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iMjAiIGN5PSIxNy4zMiIgcj0iMS41IiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iMCIgY3k9IjE3LjMyIiByPSIxLjUiIGZpbGw9IiNkMGQwZDAiLz48Y2lyY2xlIGN4PSIxMCIgY3k9IjM0LjY0IiByPSIxLjUiIGZpbGw9IiNkMGQwZDAiLz48L3N2Zz4=')",
        diamond: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDgwIDgwIj48cGF0aCBkPSJNNDAgMEw4MCA0MEw0MCA4MEwwIDQwWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIvPjxjaXJjbGUgY3g9IjQwIiBjeT0iMCIgcj0iMiIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iNDAiIHI9IjIiIGZpbGw9IiNkMGQwZDAiLz48Y2lyY2xlIGN4PSI0MCIgY3k9IjgwIiByPSIyIiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iMCIgY3k9IjQwIiByPSIyIiBmaWxsPSIjZDBkMGQwIi8+PC9zdmc+')",
        nodes: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDgwIDgwIj48bGluZSB4MT0iMCIgeTE9IjAiIHgyPSI4MCIgeTI9IjgwIiBzdHJva2U9IiNkMGQwZDAiIHN0cm9rZS13aWR0aD0iMC44Ii8+PGxpbmUgeDE9IjgwIiB5MT0iMCIgeDI9IjAiIHkyPSI4MCIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIvPjxsaW5lIHgxPSI0MCIgeTE9IjAiIHgyPSI0MCIgeTI9IjgwIiBzdHJva2U9IiNkMGQwZDAiIHN0cm9rZS13aWR0aD0iMC44Ii8+PGxpbmUgeDE9IjAiIHkxPSI0MCIgeDI9IjgwIiB5Mj0iNDAiIHN0cm9rZT0iI2QwZDBkMCIgc3Ryb2tlLXdpZHRoPSIwLjgiLz48Y2lyY2xlIGN4PSIwIiBjeT0iMCIgcj0iMyIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iMCIgcj0iMyIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjAiIGN5PSI4MCIgcj0iMyIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iODAiIHI9IjMiIGZpbGw9IiNkMGQwZDAiLz48Y2lyY2xlIGN4PSI0MCIgY3k9IjQwIiByPSIzIiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iNDAiIGN5PSIwIiByPSIyIiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iNDAiIGN5PSI4MCIgcj0iMiIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjAiIGN5PSI0MCIgcj0iMiIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iNDAiIHI9IjIiIGZpbGw9IiNkMGQwZDAiLz48L3N2Zz4=')"
    },
    // 国风：四幅整幅画面（不重复平铺），元素组合取自 bg_refer/ 参考图，风格内部自洽
    //   绢荷 / 雾竹 / 云山 / 祥云洒金
    // 注意：该 url 由消费 --bg-pattern 的 styles/base.css 解析，故 ../ 先回到项目根再进 assets/
    // meander-sun 为双层背景（sun 叠加层 + nosun 底图），size/repeat/position 由
    // applyBackground() 中的 meander-sun 分支单独下发逗号分隔值。
    chinese: {
        'silk-lotus': "url('../assets/bg/silk-lotus.svg')",
        'mist-bamboo': "url('../assets/bg/mist-bamboo.svg')",
        'cloud-mountains': "url('../assets/bg/cloud-mountains.svg')",
        'auspicious-gold': "url('../assets/bg/auspicious-gold.webp')"
    },
    // 信笺：四幅 1920x860 整幅画面，取自 bg_refer/1920x860/ 参考图
    //   鹤影青绿 / 桂花旧纸 / 回纹朱日 / 水彩荷塘
    // 统一使用 webp（同名 png 的 1/10 左右：单张 23~57KB），浏览器按需解码
    // 不等比拉伸铺满"标题栏以下的整块区域"（100% 100%），画面完整不裁切；
    // 由 body.bg-fill-below-header 让开标题栏，其余一直铺到底，状态栏关闭也不留白
    stationery: {
        'crane-hills': "url('../assets/bg/crane-hills.webp')",
        'osmanthus-kraft': "url('../assets/bg/osmanthus-kraft.webp')",
        // 回纹朱日：nosun 底图（自由拉伸）+ 朱日 sun 左上角叠加（叠加层仍是 png，仅 9KB）。
        // sun 层等比缩放：height = 容器高 × 13.7%（≈118/860），width auto 保持长宽比；
        // 位置锚定左上角、与上边线/左边线保持原图相对距离（2.25%/4.5%）。
        'meander-sun': "url('../assets/bg/meander-sun-overlay.png'), url('../assets/bg/meander-sun.webp')",
        'watercolor-pond': "url('../assets/bg/watercolor-pond.webp')"
    }
};

const defaultBackgroundColors = {
    solid: '#FAFAF8',
    artistic: '#FAFAF8',
    chinese: '#F5F5DC',
    stationery: '#FFFFFF'
};

// 每幅国风 / 信笺背景的主色（取自画面主视觉色）与配套纸底。
// 用于让标题栏 / 状态栏等界面元素"从背景取色"，不再一成不变。
const patternThemes = {
    // 国风
    'silk-lotus':      { paper: '#F2F6F5', accent: '#7FA8A0', line: '#C4D4CF' },  // 绢荷
    'mist-bamboo':     { paper: '#F4F5F4', accent: '#7E939C', line: '#C6CFD4' },  // 雾竹
    'cloud-mountains': { paper: '#F1F2F1', accent: '#7E8A8A', line: '#C9D1D0' },  // 云山
    'auspicious-gold': { paper: '#F8F5EC', accent: '#A8874A', line: '#D9CDAF' },  // 祥云洒金
    // 信笺
    'crane-hills':     { paper: '#F2F8F7', accent: '#5E9490', line: '#C4DAD6' },  // 鹤影青绿
    'osmanthus-kraft': { paper: '#EFE8D5', accent: '#9A8654', line: '#D6C9A6' },  // 桂花旧纸
    'meander-sun':     { paper: '#F1ECDE', accent: '#A8745B', line: '#DCCDB4' },  // 回纹朱日
    'watercolor-pond': { paper: '#F3F5E9', accent: '#7A9E7E', line: '#C9D8BE' }   // 水彩荷塘
};

/* ================================================================
 * 背景图延迟加载
 *
 * 背景图（信笺 4 张 webp 单张 23~57KB，首次仍需一次往返）不在首屏关键路径上：
 * 首次加载时先只落纯色底，让样式表与页面组件正常渲染；
 * 等 load 之后的空闲时段再挂 --bg-pattern，让背景图在首屏绘制完成后才开始下载。
 * 首屏之后（bgImagesUnlocked = true）用户切换背景则立即生效。
 *
 * 若浏览器本地已缓存过该背景图（7 天内、与 _headers 的 max-age 对齐），
 * 则启动时直接挂上，刷新后不会从纯色开始，也不会重新下载。
 * ================================================================ */
var bgImagesUnlocked = false;
var bgPatternDeferred = false;
var bgUnlockScheduled = false;

// 本地"该背景图已下载过"的记录（url → 首次下载完成时间）
var BG_CACHE_KEY = 'mojianBgCache';
var BG_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

/**
 * 从 `url('...')` 形式的 CSS 值里取出图片地址，并转成相对站点根的路径
 * （backgroundPatterns 里的路径是相对 styles/ 的，探针/记录需要相对页面）
 */
function bgPatternUrls(pattern) {
    var urls = [];
    if (!pattern) return urls;
    var re = /url\((['"]?)([^'")]+)\1\)/g;
    var m;
    while ((m = re.exec(pattern))) {
        urls.push(String(m[2]).replace(/^\.\.\//, ''));
    }
    return urls;
}

function readBgCacheStore() {
    try {
        return JSON.parse(localStorage.getItem(BG_CACHE_KEY) || '{}') || {};
    } catch (e) {
        return {};
    }
}

/**
 * 该组背景图是否仍在浏览器本地缓存有效期内
 */
function isBgImageCached(urls) {
    if (!urls || !urls.length) return false;
    var store = readBgCacheStore();
    var now = Date.now();
    for (var i = 0; i < urls.length; i++) {
        var ts = store[urls[i]];
        if (!ts || now - ts > BG_CACHE_TTL) return false;
    }
    return true;
}

function markBgImageCached(urls) {
    if (!urls || !urls.length) return;
    var store = readBgCacheStore();
    var now = Date.now();
    urls.forEach(function (u) { store[u] = now; });
    try {
        localStorage.setItem(BG_CACHE_KEY, JSON.stringify(store));
    } catch (e) { /* 隐私模式等写入失败时忽略 */ }
}

/**
 * 记录当前背景图的下载完成时间：图片加载成功才记账，下次刷新即可直接应用
 */
function rememberBgImageDownload() {
    var state = window.Mojian.state;
    var type = state.settings.backgroundType;
    var pattern = type !== 'solid' ? backgroundPatterns[type]?.[state.settings.backgroundPattern] : null;
    bgPatternUrls(pattern).forEach(function (u) {
        var img = new Image();
        img.onload = function () { markBgImageCached([u]); };
        img.src = u;
    });
}

/**
 * 按当前设置写入背景图相关的 CSS 变量（含"无图"的复位分支）
 */
function applyPatternCssVars() {
    var state = window.Mojian.state;
    var type = state.settings.backgroundType;
    var patternName = state.settings.backgroundPattern;
    var pattern = type !== 'solid' ? backgroundPatterns[type]?.[patternName] : null;
    var root = document.documentElement;

    if (type === 'solid' || !pattern) {
        root.style.setProperty('--bg-pattern', 'none');
        root.style.setProperty('--bg-pattern-size', 'auto');
        root.style.setProperty('--bg-pattern-repeat', 'repeat');
        root.style.setProperty('--bg-pattern-position', 'center');
        return;
    }

    root.style.setProperty('--bg-pattern', pattern);

    if (type === 'artistic') {
        // 文艺：小尺寸几何纹样，按 SVG 内在尺寸平铺
        root.style.setProperty('--bg-pattern-size', 'auto');
        root.style.setProperty('--bg-pattern-repeat', 'repeat');
        root.style.setProperty('--bg-pattern-position', 'center');
    } else if (type === 'stationery') {
        // 信笺：贴合"标题栏以下整块区域"拉伸填充（100% 100%，不等比、不裁切）
        if (patternName === 'meander-sun') {
            // 回纹朱日：双层背景——sun 在前、nosun 在后。
            // sun：height 锚定容器高（118/860≈13.72%，随网页尺寸等比），width auto 保持长宽比；
            //      位置距上边线、左边线保持原图相对距离（原 sun 内容左上角在 86,55，
            //      对应 4.5% / 6.4%，扣除边框内侧留白后取 3.5% / 5%）。
            // nosun：继续 100% 100% 自由拉伸。
            root.style.setProperty('--bg-pattern-size', 'auto 13.72%, 100% 100%');
            root.style.setProperty('--bg-pattern-repeat', 'no-repeat, no-repeat');
            root.style.setProperty('--bg-pattern-position', '3.5% 9%, center');
        } else {
            root.style.setProperty('--bg-pattern-size', '100% 100%');
            root.style.setProperty('--bg-pattern-repeat', 'no-repeat');
            root.style.setProperty('--bg-pattern-position', 'center');
        }
    } else {
        // 国风：整幅画面，铺满不平铺
        root.style.setProperty('--bg-pattern-size', 'cover');
        root.style.setProperty('--bg-pattern-repeat', 'no-repeat');
        // 祥云洒金底部有印章：cover 裁切时优先从下往上保留，垂直锚定底部（只裁顶部）
        var pos = patternName === 'auspicious-gold' ? 'center bottom' : 'center';
        root.style.setProperty('--bg-pattern-position', pos);
    }
}

/**
 * 首屏绘制完成后解锁背景图（load → 空闲时段），并补上被延迟的背景图
 */
function scheduleBgImageUnlock() {
    if (bgUnlockScheduled) return;
    bgUnlockScheduled = true;

    var unlock = function() {
        bgImagesUnlocked = true;
        if (bgPatternDeferred) {
            bgPatternDeferred = false;
            applyPatternCssVars();
            // 记账：下次刷新时若仍在 7 天缓存期内，就直接应用、不再等 load
            rememberBgImageDownload();
        }
    };
    var whenIdle = function() {
        if (window.requestIdleCallback) {
            window.requestIdleCallback(unlock, { timeout: 1500 });
        } else {
            setTimeout(unlock, 200);
        }
    };

    if (document.readyState === 'complete') {
        whenIdle();
    } else {
        window.addEventListener('load', whenIdle, { once: true });
    }
}

/**
 * 设置面板里的背景缩略图：只在对应面板被打开时按顺序逐张加载，
 * 避免一次把整组背景图全部拉下来。
 */
function hydrateBgSwatches(panel) {
    if (!panel || !panel.querySelectorAll) return;
    var pending = [];
    panel.querySelectorAll('.bg-option[data-bg-image]').forEach(function(opt) {
        if (opt.dataset.bgLoaded === '1' || opt.dataset.bgLoading === '1') return;
        opt.dataset.bgLoading = '1';
        pending.push(opt);
    });

    var loadNext = function() {
        var opt = pending.shift();
        if (!opt) return;

        var urls = opt.dataset.bgImage.split(',').map(function(u) { return u.trim(); }).filter(Boolean);
        var apply = function() {
            opt.style.backgroundImage = urls.map(function(u) { return 'url("' + u + '")'; }).join(', ');
            if (opt.dataset.bgSize) opt.style.backgroundSize = opt.dataset.bgSize;
            if (opt.dataset.bgRepeat) opt.style.backgroundRepeat = opt.dataset.bgRepeat;
            if (opt.dataset.bgPosition) opt.style.backgroundPosition = opt.dataset.bgPosition;
            opt.dataset.bgLoaded = '1';
            delete opt.dataset.bgLoading;
            loadNext();
        };

        if (!urls.length) { apply(); return; }

        // 先预载主图（叠加层很小，随样式一起请求即可），加载完再挂样式
        var img = new Image();
        img.onload = apply;
        img.onerror = apply;
        img.src = urls[0];
    };

    loadNext();
}

function applyBackground() {
    const { elements, state } = window.Mojian;
    const type = state.settings.backgroundType;
    const patternName = state.settings.backgroundPattern;
    const theme = (type === 'chinese' || type === 'stationery') ? patternThemes[patternName] : null;
    const baseColor = type === 'solid'
        ? state.settings.background
        : (theme ? theme.paper : defaultBackgroundColors[type]);
    const pattern = state.settings.backgroundType !== 'solid'
        ? backgroundPatterns[state.settings.backgroundType]?.[state.settings.backgroundPattern]
        : null;

    // 信笺：背景层只让开固定标题栏，其余一直铺到底，由 styles/base.css 的
    // body.bg-fill-below-header::before 接管边界，保证画面不被标题栏遮挡，
    // 状态栏关闭时底部也不会残留空白带。
    document.body.classList.toggle(
        'bg-fill-below-header',
        state.settings.backgroundType === 'stationery'
    );

    const opacity = state.settings.bgOpacity / 100;

    const hexToRgba = (hex, alpha) => {
        const h = hex.replace('#', '');
        const r = parseInt(h.substr(0, 2), 16);
        const g = parseInt(h.substr(2, 2), 16);
        const b = parseInt(h.substr(4, 2), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const blendColors = (foreground, background, opacity) => {
        const fg = foreground.replace('#', '');
        const bg = background.replace('#', '');
        const fgR = parseInt(fg.substr(0, 2), 16);
        const fgG = parseInt(fg.substr(2, 2), 16);
        const fgB = parseInt(fg.substr(4, 2), 16);
        const bgR = parseInt(bg.substr(0, 2), 16);
        const bgG = parseInt(bg.substr(2, 2), 16);
        const bgB = parseInt(bg.substr(4, 2), 16);
        const r = Math.round(fgR * opacity + bgR * (1 - opacity));
        const g = Math.round(fgG * opacity + bgG * (1 - opacity));
        const b = Math.round(fgB * opacity + bgB * (1 - opacity));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    const adjustColor = (color, amount) => {
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    const blockquoteBg = adjustColor(baseColor, -8);
    const codeBg = adjustColor(baseColor, -12);
    const tableHeaderBg = adjustColor(baseColor, -5);

    const bgColorWithOpacity = hexToRgba(baseColor, opacity);
    const blockquoteBgWithOpacity = hexToRgba(blockquoteBg, opacity);
    const codeBgWithOpacity = hexToRgba(codeBg, opacity);
    const tableHeaderBgWithOpacity = hexToRgba(tableHeaderBg, opacity);

    document.body.style.backgroundColor = bgColorWithOpacity;
    document.documentElement.style.setProperty('--bg-page', bgColorWithOpacity);
    document.documentElement.style.setProperty('--bg-page-solid', baseColor);
    document.documentElement.style.setProperty('--bg-pattern-opacity', opacity);

    // 背景图不在首屏关键路径上：首屏只落纯色底 + 其余界面样式，
    // 等首屏绘制完成（load → 空闲时段）再挂 --bg-pattern 开始下载背景。
    // 例外：本地已缓存过（7 天内）就直接挂上——刷新后立刻是旧图，既不闪纯色也不重新下载。
    const hasPattern = state.settings.backgroundType !== 'solid' && !!pattern;
    if (!hasPattern) {
        bgPatternDeferred = false;
        applyPatternCssVars();
    } else {
        const urls = bgPatternUrls(pattern);
        const cached = isBgImageCached(urls);
        if (bgImagesUnlocked || cached) {
            bgPatternDeferred = false;
            applyPatternCssVars();
            // 刚切换到这个背景（或缓存记录已过期）→ 记账，下次刷新即可直接应用
            if (!cached) rememberBgImageDownload();
        } else {
            bgPatternDeferred = true;
            scheduleBgImageUnlock();
        }
    }

    elements.markdownContent.style.backgroundColor = 'transparent';
    elements.markdownContent.style.backgroundImage = 'none';
    document.documentElement.style.setProperty('--bg-content', 'transparent');

    // 欢迎卡片底色统一跟随标题栏（在下方算出 blendedHeaderBg 后同步）

    const blockquotes = elements.markdownContent.querySelectorAll('blockquote');
    blockquotes.forEach(bq => {
        bq.style.backgroundColor = blockquoteBgWithOpacity;
        bq.style.backgroundImage = 'none';
    });

    const preBlocks = elements.markdownContent.querySelectorAll('pre');
    preBlocks.forEach(pre => {
        pre.style.backgroundColor = codeBgWithOpacity;
        pre.style.backgroundImage = 'none';
    });

    const inlineCodes = elements.markdownContent.querySelectorAll('code:not(pre code)');
    inlineCodes.forEach(code => {
        code.style.backgroundColor = hexToRgba(adjustColor(baseColor, -15), opacity);
    });

    const tables = elements.markdownContent.querySelectorAll('table');
    tables.forEach(table => {
        if (state.settings.backgroundType === 'solid' && baseColor.toUpperCase() === '#FAFAF8') {
            table.style.backgroundColor = 'rgb(251, 251, 251)';
        } else {
            table.style.backgroundColor = bgColorWithOpacity;
        }
        table.style.backgroundImage = 'none';
    });

    const tableHeaders = elements.markdownContent.querySelectorAll('thead, th');
    tableHeaders.forEach(th => {
        th.style.backgroundColor = tableHeaderBgWithOpacity;
        th.style.backgroundImage = 'none';
    });

    const themeBgColor = state.isDarkMode ? '#1A1A2E' : '#FAFAF8';
    const blendedHeaderBg = blendColors(baseColor, themeBgColor, opacity);
    elements.header.style.backgroundColor = blendedHeaderBg;
    elements.header.style.backgroundImage = 'none';

    // 欢迎卡片底色与标题栏保持一致（含纯色/文艺/国风/信笺各种背景）
    document.documentElement.style.setProperty('--welcome-bg', blendedHeaderBg);

    const blendedStatusBg = blendColors(baseColor, themeBgColor, opacity);
    elements.statusBar.style.backgroundColor = blendedStatusBg;
    elements.statusBar.style.backgroundImage = 'none';

    const blendedToolbarBg = blendColors(baseColor, themeBgColor, opacity);
    if (elements.editToolbar) {
        elements.editToolbar.style.backgroundColor = blendedToolbarBg;
    }

    // 标题栏 / 状态栏从当前背景"取主色"：边框线、Logo、图标强调色随画面主色变化
    const root = document.documentElement;
    const accent = theme ? theme.accent : null;
    const line = theme ? theme.line : null;
    root.style.setProperty('--pattern-accent', accent || '');
    root.style.setProperty('--pattern-line', line || '');
    root.style.setProperty('--pattern-paper', theme ? theme.paper : '');

    // 给 body 打上"取自背景主色"标记，CSS 用它切换标题栏 / 状态栏着色方案
    document.body.classList.toggle('has-pattern-theme', !!accent);
    // 深色模式由 applyTheme 单独复位该标记
    if (state.isDarkMode) {
        document.body.classList.remove('has-pattern-theme');
    }
}

function updateBackgroundSelection() {
    const { elements, state } = window.Mojian;
    elements.bgOptions.forEach(opt => {
        opt.classList.remove('selected');
        const isSolid = opt.dataset.bg === 'solid' && opt.dataset.color === state.settings.background;
        const isPattern = opt.dataset.bg === state.settings.backgroundType &&
                         opt.dataset.pattern === state.settings.backgroundPattern;
        if (isSolid || isPattern) {
            opt.classList.add('selected');
        }
    });
}

function updateBackgroundUIState() {
    const { elements, state } = window.Mojian;
    const isDisabled = state.isDarkMode;
    elements.bgTabs.forEach(tab => {
        tab.disabled = isDisabled;
        tab.style.pointerEvents = isDisabled ? 'none' : 'auto';
        tab.style.opacity = isDisabled ? '0.5' : '1';
    });
    elements.bgOptions.forEach(option => {
        option.style.pointerEvents = isDisabled ? 'none' : 'auto';
        option.style.opacity = isDisabled ? '0.5' : '1';
    });
    elements.bgOpacitySlider.disabled = isDisabled;
    elements.bgOpacitySlider.style.pointerEvents = isDisabled ? 'none' : 'auto';
    elements.bgOpacitySlider.style.opacity = isDisabled ? '0.5' : '1';
}

function loadThemePreference() {
    applyTheme();
}

function toggleTheme() {
    const { state } = window.Mojian;
    state.isDarkMode = !state.isDarkMode;
    localStorage.setItem('theme', state.isDarkMode ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', state.isDarkMode ? 'dark' : 'light');
    if (state.isDarkMode) {
        window.Mojian.applyTheme();
    } else {
        window.Mojian.applyBackground();
    }
    // Mermaid 图按新主题重画（暗色/亮色的图内配色不同）
    if (window.Mojian.refreshMermaidTheme) {
        window.Mojian.refreshMermaidTheme();
    }
}

function applyTheme() {
    const { elements, state } = window.Mojian;
    document.documentElement.setAttribute('data-theme', state.isDarkMode ? 'dark' : 'light');

    if (state.isDarkMode) {
        const darkBg = '#0a0e1a';
        const darkerBg = '#0d0d1a';
        const tableHeaderBg = '#1a1a2e';

        // 深色模式不走"背景取色"：摘掉标记并复位主题变量
        document.body.classList.remove('has-pattern-theme');
        document.body.classList.remove('bg-fill-below-header');
        document.documentElement.style.setProperty('--pattern-accent', '');
        document.documentElement.style.setProperty('--pattern-line', '');
        document.documentElement.style.setProperty('--pattern-paper', '');

        document.body.style.backgroundColor = darkBg;
        elements.markdownContent.style.backgroundColor = 'transparent';
        elements.markdownContent.style.backgroundImage = 'none';
        elements.header.style.backgroundColor = darkBg;
        elements.header.style.backgroundImage = 'none';
        // 欢迎卡片跟随标题栏（深色模式同为 darkBg）
        document.documentElement.style.setProperty('--welcome-bg', darkBg);
        elements.statusBar.style.backgroundColor = darkBg;
        elements.statusBar.style.backgroundImage = 'none';
        if (elements.editToolbar) {
            elements.editToolbar.style.backgroundColor = darkBg;
        }
        document.documentElement.style.setProperty('--bg-page', darkBg);
        document.documentElement.style.setProperty('--bg-page-solid', darkBg);
        document.documentElement.style.setProperty('--bg-content', 'transparent');
        document.documentElement.style.setProperty('--bg-pattern', 'none');
        document.documentElement.style.setProperty('--bg-pattern-opacity', 1);

        const blockquotes = elements.markdownContent.querySelectorAll('blockquote');
        blockquotes.forEach(bq => {
            bq.style.backgroundColor = darkerBg;
            bq.style.backgroundImage = 'none';
        });

        const preBlocks = elements.markdownContent.querySelectorAll('pre');
        preBlocks.forEach(pre => {
            pre.style.backgroundColor = darkerBg;
            pre.style.backgroundImage = 'none';
        });

        const inlineCodes = elements.markdownContent.querySelectorAll('code:not(pre code)');
        inlineCodes.forEach(code => {
            code.style.backgroundColor = '#1a1a2e';
        });

        const tables = elements.markdownContent.querySelectorAll('table');
        tables.forEach(table => {
            table.style.backgroundColor = darkBg;
            table.style.backgroundImage = 'none';
        });

        const tableHeaders = elements.markdownContent.querySelectorAll('thead, th');
        tableHeaders.forEach(th => {
            th.style.backgroundColor = tableHeaderBg;
            th.style.backgroundImage = 'none';
        });
    } else {
        applyBackground();
    }
}

window.Mojian = window.Mojian || {};
Mojian.applyBackground = applyBackground;
Mojian.applyPatternCssVars = applyPatternCssVars;
Mojian.hydrateBgSwatches = hydrateBgSwatches;
Mojian.updateBackgroundSelection = updateBackgroundSelection;
Mojian.updateBackgroundUIState = updateBackgroundUIState;
Mojian.loadThemePreference = loadThemePreference;
Mojian.toggleTheme = toggleTheme;
Mojian.applyTheme = applyTheme;
