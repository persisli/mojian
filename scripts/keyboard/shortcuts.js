/**
 * keyboard/shortcuts.js - 全局快捷键
 */

function handleKeydown(e) {
    const { elements, state } = window.Mojian;

    if (e.key === 'Escape') {
        if (elements.settingsSidebar.classList.contains('active')) {
            window.Mojian.closeSidebar();
        } else if (state.currentFile) {
            state.currentFile = null;
            state.content = '';
            window.Mojian.clearSavedContent();
            window.Mojian.showWelcomeMode();
        }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        elements.fileInput.click();
    }

    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        window.Mojian.toggleTheme();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        if (elements.settingsSidebar.classList.contains('active')) {
            window.Mojian.closeSidebar();
        } else {
            window.Mojian.openSidebar();
        }
    }
}

window.Mojian = window.Mojian || {};
Mojian.handleKeydown = handleKeydown;
