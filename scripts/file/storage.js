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

    // Fallback to state.content if savedContent is empty but state has content
    const contentToLoad = (savedContent || (state.content ? state.content : ''));

    if (savedFile && contentToLoad != null) {
        state.currentFile = typeof savedFile === 'string' ? { name: savedFile } : (savedFile || {});
        state.content = contentToLoad;

        var fileNameStr = state.currentFile.name || (typeof state.currentFile === 'string' ? state.currentFile : '');
        const fileExt = '.' + fileNameStr.split('.').pop().toLowerCase();

        if (fileExt === '.log') {
            window.Mojian.renderLogContent(contentToLoad, !!restoredState);
        } else {
            window.Mojian.renderContent(contentToLoad, !!restoredState);
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
