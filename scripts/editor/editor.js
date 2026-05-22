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
        state.currentFile = { name: '未命名文档.md' };
        elements.fileName.textContent = state.currentFile.name;
        elements.fileName.style.display = 'inline';
        state.content = '';
        window.Mojian.renderContent(state.content);
    }

    elements.markdownContent.setAttribute('contenteditable', 'true');
    elements.markdownContent.classList.add('editing');

    setTimeout(() => {
        elements.markdownContent.focus();
    }, 100);

    elements.editToolbar.classList.add('visible');
    elements.editBtn.innerHTML = '<i data-lucide="eye"></i>';
    lucide.createIcons();

    elements.markdownContent.addEventListener('keydown', handleEditKeydown);
    elements.markdownContent.addEventListener('mousedown', handleImageMouseDown);
    document.addEventListener('mousemove', handleImageMouseMove);

    window.Mojian.showToast(i18n.t('toast.enterEditMode') || '进入编辑模式');
}

function exitEditMode() {
    const { elements, state } = window.Mojian;
    state.isEditMode = false;

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
    elements.markdownContent.removeEventListener('mousedown', handleImageMouseDown);
    document.removeEventListener('mousemove', handleImageMouseMove);
    document.removeEventListener('mouseup', handleImageMouseUp);

    const htmlContent = elements.markdownContent.innerHTML;
    state.content = window.Mojian.htmlToMarkdown(htmlContent);

    elements.editBtn.innerHTML = '<i data-lucide="pencil"></i>';
    lucide.createIcons();

    window.Mojian.showToast(i18n.t('toast.exitEditMode') || '退出编辑模式');
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

function handleEditKeydown(e) {
    if (e.key !== 'Enter') return;
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    let currentNode = range.commonAncestorContainer;
    if (currentNode.nodeType === Node.TEXT_NODE) {
        currentNode = currentNode.parentElement;
    }

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
                Link.configure({ openOnClick: false }),
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
Mojian.initEditor = initEditor;
Mojian.autoSaveContent = autoSaveContent;
Mojian.loadSavedDraft = loadSavedDraft;
