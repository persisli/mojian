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

    var VERSION = '20261005';

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

    // 字体家族 → Google Fonts css2 spec（首屏已直接引 Noto Sans SC）
    var FONT_SPECS = {
        'Noto Sans SC': 'Noto+Sans+SC:wght@400;500;700',
        'Noto Serif SC': 'Noto+Serif+SC:wght@400;600;700',
        'LXGW WenKai': 'LXGW+WenKai:wght@400;500;700',
        'JetBrains Mono': 'JetBrains+Mono:wght@400;500'
    };
    var FONT_BASE = 'https://fonts.loli.net/css2?family=';

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
     * 按需加载某个字体家族（用户切换正文字体 / 首次用到等宽字体时调用）
     * @param {string} fontFamily CSS font-family 值，取第一个家族名
     */
    function ensureFontLoaded(fontFamily) {
        var name = String(fontFamily || '').split(',')[0].replace(/["']/g, '').trim();
        var spec = FONT_SPECS[name];
        if (!spec || loadedFonts[name]) return;
        loadedFonts[name] = true;
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = FONT_BASE + spec + '&display=swap';
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
    }

    window.Mojian = window.Mojian || {};
    window.Mojian.ensureFeature = ensureFeature;
    window.Mojian.onDeferredReady = onDeferredReady;
    window.Mojian.scheduleDeferredScripts = scheduleDeferredScripts;
    window.Mojian.ensureFontLoaded = ensureFontLoaded;
})();
