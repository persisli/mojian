/**
 * 墨笈 · 国际化配置
 * Internationalization Configuration
 */

const i18n = {
    // 当前语言
    currentLang: 'zh-CN',
    
    // 支持的语言列表
    supportedLanguages: ['zh-CN', 'en-US'],
    
    // 翻译字典
    translations: {
        'zh-CN': {
            // 页面标题
            'page.title': '墨笈 · 优雅Markdown阅读器',
            
            // Header
            'header.logo': '墨笈',
            'header.home': '返回主页',
            'header.edit': '编辑',
            'header.save': '保存',
            'header.export': '导出',
            'header.toc': '目录导航',
            'header.settings': '阅读设置',
            
            // Export Dropdown
            'export.txt': '导出为 TXT',
            'export.md': '导出为 MD',
            'export.pdf': '导出为 PDF',
            
            // Export Modal
            'export.confirm.title': '导出为 PDF',
            'export.confirm.desc': '即将把当前文档导出为 PDF 格式，保留字体样式和背景设置。',
            'export.confirm.cancel': '取消',
            'export.confirm.yes': '确认导出',
            'export.progress.title': '正在导出...',
            'export.progress.preparing': '准备中...',
            'export.progress.generating': '正在生成 PDF...',
            'export.progress.printing': '正在调用打印机...',
            'export.progress.complete': '导出完成！',
            'export.success': 'PDF 导出成功（请在打印对话框中选择"另存为 PDF"）',
            
            // Settings Sidebar
            'settings.title': '阅读设置',
            
            // Font Size
            'settings.fontSize.label': '正文字号',
            
            // Font Family
            'settings.fontFamily.label': '正文字体',
            'settings.fontFamily.notoSans': '思源黑体',
            'settings.fontFamily.notoSerif': '思源宋体',
            'settings.fontFamily.wenKai': '霞鹜文楷',
            'settings.fontFamily.system': '系统字体',
            
            // Theme
            'settings.theme.label': '外观主题',
            'settings.theme.light': '明亮模式',
            'settings.theme.dark': '黑暗模式',
            
            // Image Display
            'settings.imageDisplay.label': '图片显示',
            'settings.imageDisplay.on': '有图模式',
            'settings.imageDisplay.off': '无图模式',
            
            // Width
            'settings.width.label': '内容宽度',
            
            // Line Height
            'settings.lineHeight.label': '行高设置',
            
            // Paragraph Spacing
            'settings.paragraphSpacing.label': '段落间距',
            
            // Paragraph Indent
            'settings.paragraphIndent.label': '段前缩进',
            'settings.paragraphIndent.value': '{n} 字',
            
            // Background Opacity
            'settings.bgOpacity.label': '背景不透明度',
            
            // Language
            'settings.language.label': '语言',
            
            // Background
            'settings.background.label': '阅读背景',
            'settings.background.tabs.solid': '纯色',
            'settings.background.tabs.artistic': '文艺',
            'settings.background.tabs.chinese': '国风',
            'settings.background.tabs.stationery': '信笺',
            
            // Background Colors (tooltips)
            'settings.bg.color.beige': '米白',
            'settings.bg.color.cream': '米黄',
            'settings.bg.color.green': '浅草绿',
            'settings.bg.color.blue': '淡蓝',
            'settings.bg.color.almond': '杏仁',
            'settings.bg.color.pink': '淡粉',
            'settings.bg.color.purple': '淡紫',
            'settings.bg.color.warmGray': '暖灰',
            
            // Artistic Patterns (tooltips)
            'settings.bg.pattern.hexagon': '六边形拓扑',
            'settings.bg.pattern.triangle': '三角形拓扑',
            'settings.bg.pattern.diamond': '菱形拓扑',
            'settings.bg.pattern.nodes': '节点连线',
            
            // Chinese Style Patterns (tooltips)
            'settings.bg.pattern.silkLotus': '绢荷',
            'settings.bg.pattern.mistBamboo': '雾竹',
            'settings.bg.pattern.cloudMountains': '云山',
            'settings.bg.pattern.auspiciousGold': '祥云洒金',
            
            // Stationery Patterns (tooltips)
            'settings.bg.pattern.craneHills': '鹤影青绿',
            'settings.bg.pattern.osmanthusKraft': '桂花旧纸',
            'settings.bg.pattern.meanderSun': '回纹朱日',
            'settings.bg.pattern.watercolorPond': '水彩荷塘',

            // Status Bar Display
            'settings.statusBar.label': '状态栏',
            'settings.statusBar.time': '时长',
            'settings.statusBar.wordCount': '字数',
            'settings.statusBar.progress': '进度',

            // Welcome Screen
            'welcome.title': '优雅地阅读Markdown',
            'welcome.desc': '拖拽文件到此处，或点击选择文件',
            
            // Status Bar
            'status.readingTime': '{minutes} 分钟',
            'status.wordCount': '{count} 字',

            // Default File Name
            'file.untitled': '未命名文档.md',
            
            // Toast Messages
            'toast.fileLoaded': '文件加载成功',
            'toast.fileLoadError': '文件读取失败，请重试',
            'toast.unsupportedFormat': '仅支持 .md、.txt 和 .log 格式的文件',
            'toast.fileTooLarge': '文件大小不能超过 6MB',
            'toast.loadFileFirst': '请先加载文档',
            'toast.exportTxtSuccess': '已导出为 TXT 格式',
            'toast.exportMdSuccess': '已导出为 MD 格式',
            'toast.exportPdfFailed': 'PDF 导出失败：{error}',
            'toast.copied': '已复制到剪贴板',
            'toast.konamiCode': '🎮 欢迎进入宇宙源码！',
            'toast.exitMatrix': '已退出宇宙源码模式',
            'toast.achievementUnlock': '🏆 成就解锁',
            'toast.enterEditMode': '进入编辑模式',
            'toast.exitEditMode': '退出编辑模式',
            'toast.saveSuccess': '保存成功',
            'toast.fileNameUpdated': '文件名已更新',
            'toast.urlImporting': '正在抓取并解析链接内容…',
            'toast.urlImportSuccess': '链接内容已导入',
            'toast.urlImportFailed': '链接解析失败，请稍后重试',
            'toast.urlImportBlocked': '无法抓取该链接（站点跨域限制），请稍后重试',
            'toast.urlImportRateLimited': '抓取过于频繁，请等待 {seconds} 秒后再试',
            'toast.urlImportUnauthorized': '代理令牌校验失败，请检查同源代理的令牌配置',
            'toast.urlImportWafBlocked': '该站点启用了反爬（WAF）：服务器出口 IP 被挑战，服务端抓不到正文。可换个链接，或改用本地 php -S 服务解析',
            'toast.urlImportSame': '当前已是该链接的内容，无需重复导入',
            'toast.urlImportFromCache': '已从本地缓存载入（未重新抓取）',
            
            // Code Block Actions
            'code.download': '下载',
            'code.copy': '复制',
            
            // Edit Toolbar Buttons
            'toolbar.heading1': '标题1 (H1)',
            'toolbar.heading2': '标题2 (H2)',
            'toolbar.heading3': '标题3 (H3)',
            'toolbar.bold': '加粗',
            'toolbar.italic': '斜体',
            'toolbar.underline': '下划线',
            'toolbar.strike': '删除线',
            'toolbar.code': '行内代码',
            'toolbar.superscript': '上标 (^{内容})',
            'toolbar.subscript': '下标 (_{内容})',
            'toolbar.clearFormat': '清除格式',
            'toolbar.bulletList': '无序列表',
            'toolbar.orderedList': '有序列表',
            'toolbar.taskList': '任务列表',
            'toolbar.blockquote': '引用',
            'toolbar.horizontalRule': '分割线',
            'toolbar.link': '插入链接',
            'toolbar.image': '插入图片',
            'toolbar.codeBlock': '代码块',
            'toolbar.table': '插入表格',
            'toolbar.undo': '撤回 (Ctrl+Z)',
            'toolbar.redo': '应用 (Ctrl+Y)',
            
            // Insert Link Modal
            'insertLink.title': '插入链接',
            'insertLink.desc': '输入链接地址，将插入到当前光标位置。',
            'insertLink.urlLabel': '链接地址',
            'insertLink.urlPlaceholder': 'https://example.com',
            'insertLink.textLabel': '显示文本（可选）',
            'insertLink.textPlaceholder': '链接文本',
            'insertLink.cancel': '取消',
            'insertLink.confirm': '保存',
            
            // Insert Image Modal
            'insertImage.title': '插入图片',
            'insertImage.desc': '输入图片地址，将插入到当前光标位置。',
            'insertImage.urlLabel': '图片地址',
            'insertImage.urlPlaceholder': 'https://example.com/image.png',
            'insertImage.altLabel': '替代文本（可选）',
            'insertImage.altPlaceholder': '图片描述',
            'insertImage.cancel': '取消',
            'insertImage.confirm': '插入图片',
            
            // Insert Table Modal
            'insertTable.title': '插入表格',
            'insertTable.desc': '输入行数和列数，将插入到当前光标位置。',
            'insertTable.rowsLabel': '行数',
            'insertTable.colsLabel': '列数',
            'insertTable.cancel': '取消',
            'insertTable.confirm': '插入表格',
            
            // Achievements
            'achievement.novice.name': '初窥门径',
            'achievement.novice.desc': '阅读满 10,000 字',
            'achievement.scholar.name': '博览群书',
            'achievement.scholar.desc': '阅读满 100,000 字',
            'achievement.persistent.name': '持之以恒',
            'achievement.persistent.desc': '连续阅读 7 天',
            
            // Poetic Quotes
            'poetic.quote.1': '文字是思想的翅膀',
            'poetic.quote.2': '在空白处遇见灵感',
            'poetic.quote.3': '阅读是与智者对话',
            'poetic.quote.4': '每一页都是新的旅程',
            'poetic.quote.5': '墨香深处有乾坤',
            'poetic.quote.6': '静心阅读，遇见更好的自己',
            'poetic.quote.7': '书中自有黄金屋',
            'poetic.quote.8': '读万卷书，行万里路',
            'poetic.quote.9': '文字如茶，细品回甘',
            'poetic.quote.10': '在书海中寻找心灵的港湾',
            'poetic.quote.11': '阅读让时光变得温柔',
            'poetic.quote.12': '每一行代码都是诗',
            'poetic.quote.13': '文档之间，自有天地',
            'poetic.quote.14': '墨笈之中，藏着世界'
        },
        
        'en-US': {
            // Page Title
            'page.title': 'Moji · Elegant Markdown Reader',
            
            // Header
            'header.logo': 'Moji',
            'header.home': 'Home',
            'header.edit': 'Edit',
            'header.save': 'Save',
            'header.export': 'Export',
            'header.toc': 'Table of Contents',
            'header.settings': 'Reading Settings',
            
            // Export Dropdown
            'export.txt': 'Export as TXT',
            'export.md': 'Export as MD',
            'export.pdf': 'Export as PDF',
            
            // Export Modal
            'export.confirm.title': 'Export as PDF',
            'export.confirm.desc': 'Export the current document to PDF format, preserving font styles and background settings.',
            'export.confirm.cancel': 'Cancel',
            'export.confirm.yes': 'Confirm Export',
            'export.progress.title': 'Exporting...',
            'export.progress.preparing': 'Preparing...',
            'export.progress.generating': 'Generating PDF...',
            'export.progress.printing': 'Calling printer...',
            'export.progress.complete': 'Export complete!',
            'export.success': 'PDF exported successfully (please select "Save as PDF" in the print dialog)',
            
            // Settings Sidebar
            'settings.title': 'Reading Settings',
            
            // Font Size
            'settings.fontSize.label': 'Font Size',
            
            // Font Family
            'settings.fontFamily.label': 'Font Family',
            'settings.fontFamily.notoSans': 'Noto Sans SC',
            'settings.fontFamily.notoSerif': 'Noto Serif SC',
            'settings.fontFamily.wenKai': 'LXGW WenKai',
            'settings.fontFamily.system': 'System Font',
            
            // Theme
            'settings.theme.label': 'Theme',
            'settings.theme.light': 'Light Mode',
            'settings.theme.dark': 'Dark Mode',
            
            // Image Display
            'settings.imageDisplay.label': 'Images',
            'settings.imageDisplay.on': 'With Images',
            'settings.imageDisplay.off': 'No Images',
            
            // Width
            'settings.width.label': 'Content Width',
            
            // Line Height
            'settings.lineHeight.label': 'Line Height',
            
            // Paragraph Spacing
            'settings.paragraphSpacing.label': 'Paragraph Spacing',
            
            // Paragraph Indent
            'settings.paragraphIndent.label': 'Paragraph Indent',
            'settings.paragraphIndent.value': '{n}',
            
            // Background Opacity
            'settings.bgOpacity.label': 'Background Opacity',
            
            // Language
            'settings.language.label': 'Language',
            
            // Background
            'settings.background.label': 'Reading Background',
            'settings.background.tabs.solid': 'Solid',
            'settings.background.tabs.artistic': 'Artistic',
            'settings.background.tabs.chinese': 'Chinese',
            'settings.background.tabs.stationery': 'Stationery',
            
            // Background Colors (tooltips)
            'settings.bg.color.beige': 'Beige',
            'settings.bg.color.cream': 'Cream',
            'settings.bg.color.green': 'Light Green',
            'settings.bg.color.blue': 'Light Blue',
            'settings.bg.color.almond': 'Almond',
            'settings.bg.color.pink': 'Light Pink',
            'settings.bg.color.purple': 'Light Purple',
            'settings.bg.color.warmGray': 'Warm Gray',
            
            // Artistic Patterns (tooltips)
            'settings.bg.pattern.hexagon': 'Hexagon Topology',
            'settings.bg.pattern.triangle': 'Triangle Topology',
            'settings.bg.pattern.diamond': 'Diamond Topology',
            'settings.bg.pattern.nodes': 'Node Connection',
            
            // Chinese Style Patterns (tooltips)
            'settings.bg.pattern.silkLotus': 'Silk Lotus',
            'settings.bg.pattern.mistBamboo': 'Misty Bamboo',
            'settings.bg.pattern.cloudMountains': 'Cloudy Mountains',
            'settings.bg.pattern.auspiciousGold': 'Gilded Clouds',
            
            // Stationery Patterns (tooltips)
            'settings.bg.pattern.craneHills': 'Cranes over Hills',
            'settings.bg.pattern.osmanthusKraft': 'Osmanthus Kraft',
            'settings.bg.pattern.meanderSun': 'Meander & Red Sun',
            'settings.bg.pattern.watercolorPond': 'Watercolor Pond',

            // Status Bar Display
            'settings.statusBar.label': 'Status Bar',
            'settings.statusBar.time': 'Time',
            'settings.statusBar.wordCount': 'Words',
            'settings.statusBar.progress': 'Progress',

            // Welcome Screen
            'welcome.title': 'Elegant Markdown Reading',
            'welcome.desc': 'Drag files here, or click to select a file',
            
            // Status Bar
            'status.readingTime': '{minutes} min',
            'status.wordCount': '{count} words',

            // Default File Name
            'file.untitled': 'Untitled.md',
            
            // Toast Messages
            'toast.fileLoaded': 'File loaded successfully',
            'toast.fileLoadError': 'Failed to read file, please try again',
            'toast.unsupportedFormat': 'Only .md, .txt and .log files are supported',
            'toast.fileTooLarge': 'File size cannot exceed 6MB',
            'toast.loadFileFirst': 'Please load a document first',
            'toast.exportTxtSuccess': 'Exported as TXT format',
            'toast.exportMdSuccess': 'Exported as MD format',
            'toast.exportPdfFailed': 'PDF export failed: {error}',
            'toast.copied': 'Copied to clipboard',
            'toast.konamiCode': '🎮 Welcome to The Cosmic Code!',
            'toast.exitMatrix': 'Exited Cosmic Code mode',
            'toast.achievementUnlock': '🏆 Achievement Unlocked',
            'toast.enterEditMode': 'Enter edit mode',
            'toast.exitEditMode': 'Exit edit mode',
            'toast.saveSuccess': 'Saved successfully',
            'toast.fileNameUpdated': 'File name updated',
            'toast.urlImporting': 'Fetching and parsing the link…',
            'toast.urlImportSuccess': 'Link content imported',
            'toast.urlImportFailed': 'Failed to parse the link, please try again later',
            'toast.urlImportBlocked': 'Unable to fetch this link (cross-origin restricted), please try again later',
            'toast.urlImportRateLimited': 'Too many requests, please wait {seconds}s and try again',
            'toast.urlImportUnauthorized': 'Proxy token rejected, please check the proxy token config',
            'toast.urlImportWafBlocked': 'This site is protected by a WAF: the server IP is challenged and the article cannot be fetched server-side. Try another link, or run the local php -S server instead',
            'toast.urlImportSame': 'This link is already open, no need to import again',
            'toast.urlImportFromCache': 'Loaded from local cache (not re-fetched)',
            
            // Code Block Actions
            'code.download': 'Download',
            'code.copy': 'Copy',
            
            // Edit Toolbar Buttons
            'toolbar.heading1': 'Heading 1 (H1)',
            'toolbar.heading2': 'Heading 2 (H2)',
            'toolbar.heading3': 'Heading 3 (H3)',
            'toolbar.bold': 'Bold',
            'toolbar.italic': 'Italic',
            'toolbar.underline': 'Underline',
            'toolbar.strike': 'Strikethrough',
            'toolbar.code': 'Inline Code',
            'toolbar.superscript': 'Superscript (^{text})',
            'toolbar.subscript': 'Subscript (_{text})',
            'toolbar.clearFormat': 'Clear Formatting',
            'toolbar.bulletList': 'Bullet List',
            'toolbar.orderedList': 'Numbered List',
            'toolbar.taskList': 'Task List',
            'toolbar.blockquote': 'Blockquote',
            'toolbar.horizontalRule': 'Horizontal Rule',
            'toolbar.link': 'Insert Link',
            'toolbar.image': 'Insert Image',
            'toolbar.codeBlock': 'Code Block',
            'toolbar.table': 'Insert Table',
            'toolbar.undo': 'Undo (Ctrl+Z)',
            'toolbar.redo': 'Redo (Ctrl+Y)',
            
            // Insert Link Modal
            'insertLink.title': 'Insert Link',
            'insertLink.desc': 'Enter the link URL to insert at the current cursor position.',
            'insertLink.urlLabel': 'Link URL',
            'insertLink.urlPlaceholder': 'https://example.com',
            'insertLink.textLabel': 'Display Text (optional)',
            'insertLink.textPlaceholder': 'Link text',
            'insertLink.cancel': 'Cancel',
            'insertLink.confirm': 'Save',
            
            // Insert Image Modal
            'insertImage.title': 'Insert Image',
            'insertImage.desc': 'Enter the image URL to insert at the current cursor position.',
            'insertImage.urlLabel': 'Image URL',
            'insertImage.urlPlaceholder': 'https://example.com/image.png',
            'insertImage.altLabel': 'Alt Text (optional)',
            'insertImage.altPlaceholder': 'Image description',
            'insertImage.cancel': 'Cancel',
            'insertImage.confirm': 'Insert Image',
            
            // Insert Table Modal
            'insertTable.title': 'Insert Table',
            'insertTable.desc': 'Enter the number of rows and columns to insert at the current cursor position.',
            'insertTable.rowsLabel': 'Rows',
            'insertTable.colsLabel': 'Columns',
            'insertTable.cancel': 'Cancel',
            'insertTable.confirm': 'Insert Table',
            
            // Achievements
            'achievement.novice.name': 'Novice Reader',
            'achievement.novice.desc': 'Read 10,000 words',
            'achievement.scholar.name': 'Scholar',
            'achievement.scholar.desc': 'Read 100,000 words',
            'achievement.persistent.name': 'Persistent',
            'achievement.persistent.desc': 'Read for 7 consecutive days',
            
            // Poetic Quotes
            'poetic.quote.1': 'Words are the wings of thought',
            'poetic.quote.2': 'Find inspiration in the blank spaces',
            'poetic.quote.3': 'Reading is a dialogue with the wise',
            'poetic.quote.4': 'Every page is a new journey',
            'poetic.quote.5': 'Deep within the ink lies the universe',
            'poetic.quote.6': 'Read quietly, meet a better self',
            'poetic.quote.7': 'Books hold treasures beyond measure',
            'poetic.quote.8': 'Read ten thousand books, travel ten thousand miles',
            'poetic.quote.9': 'Words are like tea, savor the aftertaste',
            'poetic.quote.10': 'Seek harbor for your soul in the sea of books',
            'poetic.quote.11': 'Reading makes time gentle',
            'poetic.quote.12': 'Every line of code is poetry',
            'poetic.quote.13': 'Between documents lies a world',
            'poetic.quote.14': 'Within Moji hides the world'
        }
    },
    
    /**
     * 获取翻译文本
     * @param {string} key - 翻译键
     * @param {Object} params - 参数对象（用于替换占位符）
     * @returns {string} 翻译后的文本
     */
    t(key, params = {}) {
        const lang = this.currentLang;
        const translation = this.translations[lang]?.[key];
        
        if (!translation) {
            console.warn(`Translation key not found: ${key}`);
            return key;
        }
        
        // 替换占位符
        let result = translation;
        Object.keys(params).forEach(paramKey => {
            result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]);
        });
        
        return result;
    },
    
    /**
     * 切换语言
     * @param {string} lang - 目标语言代码
     */
    setLanguage(lang) {
        if (!this.supportedLanguages.includes(lang)) {
            console.warn(`Unsupported language: ${lang}`);
            return;
        }

        this.currentLang = lang;
        localStorage.setItem('language', lang);

        // 更新HTML lang属性
        document.documentElement.lang = lang;

        // 更新所有带有data-i18n属性的元素
        this.updatePageTranslations();

        // 同步更新自定义语言下拉组件
        const langSelect = document.getElementById('languageSelect');
        if (langSelect && typeof setCustomSelectValue === 'function') {
            setCustomSelectValue('languageSelect', lang);
        }

        // 触发语言切换事件
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    },
    
    /**
     * 初始化语言设置
     */
    init() {
        // 从localStorage读取保存的语言设置
        const savedLang = localStorage.getItem('language');
        if (savedLang && this.supportedLanguages.includes(savedLang)) {
            this.currentLang = savedLang;
        } else {
            // 检测浏览器语言
            const browserLang = navigator.language;
            if (browserLang.startsWith('zh')) {
                this.currentLang = 'zh-CN';
            } else {
                this.currentLang = 'en-US';
            }
        }
        
        // 设置HTML lang属性
        document.documentElement.lang = this.currentLang;
    },
    
    /**
     * 更新页面上所有翻译
     */
    updatePageTranslations() {
        // 更新页面标题
        document.title = this.t('page.title');
        
        // 更新所有带有data-i18n属性的元素
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const paramsAttr = element.getAttribute('data-i18n-params');
            let params = {};
            if (paramsAttr) {
                try {
                    params = JSON.parse(paramsAttr);
                } catch (e) {
                    console.warn(`Failed to parse data-i18n-params for key ${key}:`, e);
                }
            }
            const text = this.t(key, params);
            
            // 根据元素类型更新内容
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                if (element.hasAttribute('placeholder')) {
                    element.placeholder = text;
                }
            } else if (element.tagName === 'IMG') {
                if (element.hasAttribute('alt')) {
                    element.alt = text;
                }
            } else {
                element.textContent = text;
            }
        });
        
        // 更新所有带有data-i18n-title属性的元素的title属性
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });
        
        // 更新所有带有data-i18n-placeholder属性的元素的placeholder属性
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });
        
        // 重新渲染Lucide图标（如果需要）
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },
    
    /**
     * 获取当前语言
     * @returns {string} 当前语言代码
     */
    getLanguage() {
        return this.currentLang;
    },
    
    /**
     * 判断是否为中文
     * @returns {boolean}
     */
    isChinese() {
        return this.currentLang === 'zh-CN';
    },
    
    /**
     * 判断是否为英文
     * @returns {boolean}
     */
    isEnglish() {
        return this.currentLang === 'en-US';
    }
};

// 在DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => i18n.init());
} else {
    i18n.init();
}
