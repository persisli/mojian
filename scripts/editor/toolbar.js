/**
 * editor/toolbar.js - 工具栏动作 + 状态更新
 * 
 * 按钮行为：
 * - 始终瞬时按钮: horizontalRule, link, image, codeBlock, table
 * - 其余按钮: 未选中文本时 toggle 模式（切换进入/退出状态），
 *            选中文本时 瞬时模式（应用格式后光标回到普通状态）
 * 
 * 注意：放弃 execCommand，均使用手动 DOM 操作，因为此页面的
 *       contenteditable 环境与 execCommand 不兼容。
 */

// 行内格式标签映射
var INLINE_FORMATS = {
    bold: { tag: 'STRONG', testTags: ['STRONG', 'B'] },
    italic: { tag: 'EM', testTags: ['EM', 'I'] },
    underline: { tag: 'U', testTags: ['U'] },
    strike: { tag: 'DEL', testTags: ['DEL', 'S', 'STRIKE'] },
    superscript: { tag: 'SUP', testTags: ['SUP'] },
    subscript: { tag: 'SUB', testTags: ['SUB'] }
};

function handleToolbarAction(btn) {
    var elements = window.Mojian.elements;
    if (!elements.markdownContent.isContentEditable) {
        console.warn('[DEBUG toolbar] SKIP - contenteditable is OFF');
        return;
    }

    var action = btn.dataset.action;
    var level = btn.dataset.level;

    // ===== 撤回 / 重做：直接操作历史栈，不做选区处理 =====
    if (action === 'undo' || action === 'redo') {
        if (action === 'undo') {
            if (window.Mojian.undo) window.Mojian.undo();
        } else {
            if (window.Mojian.redo) window.Mojian.redo();
        }
        window.Mojian._savedRange = null;
        setTimeout(function() { updateToolbarState(); }, 10);
        return;
    }

    // 先确保 contenteditable 有焦点
    if (document.activeElement !== elements.markdownContent) {
        elements.markdownContent.focus();
    }

    // 恢复之前保存的选区
    var savedRange = window.Mojian._savedRange;
    if (savedRange) {
        try {
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedRange);
        } catch (e) {}
    }

    var selection = window.getSelection();
    var hasSelection = selection.rangeCount > 0 && !selection.getRangeAt(0).collapsed;

    // 始终为瞬时按钮的 actions
    var instantOnlyActions = ['horizontalRule', 'link', 'image', 'codeBlock', 'table', 'clearFormat'];

    try {
        if (hasSelection && !instantOnlyActions.includes(action)) {
            applyFormatWithSelection(action, level);
        } else {
            switch(action) {
                case 'bold':
                case 'italic':
                case 'underline':
                case 'strike':
                case 'superscript':
                case 'subscript':
                    toggleInlineFormat(action);
                    break;
                case 'clearFormat':
                    clearTextFormat();
                    break;
                case 'code':
                    toggleInlineCode();
                    break;
                case 'heading':
                    toggleHeading(parseInt(level));
                    break;
                case 'bulletList':
                    toggleList('UL');
                    break;
                case 'orderedList':
                    toggleList('OL');
                    break;
                case 'taskList':
                    toggleTaskList();
                    break;
                case 'blockquote':
                    toggleBlockquote();
                    break;
                case 'horizontalRule':
                    insertHorizontalRule();
                    break;
                case 'link':
                    applyLink();
                    break;
                case 'image':
                    applyImage();
                    break;
                case 'codeBlock':
                    applyCodeBlock();
                    break;
                case 'table':
                    applyTable();
                    break;
            }
        }
    } catch (error) {
        console.error('Toolbar action error:', error);
        window.Mojian.showToast('操作失败', 'error');
    }

    window.Mojian._savedRange = null;

    // 记录一步历史（格式修改也能被撤回）
    if (window.Mojian.recordHistoryNow) window.Mojian.recordHistoryNow();

    setTimeout(function() { updateToolbarState(); }, 10);
}

/* ================================================================
 * 选中文本时：瞬时应用格式
 * ================================================================ */
function applyFormatWithSelection(action, level) {
    switch(action) {
        case 'bold':
        case 'italic':
        case 'underline':
        case 'strike':
        case 'superscript':
        case 'subscript':
            applyInlineFormatSelection(action);
            break;
        case 'code':
            applyInlineCodeWithSelection();
            break;
        case 'heading':
            toggleHeading(parseInt(level));
            break;
        case 'bulletList':
            toggleList('UL');
            break;
        case 'orderedList':
            toggleList('OL');
            break;
        case 'taskList':
            applyTaskListWithSelection();
            break;
        case 'blockquote':
            toggleBlockquote();
            break;
    }
}

/* ================================================================
 * 行内格式：手动 DOM 操作（bold / italic / strike）
 * ================================================================ */

/**
 * 在光标位置找到指定格式的祖先元素
 */
function findFormatAncestor(startNode, action) {
    var tags = INLINE_FORMATS[action].testTags;
    var node = startNode;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    while (node && node !== window.Mojian.elements.markdownContent) {
        if (tags.indexOf(node.tagName) > -1) return node;
        node = node.parentElement;
    }
    return null;
}

/**
 * 无选中文本时：toggle 进入/退出行内格式
 * 退出时只移动光标到格式元素后面，不清除已有格式内容
 */
function toggleInlineFormat(action) {
    var tag = INLINE_FORMATS[action].tag;
    var container = window.Mojian.elements.markdownContent;
    var sel = window.getSelection();
    if (sel.rangeCount === 0) return;
    var range = sel.getRangeAt(0);

    var node = range.commonAncestorContainer;
    var formatEl = findFormatAncestor(node, action);

    if (formatEl) {
        // ===== EXIT: 退出格式，仅移动光标，不影响已有内容 =====
        // 在 formatEl 后面插入零宽空格"断点"，防止浏览器惯性进入加粗
        var parent = formatEl.parentNode;
        var breakNode = document.createTextNode('\u200B');
        if (formatEl.nextSibling) {
            parent.insertBefore(breakNode, formatEl.nextSibling);
        } else {
            parent.appendChild(breakNode);
        }

        // 光标移到断点字符后面，确保脱离加粗上下文
        var newRange = document.createRange();
        newRange.setStartAfter(breakNode);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);

        // 如果 formatEl 是空的（只含零宽空格），则删除它
        var text = formatEl.textContent || '';
        if (text === '\u200B' || text.trim() === '') {
            parent.removeChild(formatEl);
        }
    } else {
        // ===== ENTER: 进入格式，插入空格式元素 =====
        var wrapper = document.createElement(tag);
        var zwsp = document.createTextNode('\u200B');
        wrapper.appendChild(zwsp);
        range.insertNode(wrapper);

        // 光标移到 wrapper 内部
        var newRange = document.createRange();
        newRange.setStart(zwsp, 0);
        newRange.setEnd(zwsp, 1);
        sel.removeAllRanges();
        sel.addRange(newRange);
    }
}

/**
 * 有选中文本时：瞬时包裹/取消包裹行内格式
 */
function applyInlineFormatSelection(action) {
    var tag = INLINE_FORMATS[action].tag;
    var container = window.Mojian.elements.markdownContent;
    var sel = window.getSelection();
    if (sel.rangeCount === 0) return;
    var range = sel.getRangeAt(0);
    var text = range.toString();
    if (!text) return;

    // 判断选区是否已在格式内
    var node = range.commonAncestorContainer;
    var formatEl = findFormatAncestor(node, action);

    if (formatEl && isSelectionFullyInsideFormat(sel, formatEl)) {
        // ===== UNWRAP: 选区在格式内，取消格式 =====
        // 手动逐个移出子节点到 parent 中，避免 unwrapElement 销毁引用
        var parent = formatEl.parentNode;
        var lastMoved = null;
        while (formatEl.firstChild) {
            lastMoved = formatEl.firstChild;
            parent.insertBefore(lastMoved, formatEl);
        }
        // 现在删除空壳 formatEl
        parent.removeChild(formatEl);

        // 光标放在最后一个移出的子节点后面
        var newRange = document.createRange();
        if (lastMoved) {
            if (lastMoved.nodeType === Node.TEXT_NODE) {
                newRange.setStart(lastMoved, lastMoved.textContent.length);
            } else {
                newRange.setStartAfter(lastMoved.lastChild || lastMoved);
            }
        } else if (parent) {
            newRange.setStart(parent, 0);
        }
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
    } else {
        // ===== WRAP: 包裹选中文本 =====
        range.deleteContents();
        var wrapper = document.createElement(tag);
        wrapper.textContent = text;
        range.insertNode(wrapper);

        // 光标移到 wrapper 后面
        var newRange = document.createRange();
        newRange.setStartAfter(wrapper);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
    }
}

