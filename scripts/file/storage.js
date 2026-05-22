/**
 * file/storage.js - LocalStorage 存取
 */

function saveContent(fileName, content) {
    try {
        localStorage.setItem('currentFile', fileName);
        localStorage.setItem('currentContent', content);
    } catch (e) {
        console.warn('Failed to save content:', e);
    }
}

function loadSavedContent(restoredState) {
    const { state } = window.Mojian;
    const savedFile = restoredState ? (restoredState.currentFile.name || restoredState.currentFile) : localStorage.getItem('currentFile');
    const savedContent = restoredState ? restoredState.content : localStorage.getItem('currentContent');

    if (savedFile && savedContent) {
        state.currentFile = typeof savedFile === 'string' ? { name: savedFile } : savedFile;
        state.content = savedContent;

        const fileExt = '.' + (state.currentFile.name || state.currentFile).split('.').pop().toLowerCase();

        if (fileExt === '.log') {
            window.Mojian.renderLogContent(savedContent, !!restoredState);
        } else {
            window.Mojian.renderContent(savedContent, !!restoredState);
        }

        if (!restoredState) {
            window.Mojian.showReadingMode(state.currentFile.name || state.currentFile);
        }
        window.Mojian.updateReadingStats(state.wordCount);

        if (restoredState && restoredState.isEditMode) {
            window.Mojian.enterEditMode();
        }

        if (restoredState && typeof restoredState.scrollY === 'number') {
            setTimeout(() => {
                window.scrollTo(0, restoredState.scrollY);
            }, 150);
        }
    }
}

function clearSavedContent() {
    localStorage.removeItem('currentFile');
    localStorage.removeItem('currentContent');
    localStorage.removeItem('savedContent');
    localStorage.removeItem('editorDraft');
    sessionStorage.removeItem('beforeRefreshState');
}

window.Mojian = window.Mojian || {};
Mojian.saveContent = saveContent;
Mojian.loadSavedContent = loadSavedContent;
Mojian.clearSavedContent = clearSavedContent;
