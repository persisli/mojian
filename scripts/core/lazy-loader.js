/**
 * core/lazy-loader.js - 首屏之外的脚本 / 字体按需加载
 *
 * 背景：主页（欢迎页）只需要 i18n + 状态 + 渲染 + 主题 + 文件读取这一小撮脚本，
 * 而编辑器 / 工具栏 / 导出 / URL 导入 / 代码高亮 / 矩阵雨等脚本首屏一律用不到，
 * 却是以 defer 形式排在关键路径上，要等下载 + 解析完才触发 DOMContentLoaded → init()。
 *
 * 这里把它们挪出首屏：
 *   1. 空闲时段（requestIdleCallback，带 timeout 兜底）自动注入；
 *   2. 用户真正触发相关交互时（编辑 / 导出 / 矩阵雨）由 ensureFeature 提前注入，
 *      保证「第一次点击就能用」，不必等空闲时机。
 *
 * 依赖顺序：所有文件用 async=false 动态插入，浏览器按插入顺序执行，
 * 与原先 defer 批次的相对顺序保持一致。
 */

(function () {
    'use strict';

    var VERSION = '20261012';

    // ---- 延后加载清单（顺序即执行顺序）----
    var PRISM_FILES = [
        'libs/prism.js',
        'libs/prism-javascript.min.js',
        'libs/prism-python.min.js',
        'libs/prism-css.min.js',
        'libs/prism-bash.min.js',
        'libs/prism-json.min.js',
        'libs/prism-markdown.min.js',
        'libs/prism-yaml.min.js',
        'libs/prism-sql.min.js',
        'libs/prism-java.min.js',
        'libs/prism-c.min.js',
        'libs/prism-cpp.min.js',
        'libs/prism-go.min.js',
        'libs/prism-rust.min.js',
        'libs/prism-typescript.min.js',
        'libs/prism-jsx.min.js',
        'libs/prism-tsx.min.js'
    ];

    var EDITOR_FILES = [
        'libs/turndown.js',
        'scripts/editor/html-to-md.js',
        'scripts/editor/toolbar.js',
        'scripts/editor/history.js',
        'scripts/editor/editor.js'
    ];

    // 功能分组：交互发生时确保相关脚本已就绪
    var GROUPS = {
        editor: EDITOR_FILES,
        export: ['scripts/export/export.js'],
        urlImporter: ['scripts/reader/url-importer.js'],
        matrixRain: ['scripts/easter-eggs/matrix-rain.js'],
        prism: PRISM_FILES
    };

    var DEFERRED_FILES = [].concat(
        EDITOR_FILES,
        GROUPS.export,
        GROUPS.urlImporter,
        GROUPS.matrixRain,
        PRISM_FILES
    );

    // ============================================================
    // 字体加载：系统优先匹配 → 未命中才下载 → 下载中提示 → 完成后应用
    // ============================================================
    // 每个字体家族的配置：
    //   families  : 用于 document.fonts.check 探测的候选家族名（按顺序，含系统字体）
    //   download  : 需要联网下载时的 CSS 列表（系统已装则不会用到）
    //   weights   : 声明给 Google Fonts 的字重（已按 CSS 实际用量精简）
    //   label     : 用户提示文案里的字体名
    //
    // 字重精简依据：
    //   正文系 400（默认）+ 700（strong / 粗体标题）；500 仅为 UI 小字，并入 400 渲染
    //   标题系（走 --ui-serif 的 UI 元素）只用 600
    //   等宽仅用于代码块，只用 400
    //   霞鹜文楷官方包只提供 300/400/700，取 regular + bold
    var LXGW_BASE = 'https://fastly.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/';
    var FONT_CONFIG = {
        'Noto Sans SC': {
            label: '思源黑体',
            families: ['Noto Sans SC', 'Source Han Sans CN', 'Microsoft YaHei', 'PingFang SC'],
            download: ['https://fonts.googleapis.cn/css2?family=Noto+Sans+SC:wght@400;700&display=swap'],
            systemFallback: '"Source Han Sans CN", "Microsoft YaHei", "PingFang SC", sans-serif'
        },
        'Noto Serif SC ExtraLight': {
            label: '思源宋体',
            // 说明：本应用以 ExtraLight（细字重）为思源宋体的正文观感。
            //  - 本地静态版思源宋体注册为独立家族名「Noto Serif SC ExtraLight」，
            //    装了就能直接命中，不产生任何网络请求（正文本身即细体字形）；
            //  - 未装时走 webfont：请求 wght@200..700 可变字体区间。分片结构与静态字重
            //    完全相同（文件数不增加），每个分片内含 200-700 全字重轴：
            //      · 正文（JS 设置 font-weight:200）→ ExtraLight 实例
            //      · strong/粗体 700、标题 600 → 各自实例，互不挤占
            //  - webLoadName：Google Fonts @font-face 的家族名（与本地静态名不同），
            //    document.fonts.load 预热分片时必须用它。
            //  注意：不要把 SimSun / Songti SC 列入 families——它们在系统上普遍存在，
            //  会让 document.fonts.check 立即命中，导致 webfont 被跳过、渲染回退到系统宋体。
            families: ['Noto Serif SC ExtraLight', 'Noto Serif SC', 'Source Han Serif CN'],
            webLoadName: 'Noto Serif SC',
            download: ['https://fonts.googleapis.cn/css2?family=Noto+Serif+SC:wght@200..700&display=swap'],
            systemFallback: '"Source Han Serif CN", SimSun, "Songti SC", serif'
        },
        'LXGW WenKai': {
            label: '霞鹜文楷',
            families: ['LXGW WenKai', 'LXGW WenKai Lite', 'LXGW WenKai GB'],
            download: [LXGW_BASE + 'lxgwwenkai-regular.css', LXGW_BASE + 'lxgwwenkai-bold.css'],
            systemFallback: 'sans-serif'
        }
    };

    // 旧存档兼容：早先版本的思源宋体 data-value 首项是「Noto Serif SC」（不带字重后缀），
    // 解析 FONT_CONFIG 时映射到新键，保证老用户存档仍能触发 webfont 下载。
    FONT_CONFIG['Noto Serif SC'] = FONT_CONFIG['Noto Serif SC ExtraLight'];

    // 首屏只需下载默认正文字体（思源黑体），其余切到时再取
    var DEFAULT_FONT = 'Noto Sans SC';

    var loadedFiles = {};
    var loadedFonts = {};
    var readyCallbacks = [];
    var idleScheduled = false;

    function inject(url) {
        if (loadedFiles[url]) return loadedFiles[url];
        loadedFiles[url] = new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            script.src = url + '?v=' + VERSION;
            script.async = false; // 动态插入时按插入顺序执行，保证依赖顺序
            script.onload = function () { resolve(url); };
            script.onerror = function () {
                delete loadedFiles[url];
                reject(new Error('Lazy load failed: ' + url));
            };
            document.head.appendChild(script);
        });
        return loadedFiles[url];
    }

    function loadGroup(name) {
        var files = GROUPS[name];
        if (!files) return Promise.resolve();
        return Promise.all(files.map(inject));
    }

    function loadAll() {
        return Promise.all(DEFERRED_FILES.map(inject));
    }

    /**
     * 确保某组功能脚本已加载完成（幂等，可重复调用）
     * @param {string|string[]} names GROUPS 的键
     * @returns {Promise}
     */
    function ensureFeature(names) {
        var list = Array.isArray(names) ? names : [names];
        return Promise.all(list.map(loadGroup));
    }

    /**
     * 注册「延后脚本全部就绪」后的回调（用于补绑事件、补充渲染等）
     * @param {Function} cb
     */
    function onDeferredReady(cb) {
        if (typeof cb !== 'function') return;
        readyCallbacks.push(cb);
    }

    function flushReadyCallbacks() {
        var callbacks = readyCallbacks;
        readyCallbacks = [];
        callbacks.forEach(function (cb) {
            try {
                cb();
            } catch (e) {
                console.error('Deferred ready callback failed:', e);
            }
        });
    }

    function startDeferredLoad() {
        loadAll().then(flushReadyCallbacks).catch(function (e) {
            console.warn('Deferred scripts partially loaded:', e);
            flushReadyCallbacks();
        });
    }

    /**
     * 首屏绘制完成后在空闲时段加载延后脚本（timeout 兜底 2s，避免一直不触发）
     */
    function scheduleDeferredScripts() {
        if (idleScheduled) return;
        idleScheduled = true;
        var run = function () {
            if (!idleScheduled) return;
            idleScheduled = false;
            startDeferredLoad();
        };
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(run, { timeout: 2000 });
        } else {
            setTimeout(run, 300);
        }
    }

    /**
     * 判断某个字体家族是否已在本地系统可用（不需下载）
     * 用 document.fonts.check 探测：本地已装字体会立即返回 true。
     * 注意：本页通过 <link> 引入的 webfont 也会让 check 返回 true，因此只探测
     * 「系统可能自带」的等价家族名（如思源黑体→微软雅黑/苹方），不探测待下载的
     * webfont 家族本身，避免把「正在下载」误判为「系统已有」。
     */
    function isFontAvailableLocally(families) {
        if (!document.fonts || typeof document.fonts.check !== 'function') return false;
        // 探测用的样例文本含中英文，确保覆盖中文回退链
        var probe = '中文Aa1';
        for (var i = 0; i < families.length; i++) {
            var name = families[i];
            if (WEBFONT_FAMILIES[name]) continue;   // 跳过由本页 webfont 提供的家族
            try {
                // 两侧加引号，避免字体名中的空格被当作字体列表分隔
                if (document.fonts.check('16px "' + name + '"', probe)) return true;
            } catch (e) { /* 忽略探测异常，继续试下一个 */ }
        }
        return false;
    }

    // 由本页 webfont 提供的家族名：探测系统字体时需跳过，否则会误判为「系统已装」
    var WEBFONT_FAMILIES = {
        'Noto Sans SC': true,
        'Noto Serif SC': true,
        'Noto Serif SC ExtraLight': true,
        'LXGW WenKai': true
    };

    /**
     * 确保字体可用：系统已装直接用；否则下载。
     * @param {string} fontFamily CSS font-family 值（取首个家族名匹配配置）
     * @returns {Promise<{name:string, source:string}>} source: 'system' | 'local-cache' | 'downloaded'
     */
    function ensureFontLoaded(fontFamily) {
        var name = String(fontFamily || '').split(',')[0].replace(/["']/g, '').trim();
        var cfg = FONT_CONFIG[name];

        // 已下载过（本次会话内）直接返回
        if (loadedFonts[name] && loadedFonts[name].done) {
            return Promise.resolve({ name: name, source: 'local-cache' });
        }

        // 1) 系统已装该字体（或其等价系统字体）——不下载
        if (cfg && isFontAvailableLocally(cfg.families)) {
            loadedFonts[name] = { done: true, promise: Promise.resolve() };
            return Promise.resolve({ name: name, source: 'system' });
        }
        if (!cfg) {
            return Promise.resolve({ name: name, source: 'system' });
        }

        // 2) 未命中系统字体：下载对应的 webfont
        if (loadedFonts[name] && loadedFonts[name].promise) {
            return loadedFonts[name].promise.then(function () {
                return { name: name, source: 'downloaded' };
            });
        }

        var promise = Promise.all(cfg.download.map(function (url) {
            return new Promise(function (resolve, reject) {
                var link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = url;
                link.crossOrigin = 'anonymous';
                link.onload = function () { resolve(url); };
                link.onerror = function () {
                    console.warn('[font] 样式表加载失败:', url);
                    reject(new Error('字体样式表加载失败: ' + url));
                };
                document.head.appendChild(link);
            });
        })).then(function () {
            // 样式表就绪后，等字体文件本身真正可用（分片按需下载）。
            // 注意：预热用 @font-face 里的家族名（webLoadName），本地静态家族名与
            // webfont 的家族名不同，直接用 name 会找不到任何 @font-face。
            if (document.fonts && document.fonts.load) {
                return document.fonts.load('16px "' + (cfg.webLoadName || name) + '"', '中文Aa1')
                    .catch(function () { /* 个别字形缺失不影响整体可用 */ });
            }
        }).then(function () {
            loadedFonts[name].done = true;
            return { name: name, source: 'downloaded' };
        });

        loadedFonts[name] = { done: false, promise: promise };
        return promise;
    }

    Mojian.getFontLabel = function (fontFamily) {
        var name = String(fontFamily || '').split(',')[0].replace(/["']/g, '').trim();
        return (FONT_CONFIG[name] && FONT_CONFIG[name].label) || name;
    };
    Mojian.DEFAULT_FONT = DEFAULT_FONT;

    window.Mojian = window.Mojian || {};
    window.Mojian.ensureFeature = ensureFeature;
    window.Mojian.onDeferredReady = onDeferredReady;
    window.Mojian.scheduleDeferredScripts = scheduleDeferredScripts;
    window.Mojian.ensureFontLoaded = ensureFontLoaded;
})();
