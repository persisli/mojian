/**
 * core/state.js - 全局状态对象 + DOM elements 引用
 */
window.Mojian = window.Mojian || {};

Mojian.elements = {
    header: document.getElementById('header'),
    fileInfo: document.getElementById('fileInfo'),
    fileName: document.getElementById('fileName'),
    fileNameInput: document.getElementById('fileNameInput'),
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
    imageToggle: document.getElementById('imageToggle'),
    imageToggleLabel: document.getElementById('imageToggleLabel'),
    settingsToggle: document.getElementById('settingsToggle'),
    settingsSidebar: document.getElementById('settingsSidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    sidebarClose: document.getElementById('sidebarClose'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    welcomeContent: document.querySelector('.welcome-content'),
    readingArea: document.getElementById('readingArea'),
    markdownContent: document.getElementById('markdownContent'),
    editorContainer: document.getElementById('editorContainer'),
    editorContent: document.getElementById('editorContent'),
    editToolbar: document.getElementById('editToolbar'),
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
    fontSelect: document.querySelector('#fontSelect .custom-select-trigger'),
    fontSizeValue: document.getElementById('fontSizeValue'),
    fontSizeUp: document.getElementById('fontSizeUp'),
    fontSizeDown: document.getElementById('fontSizeDown'),
    lineHeightSlider: document.getElementById('lineHeightSlider'),
    lineHeightValue: document.getElementById('lineHeightValue'),
    paragraphSpacingSlider: document.getElementById('paragraphSpacingSlider'),
    paragraphSpacingValue: document.getElementById('paragraphSpacingValue'),
    paragraphIndentSlider: document.getElementById('paragraphIndentSlider'),
    paragraphIndentValue: document.getElementById('paragraphIndentValue'),
    bgOpacitySlider: document.getElementById('bgOpacitySlider'),
    bgOpacityValue: document.getElementById('bgOpacityValue'),
    bgTabs: document.querySelectorAll('.bg-tab'),
    bgPanels: document.querySelectorAll('.bg-panel'),
    bgOptions: document.querySelectorAll('.bg-option')
};

Mojian.state = {
    currentFile: null,
    content: '',
    wordCount: 0,
    readingTime: 0,
    isDarkMode: false,
    isEditMode: false,
    editor: null,
    // 当前文档的来源站点（hostname）：用于按站点分别记忆段前缩进 / 图片显示
    currentHost: '',
    settings: {
        width: 1200,
        fontFamily: 'Noto Sans SC, Source Han Sans CN, sans-serif',
        fontSize: 18,
        lineHeight: 1.9,
        paragraphSpacing: 1.9,
        paragraphIndent: 2,
        showImages: true,
        background: '#FAFAF8',
        backgroundType: 'solid',
        backgroundPattern: null,
        backgroundCSS: null,
        bgOpacity: 25,
        statusBarItems: {
            time: false,
            wordCount: false,
            progress: false
        }
    },
    easterEggs: {
        konamiCode: [],
        totalWordsRead: 0,
        readingStreak: 0,
        lastReadDate: null,
        badges: []
    }
};

// Global flags for memory management
Mojian.iconsInitialized = false;
Mojian.scrollRAF = null;
Mojian.resizeTimer = null;
Mojian.markedConfigured = false;
Mojian.matrixRainState = { isRunning: false, animationId: null, exitHandler: null };
Mojian.autoSaveTimer = null;
Mojian.easterEggsInitialized = false;
Mojian.scrollRAFScheduled = false;
Mojian.imageResizeState = {
    isResizing: false,
    currentImage: null,
    originalImg: null,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    aspectRatio: 1,
    resizeEdge: null
};
