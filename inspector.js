// ===============================
// Dain_Coin — INSPECTOR (v19)
// Tray Button via defineTrayButton
// ===============================
//
// CHANGELOG v19:
// • Добавлен Hook API для кастомных контролов:
//    bus.emit("inspector:renderControl", payload)
// • Теперь любой модуль может подменить рендер конкретного контрола (например color)
// • Дефолтное поведение 1:1 сохранено (если никто не перехватил — рисуем как раньше)
//
// Hook payload:
// {
//   type, def, value, onChange,
//   meta: { moduleKey, param, label },
//   mount(el), handled: { value: boolean }
// }
//
// ===============================

import { defineTrayButton } from "./defineTrayButton.js";

export const registerInspectorModule = defineTrayButton({
  key: "__inspectorModule",
  name: "Inspector",

  id: "inspector",
  order: 1,
  iconSize: 26,

  async resolveIcon() {
    const ok = await checkImage("./assets/tray/trayButtons1/iconInspector.png");
    return {
      iconSrc: ok ? "./assets/tray/trayButtons1/iconInspector.png" : null,
      icon: ok ? null : "⚙️"
    };
  },

  createState() {
    return {
      STORAGE_KEY: "DainCoin_Inspector_v19",
      cleanup: null
    };
  },

  panel({ container, core, state }) {
    if (state.cleanup) {
      try { state.cleanup(); } catch (_) {}
    }

    state.cleanup = mountInspector({
      container,
      core,
      storageKey: state.STORAGE_KEY
    });

    return () => {
      if (state.cleanup) {
        try { state.cleanup(); } catch (_) {}
      }
      state.cleanup = null;
    };
  },

  onDisable({ state }) {
    if (state.cleanup) {
      try { state.cleanup(); } catch (_) {}
    }
    state.cleanup = null;
  }
});

// ============================================================================
// UI
// ============================================================================

function mountInspector({ container, core, storageKey }) {
  const stored = loadStored(storageKey);
  const bus = typeof core?.getBus === "function" ? core.getBus() : null;

  const getParam = (m, p, def) =>
    stored[`param::${m}::${p}`] ?? def;

  const setParam = (m, p, v) => {
    stored[`param::${m}::${p}`] = v;
    saveStored(storageKey, stored);
  };

  const root = document.createElement("div");
  Object.assign(root.style, {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "12px",
    color: "#fff",
    overflowY: "auto",
    overscrollBehavior: "contain"
  });

  const header = document.createElement("div");
  Object.assign(header.style, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  });

  header.innerHTML = `<strong>Inspector</strong>`;

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "↺ Reset";
  Object.assign(resetBtn.style, {
    padding: "6px 10px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    cursor: "pointer"
  });

  resetBtn.onclick = () => {
    localStorage.removeItem(storageKey);

    core.getModules().forEach(({ key, module }) => {
      if (!module.inspector) return;
      for (const label in module.inspector) {
        const def = module.inspector[label];
        core.applyParam(key, def.param, def.value);
      }
    });

    rebuild();
  };

  header.appendChild(resetBtn);
  root.appendChild(header);

  const list = document.createElement("div");
  list.style.display = "flex";
  list.style.flexDirection = "column";
  list.style.gap = "10px";
  root.appendChild(list);

  function rebuild() {
    list.innerHTML = "";

    core.getModules().forEach(({ key, module }) => {
      if (!module.inspector) return;

      list.appendChild(
        createCollapsibleModule({
          core,
          bus,
          moduleKey: key,
          title: module.name || key,
          inspector: module.inspector,
          getValue: (param, def) => getParam(key, param, def.value),
          onChange: (param, value) => {
            setParam(key, param, value);
            core.applyParam(key, param, value);
          }
        })
      );
    });
  }

  rebuild();
  container.appendChild(root);
  return () => root.remove();
}

// ============================================================================
// COLLAPSIBLE MODULE
// ============================================================================

function createCollapsibleModule({ core, bus, moduleKey, title, inspector, getValue, onChange }) {
  let open = false;

  const wrap = document.createElement("div");
  Object.assign(wrap.style, {
    background: "rgba(255,255,255,0.05)",
    borderRadius: "12px",
    overflow: "hidden"
  });

  const header = document.createElement("div");
  Object.assign(header.style, {
    padding: "10px",
    cursor: "pointer",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px"
  });

  const label = document.createElement("span");
  label.textContent = `▶ ${title}`;

  const right = document.createElement("div");
  Object.assign(right.style, {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  });

  let enabled = !!getModuleEnabled(core, moduleKey);

  const toggle = renderIOSToggle({
    value: enabled,
    onChange(next) {
      enabled = next;
      if (enabled) core.enableModule(moduleKey);
      else core.disableModule(moduleKey);
      applyEnabledVisual();
    }
  });

  right.appendChild(toggle);
  header.append(label, right);

  const content = document.createElement("div");
  Object.assign(content.style, {
    maxHeight: "0",
    overflow: "hidden",
    transition: "max-height 0.3s ease",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "0 10px"
  });

  header.onclick = () => {
    open = !open;
    label.textContent = `${open ? "▼" : "▶"} ${title}`;
    content.style.maxHeight = open ? "1200px" : "0";
    content.style.padding = open ? "10px" : "0 10px";
  };

  const controls = [];
  for (const labelText in inspector) {
    const def = inspector[labelText];

    if (def.hidden) continue;

    const param = def.param;
    const value = getValue(param, def);

    const control = createCollapsibleControl({
      bus,
      moduleKey,
      param,
      label: labelText,
      def,
      value,
      onChange: v => onChange(param, v)
    });

    controls.push(control);
    content.appendChild(control);
  }

  wrap.append(header, content);
  applyEnabledVisual();
  return wrap;

  function applyEnabledVisual() {
    const on = !!getModuleEnabled(core, moduleKey);
    wrap.style.opacity = on ? "1" : "0.42";
    wrap.style.filter = on ? "none" : "grayscale(0.15)";
    controls.forEach(ctrl => setControlDisabled(ctrl, !on));
    toggle.set(on);
  }
}

