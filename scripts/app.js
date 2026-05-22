/**
 * app.js - 入口：initialization + event binding
 */

function init() {
    if (typeof i18n !== 'undefined') {
        i18n.init();
    }

    const { state } = window.Mojian;
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    state.isDarkMode = savedTheme ? savedTheme === 'dark' : prefersDark;
    document.documentElement.setAttribute('data-theme', state.isDarkMode ? 'dark' : 'light');

    let restoredState = null;
    const savedState = sessionStorage.getItem('beforeRefreshState');
    if (savedState) {
        try {
            const parsedState = JSON.parse(savedState);
            if (parsedState.currentFile && parsedState.content) {
                state.currentFile = parsedState.currentFile;
                state.content = parsedState.content;
                state.isDarkMode = parsedState.isDarkMode;
                state.isEditMode = parsedState.isEditMode || false;
                restoredState = parsedState;
                sessionStorage.removeItem('beforeRefreshState');
            }
        } catch (e) {
            console.error('Failed to restore state:', e);
        }
    }

    // 尽早恢复阅读区，避免欢迎页闪烁
    if (restoredState && state.currentFile) {
        showReadingMode(state.currentFile.name || state.currentFile);
    }

    if (!window.Mojian.iconsInitialized) {
        const initIcons = function() {
            lucide.createIcons();
            window.Mojian.iconsInitialized = true;
        };
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(initIcons);
        } else {
            setTimeout(initIcons, 50);
        }
    }

    if (typeof i18n !== 'undefined') {
        i18n.updatePageTranslations();
    }

    window.Mojian.loadSettings();
    window.Mojian.loadThemePreference();
    window.Mojian.applySettings();
    window.Mojian.configureMarked();
    bindEvents();
    window.Mojian.bindFileNameEvents();
    window.Mojian.initEasterEggs();
    window.Mojian.loadSavedContent(restoredState);

    if (!state.currentFile) {
        showWelcomeMode();
    }

    setTimeout(() => {
        if (state.editor) {
            window.Mojian.loadSavedDraft();
        }
    }, 500);

    window.addEventListener('beforeunload', cleanup);
}

function savePageState() {
    try {
        const { state } = window.Mojian;
        const stateToSave = {
            currentFile: state.currentFile,
            content: state.content,
            isDarkMode: state.isDarkMode,
            isEditMode: state.isEditMode,
            scrollY: window.pageYOffset || document.documentElement.scrollTop
        };
        sessionStorage.setItem('beforeRefreshState', JSON.stringify(stateToSave));
        if (state.currentFile) {
            localStorage.setItem('currentFile', state.currentFile.name || state.currentFile);
            localStorage.setItem('currentContent', state.content);
        }
    } catch (e) {
        console.warn('Failed to save page state:', e);
    }
}

function cleanup() {
    savePageState();

    document.removeEventListener('keydown', window.Mojian.handleKonamiCode);
    document.removeEventListener('keydown', window.Mojian.handleKeydown);
    const mrs = window.Mojian.matrixRainState;
    if (mrs.exitHandler) {
        document.removeEventListener('keydown', mrs.exitHandler);
    }
    document.removeEventListener('dragover', window.Mojian.handleDragOver);
    document.removeEventListener('dragleave', window.Mojian.handleDragLeave);
    document.removeEventListener('drop', window.Mojian.handleDrop);
    document.removeEventListener('click', handleDocumentClick);

    window.removeEventListener('scroll', window.Mojian.handleScroll);
    window.removeEventListener('resize', window.Mojian.handleResize);
    window.removeEventListener('beforeunload', cleanup);

    if (window.Mojian.autoSaveTimer) clearTimeout(window.Mojian.autoSaveTimer);
    if (window.Mojian.resizeTimer) clearTimeout(window.Mojian.resizeTimer);
    if (window.Mojian.scrollRAF) cancelAnimationFrame(window.Mojian.scrollRAF);

    const { state } = window.Mojian;
    if (state.editor) {
        state.editor.destroy();
        state.editor = null;
    }

    if (mrs.isRunning && mrs.animationId) {
        cancelAnimationFrame(mrs.animationId);
        const canvas = document.getElementById('matrix-rain');
        if (canvas) canvas.remove();
    }
    window.Mojian.matrixRainState = { isRunning: false, animationId: null, exitHandler: null };

    const irs = window.Mojian.imageResizeState;
    if (irs.isResizing && irs.originalImg) {
        irs.originalImg.style.visibility = 'visible';
        if (irs.currentImage && irs.currentImage.isConnected) {
            irs.currentImage.remove();
        }
    }
    window.Mojian.imageResizeState = { isResizing: false, currentImage: null, originalImg: null, startX: 0, startY: 0, startWidth: 0, startHeight: 0, aspectRatio: 1 };

    window.Mojian.iconsInitialized = false;
    window.Mojian.easterEggsInitialized = false;
    window.Mojian.markedConfigured = false;
    window.Mojian.scrollRAFScheduled = false;
}

