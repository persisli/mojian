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

    // 初始化链接/图片弹窗事件（编辑相关脚本已延后加载，可能尚不存在）
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

    // 首屏绘制完成后，在空闲时段补齐编辑 / 导出 / Prism 等延后脚本
    window.Mojian.scheduleDeferredScripts();

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
    // 回到欢迎页：清空来源站点归属
    window.Mojian.state.currentHost = '';
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

/** 工具栏状态同步（toolbar.js 为延后加载脚本，未就绪时静默跳过） */
function syncToolbarState() {
    if (window.Mojian.updateToolbarState) {
        window.Mojian.updateToolbarState();
    }
}

/**
 * 绑定编辑工具栏按钮（toolbar.js 为延后加载脚本，故做成幂等函数：
 * 首屏若尚未就绪则跳过，延后脚本到位后由 onDeferredReady / 编辑按钮点击补绑）
 */
function bindToolbarEvents() {
    if (!window.Mojian.handleToolbarAction) return;

    document.querySelectorAll('.toolbar-btn').forEach(btn => {
        if (btn.dataset.eventsBound === '1') return;
        btn.dataset.eventsBound = '1';

        btn.addEventListener('mousedown', (e) => {
            // 阻止默认行为防止按钮获得焦点导致 contenteditable 失焦
            e.preventDefault();
            // 在 mousedown 阶段立即保存当前选区（此时选区尚未被清除）
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                window.Mojian._savedRange = sel.getRangeAt(0).cloneRange();
            } else {
                window.Mojian._savedRange = null;
            }
        });
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.Mojian.handleToolbarAction(btn);
        });
    });
}

function bindEvents() {
    const { elements } = window.Mojian;
    const state = window.Mojian.state;

    // 编辑器相关脚本为延后加载，点击时先确保就绪（首次点击也不失效）
    elements.editBtn.addEventListener('click', () => {
        window.Mojian.ensureFeature('editor').then(function () {
            bindToolbarEvents();
            window.Mojian.toggleEditMode();
        });
    });

    bindToolbarEvents();

    elements.markdownContent.addEventListener('input', function() {
        if (state.isEditMode) {
            if (window.Mojian.autoSaveTimer) {
                clearTimeout(window.Mojian.autoSaveTimer);
            }
            window.Mojian.autoSaveTimer = setTimeout(() => {
                if (window.Mojian.autoSaveContent) {
                    window.Mojian.autoSaveContent(elements.markdownContent.innerHTML);
                }
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
            requestAnimationFrame(syncToolbarState);
        }
    });

    elements.markdownContent.addEventListener('mouseup', () => {
        if (state.isEditMode) {
            syncToolbarState();
        }
    });

    elements.markdownContent.addEventListener('keyup', () => {
        if (state.isEditMode) {
            syncToolbarState();
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

    // 导出模块为延后加载脚本，点击时先确保就绪
    elements.exportTxt.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.exportDropdown.classList.remove('active');
        window.Mojian.ensureFeature('export').then(function () {
            window.Mojian.exportToTxt();
        });
    });

    elements.exportMd.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.exportDropdown.classList.remove('active');
        window.Mojian.ensureFeature('export').then(function () {
            window.Mojian.exportToMd();
        });
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
        window.Mojian.ensureFeature('export').then(function () {
            window.Mojian.exportToPdf();
        });
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
    initCustomSelects();

    // 延后脚本到位后的补绑 / 补渲染
    window.Mojian.onDeferredReady(function () {
        bindToolbarEvents();
        if (window.Mojian.initInsertModals) {
            window.Mojian.initInsertModals();
        }
        // Prism 为延后加载，已渲染的代码块在此补一次高亮
        if (typeof Prism !== 'undefined' && state.currentFile) {
            Prism.highlightAllUnder(elements.markdownContent);
        }
    });
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

    // fontSelect 事件在 initCustomSelects 中处理

    // 正文字号：每次只增减 1px（12px - 32px）
    elements.fontSizeUp.addEventListener('click', () => {
        if (state.settings.fontSize < 32) {
            state.settings.fontSize += 1;
            elements.fontSizeValue.textContent = state.settings.fontSize + 'px';
            elements.markdownContent.style.fontSize = state.settings.fontSize + 'px';
            window.Mojian.saveSettings();
        }
    });

    elements.fontSizeDown.addEventListener('click', () => {
        if (state.settings.fontSize > 12) {
            state.settings.fontSize -= 1;
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

    elements.paragraphSpacingSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        state.settings.paragraphSpacing = value;
        elements.paragraphSpacingValue.textContent = value.toFixed(1);
        elements.markdownContent.style.setProperty('--paragraph-spacing', value);
        window.Mojian.saveSettings();
    });

    // 段前缩进：拖动时即时改段落段首空格（rAF 合并，避免长文拖动卡顿），松手后同步回正文存档
    let indentRaf = null;
    elements.paragraphIndentSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value, 10);
        state.settings.paragraphIndent = value;
        elements.paragraphIndentValue.textContent = window.Mojian.formatParagraphIndentValue(value);
        window.Mojian.saveSettings();
        // 按来源站点分别记忆：同一网站的后续文章沿用该缩进
        if (window.Mojian.rememberSitePref) {
            window.Mojian.rememberSitePref('paragraphIndent', value);
        }

        if (indentRaf) cancelAnimationFrame(indentRaf);
        indentRaf = requestAnimationFrame(() => {
            indentRaf = null;
            window.Mojian.applyParagraphIndentToDom(state.settings.paragraphIndent);
        });
    });

    elements.paragraphIndentSlider.addEventListener('change', () => {
        window.Mojian.persistParagraphIndent();
    });

    // 图片显示：默认「有图模式」，点击在「有图 / 无图」之间互切
    if (elements.imageToggle) {
        elements.imageToggle.addEventListener('click', () => {
            window.Mojian.toggleImageDisplay();
        });
    }

    // 语言切换后刷新「2 字」「有图模式」这类文本
    window.addEventListener('languageChanged', () => {
        elements.paragraphIndentValue.textContent =
            window.Mojian.formatParagraphIndentValue(state.settings.paragraphIndent);
        if (window.Mojian.updateImageToggleButton) {
            window.Mojian.updateImageToggleButton();
        }
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

function initCustomSelects() {
    document.querySelectorAll('.custom-select').forEach(select => {
        const trigger = select.querySelector('.custom-select-trigger');
        const options = select.querySelectorAll('.custom-select-option');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = select.classList.contains('open');
            document.querySelectorAll('.custom-select').forEach(s => s.classList.remove('open'));
            if (!isOpen) {
                select.classList.add('open');
            }
        });

        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = option.dataset.value;
                const text = option.textContent;

                trigger.dataset.value = value;
                const span = trigger.querySelector('span');
                if (span) {
                    span.textContent = text;
                } else {
                    trigger.textContent = text;
                }

                options.forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                select.classList.remove('open');

                const selectId = select.id;
                if (selectId === 'fontSelect') {
                    const { state, elements } = window.Mojian;
                    state.settings.fontFamily = value;
                    elements.markdownContent.style.fontFamily = value;
                    // 切换到非默认字体时才按需拉取对应 webfont
                    if (window.Mojian.ensureFontLoaded) {
                        window.Mojian.ensureFontLoaded(value);
                    }
                    window.Mojian.saveSettings();
                } else if (selectId === 'languageSelect') {
                    if (typeof i18n !== 'undefined') {
                        i18n.setLanguage(value);
                    }
                }
            });
        });
    });

    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select').forEach(s => s.classList.remove('open'));
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
