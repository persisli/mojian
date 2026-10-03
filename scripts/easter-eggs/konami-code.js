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
            triggerMatrixRain();
            state.easterEggs.konamiCode = [];
        }
    }
}

// matrix-rain.js 是延后加载脚本，未就绪时先加载再触发
function triggerMatrixRain() {
    if (window.Mojian.triggerMatrixRain) {
        window.Mojian.triggerMatrixRain();
        return;
    }
    if (window.Mojian.ensureFeature) {
        window.Mojian.ensureFeature('matrixRain').then(function () {
            if (window.Mojian.triggerMatrixRain) window.Mojian.triggerMatrixRain();
        });
    }
}

window.Mojian = window.Mojian || {};
Mojian.handleKonamiCode = handleKonamiCode;
