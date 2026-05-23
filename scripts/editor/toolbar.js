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
    strike: { tag: 'DEL', testTags: ['DEL', 'S', 'STRIKE'] }
};

function handleToolbarAction(btn) {
    var elements = window.Mojian.elements;
    if (!elements.markdownContent.isContentEditable) {
        console.warn('[DEBUG toolbar] SKIP - contenteditable is OFF');
        return;
    }

    var action = btn.dataset.action;
    var level = btn.dataset.level;

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
    var instantOnlyActions = ['horizontalRule', 'link', 'image', 'codeBlock', 'table'];

    try {
        if (hasSelection && !instantOnlyActions.includes(action)) {
            applyFormatWithSelection(action, level);
        } else {
            switch(action) {
                case 'bold':
                case 'italic':
                case 'strike':
                    toggleInlineFormat(action);
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
    setTimeout(function() { updateToolbarState(); }, 10);
}

/* ================================================================
 * 选中文本时：瞬时应用格式
 * ================================================================ */
function applyFormatWithSelection(action, level) {
    switch(action) {
        case 'bold':
        case 'italic':
        case 'strike':
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

    var node = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    var codeEl = node.closest('code');

    if (codeEl && !codeEl.closest('pre')) {
        // ===== EXIT: 退出行内代码 =====
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

        // 空 code 元素则删除
        var text = codeEl.textContent || '';
        if (text === '\u200B' || text.trim() === '') {
            parent.removeChild(codeEl);
        }
    } else {
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
}

function applyInlineCodeWithSelection() {
    var selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    var range = selection.getRangeAt(0);
    var text = range.toString();
    if (!text) return;

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
    if (sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed) {
        selectedText = sel.getRangeAt(0).toString();
    }
    urlInput.value = '';
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
 * 代码块 / 表格
 * ================================================================ */
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

    // 构建与导入模式一致的增强代码块结构
    var pre = document.createElement('pre');
    pre.className = 'code-block-enhanced';

    // Header 栏（设 contentEditable=false 防止编辑模式下误改）
    var header = document.createElement('div');
    header.className = 'code-block-header';
    header.contentEditable = 'false';

    var langLabel = document.createElement('span');
    langLabel.className = 'code-block-lang';
    langLabel.textContent = 'CODE';
    header.appendChild(langLabel);

    // 下载 + 复制按钮
    var actions = document.createElement('div');
    actions.className = 'code-block-actions';

    var downloadBtn = document.createElement('button');
    downloadBtn.className = 'code-block-btn';
    downloadBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';
    downloadBtn.title = '下载';
    actions.appendChild(downloadBtn);

    var copyBtn = document.createElement('button');
    copyBtn.className = 'code-block-btn';
    copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
    copyBtn.title = '复制';
    actions.appendChild(copyBtn);

    header.appendChild(actions);
    pre.appendChild(header);

    // 计算行数
    var lines = content.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    var lineCount = Math.max(1, lines.length);
    pre.dataset.lineCount = lineCount;

    // Code wrapper + 行号 + 代码容器
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
    code.textContent = content;
    codeContainer.appendChild(code);
    codeWrapper.appendChild(codeContainer);
    pre.appendChild(codeWrapper);

    // 插入
    if (insertRange) {
        insertRange.insertNode(pre);
    } else if (selection.rangeCount > 0) {
        selection.getRangeAt(0).insertNode(pre);
    } else {
        window.Mojian.elements.markdownContent.appendChild(pre);
    }

    // 光标放入 code 元素内（避免意外选中 header 或行号）
    var sel = window.getSelection();
    var newRange = document.createRange();
    var codeFirstChild = code.firstChild;
    if (codeFirstChild) {
        newRange.setStart(codeFirstChild, 0);
        newRange.collapse(true);
    } else {
        newRange.selectNodeContents(code);
        newRange.collapse(true);
    }
    sel.removeAllRanges();
    sel.addRange(newRange);

    // 绑定按钮事件
    downloadBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        var rawCode = code.textContent || '';
        if (window.Mojian.downloadCode) window.Mojian.downloadCode(rawCode, '');
    };
    copyBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        var rawCode = code.textContent || '';
        if (window.Mojian.copyCodeToClipboard) window.Mojian.copyCodeToClipboard(rawCode);
    };

    // 监听 code 内容变化，动态同步行号
    setupCodeBlockSync(pre, code, lineNumbers);
}

/**
 * 全局行号更新函数（供 editor.js 的 handleEditKeydown 调用）
 */
function updateCodeBlockLines(pre, code, lineNumbers) {
    var rawText = code.textContent || '';
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
        var rawText = code.textContent || '';
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

function applyTable() {
    var table = document.createElement('table');
    var tbody = document.createElement('tbody');
    for (var i = 0; i < 3; i++) {
        var row = document.createElement('tr');
        for (var j = 0; j < 3; j++) {
            var cell = document.createElement('td');
            cell.textContent = '';
            row.appendChild(cell);
        }
        tbody.appendChild(row);
    }
    table.appendChild(tbody);
    var selection = window.getSelection();
    if (selection.rangeCount > 0) {
        selection.getRangeAt(0).insertNode(table);
    } else {
        window.Mojian.elements.markdownContent.appendChild(table);
    }
}

/* ================================================================
 * 工具栏状态更新
 * ================================================================ */
function updateToolbarState() {
    var elements = window.Mojian.elements;
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
                case 'strike':
                    if (el.tagName === 'DEL' || el.tagName === 'S' || el.tagName === 'STRIKE') isActive = true;
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

    // 初始化弹窗内的 lucide 图标
    if (window.lucide) lucide.createIcons();
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
Mojian.applyCodeBlock = applyCodeBlock;
Mojian.applyTable = applyTable;
Mojian.updateCodeBlockLines = updateCodeBlockLines;
Mojian.initExistingCodeBlockSync = initExistingCodeBlockSync;
Mojian.initInsertModals = initInsertModals;
