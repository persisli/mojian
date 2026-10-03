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

        // 让「段前缩进」设置项与文档实际段首空格保持一致
        if (window.Mojian.syncIndentFromContent) {
            window.Mojian.syncIndentFromContent(contentToLoad);
        }

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
            enterEditModeWhenReady();
        }

        if (restoredState && typeof restoredState.scrollY === 'number') {
            setTimeout(() => {
                window.scrollTo(0, restoredState.scrollY);
            }, 150);
        }
    }
}

/**
 * 恢复「刷新前处于编辑模式」的状态。
 * editor.js 是延后加载脚本，首屏此刻可能还没就绪 → 等脚本到位后再切编辑模式。
 */
function enterEditModeWhenReady() {
    if (window.Mojian.enterEditMode) {
        window.Mojian.enterEditMode();
        return;
    }
    if (window.Mojian.ensureFeature) {
        window.Mojian.ensureFeature('editor').then(function () {
            if (window.Mojian.enterEditMode) window.Mojian.enterEditMode();
        });
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
