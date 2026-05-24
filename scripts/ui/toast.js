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

window.Mojian = window.Mojian || {};
Mojian.showToast = showToast;
