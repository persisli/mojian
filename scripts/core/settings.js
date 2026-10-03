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

function setCustomSelectValue(selectId, value) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const trigger = select.querySelector('.custom-select-trigger');
    const options = select.querySelectorAll('.custom-select-option');
    if (!trigger) return;

    let matched = false;
    options.forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.value === value) {
            matched = true;
            option.classList.add('selected');
            const text = option.textContent;
            trigger.dataset.value = value;
            const span = trigger.querySelector('span');
            if (span) {
                span.textContent = text;
            } else {
                trigger.textContent = text;
            }
        }
    });
}

function applyOtherSettings() {
    const { elements, state } = window.Mojian;
    elements.widthSlider.value = state.settings.width;
    elements.widthValue.textContent = state.settings.width + 'px';
    document.documentElement.style.setProperty('--content-max-width', state.settings.width + 'px');

    setCustomSelectValue('fontSelect', state.settings.fontFamily);
    elements.markdownContent.style.fontFamily = state.settings.fontFamily;
    // 非默认字体家族（思源宋体 / 霞鹜文楷等）首次使用时才注入对应的 webfont
    if (window.Mojian.ensureFontLoaded) {
        window.Mojian.ensureFontLoaded(state.settings.fontFamily);
    }

    elements.fontSizeValue.textContent = state.settings.fontSize + 'px';
    elements.markdownContent.style.fontSize = state.settings.fontSize + 'px';

    elements.lineHeightSlider.value = state.settings.lineHeight;
    elements.lineHeightValue.textContent = state.settings.lineHeight;
    elements.markdownContent.style.lineHeight = state.settings.lineHeight;

    // 段落间距：滑块值 1.9（默认）≈ 原来的 7px，区间 1.0→0 / 2.5≈13.5px
    const spacing = state.settings.paragraphSpacing || 1.9;
    if (elements.paragraphSpacingSlider) elements.paragraphSpacingSlider.value = spacing;
    if (elements.paragraphSpacingValue) elements.paragraphSpacingValue.textContent = Number(spacing).toFixed(1);
    elements.markdownContent.style.setProperty('--paragraph-spacing', spacing);

    // 段前缩进（用段首空格实现，只同步设置项 UI，不在这里改正文）
    const indent = window.Mojian.clampIndentValue
        ? window.Mojian.clampIndentValue(state.settings.paragraphIndent)
        : state.settings.paragraphIndent;
    if (elements.paragraphIndentSlider) elements.paragraphIndentSlider.value = indent;
    if (elements.paragraphIndentValue) {
        elements.paragraphIndentValue.textContent = window.Mojian.formatParagraphIndentValue
            ? window.Mojian.formatParagraphIndentValue(indent)
            : String(indent);
    }

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

// 全局暴露，供 i18n.js 使用
window.setCustomSelectValue = setCustomSelectValue;
