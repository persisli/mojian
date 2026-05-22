/**
 * reader/toc.js - 目录生成 + 滚动定位(含log TOC)
 */

function generateToc() {
    const { elements } = window.Mojian;
    const headings = elements.markdownContent.querySelectorAll('h1, h2, h3');
    const tocNav = elements.floatingTocNav;
    tocNav.innerHTML = '';

    if (headings.length === 0) {
        elements.floatingToc.classList.remove('visible');
        return;
    }

    const ul = document.createElement('ul');
    ul.className = 'toc-list';

    headings.forEach((heading) => {
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
            tocNav.querySelectorAll('.toc-link').forEach(link => link.classList.remove('active'));
            a.classList.add('active');
            scrollToHeading(heading);
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
    const headerHeight = 80;
    const targetPosition = heading.getBoundingClientRect().top + window.pageYOffset - headerHeight;
    window.scrollTo({
        top: Math.max(0, targetPosition),
        behavior: 'smooth'
    });
}

function updateActiveTocItem() {
    const { elements } = window.Mojian;
    const headings = elements.markdownContent.querySelectorAll('h1, h2, h3');
    const tocLinks = elements.floatingTocNav.querySelectorAll('.toc-link');
    if (tocLinks.length === 0) return;

    const scrollTop = window.pageYOffset;
    const headerOffset = 100;
    let currentHeadingIndex = -1;

    headings.forEach((heading, index) => {
        const headingTop = heading.getBoundingClientRect().top + scrollTop;
        if (headingTop <= scrollTop + headerOffset) {
            currentHeadingIndex = index;
        }
    });

    if (currentHeadingIndex === -1 && scrollTop < 100 && headings.length > 0) {
        currentHeadingIndex = 0;
    }

    const nearBottom = (window.innerHeight + scrollTop) >= document.documentElement.scrollHeight - 100;
    if (nearBottom && headings.length > 0) {
        currentHeadingIndex = headings.length - 1;
    }

    tocLinks.forEach((link, index) => {
        link.classList.remove('active');
        if (index === currentHeadingIndex) {
            link.classList.add('active');
        }
    });
}

function generateLogToc(content) {
    const { elements } = window.Mojian;
    const lines = content.split('\n');
    const tocNav = elements.floatingTocNav;
    tocNav.innerHTML = '';

    if (lines.length === 0) {
        elements.floatingToc.classList.remove('visible');
        return;
    }

    const ul = document.createElement('ul');
    ul.className = 'toc-list';

    let sectionCount = 0;
    const maxSections = 50;

    lines.forEach((line, index) => {
        if (sectionCount >= maxSections) return;

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
            const displayText = line.trim().substring(0, 50);
            a.textContent = displayText + (displayText.length < line.trim().length ? '...' : '');

            a.addEventListener('click', (e) => {
                e.preventDefault();
                scrollToLine(index);
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

function scrollToLine(lineIndex) {
    const { elements } = window.Mojian;
    const logContent = elements.markdownContent.querySelector('.log-content');
    if (!logContent) return;

    const lines = logContent.textContent.split('\n');
    let charCount = 0;
    for (let i = 0; i < lineIndex && i < lines.length; i++) {
        charCount += lines[i].length + 1;
    }

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

    setTimeout(() => marker.remove(), 100);
}

window.Mojian = window.Mojian || {};
Mojian.generateToc = generateToc;
Mojian.scrollToHeading = scrollToHeading;
Mojian.updateActiveTocItem = updateActiveTocItem;
Mojian.generateLogToc = generateLogToc;
Mojian.scrollToLine = scrollToLine;
