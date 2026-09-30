/**
 * core/paragraph-indent.js - 段前缩进
 *
 * 设计要点：
 * 1. 单位「字」= 一个全角空格 U+3000（不是 CSS text-indent，而是真的往段首塞空格）。
 *    用全角空格而非半角，是为了避免 4 个半角空格被 Markdown 当成缩进代码块。
 * 2. 取值 0-7，只作用于「正文段落」：跳过标题 / 列表 / 引用 / 代码块 / 表格 /
 *    分割线 / HTML 块（含图片说明）；多行段落的续行不加。
 * 3. 导入文章时自动识别原文的段首空格：原文有空格则保留，没有则保持没有
 *    （不改动正文），并把识别结果写回设置项。
 */

// 段首缩进字符：全角空格，1 个 = 1 个字宽
var PARAGRAPH_INDENT_CHAR = '\u3000';
var PARAGRAPH_INDENT_MIN = 0;
var PARAGRAPH_INDENT_MAX = 7;
var PARAGRAPH_INDENT_DEFAULT = 2;

/* ================================================================
 * 纯文本（markdown）层
 * ================================================================ */

/**
 * 统计一行开头的空白相当于几个字（半角空格按 0.5 字计）
 * @param {string} line
 * @returns {number} 0-7
 */
function measureIndentWidth(line) {
    if (!line) return 0;
    var m = String(line || '').match(INDENT_LEAD_RE);
    if (!m) return 0;

    var width = 0;
    for (var i = 0; i < m[0].length; i++) {
        var ch = m[0].charAt(i);
        if (ch === '\t') width += 2;
        else if (ch === '\u3000' || ch === '\u2003') width += 1; // 全角空格 / em space
        else width += 0.5;                                      // 半角空格 / NBSP / en space
    }
    return clampIndentValue(Math.round(width));
}

function clampIndentValue(n) {
    n = parseInt(n, 10);
    if (isNaN(n)) return PARAGRAPH_INDENT_DEFAULT;
    return Math.max(PARAGRAPH_INDENT_MIN, Math.min(PARAGRAPH_INDENT_MAX, n));
}

function indentPrefix(n) {
    var s = '';
    for (var i = 0; i < n; i++) s += PARAGRAPH_INDENT_CHAR;
    return s;
}

// 段首缩进可能出现的空白字符：半角空格 / 制表符 / NBSP / en / em / 全角空格
var INDENT_LEAD_RE = /^[ \t\u00a0\u2002\u2003\u3000]+/;

function stripIndentPrefix(line) {
    return String(line || '').replace(INDENT_LEAD_RE, '');
}

/**
 * 是否是「结束一个块」的行：这类行之后的一行必定是新段落
 * （列表 / 引用不在此列：它们后面的一行可能是 lazy continuation）
 */
function isBlockEndLine(content) {
    if (!content) return true;
    if (/^#{1,6}(\s|$)/.test(content)) return true;              // ATX 标题
    if (/^(`{3,}|~{3,})/.test(content)) return true;             // 围栏（开 / 闭）
    if (/^\|/.test(content)) return true;                        // 表格行
    if (/^</.test(content)) return true;                         // HTML 块
    if (/^([-*_])(\s*\1){2,}\s*$/.test(content)) return true;    // 分割线
    return false;
}

/**
 * 是否是 markdown 的块级结构行（不能加段前缩进）
 */
function isBlockLine(content) {
    if (!content) return true;
    if (isBlockEndLine(content)) return true;
    if (/^>/.test(content)) return true;                                     // 引用
    if (/^([-*+]|\d+[.)])(\s|$)/.test(content)) return true;                 // 列表
    return false;
}

/**
 * 判断 lines[i] 是否为「可加段前缩进的段落首行」
 * @param {string[]} lines
 * @param {number} i
 */
function isParagraphStartLine(lines, i) {
    var line = lines[i];
    if (!line) return false;
    if (/^[ \t]/.test(line)) return false;                 // 半角缩进 → 缩进代码块 / 续行
    var content = stripIndentPrefix(line);
    if (!content.trim()) return false;                     // 空行
    if (isBlockLine(content)) return false;                // 标题 / 列表 / 引用 / 围栏 / 表格 / HTML

    // setext 标题：下一行是 === / --- 时本行是标题文本
    if (i + 1 < lines.length && /^\s{0,3}(=+|-{2,})\s*$/.test(lines[i + 1])) return false;

    // 必须是一个块的首行：上一行为空行，或上一行是「结束块」的行
    var prev = i > 0 ? stripIndentPrefix(lines[i - 1]) : '';
    if (prev.trim() !== '' && !isBlockEndLine(prev)) return false;

    return true;
}

/**
 * 收集所有「可加段前缩进的段落首行」的行号
 * @param {string[]} lines
 * @returns {number[]}
 */
function collectParagraphStartLines(lines) {
    var result = [];
    var inFence = false;
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (/^\s{0,3}(`{3,}|~{3,})/.test(line)) {
            inFence = !inFence;
            continue;
        }
        if (inFence) continue;
        if (isParagraphStartLine(lines, i)) result.push(i);
    }
    return result;
}

