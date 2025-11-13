// ===============================
// Dain_Coin — MAIN ENTRY POINT
// ===============================

// ====== НАСТРОЙКА СЦЕНЫ ======
const root = document.getElementById('game-root');

// Создаём основной контейнер игры
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

// ========== ДОБАВЛЯЕМ ТЕСТОВЫЙ ЭЛЕМЕНТ ==========
const loadingText = document.createElement('div');
loadingText.innerText = 'Nosleep Game Framework Ready';
loadingText.style.color = 'white';
loadingText.style.opacity = '0.7';
loadingText.style.fontSize = '0.8rem';
loadingText.style.marginBottom = '8vh';
loadingText.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
gameContainer.appendChild(loadingText);

// ========== ПОДКЛЮЧЕНИЕ МОДУЛЕЙ ==========
// Пример универсального подключения: добавляем активные модули в массив
// Когда появятся реальные модули, просто раскомментируй строки

import { startCoin } from './coin.js';
import { startInspector } from './inspector.js';

const activeModules = [ startCoin, startInspector ];
activeModules.forEach(init => typeof init === 'function' && init(gameContainer));

// Для теста пока выведем сообщение в консоль
console.log('Main.js запущен, контейнер инициализирован');