function showReadingMode(fileName) {
    document.documentElement.classList.remove('mojian-restoring');
    console.log('showReadingMode called with:', fileName);
    const { elements } = window.Mojian;
    elements.fileName.textContent = fileName;
    elements.fileName.style.display = 'inline';
    elements.welcomeScreen.style.display = 'none';
    elements.welcomeScreen.classList.remove('active');
    elements.readingArea.style.display = 'block';
    elements.readingArea.classList.add('active');
    elements.statusBar.style.display = 'block';
    void elements.readingArea.offsetHeight;
}

function showWelcomeMode() {
    document.documentElement.classList.remove('mojian-restoring');
    const { elements } = window.Mojian;
    elements.fileName.textContent = '';
    elements.fileName.style.display = 'none';
    elements.markdownContent.innerHTML = '';
    elements.welcomeScreen.style.display = 'flex';
    elements.welcomeScreen.classList.add('active');
    elements.readingArea.style.display = 'none';
    elements.readingArea.classList.remove('active');
    elements.statusBar.style.display = 'none';
    elements.wordCount.textContent = i18n.t('status.wordCount', { count: 0 });
    elements.readingTime.textContent = i18n.t('status.readingTime', { minutes: 0 });
    elements.progressPercent.textContent = '0%';
    window.scrollTo(0, 0);
}

window.Mojian.showReadingMode = showReadingMode;
window.Mojian.showWelcomeMode = showWelcomeMode;

function bindEvents() {
    const { elements } = window.Mojian;
    const state = window.Mojian.state;

    elements.editBtn.addEventListener('click', () => {
        window.Mojian.toggleEditMode();
    });

    document.querySelectorAll('.toolbar-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const selection = window.getSelection();
            const range = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
            window.Mojian.handleToolbarAction(btn);
            if (range && elements.markdownContent.contains(range.commonAncestorContainer)) {
                elements.markdownContent.focus();
                selection.removeAllRanges();
                selection.addRange(range);
            }
            setTimeout(() => {
                window.Mojian.updateToolbarState();
            }, 10);
        });
    });

    elements.markdownContent.addEventListener('input', function() {
        if (state.isEditMode) {
            if (window.Mojian.autoSaveTimer) {
                clearTimeout(window.Mojian.autoSaveTimer);
            }
            window.Mojian.autoSaveTimer = setTimeout(() => {
                window.Mojian.autoSaveContent(elements.markdownContent.innerHTML);
                window.Mojian.calculateStats(elements.markdownContent.innerText || elements.markdownContent.textContent);
            }, 500);
        }
    });

    document.addEventListener('selectionchange', () => {
        if (state.isEditMode && elements.markdownContent.isContentEditable) {
            requestAnimationFrame(() => {
                window.Mojian.updateToolbarState();
            });
        }
    });

    elements.markdownContent.addEventListener('mouseup', () => {
        if (state.isEditMode) {
            window.Mojian.updateToolbarState();
        }
    });

    elements.markdownContent.addEventListener('keyup', () => {
        if (state.isEditMode) {
            window.Mojian.updateToolbarState();
        }
    });

    elements.homeBtn.addEventListener('click', () => {
        if (state.isEditMode) {
            window.Mojian.exitEditMode();
        }
        state.currentFile = null;
        state.content = '';
        window.Mojian.clearSavedContent();
        showWelcomeMode();
        elements.floatingToc.classList.remove('visible');
    });

    elements.exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!state.currentFile) {
            window.Mojian.showToast(i18n.t('toast.loadFileFirst'), 'error');
            return;
        }
        elements.exportDropdown.classList.toggle('active');
    });

    elements.exportTxt.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.exportDropdown.classList.remove('active');
        window.Mojian.exportToTxt();
    });

    elements.exportMd.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.exportDropdown.classList.remove('active');
        window.Mojian.exportToMd();
    });

    elements.exportPdf.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.exportDropdown.classList.remove('active');
        elements.exportConfirmModal.classList.add('active');
    });

    elements.exportConfirmCancel.addEventListener('click', () => {
        elements.exportConfirmModal.classList.remove('active');
    });

    elements.exportConfirmYes.addEventListener('click', () => {
        elements.exportConfirmModal.classList.remove('active');
        window.Mojian.exportToPdf();
    });

    document.addEventListener('click', handleDocumentClick);

    if (elements.exportModalClose) {
        elements.exportModalClose.addEventListener('click', () => {
            elements.exportModal.classList.remove('active');
        });
    }

    elements.tocBtn.addEventListener('click', () => {
        elements.floatingToc.classList.toggle('visible');
    });

    elements.themeToggle.addEventListener('click', window.Mojian.toggleTheme);
    elements.settingsToggle.addEventListener('click', window.Mojian.openSidebar);
    elements.sidebarClose.addEventListener('click', window.Mojian.closeSidebar);
    elements.sidebarOverlay.addEventListener('click', window.Mojian.closeSidebar);
    elements.fileInput.addEventListener('change', window.Mojian.handleFileSelect);

    document.addEventListener('dragover', window.Mojian.handleDragOver);
    document.addEventListener('dragleave', window.Mojian.handleDragLeave);
    document.addEventListener('drop', window.Mojian.handleDrop);

    window.addEventListener('scroll', window.Mojian.handleScroll);
    window.addEventListener('resize', window.Mojian.handleResize);

    document.addEventListener('keydown', window.Mojian.handleKeydown);

    bindSettingsEvents();

    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.value = i18n.getLanguage();
        languageSelect.addEventListener('change', (e) => {
            i18n.setLanguage(e.target.value);
        });
    }
}