/**
 * 把整篇 markdown 的段前缩进统一设为 n 个字
 * @param {string} markdown
 * @param {number} n 0-7
 * @returns {string}
 */
function setParagraphIndent(markdown, n) {
    if (typeof markdown !== 'string' || markdown === '') return markdown;
    var width = clampIndentValue(n);
    var lines = markdown.split('\n');
    var targets = collectParagraphStartLines(lines);

    for (var k = 0; k < targets.length; k++) {
        var i = targets[k];
        var next = indentPrefix(width) + stripIndentPrefix(lines[i]);
        if (next !== lines[i]) lines[i] = next;
    }
    return lines.join('\n');
}

/**
 * 识别原文段前缩进
 * 取所有正文段落段首空白宽度的众数；并列时取较小值（不凭空增加缩进）
 * @param {string} markdown
 * @returns {number} 0-7
 */
function detectParagraphIndent(markdown) {
    if (typeof markdown !== 'string' || markdown === '') return 0;
    var lines = markdown.split('\n');
    var targets = collectParagraphStartLines(lines);
    if (!targets.length) return 0;

    var histogram = {};
    for (var k = 0; k < targets.length; k++) {
        var w = measureIndentWidth(lines[targets[k]]);
        histogram[w] = (histogram[w] || 0) + 1;
    }

    var best = 0;
    var bestCount = -1;
    Object.keys(histogram).forEach(function (key) {
        var value = parseInt(key, 10);
        var count = histogram[key];
        if (count > bestCount || (count === bestCount && value < best)) {
            best = value;
            bestCount = count;
        }
    });
    return clampIndentValue(best);
}

/**
 * 把当前文档的段前缩进同步到设置项（不改动正文）
 * 用于打开已存文档 / 刷新恢复时，让滑块数值与文档实际缩进保持一致。
 * 文档没有正文段落（空文档、纯标题、日志）时保留用户原有设置。
 * @param {string} markdown
 */
function syncIndentFromContent(markdown) {
    if (typeof markdown !== 'string' || markdown === '') return;
    var targets = collectParagraphStartLines(markdown.split('\n'));
    if (!targets.length) return;
    syncParagraphIndentSetting(detectParagraphIndent(markdown));
}

/* ================================================================
 * DOM 层（编辑 / 阅读模式即时生效，无需整篇重渲染）
 * ================================================================ */

/**
 * 该 <p> 是否是正文段落（与 markdown 层规则保持一致）
 *
 * 注意：容器自身可能是 <article>/<div>，因此只能逐层向上比对到容器为止，
 * 不能用 closest()，否则容器本身会被误判成「原始 HTML 容器」。
 */
function isIndentableParagraphEl(p, container) {
    if (!container || !p || p.tagName !== 'P') return false;
    // 图片说明 / 署名行 / 居中图片 / 作者时间行都是整块样式（右对齐、居中等），不加段前缩进
    if (p.classList && (p.classList.contains('img-caption') ||
        p.classList.contains('article-editor') || p.classList.contains('img-center') ||
        p.classList.contains('article-meta'))) return false;

    var el = p.parentElement;
    while (el && el !== container) {
        if (/^(PRE|CODE|BLOCKQUOTE|LI|UL|OL|TD|TH|TABLE|DIV|SECTION|ARTICLE|FIGURE)$/.test(el.tagName)) {
            return false;
        }
        el = el.parentElement;
    }
    return el === container;   // 必须确实位于容器内
}

/**
 * 给单个段落设置段前缩进
 * @returns {boolean} 是否发生变化
 */
function setIndentOnParagraphEl(p, width) {
    var first = p.firstChild;
    if (!first) return false;

    // <p><br></p> 之类的空段落不动
    if (first.nodeType === Node.ELEMENT_NODE && first.tagName === 'BR') return false;
    if (!(p.textContent || '').trim()) return false;

    if (first.nodeType === Node.TEXT_NODE) {
        var stripped = stripIndentPrefix(first.textContent);
        var next = indentPrefix(width) + stripped;
        if (next === first.textContent) return false;
        first.textContent = next;
        return true;
    }

    // 段首是行内元素（<strong> 等）→ 在前面插入缩进文本节点
    if (width > 0) {
        p.insertBefore(document.createTextNode(indentPrefix(width)), first);
        return true;
    }
    return false;
}

/**
 * 把段前缩进应用到当前正文 DOM（阅读 / 编辑模式都适用）
 * @param {number} n 0-7
 * @returns {number} 被修改的段落数
 */
function applyParagraphIndentToDom(n) {
    var elements = (window.Mojian && window.Mojian.elements) || {};
    var container = elements.markdownContent;
    if (!container) return 0;

    var width = clampIndentValue(n);
    var paragraphs = container.querySelectorAll('p');
    var changed = 0;
    for (var i = 0; i < paragraphs.length; i++) {
        var p = paragraphs[i];
        if (!isIndentableParagraphEl(p, container)) continue;
        if (setIndentOnParagraphEl(p, width)) changed++;
    }
    return changed;
}

