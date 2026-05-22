/**
 * easter-eggs/easter-eggs.js - 彩蛋入口 + 成就系统
 */

function initEasterEggs() {
    if (window.Mojian.easterEggsInitialized) return;
    window.Mojian.easterEggsInitialized = true;
    loadEasterEggData();
    document.addEventListener('keydown', window.Mojian.handleKonamiCode);
    window.Mojian.showPoeticLoadingText();
}

function getAchievements() {
    return {
        novice: { name: i18n.t('achievement.novice.name'), threshold: 10000, icon: '📖', description: i18n.t('achievement.novice.desc') },
        scholar: { name: i18n.t('achievement.scholar.name'), threshold: 100000, icon: '📚', description: i18n.t('achievement.scholar.desc') },
        persistent: { name: i18n.t('achievement.persistent.name'), threshold: 7, icon: '🔥', description: i18n.t('achievement.persistent.desc'), type: 'streak' }
    };
}

function loadEasterEggData() {
    const { state } = window.Mojian;
    const saved = localStorage.getItem('easterEggData');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            state.easterEggs.totalWordsRead = data.totalWordsRead || 0;
            state.easterEggs.readingStreak = data.readingStreak || 0;
            state.easterEggs.lastReadDate = data.lastReadDate || null;
            state.easterEggs.badges = data.badges || [];
        } catch (e) {
            console.warn('Failed to load easter egg data:', e);
        }
    }
}

function saveEasterEggData() {
    const { state } = window.Mojian;
    try {
        localStorage.setItem('easterEggData', JSON.stringify({
            totalWordsRead: state.easterEggs.totalWordsRead,
            readingStreak: state.easterEggs.readingStreak,
            lastReadDate: state.easterEggs.lastReadDate,
            badges: state.easterEggs.badges
        }));
    } catch (e) {
        console.warn('Failed to save easter egg data:', e);
    }
}

function updateReadingStats(wordCount) {
    const { state } = window.Mojian;
    state.easterEggs.totalWordsRead += wordCount;
    const today = new Date().toDateString();
    const lastDate = state.easterEggs.lastReadDate;

    if (lastDate) {
        const last = new Date(lastDate);
        const now = new Date();
        const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
            state.easterEggs.readingStreak++;
        } else if (diffDays > 1) {
            state.easterEggs.readingStreak = 1;
        }
    } else {
        state.easterEggs.readingStreak = 1;
    }

    state.easterEggs.lastReadDate = today;
    checkAchievements();
    saveEasterEggData();
}

function checkAchievements() {
    const achievements = getAchievements();
    const { state } = window.Mojian;
    const { totalWordsRead, readingStreak, badges } = state.easterEggs;

    if (totalWordsRead >= achievements.scholar.threshold && !badges.includes('scholar')) {
        unlockAchievement('scholar');
    } else if (totalWordsRead >= achievements.novice.threshold && !badges.includes('novice')) {
        unlockAchievement('novice');
    }

    if (readingStreak >= achievements.persistent.threshold && !badges.includes('persistent')) {
        unlockAchievement('persistent');
    }
}

function unlockAchievement(achievementId) {
    const achievements = getAchievements();
    const achievement = achievements[achievementId];
    if (!achievement) return;

    const { state } = window.Mojian;
    if (!state.easterEggs.badges.includes(achievementId)) {
        state.easterEggs.badges.push(achievementId);
        showAchievementNotification(achievement);
        saveEasterEggData();
    }
}

function showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.style.cssText = `
        position: fixed; top: 100px; right: -400px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white; padding: 20px 24px; border-radius: 12px;
        box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
        z-index: 10001; max-width: 350px;
        transition: right 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    `;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 36px;">${achievement.icon}</div>
            <div style="flex: 1;">
                <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">${i18n.t('toast.achievementUnlock')}</div>
                <div style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">${achievement.name}</div>
                <div style="font-size: 13px; opacity: 0.85;">${achievement.description}</div>
            </div>
        </div>
    `;
    document.body.appendChild(notification);
    requestAnimationFrame(() => {
        notification.style.right = '20px';
    });
    setTimeout(() => {
        notification.style.right = '-400px';
        setTimeout(() => notification.remove(), 500);
    }, 4000);
}

window.Mojian = window.Mojian || {};
Mojian.initEasterEggs = initEasterEggs;
Mojian.loadEasterEggData = loadEasterEggData;
Mojian.saveEasterEggData = saveEasterEggData;
Mojian.updateReadingStats = updateReadingStats;
Mojian.checkAchievements = checkAchievements;
Mojian.unlockAchievement = unlockAchievement;
Mojian.showAchievementNotification = showAchievementNotification;
Mojian.getAchievements = getAchievements;