/**
 * 判断选区是否完全在某个格式元素内部
 */

/**
 * 判断选区是否完全在某个格式元素内部
 */
function isSelectionFullyInsideFormat(sel, formatEl) {
    if (sel.rangeCount === 0) return false;
    var range = sel.getRangeAt(0);
    return formatEl.contains(range.startContainer) && formatEl.contains(range.endContainer);
}

/* ================================================================
 * 行内代码
 * ================================================================ */
function toggleInlineCode() {
    var selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    var range = selection.getRangeAt(0);

    if (!range.collapsed) {
        applyInlineCodeWithSelection();
        return;
    }

    // 光标已在行内代码内（或紧跟在行内代码之后）→ 清除样式，而不是再叠加一层
    var existingCode = findInlineCodeAtCaret(range);
    if (existingCode) {
        exitInlineCode(existingCode);
        return;
    }

    // ===== ENTER: 进入行内代码 =====
    var emptyCode = document.createElement('code');
    emptyCode.textContent = '\u200B';
    range.insertNode(emptyCode);
    var newRange = document.createRange();
    newRange.selectNodeContents(emptyCode);
    newRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(newRange);
}

/**
 * 获取光标位置对应的行内代码元素（非代码块内的 code）
 * 1) 光标位于 <code> 内部
 * 2) 光标紧跟在行内代码之后（如加了行内代码后插入的零宽断点处）
 */
function findInlineCodeAtCaret(range) {
    var node = range.commonAncestorContainer;
    var el = (node.nodeType === Node.TEXT_NODE) ? node.parentElement : node;

    var codeEl = (el && el.closest) ? el.closest('code') : null;
    if (codeEl && !codeEl.closest('pre')) return codeEl;

    var prev = null;
    if (node.nodeType === Node.TEXT_NODE) {
        if (range.startOffset !== 0) return null;
        prev = node.previousSibling;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (range.startOffset <= 0) return null;
        prev = node.childNodes[range.startOffset - 1];
    }

    // 跳过加行内代码时插入的零宽断点，识别紧邻的行内代码
    var guard = 0;
    while (prev && prev.nodeType === Node.TEXT_NODE &&
           prev.textContent === '\u200B' && guard < 5) {
        prev = prev.previousSibling;
        guard++;
    }

    if (prev && prev.nodeType === Node.ELEMENT_NODE &&
        prev.tagName === 'CODE' && !prev.closest('pre')) {
        return prev;
    }
    return null;
}

/**
 * 清除行内代码样式：把 code 的子节点移回父节点，并删除 code 空壳
 */
function exitInlineCode(codeEl) {
    var selection = window.getSelection();
    var parent = codeEl.parentNode;
    if (!parent) return;

    var text = codeEl.textContent || '';

    // 空的行内代码（仅零宽空格）→ 直接删除，顺手清理断点字符
    if (text === '\u200B' || text.trim() === '') {
        var prevSib = codeEl.previousSibling;
        var nextSib = codeEl.nextSibling;
        parent.removeChild(codeEl);
        if (nextSib && nextSib.nodeType === Node.TEXT_NODE && nextSib.textContent === '\u200B') {
            parent.removeChild(nextSib);
        }
        var emptyRange = document.createRange();
        if (prevSib) {
            if (prevSib.nodeType === Node.TEXT_NODE) {
                emptyRange.setStart(prevSib, prevSib.textContent.length);
            } else {
                emptyRange.setStartAfter(prevSib);
            }
        } else {
            emptyRange.setStart(parent, 0);
        }
        emptyRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(emptyRange);
        return;
    }

    // 将子节点逐个移出，保留原有文本/格式
    var lastMoved = null;
    while (codeEl.firstChild) {
        lastMoved = codeEl.firstChild;
        parent.insertBefore(lastMoved, codeEl);
    }
    parent.removeChild(codeEl);

    var newRange = document.createRange();
    if (lastMoved) {
        if (lastMoved.nodeType === Node.TEXT_NODE) {
            newRange.setStart(lastMoved, lastMoved.textContent.length);
        } else {
            newRange.setStartAfter(lastMoved);
        }
    } else {
        newRange.setStart(parent, 0);
    }
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
}

/**
 * 判断选区是否落在某个已存在的行内代码上
 */
function findInlineCodeInSelection(range) {
    var node = range.commonAncestorContainer;
    var el = (node.nodeType === Node.TEXT_NODE) ? node.parentElement : node;

    var codeEl = (el && el.closest) ? el.closest('code') : null;
    if (codeEl && !codeEl.closest('pre')) return codeEl;

    if (!el || !el.querySelectorAll) return null;
    var normalize = function (s) {
        return (s || '').replace(/\u200B/g, '').trim();
    };
    var selText = range.toString();
    var candidates = el.querySelectorAll('code');
    for (var i = 0; i < candidates.length; i++) {
        var c = candidates[i];
        if (c.closest('pre')) continue;
        if (!rangeContainsNode(range, c)) continue;
        // 仅当选区恰好就是该行内代码的文本时才视为「已加样式」
        // （避免选中「普通文本 + 行内代码」时误删代码样式）
        if (normalize(selText) === normalize(c.textContent)) {
            return c;
        }
    }
    return null;
}

function rangeContainsNode(range, node) {
    try {
        var r = document.createRange();
        r.selectNode(node);
        return range.compareBoundaryPoints(Range.START_TO_START, r) <= 0 &&
               range.compareBoundaryPoints(Range.END_TO_END, r) >= 0;
    } catch (e) {
        return false;
    }
}

function applyInlineCodeWithSelection() {
    var selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    var range = selection.getRangeAt(0);
    var text = range.toString();
    if (!text) return;

    // 选区已带行内代码样式 → 清除样式（而不是再叠加一层）
    var existingCode = findInlineCodeInSelection(range);
    if (existingCode) {
        exitInlineCode(existingCode);
        return;
    }

    var codeEl = document.createElement('code');
    codeEl.textContent = text;
    range.deleteContents();
    range.insertNode(codeEl);

    // 在 codeEl 后面插入零宽空格断点，防止惯性进入 code 上下文
    var parent = codeEl.parentNode;
    var breakNode = document.createTextNode('\u200B');
    if (codeEl.nextSibling) {
        parent.insertBefore(breakNode, codeEl.nextSibling);
    } else {
        parent.appendChild(breakNode);
    }

    var newRange = document.createRange();
    newRange.setStartAfter(breakNode);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
}

/* ================================================================
 * 上标 / 下标 语法触发（^{内容} 、 _{内容}）
 * ================================================================ */
/**
 * 将已输入的 ^{content} / _{content} 转换为 <sup> / <sub>
 * @param {Range}  range   光标（已折叠）
 * @param {string} tag     'SUP' 或 'SUB'
 * @param {string} prefix  形如 '^{xxx}' 的完整标记文本
 * @param {string} content 括号内的内容
 */
function replaceSupSubSyntax(range, tag, prefix, content) {
    var node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;

    var markerStart = range.startOffset - prefix.length;
    if (markerStart < 0) return;

    // 删除已输入的 ^{xxx}
    var delRange = document.createRange();
    delRange.setStart(node, markerStart);
    delRange.setEnd(node, range.startOffset);
    delRange.deleteContents();

    // 在原位置插入格式元素
    var el = document.createElement(tag);
    el.textContent = content;
    delRange.insertNode(el);

    // 光标移到元素后面
    var selection = window.getSelection();
    var newRange = document.createRange();
    newRange.setStartAfter(el);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
}

/**
 * 取元素之后的第一个「真实内容」兄弟节点
 * 空文本 / 零宽占位 / 换行占位都视为「后面没有内容」
 */
function firstContentSibling(el) {
    var s = el.nextSibling;
    while (s && s.nodeType === Node.TEXT_NODE &&
           (s.textContent === '' || s.textContent === '\u200B')) {
        s = s.nextSibling;
    }
    if (s && s.nodeType === Node.ELEMENT_NODE && s.tagName === 'BR') return null;
    return s;
}

/**
 * 取元素之后已有的零宽占位文本节点（没有则返回 null）
 */
function findPlaceholderSibling(el) {
    var s = el.nextSibling;
    while (s && s.nodeType === Node.TEXT_NODE) {
        if (s.textContent === '\u200B') return s;
        if (s.textContent !== '') return null;
        s = s.nextSibling;
    }
    return null;
}

