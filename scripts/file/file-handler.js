/**
 * file/file-handler.js - 文件读取/拖放/类型验证
 */

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    const { elements } = window.Mojian;
    if (e.dataTransfer.types.includes('Files')) {
        elements.welcomeScreen.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    const { elements } = window.Mojian;
    if (e.target === document || !document.body.contains(e.relatedTarget)) {
        elements.welcomeScreen.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    window.Mojian.elements.welcomeScreen.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileSelect(e) {
    console.log('handleFileSelect triggered', e.target.files);
    const files = e.target.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
    window.Mojian.elements.fileInput.value = '';
}

function processFile(file) {
    console.log('processFile called with:', file.name);
    const validTypes = ['.md', '.txt', '.log'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();

    if (!validTypes.includes(fileExt)) {
        window.Mojian.showToast(i18n.t('toast.unsupportedFormat'), 'error');
        return;
    }

    if (file.size > 6 * 1024 * 1024) {
        window.Mojian.showToast(i18n.t('toast.fileTooLarge'), 'error');
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        console.log('FileReader onload triggered');
        let content = e.target.result;
        const { state } = window.Mojian;
        state.currentFile = file;

        if (fileExt === '.log') {
            content = window.Mojian.cleanLogContent(content);
        }
        state.content = content;
        console.log('File loaded:', file.name, 'Size:', content.length);

        window.Mojian.saveContent(file.name, content);
        console.log('Calling showReadingMode...');
        window.Mojian.showReadingMode(file.name);
        console.log('showReadingMode completed');

        try {
            console.log('Rendering content...');
            if (fileExt === '.log') {
                window.Mojian.renderLogContent(content);
            } else {
                window.Mojian.renderContent(content);
            }
            console.log('Content rendered');
        } catch (err) {
            console.error('Render error:', err);
        }

        window.Mojian.updateReadingStats(state.wordCount);
        window.Mojian.showToast(i18n.t('toast.fileLoaded'));
    };

    reader.onerror = function() {
        window.Mojian.showToast(i18n.t('toast.fileLoadError'), 'error');
    };

    reader.readAsText(file);
}

window.Mojian = window.Mojian || {};
Mojian.handleDragOver = handleDragOver;
Mojian.handleDragLeave = handleDragLeave;
Mojian.handleDrop = handleDrop;
Mojian.handleFileSelect = handleFileSelect;
Mojian.processFile = processFile;
