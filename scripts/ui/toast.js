/**
 * ui/toast.js - Toast 通知
 */

function showToast(message, type, customClass) {
    type = type || 'success';
    const elements = window.Mojian.elements;
    elements.toastMessage.textContent = message;
    let className = 'toast show';
    if (type === 'error') className += ' error';
    if (customClass) className += ' ' + customClass;
    elements.toast.className = className;

    if (window.toastTimer) {
        clearTimeout(window.toastTimer);
    }

    window.toastTimer = setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

/**
 * 常驻提示：用于「字体下载中」这类持续状态，需显式调用 hidePersistentToast 关闭
 */
function showPersistentToast(message, type) {
    type = type || 'info';
    const elements = window.Mojian.elements;
    elements.toastMessage.textContent = message;
    let className = 'toast show persistent';
    if (type === 'error') className += ' error';
    elements.toast.className = className;
    if (window.toastTimer) {
        clearTimeout(window.toastTimer);
        window.toastTimer = null;
    }
}

function hidePersistentToast() {
    const elements = window.Mojian.elements;
    elements.toast.classList.remove('show');
}

window.Mojian = window.Mojian || {};
Mojian.showToast = showToast;
Mojian.showPersistentToast = showPersistentToast;
Mojian.hidePersistentToast = hidePersistentToast;