/**
 * 判断光标是否停在上标 / 下标元素的末尾
 * 覆盖两种实际形态：
 *   1) 光标位于 <sup>/<sub> 内部内容的末尾
 *   2) 光标位于父节点上、紧跟在 <sup>/<sub> 之后（触发语法后 setStartAfter 留下的边界位置）
 * @returns {Element|null}
 */
function getSupSubAtCaretEnd(range) {
    var node = range.startContainer;
    var offset = range.startOffset;

    if (node.nodeType === Node.TEXT_NODE) {
        var el = node.parentElement;
        if (!el || !el.closest) return null;

        var fmt = el.closest('sup, sub');
        if (!fmt) return null;

        // 光标之后在该格式元素内不能再有内容
        try {
            var tail = document.createRange();
            tail.selectNodeContents(fmt);
            tail.setStart(node, offset);
            if (tail.toString() !== '') return null;
        } catch (e) {
            return null;
        }

        // 该格式元素之后也不能再有真实内容
        if (firstContentSibling(fmt)) return null;

        return fmt;
    }

    if (node.nodeType === Node.ELEMENT_NODE && offset > 0) {
        // 光标紧跟在某个 sup/sub 之后（跳过零宽 / 空文本节点）
        var prev = node.childNodes[offset - 1];
        while (prev && prev.nodeType === Node.TEXT_NODE &&
               (prev.textContent === '' || prev.textContent === '\u200B')) {
            prev = prev.previousSibling;
        }
        if (prev && prev.nodeType === Node.ELEMENT_NODE &&
            (prev.tagName === 'SUP' || prev.tagName === 'SUB') &&
            !firstContentSibling(prev)) {
            return prev;
        }
    }

    return null;
}

/**
 * 把停在上标 / 下标末尾的光标移到格式元素右侧的常规状态
 * @returns {boolean} 是否发生了移动
 */
function escapeSupSubAtCaret() {
    var selection = window.getSelection();
    if (selection.rangeCount === 0) return false;

    var range = selection.getRangeAt(0);
    if (!range.collapsed) return false;

    var fmt = getSupSubAtCaretEnd(range);
    if (!fmt) return false;

    var parent = fmt.parentNode;
    if (!parent) return false;

    // 复用已有的零宽占位，否则就地插入一个（仅作为光标落点）
    var ref = findPlaceholderSibling(fmt);
    if (!ref) {
        ref = document.createTextNode('\u200B');
        parent.insertBefore(ref, fmt.nextSibling);
        // 不算内容修改，避免多出一步撤回记录（兜底复位，防止误吞后续修改）
        window.Mojian.skipNextHistoryCommit = true;
        setTimeout(function() { window.Mojian.skipNextHistoryCommit = false; }, 0);
    }

    // 光标必须落在断点文本节点「内部」的末尾位置：
    // 若停在节点起点，浏览器会把光标归位到前面的角标元素里，导致继续输入仍是角标样式
    var newRange = document.createRange();
    newRange.setStart(ref, (ref.textContent || '').length);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
    return true;
}

/* ================================================================
 * 清除文本格式
 * ================================================================ */

// 清除格式时会被拆掉的行内格式标签
var CLEAR_FORMAT_TAGS = ['STRONG', 'B', 'EM', 'I', 'U', 'S', 'DEL', 'STRIKE', 'SUP', 'SUB', 'CODE'];

/**
 * 拆掉一个行内格式元素：把子节点移到父节点，保留原文本
 * @returns {Node|null} 第一个被移出的子节点（供光标兜底定位）
 */
function unwrapInlineElement(el) {
    var parent = el && el.parentNode;
    if (!parent) return null;

    var firstMoved = null;
    while (el.firstChild) {
        if (!firstMoved) firstMoved = el.firstChild;
        parent.insertBefore(el.firstChild, el);
    }
    parent.removeChild(el);
    return firstMoved;
}

/**
 * 清除光标所处（或选区内）的文本格式
 */
function clearTextFormat() {
    var container = window.Mojian.elements.markdownContent;
    var selection = window.getSelection();
    if (!container || selection.rangeCount === 0) return;

    var range = selection.getRangeAt(0);
    var startNode = range.startContainer;
    var startOffset = range.startOffset;
    var endNode = range.endContainer;
    var endOffset = range.endOffset;

    var targets = [];
    if (range.collapsed) {
        // 光标所在位置的所有行内格式（由内到外）
        var cur = startNode;
        var el = (cur.nodeType === Node.TEXT_NODE) ? cur.parentElement : cur;
        while (el && el !== container) {
            if (CLEAR_FORMAT_TAGS.indexOf(el.tagName) > -1 && !el.closest('pre')) {
                targets.push(el);
            }
            el = el.parentElement;
        }
    } else {
        // 选区内所有行内格式
        var all = container.querySelectorAll(CLEAR_FORMAT_TAGS.join(','));
        for (var i = 0; i < all.length; i++) {
            if (all[i].closest('pre')) continue;
            if (range.intersectsNode(all[i])) targets.push(all[i]);
        }
    }

    if (!targets.length) return;

    // 记录光标所在格式元素被拆解后的落脚节点，用于光标兜底
    var anchorFallback = null;
    for (var k = 0; k < targets.length; k++) {
        if (targets[k].contains(startNode)) {
            anchorFallback = targets[k].firstChild;
            break;
        }
    }

    targets.forEach(function(t) {
        unwrapInlineElement(t);
    });

    // 锚点节点被移除时（如光标停在格式元素本身）重新定位
    if (startNode && !startNode.isConnected) {
        var newRange = document.createRange();
        if (anchorFallback && anchorFallback.parentNode) {
            newRange.setStartBefore(anchorFallback);
            newRange.collapse(true);
        } else {
            newRange.setStart(container, 0);
            newRange.collapse(true);
        }
        selection.removeAllRanges();
        selection.addRange(newRange);
        return;
    }

    // 文本节点只是被搬移，选区引用仍然有效，仅做一次范围修正
    try {
        var fixed = document.createRange();
        fixed.setStart(startNode, Math.min(startOffset, nodeLength(startNode)));
        if (endNode && endNode.isConnected) {
            fixed.setEnd(endNode, Math.min(endOffset, nodeLength(endNode)));
        }
        selection.removeAllRanges();
        selection.addRange(fixed);
    } catch (e) {
        /* 忽略，保持浏览器默认选区 */
    }
}

function nodeLength(node) {
    if (!node) return 0;
    return (node.nodeType === Node.TEXT_NODE)
        ? (node.textContent || '').length
        : node.childNodes.length;
}

/* ================================================================
 * 标题 toggle（手动 DOM）
 * ================================================================ */
