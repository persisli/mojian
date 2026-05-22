/**
 * editor/toolbar.js - 工具栏动作 + 状态更新
 */

function handleToolbarAction(btn) {
    const { elements } = window.Mojian;
    if (!elements.markdownContent.isContentEditable) return;

    const action = btn.dataset.action;
    const level = btn.dataset.level;

    try {
        switch(action) {
            case 'heading':
                applyHeading(parseInt(level));
                break;
            case 'bold':
                document.execCommand('bold', false, null);
                break;
            case 'italic':
                document.execCommand('italic', false, null);
                break;
            case 'strike':
                document.execCommand('strikeThrough', false, null);
                break;
            case 'code':
                applyInlineCode();
                break;
            case 'bulletList':
                document.execCommand('insertUnorderedList', false, null);
                break;
            case 'orderedList':
                document.execCommand('insertOrderedList', false, null);
                break;
            case 'taskList':
                applyTaskList();
                break;
            case 'blockquote':
                document.execCommand('formatBlock', false, 'blockquote');
                break;
            case 'horizontalRule':
                document.execCommand('insertHorizontalRule', false, null);
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
    } catch (error) {
        console.error('Toolbar action error:', error);
        window.Mojian.showToast('操作失败', 'error');
    }

    updateToolbarState();
}

function updateToolbarState() {
    const { elements } = window.Mojian;
    if (!elements.markdownContent.isContentEditable) return;

    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    let parentElement = range.commonAncestorContainer;
    if (parentElement.nodeType === Node.TEXT_NODE) {
        parentElement = parentElement.parentElement;
    }

    document.querySelectorAll('.toolbar-btn').forEach(btn => {
        const action = btn.dataset.action;
        const level = btn.dataset.level;
        let isActive = false;
        let el = parentElement;

        while (el && el !== elements.markdownContent) {
            switch(action) {
                case 'heading':
                    if (el.tagName === `H${level}`) isActive = true;
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
                    if (el.tagName === 'UL') isActive = true;
                    break;
                case 'orderedList':
                    if (el.tagName === 'OL') isActive = true;
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

function applyHeading(level) {
    const tag = `h${level}`;
    document.execCommand('formatBlock', false, tag);
}

function applyInlineCode() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const codeEl = document.createElement('code');
    codeEl.textContent = range.toString();
    range.deleteContents();
    range.insertNode(codeEl);
}

function applyTaskList() {
    window.Mojian.showToast('任务列表功能需要额外扩展');
}

function applyLink() {
    const url = prompt('输入链接URL:');
    if (url) {
        document.execCommand('createLink', false, url);
    }
}

function applyImage() {
    const imageUrl = prompt('输入图片URL:');
    if (imageUrl) {
        document.execCommand('insertImage', false, imageUrl);
    }
}

function applyCodeBlock() {
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    pre.appendChild(code);
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        code.textContent = range.toString();
        range.deleteContents();
        range.insertNode(pre);
    } else {
        code.textContent = '\n';
        window.Mojian.elements.markdownContent.appendChild(pre);
    }
}

function applyTable() {
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');
    for (let i = 0; i < 3; i++) {
        const row = document.createElement('tr');
        for (let j = 0; j < 3; j++) {
            const cell = document.createElement('td');
            cell.textContent = '';
            row.appendChild(cell);
        }
        tbody.appendChild(row);
    }
    table.appendChild(tbody);
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.insertNode(table);
    } else {
        window.Mojian.elements.markdownContent.appendChild(table);
    }
}

window.Mojian = window.Mojian || {};
Mojian.handleToolbarAction = handleToolbarAction;
Mojian.updateToolbarState = updateToolbarState;
Mojian.applyHeading = applyHeading;
Mojian.applyInlineCode = applyInlineCode;
Mojian.applyTaskList = applyTaskList;
Mojian.applyLink = applyLink;
Mojian.applyImage = applyImage;
Mojian.applyCodeBlock = applyCodeBlock;
Mojian.applyTable = applyTable;
