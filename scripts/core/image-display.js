/**
 * core/image-display.js - 「图片显示」开关（有图模式 / 无图模式）
 *
 * 作用：控制正文图片是否显示，属于「阅读设置 → 外观主题」下方的一个开关。
 *  - 默认「有图模式」：正常显示正文图片；
 *  - 「无图模式」：给正文容器加 .no-images，由 CSS 隐藏图片（含图注块），
 *    不改动 markdown 原文，切换回来即可恢复；
 *  - 设置值随 readerSettings 持久化，并可按来源站点分别记忆（见 site-prefs.js）。
 */

(function () {
    'use strict';

    var HIDDEN_CLASS = 'no-images';

    function shouldShowImages() {
        var M = window.Mojian || {};
        var settings = (M.state && M.state.settings) || {};
        // 缺省为「有图模式」
        return settings.showImages !== false;
    }

    function t(key, fallback) {
        if (typeof i18n !== 'undefined' && i18n.t) {
            var translated = i18n.t(key);
            if (translated && translated !== key) return translated;
        }
        return fallback;
    }

    /** 刷新开关按钮的文本（外观与「外观主题」按钮一致，仅文案变化） */
    function updateImageToggleButton() {
        var M = window.Mojian || {};
        var elements = M.elements || {};
        var btn = elements.imageToggle;
        if (!btn) return;

        var show = shouldShowImages();
        var label = elements.imageToggleLabel || btn;
        label.textContent = show
            ? t('settings.imageDisplay.on', '有图模式')
            : t('settings.imageDisplay.off', '无图模式');
        btn.setAttribute('aria-pressed', show ? 'false' : 'true');
        btn.title = label.textContent;
    }

    /** 把设置同步到正文容器（阅读 / 编辑模式都即时生效） */
    function applyImageDisplay() {
        var M = window.Mojian || {};
        var container = M.elements && M.elements.markdownContent;
        if (container) {
            container.classList.toggle(HIDDEN_CLASS, !shouldShowImages());
        }
        updateImageToggleButton();
    }

    /**
     * 切换「有图 / 无图」
     * @param {boolean} [force] 传入则强制设为该值，省略则在两种模式间互切
     */
    function toggleImageDisplay(force) {
        var M = window.Mojian || {};
        if (!M.state || !M.state.settings) return;

        var next = (typeof force === 'boolean') ? force : !shouldShowImages();
        if (M.state.settings.showImages === next) {
            applyImageDisplay();
            return;
        }
        M.state.settings.showImages = next;

        if (M.saveSettings) M.saveSettings();
        // 记到当前来源站点：同一网站的后续文章沿用该选择
        if (M.rememberSitePref) M.rememberSitePref('showImages', next);
        applyImageDisplay();
    }

    /** 供外部（如站点偏好套用）设置图片显示模式并落盘 */
    function setImageDisplay(show) {
        toggleImageDisplay(!!show);
    }

    window.Mojian = window.Mojian || {};
    window.Mojian.applyImageDisplay = applyImageDisplay;
    window.Mojian.toggleImageDisplay = toggleImageDisplay;
    window.Mojian.setImageDisplay = setImageDisplay;
    window.Mojian.updateImageToggleButton = updateImageToggleButton;
    window.Mojian.shouldShowImages = shouldShowImages;
})();
