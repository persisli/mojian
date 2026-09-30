/**
 * core/utils.js - 通用工具函数
 */

// Format number with Chinese units
function formatNumber(num) {
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    }
    return num.toLocaleString();
}

// Escape HTML to prevent XSS, but preserve prompt markers
function escapeHtml(text) {
    const promptMarkerStart = '\x00PROMPT\x00';
    const promptMarkerEnd = '\x00ENDPROMPT\x00';
    const placeholderStart = '___PROMPT_START___';
    const placeholderEnd = '___PROMPT_END___';

    let processed = text.replace(new RegExp(promptMarkerStart, 'g'), placeholderStart);
    processed = processed.replace(new RegExp(promptMarkerEnd, 'g'), placeholderEnd);

    const div = document.createElement('div');
    div.textContent = processed;
    let escaped = div.innerHTML;

    escaped = escaped.replace(new RegExp(placeholderStart, 'g'), '<span class="shell-prompt">');
    escaped = escaped.replace(new RegExp(placeholderEnd, 'g'), '</span>');

    return escaped;
}

// 代码块里的附加结构（工具栏 / 行号 / Mermaid 图）：取源码时忽略
const CODE_BLOCK_CHROME_CLASSES = ['code-block-header', 'code-block-lang', 'code-block-actions',
    'code-block-btn', 'line-numbers', 'line-number', 'mermaid-diagram'];
const CODE_BLOCK_BLOCK_TAGS = /^(DIV|P|LI|TR|SECTION|ARTICLE|BLOCKQUOTE|H[1-6])$/;

/**
 * 读取代码块内的代码纯文本（换行统一还原成 "\n"）
 *
 * contenteditable 里粘贴多行文本时，浏览器常把换行写成 <br>，或把每一行包进 <div>；
 * 直接读 textContent 会丢掉换行 —— 表现为：只显示一个行号、导出后各行挤在一起、
 * Mermaid 源码解析失败。这里按 DOM 结构把 <br> / 块级子元素还原成换行符。
 *
 * @param {Element} code <code> 元素
 * @returns {string}
 */
function getCodeText(code) {
    if (!code) return '';
    let out = '';

    function isChrome(el) {
        if (!el.classList) return false;
        for (let i = 0; i < CODE_BLOCK_CHROME_CLASSES.length; i++) {
            if (el.classList.contains(CODE_BLOCK_CHROME_CLASSES[i])) return true;
        }
        return false;
    }

    function walk(node) {
        for (let n = node.firstChild; n; n = n.nextSibling) {
            if (n.nodeType === 3) {
                out += n.nodeValue;
                continue;
            }
            if (n.nodeType !== 1) continue;
            if (n.tagName === 'BR') {
                out += '\n';
                continue;
            }
            if (isChrome(n)) continue;
            if (CODE_BLOCK_BLOCK_TAGS.test(n.tagName)) {
                if (out && out.charAt(out.length - 1) !== '\n') out += '\n';
                walk(n);
                if (out.charAt(out.length - 1) !== '\n') out += '\n';
                continue;
            }
            walk(n);
        }
    }

    walk(code);
    return out;
}

window.Mojian = window.Mojian || {};
Mojian.formatNumber = formatNumber;
Mojian.escapeHtml = escapeHtml;
Mojian.getCodeText = getCodeText;