function toggleHeading(level) {
    var elements = window.Mojian.elements;
    var targetTag = 'H' + level;
    var selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    var range = selection.getRangeAt(0);

    var node = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

    // 找最近的块级元素
    var block = node;
    while (block && block !== elements.markdownContent) {
        if (/^(H[1-6]|P|DIV|LI)$/i.test(block.tagName)) break;
        block = block.parentElement;
    }
    if (!block || block === elements.markdownContent) block = node;

    if (block && block.tagName === targetTag) {
        // 切换回段落
        var p = document.createElement('p');
        while (block.firstChild) p.appendChild(block.firstChild);
        if (!p.innerHTML.trim()) p.innerHTML = '<br>';
        block.parentNode.replaceChild(p, block);
        // 恢复光标
        var newRange = document.createRange();
        newRange.setStart(p, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
    } else {
        // 设为标题
        var h = document.createElement(targetTag);
        if (block && /^(P|DIV|LI|H[1-6])$/i.test(block.tagName)) {
            while (block.firstChild) h.appendChild(block.firstChild);
            block.parentNode.replaceChild(h, block);
        } else {
            h.innerHTML = '<br>';
            var parent = block.parentNode || elements.markdownContent;
            parent.insertBefore(h, block);
        }
        var newRange = document.createRange();
        newRange.setStart(h, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
    }
}

/* ================================================================
 * 列表 toggle（手动 DOM）
 * ================================================================ */
function toggleList(listTag) {
    var elements = window.Mojian.elements;
    var selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    var range = selection.getRangeAt(0);

    var node = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

    var listEl = node.closest(listTag);

    if (listEl) {
        // 退出列表：把 li 内容转成 p
        exitList(listEl, selection);
    } else {
        // 进入列表
        enterList(listTag);
    }
}

function enterList(listTag) {
    var elements = window.Mojian.elements;
    var selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    var range = selection.getRangeAt(0);

    var node = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

    // 找当前块
    var block = node.closest('p') || node.closest('div') || node.closest('h1') ||
                node.closest('h2') || node.closest('h3');
    var contentNode = block || node;

    var li = document.createElement('li');
    while (contentNode.firstChild) li.appendChild(contentNode.firstChild);
    if (!li.innerHTML.trim()) li.innerHTML = '\u200B';

    var list = document.createElement(listTag.toLowerCase());
    list.appendChild(li);

    if (block && block.parentNode) {
        block.parentNode.replaceChild(list, block);
    } else {
        range.insertNode(list);
    }

    var newRange = document.createRange();
    newRange.setStart(li, 0);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
}

function exitList(listEl, selection) {
    var li = listEl.querySelector('li');
    if (!li) return;

    var p = document.createElement('p');
    while (li.firstChild) p.appendChild(li.firstChild);
    if (!p.innerHTML.trim()) p.innerHTML = '<br>';

    listEl.parentNode.replaceChild(p, listEl);

    var newRange = document.createRange();
    newRange.setStart(p, 0);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
}

/* ================================================================
 * 引用 toggle
 * ================================================================ */
function toggleBlockquote() {
    var elements = window.Mojian.elements;
    var selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    var range = selection.getRangeAt(0);

    var node = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

    var bq = node.closest('blockquote');

    if (bq) {
        // 退出引用
        var p = document.createElement('p');
        var block = bq.querySelector('p') || bq;
        while (block.firstChild) p.appendChild(block.firstChild);
        if (!p.innerHTML.trim()) p.innerHTML = '<br>';
        bq.parentNode.replaceChild(p, bq);

        var newRange = document.createRange();
        newRange.setStart(p, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
    } else {
        // 进入引用
        var blockquote = document.createElement('blockquote');
        var innerP = document.createElement('p');

        var currentBlock = node.closest('p') || node.closest('div') || node.closest('h1') ||
                           node.closest('h2') || node.closest('h3');
        if (currentBlock && currentBlock !== elements.markdownContent) {
            while (currentBlock.firstChild) innerP.appendChild(currentBlock.firstChild);
            currentBlock.parentNode.replaceChild(blockquote, currentBlock);
        } else {
            innerP.innerHTML = '\u200B';
            range.insertNode(blockquote);
        }
        if (!innerP.innerHTML.trim()) innerP.innerHTML = '\u200B';
        blockquote.appendChild(innerP);

        var newRange = document.createRange();
        newRange.setStart(innerP, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
    }
}

/* ================================================================
 * 任务列表
 * ================================================================ */
function toggleTaskList() {
    var elements = window.Mojian.elements;
    var selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    var range = selection.getRangeAt(0);
    var node = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

    var taskLi = node.closest('li');
    var hasCheckbox = taskLi && taskLi.querySelector('input[type="checkbox"]');

    if (hasCheckbox) {
        // 退出任务列表
        var ul = taskLi.closest('ul');
        var p = document.createElement('p');
        while (taskLi.firstChild) {
            var child = taskLi.firstChild;
            if (child.tagName !== 'INPUT' || child.type !== 'checkbox') {
                p.appendChild(child);
            } else {
                taskLi.removeChild(child);
            }
        }
        if (!p.innerHTML.trim()) p.innerHTML = '<br>';
        if (ul) {
            ul.parentNode.replaceChild(p, ul);
        }
        var newRange = document.createRange();
        newRange.setStart(p, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
    } else {
        // 进入任务列表
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.style.cssText = 'margin-right:8px;';

        var li = document.createElement('li');
        li.appendChild(checkbox);
        li.appendChild(document.createTextNode('\u200B'));

        var ul = document.createElement('ul');
        ul.style.listStyle = 'none';
        ul.style.paddingLeft = '0';
        ul.appendChild(li);

        range.insertNode(ul);

        var newRange = document.createRange();
        newRange.setStartAfter(checkbox);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
    }
}

function applyTaskListWithSelection() {
    var selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    var range = selection.getRangeAt(0);
    if (range.collapsed) return;

    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.style.cssText = 'margin-right:8px;';

    var li = document.createElement('li');
    li.appendChild(checkbox);
    li.appendChild(document.createTextNode(range.toString()));

    var ul = document.createElement('ul');
    ul.style.listStyle = 'none';
    ul.style.paddingLeft = '0';
    ul.appendChild(li);

    range.deleteContents();
    range.insertNode(ul);
}

/* ================================================================
 * 分割线
 * ================================================================ */
function insertHorizontalRule() {
    var container = window.Mojian.elements.markdownContent;
    var sel = window.getSelection();
    var hr = document.createElement('hr');

    if (sel.rangeCount > 0) {
        var r = sel.getRangeAt(0);
        var node = r.commonAncestorContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

        // 找到当前所在的块级元素
        var block = node;
        while (block && block !== container) {
            if (/^(P|DIV|H[1-6]|BLOCKQUOTE)$/i.test(block.tagName)) break;
            block = block.parentElement;
        }

        if (block && block !== container) {
            var blockText = block.textContent.replace(/\u200B/g, '').trim();
            var isBlockEmpty = !blockText && !block.querySelector('img') && !block.querySelector('code');
            if (isBlockEmpty) {
                // 当前行为空：替换当前行
                block.parentNode.replaceChild(hr, block);
            } else {
                // 当前行有内容：在当前行后面插入
                block.parentNode.insertBefore(hr, block.nextSibling);
            }
        } else {
            r.insertNode(hr);
        }
    } else {
        container.appendChild(hr);
    }

    // 在 hr 后面插入空段落，防止回车时 hr 被浏览器删除
    var p = document.createElement('p');
    p.innerHTML = '<br>';
    if (hr.nextSibling) {
        hr.parentNode.insertBefore(p, hr.nextSibling);
    } else {
        hr.parentNode.appendChild(p);
    }

    // 光标放到新段落中
    var newRange = document.createRange();
    newRange.setStart(p, 0);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
}

/* ================================================================
* 链接 / 图片（自定义弹窗）
* ================================================================ */

// 保存弹窗打开前的选区，以便确认插入时恢复
var _insertSavedRange = null;

function saveSelectionForInsert() {
    var sel = window.getSelection();
    if (sel.rangeCount > 0) {
        _insertSavedRange = sel.getRangeAt(0).cloneRange();
    }
}

function restoreSelectionForInsert() {
    if (_insertSavedRange) {
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(_insertSavedRange);
    }
}

function applyLink() {
    var modal = document.getElementById('insertLinkModal');
    var urlInput = document.getElementById('insertLinkUrl');
    var textInput = document.getElementById('insertLinkText');

    saveSelectionForInsert();

    // 如果有选中文本，自动填入文本框
    var sel = window.getSelection();
    var selectedText = '';
    var existingHref = '';
    if (sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed) {
        selectedText = sel.getRangeAt(0).toString();
        // 检测选中内容是否已是链接
        var range = sel.getRangeAt(0);
        var commonAncestor = range.commonAncestorContainer;
        if (commonAncestor.nodeType === Node.TEXT_NODE) {
            commonAncestor = commonAncestor.parentElement;
        }
        var linkAncestor = commonAncestor.closest ? commonAncestor.closest('a') : null;
        if (!linkAncestor && commonAncestor) {
            // 向上查找a标签
            var parent = commonAncestor.parentElement;
            while (parent && parent !== window.Mojian.elements.markdownContent) {
                if (parent.tagName === 'A') {
                    linkAncestor = parent;
                    break;
                }
                parent = parent.parentElement;
            }
        }
        if (linkAncestor && linkAncestor.href) {
            existingHref = linkAncestor.href;
        }
    }
    urlInput.value = existingHref;
    textInput.value = selectedText;

    modal.classList.add('active');
    setTimeout(function() { urlInput.focus(); }, 100);
}

function confirmInsertLink() {
    var urlInput = document.getElementById('insertLinkUrl');
    var textInput = document.getElementById('insertLinkText');
    var url = urlInput.value.trim();
    var text = textInput.value.trim();

    if (!url) return;

    var modal = document.getElementById('insertLinkModal');
    modal.classList.remove('active');

    restoreSelectionForInsert();

    var sel = window.getSelection();
    if (sel.rangeCount > 0) {
        var range = sel.getRangeAt(0);
        if (!range.collapsed && !text) {
            text = range.toString();
        }

        var a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.textContent = text || url;

        if (!range.collapsed) {
            range.deleteContents();
        }
        range.insertNode(a);

        // 光标移到链接后面
        var newRange = document.createRange();
        newRange.setStartAfter(a);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
    }

    _insertSavedRange = null;
    window.Mojian.elements.markdownContent.focus();
}

function cancelInsertLink() {
    var modal = document.getElementById('insertLinkModal');
    modal.classList.remove('active');
    restoreSelectionForInsert();
    _insertSavedRange = null;
}

function applyImage() {
    var modal = document.getElementById('insertImageModal');
    var urlInput = document.getElementById('insertImageUrl');
    var altInput = document.getElementById('insertImageAlt');

    saveSelectionForInsert();

    urlInput.value = '';
    altInput.value = '';

    modal.classList.add('active');
    setTimeout(function() { urlInput.focus(); }, 100);
}

function confirmInsertImage() {
    var urlInput = document.getElementById('insertImageUrl');
    var altInput = document.getElementById('insertImageAlt');
    var url = urlInput.value.trim();
    var alt = altInput.value.trim();

    if (!url) return;

    var modal = document.getElementById('insertImageModal');
    modal.classList.remove('active');

    restoreSelectionForInsert();

    var img = document.createElement('img');
    img.src = url;
    img.alt = alt || '';

    var sel = window.getSelection();
    if (sel.rangeCount > 0) {
        sel.getRangeAt(0).insertNode(img);
    } else {
        window.Mojian.elements.markdownContent.appendChild(img);
    }

    _insertSavedRange = null;
    window.Mojian.elements.markdownContent.focus();
}

function cancelInsertImage() {
    var modal = document.getElementById('insertImageModal');
    modal.classList.remove('active');
    restoreSelectionForInsert();
    _insertSavedRange = null;
}

/* ================================================================
 * 表格
 * ================================================================ */
function applyTable() {
    var modal = document.getElementById('insertTableModal');
    var rowsInput = document.getElementById('insertTableRows');
    var colsInput = document.getElementById('insertTableCols');

    saveSelectionForInsert();

    rowsInput.value = '3';
    colsInput.value = '3';

    modal.classList.add('active');
    setTimeout(function() { rowsInput.focus(); }, 100);
}

function confirmInsertTable() {
    var rowsInput = document.getElementById('insertTableRows');
    var colsInput = document.getElementById('insertTableCols');
    var rows = parseInt(rowsInput.value) || 3;
    var cols = parseInt(colsInput.value) || 3;

    // 限制范围
    rows = Math.max(1, Math.min(20, rows));
    cols = Math.max(1, Math.min(10, cols));

    var modal = document.getElementById('insertTableModal');
    modal.classList.remove('active');

    restoreSelectionForInsert();

    // 创建 table-wrapper（与阅读模式一致的表格外层容器）
    var wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';

    // 创建 table
    var table = document.createElement('table');

    // 创建 thead
    var thead = document.createElement('thead');
    var headerRow = document.createElement('tr');
    for (var c = 0; c < cols; c++) {
        var th = document.createElement('th');
        th.textContent = '\u200B'; // 零宽空格，保持单元格非空
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // 创建 tbody
    var tbody = document.createElement('tbody');
    for (var r = 0; r < rows - 1; r++) {
        var tr = document.createElement('tr');
        for (var c2 = 0; c2 < cols; c2++) {
            var td = document.createElement('td');
            td.textContent = '\u200B';
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    wrapper.appendChild(table);

    // 插入到光标位置
    var sel = window.getSelection();
    if (sel.rangeCount > 0) {
        sel.getRangeAt(0).insertNode(wrapper);
    } else {
        window.Mojian.elements.markdownContent.appendChild(wrapper);
    }

    // 新建表格默认每列85px
    table.style.tableLayout = 'fixed';
    table.style.width = (85 * cols) + 'px';

    var allCells = table.querySelectorAll('th, td');
    allCells.forEach(function(cell) {
        cell.style.width = '85px';
    });

    // 监听第一列单元格输入事件，输入内容后重新计算列宽
    var firstColCells = table.querySelectorAll('th:first-child, td:first-child');
    firstColCells.forEach(function(cell) {
        var recalculateWidth = function() {
            // 检查第一列是否全部为空（只有零宽空格或空）
            var allFirstColCells = table.querySelectorAll('th:first-child, td:first-child');
            var hasContent = false;
            allFirstColCells.forEach(function(fc) {
                var text = (fc.textContent || '').replace(/\u200B/g, '').trim();
                if (text) hasContent = true;
            });

            if (!hasContent) {
                // 第一列仍为空，保持均分且宽度100%
                table.style.width = '100%';
                var ew = Math.floor(100 / cols);
                var rem = 100 - (ew * cols);
                var cells = table.querySelectorAll('th, td');
                cells.forEach(function(c, index) {
                    var colIdx = index % cols;
                    var w = ew;
                    if (colIdx === cols - 1) w += rem;
                    c.style.width = w + '%';
                    c.style.minWidth = '';
                });
                return;
            }

            // 计算第一列每行的内容宽度，取最大值
            var maxFirstColWidth = 0;
            allFirstColCells.forEach(function(fc) {
                var tempSpan = document.createElement('span');
                tempSpan.style.visibility = 'hidden';
                tempSpan.style.position = 'absolute';
                tempSpan.style.whiteSpace = 'nowrap';
                tempSpan.style.font = window.getComputedStyle(fc).font;
                tempSpan.textContent = (fc.textContent || '').replace(/\u200B/g, '') || ' ';
                document.body.appendChild(tempSpan);
                var w = tempSpan.offsetWidth + 40; // 40px padding补偿
                if (w > maxFirstColWidth) maxFirstColWidth = w;
                document.body.removeChild(tempSpan);
            });

            // 计算其余列每列的最长内容宽度
            var otherColMaxWidths = [];
            for (var oc = 1; oc < cols; oc++) {
                var maxW = 0;
                var colCells = table.querySelectorAll('th:nth-child(' + (oc + 1) + '), td:nth-child(' + (oc + 1) + ')');
                colCells.forEach(function(cc) {
                    var tempSpan = document.createElement('span');
                    tempSpan.style.visibility = 'hidden';
                    tempSpan.style.position = 'absolute';
                    tempSpan.style.whiteSpace = 'nowrap';
                    tempSpan.style.font = window.getComputedStyle(cc).font;
                    tempSpan.textContent = (cc.textContent || '').replace(/\u200B/g, '') || ' ';
                    document.body.appendChild(tempSpan);
                    var w = tempSpan.offsetWidth + 40;
                    if (w > maxW) maxW = w;
                    document.body.removeChild(tempSpan);
                });
                otherColMaxWidths.push(maxW);
            }

            // 规则1、2：表格宽度 = min(内容总宽, 容器宽度)，左对齐
            var contentTotalWidth = maxFirstColWidth;
            otherColMaxWidths.forEach(function(w) { contentTotalWidth += w; });
            var containerWidth = window.Mojian.elements.markdownContent.offsetWidth;

            table.style.tableLayout = 'fixed';
            if (contentTotalWidth < containerWidth) {
                table.style.width = contentTotalWidth + 'px';
            } else {
                table.style.width = containerWidth + 'px';
            }

            // 规则3：优先满足第一列最长格子宽度，其余列均分剩余空间
            var actualTableWidth = table.offsetWidth;
            var firstColWidth = maxFirstColWidth;
            if (cols > 1) {
                firstColWidth = Math.min(maxFirstColWidth, actualTableWidth - (cols - 1) * 20);
                if (firstColWidth < 20) firstColWidth = Math.min(maxFirstColWidth, actualTableWidth);
            }

            var remainingWidth = actualTableWidth - firstColWidth;
            var otherColWidth = (cols > 1) ? Math.floor(remainingWidth / (cols - 1)) : 0;

            var cells = table.querySelectorAll('th, td');
            cells.forEach(function(c, index) {
                var colIdx = index % cols;
                if (colIdx === 0) {
                    c.style.width = firstColWidth + 'px';
                } else {
                    c.style.width = otherColWidth + 'px';
                }
                c.style.minWidth = '';
            });
        };

        cell.addEventListener('blur', recalculateWidth);
        cell.addEventListener('input', recalculateWidth);
    });

    // 应用表格背景样式（与阅读模式一致）
    if (window.Mojian.applyBackground) {
        window.Mojian.applyBackground();
    }

    // 取消任何选区，并将光标定位到第一行第一列单元格内
    var firstCell = table.querySelector('th:first-child, td:first-child');
    if (firstCell) {
        var sel = window.getSelection();
        sel.removeAllRanges();
        var newRange = document.createRange();
        // 定位到 firstCell 的文本节点（零宽空格）内
        var textNode = firstCell.firstChild;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            newRange.setStart(textNode, 0);
            newRange.setEnd(textNode, 0);
        } else {
            newRange.setStart(firstCell, 0);
            newRange.collapse(true);
        }
        sel.addRange(newRange);
        firstCell.focus();
    }

    _insertSavedRange = null;
}

function cancelInsertTable() {
    var modal = document.getElementById('insertTableModal');
    modal.classList.remove('active');
    restoreSelectionForInsert();
    _insertSavedRange = null;
}

/* ================================================================
 * 代码块
 * ================================================================ */

// 代码块按钮图标
var CODE_BLOCK_ICONS = {
    download: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
    copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'
};

/**
 * 构建增强代码块（与阅读模式结构一致）
 *
 * @param {string}  lang       语言标识，如 "bash"（用于 <code class="language-xxx">
 *                             以及标题栏左上角显示），空字符串表示无语言
 * @param {string}  content    初始代码内容
 * @param {boolean} showHeader 是否显示标题栏；无语言标识的代码块不显示标题栏
 * @returns {{pre: HTMLElement, code: HTMLElement, lineNumbers: HTMLElement}}
 */
function createCodeBlockElement(lang, content, showHeader) {
    var pre = document.createElement('pre');
    pre.className = 'code-block-enhanced';

    // 空代码块用零宽空格占位：既渲染出 1 行、与行号数量一致，
    // 又能保证光标 / 点击稳定落在 code 元素内
    if (!content || content === '\n') content = '\u200B';

    // ---- 主体：行号 + 代码 ----
    var lines = content.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    var lineCount = Math.max(1, lines.length);
    pre.dataset.lineCount = lineCount;

    var codeWrapper = document.createElement('div');
    codeWrapper.className = 'code-wrapper';

    var lineNumbers = document.createElement('div');
    lineNumbers.className = 'line-numbers';
    lineNumbers.contentEditable = 'false';
    var lineHtml = '';
    for (var i = 0; i < lineCount; i++) {
        lineHtml += '<span>' + (i + 1) + '</span>';
    }
    lineNumbers.innerHTML = lineHtml;
    codeWrapper.appendChild(lineNumbers);

    var codeContainer = document.createElement('div');
    codeContainer.className = 'code-container';

    var code = document.createElement('code');
    if (lang) code.className = 'language-' + lang;
    code.textContent = content;
    codeContainer.appendChild(code);
    codeWrapper.appendChild(codeContainer);
    pre.appendChild(codeWrapper);

    // ---- 标题栏：左上角语言标识，右上角复制（含下载）按钮 ----
    if (showHeader) {
        var header = document.createElement('div');
        header.className = 'code-block-header';
        header.contentEditable = 'false';

        var langLabel = document.createElement('span');
        langLabel.className = 'code-block-lang';
        // 有语言时显示语言（大写），否则回退为 CODE
        langLabel.textContent = lang ? lang.toUpperCase() : 'CODE';
        header.appendChild(langLabel);

        var actions = document.createElement('div');
        actions.className = 'code-block-actions';

        var downloadBtn = document.createElement('button');
        downloadBtn.className = 'code-block-btn';
        downloadBtn.innerHTML = CODE_BLOCK_ICONS.download;
        downloadBtn.title = '下载';
        downloadBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (window.Mojian.downloadCode) {
                window.Mojian.downloadCode(code.textContent || '', lang || '');
            }
        };
        actions.appendChild(downloadBtn);

        var copyBtn = document.createElement('button');
        copyBtn.className = 'code-block-btn';
        copyBtn.innerHTML = CODE_BLOCK_ICONS.copy;
        copyBtn.title = '复制';
        copyBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (window.Mojian.copyCodeToClipboard) {
                window.Mojian.copyCodeToClipboard(code.textContent || '');
            }
        };
        actions.appendChild(copyBtn);

        header.appendChild(actions);
        pre.insertBefore(header, pre.firstChild);
    }

    // 监听 code 内容变化，动态同步行号
    setupCodeBlockSync(pre, code, lineNumbers);

    return { pre: pre, code: code, lineNumbers: lineNumbers };
}

/**
 * 将光标放入代码块的 code 元素内
 */
function focusCodeBlockCode(code) {
    var sel = window.getSelection();
    var newRange = document.createRange();
    if (code.firstChild) {
        newRange.setStart(code.firstChild, 0);
        newRange.collapse(true);
    } else {
        newRange.selectNodeContents(code);
        newRange.collapse(true);
    }
    sel.removeAllRanges();
    sel.addRange(newRange);
}

function applyCodeBlock() {
    // 检测是否在代码块内，如果在则插入新段落代替
    var selection = window.getSelection();
    if (selection.rangeCount > 0) {
        var range = selection.getRangeAt(0);
        var currentNode = range.commonAncestorContainer;
        if (currentNode.nodeType === Node.TEXT_NODE) {
            currentNode = currentNode.parentElement;
        }
        var codeEl = currentNode.closest ? currentNode.closest('code') : null;
        if (codeEl && codeEl.closest('pre')) {
            // 在代码块内：插入新段落并移出光标
            var pre = codeEl.closest('pre');
            var newP = document.createElement('p');
            newP.innerHTML = '<br>';
            pre.parentNode.insertBefore(newP, pre.nextSibling);

            var newRange = document.createRange();
            newRange.setStart(newP, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            newP.scrollIntoView({ block: 'center' });
            return;
        }
    }

    var content = '';
    var insertRange = null;
    if (selection.rangeCount > 0) {
        var r = selection.getRangeAt(0);
        var selectedText = r.toString();
        if (selectedText) {
            content = selectedText;
            r.deleteContents();
            insertRange = r;
        }
    }
    if (!content) content = '\n';

    // 构建与导入模式一致的增强代码块结构（工具栏按钮无语言标识，保留 CODE 标题栏）
    var built = createCodeBlockElement('', content, true);
    var preEl = built.pre;

    // 插入
    if (insertRange) {
        insertRange.insertNode(preEl);
    } else if (selection.rangeCount > 0) {
        selection.getRangeAt(0).insertNode(preEl);
    } else {
        window.Mojian.elements.markdownContent.appendChild(preEl);
    }

    // 光标放入 code 元素内（避免意外选中 header 或行号）
    focusCodeBlockCode(built.code);
}

/**
 * Markdown 围栏语法触发代码块
 *
 * 输入 ```lang + 空格 → 生成带标题栏的代码块，标题栏左上角显示该语言
 * 输入 ``` + 空格      → 生成无标题栏的代码块（不显示语言）
 *
 * @param {Node}   node 触发时的光标所在节点
 * @param {string} lang 语言标识（小写），空字符串表示无语言标识
 */
function insertCodeBlockFromFence(node, lang) {
    var container = window.Mojian.elements.markdownContent;

    var el = node;
    if (el && el.nodeType === Node.TEXT_NODE) el = el.parentElement;

    // 定位光标所在的块级元素（通常是段落）
    var block = el;
    while (block && block !== container &&
           !/^(P|DIV|LI|H[1-6]|BLOCKQUOTE)$/i.test(block.tagName)) {
        block = block.parentElement;
    }

    // 无语言标识时不显示标题栏
    var built = createCodeBlockElement(lang || '', '\n', !!lang);

    if (block && block !== container && block.parentNode) {
        block.parentNode.replaceChild(built.pre, block);
    } else if (el && el.parentNode) {
        el.parentNode.replaceChild(built.pre, el);
    } else {
        container.appendChild(built.pre);
    }

    focusCodeBlockCode(built.code);
    built.pre.scrollIntoView({ block: 'center' });

    if (window.Mojian.recordHistoryNow) window.Mojian.recordHistoryNow();
}

/**
 * 全局行号更新函数（供 editor.js 的 handleEditKeydown 调用）
 */
function updateCodeBlockLines(pre, code, lineNumbers) {
    var rawText = window.Mojian.getCodeText ? window.Mojian.getCodeText(code) : (code.textContent || '');
    // 零宽空格(\u200B)标记用户按回车创建的空行，需要据此判断是否弹出末尾空行
    var hasUserNewline = rawText.indexOf('\u200B') !== -1 && rawText.replace(/\u200B/g, '').endsWith('\n');
    var text = rawText.replace(/\u200B/g, '');
    var lines = text.split('\n');
    // 如果末尾空行不是用户创建的（来自源文档的尾部换行），则弹出
    if (lines.length > 1 && lines[lines.length - 1] === '' && !hasUserNewline) {
        lines.pop();
    }
    var lineCount = Math.max(1, lines.length);

    var html = '';
    for (var i = 0; i < lineCount; i++) {
        html += '<span>' + (i + 1) + '</span>';
    }
    lineNumbers.innerHTML = html;
    lineNumbers.style.lineHeight = '22px';
    pre.dataset.lineCount = lineCount;
}

/**
 * 规范化代码块：移除源文档末尾多余的换行符
 * 源文档通常以 \n 结尾（只是行终止符，不代表空行），
 * 移除后使 textContent 行数与 enhanceCodeBlocks 计算的行数一致
 */
function normalizeCodeTrailingNewline(code) {
    var walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT, null, false);
    var lastTextNode = null;
    while (walker.nextNode()) {
        lastTextNode = walker.currentNode;
    }
    if (lastTextNode && lastTextNode.textContent.endsWith('\n')) {
        lastTextNode.textContent = lastTextNode.textContent.slice(0, -1);
    }
}

/**
 * 为代码块设置输入监听，动态同步行号
 */
function setupCodeBlockSync(pre, code, lineNumbers) {
    // 从 enhanceCodeBlocks 已设置的行号数开始，避免初始同步覆盖正确的行号
    var lastLineCount = parseInt(pre.dataset.lineCount) || lineNumbers.children.length || 0;

    var updateLines = function() {
        var rawText = window.Mojian.getCodeText ? window.Mojian.getCodeText(code) : (code.textContent || '');
        var hasUserNewline = rawText.indexOf('\u200B') !== -1 && rawText.replace(/\u200B/g, '').endsWith('\n');
        var text = rawText.replace(/\u200B/g, '');
        var lines = text.split('\n');
        if (lines.length > 1 && lines[lines.length - 1] === '' && !hasUserNewline) {
            lines.pop();
        }
        var lineCount = Math.max(1, lines.length);

        if (lineCount !== lastLineCount) {
            var html = '';
            for (var i = 0; i < lineCount; i++) {
                html += '<span>' + (i + 1) + '</span>';
            }
            lineNumbers.innerHTML = html;
            lineNumbers.style.lineHeight = '22px';
            pre.dataset.lineCount = lineCount;
            lastLineCount = lineCount;
        }
    };

    // MutationObserver 监听 code 子节点变化（兼容 contenteditable）
    var observer = new MutationObserver(function() {
        updateLines();
    });
    observer.observe(code, {
        childList: true,
        subtree: true,
        characterData: true
    });

    // 同时监听 input 事件作为补充
    code.addEventListener('input', updateLines);

    // 不做初始同步 — 行号已由 enhanceCodeBlocks 正确设置
}

/**
 * 为页面中所有已存在的代码块初始化行号同步
 * 在进入编辑模式时调用
 */
function initExistingCodeBlockSync() {
    var elements = window.Mojian.elements;
    var codeBlocks = elements.markdownContent.querySelectorAll('pre.code-block-enhanced');
    codeBlocks.forEach(function(pre) {
        var code = pre.querySelector('code');
        var lineNumbers = pre.querySelector('.line-numbers');
        if (code && lineNumbers && !code._syncInitialized) {
            code._syncInitialized = true;
            // 规范化：移除源文档末尾多余的换行符，使行数计算一致
            normalizeCodeTrailingNewline(code);
            setupCodeBlockSync(pre, code, lineNumbers);
        }
    });
}

/* ================================================================
 * 工具栏状态更新
 * ================================================================ */
function updateToolbarState() {
    var elements = window.Mojian.elements;

    // 撤回 / 重做按钮可用性（与选区无关）
    if (window.Mojian.updateUndoRedoButtons) window.Mojian.updateUndoRedoButtons();

    if (!elements.markdownContent.isContentEditable) return;

    var selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    var range = selection.getRangeAt(0);
    var parentElement = range.commonAncestorContainer;
    if (parentElement.nodeType === Node.TEXT_NODE) {
        parentElement = parentElement.parentElement;
    }

    document.querySelectorAll('.toolbar-btn').forEach(function(btn) {
        var action = btn.dataset.action;
        var level = btn.dataset.level;
        var isActive = false;
        var el = parentElement;

        while (el && el !== elements.markdownContent) {
            switch(action) {
                case 'heading':
                    if (el.tagName === 'H' + level) isActive = true;
                    break;
                case 'bold':
                    if (el.tagName === 'STRONG' || el.tagName === 'B') isActive = true;
                    break;
                case 'italic':
                    if (el.tagName === 'EM' || el.tagName === 'I') isActive = true;
                    break;
                case 'underline':
                    if (el.tagName === 'U') isActive = true;
                    break;
                case 'strike':
                    if (el.tagName === 'DEL' || el.tagName === 'S' || el.tagName === 'STRIKE') isActive = true;
                    break;
                case 'superscript':
                    if (el.tagName === 'SUP') isActive = true;
                    break;
                case 'subscript':
                    if (el.tagName === 'SUB') isActive = true;
                    break;
                case 'code':
                    if (el.tagName === 'CODE' && !el.closest('pre')) isActive = true;
                    break;
                case 'bulletList':
                    if (el.tagName === 'UL' && !el.querySelector('input[type="checkbox"]')) isActive = true;
                    break;
                case 'orderedList':
                    if (el.tagName === 'OL') isActive = true;
                    break;
                case 'taskList':
                    if (el.tagName === 'LI' && el.querySelector('input[type="checkbox"]')) isActive = true;
                    break;
                case 'blockquote':
                    if (el.tagName === 'BLOCKQUOTE') isActive = true;
                    break;
                case 'codeBlock':
                    if (el.tagName === 'PRE') isActive = true;
                    break;
            }
            if (isActive) break;
            el = el.parentElement;
        }

        if (isActive) {
            btn.classList.add('is-active');
        } else {
            btn.classList.remove('is-active');
        }
    });
}

/* ================================================================
* 弹窗事件绑定
* ================================================================ */
function initInsertModals() {
    // 链接弹窗
    var linkConfirm = document.getElementById('insertLinkConfirm');
    var linkCancel = document.getElementById('insertLinkCancel');
    var linkModal = document.getElementById('insertLinkModal');
    var linkUrlInput = document.getElementById('insertLinkUrl');

    if (linkConfirm) linkConfirm.addEventListener('click', confirmInsertLink);
    if (linkCancel) linkCancel.addEventListener('click', cancelInsertLink);
    if (linkModal) {
        linkModal.addEventListener('click', function(e) {
            if (e.target === linkModal) cancelInsertLink();
        });
    }
    if (linkUrlInput) {
        linkUrlInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') confirmInsertLink();
            if (e.key === 'Escape') cancelInsertLink();
        });
    }
    var linkTextInput = document.getElementById('insertLinkText');
    if (linkTextInput) {
        linkTextInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') confirmInsertLink();
            if (e.key === 'Escape') cancelInsertLink();
        });
    }

    // 图片弹窗
    var imageConfirm = document.getElementById('insertImageConfirm');
    var imageCancel = document.getElementById('insertImageCancel');
    var imageModal = document.getElementById('insertImageModal');
    var imageUrlInput = document.getElementById('insertImageUrl');

    if (imageConfirm) imageConfirm.addEventListener('click', confirmInsertImage);
    if (imageCancel) imageCancel.addEventListener('click', cancelInsertImage);
    if (imageModal) {
        imageModal.addEventListener('click', function(e) {
            if (e.target === imageModal) cancelInsertImage();
        });
    }
    if (imageUrlInput) {
        imageUrlInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') confirmInsertImage();
            if (e.key === 'Escape') cancelInsertImage();
        });
    }
    var imageAltInput = document.getElementById('insertImageAlt');
    if (imageAltInput) {
        imageAltInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') confirmInsertImage();
            if (e.key === 'Escape') cancelInsertImage();
        });
    }

    // 表格弹窗
    var tableConfirm = document.getElementById('insertTableConfirm');
    var tableCancel = document.getElementById('insertTableCancel');
    var tableModal = document.getElementById('insertTableModal');
    var tableRowsInput = document.getElementById('insertTableRows');
    var tableColsInput = document.getElementById('insertTableCols');

    if (tableConfirm) tableConfirm.addEventListener('click', confirmInsertTable);
    if (tableCancel) tableCancel.addEventListener('click', cancelInsertTable);
    if (tableModal) {
        tableModal.addEventListener('click', function(e) {
            if (e.target === tableModal) cancelInsertTable();
        });
    }
    if (tableRowsInput) {
        tableRowsInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') confirmInsertTable();
            if (e.key === 'Escape') cancelInsertTable();
        });
    }
    if (tableColsInput) {
        tableColsInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') confirmInsertTable();
            if (e.key === 'Escape') cancelInsertTable();
        });
    }

    // 初始化弹窗内的 lucide 图标
    if (window.lucide) lucide.createIcons();
}

