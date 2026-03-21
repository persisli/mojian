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
        homeBtn: document.getElementById('homeBtn'),
        exportBtn: document.getElementById('exportBtn'),
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
            width: 720,
            fontFamily: 'Noto Sans SC, Source Han Sans CN, sans-serif',
            fontSize: 18,
            lineHeight: 1.9,
            background: '#FAFAF8',
            backgroundType: 'solid',
            backgroundPattern: null,
            backgroundCSS: null
        }
    };

    // ========================================
    // Initialize Application
    // ========================================
    function init() {
        // Initialize Lucide icons
        lucide.createIcons();
        
        // Load saved settings
        loadSettings();
        
        // Load saved theme preference
        loadThemePreference();
        
        // Apply saved settings
        applySettings();
        
        // Configure marked.js
        configureMarked();
        
        // Bind event listeners
        bindEvents();
        
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
    }

    // Background pattern definitions
    const backgroundPatterns = {
        // Artistic patterns
        artistic: {
            dots: "radial-gradient(circle, #ccc 1px, transparent 1px)",
            lines: "repeating-linear-gradient(0deg, transparent, transparent 27px, #e0e0e0 28px)",
            grid: "linear-gradient(#e0e0e0 1px, transparent 1px), linear-gradient(90deg, #e0e0e0 1px, transparent 1px)",
            diamond: "linear-gradient(45deg, #e8e8e8 25%, transparent 25%), linear-gradient(-45deg, #e8e8e8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e8e8e8 75%), linear-gradient(-45deg, transparent 75%, #e8e8e8 75%)"
        },
        // Chinese style patterns
        chinese: {
            cloud: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyMCIgZmlsbD0iI2M0YzRiMCIgb3BhY2l0eT0iMC4zIi8+PHBhdGggZD0iTTMwIDI1YzcuMDggMCAxMy01LjcyIDEzLTEzbC0xMyAwIDEzIDV6Ii8+PC9zdmc+')",
            wave: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48cGF0aCBkPSJNMzAgMzBjNy4wOCAwIDEzLTUuNzIgMTMtMTMgMEM0My4wOCA3LjIgMzcuMzYgMCAzMCAwIDIyLjY0IDAgMTcuODIgNy4yIDEwIDEzcTEzIDcuMDggMTMgMTMgMy43MiA3LjA4IDIgMTMgMS43MiAzMyAweiIvPjxwYXRoIGQ9Ik0zMCA1MGM3LjA4IDAgMTMtNS43MiAxMy0xMyBMMzAgMjggMTcgNDF6Ii8+PC9zdmc+')",
            bamboo: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDQwIDYwIj48cmVjdCBmaWxsPSIjOTBjNjk1IiBvcGFjaXR5PSIwLjIiIHdpZHRoPSI0MCIgaGVpZ2h0PSI2MCIvPjxyZWN0IGZpbGw9IiM3OGE4N2QiIG9wYWNpdHk9IjAuNCIgeD0iNSIgeT0iMCIgd2lkdGg9IjMwIiBoZWlnaHQ9IjgiIHJ4PSI0Ii8+PHJlY3QgZmlsbD0iIzc4YTg3ZCIgb3BhY2l0eT0iMC40IiB4PSI1IiB5PSIxNSIgd2lkdGg9IjMwIiBoZWlnaHQ9IjgiIHJ4PSI0Ii8+PHJlY3QgZmlsbD0iIzc4YTg3ZCIgb3BhY2l0eT0iMC40IiB4PSI1IiB5PSIzMCIgd2lkdGg9IjMwIiBoZWlnaHQ9IjgiIHJ4PSI0Ii8+PHJlY3QgZmlsbD0iIzc4YTg3ZCIgb3BhY2l0eT0iMC40IiB4PSI1IiB5PSI0NSIgd2lkdGg9IjMwIiBoZWlnaHQ9IjgiIHJ4PSI0Ii8+PC9zdmc+')",
            fish: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4Ij48cGF0aCBkPSJNMCA0OEMxMiA1NiAzNiA1NiA0OCAzMmMtMTIgLTEyIC0zNiAtMTIgLTQ4IDB6bTQ4LTI0QzM2IDEyIDEyIDEyIDAgMjQsMTIgNDAgMzYgNDAgNDggMzJ6IiBmaWxsPSIjYTBjNGU4IiBvcGFjaXR5PSIwLjQiLz48L3N2Zz4=')"
        },
        // Stationery patterns
        stationery: {
            notebook: "linear-gradient(#f0f0f0 1px, transparent 1px)",
            cornell: "linear-gradient(#e8e8e8 1px, transparent 1px), linear-gradient(90deg, #e8e8e8 1px, transparent 1px)",
            legal: "linear-gradient(90deg, transparent 39px, #e74c3c 39px, #e74c3c 41px, transparent 41px), linear-gradient(#f0f0f0 1px, transparent 1px)",
            graph: "linear-gradient(#c8d6e5 1px, transparent 1px), linear-gradient(#c8d6e5 1px, transparent 1px)"
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
        
        // Apply to body (webpage background)
        if (state.settings.backgroundType === 'solid') {
            document.body.style.backgroundColor = state.settings.background;
            document.body.style.backgroundImage = 'none';
            document.documentElement.style.setProperty('--bg-page', state.settings.background);
        } else {
            if (pattern) {
                document.body.style.backgroundColor = baseColor;
                document.body.style.backgroundImage = pattern;
                document.documentElement.style.setProperty('--bg-page', baseColor);
                document.documentElement.style.setProperty('--bg-pattern', pattern);
            }
        }
        
        // Apply to markdown content area
        if (state.settings.backgroundType === 'solid') {
            elements.markdownContent.style.backgroundColor = state.settings.background;
            elements.markdownContent.style.backgroundImage = 'none';
            document.documentElement.style.setProperty('--bg-content', state.settings.background);
        } else {
            if (pattern) {
                elements.markdownContent.style.backgroundColor = baseColor;
                elements.markdownContent.style.backgroundImage = pattern;
                document.documentElement.style.setProperty('--bg-content', baseColor);
                document.documentElement.style.setProperty('--bg-pattern', pattern);
            }
        }
        
        // Apply to blockquotes
        const blockquotes = elements.markdownContent.querySelectorAll('blockquote');
        blockquotes.forEach(bq => {
            bq.style.backgroundColor = blockquoteBg;
            bq.style.backgroundImage = 'none';
        });
        
        // Apply to code blocks (pre elements)
        const preBlocks = elements.markdownContent.querySelectorAll('pre');
        preBlocks.forEach(pre => {
            pre.style.backgroundColor = codeBg;
            pre.style.backgroundImage = 'none';
        });
        
        // Apply to inline code
        const inlineCodes = elements.markdownContent.querySelectorAll('code:not(pre code)');
        inlineCodes.forEach(code => {
            code.style.backgroundColor = adjustColor(baseColor, -15);
        });
        
        // Apply to tables
        const tables = elements.markdownContent.querySelectorAll('table');
        tables.forEach(table => {
            table.style.backgroundColor = baseColor;
            table.style.backgroundImage = 'none';
        });
        
        // Apply to table headers (thead and th)
        const tableHeaders = elements.markdownContent.querySelectorAll('thead, th');
        tableHeaders.forEach(th => {
            th.style.backgroundColor = tableHeaderBg;
            th.style.backgroundImage = 'none';
        });
        
        // Apply to header
        if (state.settings.backgroundType === 'solid') {
            elements.header.style.backgroundColor = state.settings.background;
            elements.header.style.backgroundImage = 'none';
        } else {
            const pattern = backgroundPatterns[state.settings.backgroundType]?.[state.settings.backgroundPattern];
            if (pattern) {
                elements.header.style.backgroundColor = defaultBackgroundColors[state.settings.backgroundType];
                elements.header.style.backgroundImage = pattern;
            }
        }
        
        // Apply to status bar
        if (state.settings.backgroundType === 'solid') {
            elements.statusBar.style.backgroundColor = state.settings.background;
            elements.statusBar.style.backgroundImage = 'none';
        } else {
            const pattern = backgroundPatterns[state.settings.backgroundType]?.[state.settings.backgroundPattern];
            if (pattern) {
                elements.statusBar.style.backgroundColor = defaultBackgroundColors[state.settings.backgroundType];
                elements.statusBar.style.backgroundImage = pattern;
            }
        }
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
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme) {
            state.isDarkMode = savedTheme === 'dark';
        } else {
            state.isDarkMode = prefersDark;
        }
        
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
            
            document.body.style.backgroundColor = darkBg;
            document.body.style.backgroundImage = 'none';
            elements.markdownContent.style.backgroundColor = darkBg;
            elements.markdownContent.style.backgroundImage = 'none';
            elements.header.style.backgroundColor = darkBg;
            elements.header.style.backgroundImage = 'none';
            elements.statusBar.style.backgroundColor = darkBg;
            elements.statusBar.style.backgroundImage = 'none';
            document.documentElement.style.setProperty('--bg-page', darkBg);
            document.documentElement.style.setProperty('--bg-content', darkBg);
            document.documentElement.style.setProperty('--bg-pattern', 'none');
            
            // Apply to blockquotes in dark mode
            const blockquotes = elements.markdownContent.querySelectorAll('blockquote');
            blockquotes.forEach(bq => {
                bq.style.backgroundColor = darkerBg;
                bq.style.backgroundImage = 'none';
            });
            
            // Apply to code blocks in dark mode
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
            
            // Apply to tables in dark mode
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
        // Home button
        elements.homeBtn.addEventListener('click', () => {
            state.currentFile = null;
            state.content = '';
            clearSavedContent();
            showWelcomeMode();
            // Close TOC when returning to home
            elements.floatingToc.classList.remove('visible');
        });
        
        // Export button - show confirm modal
        elements.exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!state.currentFile) {
                showToast('请先加载文档', 'error');
                return;
            }
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
            showToast('仅支持 .md 和 .txt 格式的文件', 'error');
            return;
        }
        
        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            showToast('文件大小不能超过 10MB', 'error');
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
            
            showToast('文件加载成功');
        };
        
        reader.onerror = function() {
            showToast('文件读取失败，请重试', 'error');
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
        
        // Update UI
        elements.wordCount.textContent = formatNumber(state.wordCount) + ' 字';
        elements.readingTime.textContent = state.readingTime + ' 分钟';
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
        elements.wordCount.textContent = '0 字';
        elements.readingTime.textContent = '0 分钟';
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
            showToast('已复制到剪贴板');
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
            showToast('已复制到剪贴板');
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
    // Export Functions - PDF Only
    // ========================================
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
            showToast('请先加载文档', 'error');
            return;
        }

        showExportModal();
        updateExportProgress(10, '正在准备文档...');
        
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
            
            updateExportProgress(50, '正在生成 PDF...');
            
            // Use browser's print to PDF
            const originalTitle = document.title;
            const fileName = (state.currentFile.name || 'document').replace(/\.(md|txt)$/, '');
            document.title = fileName;
            
            await new Promise(resolve => setTimeout(resolve, 200));
            
            updateExportProgress(80, '正在调用打印机...');
            
            window.print();
            
            // Cleanup
            document.title = originalTitle;
            document.getElementById('print-styles')?.remove();
            
            updateExportProgress(100, '导出完成！');
            await new Promise(resolve => setTimeout(resolve, 500));
            hideExportModal();
            showToast('PDF 导出成功（请在打印对话框中选择"另存为 PDF"）');
            
        } catch (error) {
            console.error('PDF export error:', error);
            hideExportModal();
            showToast('PDF 导出失败：' + error.message, 'error');
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
        
        setTimeout(() => {
            elements.toast.classList.remove('show');
        }, 3000);
    }

    // ========================================
    // Initialize
    // ========================================
    document.addEventListener('DOMContentLoaded', init);
})();
