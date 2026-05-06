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
        progressBar: document.getElementById('progressBar'),
        progressFill: document.getElementById('progressFill'),
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
        const validTypes = ['.md', '.txt'];
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
            const content = e.target.result;
            state.currentFile = file;
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
                renderContent(content);
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
        elements.progressFill.style.width = '0%';
        
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
        
        elements.progressFill.style.width = Math.min(progress, 100) + '%';
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
            renderContent(savedContent);
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
            const plainText = getPlainTextFromMarkdown(state.content);
            
            // 创建Blob并下载
            const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const fileName = (state.currentFile.name || 'document').replace(/\.(md|txt)$/, '') + '.txt';
            
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
            const fileName = (state.currentFile.name || 'document').replace(/\.(md|txt)$/, '') + '.md';
            
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
                    .progress-bar, .toast {
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
            const fileName = (state.currentFile.name || 'document').replace(/\.(md|txt)$/, '');
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
    function triggerMatrixRain() {
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
        setTimeout(() => {
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
                // 中文环境：道德经内容
                chars = '道可非常名无天地之始有万物母欲以观其妙徼此两者同出异谓玄又众门根源善若水利争处恶几于居善地心渊与仁言信政治事能动时夫唯不故尤持盈满自遗咎功遂身退天之道载金玉堂莫守富贵骄孽四甚爱必大费藏厚亡知足辱止殆久视生之畜是谓玄德三十辐共一毂当无有车用埏埴为器户牖室五色令盲音聋味口爽驰骋畋猎心发狂难得货行妨圣为腹目故彼取此去去举泰氏成其私以身后先外存非无私耶邻父弃智民利百倍绝仁复孝慈圣无为而治见素抱朴少私寡欲绝学无忧唯与诃相几何善美信皆吹强羸载隳挫解纷和光尘湛兮存湛似或宗锐挫之纷解之和其光同其尘湛兮似或存吾不知谁之子象帝之先';
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
                
                // 退出全屏模式
                if (document.exitFullscreen) {
                    document.exitFullscreen().catch(err => {
                        console.log('无法退出全屏模式:', err);
                    });
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
                
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
    const POETIC_QUOTES = [
        '文字是思想的翅膀',
        '在空白处遇见灵感',
        '阅读是与智者对话',
        '每一页都是新的旅程',
        '墨香深处有乾坤',
        '静心阅读，遇见更好的自己',
        '书中自有黄金屋',
        '读万卷书，行万里路',
        '文字如茶，细品回甘',
        '在书海中寻找心灵的港湾',
        '阅读让时光变得温柔',
        '每一行代码都是诗',
        '文档之间，自有天地',
        '墨笈之中，藏着世界'
    ];
    
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
        
        // 随机选择一句
        const randomQuote = POETIC_QUOTES[Math.floor(Math.random() * POETIC_QUOTES.length)];
        poeticText.textContent = '「' + randomQuote + '」';
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