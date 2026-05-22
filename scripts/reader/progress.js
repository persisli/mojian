/**
 * reader/progress.js - 阅读进度跟踪 (scroll/resize)
 */

function handleScroll() {
    if (window.Mojian.scrollRAFScheduled) return;
    window.Mojian.scrollRAFScheduled = true;
    requestAnimationFrame(() => {
        window.Mojian.scrollRAFScheduled = false;
        updateProgress();
        const elements = window.Mojian.elements;
        if (elements.floatingToc.classList.contains('visible')) {
            if (window.Mojian.updateActiveTocItem) {
                window.Mojian.updateActiveTocItem();
            }
        }
    });
}

function handleResize() {
    if (window.Mojian.resizeTimer) clearTimeout(window.Mojian.resizeTimer);
    window.Mojian.resizeTimer = setTimeout(() => {
        handleScroll();
    }, 100);
}

function updateProgress() {
    const elements = window.Mojian.elements;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    elements.progressPercent.textContent = Math.round(progress) + '%';
}

window.Mojian = window.Mojian || {};
Mojian.handleScroll = handleScroll;
Mojian.handleResize = handleResize;
Mojian.updateProgress = updateProgress;
