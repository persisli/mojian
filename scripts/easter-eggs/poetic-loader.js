/**
 * easter-eggs/poetic-loader.js - 诗意加载语
 */

function showPoeticLoadingText() {
    const welcomeContent = document.querySelector('.welcome-content');
    if (!welcomeContent) return;

    let poeticText = document.getElementById('poetic-text');
    if (!poeticText) {
        poeticText = document.createElement('p');
        poeticText.id = 'poetic-text';
        poeticText.className = 'poetic-text';
        poeticText.style.cssText = `
            margin-top: 20px;
            font-size: 14px;
            color: var(--text-secondary);
            font-style: italic;
            opacity: 0.8;
            transition: opacity 0.5s ease;
        `;
        welcomeContent.appendChild(poeticText);
    }

    const quoteNumber = Math.floor(Math.random() * 14) + 1;
    const randomQuote = i18n.t(`poetic.quote.${quoteNumber}`);

    if (i18n.isChinese()) {
        poeticText.textContent = '「' + randomQuote + '」';
    } else {
        poeticText.textContent = '"' + randomQuote + '"';
    }
}

window.Mojian = window.Mojian || {};
Mojian.showPoeticLoadingText = showPoeticLoadingText;