/* ================================================================
 * 设置项 / 文档同步
 * ================================================================ */

// 原文段落不带段首空格、需要导入时统一补 2 字缩进的站点
var FORCE_INDENT_HOSTS = [/(^|\.)huanqiu\.com$/i, /(^|\.)guancha\.cn$/i];

function isForcedIndentSite(url) {
    if (!url) return false;
    var host = '';
    try { host = new URL(String(url)).hostname; } catch (e) { host = String(url); }
    for (var i = 0; i < FORCE_INDENT_HOSTS.length; i++) {
        if (FORCE_INDENT_HOSTS[i].test(host)) return true;
    }
    return false;
}

function currentParagraphIndent() {
    var state = (window.Mojian && window.Mojian.state) || {};
    var settings = state.settings || {};
    return clampIndentValue(settings.paragraphIndent);
}


function formatParagraphIndentValue(n) {
    var key = 'settings.paragraphIndent.value';
    if (typeof i18n !== 'undefined' && i18n.t) {
        var translated = i18n.t(key, { n: n });
        if (translated !== key) return translated;   // 未命中翻译时 t() 会原样返回 key
    }
    return String(n);
}

/**
 * 更新设置项 UI + 状态 + 持久化（不触碰正文）
 */
function syncParagraphIndentSetting(n) {
    var M = window.Mojian;
    if (!M || !M.state || !M.state.settings) return;
    var width = clampIndentValue(n);

    M.state.settings.paragraphIndent = width;

    var elements = M.elements || {};
    if (elements.paragraphIndentSlider) elements.paragraphIndentSlider.value = width;
    if (elements.paragraphIndentValue) elements.paragraphIndentValue.textContent = formatParagraphIndentValue(width);

    if (M.saveSettings) M.saveSettings();
}

/**
 * 导入文章时调用：识别原文段前缩进 → 写回设置项 → 按识别结果统一缩进
 * 原文有段首空格则按字数保留，原文没有则保持没有
 * @param {string} markdown
 * @returns {string} 处理后的 markdown
 */
function applyDetectedParagraphIndent(markdown, url) {
    if (typeof markdown !== 'string' || markdown === '') return markdown;

    // 这几个站点的原文段落不带段首空格，按中文排版习惯统一补 2 字
    if (isForcedIndentSite(url)) {
        syncParagraphIndentSetting(PARAGRAPH_INDENT_DEFAULT);
        return setParagraphIndent(markdown, PARAGRAPH_INDENT_DEFAULT);
    }

    // 其余站点只识别 + 写回设置项：原文段首空格原样保留（有则留、无则不留），不改动正文。
    // 需要统一改写时，由用户拖动设置项触发（setParagraphIndent）。
    syncParagraphIndentSetting(detectParagraphIndent(markdown));
    return markdown;
}

/**
 * 退出编辑模式时按当前设置统一一次段前缩进
 * 设置为 0 时不做处理，避免抹掉用户自己敲进去的段首空格
 * @param {string} markdown
 * @returns {string}
 */
function normalizeParagraphIndent(markdown) {
    var width = currentParagraphIndent();
    if (width <= 0) return markdown;
    return setParagraphIndent(markdown, width);
}

/**
 * 把当前正文同步回 state.content 与本地存储
 * 阅读模式以 state.content 为准（纯文本变换，代价低）；
 * 编辑模式以 DOM 为准（先转回 markdown，避免丢掉未保存的编辑）
 */
function persistParagraphIndent() {
    var M = window.Mojian;
    if (!M || !M.state || !M.state.currentFile || !M.state.content) return;

    var width = currentParagraphIndent();
    var markdown;

    if (M.state.isEditMode && M.htmlToMarkdown) {
        markdown = M.htmlToMarkdown(M.elements.markdownContent.innerHTML);
        markdown = width > 0 ? setParagraphIndent(markdown, width) : markdown;
    } else {
        markdown = setParagraphIndent(M.state.content, width);
    }

    if (markdown === M.state.content) return;
    M.state.content = markdown;

    try {
        localStorage.setItem('currentContent', markdown);
        localStorage.setItem('savedContent', markdown);
    } catch (e) {
        /* 存储已满等情况忽略 */
    }
}

window.Mojian = window.Mojian || {};
Mojian.PARAGRAPH_INDENT_CHAR = PARAGRAPH_INDENT_CHAR;
Mojian.setParagraphIndent = setParagraphIndent;
Mojian.detectParagraphIndent = detectParagraphIndent;
Mojian.applyParagraphIndentToDom = applyParagraphIndentToDom;
Mojian.applyDetectedParagraphIndent = applyDetectedParagraphIndent;
Mojian.normalizeParagraphIndent = normalizeParagraphIndent;
Mojian.persistParagraphIndent = persistParagraphIndent;
Mojian.syncParagraphIndentSetting = syncParagraphIndentSetting;
Mojian.syncIndentFromContent = syncIndentFromContent;
Mojian.formatParagraphIndentValue = formatParagraphIndentValue;
Mojian.clampIndentValue = clampIndentValue;
