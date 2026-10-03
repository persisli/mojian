/**
 * reader/mermaid.js - Mermaid 图渲染
 *
 * 预览（阅读）模式下，围栏代码块内容若是 Mermaid 语法，则替换为渲染好的图；
 * 编辑模式下自动切回源码，方便直接修改。
 *
 * 识别规则：
 *   1) 语言标记为 mermaid / mmd → 直接视为 Mermaid
 *   2) 代码以 Mermaid 图类型关键字（graph / flowchart / sequenceDiagram …）开头，
 *      且没有语言标记或标记为泛型（text / hljs / code 等）→ 视为 Mermaid
 * 解析失败时自动降级为普通代码块，不丢原文。
 *
 * 渲染结果结构（阅读模式）：
 *   <div class="mermaid-block">
 *     <div class="mermaid-diagram">…svg…</div>
 *     <pre class="mermaid-source"><code class="language-mermaid">原文</code></pre>
 *   </div>
 * 源码 pre 始终保留在 DOM 里（CSS 隐藏），导出 / 切回编辑模式时即可原样还原成围栏代码块。
 */

(function () {
    'use strict';

    var SCRIPT_SRC = 'libs/mermaid.min.js';

    // 语言标记命中即视为 Mermaid
    var MERMAID_LANGS = { mermaid: 1, mmd: 1, 'mermaid-js': 1 };
    // 泛型语言标记：这类标记不排斥「按内容猜测」
    var GENERIC_LANGS = {
        '': 1, text: 1, txt: 1, plain: 1, plaintext: 1, code: 1,
        hljs: 1, none: 1, md: 1, markdown: 1
    };

    var KEYWORD_RE = /^(graph|flowchart|sequenceDiagram|classDiagram(?:-v2)?|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|quadrantChart|requirementDiagram|gitGraph|mindmap|timeline|zenuml|sankey-beta|xychart-beta|block-beta|packet-beta|architecture-beta|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment)(?![\w-])/;

    // 浅色节点配色：一张图里多种不同的浅色，避免通篇一个颜色
    var SOFT_PALETTE = [
        { fill: '#ffe0e0', stroke: '#ff6b6b' },
        { fill: '#e0e8ff', stroke: '#6b8cff' },
        { fill: '#e2f6e4', stroke: '#4caf50' },
        { fill: '#fff3e0', stroke: '#ff9800' },
        { fill: '#f0e8ff', stroke: '#9b6bff' },
        { fill: '#e0f5f5', stroke: '#26a69a' },
        { fill: '#ffe9df', stroke: '#e0703a' },
        { fill: '#fde8f2', stroke: '#e05b96' }
    ];

    // 节点自带填充色、却没指定文字色时，按填充明暗取用这两个文字色保证可读
    var CONTRAST_TEXT_ON_LIGHT = '#2C3E50';
    var CONTRAST_TEXT_ON_DARK = '#FFFFFF';

    var FONT_FAMILY = '"Noto Sans SC","Source Han Sans CN",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

    // 亮色主题：以浅色为主的柔和配色（节点未显式指定样式时使用）
    var LIGHT_THEME_VARS = {
        fontSize: '15px',
        background: 'transparent',
        primaryColor: '#e8f0ff',
        primaryBorderColor: '#8aa6e8',
        primaryTextColor: '#2C3E50',
        secondaryColor: '#fdf1e3',
        secondaryBorderColor: '#e6b775',
        secondaryTextColor: '#2C3E50',
        tertiaryColor: '#e9f7ec',
        tertiaryBorderColor: '#86c693',
        tertiaryTextColor: '#2C3E50',
        mainBkg: '#e8f0ff',
        nodeBorder: '#8aa6e8',
        nodeTextColor: '#2C3E50',
        lineColor: '#8a94a6',
        textColor: '#333333',
        titleColor: '#2C3E50',
        edgeLabelBackground: '#ffffff',
        clusterBkg: '#fafbfd',
        clusterBorder: '#dfe4ec',
        // 时序图
        actorBkg: '#e8f0ff',
        actorBorder: '#8aa6e8',
        actorTextColor: '#2C3E50',
        actorLineColor: '#c3cbd8',
        signalColor: '#4a5568',
        signalTextColor: '#2C3E50',
        labelBoxBkgColor: '#e8f0ff',
        labelBoxBorderColor: '#8aa6e8',
        labelTextColor: '#2C3E50',
        loopTextColor: '#2C3E50',
        noteBkgColor: '#fff8e1',
        noteBorderColor: '#e8c46a',
        noteTextColor: '#6b5b1f',
        activationBkgColor: '#e2f6e4',
        activationBorderColor: '#86c693',
        // 甘特图
        sectionBkgColor: '#f7f9fc',
        altSectionBkgColor: '#ffffff',
        sectionBkgColor2: '#fff8e1',
        taskBkgColor: '#e8f0ff',
        taskTextColor: '#2C3E50',
        taskTextLightColor: '#2C3E50',
        taskBorderColor: '#8aa6e8',
        activeTaskBkgColor: '#e2f6e4',
        activeTaskBorderColor: '#86c693',
        doneTaskBkgColor: '#eceff4',
        doneTaskBorderColor: '#c3cbd8',
        critBkgColor: '#ffe0e0',
        critBorderColor: '#ff6b6b',
        todayLineColor: '#ff6b6b',
        gridColor: '#e6e9ef',
        // 饼图 / 统计：多种浅色轮转
        pie1: '#e0e8ff', pie2: '#ffe0e0', pie3: '#e2f6e4', pie4: '#fff3e0',
        pie5: '#f0e8ff', pie6: '#e0f5f5', pie7: '#ffe9df', pie8: '#fde8f2',
        pie9: '#e8ecf3', pie10: '#eef7e0', pie11: '#e6f0fb', pie12: '#fdf3d9',
        pieTitleTextColor: '#2C3E50',
        pieSectionTextColor: '#2C3E50',
        pieLegendTextColor: '#2C3E50',
        pieStrokeColor: '#ffffff',
        pieOuterStrokeColor: '#dfe4ec'
    };

    var DARK_THEME_VARS = {
        fontSize: '15px',
        background: 'transparent'
    };

    /* ================================================================
     * 懒加载 mermaid
     * ================================================================ */

    var loadPromise = null;
    var appliedTheme = null;
    var renderSeq = 0;

    function ensureMermaid() {
        if (window.mermaid && typeof window.mermaid.render === 'function') {
            return Promise.resolve(window.mermaid);
        }
        if (loadPromise) return loadPromise;

        loadPromise = new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            script.src = SCRIPT_SRC;
            script.async = true;
            script.onload = function () {
                if (window.mermaid && typeof window.mermaid.render === 'function') {
                    resolve(window.mermaid);
                } else {
                    loadPromise = null;
                    reject(new Error('mermaid 未正确加载'));
                }
            };
            script.onerror = function () {
                loadPromise = null;
                reject(new Error('无法加载 ' + SCRIPT_SRC));
            };
            document.head.appendChild(script);
        });
        return loadPromise;
    }

    function buildConfig(isDark) {
        return {
            startOnLoad: false,
            securityLevel: 'strict',
            theme: isDark ? 'dark' : 'base',
            themeVariables: isDark ? DARK_THEME_VARS : LIGHT_THEME_VARS,
            fontFamily: FONT_FAMILY,
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis',
                padding: 12,
                nodeSpacing: 40,
                rankSpacing: 50
            },
            sequence: { useMaxWidth: true, mirrorActors: false },
            er: { useMaxWidth: true },
            journey: { useMaxWidth: true },
            gantt: { useMaxWidth: true },
            pie: { useMaxWidth: true },
            mindmap: { useMaxWidth: true },
            timeline: { useMaxWidth: true }
        };
    }

    function applyConfig(mermaid, isDark) {
        var key = isDark ? 'dark' : 'light';
        if (appliedTheme === key) return;
        mermaid.initialize(buildConfig(isDark));
        appliedTheme = key;
    }

    /* ================================================================
     * 识别
     * ================================================================ */

    function langOf(code) {
        var cls = String((code && code.className) || '');
        var m = cls.match(/(?:^|\s)(?:language|lang)-([\w+#.-]+)/i);
        return m ? m[1].toLowerCase() : '';
    }

    /** 代码块内容是否呈现 Mermaid 格式 */
    function isMermaidSource(code, lang) {
        var src = String(code || '').replace(/\u200B/g, '').replace(/^\s+/, '');
        if (!src) return false;
        var l = String(lang || '').toLowerCase();
        if (MERMAID_LANGS[l]) return true;
        if (!(l in GENERIC_LANGS)) return false;   // 明确标了别的语言，不猜
        return KEYWORD_RE.test(src);
    }

    function isDarkMode() {
        var state = window.Mojian && window.Mojian.state;
        if (state && typeof state.isDarkMode === 'boolean') return state.isDarkMode;
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    /* ================================================================
     * DOM 结构
     * ================================================================ */

    /** 取「整个代码块」对应的最外层节点（增强过的代码块要连同标题栏、行号一起替换） */
    function outerNodeOf(node) {
        if (!node) return null;
        if (node.tagName !== 'PRE' && node.closest) {
            var pre = node.closest('pre');
            if (pre) node = pre;
        }
        var parent = node.parentElement;
        if (parent && parent.classList && parent.classList.contains('code-wrapper')) return parent;
        return node;
    }

    function rawCodeOf(code) {
        // 统一走 getCodeText：编辑器里粘贴产生的 <br> / <div> 也要能还原成换行，
        // 否则源码会被挤成一行导致 Mermaid 解析失败
        var text = (window.Mojian.getCodeText && code)
            ? window.Mojian.getCodeText(code)
            : String((code && code.textContent) || '');
        return text
            .replace(/\u200B/g, '')
            .replace(/^[\s\uFEFF]+/, '')
            .replace(/[\s\u200B]+$/, '');
    }

    function createBlock(pre) {
        var code = pre.querySelector('code') || pre;
        var raw = rawCodeOf(code);
        if (!raw) return null;

        var block = document.createElement('div');
        block.className = 'mermaid-block is-pending';
        block.contentEditable = 'false';

        var diagram = document.createElement('div');
        diagram.className = 'mermaid-diagram';
        diagram.contentEditable = 'false';

        // 源码常驻 DOM：导出 / 编辑模式都靠它还原成围栏代码块。
        // 结构与普通代码块完全一致（MERMAID 标题栏 + 行号 + 下载/复制），
        // 这样编辑模式下切出来看和别的代码块一样，不会像"缺胳膊少腿"的空块。
        var sourcePre = null;
        if (window.Mojian.createCodeBlockElement) {
            sourcePre = window.Mojian.createCodeBlockElement('mermaid', raw, true).pre;
        } else {
            sourcePre = document.createElement('pre');
            sourcePre.className = 'code-block-enhanced';
            var fallbackCode = document.createElement('code');
            fallbackCode.className = 'language-mermaid';
            fallbackCode.textContent = raw;
            sourcePre.appendChild(fallbackCode);
        }
        sourcePre.classList.add('mermaid-source');

        block.appendChild(diagram);
        block.appendChild(sourcePre);

        var outer = outerNodeOf(pre);
        if (outer && outer.parentNode) {
            outer.parentNode.replaceChild(block, outer);
        } else {
            return null;
        }
        return itemOf(block);
    }

    function itemOf(block) {
        return {
            block: block,
            diagram: block.querySelector('.mermaid-diagram'),
            sourcePre: block.querySelector('pre.mermaid-source'),
            sourceCode: block.querySelector('pre.mermaid-source code') ||
                        block.querySelector('pre.mermaid-source')
        };
    }

    /** 降级：还原成普通代码块（解析失败 / mermaid 加载失败时） */
    function fallbackToCodeBlock(item, reason) {
        var block = item && item.block;
        var pre = item && item.sourcePre;
        if (!block || !pre || !block.isConnected || !pre.parentNode) return;
        // 失败原因挂在元素上（不打印日志），需要排查时可在控制台查看
        if (reason) pre.dataset.mermaidError = String((reason && reason.message) || reason);
        pre.classList.remove('mermaid-source');
        block.parentNode.replaceChild(pre, block);
        if (window.Mojian.enhanceCodeBlocks) window.Mojian.enhanceCodeBlocks();
    }

    /**
     * 升级「降级渲染」的 Mermaid 源码块
     *
     * 首次渲染时 editor/toolbar.js（提供 createCodeBlockElement）可能还没加载，
     * 此时源码块只能退化成裸 <pre>；等延后脚本就绪后补一次完整增强，
     * 让它和普通代码块一样带标题栏与行号。
     */
    function upgradeFallbackSourceBlocks() {
        if (!window.Mojian.createCodeBlockElement) return;
        var blocks = document.querySelectorAll('.mermaid-block');
        for (var i = 0; i < blocks.length; i++) {
            var block = blocks[i];
            var pre = block.querySelector('pre.mermaid-source');
            // 降级渲染出来的 pre 也带 code-block-enhanced 类，只能靠「有没有标题栏」判断是否已完整增强
            if (!pre || pre.querySelector('.code-block-header')) continue;
            var code = pre.querySelector('code') || pre;
            var raw = rawCodeOf(code);
            if (!raw) continue;
            var enhanced = window.Mojian.createCodeBlockElement('mermaid', raw, true).pre;
            if (!enhanced) continue;
            enhanced.classList.add('mermaid-source');
            pre.parentNode.replaceChild(enhanced, pre);
        }
    }

    /* ================================================================
     * 配色：未显式指定样式的节点轮转多种浅色 + 明暗对比修正
     * ================================================================ */

    function recordStyleIds(list, styles, fill, color) {
        String(list || '').split(',').forEach(function (raw) {
            var id = raw.trim();
            if (!id) return;
            var prev = styles[id] || {};
            styles[id] = {
                fill: fill || prev.fill || '',
                color: color || prev.color || ''
            };
        });
    }

    /**
     * 解析源码里各节点的显式样式：{ 节点id: { fill, color } }
     * style A fill:#f00,stroke:#333 / style A,B fill:#f00
     * class A,B someClass / A(text):::someClass（只有填充色信息缺失）
     */
    function parseExplicitStyles(source) {
        var styles = {};
        var lines = String(source || '').split('\n');
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var m = line.match(/^\s*style\s+((?:[^\s,]+,)*[^\s,]+)\s+(.+)$/i);
            if (m) {
                var fill = m[2].match(/(?:^|[,;\s])fill\s*:\s*([^,;\s]+)/i);
                var color = m[2].match(/(?:^|[,;\s])color\s*:\s*([^,;\s]+)/i);
                recordStyleIds(m[1], styles, fill && fill[1], color && color[1]);
                continue;
            }
            m = line.match(/^\s*class\s+([^\s]+)\s+\S+/i);
            if (m) recordStyleIds(m[1], styles, '', '');
        }
        var re = /([A-Za-z0-9_\u4e00-\u9fa5][\w\u4e00-\u9fa5-]*):::/g;
        var hit;
        while ((hit = re.exec(source))) recordStyleIds(hit[1], styles, '', '');
        return styles;
    }

    function parseColor(value) {
        var v = String(value || '').trim().toLowerCase();
        var m = v.match(/^#([0-9a-f]{3})$/);
        if (m) {
            return [parseInt(m[1].charAt(0) + m[1].charAt(0), 16),
                    parseInt(m[1].charAt(1) + m[1].charAt(1), 16),
                    parseInt(m[1].charAt(2) + m[1].charAt(2), 16)];
        }
        m = v.match(/^#([0-9a-f]{6})$/);
        if (m) {
            return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
        }
        m = v.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
        if (m) return [+m[1], +m[2], +m[3]];
        return null;
    }

    /** 0（黑）~1（白）；无法解析返回 null */
    function colorLuminance(value) {
        var rgb = parseColor(value);
        if (!rgb) return null;
        return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    }

    function applyNodeColors(item, isDark) {
        var svg = item.diagram && item.diagram.querySelector('svg');
        if (!svg) return;
        var nodes = svg.querySelectorAll('g.node');
        if (!nodes.length) return;

        var explicit = parseExplicitStyles(item.sourceCode ? item.sourceCode.textContent : '');
        var index = 0;

        Array.prototype.forEach.call(nodes, function (node) {
            var m = String(node.getAttribute('id') || '').match(/^flowchart-(.*)-\d+$/);
            if (!m) return;
            var shape = node.querySelector('rect, circle, ellipse, polygon, path');
            if (!shape) return;

            var style = explicit[m[1]];
            if (!style) {
                // 未指定样式：亮色下轮转多种浅色，避免一张图只有一个颜色
                if (isDark) return;
                var color = SOFT_PALETTE[index++ % SOFT_PALETTE.length];
                shape.style.fill = color.fill;
                shape.style.stroke = color.stroke;
                return;
            }

            // 指定了填充色却没指定文字色：按填充明暗自动换对比色文字，
            // 否则暗色主题下「浅色填充 + 浅色文字」会看不清
            if (!style.fill || style.color) return;
            var luminance = colorLuminance(style.fill);
            if (luminance === null) return;
            var textColor = '';
            if (isDark && luminance > 0.6) textColor = CONTRAST_TEXT_ON_LIGHT;
            else if (!isDark && luminance < 0.4) textColor = CONTRAST_TEXT_ON_DARK;
            if (!textColor) return;

            Array.prototype.forEach.call(
                node.querySelectorAll('.nodeLabel, .label text, .label tspan'),
                function (el) {
                    el.style.color = textColor;
                    el.style.fill = textColor;
                }
            );
        });
    }

    /* ================================================================
     * 渲染
     * ================================================================ */

    function cleanupFailedRender(id) {
        ['d' + id, id].forEach(function (domId) {
            var el = document.getElementById(domId);
            if (el && el.parentNode === document.body) el.parentNode.removeChild(el);
        });
    }

    function renderOne(mermaid, item, themeKey, isDark) {
        if (!item || !item.block.isConnected) return Promise.resolve(null);
        var code = rawCodeOf(item.sourceCode);
        if (!code) {
            fallbackToCodeBlock(item);
            return Promise.resolve(null);
        }

        var id = 'mj-mermaid-' + (++renderSeq);
        return mermaid.render(id, code).then(function (out) {
            var svg = (typeof out === 'string') ? out : (out && out.svg);
            if (!svg) throw new Error('Mermaid 返回空结果');
            if (!item.block.isConnected) return null;

            item.diagram.innerHTML = svg;
            if (out && typeof out.bindFunctions === 'function') {
                try { out.bindFunctions(item.diagram); } catch (e) { /* 交互绑定失败不影响展示 */ }
            }
            item.block.classList.remove('is-pending');
            item.block.classList.add('is-rendered');
            item.block.setAttribute('data-mermaid-theme', themeKey);
            applyNodeColors(item, isDark);
            return null;
        }).catch(function (err) {
            cleanupFailedRender(id);
            fallbackToCodeBlock(item, err);
            return null;
        });
    }

    /**
     * 渲染容器内所有 Mermaid 代码块（阅读模式调用；编辑模式请配合 setMermaidEditable）
     * @param {Element} [root] 容器，默认正文区
     * @param {{force?: boolean}} [opts] force=true 时已渲染的图也重画
     */
    function renderMermaidBlocks(root, opts) {
        opts = opts || {};
        root = root || (window.Mojian.elements && window.Mojian.elements.markdownContent);
        if (!root || typeof root.querySelectorAll !== 'function') return;

        var themeKey = isDarkMode() ? 'dark' : 'light';
        var items = [];

        // 1) 已渲染的图：主题变了（或强制）就重画
        Array.prototype.forEach.call(root.querySelectorAll('.mermaid-block'), function (block) {
            if (block.dataset.rendering === '1') return;
            if (!opts.force && block.getAttribute('data-mermaid-theme') === themeKey) return;
            items.push(itemOf(block));
        });

        // 2) 新出现的 Mermaid 代码块
        // 注意用后代选择器：编辑器生成的增强代码块结构是
        // <pre><div.code-wrapper><div.code-container><code>，code 不是 pre 的直接子元素
        Array.prototype.forEach.call(root.querySelectorAll('pre code'), function (code) {
            if (code.closest && code.closest('.mermaid-block')) return;
            if (!isMermaidSource(rawCodeOf(code), langOf(code))) return;
            // 整块替换 <pre>（而不是 code 的父节点）：编辑器生成 / 降级过的代码块里，
            // code 外面还有 .code-wrapper / .code-container 以及标题栏，必须一起换掉
            var pre = code.closest ? code.closest('pre') : null;
            var item = pre ? createBlock(pre) : null;
            if (item) items.push(item);
        });

        if (!items.length) return;
        items.forEach(function (item) { if (item && item.block) item.block.dataset.rendering = '1'; });

        ensureMermaid().then(function (mermaid) {
            var isDark = themeKey === 'dark';
            applyConfig(mermaid, isDark);
            return items.reduce(function (chain, item) {
                return chain.then(function () { return renderOne(mermaid, item, themeKey, isDark); });
            }, Promise.resolve());
        }).catch(function (err) {
            // mermaid 脚本不可用时静默降级为代码块
            items.forEach(function (item) { fallbackToCodeBlock(item, err); });
        }).then(function () {
            items.forEach(function (item) {
                if (item && item.block && item.block.isConnected) item.block.removeAttribute('data-rendering');
            });
        });
    }

    /** 主题切换后重画（背景/暗色模式变化时调用） */
    function refreshMermaidTheme() {
        renderMermaidBlocks(null, {});
    }

    /** 编辑模式下显示源码、阅读模式下显示图 */
    function setMermaidEditable(editable) {
        var md = window.Mojian.elements && window.Mojian.elements.markdownContent;
        if (!md) return;
        Array.prototype.forEach.call(md.querySelectorAll('.mermaid-block'), function (block) {
            if (editable) block.removeAttribute('contenteditable');
            else block.setAttribute('contenteditable', 'false');
        });
    }

    window.Mojian = window.Mojian || {};
    var MJ = window.Mojian;
    MJ.renderMermaidBlocks = renderMermaidBlocks;
    MJ.refreshMermaidTheme = refreshMermaidTheme;
    MJ.setMermaidEditable = setMermaidEditable;
    MJ.mermaidIsSource = isMermaidSource;
    MJ.ensureMermaid = ensureMermaid;
    MJ.upgradeFallbackSourceBlocks = upgradeFallbackSourceBlocks;

    // 延后脚本（toolbar.js）就绪后，把降级渲染的源码块补成完整代码块
    if (typeof MJ.onDeferredReady === 'function') {
        MJ.onDeferredReady(upgradeFallbackSourceBlocks);
    }
})();