/* ================================================================
 * 表格列宽拖动
 * ================================================================ */

var tableColResizeState = {
    isResizing: false,
    currentTable: null,
    startX: 0,
    startColWidth: 0,
    startNextColWidth: 0,
    startTableWidth: 0,
    colIndex: 0,
    isTableFullWidth: false,
    isLastColEdge: false
};

/**
 * 处理表格列宽拖动 - 鼠标按下
 */
function handleTableColMouseDown(e) {
    var { state } = window.Mojian;
    if (!state.isEditMode) return;

    var target = e.target;
    var cell = target.closest('th, td');
    if (!cell) return;

    var table = cell.closest('table');
    if (!table || table.style.tableLayout !== 'fixed') return;

    var colIndex = getCellColumnIndex(cell);
    if (colIndex < 0) return;

    // 计算单元格右边框到鼠标的距离
    var cellRect = cell.getBoundingClientRect();
    var edgeThreshold = 20;
    var distanceToRightEdge = cellRect.right - e.clientX;
    var distanceToLeftEdge = e.clientX - cellRect.left;

    var colCount = table.querySelectorAll('th, td').length / table.rows.length;
    var isLastCol = colIndex === colCount - 1;

    // 在右边缘附近才触发拖动
    // 非最后一列：调整当前列和下一列宽度
    // 最后一列：调整整体表格宽度
    if (distanceToRightEdge >= 0 && distanceToRightEdge <= edgeThreshold) {
        e.preventDefault();
        e.stopPropagation();
        table.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';

        var wrapper = table.closest('.table-wrapper');
        var containerWidth = window.Mojian.elements.markdownContent.offsetWidth;
        var tableWidth = table.offsetWidth;
        var isTableFullWidth = Math.abs(tableWidth - containerWidth) < 5;

        tableColResizeState.isResizing = true;
        tableColResizeState.currentTable = table;
        tableColResizeState.startX = e.clientX;
        tableColResizeState.colIndex = colIndex;
        tableColResizeState.isTableFullWidth = isTableFullWidth;
        tableColResizeState.isLastColEdge = isLastCol;
        tableColResizeState.startTableWidth = tableWidth;

        if (!isLastCol) {
            // 非最后一列：获取当前列和下一列的宽度
            var currentColCells = table.querySelectorAll('th:nth-child(' + (colIndex + 1) + '), td:nth-child(' + (colIndex + 1) + ')');
            var nextColCells = table.querySelectorAll('th:nth-child(' + (colIndex + 2) + '), td:nth-child(' + (colIndex + 2) + ')');

            if (currentColCells.length > 0) {
                tableColResizeState.startColWidth = currentColCells[0].offsetWidth;
            }
            if (nextColCells.length > 0) {
                tableColResizeState.startNextColWidth = nextColCells[0].offsetWidth;
            }
        } else {
            // 最后一列：记录当前表格宽度
            tableColResizeState.startColWidth = cellRect.width;
        }

        document.addEventListener('mousemove', handleTableColMouseMove);
        document.addEventListener('mouseup', handleTableColMouseUp);
    }
}

