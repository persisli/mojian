/**
 * editor/html-to-md.js - TurndownService + fallback HTML→Markdown
 */

let turndownService = null;

function getTurndownService() {
    if (!turndownService) {
        if (typeof TurndownService === 'undefined') {
            console.warn('TurndownService is not defined. Library may not be loaded.');
            return null;
        }
        try {
            turndownService = new TurndownService({
                headingStyle: 'atx',
                codeBlockStyle: 'fenced',
                bulletListMarker: '-',
                emDelimiter: '*',
                strongDelimiter: '**',
                linkStyle: 'inlined',
                linkReferenceStyle: 'full',
                hr: '---',
                blankReplacement: function(content, node) {
                    return node.isBlock ? '\n\n' : '';
                }
            });

            turndownService.addRule('codeBlock', {
                filter: function(node) {
                    return node.nodeName === 'PRE';
                },
                replacement: function(content, node) {
                    let code = node.querySelector('code');
                    if (!code) code = node;
                    const langClass = Array.from(code.classList).find(cls => cls.startsWith('language-'));
                    const lang = langClass ? langClass.replace('language-', '') : '';
                    let codeContent = '';
                    if (code.dataset.rawCode) {
                        codeContent = code.dataset.rawCode;
                    } else {
                        const clone = code.cloneNode(true);
                        clone.querySelectorAll('.line-numbers, .line-number, [class*="line"]').forEach(el => el.remove());
                        clone.querySelectorAll('.code-block-header, .code-block-actions, .code-block-btn, .code-block-lang').forEach(el => el.remove());
                        codeContent = clone.textContent;
                    }
                    // 零宽空格仅用于编辑态下的光标/空行占位，导出时剔除
                    codeContent = codeContent.replace(/\u200B/g, '');
                    codeContent = codeContent.replace(/^\n+/, '').replace(/\n+$/, '');
                    return '\n\n```' + lang + '\n' + codeContent + '\n```\n\n';
                }
            });

            // 下划线 / 上标 / 下标：Markdown 无原生语法，保留为内联 HTML 以便再次渲染
            turndownService.addRule('underline', {
                filter: ['u'],
                replacement: function(content) {
                    return '<u>' + content + '</u>';
                }
            });

            turndownService.addRule('superscript', {
                filter: ['sup'],
                replacement: function(content) {
                    return '<sup>' + content + '</sup>';
                }
            });

            turndownService.addRule('subscript', {
                filter: ['sub'],
                replacement: function(content) {
                    return '<sub>' + content + '</sub>';
                }
            });

            turndownService.addRule('taskList', {
                filter: function(node) {
                    return node.nodeName === 'LI' && node.querySelector('input[type="checkbox"]');
                },
                replacement: function(content, node) {
                    const checkbox = node.querySelector('input[type="checkbox"]');
                    const checked = checkbox && checkbox.checked ? 'x' : ' ';
                    const text = content.replace(/\[\s*\]/, '').trim();
                    return '- [' + checked + '] ' + text + '\n';
                }
            });

            turndownService.addRule('table', {
                filter: 'table',
                replacement: function(content, node) {
                    const rows = Array.from(node.querySelectorAll('tr'));
                    if (rows.length === 0) return content;
                    let markdown = '\n\n';
                    rows.forEach((row, rowIndex) => {
                        const cells = Array.from(row.querySelectorAll('th, td'));
                        const cellContents = cells.map(cell => {
                            let text = cell.textContent.trim().replace(/\n+/g, ' ');
                            return ' ' + text + ' ';
                        });
                        markdown += '| ' + cellContents.join(' | ') + ' |\n';
                        if (rowIndex === 0 && row.querySelector('th')) {
                            const separator = cells.map(() => '------').join(' | ');
                            markdown += '| ' + separator + ' |\n';
                        }
                    });
                    return markdown + '\n';
                }
            });

            turndownService.addRule('listItem', {
                filter: 'li',
                replacement: function(content, node, options) {
                    content = content.replace(/^\n+/, '').replace(/\n+$/, '\n').replace(/\n/gm, '\n    ');
                    let prefix = options.bulletListMarker + ' ';
                    const parent = node.parentNode;
                    if (parent.nodeName === 'OL') {
                        const start = parent.getAttribute('start');
                        const index = Array.prototype.indexOf.call(parent.children, node);
                        prefix = (start ? Number(start) + index : index + 1) + '.  ';
                    }
                    return prefix + content + (node.nextSibling && !/\n$/.test(content) ? '\n' : '');
                }
            });

            turndownService.addRule('blockquote', {
                filter: 'blockquote',
                replacement: function(content) {
                    content = content.trim().replace(/\n{3,}/g, '\n\n');
                    return '\n\n> ' + content.replace(/\n/g, '\n> ') + '\n\n';
                }
            });

            turndownService.addRule('codeBlockEnhancements', {
                filter: function(node) {
                    if (node.nodeName === 'PRE' || node.nodeName === 'CODE') return false;
                    return node.classList && (
                        node.classList.contains('code-block-header') ||
                        node.classList.contains('code-block-lang') ||
                        node.classList.contains('code-block-actions') ||
                        node.classList.contains('code-block-btn') ||
                        node.classList.contains('line-numbers') ||
                        node.classList.contains('line-number')
                    );
                },
                replacement: function() { return ''; }
            });
        } catch (error) {
            console.error('Failed to initialize TurndownService:', error);
            return null;
        }
    }
    return turndownService;
}

function htmlToMarkdown(html) {
    try {
        const service = getTurndownService();
        if (service) {
            let markdown = service.turndown(html);
            // 零宽空格仅用于编辑态下的光标 / 空行占位，导出时统一剔除
            markdown = markdown.replace(/\u200B/g, '');
            markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
            if (!markdown || markdown.length === 0) {
                return fallbackHtmlToMarkdown(html);
            }
            return markdown;
        }
        return fallbackHtmlToMarkdown(html);
    } catch (error) {
        console.error('Turndown conversion error:', error);
        return fallbackHtmlToMarkdown(html);
    }
}

function fallbackHtmlToMarkdown(html) {
    let md = html;
    md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
    md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
    md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
    md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
    md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
    md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');
    md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
    md = md.replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~');
    md = md.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~');
    md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
    md = md.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)');
    md = md.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n\n');
    md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '> $1\n\n');
    md = md.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n') + '\n';
    });
    md = md.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
        let index = 1;
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${index++}. $1\n`) + '\n';
    });
    md = md.replace(/<hr[^>]*>/gi, '---\n\n');
    md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
    md = md.replace(/<table[^>]*>(.*?)<\/table>/gis, (match, content) => {
        return content.replace(/<tr[^>]*>(.*?)<\/tr>/gis, (trMatch, trContent) => {
            return '| ' + trContent.replace(/<t[dh][^>]*>(.*?)<\/t[dh]>/gi, '$1 |') + '\n';
        }) + '\n';
    });
    md = md.replace(/<[^>]+>/g, '');
    md = md.replace(/\u200B/g, '');
    md = md.replace(/\n{3,}/g, '\n\n');
    md = md.trim();
    return md;
}

window.Mojian = window.Mojian || {};
Mojian.htmlToMarkdown = htmlToMarkdown;
