/**
 * editor/html-to-md.js - TurndownService + fallback HTML→Markdown
 */

let turndownService = null;

// 段首缩进字符：NBSP / en / em / 全角空格（中文段落的「　　两字缩进」就是这个）
// 注意：这里必须用 var + 唯一名字。本项目脚本是「经典脚本」，共享同一个全局作用域，
// 顶层 const/let 与别处的同名声明会直接抛 SyntaxError，导致整个文件不执行。
var MD_INDENT_LEAD_RE = /^[\u00a0\u2002\u2003\u3000]+/;

// 相邻的同类强调标签合并（<strong>a</strong><strong>b</strong> → <strong>ab</strong>）：
// 否则会输出 **a****b**，把 markdown 强调拆坏（新华网等站点会把一句粗体拆成多个 <strong>）
function mergeAdjacentEmphasis(root) {
    var all = root.querySelectorAll('strong, b, em, i, del, s, strike, u, sup, sub');
    for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (!el.parentNode) continue;

        // 找下一个元素兄弟（跳过纯空白文本节点）
        var next = el.nextSibling;
        while (next && next.nodeType === 3 && !String(next.textContent || '').trim()) next = next.nextSibling;
        if (!next || next.nodeType !== 1) continue;
        if (next.tagName !== el.tagName) continue;

        while (next.firstChild) el.appendChild(next.firstChild);
        next.parentNode.removeChild(next);
        i--;   // 可能还有连着同类的兄弟，重新检查当前元素
    }
}

/**
 * 转换前预处理：
 * 1) 段前缩进——turndown 会把「只含空白的文本节点」当噪声删掉，而中文段首缩进
 *    常常是独立文本节点（如 <p>　　<a>中新网</a>北京9月30日电</p>），于是缩进会丢失。
 *    先把每个段落的段首缩进记录到 data-md-indent 上，交给 paragraphIndent 规则还原。
 * 2) 合并相邻同类强调标签——避免输出 **a****b** 把 markdown 强调拆坏。
 * @returns {Element|null} 已处理好的根节点（失败返回 null，调用方回退到字符串转换）
 */
