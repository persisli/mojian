/**
 * core/site-prefs.js - 按网站来源分别记忆阅读偏好
 *
 * 需求：同一网站（hostname 相同，路径 / 后缀不同）的文章之间，
 * 沿用上一篇的「段前缩进」与「图片显示」设置；不同网站各记各的，互不混淆。
 *
 * 记录维度取 hostname（含子域名，如 mp.weixin.qq.com 与 example.com 视为两个来源），
 * 存放在 localStorage 的 mojianSitePrefs 下：
 *   { "example.com": { "paragraphIndent": 2, "showImages": false } }
 *
 * 写入时机：
 *   1. 首次导入某站点的文章 → 用识别到的段前缩进 + 当前图片显示模式打底；
 *   2. 阅读该站点文章期间手动改段前缩进 / 图片显示 → 立即更新该站点记录。
 */

(function () {
    'use strict';

    var STORAGE_KEY = 'mojianSitePrefs';
    var PREF_KEYS = ['paragraphIndent', 'showImages'];

    /** 取 hostname（大小写归一、去端口）；不是合法 URL 时返回 '' */
    function hostOf(url) {
        if (!url) return '';
        var raw = String(url).trim();
        if (!raw) return '';

        // 已经是纯 hostname（没有协议也没有路径）
        if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) && !raw.includes('/')) {
            return raw.toLowerCase().replace(/^www\./, '');
        }
        try {
            return new URL(raw).hostname.toLowerCase();
        } catch (e) {
            return '';
        }
    }

    function readAll() {
        try {
            var text = localStorage.getItem(STORAGE_KEY);
            var data = text ? JSON.parse(text) : null;
            return (data && typeof data === 'object') ? data : {};
        } catch (e) {
            return {};
        }
    }

    function writeAll(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            /* 隐私模式 / 配额已满：忽略即可，不影响阅读 */
        }
    }

    /** 读取某站点的偏好记录；没有则返回 null */
    function getSitePrefs(urlOrHost) {
        var host = hostOf(urlOrHost);
        if (!host) return null;
        var prefs = readAll()[host];
        if (!prefs || typeof prefs !== 'object') return null;

        var result = {};
        if (typeof prefs.paragraphIndent === 'number') result.paragraphIndent = prefs.paragraphIndent;
        if (typeof prefs.showImages === 'boolean') result.showImages = prefs.showImages;
        return result;
    }

    /** 合并式更新某站点的偏好记录 */
    function updateSitePref(urlOrHost, patch) {
        var host = hostOf(urlOrHost);
        if (!host || !patch) return null;

        var all = readAll();
        var prefs = (all[host] && typeof all[host] === 'object') ? all[host] : {};
        for (var i = 0; i < PREF_KEYS.length; i++) {
            var key = PREF_KEYS[i];
            if (Object.prototype.hasOwnProperty.call(patch, key)) {
                prefs[key] = patch[key];
            }
        }
        all[host] = prefs;
        writeAll(all);
        return prefs;
    }

    /** 当前正在阅读的文档来自哪个站点（本地文件为空） */
    function currentHost() {
        var M = window.Mojian || {};
        var state = M.state || {};
        if (state.currentHost) return state.currentHost;
        return hostOf(state.currentFile && state.currentFile.sourceUrl);
    }

    /** 记录当前文档的来源站点（导入文章 / 恢复状态时调用） */
    function setCurrentHost(url) {
        var M = window.Mojian || {};
        if (!M.state) return '';
        M.state.currentHost = hostOf(url);
        return M.state.currentHost;
    }

    /**
     * 用户手动改了某项设置 → 写回当前来源站点的记录
     * @param {string} key paragraphIndent | showImages
     * @param {*} value
     */
    function rememberSitePref(key, value) {
        if (PREF_KEYS.indexOf(key) === -1) return;
        var host = currentHost();
        if (!host) return;
        var patch = {};
        patch[key] = value;
        updateSitePref(host, patch);
    }

    /**
     * 导入文章时套用该站点的偏好
     *
     * 已有记录 → 直接沿用该站点的段前缩进（并同步设置项）与图片显示模式；
     * 没有记录 → 按原有逻辑识别原文缩进（环球网 / 观察者网等按站点规则补 2 字），
     *             并把识别结果 + 当前图片显示模式作为该站点的初始记录。
     *
     * @param {string} markdown 解析出的正文
     * @param {string} url 文章链接
     * @returns {string} 处理后的 markdown
     */
    function applySitePrefs(markdown, url) {
        var M = window.Mojian || {};
        var host = setCurrentHost(url);
        if (!host) {
            if (M.applyDetectedParagraphIndent) {
                markdown = M.applyDetectedParagraphIndent(markdown, url);
            }
            return markdown;
        }

        var prefs = getSitePrefs(host);
        var state = M.state || {};
        var settings = state.settings || {};

        if (prefs) {
            if (typeof prefs.showImages === 'boolean' && M.setImageDisplay) {
                M.setImageDisplay(prefs.showImages);
            }
            if (typeof prefs.paragraphIndent === 'number' && M.clampIndentValue) {
                var width = M.clampIndentValue(prefs.paragraphIndent);
                if (M.syncParagraphIndentSetting) M.syncParagraphIndentSetting(width);
                if (width > 0 && M.setParagraphIndent) {
                    markdown = M.setParagraphIndent(markdown, width);
                }
            }
            return markdown;
        }

        // 首次导入该站点：先按原有规则识别 / 补齐段前缩进
        if (M.applyDetectedParagraphIndent) {
            markdown = M.applyDetectedParagraphIndent(markdown, url);
        }
        // 再以「识别结果 + 当前图片显示模式」为该站点打底
        updateSitePref(host, {
            paragraphIndent: M.clampIndentValue
                ? M.clampIndentValue(settings.paragraphIndent)
                : settings.paragraphIndent,
            showImages: M.shouldShowImages ? M.shouldShowImages() : settings.showImages !== false
        });
        return markdown;
    }

    window.Mojian = window.Mojian || {};
    window.Mojian.hostOf = hostOf;
    window.Mojian.getSitePrefs = getSitePrefs;
    window.Mojian.updateSitePref = updateSitePref;
    window.Mojian.currentHost = currentHost;
    window.Mojian.setCurrentHost = setCurrentHost;
    window.Mojian.rememberSitePref = rememberSitePref;
    window.Mojian.applySitePrefs = applySitePrefs;
})();
