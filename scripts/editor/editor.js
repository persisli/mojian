/**
 * editor/editor.js - 编辑模式切换 + Tiptap初始化
 */

function toggleEditMode() {
    const { state } = window.Mojian;
    if (state.isEditMode) {
        exitEditMode();
    } else {
        enterEditMode();
    }
}

function enterEditMode() {
    const { elements, state } = window.Mojian;
    state.isEditMode = true;

    if (!state.currentFile) {
        elements.welcomeScreen.style.display = 'none';
        elements.welcomeScreen.classList.remove('active');
        elements.readingArea.style.display = 'block';
        elements.readingArea.classList.add('active');
        elements.statusBar.style.display = 'block';
        state.currentFile = { name: i18n.t('file.untitled') };
        elements.fileName.textContent = state.currentFile.name;
        elements.fileName.style.display = 'inline';
        state.content = '';
        window.Mojian.renderContent(state.content);
    }

    elements.markdownContent.setAttribute('contenteditable', 'true');
    elements.markdownContent.classList.add('editing');

    // 初始进入编辑模式时，隐藏状态栏
    elements.statusBar.style.display = 'none';

    setTimeout(() => {
        elements.markdownContent.focus();
        // 为页面中已存在的代码块初始化行号同步
        if (window.Mojian.initExistingCodeBlockSync) {
            window.Mojian.initExistingCodeBlockSync();
        }
        // 初始化撤回 / 重做历史（基线 = 进入编辑模式时的内容）
        if (window.Mojian.initHistory) {
            window.Mojian.initHistory();
        }
    }, 100);

    elements.editToolbar.classList.add('visible');
    elements.editBtn.innerHTML = '<i data-lucide="eye"></i>';
    lucide.createIcons();

    elements.markdownContent.addEventListener('keydown', handleEditKeydown);
    elements.markdownContent.addEventListener('keyup', handleMarkdownSyntax);
    elements.markdownContent.addEventListener('mousedown', handleImageMouseDown);
    elements.markdownContent.addEventListener('dblclick', handleBlankAreaDblClick);
    elements.markdownContent.addEventListener('mouseup', handleEditorMouseUp);
    document.addEventListener('mousemove', handleImageMouseMove);
    // 表格列宽拖动
    document.addEventListener('mousemove', handleTableColMouseMoveCheck);
    document.addEventListener('mousedown', handleTableColMouseDown);

    window.Mojian.showToast(i18n.t('toast.enterEditMode') || '进入编辑模式', 'success', 'edit-mode');
}

function exitEditMode() {
    const { elements, state } = window.Mojian;
    state.isEditMode = false;

    // 销毁撤回 / 重做历史（下次进入编辑模式时重新建立基线）
    if (window.Mojian.destroyHistory) {
        window.Mojian.destroyHistory();
    }

    if (window.Mojian.autoSaveTimer) {
        clearTimeout(window.Mojian.autoSaveTimer);
        window.Mojian.autoSaveTimer = null;
    }

    if (elements.markdownContent.innerHTML) {
        autoSaveContent(elements.markdownContent.innerHTML);
    }

    elements.editToolbar.classList.remove('visible');
    elements.markdownContent.setAttribute('contenteditable', 'false');
    elements.markdownContent.classList.remove('editing');
    elements.markdownContent.removeEventListener('keydown', handleEditKeydown);
    elements.markdownContent.removeEventListener('keyup', handleMarkdownSyntax);
    elements.markdownContent.removeEventListener('mousedown', handleImageMouseDown);
    elements.markdownContent.removeEventListener('dblclick', handleBlankAreaDblClick);
    elements.markdownContent.removeEventListener('mouseup', handleEditorMouseUp);
    document.removeEventListener('mousemove', handleImageMouseMove);
    document.removeEventListener('mouseup', handleImageMouseUp);
    // 表格列宽拖动
    document.removeEventListener('mousemove', handleTableColMouseMoveCheck);
    document.removeEventListener('mousedown', handleTableColMouseDown);
    document.removeEventListener('mousemove', handleTableColMouseMove);
    document.removeEventListener('mouseup', handleTableColMouseUp);

    const htmlContent = elements.markdownContent.innerHTML;
    state.content = window.Mojian.htmlToMarkdown(htmlContent);

    elements.editBtn.innerHTML = '<i data-lucide="pencil"></i>';
    lucide.createIcons();

    window.Mojian.showToast(i18n.t('toast.exitEditMode') || '退出编辑模式', 'success', 'edit-mode');
}