/**
 * 处理表格列宽拖动 - 鼠标移动
 */
function handleTableColMouseMove(e) {
    var tcrs = tableColResizeState;
    if (!tcrs.isResizing || !tcrs.currentTable) return;

    var table = tcrs.currentTable;
    if (!table.isConnected) {
        handleTableColMouseUp();
        return;
    }

    var deltaX = e.clientX - tcrs.startX;
    var colIndex = tcrs.colIndex;
    var containerWidth = window.Mojian.elements.markdownContent.offsetWidth;
    var minColWidth = 30;
    var colCount = table.querySelectorAll('th, td').length / table.rows.length;

    if (!tcrs.isTableFullWidth) {
        // 表格宽度小于容器宽度：拖动任意列边缘，只改变该列宽度和整体表格宽度，其他列不变
        var newTableWidth = tcrs.startTableWidth + deltaX;
        newTableWidth = Math.max(tcrs.startTableWidth - tcrs.startColWidth + minColWidth, newTableWidth);
        newTableWidth = Math.min(containerWidth, newTableWidth);

        var actualDelta = newTableWidth - tcrs.startTableWidth;

        // 计算被拖动列的新宽度
        var newColWidth = tcrs.startColWidth + actualDelta;
        newColWidth = Math.max(minColWidth, newColWidth);

        // 计算其他列的总宽度
        var otherColsWidth = 0;
        for (var i = 0; i < colCount; i++) {
            if (i === colIndex) continue;
            var cells = table.querySelectorAll('th:nth-child(' + (i + 1) + '), td:nth-child(' + (i + 1) + ')');
            if (cells.length > 0) {
                otherColsWidth += cells[0].offsetWidth;
            }
        }

        // 调整以确保总和正确
        if (newColWidth + otherColsWidth > newTableWidth) {
            newColWidth = Math.max(minColWidth, newTableWidth - otherColsWidth);
        }

        // 应用新宽度
        table.style.width = newTableWidth + 'px';
        var targetColCells = table.querySelectorAll('th:nth-child(' + (colIndex + 1) + '), td:nth-child(' + (colIndex + 1) + ')');
        targetColCells.forEach(function(c) { c.style.width = newColWidth + 'px'; });
    }
}

