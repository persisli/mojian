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

window.Mojian = window.Mojian || {};
Mojian.formatNumber = formatNumber;
Mojian.escapeHtml = escapeHtml;