function handleImageMouseDown(e) {
    const { state } = window.Mojian;
    const img = e.target.closest('img');
    if (!img || !state.isEditMode) return;

    const rect = img.getBoundingClientRect();
    const edgeThreshold = 25;
    const isRightEdge = e.clientX >= rect.right - edgeThreshold;
    const isBottomEdge = e.clientY >= rect.bottom - edgeThreshold;
    const isLeftEdge = e.clientX <= rect.left + edgeThreshold;
    const isTopEdge = e.clientY <= rect.top + edgeThreshold;

    if (isRightEdge || isBottomEdge || isLeftEdge || isTopEdge) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const aspectRatio = rect.width / rect.height;
        img.style.visibility = 'hidden';

        const targetImg = img.cloneNode(true);
        targetImg.draggable = false;
        targetImg.style.userSelect = 'none';
        targetImg.style.webkitUserSelect = 'none';
        targetImg.style.pointerEvents = 'none';
        targetImg.style.position = 'fixed';
        targetImg.style.left = rect.left + 'px';
        targetImg.style.top = rect.top + 'px';
        targetImg.style.width = rect.width + 'px';
        targetImg.style.height = rect.height + 'px';
        targetImg.style.maxWidth = 'none';
        targetImg.style.maxHeight = 'none';
        targetImg.style.visibility = 'visible';
        targetImg.style.opacity = '0.7';
        targetImg.style.zIndex = '1000';
        targetImg.style.boxSizing = 'border-box';
        document.body.appendChild(targetImg);

        window.Mojian.elements.markdownContent.style.pointerEvents = 'none';

        let resizeEdge = 'right';
        if (isLeftEdge && isTopEdge) resizeEdge = 'nw';
        else if (isRightEdge && isTopEdge) resizeEdge = 'ne';
        else if (isLeftEdge && isBottomEdge) resizeEdge = 'sw';
        else if (isRightEdge && isBottomEdge) resizeEdge = 'se';
        else if (isLeftEdge) resizeEdge = 'left';
        else if (isRightEdge) resizeEdge = 'right';
        else if (isTopEdge) resizeEdge = 'top';
        else if (isBottomEdge) resizeEdge = 'bottom';

        const irs = window.Mojian.imageResizeState;
        irs.isResizing = true;
        irs.currentImage = targetImg;
        irs.startX = e.clientX;
        irs.startY = e.clientY;
        irs.startWidth = rect.width;
        irs.startHeight = rect.height;
        irs.aspectRatio = aspectRatio;
        irs.originalImg = img;
        irs.resizeEdge = resizeEdge;

        document.addEventListener('mousemove', handleImageMouseMove);
        document.addEventListener('mouseup', handleImageMouseUp);
    }
}

function handleImageMouseMove(e) {
    const irs = window.Mojian.imageResizeState;
    if (irs.isResizing) {
        const img = irs.currentImage;
        if (!img || !img.isConnected) {
            irs.isResizing = false;
            irs.currentImage = null;
            document.removeEventListener('mousemove', handleImageMouseMove);
            document.removeEventListener('mouseup', handleImageMouseUp);
            return;
        }

        const edge = irs.resizeEdge;
        const deltaX = e.clientX - irs.startX;
        const deltaY = e.clientY - irs.startY;
        const startLeft = parseFloat(img.style.left);
        const startTop = parseFloat(img.style.top);
        let newWidth, newHeight, newLeft, newTop;

        if (edge === 'right' || edge === 'ne' || edge === 'se') {
            newWidth = irs.startWidth + deltaX;
            newWidth = Math.max(50, newWidth);
            newHeight = newWidth / irs.aspectRatio;
            newLeft = startLeft;
            newTop = startTop;
        } else if (edge === 'left' || edge === 'sw' || edge === 'nw') {
            newWidth = irs.startWidth - deltaX;
            newWidth = Math.max(50, newWidth);
            newHeight = newWidth / irs.aspectRatio;
            newLeft = startLeft + irs.startWidth - newWidth;
            newTop = startTop;
        } else if (edge === 'bottom') {
            newHeight = irs.startHeight + deltaY;
            newHeight = Math.max(50 / irs.aspectRatio, newHeight);
            newWidth = newHeight * irs.aspectRatio;
            newLeft = startLeft;
            newTop = startTop;
        } else if (edge === 'top') {
            newHeight = irs.startHeight - deltaY;
            newHeight = Math.max(50 / irs.aspectRatio, newHeight);
            newWidth = newHeight * irs.aspectRatio;
            newLeft = startLeft;
            newTop = startTop;
        }

        img.style.width = newWidth + 'px';
        img.style.height = newHeight + 'px';
        img.style.left = newLeft + 'px';
        img.style.top = newTop + 'px';
        img.style.maxWidth = 'none';
        img.style.maxHeight = 'none';
        return;
    }

    const { state } = window.Mojian;
    const img = e.target.closest('img');
    if (!img || !state.isEditMode) return;
    if (!img.isConnected) return;

    img.style.pointerEvents = 'auto';
    img.draggable = false;

    const rect = img.getBoundingClientRect();
    const edgeThreshold = 25;
    const isRightEdge = e.clientX >= rect.right - edgeThreshold;
    const isBottomEdge = e.clientY >= rect.bottom - edgeThreshold;
    const isLeftEdge = e.clientX <= rect.left + edgeThreshold;
    const isTopEdge = e.clientY <= rect.top + edgeThreshold;

    if (isRightEdge && isBottomEdge) {
        img.style.cursor = 'se-resize';
    } else if (isLeftEdge && isTopEdge) {
        img.style.cursor = 'nw-resize';
    } else if (isRightEdge && isTopEdge) {
        img.style.cursor = 'ne-resize';
    } else if (isLeftEdge && isBottomEdge) {
        img.style.cursor = 'sw-resize';
    } else if (isRightEdge || isLeftEdge) {
        img.style.cursor = 'ew-resize';
    } else if (isTopEdge || isBottomEdge) {
        img.style.cursor = 'ns-resize';
    } else {
        img.style.cursor = '';
        img.style.pointerEvents = '';
    }
}

