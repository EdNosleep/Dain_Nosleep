// ===============================
// Dain_Coin — UNIVERSAL INSPECTOR MODULE (v4 self-inspecting + panel height)
// ===============================

import { coinInspector } from './coin.js';

export function startInspector() {
  const STORAGE_KEY = 'DainCoin_InspectorParams';

  // === Настройки самого инспектора ===
  const inspectorInspector = {
    'Прозрачность панели': { min: 0, max: 1, step: 0.01, value: 0.92, param: 'panelOpacity' },
    'Затемнение фона':     { min: 0,   max: 0.8, step: 0.05, value: 0.4,  param: 'overlayDarkness' },
    'Высота панели (%)':   { min: 50,  max: 100,  step: 1,    value: 60,   param: 'panelHeight' }
  };

  const inspectorModules = [
    { name: 'Панель', source: inspectorInspector, target: window.__coinModule },
    { name: 'Монетка',  source: coinInspector, target: window.__coinModule }
  ];

  // === ВОССТАНОВЛЕНИЕ ПАРАМЕТРОВ ===
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  inspectorModules.forEach(mod => {
    for (const label in mod.source) {
      const p = mod.source[label];
      const savedVal = saved[p.param];
      if (savedVal !== undefined) p.value = savedVal;
    }
  });

  // === ЗАТЕМНЕНИЕ ФОНА ===
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0,0,0,0.0)',
    backdropFilter: 'blur(0px)',
    opacity: '0',
    transition: 'opacity 0.35s ease, backdrop-filter 0.35s ease',
    zIndex: 9997,
    pointerEvents: 'none',
  });
  document.body.appendChild(overlay);

  // === ПАНЕЛЬ ===
  const panel = document.createElement('div');
  panel.id = 'inspector-panel';
  Object.assign(panel.style, {
    position: 'fixed',
    left: '0',
    right: '0',
    bottom: '-60%',
    height: `${inspectorInspector['Высота панели (%)'].value}%`,
    background: `rgba(20,20,20,${inspectorInspector['Прозрачность панели'].value})`,
    borderTop: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '16px 16px 0 0',
    boxShadow: '0 -6px 16px rgba(0,0,0,0.5)',
    backdropFilter: 'blur(10px)',
    color: 'white',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    padding: '16px',
    overflowY: 'auto',
    transition: 'bottom 0.35s ease',
    zIndex: 9998,
  });
  document.body.appendChild(panel);

  // === КНОПКА ⚙️ ===
  const button = document.createElement('button');
  button.innerText = '⚙️';
  Object.assign(button.style, {
    position: 'fixed',
    right: '3vw',
    bottom: '3vh',
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    border: 'none',
    fontSize: '24px',
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    backdropFilter: 'blur(8px)',
    cursor: 'pointer',
    zIndex: 10000,
    transition: 'transform 0.3s ease',
  });
  document.body.appendChild(button);

  // === КНОПКА СБРОСА ===
  const resetBtn = document.createElement('button');
  resetBtn.innerText = 'Сбросить настройки';
  Object.assign(resetBtn.style, {
    width: '100%',
    marginTop: '16px',
    padding: '10px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  });
  resetBtn.onmouseenter = () => (resetBtn.style.background = 'rgba(255,255,255,0.2)');
  resetBtn.onmouseleave = () => (resetBtn.style.background = 'rgba(255,255,255,0.1)');
  resetBtn.onclick = () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  };

  let open = false;
  button.addEventListener('click', togglePanel);
  overlay.addEventListener('click', togglePanel);

  function togglePanel() {
    open = !open;
    panel.style.bottom = open ? '0' : `-${inspectorInspector['Высота панели (%)'].value}%`;
    button.style.transform = open ? 'rotate(45deg)' : 'rotate(0deg)';

    if (open) {
      overlay.style.pointerEvents = 'auto';
      overlay.style.opacity = '1';
      overlay.style.background = `rgba(0,0,0,${inspectorInspector['Затемнение фона'].value})`;
      overlay.style.backdropFilter = 'blur(4px)';
    } else {
      overlay.style.pointerEvents = 'none';
      overlay.style.opacity = '0';
      overlay.style.background = 'rgba(0,0,0,0.0)';
      overlay.style.backdropFilter = 'blur(0px)';
    }
  }

// === СОЗДАНИЕ РАЗДЕЛОВ ===
inspectorModules.forEach(mod => {
  const section = document.createElement('div');
  section.style.marginBottom = '16px';

  // --- Заголовок секции ---
  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontWeight: 'bold',
    fontSize: '16px',
    margin: '8px 0',
    opacity: '0.9',
    cursor: 'pointer',
    userSelect: 'none',
  });

  const titleText = document.createElement('span');
  titleText.textContent = mod.name;

  // --- Стрелка ▼/▶ ---
  const arrow = document.createElement('span');
  arrow.textContent = '▶';
  Object.assign(arrow.style, {
    display: 'inline-block',
    transition: 'transform 0.25s ease',
    fontSize: '14px',
    opacity: '0.8',
  });

  header.append(titleText, arrow);

  // --- Контент ---
  const content = document.createElement('div');
  content.style.transition = 'max-height 0.25s ease, opacity 0.25s ease';
  content.style.overflow = 'hidden';
  content.style.maxHeight = '0';   // по умолчанию скрыто
  content.style.opacity = '0';

  // --- Логика открытия/закрытия ---
  let expanded = false;
  header.onclick = () => {
    expanded = !expanded;
    arrow.style.transform = expanded ? 'rotate(90deg)' : 'rotate(0deg)';
    content.style.maxHeight = expanded ? '600px' : '0';
    content.style.opacity = expanded ? '1' : '0';
  };

  // --- Формирование полей ---
  const source = mod.source;
  for (const label in source) {
    const p = source[label];
    const wrap = document.createElement('div');
    wrap.style.marginBottom = '12px';

    const title = document.createElement('div');
    title.textContent = label;
    Object.assign(title.style, {
      fontSize: '13px',
      marginBottom: '2px',
      opacity: '0.8',
    });

    const input = document.createElement('input');
    Object.assign(input, {
      type: 'range',
      min: p.min,
      max: p.max,
      step: p.step,
      value: p.value
    });
    Object.assign(input.style, {
      width: '100%',
      accentColor: '#00ffff'
    });

    const valueLabel = document.createElement('div');
    valueLabel.textContent = p.value;
    Object.assign(valueLabel.style, {
      fontSize: '12px',
      textAlign: 'right',
      opacity: '0.7'
    });

    input.oninput = e => {
      const val = parseFloat(e.target.value);
      valueLabel.textContent = val;
      p.value = val;

      // Сохранение
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      stored[p.param] = val;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

      // === Применение ===
      if (mod.name === 'Панель') {
        if (p.param === 'panelOpacity') {
          panel.style.background = `rgba(20,20,20,${val})`;
        }
        if (p.param === 'overlayDarkness' && open) {
          overlay.style.background = `rgba(0,0,0,${val})`;
        }
        if (p.param === 'panelHeight') {
          panel.style.height = `${val}%`;
          if (!open) panel.style.bottom = `-${val}%`;
        }
      } else if (mod.target?.applyParam) {
        mod.target.applyParam(p.param, p.param === 'headsChance' ? val / 100 : val);
      }
    };

    wrap.append(title, input, valueLabel);
    content.appendChild(wrap);
  }

  section.append(header, content);
  panel.appendChild(section);
});
  
  panel.appendChild(resetBtn);
  console.log('Inspector initialized (with panel height control)');
}