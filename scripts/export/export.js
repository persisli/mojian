/**
 * export/export.js - TXT/MD/PDF 导出 + 导出模态框
 */

function exportToTxt() {
    const { state } = window.Mojian;
    if (!state.currentFile && !state.content) {
        window.Mojian.showToast(i18n.t('toast.loadFileFirst'), 'error');
        return;
    }
    try {
        let contentToExport = state.content;
        if (state.isEditMode && state.editor) {
            contentToExport = window.Mojian.htmlToMarkdown(state.editor.getHTML());
        }
        let plainText = contentToExport;
        const fileExt = state.currentFile ? '.' + state.currentFile.name.split('.').pop().toLowerCase() : '.md';
        if (fileExt === '.md') {
            plainText = getPlainTextFromMarkdown(contentToExport);
        }
        const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const fileName = (state.currentFile?.name || 'document').replace(/\.(md|txt|log)$/, '') + '.txt';
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        window.Mojian.showToast(i18n.t('toast.exportTxtSuccess'));
    } catch (error) {
        console.error('TXT export error:', error);
        window.Mojian.showToast('TXT 导出失败', 'error');
    }
}

function exportToMd() {
    const { state } = window.Mojian;
    if (!state.currentFile && !state.content) {
        window.Mojian.showToast(i18n.t('toast.loadFileFirst'), 'error');
        return;
    }
    try {
        let contentToExport = state.content;
        if (state.isEditMode && state.editor) {
            contentToExport = window.Mojian.htmlToMarkdown(state.editor.getHTML());
        }
        const blob = new Blob([contentToExport], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const fileName = (state.currentFile?.name || 'document').replace(/\.(md|txt|log)$/, '') + '.md';
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        window.Mojian.showToast(i18n.t('toast.exportMdSuccess'));
    } catch (error) {
        console.error('MD export error:', error);
        window.Mojian.showToast('MD 导出失败', 'error');
    }
}

function showExportModal() {
    const { elements } = window.Mojian;
    elements.exportModal.classList.add('active');
    elements.exportProgressFill.style.width = '0%';
    elements.exportProgressText.textContent = '准备中...';
}

function hideExportModal() {
    window.Mojian.elements.exportModal.classList.remove('active');
}

function updateExportProgress(percent, text) {
    const { elements } = window.Mojian;
    elements.exportProgressFill.style.width = percent + '%';
    elements.exportProgressText.textContent = text;
}

async function exportToPdf() {
    const { state } = window.Mojian;
    if (!state.currentFile) {
        window.Mojian.showToast(i18n.t('toast.loadFileFirst'), 'error');
        return;
    }
    showExportModal();
    updateExportProgress(10, i18n.t('export.progress.preparing'));
    try {
        await new Promise(resolve => setTimeout(resolve, 300));
        const printStyles = document.createElement('style');
        printStyles.id = 'print-styles';
        printStyles.textContent = `
            @media print {
                @page { size: A4; margin: 20mm; }
                body * { visibility: hidden; }
                #markdownContent, #markdownContent * { visibility: visible; }
                #markdownContent {
                    position: absolute; left: 0; top: 0; width: 100%; max-width: none;
                    margin: 0; padding: 0;
                    background: ${state.isDarkMode ? '#0a0e1a' : (state.settings.backgroundType === 'solid' ? state.settings.background : '#FAFAF8')} !important;
                    color: ${state.isDarkMode ? '#E8E8E6' : '#333333'} !important;
                    font-family: ${state.settings.fontFamily} !important;
                    font-size: ${state.settings.fontSize}px !important;
                    line-height: ${state.settings.lineHeight} !important;
                }
                .header, .status-bar, .floating-toc, .export-modal, .export-confirm-modal,
                .settings-sidebar, .sidebar-overlay, .toast { display: none !important; }
                #markdownContent pre, #markdownContent blockquote, #markdownContent table { page-break-inside: avoid; }
                #markdownContent h1, #markdownContent h2, #markdownContent h3 { page-break-after: avoid; }
            }
        `;
        document.head.appendChild(printStyles);
        updateExportProgress(50, i18n.t('export.progress.generating'));
        const originalTitle = document.title;
        const fileName = (state.currentFile.name || 'document').replace(/\.(md|txt|log)$/, '');
        document.title = fileName;
        await new Promise(resolve => setTimeout(resolve, 200));
        updateExportProgress(80, i18n.t('export.progress.printing'));
        window.print();
        document.title = originalTitle;
        document.getElementById('print-styles')?.remove();
        updateExportProgress(100, i18n.t('export.progress.complete'));
        await new Promise(resolve => setTimeout(resolve, 500));
        hideExportModal();
        window.Mojian.showToast(i18n.t('export.success'));
    } catch (error) {
        console.error('PDF export error:', error);
        hideExportModal();
        window.Mojian.showToast(i18n.t('toast.exportPdfFailed', { error: error.message }), 'error');
        document.getElementById('print-styles')?.remove();
    }
}

function getPlainTextFromMarkdown(markdown) {
    let text = markdown;
    text = text.replace(/^#{1,6}\s+/gm, '');
    text = text.replace(/\*\*\*(.*?)\*\*\*/g, '$1');
    text = text.replace(/\*\*(.*?)\*\*/g, '$1');
    text = text.replace(/\*(.*?)\*/g, '$1');
    text = text.replace(/___(.*?)___/g, '$1');
    text = text.replace(/__(.*?)__/g, '$1');
    text = text.replace(/_(.*?)_/g, '$1');
    text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '');
    text = text.replace(/```[\w]*\n?/g, '');
    text = text.replace(/```/g, '');
    text = text.replace(/`([^`]+)`/g, '$1');
    text = text.replace(/^>\s+/gm, '');
    text = text.replace(/^[\*\-\+]\s+/gm, '');
    text = text.replace(/^\d+\.\s+/gm, '');
    text = text.replace(/^[\*\-]{3,}$/gm, '');
    text = text.replace(/^_{3,}$/gm, '');
    text = text.replace(/<[^>]+>/g, '');
    return text;
}

window.Mojian = window.Mojian || {};
Mojian.exportToTxt = exportToTxt;
Mojian.exportToMd = exportToMd;
Mojian.exportToPdf = exportToPdf;
Mojian.showExportModal = showExportModal;
Mojian.hideExportModal = hideExportModal;
Mojian.updateExportProgress = updateExportProgress;
Mojian.getPlainTextFromMarkdown = getPlainTextFromMarkdown;