function handleImageMouseUp() {
    const irs = window.Mojian.imageResizeState;
    if (irs.currentImage) {
        if (irs.originalImg && irs.currentImage.isConnected) {
            const finalWidth = irs.currentImage.offsetWidth;
            const finalHeight = irs.currentImage.offsetHeight;
            irs.originalImg.style.visibility = 'visible';
            irs.originalImg.style.width = finalWidth + 'px';
            irs.originalImg.style.height = finalHeight + 'px';
            irs.currentImage.remove();
        }
    }
    irs.isResizing = false;
    irs.currentImage = null;
    irs.originalImg = null;
    window.Mojian.elements.markdownContent.style.pointerEvents = 'auto';
    document.removeEventListener('mousemove', handleImageMouseMove);
    document.removeEventListener('mouseup', handleImageMouseUp);
}

/**
 * 双击空白区域：在最后添加新段落并移出光标
 */
function handleBlankAreaDblClick(e) {
    const elements = window.Mojian.elements;
    const content = elements.markdownContent;

    // 检查点击是否发生在 markdownContent 自身的空白区域（而非子元素内）
    const target = e.target;
    const isBlankArea = target === content;

    if (!isBlankArea) {
        // 如果点击的是子元素，检查是否在最后一个元素的边缘区域
        const lastChild = content.lastElementChild;
        if (!lastChild) return;

        const lastRect = lastChild.getBoundingClientRect();
        // 点击在最后一个元素下方（空白区域）
        const clickY = e.clientY;
        const isBelowLastChild = clickY > lastRect.bottom;

        if (!isBelowLastChild) return;
    }

    // 在最后插入新段落
    const newP = document.createElement('p');
    newP.innerHTML = '<br>';
    content.appendChild(newP);

    // 将光标定位到新段落开头
    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(newP, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    // 滚动到光标位置
    newP.scrollIntoView({ block: 'center' });
}

/**
 * 点击到上标 / 下标右侧空白处时，把光标从格式内部移到右侧的常规状态
 */
function handleEditorMouseUp(e) {
    const { state } = window.Mojian;
    if (!state.isEditMode) return;

    // 直接点在上标 / 下标文字上时不处理（用户可能是想编辑它）
    const target = e.target;
    if (target && target.closest && target.closest('sup, sub')) return;

    if (window.Mojian.escapeSupSubAtCaret) {
        window.Mojian.escapeSupSubAtCaret();
        // 浏览器可能在本轮事件后才最终确定光标，再兜一次（已逃逸时为空操作）
        setTimeout(function() {
            if (window.Mojian.escapeSupSubAtCaret) window.Mojian.escapeSupSubAtCaret();
        }, 0);
    }
}

function handleEditKeydown(e) {
    // ===== 撤回 / 重做快捷键（拦截浏览器原生行为，使用自建历史）=====
    if ((e.ctrlKey || e.metaKey) && !e.isComposing) {
        const key = (e.key || '').toLowerCase();
        if (key === 'z' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            if (window.Mojian.undo) window.Mojian.undo();
            return;
        }
        if (key === 'y' || (key === 'z' && e.shiftKey)) {
            e.preventDefault();
            e.stopPropagation();
            if (window.Mojian.redo) window.Mojian.redo();
            return;
        }
    }

    // ===== 光标停在上标 / 下标末尾时按右方向键：移到格式右侧的常规状态 =====
    if (e.key === 'ArrowRight' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && !e.isComposing) {
        if (window.Mojian.escapeSupSubAtCaret && window.Mojian.escapeSupSubAtCaret()) {
            e.preventDefault();
            return;
        }
    }

    // Backspace键处理：光标在标题开头时删除标题样式
    if (e.key === 'Backspace') {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        if (!range.collapsed) return; // 有选区时不处理

        // 检查光标是否在标题的最左边
        const container = range.startContainer;
        let offset = range.startOffset;

        // 如果光标在文本节点中
        if (container.nodeType === Node.TEXT_NODE) {
            const text = container.textContent;
            // 检查光标是否在文本的最左边（offset为0）
            if (offset === 0) {
                // 向上查找是否是标题
                let parent = container.parentElement;
                while (parent && parent !== window.Mojian.elements.markdownContent) {
                    if (/^H[1-3]$/.test(parent.tagName)) {
                        // 光标在标题的最左边，按Backspace应该将标题转换为普通段落
                        e.preventDefault();
                        convertHeadingToParagraph(parent);
                        return;
                    }
                    parent = parent.parentElement;
                }
            }
        }
        // 如果光标直接在标题元素内且offset为0（如光标在H1的起始位置）
        else if (container.nodeType === Node.ELEMENT_NODE) {
            if (range.startOffset === 0) {
                let parent = container;
                while (parent && parent !== window.Mojian.elements.markdownContent) {
                    if (/^H[1-3]$/.test(parent.tagName)) {
                        e.preventDefault();
                        convertHeadingToParagraph(parent);
                        return;
                    }
                    parent = parent.parentElement;
                }
            }
        }
        return; // Backspace处理完成，不再继续
    }

    if (e.key !== 'Enter') return;
    // 跳过输入法组合输入中的回车
    if (e.isComposing) return;
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    let currentNode = range.commonAncestorContainer;
    if (currentNode.nodeType === Node.TEXT_NODE) {
        currentNode = currentNode.parentElement;
    }

    // ===== 分割线附近回车：防止 hr 被删除 =====
    // 检查光标是否紧邻 hr 元素（光标在 hr 后面的空段落或空白文本中）
    var nearHr = null;
    var checkForHr = currentNode;
    while (checkForHr && checkForHr !== window.Mojian.elements.markdownContent) {
        if (checkForHr.tagName === 'HR') {
            nearHr = checkForHr;
            break;
        }
        // 检查当前元素的前一个兄弟是否是 hr
        if (checkForHr.previousElementSibling && checkForHr.previousElementSibling.tagName === 'HR') {
            nearHr = checkForHr.previousElementSibling;
            break;
        }
        // 如果当前元素是只含空白/br的段落，检查其前一个兄弟
        if (/^(P|DIV)$/i.test(checkForHr.tagName)) {
            var pText = checkForHr.textContent.replace(/\u200B/g, '').trim();
            if (!pText && checkForHr.previousElementSibling && checkForHr.previousElementSibling.tagName === 'HR') {
                nearHr = checkForHr.previousElementSibling;
            }
        }
        checkForHr = checkForHr.parentElement;
    }

    if (nearHr) {
        // 光标在 hr 后面，确保 hr 后面有段落可以放置光标
        var afterHr = nearHr.nextElementSibling;
        if (!afterHr || !/^(P|DIV)$/i.test(afterHr.tagName)) {
            e.preventDefault();
            var hrP = document.createElement('p');
            hrP.innerHTML = '<br>';
            nearHr.parentNode.insertBefore(hrP, nearHr.nextSibling);
            var hrRange = document.createRange();
            hrRange.setStart(hrP, 0);
            hrRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(hrRange);
            return;
        }
    }

    // ===== 代码块内回车：手动插入 \n 文本节点，防止浏览器创建 div/br =====
    const codeEl = currentNode.closest ? currentNode.closest('code') : null;
    if (codeEl && codeEl.closest('pre')) {
        e.preventDefault();

        // 如果选区有内容，先删除
        if (!range.collapsed) {
            range.deleteContents();
        }

        // 检测是否为空行（只有末尾换行符，无实际内容）
        var codeText = codeEl.textContent || '';
        var isEmptyTrailingNewline = codeText === '\n';

        if (isEmptyTrailingNewline) {
            // 空代码块：将内容替换为 '\n\u200B'，确保显示 2 行（而非追加导致 3 行）
            codeEl.textContent = '\n\u200B';
            var newRange = document.createRange();
            newRange.setStart(codeEl.firstChild, 1);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
        } else {
            // 手动插入 \n 文本节点（与导入模式保持一致的 DOM 结构）
            var newlineNode = document.createTextNode('\n');
            range.insertNode(newlineNode);

            // 在 \n 后插入零宽空格(\u200B)确保空行可渲染
            var zwsNode = document.createTextNode('\u200B');
            newlineNode.parentNode.insertBefore(zwsNode, newlineNode.nextSibling);

            // 将光标定位到 \n 和 \u200B 之间
            var newRange = document.createRange();
            newRange.setStart(newlineNode.nextSibling, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
        }

        // 同步行号
        var pre = codeEl.closest('pre');
        var lineNumbers = pre ? pre.querySelector('.line-numbers') : null;
        if (pre && lineNumbers && window.Mojian.updateCodeBlockLines) {
            window.Mojian.updateCodeBlockLines(pre, codeEl, lineNumbers);
        }
        return;
    }

    // ===== 任务列表内回车：自动为新行插入 checkbox =====
    var taskLi = null;
    var el2 = currentNode;
    while (el2 && el2 !== window.Mojian.elements.markdownContent) {
        if (el2.tagName === 'LI' && el2.querySelector('input[type="checkbox"]')) {
            taskLi = el2;
            break;
        }
        el2 = el2.parentElement;
    }

    if (taskLi) {
        var taskCheckbox = taskLi.querySelector('input[type="checkbox"]');
        // 判断当前 li 是否为空（只有 checkbox 和零宽空格/br）
        var taskLiIsEmpty = taskLi.textContent.replace(/\u200B/g, '').trim() === '' &&
                           !taskLi.querySelector('img') && !taskLi.querySelector('code');

        if (taskLiIsEmpty) {
            // 空任务列表项：退出任务列表，转为普通段落
            e.preventDefault();
            var taskUl = taskLi.closest('ul');
            var taskP = document.createElement('p');
            taskP.innerHTML = '<br>';
            if (taskUl) {
                taskUl.parentNode.insertBefore(taskP, taskUl.nextSibling);
                // 如果 UL 只有一个 li，删除整个 UL
                if (taskUl.querySelectorAll('li').length <= 1) {
                    taskUl.parentNode.removeChild(taskUl);
                } else {
                    taskUl.removeChild(taskLi);
                }
            } else {
                taskLi.parentNode.replaceChild(taskP, taskLi);
            }
            var taskRange = document.createRange();
            taskRange.setStart(taskP, 0);
            taskRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(taskRange);
        } else {
            // 非空：让浏览器默认创建新 li，然后在新的 li 前插入 checkbox
            e.preventDefault();

            // 拆分当前 li 的内容到新 li
            // 找到光标在 li 中的位置
            var cursorNode = range.startContainer;
            var cursorOffset = range.startOffset;

            // 收集光标后的内容
            var afterNodes = [];
            if (cursorNode.nodeType === Node.TEXT_NODE) {
                var textBefore = cursorNode.textContent.substring(0, cursorOffset);
                var textAfter = cursorNode.textContent.substring(cursorOffset);
                cursorNode.textContent = textBefore;
                if (textAfter) {
                    afterNodes.push(document.createTextNode(textAfter));
                }
            } else if (cursorNode.nodeType === Node.ELEMENT_NODE) {
                // 从 cursorOffset 位置开始，将后续子节点移到新 li
                while (cursorNode.childNodes.length > cursorOffset) {
                    afterNodes.push(cursorNode.removeChild(cursorNode.childNodes[cursorOffset]));
                }
            }

            // 从光标向上遍历，收集光标后面层级中的节点
            var walkNode = cursorNode;
            while (walkNode && walkNode !== taskLi && walkNode !== window.Mojian.elements.markdownContent) {
                var parentEl = walkNode.parentNode;
                if (parentEl && parentEl !== taskLi) {
                    var sibling = walkNode.nextSibling;
                    while (sibling) {
                        var nextSib = sibling.nextSibling;
                        afterNodes.push(parentEl.removeChild(sibling));
                        sibling = nextSib;
                    }
                }
                walkNode = parentEl;
            }

            // 确保当前 li 不为空
            var curText = taskLi.textContent.replace(/\u200B/g, '').trim();
            if (!curText && !taskLi.querySelector('img') && !taskLi.querySelector('code')) {
                taskLi.appendChild(document.createTextNode('\u200B'));
            }

            // 创建新 li，包含 checkbox 和后续内容
            var newTaskLi = document.createElement('li');
            var newCheckbox = document.createElement('input');
            newCheckbox.type = 'checkbox';
            newCheckbox.style.cssText = 'margin-right:8px;';
            newTaskLi.appendChild(newCheckbox);

            for (var k = 0; k < afterNodes.length; k++) {
                newTaskLi.appendChild(afterNodes[k]);
            }

            if (!newTaskLi.textContent.trim()) {
                newTaskLi.appendChild(document.createTextNode('\u200B'));
            }

            // 插入新 li
            taskLi.parentNode.insertBefore(newTaskLi, taskLi.nextSibling);

            // 光标放到新 li 的 checkbox 后面
            var newTaskRange = document.createRange();
            newTaskRange.setStartAfter(newCheckbox);
            newTaskRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newTaskRange);
        }
        return;
    }

    // ===== 引用块内回车 =====
    let isInBlockquote = false;
    let blockquoteElement = null;
    let el = currentNode;
    while (el && el !== window.Mojian.elements.markdownContent) {
        if (el.tagName === 'BLOCKQUOTE') {
            isInBlockquote = true;
            blockquoteElement = el;
            break;
        }
        el = el.parentElement;
    }

    if (isInBlockquote) {
        const currentParagraph = currentNode.closest('p') || currentNode;
        const isEmpty = !currentParagraph.textContent.trim() ||
                       (currentParagraph.childNodes.length === 1 &&
                        currentParagraph.firstChild.nodeName === 'BR');
        if (isEmpty) {
            e.preventDefault();
            const newParagraph = document.createElement('p');
            newParagraph.innerHTML = '<br>';
            blockquoteElement.parentNode.insertBefore(newParagraph, blockquoteElement.nextSibling);
            const newRange = document.createRange();
            newRange.setStart(newParagraph, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            window.Mojian.elements.markdownContent.focus();
        }
    }
}

/**
 * Markdown 语法输入检测
 * 支持在行首输入 markdown 标记后自动进入对应编辑状态：
 *   "# "    → 一级标题
 *   "## "   → 二级标题
 *   "### "  → 三级标题
 *   "- "    → 无序列表
 *   "1. "   → 有序列表（也支持 "1) " 格式）
 *   "> "    → 引用
 *   "[] "   → 任务列表
 */
function handleMarkdownSyntax(e) {
    // ===== 上标 ^{内容} / 下标 _{内容}：输入右花括号时触发 =====
    if (e.key === '}' && !e.isComposing) {
        applySupSubSyntax();
        return;
    }

    // 仅在按下空格或回车时触发
    if (e.key !== ' ' && e.key !== 'Enter') return;

    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!range.collapsed) return; // 有选中文本时不触发

    const container = window.Mojian.elements.markdownContent;
    if (!container || !container.isContentEditable) return;

    // 跳过代码块内的输入（代码块内不应触发 markdown 语法转换）
    let checkNode = range.startContainer;
    if (checkNode.nodeType === Node.TEXT_NODE) {
        checkNode = checkNode.parentElement;
    }
    if (checkNode && checkNode.closest && checkNode.closest('pre code')) return;

    let node = range.startContainer;
    let offset = range.startOffset;

    // 如果光标在文本节点中，获取光标前的文本
    let textBeforeCursor = '';
    if (node.nodeType === Node.TEXT_NODE) {
        textBeforeCursor = node.textContent.substring(0, offset);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        // 光标可能在元素节点中（如 <p>）
        if (node.childNodes.length > 0 && offset > 0) {
            const childNode = node.childNodes[offset - 1];
            if (childNode && childNode.nodeType === Node.TEXT_NODE) {
                textBeforeCursor = childNode.textContent;
            }
        }
        // 否则获取元素自身的文本
        if (!textBeforeCursor) {
            textBeforeCursor = node.textContent || '';
        }
    }

    // 检查光标是否在行首（textBeforeCursor 只有标记文本）
    const trimmedText = textBeforeCursor.trimStart();
    if (!trimmedText) return;

    // 用分割线判断是空格触发还是回车触发
    const isSpace = (e.key === ' ');

    // 检查各种 markdown 语法
    const patterns = [
        { regex: /^#{1}\s$/, action: 'heading', level: 1, fullMatch: '# ' },
        { regex: /^#{2}\s$/, action: 'heading', level: 2, fullMatch: '## ' },
        { regex: /^#{3}\s$/, action: 'heading', level: 3, fullMatch: '### ' },
        { regex: /^-\s$/, action: 'bulletList', level: null, fullMatch: '- ' },
        { regex: /^\d+[.)]\s$/, action: 'orderedList', level: null, fullMatch: null }, // 需要保留数字prefix
        { regex: /^>\s$/, action: 'blockquote', level: null, fullMatch: '> ' },
        { regex: /^\[\]\s$/, action: 'taskList', level: null, fullMatch: '[] ' },
        // 代码块围栏：```bash + 空格 / ``` + 空格（语言可省略）
        { regex: /^```([a-zA-Z0-9_+#.-]*)\s$/, action: 'codeFence', level: null, fullMatch: null },
    ];

    let matched = null;
    for (const p of patterns) {
        if (p.regex.test(trimmedText)) {
            matched = p;
            break;
        }
    }

    if (!matched) return;

    // 检查光标是否在整行的开头位置（防止 mid-line 匹配）
    // 获取当前行文本
    const currentLineText = getCurrentLineText(node, offset);
    if (!isAtLineStart(currentLineText, trimmedText)) return;

    // 应用对应的格式
    switch (matched.action) {
        case 'heading':
            // 直接在handleMarkdownSyntax中执行标题转换，避免复杂的range协作问题
            convertToHeading(node, offset, matched.level, matched.fullMatch);
            break;
        case 'bulletList':
            removeMarkdownPrefix(node, offset, matched.fullMatch);
            document.execCommand('insertUnorderedList', false, null);
            break;
        case 'orderedList':
            removeMarkdownPrefix(node, offset, trimmedText);
            document.execCommand('insertOrderedList', false, null);
            break;
        case 'blockquote':
            removeMarkdownPrefix(node, offset, matched.fullMatch);
            document.execCommand('formatBlock', false, 'blockquote');
            break;
        case 'taskList':
            removeMarkdownPrefix(node, offset, matched.fullMatch);
            applyTaskListSyntax();
            break;
        case 'codeFence':
            // 仅由空格触发
            if (!isSpace) break;
            const fenceMatch = trimmedText.match(/^```([a-zA-Z0-9_+#.-]*)\s$/);
            const fenceLang = fenceMatch ? fenceMatch[1].toLowerCase() : '';
            removeMarkdownPrefix(node, offset, trimmedText);
            if (window.Mojian.insertCodeBlockFromFence) {
                window.Mojian.insertCodeBlockFromFence(node, fenceLang);
            }
            break;
    }
}

/**
 * 将当前行转换为标题
 */
function convertToHeading(node, offset, level, prefix) {
    if (node.nodeType !== Node.TEXT_NODE) return;

    const text = node.textContent;
    console.log('convertToHeading - text:', JSON.stringify(text), 'prefix:', JSON.stringify(prefix));
    
    // 处理空白字符不一致问题（将所有空白字符替换为普通空格）
    const normalizedText = text.replace(/\s/g, ' ');
    const normalizedPrefix = prefix.replace(/\s/g, ' ');
    
    let idx = normalizedText.indexOf(normalizedPrefix);
    console.log('convertToHeading - normalizedText:', JSON.stringify(normalizedText), 'idx:', idx);
    
    if (idx === -1) {
        // 如果标准化后仍未找到，尝试直接查找原始文本
        idx = text.indexOf(prefix);
        if (idx === -1) return;
    }

    // 获取光标所在的block级元素
    const container = window.Mojian.elements.markdownContent;
    let blockNode = node.parentElement;
    while (blockNode && blockNode !== container && !['P', 'DIV', 'BLOCKQUOTE'].includes(blockNode.tagName)) {
        blockNode = blockNode.parentElement;
    }
    if (!blockNode || blockNode === container) return;

    // 移除prefix（#号+空格）
    const textWithoutPrefix = text.substring(0, idx) + text.substring(idx + prefix.length);

    // 创建标题元素
    const headingTag = 'H' + level;
    const heading = document.createElement(headingTag);
    if (textWithoutPrefix) {
        heading.textContent = textWithoutPrefix;
    } else {
        heading.innerHTML = '<br>';
    }

    // 替换原block节点
    blockNode.parentNode.replaceChild(heading, blockNode);

    // 将光标移到标题内
    const selection = window.getSelection();
    const newRange = document.createRange();
    if (heading.firstChild) {
        const textNode = heading.firstChild;
        const newOffset = textWithoutPrefix ? textWithoutPrefix.length : 0;
        newRange.setStart(textNode, Math.min(newOffset, textNode.textContent.length));
    } else {
        newRange.setStart(heading, 0);
    }
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
}

/**
 * 获取光标所在行的文本内容
 */
function getCurrentLineText(node, offset) {
    if (node.nodeType !== Node.TEXT_NODE) return '';
    return node.textContent;
}

/**
 * 检查匹配的标记是否在行首
 */
function isAtLineStart(lineText, matchedText) {
    // 去掉标记后的文本应该以标记开头
    const idx = lineText.indexOf(matchedText);
    if (idx === -1) return false;
    // 标记前面的字符只能是空白字符
    const before = lineText.substring(0, idx);
    return before.trim() === '';
}

/**
 * 移除已输入的 markdown 前缀标记
 */
function removeMarkdownPrefix(node, offset, prefix) {
    if (node.nodeType !== Node.TEXT_NODE || !prefix) return;

    const text = node.textContent;
    const idx = text.indexOf(prefix);
    if (idx === -1) return;

    node.textContent = text.substring(0, idx) + text.substring(idx + prefix.length);

    // 更新光标位置
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    range.setStart(node, idx);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

/**
 * 将标题元素转换为普通段落
 * 光标在标题开头按Backspace时调用
 */
function convertHeadingToParagraph(headingEl) {
    const container = window.Mojian.elements.markdownContent;
    if (!container.contains(headingEl)) return;

    // 获取标题的所有子节点
    const fragment = document.createDocumentFragment();
    while (headingEl.firstChild) {
        fragment.appendChild(headingEl.firstChild);
    }

    // 创建段落替换标题
    const p = document.createElement('p');
    p.appendChild(fragment);

    // 替换标题元素
    headingEl.parentNode.replaceChild(p, headingEl);

    // 将光标移到段落开头
    const selection = window.getSelection();
    const newRange = document.createRange();
    if (p.firstChild) {
        newRange.setStart(p.firstChild, 0);
    } else {
        const br = document.createElement('br');
        p.appendChild(br);
        newRange.setStart(p, 0);
    }
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
}

/**
 * 通过语法触发有序列表
 */
function applyOrderedListSyntax() {
    document.execCommand('insertOrderedList', false, null);
}

/**
 * 上标 / 下标 语法触发
 * 输入 ^{内容} → 上标，输入 _{内容} → 下标
 */
function applySupSubSyntax() {
    const container = window.Mojian.elements.markdownContent;
    if (!container || !container.isContentEditable) return;

    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!range.collapsed) return;

    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;

    // 代码块 / 行内代码内不触发
    if (node.parentElement && node.parentElement.closest('code, pre')) return;

    const textBefore = node.textContent.substring(0, range.startOffset);
    const match = textBefore.match(/([\^_])\{([^}\n]+)\}$/);
    if (!match) return;

    const tag = match[1] === '^' ? 'SUP' : 'SUB';
    if (window.Mojian.replaceSupSubSyntax) {
        window.Mojian.replaceSupSubSyntax(range, tag, match[0], match[2]);
    }
}

/**
 * 通过语法触发任务列表
 */
function applyTaskListSyntax() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.style.cssText = 'margin-right:8px;';

    const li = document.createElement('li');
    li.appendChild(checkbox);
    li.appendChild(document.createTextNode('\u200B'));

    const ul = document.createElement('ul');
    ul.style.listStyle = 'none';
    ul.style.paddingLeft = '0';
    ul.appendChild(li);

    range.insertNode(ul);

    const newRange = document.createRange();
    newRange.setStartAfter(checkbox);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
}

function initEditor() {
    try {
        if (!window.TiptapEditor) {
            console.warn('Tiptap not loaded yet, retrying...');
            setTimeout(initEditor, 500);
            return;
        }
        const { Editor, StarterKit, Link, Image, Table, TableRow, TableCell, TableHeader } = window.TiptapEditor;
        const { state, elements } = window.Mojian;

        state.editor = new Editor({
            element: elements.editorContent,
            extensions: [
                StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
                Link.configure({ openOnClick: true }),
                Image,
                Table.configure({ resizable: true }),
                TableRow, TableHeader, TableCell
            ],
            content: '',
            onCreate: ({ editor }) => {
                console.log('Editor created, ProseMirror element:', editor.view.dom);
            },
            onUpdate: ({ editor }) => {
                autoSaveContent(editor.getHTML());
                window.Mojian.calculateStats(editor.getText());
            },
            onSelectionUpdate: ({ editor }) => {
                window.Mojian.updateToolbarState();
            }
        });
        console.log('Editor initialized successfully with all extensions');
    } catch (error) {
        console.error('Failed to initialize editor:', error);
        window.Mojian.showToast('编辑器初始化失败: ' + error.message, 'error');
    }
}

function autoSaveContent(htmlContent) {
    try {
        const markdown = window.Mojian.htmlToMarkdown(htmlContent);
        window.Mojian.state.content = markdown;
        localStorage.setItem('currentContent', markdown);
        localStorage.setItem('savedContent', markdown);
        localStorage.setItem('editorDraft', htmlContent);
    } catch (e) {
        console.warn('Auto-save failed:', e);
    }
}

function loadSavedDraft() {
    const draft = localStorage.getItem('editorDraft');
    const { state } = window.Mojian;
    if (draft && state.editor) {
        state.editor.commands.setContent(draft);
    }
}

window.Mojian = window.Mojian || {};
Mojian.toggleEditMode = toggleEditMode;
Mojian.enterEditMode = enterEditMode;
Mojian.exitEditMode = exitEditMode;
Mojian.handleImageMouseDown = handleImageMouseDown;
Mojian.handleImageMouseMove = handleImageMouseMove;
Mojian.handleImageMouseUp = handleImageMouseUp;
Mojian.handleEditKeydown = handleEditKeydown;
Mojian.handleMarkdownSyntax = handleMarkdownSyntax;
Mojian.applySupSubSyntax = applySupSubSyntax;
Mojian.initEditor = initEditor;
Mojian.autoSaveContent = autoSaveContent;
Mojian.loadSavedDraft = loadSavedDraft;