function prepareConversionRoot(html) {
    try {
        if (typeof document === 'undefined' || !document.createElement) return null;
        // 用未知标签做根节点，与 turndown 自身的 x-turndown 包装保持一致（非块级）
        const holder = document.createElement('x-md-root');
        holder.innerHTML = html;

        mergeAdjacentEmphasis(holder);

        const paragraphs = holder.querySelectorAll('p');
        for (let i = 0; i < paragraphs.length; i++) {
            const p = paragraphs[i];
            if (p.closest && p.closest('li, blockquote, td, th, pre')) continue;
            if (p.classList && (p.classList.contains('img-caption') ||
                p.classList.contains('article-editor') || p.classList.contains('img-center') ||
                p.classList.contains('article-meta'))) continue;
            const m = String(p.textContent || '').match(MD_INDENT_LEAD_RE);
            if (m) p.setAttribute('data-md-indent', m[0]);
        }
        return holder;
    } catch (e) {
        return null;
    }
}

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
                    } else if (window.Mojian.getCodeText) {
                        // 兼容编辑器里粘贴造成的 <br> / <div> 换行，否则导出后各行会挤成一行
                        codeContent = window.Mojian.getCodeText(code);
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

            // ---- 强调类（粗体/斜体/删除线）----
            // 中文标点紧贴 ** 或 * 时，CommonMark 的 flanking 规则会导致强调无法闭合
            // （如 "**……下限，**Apptopia显示" 渲染不出粗体），这类情况改用内联 HTML 输出。
            var PUNCT_EDGE_RE = /[\u2000-\u206F\u3000-\u303F\uFF01-\uFF5E!-\/:-@\[-`{-~]/;

            function mdEdgeNeedsHtml(content) {
                if (!content) return false;
                if (content.indexOf('\n') !== -1) return true;
                return PUNCT_EDGE_RE.test(content.charAt(0)) ||
                       PUNCT_EDGE_RE.test(content.charAt(content.length - 1));
            }

            function addEmphasisRule(key, filter, tag, delimiter) {
                turndownService.addRule(key, {
                    filter: filter,
                    replacement: function(content) {
                        content = content == null ? '' : content;
                        if (!content.trim()) return '';
                        if (mdEdgeNeedsHtml(content)) {
                            return '<' + tag + '>' + content + '</' + tag + '>';
                        }
                        return delimiter + content + delimiter;
                    }
                });
            }

            addEmphasisRule('strongSafe', ['strong', 'b'], 'strong', '**');
            addEmphasisRule('emSafe', ['em', 'i'], 'em', '*');
            addEmphasisRule('delSafe', ['del', 's', 'strike'], 'del', '~~');

            // 图片说明（图注 / 来源）：输出内联 HTML，便于阅读模式按灰色小字右对齐渲染
            turndownService.addRule('imgCaption', {
                filter: function(node) {
                    return !!(node.classList && node.classList.contains('img-caption'));
                },
                replacement: function(content, node) {
                    // 取原始文本：图注里的链接 / 强调若走 markdown 会变成 [文字](url) 字面量，
                    // 而内联 HTML 块不会被再次解析
                    var text = String((node && node.textContent) || content || '').replace(/\s+/g, ' ').trim();
                    if (!text) return '';
                    text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    return '\n\n<p class="img-caption">' + text + '</p>\n\n';
                }
            });

            // 标题下的「作者 · 时间」署名行：输出内联 HTML（小字右对齐，超链接保留）
            function escapeMetaText(s) {
                return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            }

            turndownService.addRule('articleMeta', {
                filter: function(node) {
                    return !!(node.classList && node.classList.contains('article-meta'));
                },
                replacement: function(content, node) {
                    // 从 DOM 重建：保留 <a href>，其余行内标签只取文字
                    var html = '';
                    var kids = node.childNodes;
                    for (var i = 0; i < kids.length; i++) {
                        var n = kids[i];
                        if (n.nodeType === 3) { html += escapeMetaText(n.textContent); continue; }
                        if (n.nodeType !== 1) continue;
                        if (n.nodeName === 'A') {
                            var href = String(n.getAttribute('href') || '').replace(/"/g, '&quot;');
                            var txt = escapeMetaText(n.textContent || '');
                            html += (href && txt) ? '<a href="' + href + '">' + txt + '</a>' : txt;
                        } else if (n.nodeName === 'BR') {
                            html += ' ';
                        } else {
                            html += escapeMetaText(n.textContent || '');
                        }
                    }
                    html = html.replace(/[ \t\r\n\u3000]+/g, ' ').trim();
                    if (!html) return '';
                    return '\n\n<p class="article-meta">' + html + '</p>\n\n';
                }
            });

            // 居中的正文图片：Markdown 无对齐语法，输出内联 HTML 标记，阅读时保持居中。
            // 两种形态都要认：img.img-center（刚抓取下来还没转换）和
            // <p class="img-center"><img …></p>（编辑往返 / 已保存的文档，类名在外层）
            function isCenteredImageNode(node) {
                if (!node || !node.classList || !node.classList.contains('img-center')) return false;
                if (node.nodeName === 'IMG') return true;
                return /^(P|DIV|FIGURE)$/.test(node.nodeName) && !!node.querySelector('img');
            }

            turndownService.addRule('centeredImage', {
                filter: isCenteredImageNode,
                replacement: function(content, node) {
                    var img = node.nodeName === 'IMG' ? node : node.querySelector('img');
                    if (!img) return content;
                    var src = String(img.getAttribute('src') || '').replace(/"/g, '&quot;');
                    if (!src) return '';
                    var alt = String(img.getAttribute('alt') || '').replace(/"/g, '&quot;');
                    var title = img.getAttribute('title');
                    title = title ? ' title="' + String(title).replace(/"/g, '&quot;') + '"' : '';
                    return '\n\n<p class="img-center"><img src="' + src + '" alt="' + alt + '"' + title + '></p>\n\n';
                }
            });

            // 编辑 / 来源署名行（如「【编辑:曹子健】」）：输出内联 HTML，阅读时整行右对齐
            turndownService.addRule('articleEditor', {
                filter: function(node) {
                    return !!(node.classList && node.classList.contains('article-editor'));
                },
                replacement: function(content, node) {
                    // 取原始文本而不是 turndown 处理过的内容，避免方括号被转义成 \[
                    var text = String((node && node.textContent) || content || '').replace(/\s+/g, ' ').trim();
                    if (!text) return '';
                    text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    return '\n\n<p class="article-editor">' + text + '</p>\n\n';
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
                    // 全空的表格（广告位 / 布局表格）不输出表格语法，
                    // 交给默认流程，避免出现「| |」这类无意义表格行
                    const hasText = rows.some(row =>
                        Array.from(row.querySelectorAll('th, td'))
                            .some(cell => (cell.textContent || '').replace(/[\s\u00A0\u2002\u2003\u3000\u200B]+/g, '') !== '')
                    );
                    if (!hasText) return content;
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

            // ---- 段落段前缩进 ----
            // 中文原文的段前缩进（全角空格 / em 空格 / NBSP）会被 turndown 的空白清理
            // 吃掉（如「　　<a>中新网</a>北京9月30日电」缩进是独立文本节点，会被整块删除），
            // 这里读回缩进并统一成「恰好一个缩进」避免叠加。
            function paragraphLeadIndent(node) {
                if (!node) return '';
                // 预处理阶段记录在标签上的缩进（最可靠）
                if (node.getAttribute) {
                    var recorded = node.getAttribute('data-md-indent');
                    if (recorded) return recorded;
                }
                if (node.classList && (node.classList.contains('img-caption') ||
                    node.classList.contains('article-editor') || node.classList.contains('img-center') ||
                    node.classList.contains('article-meta'))) return '';
                // 列表 / 引用 / 表格内的段落不加段前缩进（与段前缩进功能的规则一致）
                if (node.closest && node.closest('li, blockquote, td, th, pre')) return '';
                var m = String(node.textContent || '').match(MD_INDENT_LEAD_RE);
                return m ? m[0] : '';
            }

            turndownService.addRule('paragraphIndent', {
                // 图注 / 署名行 / 居中图片 / 作者时间行各有专用规则，这里必须放行
                filter: function(node) {
                    return node.nodeName === 'P' && !(node.classList &&
                        (node.classList.contains('img-caption') || node.classList.contains('article-editor') ||
                         node.classList.contains('img-center') || node.classList.contains('article-meta')));
                },
                replacement: function(content, node) {
                    var lead = paragraphLeadIndent(node);
                    var body = content == null ? '' : content;
                    if (lead) body = lead + body.replace(MD_INDENT_LEAD_RE, '');
                    return '\n\n' + body + '\n\n';
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

            // Mermaid 渲染出来的图（SVG）不参与 markdown 转换：
            // 原文由其后的 <pre class="mermaid-source"> 还原成围栏代码块，
            // 若把 svg 当普通元素处理会把图中文字当成正文吐出来
            turndownService.addRule('mermaidDiagram', {
                filter: function(node) {
                    return !!(node.classList && node.classList.contains('mermaid-diagram'));
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
            // 先做预处理（缩进保护 / 合并相邻强调）再转换
            const preparedRoot = prepareConversionRoot(html);
            let markdown = service.turndown(preparedRoot || html);
            // 零宽空格仅用于编辑态下的光标 / 空行占位，导出时统一剔除
            markdown = markdown.replace(/\u200B/g, '');
            markdown = markdown.replace(/\n{3,}/g, '\n\n');
            // 只清 ASCII 空白：不能用 trim()，否则文档开头段落的全角段前缩进会被一起吃掉
            markdown = markdown.replace(/^[\t\r\n ]+/, '').replace(/[\t\r\n ]+$/, '');
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
        // 全是空单元格（广告位 / 布局表格）→ 不输出表格语法，避免 | | 噪声
        if (!content.replace(/<[^>]+>/g, '').replace(/[\s\u00A0\u2002\u2003\u3000]/g, '')) return '';
        return content.replace(/<tr[^>]*>(.*?)<\/tr>/gis, (trMatch, trContent) => {
            return '| ' + trContent.replace(/<t[dh][^>]*>(.*?)<\/t[dh]>/gi, '$1 |') + '\n';
        }) + '\n';
    });
    md = md.replace(/<[^>]+>/g, '');
    md = md.replace(/\u200B/g, '');
    md = md.replace(/\n{3,}/g, '\n\n');
    // 只清 ASCII 空白，保留段首全角缩进
    md = md.replace(/^[\t\r\n ]+/, '').replace(/[\t\r\n ]+$/, '');
    return md;
}

window.Mojian = window.Mojian || {};
Mojian.htmlToMarkdown = htmlToMarkdown;
