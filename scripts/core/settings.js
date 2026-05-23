/**
 * core/settings.js - 设置管理 (load/save/apply)
 */

function loadSettings() {
    const { state } = window.Mojian;
    const savedSettings = localStorage.getItem('readerSettings');
    if (savedSettings) {
        try {
            const parsed = JSON.parse(savedSettings);
            state.settings = { ...state.settings, ...parsed };
        } catch (e) {
            console.warn('Failed to load settings:', e);
        }
    }
}

function saveSettings() {
    const { state } = window.Mojian;
    try {
        localStorage.setItem('readerSettings', JSON.stringify(state.settings));
    } catch (e) {
        console.warn('Failed to save settings:', e);
    }
}

function applySettings() {
    applyOtherSettings();
    const { state } = window.Mojian;
    if (state.isDarkMode) {
        window.Mojian.applyTheme();
    } else {
        window.Mojian.applyBackground();
    }
    window.Mojian.updateBackgroundSelection();
    window.Mojian.updateBackgroundUIState();
    window.Mojian.applyStatusBarToggleStates();
    window.Mojian.updateStatusBarDisplay();
}

function applyOtherSettings() {
    const { elements, state } = window.Mojian;
    elements.widthSlider.value = state.settings.width;
    elements.widthValue.textContent = state.settings.width + 'px';
    document.documentElement.style.setProperty('--content-max-width', state.settings.width + 'px');

    elements.fontSelect.value = state.settings.fontFamily;
    elements.markdownContent.style.fontFamily = state.settings.fontFamily;

    elements.fontSizeValue.textContent = state.settings.fontSize + 'px';
    elements.markdownContent.style.fontSize = state.settings.fontSize + 'px';

    elements.lineHeightSlider.value = state.settings.lineHeight;
    elements.lineHeightValue.textContent = state.settings.lineHeight;
    elements.markdownContent.style.lineHeight = state.settings.lineHeight;

    elements.bgOpacitySlider.value = state.settings.bgOpacity;
    elements.bgOpacityValue.textContent = state.settings.bgOpacity + '%';
}

/**
 * 根据设置状态更新状态栏切换按钮的视觉状态
 */
function applyStatusBarToggleStates() {
    const { state } = window.Mojian;
    const { statusBarItems } = state.settings;

    document.querySelectorAll('.status-toggle-btn').forEach(btn => {
        const item = btn.dataset.statusItem;
        if (statusBarItems[item]) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

/**
 * 根据设置显示/隐藏状态栏的各个项目
 */
function updateStatusBarDisplay() {
    const { state } = window.Mojian;
    const { statusBarItems } = state.settings;
    const { statusBar } = window.Mojian.elements;

    const timeItem = document.querySelector('.status-item:has(#readingTime)');
    const wordCountItem = document.querySelector('.status-item:has(#wordCount)');
    const progressItem = document.querySelector('.status-item.progress-text');

    const hasAnyVisible = statusBarItems.time || statusBarItems.wordCount || statusBarItems.progress;

    if (!hasAnyVisible) {
        statusBar.style.display = 'none';
    } else {
        statusBar.style.display = '';

        if (timeItem) {
            timeItem.style.display = statusBarItems.time ? '' : 'none';
        }
        if (wordCountItem) {
            wordCountItem.style.display = statusBarItems.wordCount ? '' : 'none';
        }
        if (progressItem) {
            progressItem.style.display = statusBarItems.progress ? '' : 'none';
        }
    }
}

window.Mojian = window.Mojian || {};
Mojian.loadSettings = loadSettings;
Mojian.saveSettings = saveSettings;
Mojian.applySettings = applySettings;
Mojian.applyOtherSettings = applyOtherSettings;
Mojian.applyStatusBarToggleStates = applyStatusBarToggleStates;
Mojian.updateStatusBarDisplay = updateStatusBarDisplay;