function handleDocumentClick(e) {
    const { elements } = window.Mojian;
    const exportWrapper = elements.exportBtn.closest('.export-wrapper');
    if (exportWrapper && !exportWrapper.contains(e.target)) {
        elements.exportDropdown.classList.remove('active');
    }
}

function bindSettingsEvents() {
    const { elements, state } = window.Mojian;

    elements.widthSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        state.settings.width = value;
        elements.widthValue.textContent = value + 'px';
        document.documentElement.style.setProperty('--content-max-width', value + 'px');
        window.Mojian.saveSettings();
    });

    elements.fontSelect.addEventListener('change', (e) => {
        state.settings.fontFamily = e.target.value;
        elements.markdownContent.style.fontFamily = state.settings.fontFamily;
        window.Mojian.saveSettings();
    });

    elements.fontSizeUp.addEventListener('click', () => {
        if (state.settings.fontSize < 32) {
            state.settings.fontSize += 2;
            elements.fontSizeValue.textContent = state.settings.fontSize + 'px';
            elements.markdownContent.style.fontSize = state.settings.fontSize + 'px';
            window.Mojian.saveSettings();
        }
    });

    elements.fontSizeDown.addEventListener('click', () => {
        if (state.settings.fontSize > 12) {
            state.settings.fontSize -= 2;
            elements.fontSizeValue.textContent = state.settings.fontSize + 'px';
            elements.markdownContent.style.fontSize = state.settings.fontSize + 'px';
            window.Mojian.saveSettings();
        }
    });

    elements.lineHeightSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        state.settings.lineHeight = value;
        elements.lineHeightValue.textContent = value.toFixed(1);
        elements.markdownContent.style.lineHeight = value;
        window.Mojian.saveSettings();
    });

    elements.bgOpacitySlider.addEventListener('input', (e) => {
        if (state.isDarkMode) {
            window.Mojian.showToast('黑暗模式下无法更改背景设置', 'error');
            e.target.value = state.settings.bgOpacity;
            return;
        }
        const value = parseInt(e.target.value);
        state.settings.bgOpacity = value;
        elements.bgOpacityValue.textContent = value + '%';
        window.Mojian.applyBackground();
        window.Mojian.saveSettings();
    });

    elements.bgTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (state.isDarkMode) {
                window.Mojian.showToast('黑暗模式下无法更改背景设置', 'error');
                return;
            }
            const tabName = tab.dataset.tab;
            elements.bgTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            elements.bgPanels.forEach(panel => panel.classList.remove('active'));
            document.getElementById(tabName + 'Panel').classList.add('active');
        });
    });

    elements.bgOptions.forEach(option => {
        option.addEventListener('click', () => {
            if (state.isDarkMode) {
                window.Mojian.showToast('黑暗模式下无法更改背景设置', 'error');
                return;
            }
            const bgType = option.dataset.bg;
            if (bgType === 'solid') {
                state.settings.background = option.dataset.color;
                state.settings.backgroundType = 'solid';
                state.settings.backgroundPattern = null;
            } else {
                state.settings.backgroundType = bgType;
                state.settings.backgroundPattern = option.dataset.pattern;
                state.settings.background = window.Mojian.defaultBackgroundColors ? window.Mojian.defaultBackgroundColors[bgType] : '#FAFAF8';
            }
            window.Mojian.applyBackground();
            window.Mojian.updateBackgroundSelection();
            window.Mojian.saveSettings();
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
