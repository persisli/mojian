/**
 * ui/sidebar.js - 侧边栏管理
 */

function openSidebar() {
    const elements = window.Mojian.elements;
    elements.settingsSidebar.classList.add('active');
    elements.sidebarOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSidebar() {
    const elements = window.Mojian.elements;
    elements.settingsSidebar.classList.remove('active');
    elements.sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

window.Mojian = window.Mojian || {};
Mojian.openSidebar = openSidebar;
Mojian.closeSidebar = closeSidebar;
