/**
 * ui/toast.js - Toast 通知
 */

function showToast(message, type) {
    type = type || 'success';
    const elements = window.Mojian.elements;
    elements.toastMessage.textContent = message;
    elements.toast.className = 'toast show' + (type === 'error' ? ' error' : '');

    if (window.toastTimer) {
        clearTimeout(window.toastTimer);
    }

    window.toastTimer = setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

window.Mojian = window.Mojian || {};
Mojian.showToast = showToast;
