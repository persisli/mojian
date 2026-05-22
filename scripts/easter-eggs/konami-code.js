/**
 * easter-eggs/konami-code.js - Konami Code 检测
 */

const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

function handleKonamiCode(e) {
    const { state } = window.Mojian;
    state.easterEggs.konamiCode.push(e.key);
    if (state.easterEggs.konamiCode.length > 10) {
        state.easterEggs.konamiCode.shift();
    }
    if (state.easterEggs.konamiCode.length === 10) {
        const isMatch = state.easterEggs.konamiCode.every((key, index) => {
            return key.toLowerCase() === KONAMI_CODE[index].toLowerCase();
        });
        if (isMatch) {
            console.log('Konami Code activated!');
            window.Mojian.triggerMatrixRain();
            state.easterEggs.konamiCode = [];
        }
    }
}

window.Mojian = window.Mojian || {};
Mojian.handleKonamiCode = handleKonamiCode;
