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

    calculateStats(content);
    enhanceCodeBlocks();
    wrapTables();
    wrapImages();

    Prism.highlightAllUnder(elements.markdownContent);

    if (state.isDarkMode) {
        window.Mojian.applyTheme();
    } else {
        window.Mojian.applyBackground();
    }

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

function enhanceCodeBlocks() {
    const { elements } = window.Mojian;
    const codeBlocks = elements.markdownContent.querySelectorAll('pre code');
    codeBlocks.forEach((codeBlock) => {
        const pre = codeBlock.parentElement;
        if (pre.classList.contains('code-block-enhanced')) return;

        const langClass = Array.from(codeBlock.classList).find(cls => cls.startsWith('language-'));
        const lang = langClass ? langClass.replace('language-', '') : '';

        pre.classList.add('code-block-enhanced');
        const rawCode = codeBlock.textContent;
        const lines = rawCode.split('\n');
        if (lines[lines.length - 1] === '') lines.pop();

        const header = document.createElement('div');
        header.className = 'code-block-header';

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
Mojian.wrapImages = wrapImages;
Mojian.enhanceCodeBlocks = enhanceCodeBlocks;
Mojian.copyCodeToClipboard = copyCodeToClipboard;
Mojian.downloadCode = downloadCode;