/**
 * 处理表格列宽拖动 - 鼠标释放
 */
function handleTableColMouseUp() {
    var tcrs = tableColResizeState;

    tcrs.isResizing = false;
    tcrs.currentTable = null;
    tcrs.startX = 0;
    tcrs.startColWidth = 0;
    tcrs.startNextColWidth = 0;
    tcrs.startTableWidth = 0;
    tcrs.colIndex = 0;
    tcrs.isTableFullWidth = false;
    tcrs.isLastColEdge = false;

    document.body.style.userSelect = '';

    var tables = document.querySelectorAll('.markdown-content table');
    tables.forEach(function(t) { t.style.cursor = ''; });

    document.removeEventListener('mousemove', handleTableColMouseMove);
    document.removeEventListener('mouseup', handleTableColMouseUp);
}

/**
 * 获取单元格所在的列索引
 */
function getCellColumnIndex(cell) {
    var table = cell.closest('table');
    if (!table) return -1;

    var row = cell.parentElement;
    var cells = Array.from(row.children);
    return cells.indexOf(cell);
}

/**
 * 鼠标移动时检测是否在表格列边缘附近，显示可拖动光标
 */
function handleTableColMouseMoveCheck(e) {
    var { state } = window.Mojian;
    if (!state.isEditMode) return;
    if (tableColResizeState.isResizing) return;

    var cell = e.target.closest('th, td');
    if (!cell) {
        var tables = document.querySelectorAll('.markdown-content table');
        tables.forEach(function(t) { t.style.cursor = ''; });
        return;
    }

    var table = cell.closest('table');
    if (!table || table.style.tableLayout !== 'fixed') {
        var tables = document.querySelectorAll('.markdown-content table');
        tables.forEach(function(t) { t.style.cursor = ''; });
        return;
    }

    var cellRect = cell.getBoundingClientRect();
    var edgeThreshold = 20;
    var distanceToRightEdge = cellRect.right - e.clientX;

    var colIndex = getCellColumnIndex(cell);
    var colCount = table.querySelectorAll('th, td').length / table.rows.length;

    // 在右边缘附近（任何列的右边缘）显示 ew-resize 光标
    if (distanceToRightEdge >= 0 && distanceToRightEdge <= edgeThreshold) {
        table.style.cursor = 'ew-resize';
    } else {
        table.style.cursor = '';
    }
}

