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
            if (parsedState.currentFile && parsedState.content != null) {
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
        var restoredFileName = state.currentFile.name || (typeof state.currentFile === 'string' ? state.currentFile : '');
        showReadingMode(restoredFileName);
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

    // 初始化链接/图片弹窗事件
    if (window.Mojian.initInsertModals) {
        window.Mojian.initInsertModals();
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
        btn.addEventListener('mousedown', (e) => {
            // 阻止默认行为防止按钮获得焦点导致 contenteditable 失焦
            e.preventDefault();
            // 在 mousedown 阶段立即保存当前选区（此时选区尚未被清除）
            const sel = window.getSelection();
            const tag = btn.dataset.action;
            console.log('[DEBUG mousedown] action=' + tag + ' | rangeCount=' + sel.rangeCount);
            if (sel.rangeCount > 0) {
                const r = sel.getRangeAt(0);
                const inEditor = elements.markdownContent.contains(r.commonAncestorContainer);
                const collapsed = r.collapsed;
                const text = r.toString().substring(0, 30);
                console.log('[DEBUG mousedown] inEditor=' + inEditor + ' | collapsed=' + collapsed + ' | text="' + text + '" | startContainer=' + r.startContainer.nodeName);
                window.Mojian._savedRange = r.cloneRange();
            } else {
                console.log('[DEBUG mousedown] NO range - saving null');
                window.Mojian._savedRange = null;
            }
        });
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const tag = btn.dataset.action;
            const saved = window.Mojian._savedRange;
            console.log('[DEBUG click] action=' + tag + ' | hasSavedRange=' + !!saved +
                ' | activeEl=' + (document.activeElement ? document.activeElement.id || document.activeElement.tagName : 'null') +
                ' | isCE=' + elements.markdownContent.isContentEditable);
            const sel = window.getSelection();
            console.log('[DEBUG click] currentRangeCount=' + sel.rangeCount +
                (sel.rangeCount > 0 ? ' | collapsed=' + sel.getRangeAt(0).collapsed +
                ' | inEditor=' + elements.markdownContent.contains(sel.getRangeAt(0).commonAncestorContainer) : ''));
            window.Mojian.handleToolbarAction(btn);
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
            // 每次选区变化时保存有效选区，供 toolbar 按钮点击时恢复
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                if (elements.markdownContent.contains(range.commonAncestorContainer)) {
                    window.Mojian._savedRange = range.cloneRange();
                    console.log('[DEBUG selectionchange] TRACKED range | collapsed=' + range.collapsed +
                        ' | text="' + range.toString().substring(0, 30) + '"');
                } else {
                    console.log('[DEBUG selectionchange] SKIP - range NOT in editor');
                }
            } else {
                console.log('[DEBUG selectionchange] SKIP - rangeCount=0');
            }
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

    // Status Bar Toggle Buttons
    document.querySelectorAll('.status-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.dataset.statusItem;
            const isActive = btn.classList.contains('active');

            if (isActive) {
                btn.classList.remove('active');
                state.settings.statusBarItems[item] = false;
            } else {
                btn.classList.add('active');
                state.settings.statusBarItems[item] = true;
            }

            window.Mojian.updateStatusBarDisplay();
            window.Mojian.saveSettings();
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
