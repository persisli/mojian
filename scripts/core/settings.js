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

window.Mojian = window.Mojian || {};
Mojian.loadSettings = loadSettings;
Mojian.saveSettings = saveSettings;
Mojian.applySettings = applySettings;
Mojian.applyOtherSettings = applyOtherSettings;