function getModuleEnabled(core, moduleKey) {
  try {
    const found = core.getModules().find(({ key }) => key === moduleKey);
    return !!found?.module?.enabled;
  } catch {
    return false;
  }
}

function setControlDisabled(controlRoot, disabled) {
  controlRoot.querySelectorAll("[data-ios-toggle]").forEach(el => {
    el.style.pointerEvents = disabled ? "none" : "auto";
    el.style.opacity = disabled ? "0.4" : "1";
  });

  controlRoot.querySelectorAll("input").forEach(i => {
    i.disabled = !!disabled;
    i.style.opacity = disabled ? "0.6" : "1";
  });
}

// ============================================================================
// COLLAPSIBLE CONTROL
// ============================================================================

function createCollapsibleControl({ bus, moduleKey, param, label, def, value, onChange }) {
  let open = false;

  const wrap = document.createElement("div");
  Object.assign(wrap.style, {
    background: "rgba(0,0,0,0.25)",
    borderRadius: "10px",
    overflow: "hidden"
  });

  const header = document.createElement("div");
  Object.assign(header.style, {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 10px",
    cursor: "pointer"
  });

  const title = document.createElement("span");
  title.textContent = label;

  const valueLabel = document.createElement("span");
  valueLabel.style.opacity = "0.75";
  updateValue();

  header.append(title, valueLabel);

  const content = document.createElement("div");
  Object.assign(content.style, {
    maxHeight: "0",
    opacity: "0",
    overflow: "hidden",
    transition: "max-height 0.25s ease, opacity 0.2s ease",
    padding: "0 10px"
  });

  const input = createInput(def, value, v => {
    value = v;
    updateValue();
    onChange(v);
  }, {
    bus,
    meta: { moduleKey, param, label }
  });

  content.appendChild(input);

  header.onclick = () => {
    open = !open;
    content.style.maxHeight = open ? "60px" : "0";
    content.style.opacity = open ? "1" : "0";
  };

  wrap.append(header, content);
  return wrap;

  function updateValue() {
    if (def.type === "toggle") valueLabel.textContent = value ? "ON" : "OFF";
    else valueLabel.textContent = value;
  }
}

// ============================================================================
// INPUT FACTORY + HOOK (inspector:renderControl)
// ============================================================================

function createInput(def, value, onChange, { bus = null, meta = null } = {}) {
  if (def.type === "toggle") {
    return renderIOSToggle({
      value: !!value,
      onChange: v => onChange(v ? 1 : 0)
    });
  }

  // ✅ Hook: даём внешним модулям подменить рендер контрола
  if (bus && typeof bus.emit === "function") {
    const placeholder = document.createElement("div");
    placeholder.style.width = "100%";
    placeholder.style.margin = "8px 0";

    const handled = { value: false };
    const payload = {
      type: def.type,
      def,
      value,
      onChange,
      meta,
      handled,
      mount(el) {
        if (!el) return;
        placeholder.innerHTML = "";
        placeholder.appendChild(el);
        handled.value = true;
      }
    };

    try {
      bus.emit("inspector:renderControl", payload);
    } catch (_) {}

    if (handled.value) {
      return placeholder;
    }
  }

  // === Default controls (старое поведение) ===
  let input;

  if (def.type === "color") {
    input = document.createElement("input");
    input.type = "color";
    input.value = value;
    input.oninput = () => onChange(input.value);
  } else {
    input = document.createElement("input");
    input.type = "range";
    input.min = def.min ?? 0;
    input.max = def.max ?? 100;
    input.step = def.step ?? 1;
    input.value = value;
    input.oninput = e => onChange(parseFloat(e.target.value));
  }

  input.style.width = "100%";
  input.style.margin = "8px 0";
  return input;
}

// ============================================================================
// iOS TOGGLE
// ============================================================================

function renderIOSToggle({ value, onChange }) {
  let current = !!value;

  const wrap = document.createElement("div");
  wrap.dataset.iosToggle = "1";

  Object.assign(wrap.style, {
    width: "42px",
    height: "26px",
    borderRadius: "13px",
    background: current ? "#34C759" : "#555",
    position: "relative",
    cursor: "pointer",
    transition: "background 0.18s ease"
  });

  const knob = document.createElement("div");
  Object.assign(knob.style, {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    background: "#fff",
    position: "absolute",
    top: "2px",
    left: current ? "18px" : "2px",
    transition: "left 0.18s ease"
  });

  wrap.appendChild(knob);

  function sync() {
    wrap.style.background = current ? "#34C759" : "#555";
    knob.style.left = current ? "18px" : "2px";
  }

  wrap.onclick = () => {
    current = !current;
    sync();
    onChange(current);
  };

  wrap.set = v => {
    current = !!v;
    sync();
  };

  return wrap;
}

// ============================================================================
// HELPERS
// ============================================================================

function loadStored(key) {
  try { return JSON.parse(localStorage.getItem(key)) || {}; }
  catch { return {}; }
}

function saveStored(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function checkImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}