/* ================================================================
* 导出
* ================================================================ */
window.Mojian = window.Mojian || {};
Mojian.handleToolbarAction = handleToolbarAction;
Mojian.updateToolbarState = updateToolbarState;
Mojian.applyHeading = function(level) { toggleHeading(level); };
Mojian.applyInlineCode = applyInlineCodeWithSelection;
Mojian.applyTaskList = applyTaskListWithSelection;
Mojian.applyLink = applyLink;
Mojian.applyImage = applyImage;
Mojian.applyTable = applyTable;
Mojian.applyCodeBlock = applyCodeBlock;
Mojian.createCodeBlockElement = createCodeBlockElement;
Mojian.insertCodeBlockFromFence = insertCodeBlockFromFence;
Mojian.replaceSupSubSyntax = replaceSupSubSyntax;
Mojian.escapeSupSubAtCaret = escapeSupSubAtCaret;
Mojian.clearTextFormat = clearTextFormat;
Mojian.updateCodeBlockLines = updateCodeBlockLines;
Mojian.initExistingCodeBlockSync = initExistingCodeBlockSync;
Mojian.initInsertModals = initInsertModals;
Mojian.handleTableColMouseDown = handleTableColMouseDown;
Mojian.handleTableColMouseMoveCheck = handleTableColMouseMoveCheck;
