/**
 * reader/background.js - 背景管理 (纯色/文艺/国风/信笺 + 透明度) + 主题管理
 */

const backgroundPatterns = {
    artistic: {
        hexagon: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxOCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iLTkgLTEwIDE4IDIwIj48cGF0aCBkPSJNMCAtMTBMOC42NiAtNUw4LjY2IDVMMCAxMEwtOC42NiA1TC04LjY2IC01WiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIvPjxjaXJjbGUgY3g9IjAiIGN5PSItMTAiIHI9IjEuNSIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjguNjYiIGN5PSItNSIgcj0iMS41IiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iOC42NiIgY3k9IjUiIHI9IjEuNSIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjAiIGN5PSIxMCIgcj0iMS41IiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iLTguNjYiIGN5PSI1IiByPSIxLjUiIGZpbGw9IiNkMGQwZDAiLz48Y2lyY2xlIGN4PSItOC42NiIgY3k9Ii01IiByPSIxLjUiIGZpbGw9IiNkMGQwZDAiLz48L3N2Zz4=')",
        triangle: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIzNSIgdmlld0JveD0iMCAwIDIwIDM1Ij48cGF0aCBkPSJNMTAgMEwyMCAxNy4zMkwwIDE3LjMyWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIvPjxwYXRoIGQ9Ik0wIDE3LjMyTDIwIDE3LjMyTDEwIDM0LjY0WiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIvPjxjaXJjbGUgY3g9IjEwIiBjeT0iMCIgcj0iMS41IiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iMjAiIGN5PSIxNy4zMiIgcj0iMS41IiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iMCIgY3k9IjE3LjMyIiByPSIxLjUiIGZpbGw9IiNkMGQwZDAiLz48Y2lyY2xlIGN4PSIxMCIgY3k9IjM0LjY0IiByPSIxLjUiIGZpbGw9IiNkMGQwZDAiLz48L3N2Zz4=')",
        diamond: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDgwIDgwIj48cGF0aCBkPSJNNDAgMEw4MCA0MEw0MCA4MEwwIDQwWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIvPjxjaXJjbGUgY3g9IjQwIiBjeT0iMCIgcj0iMiIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iNDAiIHI9IjIiIGZpbGw9IiNkMGQwZDAiLz48Y2lyY2xlIGN4PSI0MCIgY3k9IjgwIiByPSIyIiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iMCIgY3k9IjQwIiByPSIyIiBmaWxsPSIjZDBkMGQwIi8+PC9zdmc+')",
        nodes: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDgwIDgwIj48bGluZSB4MT0iMCIgeTE9IjAiIHgyPSI4MCIgeTI9IjgwIiBzdHJva2U9IiNkMGQwZDAiIHN0cm9rZS13aWR0aD0iMC44Ii8+PGxpbmUgeDE9IjgwIiB5MT0iMCIgeDI9IjAiIHkyPSI4MCIgc3Ryb2tlPSIjZDBkMGQwIiBzdHJva2Utd2lkdGg9IjAuOCIvPjxsaW5lIHgxPSI0MCIgeTE9IjAiIHgyPSI0MCIgeTI9IjgwIiBzdHJva2U9IiNkMGQwZDAiIHN0cm9rZS13aWR0aD0iMC44Ii8+PGxpbmUgeDE9IjAiIHkxPSI0MCIgeDI9IjgwIiB5Mj0iNDAiIHN0cm9rZT0iI2QwZDBkMCIgc3Ryb2tlLXdpZHRoPSIwLjgiLz48Y2lyY2xlIGN4PSIwIiBjeT0iMCIgcj0iMyIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iMCIgcj0iMyIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjAiIGN5PSI4MCIgcj0iMyIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iODAiIHI9IjMiIGZpbGw9IiNkMGQwZDAiLz48Y2lyY2xlIGN4PSI0MCIgY3k9IjQwIiByPSIzIiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iNDAiIGN5PSIwIiByPSIyIiBmaWxsPSIjZDBkMGQwIi8+PGNpcmNsZSBjeD0iNDAiIGN5PSI4MCIgcj0iMiIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjAiIGN5PSI0MCIgcj0iMiIgZmlsbD0iI2QwZDBkMCIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iNDAiIHI9IjIiIGZpbGw9IiNkMGQwZDAiLz48L3N2Zz4=')"
    },
    // 国风：四幅整幅画面（不重复平铺），元素组合取自 bg_refer/ 参考图，风格内部自洽
    //   绢荷 / 雾竹 / 云山 / 祥云洒金
    // 注意：该 url 由消费 --bg-pattern 的 styles/base.css 解析，故 ../ 先回到项目根再进 assets/
    chinese: {
        'silk-lotus': "url('../assets/bg/silk-lotus.svg')",
        'mist-bamboo': "url('../assets/bg/mist-bamboo.svg')",
        'cloud-mountains': "url('../assets/bg/cloud-mountains.svg')",
        'auspicious-gold': "url('../assets/bg/auspicious-gold.svg')"
    },
    // 信笺：四幅整幅画面 —— 鹤影青绿 / 桂花旧纸 / 回纹朱日 / 水彩荷塘
    stationery: {
        'crane-hills': "url('../assets/bg/crane-hills.svg')",
        'osmanthus-kraft': "url('../assets/bg/osmanthus-kraft.svg')",
        'meander-sun': "url('../assets/bg/meander-sun.svg')",
        'watercolor-pond': "url('../assets/bg/watercolor-pond.svg')"
    }
};

