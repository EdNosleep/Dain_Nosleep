// ===============================
// Dain_Coin — INSPECTOR (v9)
// ===============================
//
// CHANGELOG v9:
// • Работает через core.js, а не напрямую через window.__xxxModule
// • Тумблер вкл/выкл каждого модуля
// • Учитывает состояние enabled из модулей + localStorage
// • Параметры модулей гоняются через core.applyParam
// • Панель инспектора сама настраивается (прозрачность/высота/затемнение)
// ===============================

import { core as defaultCore } from './core.js';

export function startInspector(coreInstance = defaultCore) {
  const core = coreInstance || (typeof window !== 'undefined' ? window.__DainCore : null);
  if (!core) {
    console.warn('[Inspector] core is not available');
    return;
  }

  const STORAGE_KEY = 'DainCoin_Inspector_v9';

  // ====== РАБОТА С localStorage ======
  function loadStored() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('[Inspector] Failed to parse stored data', e);
      return {};
    }
  }

  function saveStored(obj) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn('[Inspector] Failed to save stored data', e);
    }
  }

  const stored = loadStored();

  function getStoredParam(moduleKey, paramKey, fallback) {
    const fullKey = `param::${moduleKey}::${paramKey}`;
    return Object.prototype.hasOwnProperty.call(stored, fullKey)
      ? stored[fullKey]
      : fallback;
  }

  function setStoredParam(moduleKey, paramKey, value) {
    const fullKey = `param::${moduleKey}::${paramKey}`;
    stored[fullKey] = value;
    saveStored(stored);
  }

  function getStoredEnabled(moduleKey, fallback) {
    const fullKey = `enabled::${moduleKey}`;
    if (!Object.prototype.hasOwnProperty.call(stored, fullKey)) return fallback;
    return !!stored[fullKey];
  }

  function setStoredEnabled(moduleKey, value) {
    const fullKey = `enabled::${moduleKey}`;
    stored[fullKey] = !!value;
    saveStored(stored);
  }

  // ====== UI: КНОПКА ⚙️, ОВЕРЛЕЙ, ПАНЕЛЬ ======
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
    transition: 'transform 0.3s ease'
  });
  document.body.appendChild(button);

  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(4px)',
    opacity: '0',
    pointerEvents: 'none',
    transition: 'opacity 0.35s ease, backdrop-filter 0.35s ease',
    zIndex: 9997
  });
  document.body.appendChild(overlay);

  // Панель инспектора: дефолтные параметры
  const panelInspectorDef = {
    'Прозрачность панели': {
      min: 0.5,
      max: 1,
      step: 0.01,
      value: 0.92,
      param: 'panelAlpha',
      type: 'slider'
    },
    'Затемнение фона': {
      min: 0,
      max: 0.8,
      step: 0.05,
      value: 0.4,
      param: 'overlayDarkness',
      type: 'slider'
    },
    'Высота панели (%)': {
      min: 40,
      max: 90,
      step: 1,
      value: 60,
      param: 'panelHeight',
      type: 'slider'
    }
  };

  // Применяем сохранённые значения к панельным параметрам
  for (const label in panelInspectorDef) {
    const def = panelInspectorDef[label];
    const storedVal = getStoredParam('__panelInspector', def.param, def.value);
    if (typeof storedVal === 'number') {
      def.value = storedVal;
    }
  }

  const panel = document.createElement('div');
  panel.id = 'inspector-panel';
  Object.assign(panel.style, {
    position: 'fixed',
    left: '0',
    right: '0',
    bottom: `-${panelInspectorDef['Высота панели (%)'].value}%`,
    height: `${panelInspectorDef['Высота панели (%)'].value}%`,
    background: `rgba(20,20,20,${panelInspectorDef['Прозрачность панели'].value})`,
    borderTop: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '16px 16px 0 0',
    boxShadow: '0 -6px 16px rgba(0,0,0,0.5)',
    backdropFilter: 'blur(10px)',
    color: 'white',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    padding: '16px',
    overflowY: 'auto',
    transition: 'bottom 0.35s ease, height 0.25s ease, background 0.25s ease',
    zIndex: 9998
  });
  document.body.appendChild(panel);

  overlay.style.background = `rgba(0,0,0,${panelInspectorDef['Затемнение фона'].value})`;

  const sectionsRoot = document.createElement('div');
  panel.appendChild(sectionsRoot);

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
    transition: 'background 0.2s'
  });
  resetBtn.onmouseenter = () => (resetBtn.style.background = 'rgba(255,255,255,0.2)');
  resetBtn.onmouseleave = () => (resetBtn.style.background = 'rgba(255,255,255,0.1)');
  resetBtn.onclick = () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  };

  let open = false;
  const togglePanel = () => {
    open = !open;
    panel.style.bottom = open ? '0' : `-${panelInspectorDef['Высота панели (%)'].value}%`;
    button.style.transform = open ? 'rotate(45deg)' : 'rotate(0deg)';
    overlay.style.pointerEvents = open ? 'auto' : 'none';
    overlay.style.opacity = open ? '1' : '0';
  };
  button.onclick = togglePanel;
  overlay.onclick = togglePanel;

  // ====== УТИЛИТЫ UI ======
  function createSection(title, withToggle = false, initialEnabled = true, onToggle = null) {
    const section = document.createElement('div');
    section.style.marginBottom = '16px';

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontWeight: 'bold',
      fontSize: '16px',
      margin: '8px 0',
      opacity: '0.85',
      cursor: 'pointer',
      userSelect: 'none'
    });

    const titleSpan = document.createElement('span');
    titleSpan.textContent = `▶ ${title}`;

    const content = document.createElement('div');
    Object.assign(content.style, {
      overflow: 'hidden',
      maxHeight: '0',
      opacity: '0',
      transition: 'max-height 0.25s ease, opacity 0.25s ease'
    });

    let expanded = false;
    header.onclick = e => {
      // Не кликаем по заголовку, если нажали на тумблер
      if (e.target && e.target.dataset && e.target.dataset.role === 'toggle') return;
      expanded = !expanded;
      titleSpan.textContent = `${expanded ? '▼' : '▶'} ${title}`;
      content.style.maxHeight = expanded ? '800px' : '0';
      content.style.opacity = expanded ? '1' : '0';
    };

    header.appendChild(titleSpan);

    let toggle = null;
    if (withToggle) {
      toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.checked = initialEnabled;
      toggle.dataset.role = 'toggle';
      toggle.style.cursor = 'pointer';
      toggle.onchange = () => {
        if (onToggle) onToggle(toggle.checked);
      };
      header.appendChild(toggle);
    }

    section.append(header, content);
    return { section, content, header, toggle, titleSpan };
  }

  function normalizeParamKey(label, def) {
    if (def && def.param) return def.param;
    return label.toLowerCase().replace(/\s+/g, '_');
  }

  function createControl(moduleKey, label, def, applyFn) {
    const wrap = document.createElement('div');
    wrap.style.marginBottom = '12px';

    const title = document.createElement('div');
    title.textContent = label;
    Object.assign(title.style, {
      fontSize: '13px',
      marginBottom: '2px',
      opacity: '0.8'
    });

    const valueLabel = document.createElement('div');
    Object.assign(valueLabel.style, {
      fontSize: '12px',
      textAlign: 'right',
      opacity: '0.7'
    });

    const type = def.type || 'slider';
    const paramKey = normalizeParamKey(label, def);

    let input;

    if (type === 'toggle') {
      input = document.createElement('input');
      input.type = 'checkbox';
      const storedVal = getStoredParam(moduleKey, paramKey, def.value ? 1 : 0);
      input.checked = !!storedVal;
      valueLabel.textContent = input.checked ? 'On' : 'Off';

      input.oninput = () => {
        const val = input.checked ? 1 : 0;
        valueLabel.textContent = input.checked ? 'On' : 'Off';
        setStoredParam(moduleKey, paramKey, val);
        applyFn(paramKey, val);
      };
    } else if (type === 'select' && Array.isArray(def.options)) {
      input = document.createElement('select');
      def.options.forEach(opt => {
        const o = document.createElement('option');
        if (typeof opt === 'object') {
          o.value = opt.value;
          o.textContent = opt.label ?? String(opt.value);
        } else {
          o.value = opt;
          o.textContent = String(opt);
        }
        input.appendChild(o);
      });
      const storedVal = getStoredParam(moduleKey, paramKey, def.value);
      input.value = storedVal;
      valueLabel.textContent = storedVal;

      input.oninput = () => {
        const val = input.value;
        valueLabel.textContent = val;
        setStoredParam(moduleKey, paramKey, val);
        applyFn(paramKey, val);
      };
    } else if (type === 'color') {
      input = document.createElement('input');
      input.type = 'color';
      const storedVal = getStoredParam(moduleKey, paramKey, def.value || '#ffffff');
      input.value = storedVal;
      valueLabel.textContent = storedVal;

      input.oninput = () => {
        const val = input.value;
        valueLabel.textContent = val;
        setStoredParam(moduleKey, paramKey, val);
        applyFn(paramKey, val);
      };
    } else {
      // slider — default
      input = document.createElement('input');
      Object.assign(input, {
        type: 'range',
        min: def.min ?? 0,
        max: def.max ?? 100,
        step: def.step ?? 1
      });

      const storedVal = getStoredParam(moduleKey, paramKey, def.value);
      const numericVal =
        typeof storedVal === 'number' ? storedVal : parseFloat(storedVal) || 0;
      input.value = numericVal;
      valueLabel.textContent = numericVal;
      def.value = numericVal;

      input.oninput = e => {
        const val = parseFloat(e.target.value);
        valueLabel.textContent = val;
        setStoredParam(moduleKey, paramKey, val);
        applyFn(paramKey, val);
      };

      Object.assign(input.style, {
        width: '100%',
        accentColor: '#00ffff'
      });
    }

    wrap.append(title, input, valueLabel);
    return wrap;
  }

  // ====== ПАРАМЕТРЫ ПАНЕЛИ ИНСПЕКТОРА ======
  function applyPanelParam(param, value) {
    switch (param) {
      case 'panelAlpha':
        panel.style.background = `rgba(20,20,20,${value})`;
        break;
      case 'overlayDarkness':
        overlay.style.background = `rgba(0,0,0,${value})`;
        break;
      case 'panelHeight':
        panel.style.height = `${value}%`;
        if (!open) {
          panel.style.bottom = `-${value}%`;
        }
        break;
      default:
        break;
    }
  }

  (function buildPanelSection() {
    const { section, content } = createSection('Панель инспектора', false);

    for (const label in panelInspectorDef) {
      const def = panelInspectorDef[label];
      const moduleKey = '__panelInspector';
      const paramKey = normalizeParamKey(label, def);
      const storedVal = getStoredParam(moduleKey, paramKey, def.value);
      def.value = storedVal;
      applyPanelParam(def.param, storedVal);

      const control = createControl(
        moduleKey,
        label,
        def,
        (param, value) => {
          applyPanelParam(param, value);
        }
      );
      content.appendChild(control);
    }

    sectionsRoot.appendChild(section);
  })();

  panel.appendChild(resetBtn);

  // ====== МОДУЛИ И ТУМБЛЕРЫ ======
  const modulesMap = new Map(); // key -> { sectionRoot, content, toggle, titleSpan }

  function buildOrUpdateModuleSection(key, modObj) {
    const mod = modObj;
    if (!mod || typeof mod !== 'object') return;
    const inspectorDef = mod.inspector;
    if (!inspectorDef) return;

    const displayName =
      typeof mod.name === 'string' && mod.name.trim().length > 0
        ? mod.name.trim()
        : key.replace(/^__/, '');

    const existing = modulesMap.get(key);

    // Состояние включённости с учётом сохранённого
    const baseEnabled = !!mod.enabled;
    const storedEnabled = getStoredEnabled(key, baseEnabled);
    const effectiveEnabled = storedEnabled;

    if (!existing) {
      const onToggle = checked => {
        setStoredEnabled(key, checked);
        if (checked) {
          core.enableModule(key);
        } else {
          core.disableModule(key);
        }
      };

      const { section, content, header, toggle, titleSpan } =
        createSection(displayName, true, effectiveEnabled, onToggle);

      // При первом появлении модуля — прогоняем включение/выключение
      if (effectiveEnabled) {
        core.enableModule(key);
      } else {
        core.disableModule(key);
      }

      // Создаём контроллы параметров
      const applyFn = (param, value) => {
        // headsChance 0..1 — инспектор не лезет, ядро просто прокидывает
        core.applyParam(key, param, value);
      };

      for (const label in inspectorDef) {
        const def = inspectorDef[label];
        if (!def || typeof def !== 'object') continue;

        const paramKey = normalizeParamKey(label, def);
        const storedVal = getStoredParam(key, paramKey, def.value);
        def.value = storedVal;

        // Сразу отправляем сохранённое значение в модуль
        applyFn(def.param || paramKey, storedVal);

        const control = createControl(key, label, def, (param, value) => {
          applyFn(param, value);
        });
        content.appendChild(control);
      }

      // Вставляем секцию перед кнопкой сброса
      panel.insertBefore(section, resetBtn);

      modulesMap.set(key, {
        sectionRoot: section,
        content,
        toggle,
        titleSpan
      });

      console.log(`[Inspector] Module attached: ${displayName} (${key})`);
    } else {
      // Можно позже добавить обновление, если поменяется inspectorDef
      if (existing.toggle) {
        existing.toggle.checked = effectiveEnabled;
      }
    }
  }

  function discoverModules() {
    try {
      const entries = core.getModules();
      entries.forEach(({ key, module }) => {
        buildOrUpdateModuleSection(key, module);
      });
    } catch (e) {
      console.warn('[Inspector] discovery error', e);
    }
  }

  // Первый проход + периодический
  discoverModules();
  setInterval(discoverModules, 700);

  console.log('✅ Inspector initialized (v9 via core.js)');
}