/**
 * ui/file-name-edit.js - 文件名编辑
 */

function enableFileNameEdit() {
    const { elements, state } = window.Mojian;
    if (!state.currentFile) return;
    const currentName = state.currentFile.name;
    elements.fileName.style.display = 'none';
    elements.fileNameInput.style.display = 'inline-block';
    elements.fileNameInput.value = currentName;
    elements.fileNameInput.focus();
    elements.fileNameInput.select();
}

function disableFileNameEdit(save) {
    save = save !== false;
    const { elements, state } = window.Mojian;
    elements.fileNameInput.style.display = 'none';
    elements.fileName.style.display = 'inline';

    if (save && state.currentFile) {
        const newName = elements.fileNameInput.value.trim();
        if (newName && newName !== state.currentFile.name) {
            const validName = validateFileName(newName);
            state.currentFile.name = validName;
            elements.fileName.textContent = validName;
            try {
                localStorage.setItem('currentFile', validName);
            } catch (e) {
                console.warn('Failed to update file name in localStorage:', e);
            }
            window.Mojian.showToast(i18n.t('toast.fileNameUpdated') || '文件名已更新');
        } else {
            elements.fileName.textContent = state.currentFile.name;
        }
    } else {
        elements.fileName.textContent = state.currentFile ? state.currentFile.name : '';
    }
}

function validateFileName(name) {
    const invalidChars = /[<>:"/\\|?*]/g;
    let validName = name.replace(invalidChars, '_');
    if (!validName.match(/\.(md|txt|log)$/i)) {
        validName += '.md';
    }
    if (validName.length > 100) {
        validName = validName.substring(0, 100);
    }
    return validName || i18n.t('file.untitled');
}

function bindFileNameEvents() {
    const { elements, state } = window.Mojian;
    elements.fileName.addEventListener('click', () => {
        if (state.currentFile) {
            enableFileNameEdit();
        }
    });
    elements.fileNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            disableFileNameEdit(true);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            disableFileNameEdit(false);
        }
    });
    elements.fileNameInput.addEventListener('blur', () => {
        setTimeout(() => {
            disableFileNameEdit(true);
        }, 200);
    });
}

window.Mojian = window.Mojian || {};
Mojian.enableFileNameEdit = enableFileNameEdit;
Mojian.disableFileNameEdit = disableFileNameEdit;
Mojian.validateFileName = validateFileName;
Mojian.bindFileNameEvents = bindFileNameEvents;