const defaultBackgroundColors = {
    solid: '#FAFAF8',
    artistic: '#FAFAF8',
    chinese: '#F5F5DC',
    stationery: '#FFFFFF'
};

// 每幅国风 / 信笺背景的主色（取自画面主视觉色）与配套纸底。
// 用于让标题栏 / 状态栏等界面元素"从背景取色"，不再一成不变。
const patternThemes = {
    // 国风
    'silk-lotus':      { paper: '#F2F6F5', accent: '#7FA8A0', line: '#C4D4CF' },  // 绢荷
    'mist-bamboo':     { paper: '#F4F5F4', accent: '#7E939C', line: '#C6CFD4' },  // 雾竹
    'cloud-mountains': { paper: '#F1F2F1', accent: '#7E8A8A', line: '#C9D1D0' },  // 云山
    'auspicious-gold': { paper: '#F8F5EC', accent: '#A8874A', line: '#D9CDAF' },  // 祥云洒金
    // 信笺
    'crane-hills':     { paper: '#F2F8F7', accent: '#5E9490', line: '#C4DAD6' },  // 鹤影青绿
    'osmanthus-kraft': { paper: '#EFE8D5', accent: '#9A8654', line: '#D6C9A6' },  // 桂花旧纸
    'meander-sun':     { paper: '#F1ECDE', accent: '#A8745B', line: '#DCCDB4' },  // 回纹朱日
    'watercolor-pond': { paper: '#F3F5E9', accent: '#7A9E7E', line: '#C9D8BE' }   // 水彩荷塘
};

