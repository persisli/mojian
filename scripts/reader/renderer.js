/**
 * reader/renderer.js - Markdown/Log 渲染 (marked配置 + Prism + 代码块增强)
 */

function configureMarked() {
    if (window.Mojian.markedConfigured) return;
    window.Mojian.markedConfigured = true;

    const renderer = new marked.Renderer();
    renderer.heading = function(text, level, raw) {
        const slug = raw.toLowerCase().replace(/[^\w]+/g, '-');
        return `<h${level} id="${slug}">${text}</h${level}>`;
    };

    marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: true,
        mangle: false,
        renderer: renderer,
        highlight: function(code, lang) {
            if (lang && typeof Prism !== 'undefined' && Prism.languages && Prism.languages[lang]) {
                try {
                    return Prism.highlight(code, Prism.languages[lang], lang);
                } catch (e) {
                    console.warn('Highlight error:', e);
                }
            }
            return code;
        }
    });
}

function renderContent(content, isRestoring) {
    const { elements, state } = window.Mojian;
    const html = marked.parse(content);
    elements.markdownContent.innerHTML = html;

    // 如果内容为空，添加一个空的 p 标签以应用 margin-bottom 样式
    if (!content || content.trim() === '') {
        elements.markdownContent.innerHTML = '<p><br></p>';
    }

    calculateStats(content);
    // Mermaid 代码块先转成图（同步包装 + 异步渲染），后续代码块增强会跳过它们
    if (window.Mojian.renderMermaidBlocks) {
        window.Mojian.renderMermaidBlocks(elements.markdownContent);
    }
    enhanceCodeBlocks();
    wrapTables();
    wrapImages();
    alignImageCaptions();

    // Prism 为延后加载脚本，未就绪时跳过（延后加载完成后会补一次高亮）
    if (typeof Prism !== 'undefined' && Prism.highlightAllUnder) {
        Prism.highlightAllUnder(elements.markdownContent);
    }

    if (state.isDarkMode) {
        window.Mojian.applyTheme();
    } else {
        window.Mojian.applyBackground();
    }

    // 确保 line-height 在 innerHTML 设置后被明确设置，解决首次进入编辑模式时行高较小的问题
    elements.markdownContent.style.lineHeight = state.settings.lineHeight || 1.9;
    window.Mojian.applyOtherSettings();

    if (!isRestoring) {
        window.scrollTo(0, 0);
    }

    window.Mojian.updateProgress();
    window.Mojian.generateToc();
}

function calculateStats(content) {
    const { elements, state } = window.Mojian;
    const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (content.match(/[a-zA-Z]+/g) || []).length;
    state.wordCount = chineseChars + englishWords;
    state.readingTime = Math.ceil(state.wordCount / 300);

    elements.wordCount.textContent = i18n.t('status.wordCount', { count: window.Mojian.formatNumber(state.wordCount) });
    elements.readingTime.textContent = i18n.t('status.readingTime', { minutes: state.readingTime });
}

function cleanLogContent(content) {
    let cleaned = content;
    cleaned = cleaned.replace(/\x1b\][^\x07]*\x07/g, '');
    cleaned = cleaned.replace(/\x1b\][^\x1b]*\x1b\\/g, '');
    cleaned = cleaned.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '');
    cleaned = cleaned.replace(/\x1b[()][A-Za-z0-9]/g, '');
    cleaned = cleaned.replace(/\x1b[A-Za-z]/g, '');

    let prevCleaned;
    do {
        prevCleaned = cleaned;
        cleaned = cleaned.replace(/[^\n\x08]\x08/g, '');
    } while (cleaned !== prevCleaned);

    cleaned = cleaned.replace(/\x08/g, '');
    cleaned = cleaned.replace(/\r\n/g, '\n');
    cleaned = cleaned.replace(/\r/g, '');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    const lines = cleaned.split('\n');
    const cleanedLines = lines.map(line => line.replace(/[\t ]+$/, ''));
    cleaned = cleanedLines.join('\n');

    return cleaned;
}

function renderLogContent(content, isRestoring) {
    const { elements, state } = window.Mojian;
    const highlightedContent = highlightShellPrompts(content);
    const logHtml = `<pre class="log-content">${window.Mojian.escapeHtml(highlightedContent)}</pre>`;
    elements.markdownContent.innerHTML = logHtml;

    calculateStats(content);

    if (state.isDarkMode) {
        window.Mojian.applyTheme();
    } else {
        window.Mojian.applyBackground();
    }

    // 确保 line-height 在 innerHTML 设置后被明确设置
    elements.markdownContent.style.lineHeight = state.settings.lineHeight || 1.9;
    window.Mojian.applyOtherSettings();

    if (!isRestoring) {
        window.scrollTo(0, 0);
    }

    window.Mojian.updateProgress();
    window.Mojian.generateLogToc(content);
}

