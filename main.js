// ===============================
// Dain_Coin — MAIN ENTRY POINT (v4)
// ===============================
//
// CHANGELOG v4:
// • Использует core.js v2 (с EventBus и Store)
// • Логика и структура v3 сохранены
// • Всё ещё создаёт общий контейнер сцены и стартует базовые модули
// ===============================

import { core } from './core.js';
import { registerCoinModule } from './coin.js';
import { startInspector } from './inspector.js';
import { registerCoinEffectsModule } from './modules/coin/coinEffects.js'; // как и раньше
import { registerCoinEffectNeonModule } from './modules/coin/coinEffectNeon.js'; // как и раньше
import { registerCoinEffectRingModule } from './modules/coin/coinEffectRing.js'; // как и раньше
import { registerDebugDomModule } from './debugDom.js'; // как и раньше


// ====== НАСТРОЙКА СЦЕНЫ ======
const root = document.getElementById('game-root');

// Основной контейнер игры
const gameContainer = document.createElement('div');
gameContainer.id = 'game-container';
gameContainer.style.position = 'relative';
gameContainer.style.width = '100%';
gameContainer.style.height = '100%';
gameContainer.style.display = 'flex';
gameContainer.style.flexDirection = 'column';
gameContainer.style.justifyContent = 'flex-end';
gameContainer.style.alignItems = 'center';
gameContainer.style.overflow = 'hidden';

root.appendChild(gameContainer);

// Убираем прелоадер после загрузки
const boot = document.getElementById('boot');
if (boot) boot.remove();

// Тестовая надпись (можно удалить позже)
const loadingText = document.createElement('div');
loadingText.innerText = 'Nosleep Game Framework Ready';
loadingText.style.color = 'white';
loadingText.style.opacity = '0.7';
loadingText.style.fontSize = '0.8rem';
loadingText.style.marginBottom = '8vh';
loadingText.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
gameContainer.appendChild(loadingText);

// ====== ИНИЦИАЛИЗАЦИЯ CORE ======
core.init({
  container: gameContainer,
  // initialState: { energy: 10, skullCoins: 0, fireCoins: 0 } // при желании
});

// ====== РЕГИСТРАЦИЯ МОДУЛЕЙ ======
registerCoinModule(core);
registerCoinEffectsModule(core);
//registerCoinEffectsPremModule(core);
registerCoinEffectNeonModule(core);
registerCoinEffectRingModule(core);
registerDebugDomModule(core);

// Здесь же будут:
// registerTrayModule(core);
// registerEnergyModule(core);
// registerInventoryModule(core);
// ...

// ====== СТАРТОВЫЕ МОДУЛИ ======
core.enableModule('__coinModule');
// core.enableModule('__coinEffectsModule');

// ====== ИНСПЕКТОР ======
startInspector(core);

console.log('Main.js v4: core initialized (v2), modules registered, inspector started');