function applyBackground() {
    const { elements, state } = window.Mojian;
    const type = state.settings.backgroundType;
    const patternName = state.settings.backgroundPattern;
    const theme = (type === 'chinese' || type === 'stationery') ? patternThemes[patternName] : null;
    const baseColor = type === 'solid'
        ? state.settings.background
        : (theme ? theme.paper : defaultBackgroundColors[type]);
    const pattern = state.settings.backgroundType !== 'solid'
        ? backgroundPatterns[state.settings.backgroundType]?.[state.settings.backgroundPattern]
        : null;

    const opacity = state.settings.bgOpacity / 100;

    const hexToRgba = (hex, alpha) => {
        const h = hex.replace('#', '');
        const r = parseInt(h.substr(0, 2), 16);
        const g = parseInt(h.substr(2, 2), 16);
        const b = parseInt(h.substr(4, 2), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const blendColors = (foreground, background, opacity) => {
        const fg = foreground.replace('#', '');
        const bg = background.replace('#', '');
        const fgR = parseInt(fg.substr(0, 2), 16);
        const fgG = parseInt(fg.substr(2, 2), 16);
        const fgB = parseInt(fg.substr(4, 2), 16);
        const bgR = parseInt(bg.substr(0, 2), 16);
        const bgG = parseInt(bg.substr(2, 2), 16);
        const bgB = parseInt(bg.substr(4, 2), 16);
        const r = Math.round(fgR * opacity + bgR * (1 - opacity));
        const g = Math.round(fgG * opacity + bgG * (1 - opacity));
        const b = Math.round(fgB * opacity + bgB * (1 - opacity));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    const adjustColor = (color, amount) => {
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    const blockquoteBg = adjustColor(baseColor, -8);
    const codeBg = adjustColor(baseColor, -12);
    const tableHeaderBg = adjustColor(baseColor, -5);

    const bgColorWithOpacity = hexToRgba(baseColor, opacity);
    const blockquoteBgWithOpacity = hexToRgba(blockquoteBg, opacity);
    const codeBgWithOpacity = hexToRgba(codeBg, opacity);
    const tableHeaderBgWithOpacity = hexToRgba(tableHeaderBg, opacity);

    document.body.style.backgroundColor = bgColorWithOpacity;
    document.documentElement.style.setProperty('--bg-page', bgColorWithOpacity);
    document.documentElement.style.setProperty('--bg-page-solid', baseColor);
    document.documentElement.style.setProperty('--bg-pattern-opacity', opacity);

    if (state.settings.backgroundType === 'solid' || !pattern) {
        document.documentElement.style.setProperty('--bg-pattern', 'none');
        document.documentElement.style.setProperty('--bg-pattern-size', 'auto');
        document.documentElement.style.setProperty('--bg-pattern-repeat', 'repeat');
        document.documentElement.style.setProperty('--bg-pattern-position', 'center');
    } else {
        document.documentElement.style.setProperty('--bg-pattern', pattern);
        if (state.settings.backgroundType === 'artistic') {
            // 文艺：小尺寸几何纹样，按 SVG 内在尺寸平铺
            document.documentElement.style.setProperty('--bg-pattern-size', 'auto');
            document.documentElement.style.setProperty('--bg-pattern-repeat', 'repeat');
            document.documentElement.style.setProperty('--bg-pattern-position', 'center');
        } else {
            // 国风 / 信笺：整幅画面，铺满不平铺
            document.documentElement.style.setProperty('--bg-pattern-size', 'cover');
            document.documentElement.style.setProperty('--bg-pattern-repeat', 'no-repeat');
            document.documentElement.style.setProperty('--bg-pattern-position', 'center');
        }
    }

    elements.markdownContent.style.backgroundColor = 'transparent';
    elements.markdownContent.style.backgroundImage = 'none';
    document.documentElement.style.setProperty('--bg-content', 'transparent');

    if (state.settings.backgroundType === 'solid') {
        const welcomeContent = document.querySelector('.welcome-content');
        if (welcomeContent) {
            welcomeContent.style.backgroundColor = bgColorWithOpacity;
        }
    } else {
        const welcomeContent = document.querySelector('.welcome-content');
        if (welcomeContent) {
            welcomeContent.style.backgroundColor = '';
        }
    }

    const blockquotes = elements.markdownContent.querySelectorAll('blockquote');
    blockquotes.forEach(bq => {
        bq.style.backgroundColor = blockquoteBgWithOpacity;
        bq.style.backgroundImage = 'none';
    });

    const preBlocks = elements.markdownContent.querySelectorAll('pre');
    preBlocks.forEach(pre => {
        pre.style.backgroundColor = codeBgWithOpacity;
        pre.style.backgroundImage = 'none';
    });

    const inlineCodes = elements.markdownContent.querySelectorAll('code:not(pre code)');
    inlineCodes.forEach(code => {
        code.style.backgroundColor = hexToRgba(adjustColor(baseColor, -15), opacity);
    });

    const tables = elements.markdownContent.querySelectorAll('table');
    tables.forEach(table => {
        if (state.settings.backgroundType === 'solid' && baseColor.toUpperCase() === '#FAFAF8') {
            table.style.backgroundColor = 'rgb(251, 251, 251)';
        } else {
            table.style.backgroundColor = bgColorWithOpacity;
        }
        table.style.backgroundImage = 'none';
    });

    const tableHeaders = elements.markdownContent.querySelectorAll('thead, th');
    tableHeaders.forEach(th => {
        th.style.backgroundColor = tableHeaderBgWithOpacity;
        th.style.backgroundImage = 'none';
    });

    const themeBgColor = state.isDarkMode ? '#1A1A2E' : '#FAFAF8';
    const blendedHeaderBg = blendColors(baseColor, themeBgColor, opacity);
    elements.header.style.backgroundColor = blendedHeaderBg;
    elements.header.style.backgroundImage = 'none';

    const blendedStatusBg = blendColors(baseColor, themeBgColor, opacity);
    elements.statusBar.style.backgroundColor = blendedStatusBg;
    elements.statusBar.style.backgroundImage = 'none';

    const blendedToolbarBg = blendColors(baseColor, themeBgColor, opacity);
    if (elements.editToolbar) {
        elements.editToolbar.style.backgroundColor = blendedToolbarBg;
    }

    // 标题栏 / 状态栏从当前背景"取主色"：边框线、Logo、图标强调色随画面主色变化
    const root = document.documentElement;
    const accent = theme ? theme.accent : null;
    const line = theme ? theme.line : null;
    root.style.setProperty('--pattern-accent', accent || '');
    root.style.setProperty('--pattern-line', line || '');
    root.style.setProperty('--pattern-paper', theme ? theme.paper : '');

    // 给 body 打上"取自背景主色"标记，CSS 用它切换标题栏 / 状态栏着色方案
    document.body.classList.toggle('has-pattern-theme', !!accent);
    // 深色模式由 applyTheme 单独复位该标记
    if (state.isDarkMode) {
        document.body.classList.remove('has-pattern-theme');
    }
}

function updateBackgroundSelection() {
    const { elements, state } = window.Mojian;
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

function updateBackgroundUIState() {
    const { elements, state } = window.Mojian;
    const isDisabled = state.isDarkMode;
    elements.bgTabs.forEach(tab => {
        tab.disabled = isDisabled;
        tab.style.pointerEvents = isDisabled ? 'none' : 'auto';
        tab.style.opacity = isDisabled ? '0.5' : '1';
    });
    elements.bgOptions.forEach(option => {
        option.style.pointerEvents = isDisabled ? 'none' : 'auto';
        option.style.opacity = isDisabled ? '0.5' : '1';
    });
    elements.bgOpacitySlider.disabled = isDisabled;
    elements.bgOpacitySlider.style.pointerEvents = isDisabled ? 'none' : 'auto';
    elements.bgOpacitySlider.style.opacity = isDisabled ? '0.5' : '1';
}

function loadThemePreference() {
    applyTheme();
}

function toggleTheme() {
    const { state } = window.Mojian;
    state.isDarkMode = !state.isDarkMode;
    localStorage.setItem('theme', state.isDarkMode ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', state.isDarkMode ? 'dark' : 'light');
    if (state.isDarkMode) {
        window.Mojian.applyTheme();
    } else {
        window.Mojian.applyBackground();
    }
    // Mermaid 图按新主题重画（暗色/亮色的图内配色不同）
    if (window.Mojian.refreshMermaidTheme) {
        window.Mojian.refreshMermaidTheme();
    }
}

function applyTheme() {
    const { elements, state } = window.Mojian;
    document.documentElement.setAttribute('data-theme', state.isDarkMode ? 'dark' : 'light');

    if (state.isDarkMode) {
        const darkBg = '#0a0e1a';
        const darkerBg = '#0d0d1a';
        const tableHeaderBg = '#1a1a2e';

        // 深色模式不走"背景取色"：摘掉标记并复位主题变量
        document.body.classList.remove('has-pattern-theme');
        document.documentElement.style.setProperty('--pattern-accent', '');
        document.documentElement.style.setProperty('--pattern-line', '');
        document.documentElement.style.setProperty('--pattern-paper', '');

        document.body.style.backgroundColor = darkBg;
        elements.markdownContent.style.backgroundColor = 'transparent';
        elements.markdownContent.style.backgroundImage = 'none';
        elements.header.style.backgroundColor = darkBg;
        elements.header.style.backgroundImage = 'none';
        elements.statusBar.style.backgroundColor = darkBg;
        elements.statusBar.style.backgroundImage = 'none';
        if (elements.editToolbar) {
            elements.editToolbar.style.backgroundColor = darkBg;
        }
        document.documentElement.style.setProperty('--bg-page', darkBg);
        document.documentElement.style.setProperty('--bg-page-solid', darkBg);
        document.documentElement.style.setProperty('--bg-content', 'transparent');
        document.documentElement.style.setProperty('--bg-pattern', 'none');
        document.documentElement.style.setProperty('--bg-pattern-opacity', 1);

        const blockquotes = elements.markdownContent.querySelectorAll('blockquote');
        blockquotes.forEach(bq => {
            bq.style.backgroundColor = darkerBg;
            bq.style.backgroundImage = 'none';
        });

        const preBlocks = elements.markdownContent.querySelectorAll('pre');
        preBlocks.forEach(pre => {
            pre.style.backgroundColor = darkerBg;
            pre.style.backgroundImage = 'none';
        });

        const inlineCodes = elements.markdownContent.querySelectorAll('code:not(pre code)');
        inlineCodes.forEach(code => {
            code.style.backgroundColor = '#1a1a2e';
        });

        const tables = elements.markdownContent.querySelectorAll('table');
        tables.forEach(table => {
            table.style.backgroundColor = darkBg;
            table.style.backgroundImage = 'none';
        });

        const tableHeaders = elements.markdownContent.querySelectorAll('thead, th');
        tableHeaders.forEach(th => {
            th.style.backgroundColor = tableHeaderBg;
            th.style.backgroundImage = 'none';
        });
    } else {
        applyBackground();
    }
}

window.Mojian = window.Mojian || {};
Mojian.applyBackground = applyBackground;
Mojian.updateBackgroundSelection = updateBackgroundSelection;
Mojian.updateBackgroundUIState = updateBackgroundUIState;
Mojian.loadThemePreference = loadThemePreference;
Mojian.toggleTheme = toggleTheme;
Mojian.applyTheme = applyTheme;
