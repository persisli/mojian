/**
 * reader/url-importer.js - 主页粘贴链接 → 抓取并解析新闻正文
 *
 * 用法：在主页（非编辑模式）按 Ctrl+V，剪贴板是 http(s) 链接时自动抓取并解析。
 *
 * 解析策略（按优先级）：
 *   1. 特殊形态：正文被转义后塞进 <textarea>（如环球网），先反转义再解析
 *   2. 站点专用选择器表（针对常用新闻站点，取自离线快照分析）
 *   3. 通用正文选择器
 *   4. Readability 式打分：按 <p> 文本量 / 标点密度 / 链接密度 / class 权重挑选容器
 * 之后统一清洗：去广告/推荐/评论/分享/导航/视频/二维码等，保留标题层级与图片。
 */

(function () {
    'use strict';

    /* ================================================================
     * 抓取配置
     * ================================================================ */

    // 抓取通道，按顺序尝试，第一个拿到 HTML 的生效。
    //   template = null 表示直连；否则 {url} 会替换为 encodeURIComponent 后的目标地址。
    // 首选同源 proxy.php（配合 php -S 启动，浏览器无跨域限制，最稳），
    // 其次是公共 CORS 代理（依赖外网可达性）。可自行增删/调整顺序。
    var LOCAL_PROXY_PING = 'proxy.php?ping=1';
    var LOCAL_PROXY_TIMEOUT = 30000;   // 同源代理：服务端抓取可能较慢，给足时间
    var REMOTE_TIMEOUT = 9000;         // 公共代理/直连：快速失败，避免长时间干等

    // 同源代理的访问令牌：【必须与 proxy.php 顶部的 $PROXY_TOKEN 一致】，
    // 两处都改成一串随机字符后，外部的野扫描请求就用不了这个代理了。
    // 代理侧另有 10 次/分钟的限速，超频会返回 429，前端提示等待。
    var PROXY_TOKEN = 'mojian-reader-proxy-token';
    var PROXY_CHANNEL_URL = 'proxy.php?token=' + encodeURIComponent(PROXY_TOKEN) + '&url={url}';

    var FETCH_CHANNELS = [
        { name: 'proxy.php(同源)', local: true, timeout: LOCAL_PROXY_TIMEOUT, template: PROXY_CHANNEL_URL },
        { name: '直连', timeout: REMOTE_TIMEOUT, template: null },
        { name: 'allorigins', timeout: REMOTE_TIMEOUT, template: 'https://api.allorigins.win/raw?url={url}' },
        { name: 'codetabs', timeout: REMOTE_TIMEOUT, template: 'https://api.codetabs.com/v1/proxy?quest={url}' },
        { name: 'corsproxy', timeout: REMOTE_TIMEOUT, template: 'https://corsproxy.io/?{url}' }
    ];
    var MAX_HTML_BYTES = 8 * 1024 * 1024;

    /* ================================================================
     * 正文容器选择规则
     * ================================================================ */

    // 站点专用选择器（离线快照分析得出，命中即用）
    var SITE_RULES = [
        { host: /(^|\.)36kr\.com$/i, sel: ['.article-content', '.article-detail-wrapper-box', '.kr-article-inner'] },
        { host: /(^|\.)toutiao\.com$/i, sel: ['article.tt-article-content', 'div.article-content', 'article.syl-article-base'] },
        { host: /(^|\.)wallstreetcn\.com$/i, sel: ['.rich-text', 'article.article'] },
        { host: /(^|\.)news\.cn$/i, sel: ['#detail', '#detailContent', '.main-left'] },
        { host: /(^|\.)xinhuanet\.com$/i, sel: ['#detail', '#detailContent', '.main-left'] },
        { host: /(^|\.)guokr\.com$/i, sel: ['[class*="ArticleContent"]', '[class*="Article__StyleWrapper"]'] },
        { host: /(^|\.)thepaper\.cn$/i, sel: ['[class*="cententWrap"]', '[class*="wrapper__"]', '.news_txt'] },
        { host: /(^|\.)huanqiu\.com$/i, sel: ['textarea.article-content'] },
        { host: /(^|\.)yicai\.com$/i, sel: ['#multi-text', '.m-txt', '.m-text'] },
        { host: /(^|\.)guancha\.cn$/i, sel: ['.all-txt', '.content.all-txt', '.content-main .all-txt'] },
        { host: /(^|\.)juejin\.cn$/i, sel: ['#article-root', '.article-viewer.markdown-body', 'article.article'] },
        { host: /mp\.weixin\.qq\.com$/i, sel: ['#js_content'] },
        { host: /(^|\.)zhihu\.com$/i, sel: ['.RichText', '.Post-RichTextContainer'] },
        { host: /(^|\.)163\.com$/i, sel: ['.post_body', '#content .post_text', '.post_text'] },
        { host: /(^|\.)sina\.com(\.cn)?$/i, sel: ['#artibody', '#article', '.article'] },
        { host: /(^|\.)qq\.com$/i, sel: ['#Cnt-Main-Article-QQ', '.content-article', '#ArticleContent'] },
        { host: /(^|\.)sohu\.com$/i, sel: ['#mp-editor', 'article.article', '.article-text'] },
        { host: /(^|\.)ifeng\.com$/i, sel: ['#main_content', '.main_content', '.article-content'] },
        { host: /(^|\.)jiemian\.com$/i, sel: ['.article-content', '.article-main', '.text'] },
        { host: /(^|\.)caixin\.com$/i, sel: ['#Main_Content_Val', '.article-content', '.text'] },
        { host: /(^|\.)bjnews\.com\.cn$/i, sel: ['.article-content'] },
        { host: /(^|\.)cls\.cn$/i, sel: ['.detail-content', '.article-content'] },
        { host: /(^|\.)infoq\.cn$/i, sel: ['.article-content', '.article-page'] },
        { host: /(^|\.)csdn\.net$/i, sel: ['#content_views', '.htmledit_views'] },
        { host: /(^|\.)cnblogs\.com$/i, sel: ['#cnblogs_post_body'] },
        { host: /(^|\.)segmentfault\.com$/i, sel: ['.article__content', '.fmt'] },
        { host: /(^|\.)sspai\.com$/i, sel: ['.article-body', '.content'] },
        { host: /(^|\.)36dianping\.com$/i, sel: ['.article-content'] },
        { host: /(^|\.)chinanews\.com(\.cn)?$/i, sel: ['.left_zw', '.content_maincontent_content', '#content_desc', '.content_desc'] }
    ];

    // 通用正文容器选择器（按顺序尝试）
    var GENERIC_SELECTORS = [
        '[itemprop="articleBody"]',
        '#js_content',
        '.rich_media_content',
        '#articleContent',
        '#artibody',
        '#content_views',
        '#cnblogs_post_body',
        '.article-content',
        '.article_content',
        '.article__content',
        '.article-body',
        '.article-body-content',
        '.post_body',
        '.post-content',
        '.entry-content',
        '.content-article',
        '.markdown-body',
        '.rich-text',
        '.all-txt',
        '.syl-article-base',
        'article'
    ];

    // 广告 / 推荐 / 评论 / 分享 / 导航 / 免责声明等：命中则删除
    var NEGATIVE_RE = /(^|[\s_\-])(ad|ads|adv|advert\w*|sponsor\w*|promo\w*|banner|gg|guanggao|tuiguang|recommend\w*|related\w*|relate\w*|tuijian|hot\w*|rank\w*|comment\w*|pinglun|share\w*|fenxiang|sidebar|aside|navbar|nav|menu|footer|disclaimer|mianze|copyright|banquan|qrcode|qr-code|erweima|ewm|weixin|weibo|download\w*|appdownload|toolbar|breadcrumb|crumb|subscribe|newsletter|popup|dialog|modal|mask|skeleton|placeholder|pagination|pager|backtop|gotop|fav\w*|collect\w*|favorite\w*|follow\w*|like\w*|gift|pay\w*|vip|login|register|report\w*|jubao|feedback\w*|fankui|thumb\w*|next\w*|prev\w*|tag\w*|keyword\w*|topic\w*)([\s_\-]|$)/i;

    // 视频相关容器（仅在正文内部做清理，避免误伤整页容器选择）
    var VIDEO_RE = /(^|[\s_\-])(video\w*|player\w*|vplayer|bofang|bilibili|youku|qqvideo|tvp|media\w*)([\s_\-]|$)/i;

    // 正文中的「页脚式」文本：版权声明 / 责任编辑 / 扫码关注 / 举报 等
    var TRAILING_JUNK_RE = /^(本文系|本文为|本文来源|本文转载|本文仅|未经授权|版权归|版权声明|Copyright|免责声明|风险提示|特别声明|文章内容纯属|关注.{0,10}(微信|公众号)|扫码|责任编辑|责编|编辑：|来源：|记者：|举报|点击.{0,4}(下载|查看)|更多精彩内容|上一篇|下一篇)/;

    var DROP_TAGS = [
        'script', 'style', 'noscript', 'template', 'iframe', 'frame', 'frameset',
        'object', 'embed', 'video', 'audio', 'source', 'track', 'canvas', 'svg',
        'form', 'input', 'button', 'select', 'option', 'textarea', 'label',
        'nav', 'aside', 'footer', 'link', 'meta', 'base', 'map', 'area', 'dialog', 'slot'
    ];

    /* ================================================================
     * 基础工具
     * ================================================================ */

    function textOf(el) {
        if (!el) return '';
        return String(el.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function classIdOf(el) {
        if (!el) return '';
        var cls = '';
        if (typeof el.className === 'string') cls = el.className;
        else if (el.className && el.className.baseVal) cls = el.className.baseVal;
        else if (el.getAttribute) cls = el.getAttribute('class') || '';
        return ((el.id || '') + ' ' + cls).trim();
    }

    function tagOf(el) {
        return el && el.tagName ? String(el.tagName).toLowerCase() : '';
    }

    function childrenOf(el) {
        var out = [];
        if (!el || !el.children) return out;
        for (var i = 0; i < el.children.length; i++) out.push(el.children[i]);
        return out;
    }

    function unwrap(el) {
        var parent = el && el.parentNode;
        if (!parent) return;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
    }

    function absolute(href, base) {
        if (!href) return '';
        try { return new URL(href, base).href; } catch (e) { return href; }
    }

    function unescapeEntities(str) {
        var div = document.createElement('div');
        div.innerHTML = String(str).replace(/<\/textarea[\s\S]*$/i, '');
        return div.textContent || '';
    }

    function parseHtml(html) {
        return new DOMParser().parseFromString(html, 'text/html');
    }

    /** 元素内 <p> 的文本总量：正文判定的核心指标 */
    function pTextOf(el) {
        if (!el || !el.getElementsByTagName) return 0;
        var ps = el.getElementsByTagName('p');
        var n = 0;
        for (var i = 0; i < ps.length; i++) n += textOf(ps[i]).length;
        return n;
    }

    /** 链接文字占比：导航/聚合页该值很高 */
    function linkDensity(el) {
        var total = textOf(el).length;
        if (!total) return 0;
        var links = 0;
        var as = el.getElementsByTagName ? el.getElementsByTagName('a') : [];
        for (var i = 0; i < as.length; i++) links += Math.min(textOf(as[i]).length, 300);
        return Math.min(1, links / total);
    }

    function punctuationCount(t) {
        var m = t.match(/[，。！？；：、,.!?;:]/g);
        return m ? m.length : 0;
    }

    var POSITIVE_RE = /(^|[\s_\-])(article|content|post|text|txt|detail|main|body|entry|story|rich|markdown|paragraph|news)([\s_\-]|$)/i;

    function classNameWeight(el) {
        var s = classIdOf(el);
        var w = 0;
        if (POSITIVE_RE.test(s)) w += 0.6;
        if (NEGATIVE_RE.test(s)) w -= 1.5;
        if (P_V2.test(s)) w += 0.6;
        return w;
    }
    // 形如 cententWrap__UojXm / Article__StyleWrapper-sc-1dunux7-2 的语义化类名
    var P_V2 = /(wrapper|container|wrap|viewer|editor|rich|skeleton)/i;

    /** 元素是否够“像正文” */
    function acceptable(el) {
        if (!el) return false;
        if (/^(html|body|head)$/i.test(tagOf(el))) return false;
        if (NEGATIVE_RE.test(classIdOf(el))) return false;
        var pt = pTextOf(el);
        var tt = textOf(el).length;
        if (pt < 150 && tt < 400) return false;
        if (linkDensity(el) > 0.5) return false;
        return true;
    }

    /** 宽松判定：短文稿（如「一句话+一张图」的体育简讯）通不过上面的阈值，
        但仍可判定为正文；只排除空壳 / 导航聚合块 */
    function plausible(el) {
        if (!el) return false;
        if (/^(html|body|head)$/i.test(tagOf(el))) return false;
        if (NEGATIVE_RE.test(classIdOf(el))) return false;
        if (textOf(el).length < 30) return false;      // 排除空壳 / 零碎块
        if (linkDensity(el) > 0.5) return false;       // 排除导航、聚合列表
        return true;
    }

    /* ================================================================
     * 容器选择
     * ================================================================ */

    /**
     * @param {boolean} relaxed 站点专用选择器命中时的放宽模式：
     *        先找完全合格的，找不到再接受 plausible 的元素（站点规则是人工核对过的）
     */
    function trySelectors(doc, selectors, relaxed) {
        var fallbackHit = null;
        for (var i = 0; i < selectors.length; i++) {
            var list;
            try { list = doc.querySelectorAll(selectors[i]); } catch (e) { continue; }
            for (var j = 0; j < list.length; j++) {
                if (acceptable(list[j])) return list[j];
                if (relaxed && !fallbackHit && plausible(list[j])) fallbackHit = list[j];
            }
        }
        return fallbackHit;
    }

    /** Readability 式打分：<p> 文本量 + 标点密度 + class 权重 */
    function bestByScore(doc) {
        var body = doc.body;
        if (!body) return null;
        var scores = [];
        var index = new Map();

        function bump(el, v) {
            if (!el || !el.tagName) return;
            var t = tagOf(el);
            if (t === 'html' || t === 'body' || t === 'script' || t === 'style') return;
            var i = index.get(el);
            if (i === undefined) { index.set(el, scores.length); scores.push({ el: el, score: 0 }); i = index.get(el); }
            scores[i].score += v;
        }

        var paras = body.getElementsByTagName('p');
        for (var i = 0; i < paras.length; i++) {
            var p = paras[i];
            var t = textOf(p);
            if (t.length < 25) continue;
            var base = 1 + Math.min(t.length / 100, 3) + punctuationCount(t) * 0.1;
            var parent = p.parentElement;
            var grand = parent ? parent.parentElement : null;
            bump(parent, base);
            bump(grand, base / 2);
        }

        // 加入 class 权重（正/负）
        scores.forEach(function (item) {
            item.score *= Math.max(0.1, 1 + classNameWeight(item.el));
        });

        var best = null;
        scores.forEach(function (item) {
            if (!acceptable(item.el)) return;
            if (!best || item.score > best.score) best = item;
        });
        // 宽松兜底：短文稿没有任何元素达标时，取得分最高的 plausible 元素，
        // 而不是退回整个 <body>（那会把标题、导航、推荐位一起带进来）
        if (!best) {
            scores.forEach(function (item) {
                if (!plausible(item.el)) return;
                if (!best || item.score > best.score) best = item;
            });
        }
        return best ? best.el : null;
    }

    /** 顺着父节点上爬，把包裹层一起纳入（噪声过大则停止） */
    function refineContainer(el, doc) {
        var cur = el;
        var guard = 0;
        while (guard++ < 8) {
            var par = cur.parentElement;
            if (!par || par === doc.body || /^(HTML|BODY)$/i.test(tagOf(par))) break;
            if (NEGATIVE_RE.test(classIdOf(par))) break;
            var lc = pTextOf(cur);
            var lp = pTextOf(par);
            // 仅当父节点明显包含「更多正文段落」时才上爬（正文被拆成兄弟块的站点），
            // 否则容易把推荐位 / 相关阅读 / 页脚一起吞进来
            if (lp < lc * 1.1) break;
            var total = textOf(par).length;
            if (total > 0 && (total - lp) > total * 0.45) break;  // 非段落文字太多（导航/侧栏）
            if (linkDensity(par) > 0.35) break;
            cur = par;
        }
        return cur;
    }

    /** 正文被转义后放进 <textarea> 的形态（环球网等） */
    function fromEscapedTextarea(doc) {
        var tas = doc.getElementsByTagName('textarea');
        for (var i = 0; i < tas.length; i++) {
            var raw = (tas[i].textContent || tas[i].value || '').trim();
            if (raw.length < 200) continue;
            // 双重转义：&lt;p&gt;
            if (/&lt;\s*(p|div|article|section|h[1-6])\b/i.test(raw)) return unescapeEntities(raw);
            // 已经是 HTML 文本（textarea 会把 &lt; 解析回 "<"）
            if (/<(p|div|article|section|h[1-6])[\s>]/i.test(raw)) return raw;
        }
        return null;
    }

    function pickContainer(doc, url) {
        var host = '';
        try { host = new URL(url).hostname; } catch (e) { host = ''; }

        // 1) 站点专用选择器（放宽阈值：短文稿也认）
        for (var i = 0; i < SITE_RULES.length; i++) {
            if (!SITE_RULES[i].host.test(host)) continue;
            var hit = trySelectors(doc, SITE_RULES[i].sel, true);
            if (hit) return { el: refineContainer(hit, doc), doc: doc };
        }

        // 2) 通用选择器
        var generic = trySelectors(doc, GENERIC_SELECTORS);
        // 3) 打分兜底
        var scored = bestByScore(doc);

        var chosen = null;
        if (generic && scored) chosen = pTextOf(generic) >= pTextOf(scored) ? generic : scored;
        else chosen = generic || scored;

        if (!chosen) chosen = doc.body;
        return { el: refineContainer(chosen, doc), doc: doc };
    }

    /* ================================================================
     * 清洗
     * ================================================================ */

    function removeByTag(container, tags) {
        tags.forEach(function (tag) {
            var list = container.getElementsByTagName(tag);
            while (list.length) list[0].parentNode.removeChild(list[0]);
        });
    }

    function cleanContainer(container, pageUrl) {
        // 自定义元素（含 "-" 的标签）：一般是无意义容器，解包保留内部内容
        var customs = [];
        var all = container.getElementsByTagName('*');
        for (var i = 0; i < all.length; i++) {
            if (tagOf(all[i]).indexOf('-') > -1) customs.push(all[i]);
        }
        customs.forEach(unwrap);

        // 仅包裹图片的行内样式元素（<i class="pic-con"><img></i> 之类）解包，
        // 否则转 markdown 后图片会被包进 *…* 斜体标记里
        var wrapperTags = ['i', 'em', 'b', 'strong', 'span', 'font', 'small', 'u'];
        wrapperTags.forEach(function (tag) {
            var list = Array.prototype.slice.call(container.getElementsByTagName(tag));
            list.forEach(function (el) {
                if (textOf(el)) return;
                if (!el.getElementsByTagName('img').length) return;
                unwrap(el);
            });
        });

        // 黑名单标签
        removeByTag(container, DROP_TAGS);

        // 黑名单 class/id（含正文段落较多的容器不动，防误伤）
        var nodes = Array.prototype.slice.call(container.getElementsByTagName('*'));
        nodes.forEach(function (el) {
            // 图片不按类名删：如 class="thumb-selected" 恰恰是正文大图（thumb-* 命中黑名单），
            // 图片的取舍统一交给 fixImages 的「meta + src」规则判断
            if (tagOf(el) === 'img') return;
            var cls = classIdOf(el);
            if (!cls) return;
            if (NEGATIVE_RE.test(cls)) {
                if (pTextOf(el) >= 500) return;
                if (el.parentNode) el.parentNode.removeChild(el);
                return;
            }
            if (VIDEO_RE.test(cls)) {
                if (pTextOf(el) >= 120) return;
                if (el.parentNode) el.parentNode.removeChild(el);
            }
        });

        // 图片与图注要在「页脚噪声清理」之前处理：
        // 「来源：xxx」这类署名行既可能是页脚噪声，也可能是图片下方的图注，
        // 紧跟在图片后的一律按图注保留（其余仍按噪声删除）
        fixImages(container, pageUrl);
        markCaptions(container);

        // 推荐位截断
        truncateAtJunkHeading(container);

        // 编辑 / 来源署名行要在「页脚噪声清理」之前标记，否则会被当成页脚删除
        markEditorLines(container);

        // 版权声明 / 责任编辑 / 扫码关注 等页脚式文本
        var textNodes = Array.prototype.slice.call(container.getElementsByTagName('*'));
        textNodes.forEach(function (el) {
            if (el.classList && (el.classList.contains('article-editor') ||
                el.classList.contains('img-caption'))) return;   // 署名行 / 图注保留
            if (el.getElementsByTagName('p').length) return;
            var t = textOf(el);
            if (!t || t.length > 260) return;
            var junk = TRAILING_JUNK_RE.test(t) ||
                       (t.length <= 60 && /(责任编辑|【纠错】|纠错\s*$|扫码|版权声明|免责声明|未经授权|转载请注明|举报)/.test(t));
            if (junk) {
                if (el.parentNode) el.parentNode.removeChild(el);
            }
        });

        // 仅含分隔符的强调元素（如作者/时间之间的 <i>·</i>）解包，
        // 否则转 markdown 会输出 *·* 这类噪声
        ['i', 'em', 'b', 'strong'].forEach(function (tag) {
            Array.prototype.slice.call(container.getElementsByTagName(tag)).forEach(function (el) {
                var t = textOf(el);
                if (!t || t.length > 4) return;
                if (/[\w\u4e00-\u9fa5\u3040-\u30ff]/.test(t)) return;
                unwrap(el);
            });
        });

        // 去掉所有 on* 内联事件属性
        var withAttrs = container.getElementsByTagName('*');
        for (var a = 0; a < withAttrs.length; a++) {
            var attrs = withAttrs[a].attributes;
            if (!attrs) continue;
            for (var b = attrs.length - 1; b >= 0; b--) {
                if (/^on/i.test(attrs[b].name)) withAttrs[a].removeAttribute(attrs[b].name);
            }
        }

        fixLinks(container, pageUrl);
        markArticleMeta(container);   // 依赖 fixLinks 处理过的绝对链接
        normalizeBlocks(container);
    }

    var LAZY_ATTRS = ['data-src', 'data-original', 'data-lazy-src', 'data-echo', 'data-url', 'data-actualsrc', 'data-original-src'];

    function pickImageSrc(img) {
        var src = '';
        for (var i = 0; i < LAZY_ATTRS.length; i++) {
            var v = img.getAttribute(LAZY_ATTRS[i]);
            if (v && v.trim()) { src = v.trim(); break; }
        }
        if (!src) src = (img.getAttribute('src') || '').trim();
        if (!src) {
            var srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset') || '';
            var first = srcset.split(',')[0] || '';
            src = first.trim().split(/\s+/)[0] || '';
        }
        return src;
    }

    function fixImages(container, pageUrl) {
        var imgs = Array.prototype.slice.call(container.getElementsByTagName('img'));
        imgs.forEach(function (img) {
            var src = pickImageSrc(img);
            var meta = classIdOf(img) + ' ' + (img.getAttribute('alt') || '') + ' ' + (img.getAttribute('title') || '');
            var style = img.getAttribute('style') || '';
            var w = parseInt(img.getAttribute('width') || '0', 10);
            var h = parseInt(img.getAttribute('height') || '0', 10);

            // 相对路径先按页面地址解析（新华网等站点的正文图就是相对路径），再校验协议
            if (src) src = absolute(src, pageUrl);

            var drop = false;
            if (!src) drop = true;
            else if (!/^https?:\/\//i.test(src) && !/^data:image\//i.test(src)) drop = true;  // 过滤 javascript:/vbscript: 等
            else if (/^data:image\/(gif|png);base64,R0lGOD/i.test(src)) drop = true;   // 占位/透明图
            else if (/(qrcode|qr-code|erweima|ewm|weixin|weibo|avatar|logo|pixel|blank|spacer|loading|placeholder|icon-loading)/i.test(meta)) drop = true;
            else if (/(^|[/_.-])(banner|advert|ads?|promo|sponsor)([/_.-]|$)/i.test(src)) drop = true;   // 站方横幅/广告图
            else if (/display\s*:\s*none|visibility\s*:\s*hidden/i.test(style)) drop = true;
            else if (/(width|height)\s*:\s*1px/i.test(style)) drop = true;
            else if (h === 1 && w <= 2) drop = true;

            if (drop) {
                if (img.parentNode) img.parentNode.removeChild(img);
                return;
            }

            img.setAttribute('src', src);
            img.removeAttribute('width');
            img.removeAttribute('height');
            img.removeAttribute('style');
            LAZY_ATTRS.forEach(function (a) { img.removeAttribute(a); });
            img.removeAttribute('srcset');
            img.removeAttribute('data-srcset');
            if (!img.getAttribute('alt')) img.setAttribute('alt', '');

            // 正文图片统一居中（不论原站怎么排版）：转 markdown 时输出
            // <p class="img-center"><img …></p>，阅读时保持居中
            img.classList.add('img-center');
        });
    }

    /* 图片说明（图注 / 来源小字）：统一标记为 .img-caption，
       转 markdown 时输出内联 HTML，阅读模式下按灰色小字右对齐渲染 */
    var CAPTION_CLASS_RE = /(img-?desc|image-?desc|pic-?desc|pic-?text|img-?text|photo-?desc|phototext|caption|figcaption|describe)/i;
    var CAPTION_TEXT_RE = /^(图源|图片来源|图片说明|图片描述|来源|摄影|记者|新华社发|注：|▲|▼|图\/)|(图)$/;
    // 摄影师署名（如「陈艺文。中新社记者 崔楠 摄」）：紧跟在图片后、短文本、以署名结尾
    var CAPTION_CREDIT_RE = /(摄影|摄像|供图|记者|摄)[\s\u3000]*$/;
    // 「样式与正文不同」的信号：内联小字 / 变色 / 居中右对齐 / 类名像图注
    var CAPTION_STYLE_RE = /(font-size|color|opacity|font-family|background|line-height)/i;
    var CAPTION_LIKE_CLASS_RE = /(source|from|desc|cap|note|tip|small|gray|grey|sub|info|meta|tu-?wen|photo|pic|img)/i;

    function hasCaptionStyle(el) {
        var style = el.getAttribute('style') || '';
        if (/text-align\s*:\s*(center|right)/i.test(style)) return true;
        if (CAPTION_STYLE_RE.test(style)) return true;
        if (CAPTION_LIKE_CLASS_RE.test(classIdOf(el))) return true;
        return false;
    }

    function markCaptions(container) {
        var doc = container.ownerDocument || document;
        var nodes = Array.prototype.slice.call(container.querySelectorAll('p, div, span, figcaption, em, i, td'));

        nodes.forEach(function (el) {
            if (el.getElementsByTagName('img').length) return;                 // 自身含图，跳过
            if (el.getElementsByTagName('p').length || el.getElementsByTagName('div').length) return;

            var t = textOf(el);
            if (!t || t.length > 80) return;

            var isFigcaption = tagOf(el) === 'figcaption';
            var prevHasImg = !!(el.previousElementSibling &&
                el.previousElementSibling.getElementsByTagName('img').length);

            if (!isFigcaption) {
                if (!prevHasImg) return;                                        // 必须紧跟图片
                var byClass = CAPTION_CLASS_RE.test(classIdOf(el));
                var byText = CAPTION_TEXT_RE.test(t);
                // 摄影师署名：短文本 + 以「摄 / 记者 / 供图」结尾
                var byCredit = t.length <= 40 && CAPTION_CREDIT_RE.test(t);
                // 样式与正文不同（小字 / 变色 / 居中右对齐 / 类名像说明）也算图注
                var byStyle = hasCaptionStyle(el);
                if (!byClass && !byText && !byCredit && !byStyle) return;
            }

            var cap = doc.createElement('figcaption');
            cap.className = 'img-caption';
            cap.textContent = t;
            if (el.parentNode) el.parentNode.replaceChild(cap, el);
        });
    }

    /* 编辑 / 来源署名行：如「【编辑:曹子健】」「（责任编辑：张三）」，
       统一标记为 <p class="article-editor">，阅读时整行右对齐。
       要求整行（元素内全部文字）恰好就是这个标记，避免误伤正文。 */
    // 支持：【编辑:x】【责任编辑:x】【责编:x】【主编:x】（中英文括号、中英文冒号均可）
    var EDITOR_LINE_RE = /^[【\[（(]\s*(?:责任编辑|责\s*编|编辑|责编|主编)\s*[:：]\s*[^】\]）)]{1,20}\s*[】\]）)]$/;

    function markEditorLines(container) {
        var doc = container.ownerDocument || document;
        var nodes = Array.prototype.slice.call(container.querySelectorAll('p, div, span, li, td'));

        // 倒序处理：先命中内层（span），外层容器随后会被「已含 .article-editor」判断跳过
        for (var i = nodes.length - 1; i >= 0; i--) {
            var el = nodes[i];
            if (!el.parentNode) continue;
            if (el.querySelector && el.querySelector('.article-editor')) continue;
            if (el.getElementsByTagName('img').length) continue;
            if (el.getElementsByTagName('p').length || el.getElementsByTagName('div').length) continue;

            var t = textOf(el);
            if (!t || t.length > 40) continue;
            if (!EDITOR_LINE_RE.test(t)) continue;

            var p = doc.createElement('p');
            p.className = 'article-editor';
            p.textContent = t;
            el.parentNode.replaceChild(p, el);
        }
    }

    /* 标题下的「作者 · 时间」署名行（如 36氪 <div class="article-title-icon">腾讯研究院·2026年09月30日 17:42</div>）：
       只加类名、不动内部结构，转 markdown 时输出 <p class="article-meta">…</p>，
       阅读时小字右对齐、超链接保留但颜色变浅 */
    var META_TIME_RE = /\d{4}\s*[-/年]\s*\d{1,2}\s*[-/月]\s*\d{1,2}\s*日?(\s*\d{1,2}:\d{2})?/;
    var META_CLASS_RE = /(article-?title-?icon|title-?icon|article-?meta|article-?byline|byline|author-?info|article-?info|article-?source|article-?author)/i;

    /** 元素是否紧跟在标题之后（最多向前看两层） */
    function isAfterTitle(el) {
        var prev = el.previousElementSibling;
        var guard = 0;
        while (prev && guard++ < 2) {
            if (/^(H1|H2)$/i.test(tagOf(prev))) return true;
            if (/title/i.test(classIdOf(prev)) && textOf(prev)) return true;
            prev = prev.previousElementSibling;
        }
        return false;
    }

    function markArticleMeta(container) {
        var nodes = Array.prototype.slice.call(container.querySelectorAll('p, div, span, section'));
        nodes.forEach(function (el) {
            if (el.getElementsByTagName('img').length) return;
            if (el.getElementsByTagName('p').length || el.getElementsByTagName('div').length) return;   // 只看叶子块

            var t = textOf(el);
            if (!t || t.length > 60) return;
            if (!META_TIME_RE.test(t)) return;                                        // 必须带时间
            if (!META_CLASS_RE.test(classIdOf(el)) && !isAfterTitle(el)) return;      // 类名 或 紧跟标题

            el.className = 'article-meta';   // 保留内部 <a> 等结构，仅换类名
        });
    }

    function fixLinks(container, pageUrl) {
        var as = Array.prototype.slice.call(container.getElementsByTagName('a'));
        as.forEach(function (a) {
            var href = (a.getAttribute('href') || '').trim();
            if (!href || /^(javascript:|#|about:)/i.test(href)) {
                unwrap(a);
                return;
            }
            a.setAttribute('href', absolute(href, pageUrl));
            if (!textOf(a) && !a.getElementsByTagName('img').length) {
                if (a.parentNode) a.parentNode.removeChild(a);
            }
        });
    }

    // 推荐位小标题：一旦出现，说明正文到此结束，其后内容整体截断
    var JUNK_HEADING_RE = /^(最近内容|相关阅读|相关文章|相关推荐|相关新闻|推荐阅读|热门推荐|猜你喜欢|你可能也喜欢|你可能喜欢|更多内容|更多精彩|更多推荐|延伸阅读|精彩推荐|为你推荐|推荐给你|编辑推荐|编辑精选|大家都在看|热门文章|热门新闻|热点推荐|热点新闻|最新资讯|最新新闻|本周热文|更多资讯|下一篇|上一篇|Recommended|Related)/i;

    function textBefore(container, el) {
        try {
            var r = document.createRange();
            r.setStart(container, 0);
            r.setEndBefore(el);
            return r.toString();
        } catch (e) {
            return '';
        }
    }

    /** 删除 el 及其之后（在 container 范围内）的所有内容 */
    function truncateFrom(el, container) {
        var node = el;
        while (node && node !== container) {
            var sib = node.nextSibling;
            while (sib) {
                var next = sib.nextSibling;
                sib.parentNode.removeChild(sib);
                sib = next;
            }
            var parent = node.parentNode;
            if (!parent || parent === container) break;
            node = parent;
        }
        if (el.parentNode) el.parentNode.removeChild(el);
    }

    function truncateAtJunkHeading(container) {
        var heads = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
        for (var i = 0; i < heads.length; i++) {
            var t = textOf(heads[i]);
            if (!t || !JUNK_HEADING_RE.test(t)) continue;
            if (textBefore(container, heads[i]).length < 200) continue;   // 前文太短则不动，防误判
            truncateFrom(heads[i], container);
            return true;
        }
        return false;
    }

    var BLOCK_TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'figcaption', 'td', 'th'];

    // 段首的全角空格 / NBSP / em 空格是原文的段落缩进（如「　　中新网北京9月30日电」），
    // 必须保留：一是忠实还原原文，二是供「段前缩进」设置自动识别。
    // 只清理 HTML 源码换行缩进带来的半角空白；行尾空白一律清理。
    var LEADING_WS_RE = /^[ \t\r\n\f\v]+/;
    var TRAILING_WS_RE = /[\s\u00A0\u2002\u2003\u3000]+$/;

    function trimBlockText(el) {
        var first = el.firstChild;
        if (first && first.nodeType === 3) {
            first.textContent = first.textContent.replace(LEADING_WS_RE, '');
        }
        var last = el.lastChild;
        if (last && last.nodeType === 3) {
            last.textContent = last.textContent.replace(TRAILING_WS_RE, '');
        }
    }

    function normalizeBlocks(container) {
        // 空表格（画中画广告位、纯布局表格）没有任何文字与图片：
        // 先删掉，否则转 markdown 会输出 "| |" 这类无意义表格行
        Array.prototype.slice.call(container.getElementsByTagName('table')).forEach(function (t) {
            if (t.getElementsByTagName('img').length) return;
            if (textOf(t)) return;
            if (t.parentNode) t.parentNode.removeChild(t);
        });

        BLOCK_TAGS.forEach(function (tag) {
            var list = container.getElementsByTagName(tag);
            for (var i = 0; i < list.length; i++) trimBlockText(list[i]);
        });

        // 自内向外删除空壳元素（保留含图片/表格/代码/换行的元素）
        var holders = Array.prototype.slice.call(
            container.querySelectorAll('p, div, section, span, li, blockquote, figure, article')
        );
        for (var k = holders.length - 1; k >= 0; k--) {
            var el = holders[k];
            if (el.getElementsByTagName('img').length) continue;
            if (el.getElementsByTagName('table').length) continue;
            if (el.getElementsByTagName('pre').length) continue;
            if (el.getElementsByTagName('br').length) continue;
            if (textOf(el)) continue;
            if (el.parentNode) el.parentNode.removeChild(el);
        }
    }

    /* ================================================================
     * 标题
     * ================================================================ */

    function metaContents(doc, key) {
        var out = [];
        var metas = doc.getElementsByTagName('meta');
        for (var i = 0; i < metas.length; i++) {
            var p = (metas[i].getAttribute('property') || metas[i].getAttribute('name') || '').toLowerCase();
            if (p === key) {
                var c = metas[i].getAttribute('content');
                if (c) out.push(c);
            }
        }
        return out;
    }

    /** 去掉「标题-站点名」这类后缀（仅当后缀明显短且不像正文时） */
    function stripSiteSuffix(t) {
        t = String(t || '').replace(/\s+/g, ' ').trim();
        for (var i = 0; i < 3; i++) {
            var m = t.match(/^([\s\S]{8,})\s*[-–—_|]\s*([^-–—_|]{2,20})$/);
            if (!m) break;
            var head = m[1].trim();
            var tail = m[2].trim();
            if (/[，。：；！？、,.!?]/.test(tail)) break;
            if (tail.length * 2 > head.length) break;
            t = head;
        }
        return t;
    }

    function extractTitle(doc, url) {
        var cands = [];

        // textarea.article-title（环球网等）
        var tas = doc.getElementsByTagName('textarea');
        for (var i = 0; i < tas.length; i++) {
            var cls = classIdOf(tas[i]);
            if (/title/i.test(cls)) {
                var v = (tas[i].textContent || '').trim();
                if (v && v.length < 200) cands.push(v);
            }
        }
        metaContents(doc, 'og:title').forEach(function (t) { cands.push(stripSiteSuffix(t)); });
        metaContents(doc, 'twitter:title').forEach(function (t) { cands.push(stripSiteSuffix(t)); });

        var h1 = doc.getElementsByTagName('h1');
        if (h1.length) cands.push(textOf(h1[0]));

        cands.push(stripSiteSuffix(doc.title || ''));

        for (var k = 0; k < cands.length; k++) {
            var s = String(cands[k] || '').replace(/\s+/g, ' ').trim();
            if (s && s.length > 1 && !/^(untitled|无标题)$/i.test(s)) return s;
        }
        try { return decodeURIComponent(new URL(url).pathname).split('/').pop() || url; }
        catch (e) { return url; }
    }

    /* ================================================================
     * 主导出：HTML → { title, container, doc }
     * ================================================================ */

    function extractFromDoc(doc, url) {
        // 1) 转义 textarea 形态
        var escaped = fromEscapedTextarea(doc);
        if (escaped) {
            var inner = parseHtml(escaped);
            var target = inner.body;
            var kids = childrenOf(target).filter(function (c) { return !/^(script|style|link)$/i.test(tagOf(c)); });
            if (kids.length === 1 && /^(article|section|div)$/i.test(tagOf(kids[0]))) target = kids[0];
            cleanContainer(target, url);
            return { title: extractTitle(doc, url), container: target, doc: inner };
        }

        // 2) 常规形态
        var picked = pickContainer(doc, url);
        cleanContainer(picked.el, url);
        return { title: extractTitle(doc, url), container: picked.el, doc: doc };
    }

    /** 输入完整 HTML 文本，输出 { title, html } */
    function extractArticle(html, url) {
        var doc = parseHtml(html);
        var res = extractFromDoc(doc, url);
        return { title: res.title, html: res.container.innerHTML || '', url: url };
    }

    function buildMarkdown(title, container) {
        var md = window.Mojian.htmlToMarkdown(container.innerHTML || '');
        if (!md) md = '';
        // 正文里没有与文章标题一致的标题时，补一个一级标题，保持标题层级
        var hasTitleHeading = false;
        var hs = container.querySelectorAll('h1, h2');
        for (var i = 0; i < hs.length; i++) {
            if (textOf(hs[i]) === title) { hasTitleHeading = true; break; }
        }
        if (title && !hasTitleHeading) md = '# ' + title + '\n\n' + md;
        // 只清 ASCII 空白：不能 trim()，否则无标题文章的段首全角缩进会被吃掉
        return md.replace(/\n{3,}/g, '\n\n').replace(/^[\t\r\n ]+/, '').replace(/[\t\r\n ]+$/, '');
    }

    /* ================================================================
     * 抓取
     * ================================================================ */

    function decodeBuffer(buffer, contentType) {
        var bytes = new Uint8Array(buffer);
        var charset = (String(contentType || '').match(/charset=["']?([\w-]+)/i) || [])[1];
        if (!charset) {
            var head = '';
            var n = Math.min(bytes.length, 4096);
            for (var i = 0; i < n; i++) head += String.fromCharCode(bytes[i]);
            charset = (head.match(/charset=["']?([\w-]+)/i) || [])[1] || 'utf-8';
        }
        try {
            return new TextDecoder(charset, { fatal: false }).decode(bytes);
        } catch (e) {
            return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        }
    }

    function requestText(target, timeout) {
        var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var ms = timeout || REMOTE_TIMEOUT;
        var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms);
        // credentials 必须带本站 Cookie：免费虚拟主机（iFastNet / InfinityFree 系，如 iceiy.com）
        // 会给「没有 __test Cookie」的请求返回一段 aes.js 挑战页（HTTP 200 + text/html），
        // 用 'omit' 时浏览器连本站请求也不带 Cookie，探活拿到的就是挑战页、JSON 解析失败，
        // 于是同源 proxy.php 被误判为「不存在」而整个通道被跳过。'same-origin' 只对本站请求
        // 带 Cookie，跨域的公共代理仍然不带（等同于原来的 'omit'）。
        var opts = { credentials: 'same-origin', redirect: 'follow', referrerPolicy: 'no-referrer', cache: 'no-store' };
        if (ctrl) opts.signal = ctrl.signal;

        return fetch(target, opts).then(function (res) {
            var ct = res.headers.get('content-type') || '';
            var viaElapsed = res.headers.get('x-proxy-elapsed');
            var proxyVia = res.headers.get('x-proxy-via') || '';
            if (!res.ok) {
                // 代理失败时会带上原因（如 curl 错误），一并抛出来便于排查；
                // 429（限速）/ 401（令牌不对）要把状态码带给调用方，走专门的提示
                return res.text().then(function (t) {
                    var extra = String(t || '').replace(/\s+/g, ' ').trim().slice(0, 100);
                    var e = new Error('HTTP ' + res.status + (extra ? ' · ' + extra : ''));
                    e.status = res.status;
                    e.retryAfter = parseInt(res.headers.get('retry-after') || '0', 10) || 0;
                    throw e;
                });
            }
            return res.arrayBuffer().then(function (buf) {
                clearTimeout(timer);
                if (buf.byteLength > MAX_HTML_BYTES) throw new Error('TOO_LARGE');
                return {
                    text: decodeBuffer(buf, ct),
                    contentType: ct,
                    proxyElapsed: viaElapsed,
                    proxyVia: proxyVia
                };
            });
        }).catch(function (err) {
            clearTimeout(timer);
            if (err && (err.name === 'AbortError' || /abort/i.test(err.message || ''))) {
                throw new Error('超时(' + Math.round(ms / 1000) + 's)');
            }
            if (err instanceof TypeError) throw new Error('网络不可达/被跨域策略拦截');
            throw err;
        });
    }

    function looksLikeHtml(t) {
        return typeof t === 'string' && t.length > 200 &&
            /<html[\s>]|<body[\s>]|<!doctype\s+html/i.test(t.slice(0, 4000));
    }

    /**
     * 是否是免费虚拟主机的「反爬挑战页」
     *
     * iFastNet / InfinityFree 系（iceiy.com 等）会给没有 __test Cookie 的请求返回一个
     * 约 1KB 的页面：加载 /aes.js 解密出 __test 写进 Cookie 再跳回 ?i=1。
     * 这种页面同样是 <html>，会被 looksLikeHtml 判为「正常网页」，
     * 于是解析器把挑战页当正文，最后报「未识别到正文」——需要提前识别出来。
     */
    function looksLikeChallenge(t) {
        return typeof t === 'string' && t.length < 8192 &&
            /__test=/.test(t) && /(aes\.js|slowAES)/i.test(t);
    }

    /**
     * 是否是「目标站自己的 WAF 挑战页」
     *
     * 和上面那条不同：这条说的是**目标网站**在刁难我们这一侧的服务端。
     * 例如掘金（字节系）会给可疑来源（机房 IP、非浏览器 TLS 指纹）返回一个约 2KB 的
     * JS 挑战页（waf-jschallenge / out-sha256.js），浏览器能解、PHP 的 curl 不能解，
     * 所以服务端永远抓不到正文。这类页面同样是 text/html，不识别出来就会走到
     * 「正文为空」那条更含糊的报错上。
     * 判定依据：页面很小 + 含挑战特征（字节系 waf / Cloudflare 盾页）。
     */
    function looksLikeWafChallenge(t) {
        if (typeof t !== 'string' || !t || t.length > 12000) return false;
        return /(waf-jschallenge|out-sha256\.js|waf_js|__cf_chl_|cdn-cgi\/challenge|Just a moment\.\.\.)/i.test(t);
    }

    /** 抓到的正文容器是否可用（短稿只要有段落或图片也算） */
    function isUsableBody(c) {
        if (!c) return false;
        var bodyText = textOf(c).length;
        if (bodyText >= 120) return true;
        return pTextOf(c) >= 40 || c.getElementsByTagName('img').length > 0;
    }

    /** 探活同源 proxy.php（5s 内无响应即视为不可用；免费虚拟主机首次编译 PHP 可能偏慢） */
    function probeLocalProxy() {
        return requestText(LOCAL_PROXY_PING, 5000).then(function (res) {
            var info = null;
            try { info = JSON.parse(res.text); } catch (e) {}
            if (info && info.ok) {
                console.info('[url-import] 同源代理可用：proxy.php（PHP ' + info.php +
                    '，curl=' + (info.curl ? 'on' : 'off') + '，allow_url_fopen=' + (info.fopen ? 'on' : 'off') + '）');
                return true;
            }
            if (looksLikeChallenge(res.text)) {
                console.warn('[url-import] 探活拿到的是主机反爬挑战页（缺少 __test Cookie），' +
                    '本次跳过同源 proxy.php；请刷新页面、通过主机挑战后再试。');
                return false;
            }
            console.info('[url-import] 同源 proxy.php 探活返回的不是预期 JSON，本次跳过该通道。');
            return false;
        }).catch(function (err) {
            console.info('[url-import] 未检测到同源代理 proxy.php：' + ((err && err.message) || err));
            return false;
        });
    }

    /**
     * 依次尝试各抓取通道，返回 { text, contentType, via }
     * @param {Function} [validate] 内容校验函数（默认要求是网页 HTML；接口兜底时传入宽松校验）
     */
    function fetchHtml(url, validate) {
        var check = validate || looksLikeHtml;
        return probeLocalProxy().then(function (hasLocal) {
            // 同源代理可用时才启用该通道（避免无 php 环境下白等一个超时）
            var channels = FETCH_CHANNELS.filter(function (ch) { return hasLocal || !ch.local; });

            var attempts = channels.map(function (ch) {
                return {
                    name: ch.name,
                    local: !!ch.local,
                    timeout: ch.timeout,
                    target: ch.template ? ch.template.replace('{url}', encodeURIComponent(url)) : url
                };
            });

            // 限速 / 令牌错误属于「本渠道被拒」，要继续试公共代理没有意义，
            // 记下来后立刻放弃剩余通道，让上层给出明确提示
            var fatal = null;
            // 目标站 WAF 挑战：所有通道都可能撞上，单独记一笔好在全失败时给出准确原因
            var wafBlocked = false;

            return attempts.reduce(function (chain, attempt) {
                return chain.catch(function () {
                    if (fatal) return Promise.reject(new Error(fatal.code));
                    return requestText(attempt.target, attempt.timeout).then(function (res) {
                        // 挑战页长得像网页，但不是内容：先拦掉，避免把挑战页当正文解析
                        if (looksLikeChallenge(res.text)) {
                            throw new Error('拿到的是本站主机的反爬挑战页（刷新页面通过挑战后再试）');
                        }
                        if (looksLikeWafChallenge(res.text)) {
                            wafBlocked = true;
                            throw new Error('目标站返回 WAF 挑战页（服务端无 JS 执行能力，无法通过）');
                        }
                        if (!check(res.text)) throw new Error('返回内容格式不符');
                        res.via = attempt.name;
                        var viaNote = res.proxyVia === 'waf-solved'
                            ? '（服务端解了目标站的 WAF 挑战）'
                            : (res.proxyVia === 'fallback'
                                ? '（直连被目标站 WAF 挡住，已改走 proxy.php 的备用端点）'
                                : '');
                        console.info('[url-import] 通过「' + attempt.name + '」抓取成功' +
                            (viaNote ? viaNote : '') +
                            (res.proxyElapsed ? '（服务端耗时 ' + res.proxyElapsed + 'ms）' : ''));
                        return res;
                    }).catch(function (err) {
                        // 429 / 401 / 403 的「专用提示」只对同源 proxy.php 成立；
                        // 公共代理返回 429/401/403 时若也走这里，会误报成限速或令牌问题
                        if (attempt.local && err && (err.status === 429 || err.status === 401)) {
                            fatal = {
                                code: err.status === 429 ? 'RATE_LIMITED' : 'UNAUTHORIZED',
                                retryAfter: err.retryAfter || 0
                            };
                            return Promise.reject(new Error(fatal.code));
                        }
                        if (attempt.local && err && err.status === 403) {
                            // 同源校验拒绝：多见于「反代改写了 Host」或跨站页面调用代理，
                            // 不是内容问题，继续试公共代理仍可能成功，所以只提示不中断
                            console.warn('[url-import] 通道「' + attempt.name + '」被同源校验拒绝（403）:',
                                (err && err.message) || err,
                                '\n  proxy.php 只接受本站页面发起的抓取；若你用了反向代理，' +
                                '请把站点域名填进 proxy.php 顶部的 $EXTRA_ALLOWED_HOSTS。');
                            return Promise.reject(err);
                        }
                        console.warn('[url-import] 通道「' + attempt.name + '」失败:', (err && err.message) || err);
                        return Promise.reject(err);
                    });
                });
            }, Promise.reject(new Error('START'))).catch(function (err) {
                if (fatal) {
                    var denied = new Error(fatal.code);
                    denied.retryAfter = fatal.retryAfter;
                    throw denied;
                }
                if (wafBlocked) {
                    // 目标站有 WAF（掘金等字节系站点最常见）：服务端 curl 解不了 JS 挑战，
                    // 换通道也没用，直接给出准确原因，别再报「正文为空」
                    console.warn('[url-import] 目标站启用了 WAF 反爬，服务端抓不到正文：' + url + '\n' +
                        '  本站抓取走的是服务器出口 IP（机房/共享 IP 常被 WAF 挑战），' +
                        '浏览器直连又受跨域限制，因此这类站点在虚拟主机上抓不到；\n' +
                        '  出路是把「这一层检查」交给出口 IP 干净的一方：' +
                        '在 proxy.php 顶部配置 $FALLBACK_FETCH（自建 VPS / 家宽隧道 / 支持 JS 渲染的抓取 API），' +
                        '直连撞到 WAF 挑战页时会自动改走它；\n' +
                        '  本地 php -S（家宽 IP）通常可以直接抓，可作为替代方案。');
                    throw new Error('WAF_BLOCKED');
                }
                if (!hasLocal) {
                    console.warn('[url-import] 未检测到可用的同源 proxy.php（本次未尝试该通道）。\n' +
                        '  · 线上 PHP 虚拟主机：地址栏直接打开 <站点>/proxy.php?ping=1 应返回 JSON；\n' +
                        '    若返回 HTML（免费主机的反爬挑战页），先刷新页面通过挑战再重试；\n' +
                        '  · 本地无 PHP 服务：在项目目录执行\n' +
                        '      PowerShell:  $env:PHP_CLI_SERVER_WORKERS=4; php -S localhost:8081\n' +
                        '    然后访问 http://localhost:8081/index.html，即可通过同源代理抓取，彻底绕开 CORS。\n' +
                        '    （PHP 内置服务器默认单线程，加 WORKERS 可避免抓取期间阻塞页面其它请求）');
                } else {
                    console.warn('[url-import] 同源代理与公共代理均未成功。可先在地址栏直接打开 ' +
                        '"proxy.php?url=<目标地址>" 查看服务端返回的具体原因（服务端耗时见响应头 X-Proxy-Elapsed）。');
                }
                throw new Error('ALL_FAILED');
            });
        });
    }

    /* ================================================================
     * 站点 JSON 接口兜底
     * 华尔街见闻 / 今日头条的页面 HTML 是纯前端渲染的空壳，正文只在接口里
     * ================================================================ */

    var SITE_API_RULES = [
        {
            name: 'wallstreetcn',
            host: /(^|\.)wallstreetcn\.com$/i,
            idPattern: /\/articles\/(\d+)/i,
            apiUrl: function (id) { return 'https://api-one.wallstcn.com/apiv1/content/articles/' + id + '?extract=0'; },
            content: ['data.content', 'data.content_short'],
            title: ['data.title'],
            author: ['data.author.display_name', 'data.source_name'],
            authorUrl: ['data.author.uri'],
            time: ['data.display_time']
        },
        {
            name: 'toutiao',
            host: /(^|\.)toutiao\.com$/i,
            idPattern: /\/(?:article|i)\/?(\d{15,})/i,
            apiUrl: function (id) { return 'https://m.toutiao.com/i' + id + '/info/'; },
            content: ['data.content'],
            title: ['data.title'],
            author: ['data.source', 'data.media_user.screen_name'],
            time: ['data.publish_time']
        }
    ];

    function pickPath(obj, path) {
        var cur = obj;
        var parts = String(path).split('.');
        for (var i = 0; i < parts.length; i++) {
            if (cur === null || cur === undefined) return undefined;
            cur = cur[parts[i]];
        }
        return cur;
    }

    function firstString(obj, paths) {
        for (var i = 0; i < paths.length; i++) {
            var v = pickPath(obj, paths[i]);
            if (typeof v === 'string' && v.trim()) return v.trim();
        }
        return '';
    }

    function firstNumber(obj, paths) {
        for (var i = 0; i < paths.length; i++) {
            var v = pickPath(obj, paths[i]);
            if (typeof v === 'number' && isFinite(v) && v > 0) return v;
        }
        return 0;
    }

    function findApiRule(url) {
        var host = '';
        try { host = new URL(url).hostname; } catch (e) { return null; }
        for (var i = 0; i < SITE_API_RULES.length; i++) {
            if (SITE_API_RULES[i].host.test(host)) return SITE_API_RULES[i];
        }
        return null;
    }

    function formatDateTime(sec) {
        var d = new Date(sec * 1000);
        if (isNaN(d.getTime())) return '';
        var pad = function (n) { return (n < 10 ? '0' : '') + n; };
        return d.getFullYear() + '年' + pad(d.getMonth() + 1) + '月' + pad(d.getDate()) + '日 ' +
            pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    /** 用接口数据拼「作者 · 时间」署名行（复用 .article-meta 样式） */
    function buildApiMeta(json, rule) {
        var author = firstString(json, rule.author || []);
        var authorUrl = firstString(json, rule.authorUrl || []);
        var ts = rule.time ? firstNumber(json, rule.time) : 0;
        var time = ts ? formatDateTime(ts) : '';
        if (!author && !time) return null;

        var p = document.createElement('p');
        p.className = 'article-meta';
        if (author) {
            if (authorUrl) {
                var a = document.createElement('a');
                a.setAttribute('href', authorUrl);
                a.textContent = author;
                p.appendChild(a);
            } else {
                p.appendChild(document.createTextNode(author));
            }
            if (time) p.appendChild(document.createTextNode('·' + time));
        } else {
            p.appendChild(document.createTextNode(time));
        }
        return p;
    }

    /**
     * 走站点接口取正文（返回 { title, container }，不可用时返回 null）
     * 取到的 HTML 会走与网页正文完全相同的清洗 + 转换流程
     */
    function fetchArticleByApi(url) {
        var rule = findApiRule(url);
        if (!rule) return Promise.resolve(null);
        var m = String(url).match(rule.idPattern);
        if (!m) return Promise.resolve(null);

        var looseCheck = function (t) { return typeof t === 'string' && t.length > 20; };
        return fetchHtml(rule.apiUrl(m[1]), looseCheck).then(function (res) {
            var json = null;
            try { json = JSON.parse(res.text); } catch (e) { return null; }

            var html = firstString(json, rule.content);
            if (!html) return null;

            var doc = parseHtml('<body><div id="md-api-root">' + html + '</div></body>');
            var container = doc.getElementById('md-api-root');
            if (!container) return null;

            var meta = buildApiMeta(json, rule);
            if (meta) container.insertBefore(meta, container.firstChild);

            cleanContainer(container, url);
            console.info('[url-import] 页面无正文，已改用「' + rule.name + '」接口抓取正文');
            return { title: firstString(json, rule.title), container: container };
        }).catch(function (err) {
            // 限速 / 令牌错误要透给用户，不能被兜底悄悄吞掉
            if (err && (err.message === 'RATE_LIMITED' || err.message === 'UNAUTHORIZED')) throw err;
            console.warn('[url-import] 「' + rule.name + '」接口兜底失败:', (err && err.message) || err);
            return null;
        });
    }

    /* ================================================================
     * 渲染到预览（阅读）模式
     * ================================================================ */

    function renderArticle(title, markdown, url) {
        var M = window.Mojian;
        var state = M.state;
        var elements = M.elements;
        var name = title || url;

        // 记下来源链接：用于「重复导入同一链接」判定与页面刷新后的状态恢复
        state.currentFile = { name: name, sourceUrl: url };

        // 按来源站点套用阅读偏好：该站点的段前缩进 + 图片显示
        //（首次导入先识别原文缩进并记录，之后同站文章沿用；不同站点各记各的）
        if (M.applySitePrefs) {
            markdown = M.applySitePrefs(markdown, url);
        } else if (M.applyDetectedParagraphIndent) {
            // 段前缩进：默认识别原文（有则保留、无则保持无）；环球网 / 观察者网按中文排版
            // 习惯统一补 2 字；两种情况都把结果写回设置项
            markdown = M.applyDetectedParagraphIndent(markdown, url);
        }
        state.content = markdown;

        M.showReadingMode(name);
        M.renderContent(markdown);

        // 图片加 no-referrer，尽量绕过站点防盗链
        var imgs = elements.markdownContent.getElementsByTagName('img');
        for (var i = 0; i < imgs.length; i++) {
            imgs[i].setAttribute('referrerpolicy', 'no-referrer');
            imgs[i].setAttribute('loading', 'lazy');
            imgs[i].setAttribute('decoding', 'async');
        }

        if (M.saveContent) M.saveContent(name, markdown);
        if (M.updateReadingStats) M.updateReadingStats(state.wordCount);
        if (M.updateStatusBarDisplay) M.updateStatusBarDisplay();
    }

    /* ================================================================
     * 已解析链接的本地缓存（同一链接再次导入时不必重新抓取）
     * ================================================================ */

    var PARSED_CACHE_MAX = 20;
    var parsedCache = [];              // [{ key, title, markdown }]，最近使用在前

    /** 归一化地址：忽略首尾空白与结尾斜杠，避免同链接因写法差异重复抓取 */
    function normalizeUrl(url) {
        return String(url || '').trim().replace(/\/+$/, '');
    }

    function cacheGet(url) {
        var key = normalizeUrl(url);
        for (var i = 0; i < parsedCache.length; i++) {
            if (parsedCache[i].key === key) {
                var hit = parsedCache.splice(i, 1)[0];   // LRU：命中后提到最前
                parsedCache.unshift(hit);
                return hit;
            }
        }
        return null;
    }

    function cachePut(url, title, markdown) {
        var key = normalizeUrl(url);
        if (!key || !markdown) return;
        for (var i = parsedCache.length - 1; i >= 0; i--) {
            if (parsedCache[i].key === key) parsedCache.splice(i, 1);
        }
        parsedCache.unshift({ key: key, title: title, markdown: markdown });
        if (parsedCache.length > PARSED_CACHE_MAX) parsedCache.length = PARSED_CACHE_MAX;
    }

    /* ================================================================
     * 对外入口
     * ================================================================ */

    var importing = false;

    function importFromUrl(url) {
        var M = window.Mojian;
        if (!M || !M.state) return;
        if (importing) return;

        var t = (typeof i18n !== 'undefined' && i18n.t) ? i18n.t.bind(i18n) : function (k) { return k; };

        // 1) 正在阅读的就是这个链接：不抓取也不解析
        var current = M.state.currentFile;
        if (current && current.sourceUrl &&
            normalizeUrl(current.sourceUrl) === normalizeUrl(url)) {
            M.showToast(t('toast.urlImportSame') || '当前已是该链接的内容，无需重复导入');
            return;
        }

        // 2) 之前解析过同一链接：直接用本地缓存渲染，省掉一次抓取（也不占用代理限速额度）
        var cached = cacheGet(url);
        if (cached) {
            renderArticle(cached.title, cached.markdown, url);
            M.showToast(t('toast.urlImportFromCache') || '已从本地缓存载入');
            return;
        }

        importing = true;
        M.showToast(t('toast.urlImporting') || '正在抓取并解析链接内容…');

        fetchHtml(url).then(function (res) {
            var doc = parseHtml(res.text);
            var out = extractFromDoc(doc, url);
            if (isUsableBody(out.container)) {
                var markdown = buildMarkdown(out.title, out.container);
                renderArticle(out.title, markdown, url);
                cachePut(url, out.title, markdown);
                M.showToast(t('toast.urlImportSuccess') || '链接内容已导入');
                return null;
            }

            // 页面是纯前端渲染的空壳（华尔街见闻 / 今日头条等）→ 改用站点接口取正文
            return fetchArticleByApi(url).then(function (apiOut) {
                if (!apiOut) throw new Error('EMPTY_CONTENT');
                var apiMarkdown = buildMarkdown(apiOut.title, apiOut.container);
                if (!apiMarkdown) throw new Error('EMPTY_CONTENT');
                renderArticle(apiOut.title, apiMarkdown, url);
                cachePut(url, apiOut.title, apiMarkdown);
                M.showToast(t('toast.urlImportSuccess') || '链接内容已导入');
            });
        }).catch(function (err) {
            var msg;
            if (err && err.message === 'RATE_LIMITED') {
                // 代理限速：告知还需等待多久，不做其它兜底尝试
                var wait = Math.max(1, Math.round(err.retryAfter || 60));
                msg = (t('toast.urlImportRateLimited', { seconds: wait })) ||
                    ('抓取过于频繁，请等待 ' + wait + ' 秒后再试');
            } else if (err && err.message === 'UNAUTHORIZED') {
                console.error('[url-import] 代理令牌校验失败:', err);
                msg = t('toast.urlImportUnauthorized') ||
                    '代理令牌校验失败：请确认 proxy.php 与 url-importer.js 的令牌一致';
            } else if (err && err.message === 'WAF_BLOCKED') {
                // 目标站有 WAF（如掘金）：不是网络抖动，重试也没用，直接说清原因
                msg = t('toast.urlImportWafBlocked') ||
                    '该站点启用了反爬（WAF）：服务器出口 IP 被挑战，服务端抓不到正文。可换个链接，或改用本地 php -S 服务解析';
            } else {
                console.error('[url-import] 解析失败:', err);
                msg = t('toast.urlImportFailed') || '链接解析失败，请检查网络或稍后重试';
                if (err && err.message === 'ALL_FAILED') {
                    msg = t('toast.urlImportBlocked') || '无法抓取该链接（站点跨域限制），请稍后重试';
                }
            }
            M.showToast(msg, 'error');
        }).then(function () {
            importing = false;
        });
    }

    function onPaste(e) {
        var M = window.Mojian;
        if (!M || !M.state) return;
        if (M.state.isEditMode) return;

        var cd = e.clipboardData || window.clipboardData;
        if (!cd) return;
        var text = (cd.getData('text/plain') || cd.getData('text') || '').trim();
        if (!text) return;

        // 仅当剪贴板内容整体就是一个 http(s) 链接时才接管
        if (!/^https?:\/\/[^\s"'<>]+$/i.test(text)) return;

        e.preventDefault();
        importFromUrl(text);
    }

    function initUrlImport() {
        document.addEventListener('paste', onPaste);
    }

    window.Mojian = window.Mojian || {};
    var MJ = window.Mojian;
    MJ.initUrlImport = initUrlImport;
    MJ.importFromUrl = importFromUrl;
    MJ.extractArticle = extractArticle;
    MJ.extractArticleFromDoc = extractFromDoc;
    MJ.buildArticleMarkdown = buildMarkdown;
    MJ.fetchArticleByApi = fetchArticleByApi;
    MJ.urlImporterDebug = {
        FETCH_CHANNELS: FETCH_CHANNELS,
        SITE_RULES: SITE_RULES,
        SITE_API_RULES: SITE_API_RULES,
        GENERIC_SELECTORS: GENERIC_SELECTORS,
        PARSED_CACHE: parsedCache
    };

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initUrlImport);
        } else {
            initUrlImport();
        }
    }
})();