function highlightShellPrompts(content) {
    const promptPatterns = [
        /([a-zA-Z0-9_-]+@[a-zA-Z0-9._-]+:[^\n#$]*?)([$#])/g,
        /([a-zA-Z0-9_-]+:[^\n@$#]*?)([$#])/g,
        /([A-Z]:\\[^\n>]*?)(>)/g,
        /((?:\/[^\n]*?)|(~))\s*([$])/g
    ];

    let highlighted = content;
    const promptMarkerStart = '\x00PROMPT\x00';
    const promptMarkerEnd = '\x00ENDPROMPT\x00';

    promptPatterns.forEach(pattern => {
        highlighted = highlighted.replace(pattern, (match) => {
            if (match.includes(promptMarkerStart)) return match;
            return `${promptMarkerStart}${match}${promptMarkerEnd}`;
        });
    });

    return highlighted;
}

function wrapTables() {
    const { elements } = window.Mojian;
    const tables = elements.markdownContent.querySelectorAll('table');
    tables.forEach((table) => {
        if (table.parentElement.classList.contains('table-wrapper')) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'table-wrapper';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);

        // 为导入的表格应用列宽规则：第一列自适应最长内容，其余列均分剩余宽度
        applyTableColumnWidths(table);
    });
}

/**
 * 应用表格列宽规则：
 * - 第一列宽度 = 刚好容纳该列最长内容的宽度
 * - 其余列均分表格剩余宽度
 * - 表格整体宽度 = min(内容总宽, 容器宽度)
 */
function applyTableColumnWidths(table) {
    var rows = table.querySelectorAll('tr');
    if (rows.length === 0) return;

    // 获取列数
    var firstRowCells = rows[0].querySelectorAll('th, td');
    var colCount = firstRowCells.length;
    if (colCount <= 1) return;

    // 计算每一列的最长内容宽度
    var colMaxWidths = [];
    for (var c = 0; c < colCount; c++) {
        var maxW = 0;
        var colCells = table.querySelectorAll('th:nth-child(' + (c + 1) + '), td:nth-child(' + (c + 1) + ')');
        colCells.forEach(function(cell) {
            var text = (cell.textContent || '').trim();
            if (!text) return;
            var tempSpan = document.createElement('span');
            tempSpan.style.visibility = 'hidden';
            tempSpan.style.position = 'absolute';
            tempSpan.style.whiteSpace = 'nowrap';
            tempSpan.style.font = window.getComputedStyle(cell).font;
            tempSpan.textContent = text || ' ';
            document.body.appendChild(tempSpan);
            var w = tempSpan.offsetWidth + 40; // 40px padding补偿
            if (w > maxW) maxW = w;
            document.body.removeChild(tempSpan);
        });
        colMaxWidths.push(maxW);
    }

    // 检查是否有任何列有内容
    var hasAnyContent = colMaxWidths.some(function(w) { return w > 0; });

    if (!hasAnyContent) {
        // 无任何内容，所有列均分且宽度100%
        table.style.tableLayout = 'fixed';
        table.style.width = '100%';
        var equalWidth = Math.floor(100 / colCount);
        var remainder = 100 - (equalWidth * colCount);
        var allCells = table.querySelectorAll('th, td');
        allCells.forEach(function(cell, index) {
            var colIndex = index % colCount;
            var width = equalWidth;
            if (colIndex === colCount - 1) width += remainder;
            cell.style.width = width + '%';
        });
        return;
    }

    // 获取容器宽度
    var containerWidth = table.parentElement.offsetWidth || window.Mojian.elements.markdownContent.offsetWidth;

    // 计算内容总宽
    var contentTotalWidth = 0;
    colMaxWidths.forEach(function(w) { contentTotalWidth += w; });

    // 规则1、2：表格宽度 = min(内容总宽, 容器宽度)，左对齐
    table.style.tableLayout = 'fixed';
    if (contentTotalWidth < containerWidth) {
        table.style.width = contentTotalWidth + 'px';
    } else {
        table.style.width = containerWidth + 'px';
    }

    // 规则3：优先满足第一列最长格子宽度，其余列均分剩余空间
    var maxFirstColWidth = colMaxWidths[0];
    var actualTableWidth = table.offsetWidth;

    // 保护：第一列不超过表格宽度，给其他列留至少20px空间（单列除外）
    var firstColWidth = maxFirstColWidth;
    if (colCount > 1) {
        firstColWidth = Math.min(maxFirstColWidth, actualTableWidth - (colCount - 1) * 20);
        if (firstColWidth < 20) firstColWidth = Math.min(maxFirstColWidth, actualTableWidth);
    }

    var remainingWidth = actualTableWidth - firstColWidth;
    var otherColWidth = (colCount > 1) ? Math.floor(remainingWidth / (colCount - 1)) : 0;

    var allCells = table.querySelectorAll('th, td');
    allCells.forEach(function(cell, index) {
        var colIndex = index % colCount;
        if (colIndex === 0) {
            cell.style.width = firstColWidth + 'px';
        } else {
            cell.style.width = otherColWidth + 'px';
        }
        cell.style.minWidth = '';
    });
}

function wrapImages() {
    const { elements } = window.Mojian;
    const images = elements.markdownContent.querySelectorAll('img');
    images.forEach((img) => {
        if (img.parentElement && img.parentElement.classList.contains('img-wrapper')) return;
        const wrapper = document.createElement('span');
        wrapper.className = 'img-wrapper';
        wrapper.contentEditable = 'false';
        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);
    });
}

/**
 * 找到图注对应的图片：就近向前查找（图注通常紧跟图片所在块）
 * @param {Element} cap .img-caption 元素
 * @returns {HTMLImageElement|null}
 */
function findCaptionImage(cap) {
    let node = cap.previousElementSibling;
    let guard = 0;
    while (node && guard++ < 3) {
        // 中间夹着另一条图注 → 说明本条没有对应图片
        if (node.classList && node.classList.contains('img-caption')) return null;

        const img = node.querySelector ? node.querySelector('img') : null;
        if (img) return img;

        // 中间夹着正文文本 → 不再继续向前找，避免错认成更早的图片
        if ((node.textContent || '').trim().length > 15) return null;

        node = node.previousElementSibling;
    }
    return null;
}

/**
 * 图片说明（图注 / 来源小字）右对齐到图片右边缘
 *
 * 图注是独立的块级元素（<p class="img-caption">），默认右对齐到的是正文容器右边缘；
 * 这里按图片实际渲染宽度限制图注盒宽、并把左侧起点对齐到图片左边缘，
 * 从而让图注文字右边缘与图片右边缘严格重合。图片居中/左侧对齐都能正确适配。
 */
function alignImageCaptions() {
    const { elements } = window.Mojian;
    const container = elements.markdownContent;
    if (!container) return;

    const caps = container.querySelectorAll('.img-caption');
    if (!caps.length) return;

    const containerStyle = window.getComputedStyle(container);
    const contentLeft = container.getBoundingClientRect().left +
        (parseFloat(containerStyle.paddingLeft) || 0) +
        (parseFloat(containerStyle.borderLeftWidth) || 0);

    caps.forEach((cap) => {
        const img = findCaptionImage(cap);
        if (!img) return;

        const rect = img.getBoundingClientRect();
        if (!rect.width) {
            // 图片尚未加载完成（宽度为 0），加载后再对齐一次
            if (!img._captionLoadHooked) {
                img._captionLoadHooked = true;
                img.addEventListener('load', () => alignImageCaptions(), { once: true });
            }
            return;
        }

        cap.style.maxWidth = Math.round(rect.width) + 'px';
        cap.style.marginLeft = Math.max(0, Math.round(rect.left - contentLeft)) + 'px';
        cap.style.marginRight = '0';
    });
}

function enhanceCodeBlocks() {
    const { elements } = window.Mojian;
    const codeBlocks = elements.markdownContent.querySelectorAll('pre code');
    codeBlocks.forEach((codeBlock) => {
        const pre = codeBlock.parentElement;
        if (pre.classList.contains('code-block-enhanced')) return;
        // Mermaid 源码块（藏在 .mermaid-block 里，编辑模式下才显示）不做代码块增强
        if (codeBlock.closest('.mermaid-block')) return;

        const langClass = Array.from(codeBlock.classList).find(cls => cls.startsWith('language-'));
        const lang = langClass ? langClass.replace('language-', '') : '';

        pre.classList.add('code-block-enhanced');
        const rawCode = window.Mojian.getCodeText ? window.Mojian.getCodeText(codeBlock) : codeBlock.textContent;
        const lines = rawCode.split('\n');
        if (lines[lines.length - 1] === '') lines.pop();

        const header = document.createElement('div');
        header.className = 'code-block-header';
        header.contentEditable = 'false';

        const langLabel = document.createElement('span');
        langLabel.className = 'code-block-lang';
        langLabel.textContent = lang ? lang.toUpperCase() : 'CODE';
        header.appendChild(langLabel);

        const actions = document.createElement('div');
        actions.className = 'code-block-actions';

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'code-block-btn';
        downloadBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';
        downloadBtn.title = '下载';
        downloadBtn.onclick = () => downloadCode(rawCode, lang);
        actions.appendChild(downloadBtn);

        const copyBtn = document.createElement('button');
        copyBtn.className = 'code-block-btn';
        copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
        copyBtn.title = '复制';
        copyBtn.onclick = () => copyCodeToClipboard(rawCode);
        actions.appendChild(copyBtn);

        header.appendChild(actions);
        pre.insertBefore(header, pre.firstChild);

        const codeWrapper = document.createElement('div');
        codeWrapper.className = 'code-wrapper';

        const codeContainer = document.createElement('div');
        codeContainer.className = 'code-container';

        codeBlock.parentNode.insertBefore(codeWrapper, codeBlock);
        codeWrapper.appendChild(codeContainer);
        codeContainer.appendChild(codeBlock);

        const lineCount = Math.max(1, lines.length);
        const lineNumbers = document.createElement('div');
        lineNumbers.className = 'line-numbers';
        lineNumbers.contentEditable = 'false';
        lineNumbers.style.lineHeight = '22px';
        let lineNumbersHtml = '';
        for (let i = 0; i < lineCount; i++) {
            lineNumbersHtml += `<span>${i + 1}</span>`;
        }
        lineNumbers.innerHTML = lineNumbersHtml;
        codeWrapper.insertBefore(lineNumbers, codeContainer);

        pre.dataset.lineCount = lineCount;
    });
}

async function copyCodeToClipboard(code) {
    try {
        await navigator.clipboard.writeText(code);
        window.Mojian.showToast(i18n.t('toast.copied'));
    } catch (err) {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        window.Mojian.showToast(i18n.t('toast.copied'));
    }
}

function downloadCode(code, lang) {
    const extensionMap = {
        'javascript': 'js', 'js': 'js', 'typescript': 'ts', 'ts': 'ts',
        'python': 'py', 'py': 'py', 'java': 'java', 'c': 'c', 'cpp': 'cpp',
        'c++': 'cpp', 'csharp': 'cs', 'cs': 'cs', 'go': 'go', 'rust': 'rs',
        'ruby': 'rb', 'php': 'php', 'swift': 'swift', 'kotlin': 'kt',
        'scala': 'scala', 'r': 'r', 'matlab': 'm', 'sql': 'sql',
        'shell': 'sh', 'bash': 'sh', 'powershell': 'ps1', 'html': 'html',
        'css': 'css', 'scss': 'scss', 'sass': 'sass', 'less': 'less',
        'json': 'json', 'xml': 'xml', 'yaml': 'yml', 'yml': 'yml',
        'markdown': 'md', 'md': 'md', 'dockerfile': 'dockerfile',
        'makefile': 'makefile', 'vim': 'vim', 'lua': 'lua', 'perl': 'pl',
        'groovy': 'groovy', 'dart': 'dart', 'julia': 'jl', 'elixir': 'ex',
        'erlang': 'erl', 'haskell': 'hs', 'clojure': 'clj', 'fsharp': 'fs',
        'ocaml': 'ml', 'racket': 'rkt', 'scheme': 'scm', 'lisp': 'lisp',
        'fortran': 'f90', 'cobol': 'cob', 'pascal': 'pas', 'delphi': 'pas',
        'ada': 'adb', 'verilog': 'v', 'vhdl': 'vhd', 'tcl': 'tcl',
        'awk': 'awk', 'sed': 'sed', 'arduino': 'ino', 'processing': 'pde'
    };

    const ext = extensionMap[lang.toLowerCase()] || 'txt';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

window.Mojian = window.Mojian || {};
Mojian.configureMarked = configureMarked;
Mojian.renderContent = renderContent;
Mojian.renderLogContent = renderLogContent;
Mojian.calculateStats = calculateStats;
Mojian.cleanLogContent = cleanLogContent;
Mojian.highlightShellPrompts = highlightShellPrompts;
Mojian.wrapTables = wrapTables;
Mojian.applyTableColumnWidths = applyTableColumnWidths;
Mojian.wrapImages = wrapImages;
Mojian.alignImageCaptions = alignImageCaptions;
Mojian.enhanceCodeBlocks = enhanceCodeBlocks;
Mojian.copyCodeToClipboard = copyCodeToClipboard;
Mojian.downloadCode = downloadCode;
