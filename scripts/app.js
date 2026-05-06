/**
 * 墨笈 · 优雅Markdown阅读器
 * JavaScript Application Logic
 */

(function() {
    'use strict';

    // ========================================
    // DOM Elements
    // ========================================
    const elements = {
        header: document.getElementById('header'),
        fileInfo: document.getElementById('fileInfo'),
        fileName: document.getElementById('fileName'),
        editBtn: document.getElementById('editBtn'),

        homeBtn: document.getElementById('homeBtn'),
        exportBtn: document.getElementById('exportBtn'),
        exportDropdown: document.getElementById('exportDropdown'),
        exportTxt: document.getElementById('exportTxt'),
        exportMd: document.getElementById('exportMd'),
        exportPdf: document.getElementById('exportPdf'),
        exportConfirmModal: document.getElementById('exportConfirmModal'),
        exportConfirmCancel: document.getElementById('exportConfirmCancel'),
        exportConfirmYes: document.getElementById('exportConfirmYes'),
        exportModal: document.getElementById('exportModal'),
        exportModalClose: document.getElementById('exportModalClose'),
        exportProgressFill: document.getElementById('exportProgressFill'),
        exportProgressText: document.getElementById('exportProgressText'),
        tocBtn: document.getElementById('tocBtn'),
        floatingToc: document.getElementById('floatingToc'),
        floatingTocNav: document.getElementById('floatingTocNav'),
        themeToggle: document.getElementById('themeToggle'),
        settingsToggle: document.getElementById('settingsToggle'),
        settingsSidebar: document.getElementById('settingsSidebar'),
        sidebarOverlay: document.getElementById('sidebarOverlay'),
        sidebarClose: document.getElementById('sidebarClose'),
        welcomeScreen: document.getElementById('welcomeScreen'),
        welcomeContent: document.querySelector('.welcome-content'),
        readingArea: document.getElementById('readingArea'),
        markdownContent: document.getElementById('markdownContent'),
        statusBar: document.getElementById('statusBar'),
        readingTime: document.getElementById('readingTime'),
        wordCount: document.getElementById('wordCount'),
        progressPercent: document.getElementById('progressPercent'),
        fileInput: document.getElementById('fileInput'),
        toast: document.getElementById('toast'),
        toastMessage: document.getElementById('toastMessage'),
        // Settings elements
        widthSlider: document.getElementById('widthSlider'),
        widthValue: document.getElementById('widthValue'),
        fontSelect: document.getElementById('fontSelect'),
        fontSizeValue: document.getElementById('fontSizeValue'),
        fontSizeUp: document.getElementById('fontSizeUp'),
        fontSizeDown: document.getElementById('fontSizeDown'),
        lineHeightSlider: document.getElementById('lineHeightSlider'),
        lineHeightValue: document.getElementById('lineHeightValue'),
        bgOpacitySlider: document.getElementById('bgOpacitySlider'),
        bgOpacityValue: document.getElementById('bgOpacityValue'),
        bgTabs: document.querySelectorAll('.bg-tab'),
        bgPanels: document.querySelectorAll('.bg-panel'),
        bgOptions: document.querySelectorAll('.bg-option')
    };

    // ========================================
    // State Management
    // ========================================
    const state = {
        currentFile: null,
        content: '',
        wordCount: 0,
        readingTime: 0,
        isDarkMode: false,
        settings: {
            width: 1000,
            fontFamily: 'Noto Sans SC, Source Han Sans CN, sans-serif',
            fontSize: 18,
            lineHeight: 1.9,
            background: '#FAFAF8',
            backgroundType: 'solid',
            backgroundPattern: null,
            backgroundCSS: null,
            bgOpacity: 100
        },
        // 彩蛋相关状态
        easterEggs: {
            konamiCode: [],
            totalWordsRead: 0,
            readingStreak: 0,
            lastReadDate: null,
            badges: []
        }
    };

    // ========================================
    // Initialize Application
    // ========================================
    function init() {
        // Initialize i18n first
        if (typeof i18n !== 'undefined') {
            i18n.init();
        }
        
        // Load and apply theme FIRST, before Lucide icons initialization
        // This ensures the correct data-theme attribute is set before icons render
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        state.isDarkMode = savedTheme ? savedTheme === 'dark' : prefersDark;
        document.documentElement.setAttribute('data-theme', state.isDarkMode ? 'dark' : 'light');
        
        // Initialize Lucide icons AFTER theme is set
        lucide.createIcons();
        
        // Apply i18n translations
        if (typeof i18n !== 'undefined') {
            i18n.updatePageTranslations();
        }
        
        // Load saved settings
        loadSettings();
        
        // Apply theme styles (full apply, not just attribute)
        loadThemePreference();
        
        // Apply saved settings
        applySettings();
        
        // Configure marked.js
        configureMarked();
        
        // Bind event listeners
        bindEvents();
        
        // Initialize Easter Eggs
        initEasterEggs();
        
        // Check for saved content
        loadSavedContent();
        
        // Ensure welcome mode is shown if no saved content
        if (!state.currentFile) {
            showWelcomeMode();
        }
    }

    // ========================================
    // Settings Management
    // ========================================
    function loadSettings() {
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
        try {
            localStorage.setItem('readerSettings', JSON.stringify(state.settings));
        } catch (e) {
            console.warn('Failed to save settings:', e);
        }
    }

    function applySettings() {
        applyOtherSettings();
        
        // Apply background
        if (state.isDarkMode) {
            applyTheme();
        } else {
            applyBackground();
        }
        
        // Update background selection UI
        updateBackgroundSelection();
    }
    
    function applyOtherSettings() {
        // Apply width
        elements.widthSlider.value = state.settings.width;
        elements.widthValue.textContent = state.settings.width + 'px';
        document.documentElement.style.setProperty('--content-max-width', state.settings.width + 'px');
        
        // Apply font family
        elements.fontSelect.value = state.settings.fontFamily;
        elements.markdownContent.style.fontFamily = state.settings.fontFamily;
        
        // Apply font size
        elements.fontSizeValue.textContent = state.settings.fontSize + 'px';
        elements.markdownContent.style.fontSize = state.settings.fontSize + 'px';
        
        // Apply line height
        elements.lineHeightSlider.value = state.settings.lineHeight;
        elements.lineHeightValue.textContent = state.settings.lineHeight;
        elements.markdownContent.style.lineHeight = state.settings.lineHeight;
        
        // Apply background opacity
        elements.bgOpacitySlider.value = state.settings.bgOpacity;
        elements.bgOpacityValue.textContent = state.settings.bgOpacity + '%';
    }

    // Background pattern definitions
    const backgroundPatterns = {
        // Artistic patterns - 浅色线条拓扑图案，保持单元大小一致
        artistic: {
            // 六边形拓扑网络
            hexagon: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxOCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iLTkgLTEwIDE4IDIwIj48cGF0aCBkPSJNMCAtMTBMOC42NiAtNUw4LjY2IDVMMCAxMEwtOC42NiA1TC04LjY2IC01WiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIvPjxjaXJjbGUgY3g9IjAiIGN5PSItMTAiIHI9IjEuNSIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjguNjYiIGN5PSItNSIgcj0iMS41IiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iOC42NiIgY3k9IjUiIHI9IjEuNSIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjAiIGN5PSIxMCIgcj0iMS41IiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iLTguNjYiIGN5PSI1IiByPSIxLjUiIGZpbGw9IiNkMGQwZDAiLz48Y2lyY2xlIGN4PSItOC42NiIgY3k9Ii01IiByPSIxLjUiIGZpbGw9IiNkMGQwZDAiLz48L3N2Zz4=')",
            // 三角形拓扑网络
            triangle: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIzNSIgdmlld0JveD0iMCAwIDIwIDM1Ij48cGF0aCBkPSJNMTAgMEwyMCAxNy4zMkwwIDE3LjMyWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIvPjxwYXRoIGQ9Ik0wIDE3LjMyTDIwIDE3LjMyTDEwIDM0LjY0WiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIvPjxjaXJjbGUgY3g9IjEwIiBjeT0iMCIgcj0iMS41IiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iMjAiIGN5PSIxNy4zMiIgcj0iMS41IiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iMCIgY3k9IjE3LjMyIiByPSIxLjUiIGZpbGw9IiNkMGQwZDAiLz48Y2lyY2xlIGN4PSIxMCIgY3k9IjM0LjY0IiByPSIxLjUiIGZpbGw9IiNkMGQwZDAiLz48L3N2Zz4=')",
            // 菱形拓扑网络
            diamond: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDgwIDgwIj48cGF0aCBkPSJNNDAgMEw4MCA0MEw0MCA4MEwwIDQwWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIvPjxjaXJjbGUgY3g9IjQwIiBjeT0iMCIgcj0iMiIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iNDAiIHI9IjIiIGZpbGw9IiNkMGQwZDAiLz48Y2lyY2xlIGN4PSI0MCIgY3k9IjgwIiByPSIyIiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iMCIgY3k9IjQwIiByPSIyIiBmaWxsPSIjZDBkMGQwIi8+PC9zdmc+')",
            // 节点连线网络
            nodes: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDgwIDgwIj48bGluZSB4MT0iMCIgeTE9IjAiIHgyPSI4MCIgeTI9IjgwIiBzdHJva2U9IiNkMGQwZDAiIHN0cm9rZS13aWR0aD0iMC44Ii8+PGxpbmUgeDE9IjgwIiB5MT0iMCIgeDI9IjAiIHkyPSI4MCIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIvPjxsaW5lIHgxPSI0MCIgeTE9IjAiIHgyPSI0MCIgeTI9IjgwIiBzdHJva2U9IiNkMGQwZDAiIHN0cm9rZS13aWR0aD0iMC44Ii8+PGxpbmUgeDE9IjAiIHkxPSI0MCIgeDI9IjgwIiB5Mj0iNDAiIHN0cm9rZT0iI2QwZDBkMCIgc3Ryb2tlLXdpZHRoPSIwLjgiLz48Y2lyY2xlIGN4PSIwIiBjeT0iMCIgcj0iMyIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iMCIgcj0iMyIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjAiIGN5PSI4MCIgcj0iMyIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iODAiIHI9IjMiIGZpbGw9IiNkMGQwZDAiLz48Y2lyY2xlIGN4PSI0MCIgY3k9IjQwIiByPSIzIiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iNDAiIGN5PSIwIiByPSIyIiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iNDAiIGN5PSI4MCIgcj0iMiIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjAiIGN5PSI0MCIgcj0iMiIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iNDAiIHI9IjIiIGZpbGw9IiNkMGQwZDAiLz48L3N2Zz4=')"
        },
        // Chinese style patterns - 整张艺术风格的网页背景
        chinese: {
            // 山水画风格
            landscape: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJza3lHcmFkaWVudCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmNWY1ZGMiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNlOGY1ZTkiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0idXJsKCNza3lHcmFkaWVudCkiLz48cGF0aCBkPSJNMCA0MDBRMTUwIDM1MCAzMDAgNDAwVDYwMCAzODBRNzUwIDQwMCA4MDAgMzkwVjYwMEgwVjQwMFoiIGZpbGw9IiNjNGM0YjAiIG9wYWNpdHk9IjAuMyIvPjxwYXRoIGQ9TTAgNDUwUTE1MCA0MDAgMzAwIDQ1MFQ2MDAgNDMwUTc1MCA0NTAgODAwIDQ0MFY2MDBIMFY0NTBaIiBmaWxsPSIjYTRhNDkwIiBvcGFjaXR5PSIwLjIiLz48cGF0aCBkPSJNMTUwIDM1MEwyMDAgMzAwTDI1MCAzNTBMMzAwIDI4MEwzNTAgMzUwTDQwMCAyOTBMNDUwIDM1MEw1MDAgMjgwTDU1MCAzNTBMNjAwIDMwMEw2NTAgMzUwTDcwMCAyOTBMNzUwIDM1MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOGY4ZjdmIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLW9wYWNpdHk9IjAuNCIvPjxwYXRoIGQ9TTEwMCA0MDBMMTUwIDM1MEwyMDAgNDAwTDI1MCAzNDBMMzAwIDQwMEwzNTAgMzMwTDQwMCA0MDBMNDUwIDM0MEw1MDAgNDAwTDU1MCAzMzBMNjAwIDQwMEw2NTAgMzQwTDcwMCA0MDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzhmOGY3ZiIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2Utb3BhY2l0eT0iMC4zIi8+PC9zdmc+')",
            // 花鸟画风格
            flowers: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJiYWNrZ3JvdW5kIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2Y1ZjVkYyIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2VmZWJlOSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSJ1cmwoI2JhY2tncm91bmQpIi8+PGNpcmNsZSBjeD0iMTUwIiBjeT0iMTUwIiByPSI0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzRjNGIwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLW9wYWNpdHk9IjAuMyIvPjxjaXJjbGUgY3g9IjE1MCIgY3k9IjE1MCIgcj0iMzAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2M0YzRiMCIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2Utb3BhY2l0eT0iMC4yIi8+PGNpcmNsZSBjeD0iMTUwIiBjeT0iMTUwIiByPSIyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzRjNGIwIiBzdHJva2Utd2lkdGg9IjAuOCIgc3Ryb2tlLW9wYWNpdHk9IjAuMiIvPjxjaXJjbGUgY3g9IjY1MCIgY3k9IjEwMCIgcj0iMzUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2M0YzRiMCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1vcGFjaXR5PSIwLjMiLz48Y2lyY2xlIGN4PSI2NTAiIGN5PSIxMDAiIHI9IjI1IiBmaWxsPSJub25lIiBzdHJva2U9IiNjNGM0YjAiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLW9wYWNpdHk9IjAuMiIvPjxjaXJjbGUgY3g9IjY1MCIgY3k9IjEwMCIgcj0iMTUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2M0YzRiMCIgc3Ryb2tlLXdpZHRoPSIwLjgiIHN0cm9rZS1vcGFjaXR5PSIwLjIiLz48cGF0aCBkPSJNMjAwIDQwMEMyNTAgMzUwIDMwMCAzODAgMzUwIDQwMEM0MDAgNDIwIDQ1MCAzOTAgNTAwIDQwMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOGY4ZjdmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1vcGFjaXR5PSIwLjMiLz48cGF0aCBkPSJNMjUwIDQ1MEMzMDAgNDAwIDM1MCA0MzAgNDAwIDQ1MEM0NTAgNDcwIDUwMCA0NDAgNTUwIDQ1MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOGY4ZjdmIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLW9wYWNpdHk9IjAuMyIvPjwvc3ZnPg==')",
            // 书法风格
            calligraphy: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJiYWNrZ3JvdW5kIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2Y1ZjVkYyIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2VmZWJlOSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSJ1cmwoI2JhY2tncm91bmQpIi8+PHBhdGggZD0iTTUwIDUwQzEwMCAxMDAgMTUwIDgwIDIwMCAxMjBDMjUwIDE2MCAzMDAgMTQwIDM1MCAxODBDNDAwIDIyMCA0NTAgMjAwIDUwMCAyNDBDNTUwIDI4MCA2MDAgMjYwIDY1MCAzMDBDNzAwIDM0MCA3NTAgMzIwIDgwMCAzNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzhmOGY3ZiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2Utb3BhY2l0eT0iMC4zIi8+PHBhdGggZD0iTTUwIDIwMEMxMDAgMjUwIDE1MCAyMzAgMjAwIDI3MEMyNTAgMzEwIDMwMCAyOTAgMzUwIDMzMEM0MDAgMzcwIDQ1MCAzNTAgNTAwIDM5MEM1NTAgNDMwIDYwMCA0MTAgNjUwIDQ1MUM3MDAgNDkxIDc1MCA0NzEgODAwIDUxMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOGY4ZjdmIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLW9wYWNpdHk9IjAuMyIvPjxwYXRoIGQ9TTUwIDM1MEMxMDAgNDAwIDE1MCAzODAgMjAwIDQyMEMyNTAgNDYwIDMwMCA0NDAgMzUwIDQ4MEM0MDAgNTIwIDQ1MCA1MDAgNTAwIDU0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOGY4ZjdmIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1vcGFjaXR5PSIwLjMiLz48L3N2Zz4=')",
            // 窗棂风格
            lattice: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJiYWNrZ3JvdW5kIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2Y1ZjVkYyIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2VmZWJlOSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSJ1cmwoI2JhY2tncm91bmQpIi8+PHJlY3QgeD0iNTAiIHk9IjUwIiB3aWR0aD0iNzAwIiBoZWlnaHQ9IjUwMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzRjNGIwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1vcGFjaXR5PSIwLjMiLz48bGluZSB4MT0iMjUwIiB5MT0iNTAiIHgyPSIyNTAiIHkyPSI1NTAiIHN0cm9rZT0iI2M0YzRiMCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1vcGFjaXR5PSIwLjIiLz48bGluZSB4MT0iNTUwIiB5MT0iNTAiIHgyPSI1NTAiIHkyPSI1NTAiIHN0cm9rZT0iI2M0YzRiMCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1vcGFjaXR5PSIwLjIiLz48bGluZSB4MT0iNTAiIHkxPSIyMDAiIHgyPSI3NTAiIHkyPSIyMDAiIHN0cm9rZT0iI2M0YzRiMCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1vcGFjaXR5PSIwLjIiLz48bGluZSB4MT0iNTAiIHkxPSI0MDAiIHgyPSI3NTAiIHkyPSI0MDAiIHN0cm9rZT0iI2M0YzRiMCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1vcGFjaXR5PSIwLjIiLz48L3N2Zz4=')"
        },
        // Stationery patterns - 整张艺术风格的网页背景
        stationery: {
            // 复古信纸风格
            vintage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJwYXBlckdyYWRpZW50IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmZmZmZiIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2Y4ZjhmOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSJ1cmwoI3BhcGVyR3JhZGllbnQpIi8+PHJlY3QgeD0iNDAiIHk9IjQwIiB3aWR0aD0iNzIwIiBoZWlnaHQ9IjUyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTBlMGUwIiBzdHJva2Utd2lkdGg9IjEiLz48bGluZSB4MT0iNjAiIHkxPSI2MCIgeDI9Ijc0MCIgeTI9IjYwIiBzdHJva2U9IiNlMGUwZTAiIHN0cm9rZS13aWR0aD0iMC41Ii8+PGxpbmUgeDE9IjYwIiB5MT0iODAiIHgyPSI3NDAiIHkyPSI4MCIgc3Ryb2tlPSIjZTBlMGUwIiBzdHJva2Utd2lkdGg9IjAuNSIvPjwvc3ZnPg==')",
            // 牛皮纸风格
            kraft: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJrcmFmdEdyYWRpZW50IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2Y1ZjBlNSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2VmZWFlNSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSJ1cmwoI2tyYWZ0R3JhZGllbnQpIi8+PGNpcmNsZSBjeD0iMTUwIiBjeT0iMTUwIiByPSIyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIgc3Ryb2tlLW9wYWNpdHk9IjAuMyIvPjxjaXJjbGUgY3g9IjY1MCIgY3k9IjE1MCIgcj0iMjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2QwZDBkMCIgc3Ryb2tlLXdpZHRoPSIwLjgiIHN0cm9rZS1vcGFjaXR5PSIwLjMiLz48Y2lyY2xlIGN4PSIxNTAiIGN5PSI0NTAiIHI9IjI1IiBmaWxsPSJub25lIiBzdHJva2U9IiNkMGQwZDAiIHN0cm9rZS13aWR0aD0iMC44IiBzdHJva2Utb3BhY2l0eT0iMC4zIi8+PGNpcmNsZSBjeD0iNjUwIiBjeT0iNDUwIiByPSIyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIgc3Ryb2tlLW9wYWNpdHk9IjAuMyIvPjwvc3ZnPg==')",
            // 水彩纸风格
            watercolor: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJ3YXRlckdyYWRpZW50IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmZmZmZiIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2YwZjBmMCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSJ1cmwoI3dhdGVyR3JhZGllbnQpIi8+PGVsbGlwc2UgY3g9IjIwMCIgY3k9IjE1MCIgcng9IjgwIiByeT0iNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2QwZDBkMCIgc3Ryb2tlLXdpZHRoPSIwLjgiIHN0cm9rZS1vcGFjaXR5PSIwLjIiLz48ZWxsaXBzZSBjeD0iNjAwIiBjeT0iMTUwIiByeD0iODAiIHJ5PSI0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIgc3Ryb2tlLW9wYWNpdHk9IjAuMiIvPjxlbGxpcHNlIGN4PSIyMDAiIGN5PSI0NTAiIHJ4PSI4MCIgcnk9IjQwIiBmaWxsPSJub25lIiBzdHJva2U9IiNkMGQwZDAiIHN0cm9rZS13aWR0aD0iMC44IiBzdHJva2Utb3BhY2l0eT0iMC4yIi8+PGVsbGlwc2UgY3g9IjYwMCIgY3k9IjQ1MCIgcng9IjgwIiByeT0iNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2QwZDBkMCIgc3Ryb2tlLXdpZHRoPSIwLjgiIHN0cm9rZS1vcGFjaXR5PSIwLjIiLz48L3N2Zz4=')",
            // 素描纸风格
            sketch: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJza2V0Y2hHcmFkaWVudCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmZmZmZmYiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNmMGYwZjAiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0idXJsKCNza2V0Y2hHcmFkaWVudCkiLz48bGluZSB4MT0iMTAwIiB5MT0iMTAwIiB4Mj0iNzAwIiB5Mj0iMTAwIiBzdHJva2U9IiNkMGQwZDAiIHN0cm9rZS13aWR0aD0iMC41IiBzdHJva2Utb3BhY2l0eT0iMC4zIi8+PGxpbmUgeDE9IjEwMCIgeTE9IjIwMCIgeDI9IjcwMCIgeTI9IjIwMCIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuNSIgc3Ryb2tlLW9wYWNpdHk9IjAuMyIvPjxsaW5lIHgxPSIxMDAiIHkxPSIzMDAiIHgyPSI3MDAiIHkyPSIzMDAiIHN0cm9rZT0iI2QwZDBkMCIgc3Ryb2tlLXdpZHRoPSIwLjUiIHN0cm9rZS1vcGFjaXR5PSIwLjMiLz48bGluZSB4MT0iMTAwIiB5MT0iNDAwIiB4Mj0iNzAwIiB5Mj0iNDAwIiBzdHJva2U9IiNkMGQwZDAiIHN0cm9rZS13aWR0aD0iMC41IiBzdHJva2Utb3BhY2l0eT0iMC4zIi8+PGxpbmUgeDE9IjEwMCIgeTE9IjUwMCIgeDI9IjcwMCIgeTI9IjUwMCIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuNSIgc3Ryb2tlLW9wYWNpdHk9IjAuMyIvPjwvc3ZnPg==')"
        }
    };

    // Default background colors for each type
    const defaultBackgroundColors = {
        solid: '#FAFAF8',
        artistic: '#FAFAF8',
        chinese: '#F5F5DC',
        stationery: '#FFFFFF'
    };

    function applyBackground() {
        const baseColor = state.settings.backgroundType === 'solid' 
            ? state.settings.background 
            : defaultBackgroundColors[state.settings.backgroundType];
        const pattern = state.settings.backgroundType !== 'solid' 
            ? backgroundPatterns[state.settings.backgroundType]?.[state.settings.backgroundPattern] 
            : null;
        
        // 透明度值转换为 0-1 范围
        const opacity = state.settings.bgOpacity / 100;
        
        // 将hex颜色转换为rgba格式并应用透明度
        const hexToRgba = (hex, alpha) => {
            const h = hex.replace('#', '');
            const r = parseInt(h.substr(0, 2), 16);
            const g = parseInt(h.substr(2, 2), 16);
            const b = parseInt(h.substr(4, 2), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };
        
        // Calculate derived colors for blockquote, code, and table header
        // These will be slightly different shades of the base color
        const adjustColor = (color, amount) => {
            // Simple hex color adjustment
            const hex = color.replace('#', '');
            const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
            const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
            const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        };
        
        const blockquoteBg = adjustColor(baseColor, -8); // Slightly darker
        const codeBg = adjustColor(baseColor, -12); // Darker for code
        const tableHeaderBg = adjustColor(baseColor, -5); // Slightly darker for header
        
        // 应用透明度到背景色
        const bgColorWithOpacity = hexToRgba(baseColor, opacity);
        const blockquoteBgWithOpacity = hexToRgba(blockquoteBg, opacity);
        const codeBgWithOpacity = hexToRgba(codeBg, opacity);
        const tableHeaderBgWithOpacity = hexToRgba(tableHeaderBg, opacity);
        
        // 背景设置：body 设置带透明度的纯色，图案通过 ::before 伪元素显示
        document.body.style.backgroundColor = bgColorWithOpacity;
        document.documentElement.style.setProperty('--bg-page', bgColorWithOpacity);
        document.documentElement.style.setProperty('--bg-pattern-opacity', opacity);
        
        if (state.settings.backgroundType === 'solid' || !pattern) {
            document.documentElement.style.setProperty('--bg-pattern', 'none');
        } else {
            document.documentElement.style.setProperty('--bg-pattern', pattern);
        }
        
        // markdownContent 使用透明背景，继承 body 的统一背景
        elements.markdownContent.style.backgroundColor = 'transparent';
        elements.markdownContent.style.backgroundImage = 'none';
        document.documentElement.style.setProperty('--bg-content', 'transparent');
        
        // 如果是纯色背景，更新 welcome-content 的背景色以匹配设定
        if (state.settings.backgroundType === 'solid') {
            const welcomeContent = document.querySelector('.welcome-content');
            if (welcomeContent) {
                welcomeContent.style.backgroundColor = bgColorWithOpacity;
            }
        } else {
            // 非纯色背景时恢复默认样式
            const welcomeContent = document.querySelector('.welcome-content');
            if (welcomeContent) {
                welcomeContent.style.backgroundColor = '';
            }
        }
        
        // Apply to blockquotes - 这些特殊元素使用带透明度的纯色背景
        const blockquotes = elements.markdownContent.querySelectorAll('blockquote');
        blockquotes.forEach(bq => {
            bq.style.backgroundColor = blockquoteBgWithOpacity;
            bq.style.backgroundImage = 'none';
        });
        
        // Apply to code blocks (pre elements) - 特殊元素使用带透明度的纯色背景
        const preBlocks = elements.markdownContent.querySelectorAll('pre');
        preBlocks.forEach(pre => {
            pre.style.backgroundColor = codeBgWithOpacity;
            pre.style.backgroundImage = 'none';
        });
        
        // Apply to inline code
        const inlineCodes = elements.markdownContent.querySelectorAll('code:not(pre code)');
        inlineCodes.forEach(code => {
            code.style.backgroundColor = hexToRgba(adjustColor(baseColor, -15), opacity);
        });
        
        // Apply to tables - 特殊元素使用带透明度的纯色背景
        const tables = elements.markdownContent.querySelectorAll('table');
        tables.forEach(table => {
            table.style.backgroundColor = bgColorWithOpacity;
            table.style.backgroundImage = 'none';
        });
        
        // Apply to table headers (thead and th)
        const tableHeaders = elements.markdownContent.querySelectorAll('thead, th');
        tableHeaders.forEach(th => {
            th.style.backgroundColor = tableHeaderBgWithOpacity;
            th.style.backgroundImage = 'none';
        });
        
        // header 和 statusBar 使用带透明度的纯色背景
        elements.header.style.backgroundColor = bgColorWithOpacity;
        elements.header.style.backgroundImage = 'none';
        
        elements.statusBar.style.backgroundColor = bgColorWithOpacity;
        elements.statusBar.style.backgroundImage = 'none';
    }

    function updateBackgroundSelection() {
        elements.bgOptions.forEach(opt => {
            opt.classList.remove('selected');
            const isSolid = opt.dataset.bg === 'solid' && opt.dataset.color === state.settings.background;
            const isPattern = opt.dataset.bg === state.settings.backgroundType && 
                             opt.dataset.pattern === state.settings.backgroundPattern;
            
            if (isSolid || isPattern) {
                opt.classList.add('selected');
            }
        });
    }

    // ========================================
    // Theme Management
    // ========================================
    function loadThemePreference() {
        // state.isDarkMode is already set in init() before Lucide icons render
        // This function now just applies the full theme styles
        applyTheme();
    }

    function toggleTheme() {
        state.isDarkMode = !state.isDarkMode;
        localStorage.setItem('theme', state.isDarkMode ? 'dark' : 'light');
        applyTheme();
    }

    function applyTheme() {
        document.documentElement.setAttribute('data-theme', state.isDarkMode ? 'dark' : 'light');
        
        if (state.isDarkMode) {
            const darkBg = '#0a0e1a';
            const darkerBg = '#0d0d1a';
            const tableHeaderBg = '#1a1a2e';
            
            // 暗色模式：背景只应用到 body
            document.body.style.backgroundColor = darkBg;
            // markdownContent 使用透明背景
            elements.markdownContent.style.backgroundColor = 'transparent';
            elements.markdownContent.style.backgroundImage = 'none';
            elements.header.style.backgroundColor = darkBg;
            elements.header.style.backgroundImage = 'none';
            elements.statusBar.style.backgroundColor = darkBg;
            elements.statusBar.style.backgroundImage = 'none';
            document.documentElement.style.setProperty('--bg-page', darkBg);
            document.documentElement.style.setProperty('--bg-content', 'transparent');
            document.documentElement.style.setProperty('--bg-pattern', 'none');
            document.documentElement.style.setProperty('--bg-pattern-opacity', 1);
            
            // Apply to blockquotes in dark mode - 特殊元素使用纯色
            const blockquotes = elements.markdownContent.querySelectorAll('blockquote');
            blockquotes.forEach(bq => {
                bq.style.backgroundColor = darkerBg;
                bq.style.backgroundImage = 'none';
            });
            
            // Apply to code blocks in dark mode - 特殊元素使用纯色
            const preBlocks = elements.markdownContent.querySelectorAll('pre');
            preBlocks.forEach(pre => {
                pre.style.backgroundColor = darkerBg;
                pre.style.backgroundImage = 'none';
            });
            
            // Apply to inline code in dark mode
            const inlineCodes = elements.markdownContent.querySelectorAll('code:not(pre code)');
            inlineCodes.forEach(code => {
                code.style.backgroundColor = '#1a1a2e';
            });
            
            // Apply to tables in dark mode - 特殊元素使用纯色
            const tables = elements.markdownContent.querySelectorAll('table');
            tables.forEach(table => {
                table.style.backgroundColor = darkBg;
                table.style.backgroundImage = 'none';
            });
            
            // Apply to table headers in dark mode
            const tableHeaders = elements.markdownContent.querySelectorAll('thead, th');
            tableHeaders.forEach(th => {
                th.style.backgroundColor = tableHeaderBg;
                th.style.backgroundImage = 'none';
            });
        } else {
            applyBackground();
        }
    }

    // ========================================
    // Sidebar Management
    // ========================================
    function openSidebar() {
        elements.settingsSidebar.classList.add('active');
        elements.sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        elements.settingsSidebar.classList.remove('active');
        elements.sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // ========================================
    // Marked.js Configuration
    // ========================================
    function configureMarked() {
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: true,
            mangle: false,
            highlight: function(code, lang) {
                if (lang && Prism.languages[lang]) {
                    try {
                        return Prism.highlight(code, Prism.languages[lang], lang);
                    } catch (e) {
                        console.warn('Highlight error:', e);
                    }
                }
                return code;
            }
        });
        
        // Add IDs to headings for TOC navigation
        const renderer = new marked.Renderer();
        renderer.heading = function(text, level, raw) {
            const slug = raw.toLowerCase().replace(/[^\w]+/g, '-');
            return `<h${level} id="${slug}">${text}</h${level}>`;
        };
        marked.setOptions({ renderer });
    }

    // ========================================
    // Event Bindings
    // ========================================


    function bindEvents() {
        // Edit button (placeholder - no functionality currently)
        elements.editBtn && elements.editBtn.addEventListener('click', () => {
            // Edit functionality will be implemented later
        });
        
        // Home button
        elements.homeBtn.addEventListener('click', () => {
            state.currentFile = null;
            state.content = '';
            clearSavedContent();
            showWelcomeMode();
            // Close TOC when returning to home
            elements.floatingToc.classList.remove('visible');

        });
        
        // Export button - toggle dropdown menu
        elements.exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!state.currentFile) {
                showToast(i18n.t('toast.loadFileFirst'), 'error');
                return;
            }
            // Toggle dropdown visibility
            elements.exportDropdown.classList.toggle('active');
            // Re-initialize Lucide icons for the dropdown
            lucide.createIcons();
        });
        
        // Export dropdown items
        elements.exportTxt.addEventListener('click', (e) => {
            e.stopPropagation();
            elements.exportDropdown.classList.remove('active');
            exportToTxt();
        });
        
        elements.exportMd.addEventListener('click', (e) => {
            e.stopPropagation();
            elements.exportDropdown.classList.remove('active');
            exportToMd();
        });
        
        elements.exportPdf.addEventListener('click', (e) => {
            e.stopPropagation();
            elements.exportDropdown.classList.remove('active');
            // Show PDF confirm modal (original behavior)
            elements.exportConfirmModal.classList.add('active');
        });
        
        // Export confirm modal events
        elements.exportConfirmCancel.addEventListener('click', () => {
            elements.exportConfirmModal.classList.remove('active');
        });
        
        elements.exportConfirmYes.addEventListener('click', () => {
            elements.exportConfirmModal.classList.remove('active');
            exportToPdf();
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const exportWrapper = elements.exportBtn.closest('.export-wrapper');
            if (exportWrapper && !exportWrapper.contains(e.target)) {
                elements.exportDropdown.classList.remove('active');
            }
        });
        
        // Export modal close (if close button exists)
        if (elements.exportModalClose) {
            elements.exportModalClose.addEventListener('click', () => {
                elements.exportModal.classList.remove('active');
            });
        }
        
        // TOC toggle - toggle floating TOC visibility
        elements.tocBtn.addEventListener('click', () => {
            elements.floatingToc.classList.toggle('visible');
        });
        
        // Theme toggle
        elements.themeToggle.addEventListener('click', toggleTheme);
        
        // Settings sidebar
        elements.settingsToggle.addEventListener('click', openSidebar);
        elements.sidebarClose.addEventListener('click', closeSidebar);
        elements.sidebarOverlay.addEventListener('click', closeSidebar);
        
        // File input
        elements.fileInput.addEventListener('change', handleFileSelect);
        

        // Drag and drop
        document.addEventListener('dragover', handleDragOver);
        document.addEventListener('dragleave', handleDragLeave);
        document.addEventListener('drop', handleDrop);
        
        // Scroll progress
        window.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleScroll);
        
        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeydown);
        
        // Settings controls
        bindSettingsEvents();
        
        // Language selector
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.value = i18n.getLanguage();
            languageSelect.addEventListener('change', (e) => {
                i18n.setLanguage(e.target.value);
            });
        }
    }

    function bindSettingsEvents() {
        // Width slider
        elements.widthSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            state.settings.width = value;
            elements.widthValue.textContent = value + 'px';
            document.documentElement.style.setProperty('--content-max-width', value + 'px');
            saveSettings();
        });
        
        // Font family select
        elements.fontSelect.addEventListener('change', (e) => {
            state.settings.fontFamily = e.target.value;
            elements.markdownContent.style.fontFamily = state.settings.fontFamily;
            saveSettings();
        });
        
        // Font size buttons
        elements.fontSizeUp.addEventListener('click', () => {
            if (state.settings.fontSize < 32) {
                state.settings.fontSize += 2;
                elements.fontSizeValue.textContent = state.settings.fontSize + 'px';
                elements.markdownContent.style.fontSize = state.settings.fontSize + 'px';
                saveSettings();
            }
        });
        
        elements.fontSizeDown.addEventListener('click', () => {
            if (state.settings.fontSize > 12) {
                state.settings.fontSize -= 2;
                elements.fontSizeValue.textContent = state.settings.fontSize + 'px';
                elements.markdownContent.style.fontSize = state.settings.fontSize + 'px';
                saveSettings();
            }
        });
        
        // Line height slider
        elements.lineHeightSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            state.settings.lineHeight = value;
            elements.lineHeightValue.textContent = value.toFixed(1);
            elements.markdownContent.style.lineHeight = value;
            saveSettings();
        });
        
        // Background opacity slider
        elements.bgOpacitySlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            state.settings.bgOpacity = value;
            elements.bgOpacityValue.textContent = value + '%';
            applyBackground();
            saveSettings();
        });
        
        // Background tabs
        elements.bgTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                
                // Update tab active state
                elements.bgTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Show corresponding panel
                elements.bgPanels.forEach(panel => {
                    panel.classList.remove('active');
                });
                document.getElementById(tabName + 'Panel').classList.add('active');
            });
        });
        
        // Background options
        elements.bgOptions.forEach(option => {
            option.addEventListener('click', () => {
                const bgType = option.dataset.bg;
                
                if (bgType === 'solid') {
                    state.settings.background = option.dataset.color;
                    state.settings.backgroundType = 'solid';
                    state.settings.backgroundPattern = null;
                } else {
                    state.settings.backgroundType = bgType;
                    state.settings.backgroundPattern = option.dataset.pattern;
                    state.settings.background = defaultBackgroundColors[bgType];
                }
                
                applyBackground();
                updateBackgroundSelection();
                saveSettings();
            });
        });
    }

    // ========================================
    // File Handling
    // ========================================
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.dataTransfer.types.includes('Files')) {
            elements.welcomeScreen.classList.add('drag-over');
        }
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Only remove class if we're leaving the document
        if (e.target === document || !document.body.contains(e.relatedTarget)) {
            elements.welcomeScreen.classList.remove('drag-over');
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.welcomeScreen.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processFile(files[0]);
        }
    }

    function handleFileSelect(e) {
        console.log('handleFileSelect triggered', e.target.files);
        const files = e.target.files;
        if (files.length > 0) {
            processFile(files[0]);
        }
        // Reset file input so the same file can be selected again
        elements.fileInput.value = '';
    }

    function processFile(file) {
        console.log('processFile called with:', file.name);
        // Validate file type
        const validTypes = ['.md', '.txt', '.log'];
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!validTypes.includes(fileExt)) {
            showToast(i18n.t('toast.unsupportedFormat'), 'error');
            return;
        }
        
        // Validate file size (6MB limit)
        if (file.size > 6 * 1024 * 1024) {
            showToast(i18n.t('toast.fileTooLarge'), 'error');
            return;
        }
        
        // Read file
        const reader = new FileReader();
        
        reader.onload = function(e) {
            console.log('FileReader onload triggered');
            let content = e.target.result;
            state.currentFile = file;
            
            // 如果是log文件，清理ANSI转义序列等特殊字符
            if (fileExt === '.log') {
                content = cleanLogContent(content);
            }
            
            state.content = content;
            
            console.log('File loaded:', file.name, 'Size:', content.length);
            
            // Save to localStorage
            saveContent(file.name, content);
            
            // Update UI first to ensure mode switch happens
            console.log('Calling showReadingMode...');
            showReadingMode(file.name);
            console.log('showReadingMode completed');
            
            // Render content (may take time but UI is already switched)
            try {
                console.log('Rendering content...');
                if (fileExt === '.log') {
                    renderLogContent(content);
                } else {
                    renderContent(content);
                }
                console.log('Content rendered');
            } catch (err) {
                console.error('Render error:', err);
            }
            
            // Update reading statistics for achievements
            updateReadingStats(state.wordCount);
            
            showToast(i18n.t('toast.fileLoaded'));
        };
        
        reader.onerror = function() {
            showToast(i18n.t('toast.fileLoadError'), 'error');
        };
        
        reader.readAsText(file);
    }

    // ========================================
    // Content Rendering
    // ========================================
    
    // Clean log content - remove ANSI escape sequences and special characters
    function cleanLogContent(content) {
        let cleaned = content;
        
        // Step 1: Remove OSC sequences (window title, etc.) - must be done first
        // Matches ESC ] ... BEL or ESC ] ... ESC \
        cleaned = cleaned.replace(/\x1b\][^\x07]*\x07/g, '');
        cleaned = cleaned.replace(/\x1b\][^\x1b]*\x1b\\/g, '');
        
        // Step 2: Remove CSI sequences (ESC [ ... )
        // This includes color codes, cursor movement, erase commands, etc.
        cleaned = cleaned.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '');
        
        // Step 3: Remove other escape sequences
        // Bracket mode switching: ESC ( X or ESC ) X
        cleaned = cleaned.replace(/\x1b[()][A-Za-z0-9]/g, '');
        
        // Simple escape sequences: ESC X
        cleaned = cleaned.replace(/\x1b[A-Za-z]/g, '');
        
        // Step 4: Handle backspace sequences (character + backspace)
        // This needs to be done iteratively to handle multiple backspaces
        // Note: We exclude \b itself from matching [^\n] to avoid matching \b\b
        let prevCleaned;
        do {
            prevCleaned = cleaned;
            // Remove non-backspace-non-newline character followed by backspace
            cleaned = cleaned.replace(/[^\n\x08]\x08/g, '');
        } while (cleaned !== prevCleaned);
        
        // Remove any remaining standalone backspaces
        cleaned = cleaned.replace(/\x08/g, '');
        
        // Step 5: Normalize line endings
        // Convert CRLF to LF
        cleaned = cleaned.replace(/\r\n/g, '\n');
        // Remove standalone CR
        cleaned = cleaned.replace(/\r/g, '');
        
        // Step 6: Clean up multiple consecutive blank lines (keep max 2)
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        
        // Step 7: Trim leading/trailing whitespace from each line but preserve structure
        const lines = cleaned.split('\n');
        const cleanedLines = lines.map(line => {
            // Remove trailing whitespace but keep leading spaces for indentation
            return line.replace(/[\t ]+$/, '');
        });
        cleaned = cleanedLines.join('\n');
        
        return cleaned;
    }
    
    // Render log content with proper formatting
    function renderLogContent(content) {
        // Highlight shell prompts before escaping HTML
        const highlightedContent = highlightShellPrompts(content);
        
        // Create pre-formatted display for log files
        const logHtml = `<pre class="log-content">${escapeHtml(highlightedContent)}</pre>`;
        
        // Insert into DOM
        elements.markdownContent.innerHTML = logHtml;
        
        // Calculate statistics
        calculateStats(content);
        
        // Apply background settings
        if (state.isDarkMode) {
            applyTheme();
        } else {
            applyBackground();
        }
        
        // Reapply other settings (width, font, etc.)
        applyOtherSettings();
        
        // Reset scroll position
        window.scrollTo(0, 0);
        
        // Update progress
        updateProgress();
        
        // Generate TOC (for log files, use line numbers as sections)
        generateLogToc(content);
    }
    
    // Escape HTML to prevent XSS, but preserve prompt markers
    function escapeHtml(text) {
        // First, temporarily replace prompt markers with placeholders
        const promptMarkerStart = '\x00PROMPT\x00';
        const promptMarkerEnd = '\x00ENDPROMPT\x00';
        const placeholderStart = '___PROMPT_START___';
        const placeholderEnd = '___PROMPT_END___';
        
        let processed = text.replace(new RegExp(promptMarkerStart, 'g'), placeholderStart);
        processed = processed.replace(new RegExp(promptMarkerEnd, 'g'), placeholderEnd);
        
        // Escape HTML
        const div = document.createElement('div');
        div.textContent = processed;
        let escaped = div.innerHTML;
        
        // Restore prompt markers as HTML span elements
        escaped = escaped.replace(new RegExp(placeholderStart, 'g'), '<span class="shell-prompt">');
        escaped = escaped.replace(new RegExp(placeholderEnd, 'g'), '</span>');
        
        return escaped;
    }
    
    // Highlight shell prompts in log content
    function highlightShellPrompts(content) {
        // Common shell prompt patterns:
        // - user@host:path$ or user@host:path#
        // - root:~# or user:~$
        // - [user@host path]$ or [user@host path]#
        // - C:\Users\user> or /home/user $
        
        const promptPatterns = [
            // Pattern 1: user@host:path$ or user@host:path#
            // Example: radxa@radxa-cubie-a7a:~$ , root@server:/var/log#
            /([a-zA-Z0-9_-]+@[a-zA-Z0-9._-]+:[^\n#$]*?)([$#])/g,
            
            // Pattern 2: simple user:path# or user:path$
            // Example: root:~# , admin:/home$
            /([a-zA-Z0-9_-]+:[^\n@$#]*?)([$#])/g,
            
            // Pattern 3: Windows-style prompt
            // Example: C:\Users\admin> , D:\Projects>
            /([A-Z]:\\[^\n>]*?)(>)/g,
            
            // Pattern 4: Unix path with $
            // Example: /home/user $, /var/log $
            /((?:\/[^\n]*?)|(~))\s*([$])/g
        ];
        
        let highlighted = content;
        
        // Apply highlighting for each pattern
        // We use a special marker that won't be affected by HTML escaping
        const promptMarkerStart = '\x00PROMPT\x00';
        const promptMarkerEnd = '\x00ENDPROMPT\x00';
        
        // Process each pattern
        promptPatterns.forEach(pattern => {
            highlighted = highlighted.replace(pattern, (match, prompt, symbol) => {
                // Don't highlight if already highlighted
                if (match.includes(promptMarkerStart)) return match;
                return `${promptMarkerStart}${match}${promptMarkerEnd}`;
            });
        });
        
        return highlighted;
    }
    
    // Generate TOC for log files based on content structure
    function generateLogToc(content) {
        const lines = content.split('\n');
        const tocNav = elements.floatingTocNav;
        tocNav.innerHTML = '';
        
        if (lines.length === 0) {
            elements.floatingToc.classList.remove('visible');
            return;
        }
        
        const ul = document.createElement('ul');
        ul.className = 'toc-list';
        
        // Find meaningful sections in log (timestamps, headers, etc.)
        let sectionCount = 0;
        const maxSections = 50; // Limit TOC items
        
        lines.forEach((line, index) => {
            if (sectionCount >= maxSections) return;
            
            // Look for common log patterns: timestamps, level indicators, section headers
            const isSection = /\d{4}[-/]\d{2}[-/]\d{2}/.test(line) || 
                             /^(INFO|WARN|ERROR|DEBUG|TRACE|FATAL)/i.test(line) ||
                             /^={3,}/.test(line) ||
                             /^-{3,}/.test(line) ||
                             (line.trim().length > 0 && line.trim().length < 100 && /^[A-Z][A-Z\s]+$/.test(line.trim()));
            
            if (isSection && line.trim()) {
                const li = document.createElement('li');
                li.className = 'toc-item';
                li.dataset.level = 1;
                
                const a = document.createElement('a');
                a.className = 'toc-link';
                a.href = '#log-line-' + index;
                // Truncate long lines for TOC
                const displayText = line.trim().substring(0, 50);
                a.textContent = displayText + (displayText.length < line.trim().length ? '...' : '');
                
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    scrollToLine(index);
                    // 移动端点击后自动关闭目录
                    if (window.innerWidth <= 768) {
                        elements.floatingToc.classList.remove('visible');
                    }
                });
                
                li.appendChild(a);
                ul.appendChild(li);
                sectionCount++;
            }
        });
        
        tocNav.appendChild(ul);
    }
    
    // Scroll to specific line in log
    function scrollToLine(lineIndex) {
        const logContent = elements.markdownContent.querySelector('.log-content');
        if (!logContent) return;
        
        const lines = logContent.textContent.split('\n');
        let charCount = 0;
        for (let i = 0; i < lineIndex && i < lines.length; i++) {
            charCount += lines[i].length + 1; // +1 for newline
        }
        
        // Create a temporary marker
        const marker = document.createElement('span');
        marker.id = 'log-line-' + lineIndex;
        marker.style.position = 'absolute';
        logContent.insertBefore(marker, logContent.childNodes[0]);
        
        const headerHeight = 80;
        const targetPosition = marker.getBoundingClientRect().top + window.pageYOffset - headerHeight;
        
        window.scrollTo({
            top: Math.max(0, targetPosition),
            behavior: 'smooth'
        });
        
        // Remove marker after scrolling
        setTimeout(() => marker.remove(), 100);
    }

    function renderContent(content) {
        // Parse markdown
        const html = marked.parse(content);
        
        // Insert into DOM
        elements.markdownContent.innerHTML = html;
        
        // Calculate statistics
        calculateStats(content);
        
        // Add code block structure before Prism highlighting
        enhanceCodeBlocks();
        
        // Wrap tables for horizontal scrolling
        wrapTables();
        
        // Trigger Prism highlighting
        Prism.highlightAllUnder(elements.markdownContent);
        
        // Apply background settings to newly rendered elements
        if (state.isDarkMode) {
            applyTheme();
        } else {
            applyBackground();
        }
        
        // Reapply other settings (width, font, etc.)
        applyOtherSettings();
        
        // Reset scroll position
        window.scrollTo(0, 0);
        
        // Update progress
        updateProgress();
        
        // Generate TOC
        generateToc();
    }

    function calculateStats(content) {
        // Word count (Chinese + English words)
        const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
        const englishWords = (content.match(/[a-zA-Z]+/g) || []).length;
        state.wordCount = chineseChars + englishWords;
        
        // Reading time (300 chars per minute)
        state.readingTime = Math.ceil(state.wordCount / 300);
        
        // Update UI with i18n
        elements.wordCount.textContent = i18n.t('status.wordCount', { count: formatNumber(state.wordCount) });
        elements.readingTime.textContent = i18n.t('status.readingTime', { minutes: state.readingTime });
    }

    function formatNumber(num) {
        if (num >= 10000) {
            return (num / 10000).toFixed(1) + '万';
        }
        return num.toLocaleString();
    }

    // ========================================
    // UI State Management
    // ========================================
    function showReadingMode(fileName) {
        console.log('showReadingMode called with:', fileName);
        console.log('Before: welcomeScreen display =', elements.welcomeScreen.style.display);
        console.log('Before: readingArea display =', elements.readingArea.style.display);
        
        // Update file info
        elements.fileName.textContent = fileName;
        elements.fileName.style.display = 'inline';
        
        // Toggle screens - hide welcome, show reading
        elements.welcomeScreen.style.display = 'none';
        elements.welcomeScreen.classList.remove('active');
        
        elements.readingArea.style.display = 'block';
        elements.readingArea.classList.add('active');
        
        // Show status bar
        elements.statusBar.style.display = 'block';
        
        // Force reflow to ensure styles are applied
        void elements.readingArea.offsetHeight;
        
        console.log('After: welcomeScreen display =', elements.welcomeScreen.style.display);
        console.log('After: readingArea display =', elements.readingArea.style.display);
    }

    function showWelcomeMode() {
        // Clear file info
        elements.fileName.textContent = '';
        elements.fileName.style.display = 'none';
        
        // Clear content
        elements.markdownContent.innerHTML = '';
        
        // Toggle screens - show welcome, hide reading
        elements.welcomeScreen.style.display = 'flex';
        elements.welcomeScreen.classList.add('active');
        
        elements.readingArea.style.display = 'none';
        elements.readingArea.classList.remove('active');
        
        // Hide status bar
        elements.statusBar.style.display = 'none';
        
        // Reset stats
        elements.wordCount.textContent = i18n.t('status.wordCount', { count: 0 });
        elements.readingTime.textContent = i18n.t('status.readingTime', { minutes: 0 });
        elements.progressPercent.textContent = '0%';
        
        // Reset scroll
        window.scrollTo(0, 0);
    }

    // ========================================
    // Progress Tracking
    // ========================================
    function handleScroll() {
        requestAnimationFrame(() => {
            updateProgress();
            if (elements.floatingToc.classList.contains('visible')) {
                updateActiveTocItem();
            }
        });
    }

    function updateProgress() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        
        elements.progressPercent.textContent = Math.round(progress) + '%';
    }

    // ========================================
    // Local Storage
    // ========================================
    function saveContent(fileName, content) {
        try {
            localStorage.setItem('currentFile', fileName);
            localStorage.setItem('currentContent', content);
        } catch (e) {
            console.warn('Failed to save content:', e);
        }
    }

    function loadSavedContent() {
        const savedFile = localStorage.getItem('currentFile');
        const savedContent = localStorage.getItem('currentContent');
        
        if (savedFile && savedContent) {
            state.currentFile = { name: savedFile };
            state.content = savedContent;
            
            // 根据文件扩展名选择正确的渲染方式
            const fileExt = '.' + savedFile.split('.').pop().toLowerCase();
            
            if (fileExt === '.log') {
                renderLogContent(savedContent);
            } else {
                renderContent(savedContent);
            }
            
            showReadingMode(savedFile);
            
            // Update reading statistics for achievements
            updateReadingStats(state.wordCount);
        }
    }

    function clearSavedContent() {
        localStorage.removeItem('currentFile');
        localStorage.removeItem('currentContent');
    }

    // ========================================
    // Keyboard Shortcuts
    // ========================================
    function handleKeydown(e) {
        // Escape: Close sidebar or return to welcome
        if (e.key === 'Escape') {
            if (elements.settingsSidebar.classList.contains('active')) {
                closeSidebar();
            } else if (state.currentFile) {
                state.currentFile = null;
                state.content = '';
                clearSavedContent();
                showWelcomeMode();
            }
        }
        
        // Ctrl/Cmd + O: Open file
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            elements.fileInput.click();
        }
        
        // Ctrl/Cmd + Shift + T: Toggle theme
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
            e.preventDefault();
            toggleTheme();
        }
        
        // Ctrl/Cmd + ,: Open settings
        if ((e.ctrlKey || e.metaKey) && e.key === ',') {
            e.preventDefault();
            if (elements.settingsSidebar.classList.contains('active')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        }
    }

    // ========================================
    // Table Enhancement - Wrap tables for horizontal scrolling
    // ========================================
    function wrapTables() {
        const tables = elements.markdownContent.querySelectorAll('table');
        tables.forEach((table) => {
            // Skip if already wrapped
            if (table.parentElement.classList.contains('table-wrapper')) return;
            
            // Create wrapper
            const wrapper = document.createElement('div');
            wrapper.className = 'table-wrapper';
            
            // Insert wrapper before table
            table.parentNode.insertBefore(wrapper, table);
            
            // Move table into wrapper
            wrapper.appendChild(table);
        });
    }

    // ========================================
    // Code Block Enhancement - Header, Line Numbers, Actions
    // ========================================
    function enhanceCodeBlocks() {
        const codeBlocks = elements.markdownContent.querySelectorAll('pre code');
        codeBlocks.forEach((codeBlock) => {
            const pre = codeBlock.parentElement;
            if (pre.classList.contains('code-block-enhanced')) return;
            
            // Extract language
            const langClass = Array.from(codeBlock.classList).find(cls => cls.startsWith('language-'));
            const lang = langClass ? langClass.replace('language-', '') : '';
            
            // Mark as enhanced
            pre.classList.add('code-block-enhanced');
            
            // Get raw code before any processing
            const rawCode = codeBlock.textContent;
            const lines = rawCode.split('\n');
            // Remove empty last line if exists
            if (lines[lines.length - 1] === '') lines.pop();
            
            // Create header
            const header = document.createElement('div');
            header.className = 'code-block-header';
            
            // Language label on left
            const langLabel = document.createElement('span');
            langLabel.className = 'code-block-lang';
            langLabel.textContent = lang ? lang.toUpperCase() : 'CODE';
            header.appendChild(langLabel);
            
            // Action buttons on right
            const actions = document.createElement('div');
            actions.className = 'code-block-actions';
            
            // Download button (left)
            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'code-block-btn';
            downloadBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';
            downloadBtn.title = '下载';
            downloadBtn.onclick = () => downloadCode(rawCode, lang);
            actions.appendChild(downloadBtn);
            
            // Copy button (right)
            const copyBtn = document.createElement('button');
            copyBtn.className = 'code-block-btn';
            copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
            copyBtn.title = '复制';
            copyBtn.onclick = () => copyCodeToClipboard(rawCode);
            actions.appendChild(copyBtn);
            
            header.appendChild(actions);
            pre.insertBefore(header, pre.firstChild);
            
            // Create wrapper for line numbers and code
            const codeWrapper = document.createElement('div');
            codeWrapper.className = 'code-wrapper';
            
            // Create container for the code first (so we can measure it)
            const codeContainer = document.createElement('div');
            codeContainer.className = 'code-container';
            
            // Move code block into container
            codeBlock.parentNode.insertBefore(codeWrapper, codeBlock);
            codeWrapper.appendChild(codeContainer);
            codeContainer.appendChild(codeBlock);
            
            // Now create line numbers based on actual code content
            // Count lines by splitting on newlines in the raw code
            const lineCount = Math.max(1, lines.length);
            
            const lineNumbers = document.createElement('div');
            lineNumbers.className = 'line-numbers';
            lineNumbers.style.lineHeight = '22px';
            // Generate line numbers
            let lineNumbersHtml = '';
            for (let i = 0; i < lineCount; i++) {
                lineNumbersHtml += `<span>${i + 1}</span>`;
            }
            lineNumbers.innerHTML = lineNumbersHtml;
            
            // Insert line numbers before code container
            codeWrapper.insertBefore(lineNumbers, codeContainer);
            
            // Store line count for later sync
            pre.dataset.lineCount = lineCount;
        });
    }
    
    // Copy code to clipboard
    async function copyCodeToClipboard(code) {
        try {
            await navigator.clipboard.writeText(code);
            showToast(i18n.t('toast.copied'));
        } catch (err) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = code;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast(i18n.t('toast.copied'));
        }
    }
    
    // Download code as file
    function downloadCode(code, lang) {
        const extensionMap = {
            'javascript': 'js',
            'js': 'js',
            'typescript': 'ts',
            'ts': 'ts',
            'python': 'py',
            'py': 'py',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'c++': 'cpp',
            'csharp': 'cs',
            'cs': 'cs',
            'go': 'go',
            'rust': 'rs',
            'ruby': 'rb',
            'php': 'php',
            'swift': 'swift',
            'kotlin': 'kt',
            'scala': 'scala',
            'r': 'r',
            'matlab': 'm',
            'sql': 'sql',
            'shell': 'sh',
            'bash': 'sh',
            'powershell': 'ps1',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'sass': 'sass',
            'less': 'less',
            'json': 'json',
            'xml': 'xml',
            'yaml': 'yml',
            'yml': 'yml',
            'markdown': 'md',
            'md': 'md',
            'dockerfile': 'dockerfile',
            'makefile': 'makefile',
            'vim': 'vim',
            'lua': 'lua',
            'perl': 'pl',
            'groovy': 'groovy',
            'dart': 'dart',
            'julia': 'jl',
            'elixir': 'ex',
            'erlang': 'erl',
            'haskell': 'hs',
            'clojure': 'clj',
            'fsharp': 'fs',
            'ocaml': 'ml',
            'racket': 'rkt',
            'scheme': 'scm',
            'lisp': 'lisp',
            'fortran': 'f90',
            'cobol': 'cob',
            'pascal': 'pas',
            'delphi': 'pas',
            'ada': 'adb',
            'verilog': 'v',
            'vhdl': 'vhd',
            'tcl': 'tcl',
            'awk': 'awk',
            'sed': 'sed',
            'arduino': 'ino',
            'processing': 'pde'
        };
        
        const ext = extensionMap[lang.toLowerCase()] || 'txt';
        const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `code.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ========================================
    // TOC Management - Floating TOC
    // ========================================
    function generateToc() {
        const headings = elements.markdownContent.querySelectorAll('h1, h2, h3');
        const tocNav = elements.floatingTocNav;
        tocNav.innerHTML = '';

        if (headings.length === 0) {
            elements.floatingToc.classList.remove('visible');
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'toc-list';

        headings.forEach((heading, index) => {
            const level = parseInt(heading.tagName.charAt(1));
            
            if (level > 3) return;
            
            const li = document.createElement('li');
            li.className = 'toc-item';
            li.dataset.level = level;
            li.dataset.headingId = heading.id;
            
            const a = document.createElement('a');
            a.className = 'toc-link';
            a.href = '#' + heading.id;
            a.textContent = heading.textContent;
            
            a.addEventListener('click', (e) => {
                e.preventDefault();
                // Remove active from all links
                tocNav.querySelectorAll('.toc-link').forEach(link => link.classList.remove('active'));
                // Add active to clicked link
                a.classList.add('active');
                // Scroll to heading
                scrollToHeading(heading);
                // 移动端点击后自动关闭目录
                if (window.innerWidth <= 768) {
                    elements.floatingToc.classList.remove('visible');
                }
            });
            
            li.appendChild(a);
            ul.appendChild(li);
        });

        tocNav.appendChild(ul);
        
        updateActiveTocItem();
    }

    function scrollToHeading(heading) {
        // Calculate position considering header height
        const headerHeight = 80; // Approximate header height + padding
        const targetPosition = heading.getBoundingClientRect().top + window.pageYOffset - headerHeight;
        
        window.scrollTo({
            top: Math.max(0, targetPosition),
            behavior: 'smooth'
        });
    }

    function updateActiveTocItem() {
        const headings = elements.markdownContent.querySelectorAll('h1, h2, h3');
        const tocLinks = elements.floatingTocNav.querySelectorAll('.toc-link');
        
        if (tocLinks.length === 0) return;
        
        const scrollTop = window.pageYOffset;
        const headerOffset = 100; // Offset to consider header
        
        // Find which heading is currently in view
        let currentHeadingIndex = -1;
        
        headings.forEach((heading, index) => {
            const headingTop = heading.getBoundingClientRect().top + scrollTop;
            if (headingTop <= scrollTop + headerOffset) {
                currentHeadingIndex = index;
            }
        });
        
        // If no heading found and we're at the top, select first
        if (currentHeadingIndex === -1 && scrollTop < 100 && headings.length > 0) {
            currentHeadingIndex = 0;
        }
        
        // If we're near the bottom, select the last heading
        const nearBottom = (window.innerHeight + scrollTop) >= document.documentElement.scrollHeight - 100;
        if (nearBottom && headings.length > 0) {
            currentHeadingIndex = headings.length - 1;
        }
        
        // Update active class
        tocLinks.forEach((link, index) => {
            link.classList.remove('active');
            if (index === currentHeadingIndex) {
                link.classList.add('active');
            }
        });
    }

    // ========================================
    // Export Functions - TXT, MD, PDF
    // ========================================
    
    // Export to TXT - 纯文本格式
    function exportToTxt() {
        if (!state.currentFile) {
            showToast(i18n.t('toast.loadFileFirst'), 'error');
            return;
        }
        
        try {
            // 获取纯文本内容（去除Markdown格式）
            let plainText = state.content;
            const fileExt = '.' + state.currentFile.name.split('.').pop().toLowerCase();
            
            // 如果是markdown文件，转换为纯文本
            if (fileExt === '.md') {
                plainText = getPlainTextFromMarkdown(state.content);
            }
            
            // 创建Blob并下载
            const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const fileName = (state.currentFile.name || 'document').replace(/\.(md|txt|log)$/, '') + '.txt';
            
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast(i18n.t('toast.exportTxtSuccess'));
        } catch (error) {
            console.error('TXT export error:', error);
            showToast('TXT 导出失败', 'error');
        }
    }
    
    // Export to MD - Markdown格式
    function exportToMd() {
        if (!state.currentFile) {
            showToast(i18n.t('toast.loadFileFirst'), 'error');
            return;
        }
        
        try {
            // 直接使用原始Markdown内容
            const blob = new Blob([state.content], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const fileName = (state.currentFile.name || 'document').replace(/\.(md|txt|log)$/, '') + '.md';
            
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast(i18n.t('toast.exportMdSuccess'));
        } catch (error) {
            console.error('MD export error:', error);
            showToast('MD 导出失败', 'error');
        }
    }
    
    // 将Markdown转换为纯文本
    function getPlainTextFromMarkdown(markdown) {
        let text = markdown;
        
        // 移除标题标记
        text = text.replace(/^#{1,6}\s+/gm, '');
        
        // 移除粗体和斜体标记
        text = text.replace(/\*\*\*(.*?)\*\*\*/g, '$1');
        text = text.replace(/\*\*(.*?)\*\*/g, '$1');
        text = text.replace(/\*(.*?)\*/g, '$1');
        text = text.replace(/___(.*?)___/g, '$1');
        text = text.replace(/__(.*?)__/g, '$1');
        text = text.replace(/_(.*?)_/g, '$1');
        
        // 移除链接，保留文本
        text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
        
        // 移除图片
        text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '');
        
        // 移除代码块标记
        text = text.replace(/```[\w]*\n?/g, '');
        text = text.replace(/```/g, '');
        
        // 移除行内代码标记
        text = text.replace(/`([^`]+)`/g, '$1');
        
        // 移除引用标记
        text = text.replace(/^>\s+/gm, '');
        
        // 移除列表标记
        text = text.replace(/^[\*\-\+]\s+/gm, '');
        text = text.replace(/^\d+\.\s+/gm, '');
        
        // 移除水平线
        text = text.replace(/^[\*\-]{3,}$/gm, '');
        text = text.replace(/^_{3,}$/gm, '');
        
        // 移除HTML标签
        text = text.replace(/<[^>]+>/g, '');
        
        return text;
    }
    function showExportModal() {
        elements.exportModal.classList.add('active');
        elements.exportProgressFill.style.width = '0%';
        elements.exportProgressText.textContent = '准备中...';
    }

    function hideExportModal() {
        elements.exportModal.classList.remove('active');
    }

    function updateExportProgress(percent, text) {
        elements.exportProgressFill.style.width = percent + '%';
        elements.exportProgressText.textContent = text;
    }
    
    async function exportToPdf() {
        if (!state.currentFile) {
            showToast(i18n.t('toast.loadFileFirst'), 'error');
            return;
        }

        showExportModal();
        updateExportProgress(10, i18n.t('export.progress.preparing'));
        
        try {
            // Wait a bit for UI update
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Create print styles
            const printStyles = document.createElement('style');
            printStyles.id = 'print-styles';
            printStyles.textContent = `
                @media print {
                    @page {
                        size: A4;
                        margin: 20mm;
                    }
                    
                    body * {
                        visibility: hidden;
                    }
                    
                    #markdownContent,
                    #markdownContent * {
                        visibility: visible;
                    }
                    
                    #markdownContent {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        max-width: none;
                        margin: 0;
                        padding: 0;
                        background: ${state.isDarkMode ? '#0a0e1a' : (state.settings.backgroundType === 'solid' ? state.settings.background : '#FAFAF8')} !important;
                        color: ${state.isDarkMode ? '#E8E8E6' : '#333333'} !important;
                        font-family: ${state.settings.fontFamily} !important;
                        font-size: ${state.settings.fontSize}px !important;
                        line-height: ${state.settings.lineHeight} !important;
                    }
                    
                    /* Hide UI elements */
                    .header, .status-bar, .floating-toc, 
                    .export-modal, .export-confirm-modal,
                    .settings-sidebar, .sidebar-overlay,
                    .toast {
                        display: none !important;
                    }
                    
                    /* Ensure content breaks properly */
                    #markdownContent pre,
                    #markdownContent blockquote,
                    #markdownContent table {
                        page-break-inside: avoid;
                    }
                    
                    #markdownContent h1,
                    #markdownContent h2,
                    #markdownContent h3 {
                        page-break-after: avoid;
                    }
                }
            `;
            
            document.head.appendChild(printStyles);
            
            updateExportProgress(50, i18n.t('export.progress.generating'));
            
            // Use browser's print to PDF
            const originalTitle = document.title;
            const fileName = (state.currentFile.name || 'document').replace(/\.(md|txt|log)$/, '');
            document.title = fileName;
            
            await new Promise(resolve => setTimeout(resolve, 200));
            
            updateExportProgress(80, i18n.t('export.progress.printing'));
            
            window.print();
            
            // Cleanup
            document.title = originalTitle;
            document.getElementById('print-styles')?.remove();
            
            updateExportProgress(100, i18n.t('export.progress.complete'));
            await new Promise(resolve => setTimeout(resolve, 500));
            hideExportModal();
            showToast(i18n.t('export.success'));
                    
        } catch (error) {
            console.error('PDF export error:', error);
            hideExportModal();
            showToast(i18n.t('toast.exportPdfFailed', { error: error.message }), 'error');
            // Cleanup on error
            document.getElementById('print-styles')?.remove();
        }
    }

    // ========================================
    // Toast Notifications
    // ========================================
    function showToast(message, type = 'success') {
        elements.toastMessage.textContent = message;
        elements.toast.className = 'toast show' + (type === 'error' ? ' error' : '');
        
        // 清除之前的定时器
        if (window.toastTimer) {
            clearTimeout(window.toastTimer);
        }
        
        // 设置新的定时器，3秒后隐藏
        window.toastTimer = setTimeout(() => {
            elements.toast.classList.remove('show');
        }, 3000);
    }

    // ========================================
    // 🥚 彩蛋功能 (Easter Eggs)
    // ========================================
    
    // 1. Konami Code - 键盘侠的致敬
    const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    
    function initEasterEggs() {
        // 加载彩蛋数据
        loadEasterEggData();
        
        // 绑定 Konami Code 监听
        document.addEventListener('keydown', handleKonamiCode);
        
        // 检查诗意加载语
        showPoeticLoadingText();
    }
    
    function handleKonamiCode(e) {
        // 将按键添加到序列
        state.easterEggs.konamiCode.push(e.key);
        
        // 只保留最近10个按键
        if (state.easterEggs.konamiCode.length > 10) {
            state.easterEggs.konamiCode.shift();
        }
        
        // 检查是否匹配 Konami Code
        if (state.easterEggs.konamiCode.length === 10) {
            const isMatch = state.easterEggs.konamiCode.every((key, index) => {
                return key.toLowerCase() === KONAMI_CODE[index].toLowerCase();
            });
            
            if (isMatch) {
                console.log('Konami Code activated!'); // 调试信息
                triggerMatrixRain();
                state.easterEggs.konamiCode = []; // 重置
            }
        }
    }
    
    // 黑客帝国数字雨效果
    async function triggerMatrixRain() {
        console.log('triggerMatrixRain called'); // 调试信息
        
        // 先显示提示信息（5秒后自动消失）
        showToast(i18n.t('toast.konamiCode'), 'success');
        console.log('Toast should be shown'); // 调试信息
        
        // 进入全屏模式
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('无法进入全屏模式:', err);
            });
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) {
            document.documentElement.msRequestFullscreen();
        }
        
        // 延迟一点再创建canvas，让toast有时间显示
        setTimeout(async () => {
            // 创建画布
            const canvas = document.createElement('canvas');
            canvas.id = 'matrix-rain';
            canvas.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 9999;
                pointer-events: none;
                background: rgba(0, 0, 0, 0.9);
            `;
            document.body.appendChild(canvas);
        
            const ctx = canvas.getContext('2d');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            // 字符集 - 根据语言环境选择不同内容
            let chars;
            const isChinese = typeof i18n !== 'undefined' && i18n.isChinese();
            if (isChinese) {
                // 中文环境：直接使用内置的道德经文本（避免CORS问题）
                chars = '道、可道，非常道。名可名，非常名。无名，天地之始；有名万物之母；故恒无欲，以观其妙；恒有欲，以观其徼。此两者，同出而异名，同谓之玄。玄之又玄，众妙之门。天下皆知美之为美，斯恶已。皆知善之为善，斯不善已。故有无相生，难易相成，长短相形，高下相盈，音声相和，前后相随。恒也。是以圣人处无为之事，行不言之教；万物作而弗始，生而弗有，为而弗恃，功成而不居。夫唯弗居，是以不去。不尚贤，使民不争；不贵难得之货，使民不为盗；不见可欲，使民心不乱。是以圣人之治也，虚其心，实其腹，弱其志，强其骨。恒使民无知无欲。使夫智者不敢为也。为无为，则无不治矣。道冲，而用之或不盈也。渊兮似万物之宗；挫其锐，解其纷；和其光，同其尘；湛兮似或存。吾不知其谁之子，象帝之先。天地不仁，以万物为刍狗；圣人不仁，以百姓为刍狗。天地之间，其犹橐龠与？虚而不淈，动而愈出。多闻数穷，不若守于中。谷神不死，是谓玄牝。玄牝之门，是谓天地根。绵绵兮其若存，用之不勤。天长地久。天地所以能长且久者，以其不自生也，故能长生。是以圣人：退其身，而身先；外其身，而身存。非以其无私邪？故能成其私。上善若水。水善利万物而不争，处众人之所恶，故几于道：居、善地；心、善渊；与、善仁；言、善信；政、善治；事、善能；动、善时；夫唯不争，故无尤。持而盈之，不如其已；揣而锐之，不可长保。金玉满堂，莫之能守；富贵而骄，自遗其咎。功遂身退，天之道也。载营魄抱一，能无离乎？搏气致柔，能如婴儿乎？涤除玄监，能如疵乎？爱民治国，能无以知乎？天门开阖，能为雌乎？明白四达，能无以为乎？生之畜也；生而弗有；为而弗恃；长而弗宰；是谓玄德。三十辐共一毂，当其无有，车之用也。埏埴以为器，当其无有，器之用也。凿户牖以为室，当其无有，室之用也。故有之以为利，无之以为用。五色令人目盲；五音令人耳聋；五味令人口爽；驰骋畋猎，令人心发狂；难得之货，令人行妨。是以圣人之治也，为腹不为目，故去彼取此。宠辱若惊，贵大患若身。何谓宠辱若惊？宠为上，辱为下。得之若惊，失之若惊，是谓宠辱若惊。何谓贵大患若身？吾所以有大患者，为吾有身，及吾无身，吾有何患？故贵以身为天下，若可寄天下；爱以身为天下，若可托天下。视之不见名曰夷；听之不闻名曰希；搏之不得名曰微。此三者，不可致诘，故混而为一。其上不皎，其下不昧。绳绳兮不可名，复归于无物。是谓无状之状，无物之象，是谓惚恍。迎之不见其首，随之不见其后。执古之道，以御今之有。能知古始，是谓道纪。古之善为道者，微妙玄通，深不可识。夫唯不可识，故强为之容：豫兮其若冬涉川；犹兮其若畏四邻；俨兮其若客；涣兮其若凌释；敦兮其若朴；旷兮其若谷；混兮其若浊；孰能浊以止；静之徐清？孰能安以久；动之徐生？保此道者不欲盈。夫唯不盈，是以能蔽复成。致虚极，守静笃。万物并作，吾以观其复。夫物芸芸，各复归其根。归根曰静，静曰复命。复命曰常，知常曰明。不知常妄，妄作凶。知常容，容乃公。公乃全，全乃天，天乃道，道乃久，没身不殆。太上，下知有之；其次，亲之；其次，誉之；其次，畏之；其次，侮之。故信不足，焉有不信。犹兮其贵言哉。功成事遂，百姓皆曰：我自然。大道废，有仁义；智慧出，有大伪；六亲不和，有孝慈；国家昏乱，有忠臣。绝圣弃智，民利百倍；绝仁弃义，民复孝慈；绝巧弃利，盗贼无有。此三言也，以为文未足，故令有所属：见素抱朴，少私寡欲，绝学无忧。唯之与阿，相去几何？美之与恶，相去若何？人之所畏，不可不畏。荒兮，其未央哉！众人熙熙，如享太牢，如春登台。我独泊兮，其未兆；沌沌兮，如婴儿之未孩；累累兮，若无所归。众人皆有馀，而我独若遗。我愚人之心也哉！众人昭昭，我独昏昏。众人察察，我独闷闷。恍兮其若海，恍兮其若无所止。众人皆有以，而我独顽似鄙。我欲独异于人，而贵食母。孔德之容，惟道是从。道之为物，惟恍惟惚。惚兮恍兮，其中有象；恍兮惚兮，其中有物。窈兮冥兮，其中有精；其精甚真，其中有信。自今及古，其名不去，以阅众甫。吾何以知众甫之状哉？以此。“曲则全，枉则直，洼则盈，敝则新，少则得，多则惑。”是以圣人抱一，为天下式。不自见，故明；不自是，故彰；不自伐，故有功；不自矜，故长。夫唯不争，故天下莫能与之争。古之所谓曲则全者，岂虚言哉？诚全而归之。希言自然。飘风不终朝，骤雨不终日。孰为此者？天地。天地尚不能久，而况于人乎？故从事于道者，同于道；德者，同于德；失者，同于失。同于道者，道亦乐得之；同于德者，德亦乐得之；同于失者，失亦乐得之。信不足，焉有不信。企者不立；跨者不行；自见者不明；自是者不彰；自伐者无功；自矜者不长。其在道也，曰：馀食赘形。物或恶之，故有道者不处。有物混成，先天地生。寂兮寥兮，独立而不改，周行而不殆，可以为天地母。吾不知其名，故强字之曰道，强为之名曰大。大曰逝，逝曰远，远曰反。故道大，天大，地大，王亦大。域中有四大，而人居其一焉。王法地地，法天天，法道道，法自然。重为轻根，静为躁君。是以君子终日行，不离其辎重。虽有荣观，燕处超然。奈何万乘之主，而以身轻天下？轻则失根，躁则失君。善行，无辙迹；善言，无瑕谪；善数，不用筹策；善闭，无关楗而不可开；善结，无绳约而不可解。是以圣人恒善救人，故无弃人；恒善救物，故无弃物。是谓袭明。故善人者，善人之师；不善人者，善人之资。不贵其师，不爱其资，虽智大迷，是谓要妙。知其雄，守其雌，为天下溪。为天下溪，恒德不离，复归于婴儿。知其白，守其黑，为天下式。为天下式，恒德不忒，复归于无极。知其荣，守其辱，为天下谷。为天下谷，恒德乃足，复归于朴。朴散。则为器；圣人用之，则为官长，故大制不割。将欲取天下而为之，吾见其弗得已。夫天下神器也，非可为者也。为者败之，执者失之。凡物，或行或随；或噤或吹；或疆或锉；或培或堕。是以圣人去甚，去奢，去泰。以道佐人主，不以兵强于天下。其事好远；师之所处，荆棘生焉。大军之后，必有凶年。故善战者果而已矣，勿以取强焉。果而勿骄，果而勿矜，果而勿伐，果而勿得已居，是谓果而不强。物壮则老，是谓不道，不道早已。夫兵者不祥之器也，物或恶之，故有道者弗处。君子居则贵左，用兵则贵右。故兵者非君子之器也，不祥之器也。铦庞为上，勿美也。若美之，是乐杀人。夫乐杀人，不可以得志于天下矣。是以吉事上左，丧事上右。是以偏将军居左，上将军居右，言以丧礼居之也。杀人众，以悲哀泣之，战胜，以丧礼处之。道恒无名、朴，虽小，天下弗能臣。侯王若能守之，万物将自宾。天地相合，以降甘露；民莫之令，而自均焉。始制有名，名亦既有，夫亦将知止，知止，所以不殆。譬道之在天下，犹川谷之于江海也。知人者智，自知者明；胜人者有力，自胜者强；知足者富，强行者有志；不失其所者久。死而不亡者寿。大道汜兮，其可左右。万物恃之以生而弗辞；成功遂事而弗名有。衣被万物，而弗为主；则恒无欲也，可名于小。万物归焉，而弗知主；则恒无名也，可名为大。是以圣人之能成大也，以其不为大也，故能成其大。执大象，天下往。往而不害，安平泰。乐与饵，过客止。道之出言，淡兮其无味。视之不足见，听之不足闻，用之不足既。将欲歙之，必固张之；将欲弱之，必固强之；将欲去之，必固兴之；将欲夺之，必固予之。是谓微明：柔之胜刚，弱之胜强。鱼不可脱于渊，邦之利器，不可以示人。道恒无为，而无不为。侯王若能守之，万物将自化。化而欲作，吾将镇之以无名之朴。镇之以无名之朴，夫将不欲。不欲以静，天下将自正。上德不德，是以有德；下德不失德，是以无德。上德无为，而无以为；下德无为，而有以为。上仁为之，而无以为；上义为之，而有以为。上礼为之，而莫之应，则攘臂而扔之。故失道而后德，失德而后仁，失仁而后义，失义而后礼。夫礼者，忠信之薄，而乱之首也。前识者，道之华，而愚之始也。是以，大丈夫处其厚，不居其薄；处其实，不居其华。故去彼取此。昔之得一者：天得一，以清；地得一，以宁；神得一，以灵；谷得一，以盈；侯得一，以为天下正。其致之也，谓天无以清，将恐裂；谓地无以宁，将恐发；谓神无以灵，将恐歇；谓谷无以盈，将恐竭；谓万物无以生，将恐灭；谓侯王无以正，将恐蹶。故贵必以贱为本，高以下为基。是以侯王自谓孤、寡、不谷。是其以贱为本也？非欤？故致数舆，无舆。是故不欲琭琭若玉，珞珞若石。反者，道之动；弱者，道之用。天下万物生于有，有生于无。上士闻道，勤而行之；中士闻道，若存若亡；下士闻道，大笑之。弗笑，不足以为道。是以建言有之曰：明道若昧；进道若退；夷道若□(右边是一个页字，左上边一个业字下面是一个系字)；上德若谷；广德若不足；建德若婨；质真若渝；大白若辱；大方无隅；大器晚成；大音希声；大象无形；道隐无名。夫唯道，善始且善成。道生一，一生二，二生三，三生万物。万物负阴而抱阳，冲气以为和。人之所恶，唯孤、寡、不谷，而王公以自称也。故物，或损之而益，或益之而损。人之所教，亦议而教人。“强梁者不得其死！”吾将以为学父。天下之至柔，驰骋天下之至坚。无有，入于无间；吾是以知无为之有益也。不言之教，无为之益，天下希能及之矣。名与身，孰亲？身与货，孰多？得与亡，孰病？甚爱，必大费；多藏，必厚亡。故知足，不辱，知止，不殆，可以长久。大成若缺，其用不弊。大盈若冲，其用不穷。大直若诎，大辩若讷。大巧若拙，其用不屈，躁胜寒，静胜热，清静可以为天下正。天下有道，却走马以粪。天下无道，戎马生于郊。罪莫大于可欲，祸莫大于不知足；咎莫懵于欲得。故知足之足，恒足矣。不出户，以知天下；不窥于牖，以知天道。其出弥远，其知弥少。是以圣人弗行而知，弗见而明，弗为而成。为学者日益，为道者日损。损之又损之，以至于无为，无为则无不为。将欲取天下者，恒以无事。及其有事也，又不足以取天下矣。圣人恒无心，以百姓之心为心。善者善之，不善者亦善之，得善矣。信者信之，不信者亦信之，得信矣。圣人之在天下歙歙焉，为天下浑浑焉。百姓皆注其耳目，圣人皆孩之。出生入死。生之徒十有三；死之徒十有三；而民之生，生而动。动皆之死地，亦十有三。夫何故也？以其生生之厚也。盖闻善摄生者，陆行不遇兕虎，入军不被甲兵；兕无所投其角，虎无所惜其爪，兵无所容其刃。夫何故也？以其无死地焉。道生之，而德畜之，物形之，而器成之。是以万物，尊道而贵德。道之尊也，德之贵也，夫莫之爵。而恒自然也。故道生之，德畜之，长之育之，亭之度之，养之覆之。生而弗有，为而弗恃，长而弗宰。是谓玄德。天下有始，可以为天下母，既得其母，以知其子；复守其母：没身不殆。塞其兑，闭其门，终身不勤。开其兑，济其事，终身不救。见小曰明，守柔曰强。用其光，复归其明，无遗身殃，是为袭常。使我介然有知，行于大道，唯施是畏。大道甚夷，而民好径。朝甚除，田甚芜，仓甚虚；服文采，带利剑，厌饮食，财货有馀，是谓盗竽。盗竽非盗也哉！善建者不拔，善抱者不脱，子孙以祭祀不绝。修之身，其德乃真；修之家，其德乃馀；修之乡，其德乃长；修之邦，其德乃丰；修之天下，其德乃溥。故以身观身，以家观家，以乡观乡，以邦观邦，以天下观天下。吾奚以知天下然哉？以此。含德之厚者，比于赤子。蜂虿虺蛇弗螫，攫鸟猛兽弗搏。骨弱筋柔，而握固。未知牝牡之会，而朘怒，精之至也。终日号，而不嗄，和之至也。精和曰常，知常曰明，益生曰祥，心使气曰强。物壮则老，谓之不道，不道早已。知者弗言，言者弗知。塞其兑，闭其门；挫其锐，解其纷，和其光，同其尘；是谓玄同。故不可得而亲，亦不可得而疏；不可得而利，亦不可得而害；不可得而贵，亦不可得而贱：故为天下贵。以正治国，以奇用兵，以无事取天下。吾何以知其然哉？以此：夫天下多忌讳，而民弥贫；民多利器，而邦家滋昏；民多智慧，而邪事滋起；法令滋章，而盗贼多有。是以圣人之言曰：“我无为，而民自化；我好静，而民自正；我无事，而民自富；我无欲，而民自朴。”其政闷闷，其民淳淳，其政察察，其民缺缺。祸兮，福之所倚；福兮，祸之所伏。孰知其极？其无正邪？正复为奇，善复为袄。人之迷也，其日固已久矣。是以圣人方而不割，廉而不刿，直而不肆，光而不耀。治人事天，莫若啬。夫唯啬，是以早服。早服是谓重积德。重积德，则无不克。无不克，则莫知其极；莫知其极，可以有国。有国之母，可以长久。深其根固其柢，长生久视之道也。治大国，若烹小鲜。以道莅天下，其鬼不神。非其鬼不神，其神不伤人。非其神不伤人，圣人亦不伤人。夫两不相伤，故德交归焉。大邦者下流也，天下之牝，天下之交也。牝恒以静胜牡，以静为下。大邦以下小邦，则取小邦；小邦以下大邦，则取于大邦。故或下以取，或下而取。故大邦者，不过欲兼畜人；小邦者，不过欲入事人。夫皆得其欲，则大者宜为下。道者，万物之注也，善人之葆也，不善人之所葆也。美言可以市尊，美行可以加人。人之不善，何弃之有？故立天子，置三公，虽有拱璧，以先驷马，不如坐进此道。古之所以贵此道者，何也？不曰求以得，有罪以免邪？故为天下贵。为无为，事无事，味无味。大小，多少，抱怨，以德。图难乎，其易也；为大乎，其细也；天下之难，作于易；天下之大，作于细。是以圣人终不为大，故能成其大。夫轻诺，必寡信；必多难。是以圣人犹难之，故终无难矣。其安易持，其未兆易谋。其脆易判，其微易散。为之于其未有，治之于其未乱。合抱之木，生于毫末；九成之台，起于累土；千里之行，始于足下。为者败之，执者失之。是以圣人无为故无败，无执故无失。民之从事，恒于几成而败之。故曰：慎终如始，则无败事。是以圣人欲不欲，不贵难得之货；学不学，复中人之所过。以辅万物之自然，而弗敢为也。古之善为道者，非以明民，将以愚之。民之难治，以其智多。故以知治国，国之贼；不以知治国，国之德。知此两者，亦稽式。恒知稽式，是谓玄德。玄德深矣远矣，与物反矣，乃至大顺。江海之所以能为百谷王者，以其善下之也，故能为百谷王。是以圣人之欲上民也，必以其言下之；欲先民也，必以其身后之。故居上而民弗重也，居前而民弗害也。天下乐推而弗厌也。非以其无争与，故天下莫能与争。天下皆谓我大，大而不肖。夫唯不肖。故能大，若肖，久矣其细也夫！我恒有三宝，持而保之。一曰慈，二曰俭，三曰不敢为天下先。夫慈，故能勇；俭，故能广；不敢为天下先，故能为成器长。今舍其慈，且勇；舍其俭，且广；舍其后，且先；则必死矣！夫慈，以战则胜，以守则固。天将建之，如以慈恒之。善为士者不武，善战者不怒，善胜敌者弗与，善用人者为之下。是谓不争之德，是谓用人之力，是谓配天；古之极也。用兵有言曰：“吾不敢为主，而为客；不敢进寸，而退尺。”是谓：行无行，攘无臂，执无兵，扔无敌。祸莫大于轻敌，轻敌几丧吾宝。故抗兵相若，则哀者胜矣。吾言甚易知也，甚易行也。而天下莫之能知也，莫之能行也。言有宗，事有君。夫唯无知也，是以不我知。知我者希，则我贵矣。是以，圣人被褐而怀玉。知不知，尚矣。不知知，病矣。夫唯病病，是以不病。圣人之不病也，以其病病也，是不病。民不畏威，则大威至矣。无狎其所居，无厌其所生。夫唯弗厌，是以不厌。是以，圣人自知而不自见也，自爱而不自贵也。故去彼而取此。勇于敢则杀，勇于不敢则活。此两者，或利或害。天之所恶，孰知其故？天之道，不争而善胜，不言而善应，不召而自来，坦然而善谋。天网恢恢，疏而不失。民不畏死，奈何以死惧之？若使民恒畏死，而为奇者，吾得执而杀之，孰敢？恒有司杀者杀。夫代司杀者杀，是代大匠斲。夫代大匠斲者，则希不伤其手矣。民之饥者，以其上食税之多也，是以饥。民之难治者，以其上之有为也，是以难治。民之轻死者，以其上求生生之厚也，是以轻死。夫唯无以生为者，是贤于贵生也。人之生也柔弱，其死也坚强。草木之生也柔脆，其死也枯槁。故曰：坚强者死之徒也，柔弱者生之徒也。是以兵强则不胜，木强则拱。故坚强处下，柔弱处上。天之道，其犹张弓欤？高者抑之，下者举之，有馀者损之，不足者补之。天之道，损之有馀而补不足；人之道则不然，损不足以奉有馀。孰能有损馀以奉天下？唯有道者。是以圣人为而弗有，成功而弗居也，若此，其不欲见贤也。天下莫柔弱于水，而攻坚强者莫之能先，以其无以易之也。柔之胜刚也，弱之胜强也，天下莫弗知也。而莫之能行也。故圣人之言云：“受国之诟，是谓社稷之主；受国之不祥，是为天下之王。”正言若反。和大怨，必有馀怨，焉可以为善？是以，圣人执左契，而不以责于人。故有德司契，无德司彻。夫天道无亲，恒与善人。小国寡民；使有什伯之器，而不用；使民重死，而不远徙；虽有舟舆，无所乘之；虽有甲兵，无所陈之；使民复结绳，而用之。至治之极民各甘其食，美其服，安其俗，乐其业。邻国相望，鸡犬之声相闻，民至老死，不相往来。信言不美，美言不信。善者不辩，辩者不善。知者不博，博者不知。圣人无积；既以为人，己愈有；既以与人，己愈多。故天之道，利而不害；人之道，为而弗争。';
                console.log('道德经内容已加载，字符数:', chars.length);
            } else {
                // 英文环境：英文字母和编程符号
                chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~';
            }
            const fontSize = 14;
            const columns = canvas.width / fontSize;
            const drops = [];
            const charIndices = []; // 记录每列当前字符的索引位置
            
            for (let i = 0; i < columns; i++) {
                drops[i] = Math.random() * -100;
                // 中文环境下，每列从随机位置开始按顺序显示字符
                if (isChinese) {
                    charIndices[i] = Math.floor(Math.random() * chars.length);
                }
            }
            
            let animationId;
            let isRunning = true;
            const frameDelay = 50; // 每帧延迟50ms，降低流动速度
            
            function draw() {
                if (!isRunning) return;
                
                // 半透明黑色背景，产生拖尾效果
                ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.fillStyle = '#0F0'; // 绿色
                ctx.font = fontSize + 'px monospace';
                
                for (let i = 0; i < drops.length; i++) {
                    let text;
                    if (isChinese) {
                        // 中文环境：按字符集顺序连贯显示
                        text = chars[charIndices[i] % chars.length];
                        charIndices[i]++; // 移动到下一个字符
                    } else {
                        // 英文环境：保持随机选择
                        text = chars[Math.floor(Math.random() * chars.length)];
                    }
                    ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                    
                    if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                        drops[i] = 0;
                        // 重置时也重置字符索引（中文环境）
                        if (isChinese) {
                            charIndices[i] = Math.floor(Math.random() * chars.length);
                        }
                    }
                    drops[i]++;
                }
                
                // 使用setTimeout控制帧率
                setTimeout(() => {
                    animationId = requestAnimationFrame(draw);
                }, frameDelay);
            }
            
            function stopMatrixRain() {
                if (!isRunning) return;
                isRunning = false;
                cancelAnimationFrame(animationId);
                
                // 退出全屏模式 - 先检查是否处于全屏状态
                const exitFullscreen = () => {
                    if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
                        if (document.exitFullscreen) {
                            document.exitFullscreen().catch(err => {
                                console.log('无法退出全屏模式:', err);
                            });
                        } else if (document.webkitExitFullscreen) {
                            document.webkitExitFullscreen();
                        } else if (document.msExitFullscreen) {
                            document.msExitFullscreen();
                        }
                    }
                };
                exitFullscreen();
                
                // 先隐藏canvas，再显示退出提示
                canvas.style.transition = 'opacity 0.5s ease';
                canvas.style.opacity = '0';
                
                setTimeout(() => {
                    canvas.remove();
                    // canvas移除后再显示退出提示，确保可见
                    showToast(i18n.t('toast.exitMatrix'), 'success');
                }, 500);
            }
            
            // 监听键盘事件，按S键退出
            const exitHandler = (e) => {
                if (e.key === 's' || e.key === 'S') {
                    stopMatrixRain();
                    document.removeEventListener('keydown', exitHandler);
                }
            };
            document.addEventListener('keydown', exitHandler);
            
            // 开始动画
            draw();
        }, 100); // 延迟100ms创建canvas
    }
    
    // 2. 诗意加载语
    function showPoeticLoadingText() {
        const welcomeContent = document.querySelector('.welcome-content');
        if (!welcomeContent) return;
        
        // 检查是否已存在诗意文本元素
        let poeticText = document.getElementById('poetic-text');
        if (!poeticText) {
            poeticText = document.createElement('p');
            poeticText.id = 'poetic-text';
            poeticText.className = 'poetic-text';
            poeticText.style.cssText = `
                margin-top: 20px;
                font-size: 14px;
                color: var(--text-secondary);
                font-style: italic;
                opacity: 0.8;
                transition: opacity 0.5s ease;
            `;
            welcomeContent.appendChild(poeticText);
        }
        
        // 随机选择一句（从1到14）
        const quoteNumber = Math.floor(Math.random() * 14) + 1;
        const randomQuote = i18n.t(`poetic.quote.${quoteNumber}`);
        
        // 根据语言环境添加不同的引号
        if (i18n.isChinese()) {
            poeticText.textContent = '「' + randomQuote + '」';
        } else {
            poeticText.textContent = '"' + randomQuote + '"';
        }
    }
    

    
    // 4. 字数成就系统
    function getAchievements() {
        return {
            novice: { name: i18n.t('achievement.novice.name'), threshold: 10000, icon: '📖', description: i18n.t('achievement.novice.desc') },
            scholar: { name: i18n.t('achievement.scholar.name'), threshold: 100000, icon: '📚', description: i18n.t('achievement.scholar.desc') },
            persistent: { name: i18n.t('achievement.persistent.name'), threshold: 7, icon: '🔥', description: i18n.t('achievement.persistent.desc'), type: 'streak' }
        };
    }
    
    function loadEasterEggData() {
        const saved = localStorage.getItem('easterEggData');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                state.easterEggs.totalWordsRead = data.totalWordsRead || 0;
                state.easterEggs.readingStreak = data.readingStreak || 0;
                state.easterEggs.lastReadDate = data.lastReadDate || null;
                state.easterEggs.badges = data.badges || [];
            } catch (e) {
                console.warn('Failed to load easter egg data:', e);
            }
        }
    }
    
    function saveEasterEggData() {
        try {
            localStorage.setItem('easterEggData', JSON.stringify({
                totalWordsRead: state.easterEggs.totalWordsRead,
                readingStreak: state.easterEggs.readingStreak,
                lastReadDate: state.easterEggs.lastReadDate,
                badges: state.easterEggs.badges
            }));
        } catch (e) {
            console.warn('Failed to save easter egg data:', e);
        }
    }
    
    function updateReadingStats(wordCount) {
        // 更新总阅读字数
        state.easterEggs.totalWordsRead += wordCount;
        
        // 更新连续阅读天数
        const today = new Date().toDateString();
        const lastDate = state.easterEggs.lastReadDate;
        
        if (lastDate) {
            const last = new Date(lastDate);
            const now = new Date();
            const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                // 连续阅读
                state.easterEggs.readingStreak++;
            } else if (diffDays > 1) {
                // 断开了，重新计算
                state.easterEggs.readingStreak = 1;
            }
            // diffDays === 0 表示今天已经读过，不增加
        } else {
            state.easterEggs.readingStreak = 1;
        }
        
        state.easterEggs.lastReadDate = today;
        
        // 检查成就
        checkAchievements();
        
        // 保存数据
        saveEasterEggData();
    }
    
    function checkAchievements() {
        const achievements = getAchievements();
        const { totalWordsRead, readingStreak, badges } = state.easterEggs;
        
        // 检查字数成就
        if (totalWordsRead >= achievements.scholar.threshold && !badges.includes('scholar')) {
            unlockAchievement('scholar');
        } else if (totalWordsRead >= achievements.novice.threshold && !badges.includes('novice')) {
            unlockAchievement('novice');
        }
        
        // 检查连续阅读成就
        if (readingStreak >= achievements.persistent.threshold && !badges.includes('persistent')) {
            unlockAchievement('persistent');
        }
    }
    
    function unlockAchievement(achievementId) {
        const achievements = getAchievements();
        const achievement = achievements[achievementId];
        if (!achievement) return;
        
        // 添加到已解锁徽章列表
        if (!state.easterEggs.badges.includes(achievementId)) {
            state.easterEggs.badges.push(achievementId);
            
            // 显示成就解锁通知
            showAchievementNotification(achievement);
            
            // 保存数据
            saveEasterEggData();
        }
    }
    
    function showAchievementNotification(achievement) {
        // 创建成就通知元素
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: -400px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
            z-index: 10001;
            max-width: 350px;
            transition: right 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 36px;">${achievement.icon}</div>
                <div style="flex: 1;">
                    <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">${i18n.t('toast.achievementUnlock')}</div>
                    <div style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">${achievement.name}</div>
                    <div style="font-size: 13px; opacity: 0.85;">${achievement.description}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 滑入动画
        requestAnimationFrame(() => {
            notification.style.right = '20px';
        });
        
        // 4秒后滑出并移除
        setTimeout(() => {
            notification.style.right = '-400px';
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 4000);
    }
    
    // ========================================
    // Initialize Application on DOM Ready
    // ========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();