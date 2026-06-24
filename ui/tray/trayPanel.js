// ======================================
// Dain_Coin — TRAY PANEL MODULE (v14)
// Premium synced tray offset
// ======================================

import { defineModule } from "../../engine/moduleFactory.js";

const panelInspector = {
  "Высота уровня 1 (%)": { min: 20, max: 60, step: 1, value: 50, param: "level1", type: "slider", hidden: true },
  "Высота уровня 2 (%)": { min: 60, max: 90, step: 1, value: 80, param: "level2", type: "slider", hidden: true },
  "Скорость анимации (мс)": { min: 150, max: 650, step: 25, value: 300, param: "animDuration", type: "slider" },

  "Цвет панели": { value: "#141414", param: "panelColor", type: "color" },
  "Прозрачность панели": { min: 0.25, max: 1, step: 0.05, value: 0.82, param: "panelAlpha", type: "slider" },
  "Blur панели (px)": { min: 0, max: 28, step: 1, value: 14, param: "panelBlur", type: "slider" },
  "Перекрывать экран": { type: "toggle", value: 0, param: "overlayMode" },

  "Макс. затемнение overlay": { min: 0, max: 0.8, step: 0.05, value: 0.5, param: "overlayDarkness", type: "slider" },
  "Порог скорости свайпа (px/s)": { min: 250, max: 2200, step: 50, value: 720, param: "velocityThreshold", type: "slider", hidden: true },
  "Сопротивление overscroll": { min: 0.05, max: 0.6, step: 0.05, value: 0.18, param: "rubberResistance", type: "slider", hidden: true },
  "Порог намерения drag (px)": { min: 12, max: 120, step: 4, value: 36, param: "intentDistancePx", type: "slider", hidden: true }
};

export const registerTrayPanelModule = defineModule({
  key: "__trayPanelModule",
  name: "Панель трея (v14)",
  inspector: panelInspector,
  dependencies: [],

  createState() {
    return {
      params: {
        level1: panelInspector["Высота уровня 1 (%)"].value / 100,
        level2: panelInspector["Высота уровня 2 (%)"].value / 100,
        animDuration: panelInspector["Скорость анимации (мс)"].value,
        panelColor: panelInspector["Цвет панели"].value,
        panelAlpha: panelInspector["Прозрачность панели"].value,
        panelBlur: panelInspector["Blur панели (px)"].value,
        overlayMode: !!panelInspector["Перекрывать экран"].value,
        overlayDarkness: panelInspector["Макс. затемнение overlay"].value,
        velocityThreshold: panelInspector["Порог скорости свайпа (px/s)"].value,
        rubberResistance: panelInspector["Сопротивление overscroll"].value,
        intentDistancePx: panelInspector["Порог намерения drag (px)"].value
      },

      level: 0,
      dragging: false,
      currentOffset: 0,
      dragStartOffset: 0,
      dragLastDy: 0,

      overlay: null,
      panel: null,
      content: null,

      currentSource: null,
      tabCache: new Map()
    };
  },

  onStart({ state, bus }) {
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,0)",
      pointerEvents: "none",
      transition: `background ${state.params.animDuration}ms ease`,
      zIndex: 8990
    });

    overlay.onclick = () => bus.emit("tray:setPanelLevel", { level: 0 });

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      position: "fixed",
      left: "0",
      right: "0",
      bottom: "0",
      height: "100%",
      transform: "translateY(100%)",
      transition: `transform ${state.params.animDuration}ms ease`,
      boxShadow: "0 -10px 30px rgba(0,0,0,0.45)",
      zIndex: 8995,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      willChange: "transform"
    });

    const content = document.createElement("div");
    Object.assign(content.style, {
      flex: "1 1 auto",
      minHeight: "0",
      height: "100%",
      overflow: "hidden",
      padding: "16px",
      color: "#fff",
      boxSizing: "border-box"
    });

    panel.appendChild(content);
    document.body.append(overlay, panel);

    state.overlay = overlay;
    state.panel = panel;
    state.content = content;

    applyPanelVisuals(state);
    bus.emit("trayPanel:motion", { animDuration: state.params.animDuration });

    bus.on("tray:openPanel", (payload = {}) => {
      const source = payload.source || "__defaultTrayPanelSource";
      if (payload.mount) hostShowTab(state, source, payload.mount);
      setLevel(state, bus, state.level > 0 ? state.level : 1);
    }, { moduleKey: "__trayPanelModule" });

    bus.on("tray:closePanel", () => setLevel(state, bus, 0), { moduleKey: "__trayPanelModule" });
    bus.on("tray:setPanelLevel", ({ level }) => setLevel(state, bus, level), { moduleKey: "__trayPanelModule" });

    bus.on("tray:panelDragStart", () => {
      state.dragging = true;
      state.dragStartOffset = clamp(state.currentOffset, 0, maxOffset(state));
      state.dragLastDy = 0;
      applyOffset(state, bus, state.currentOffset, false);
    }, { moduleKey: "__trayPanelModule" });

    bus.on("tray:panelDragMove", ({ dy }) => dragMove(state, bus, dy), { moduleKey: "__trayPanelModule" });
    bus.on("tray:panelDragEnd", ({ vy }) => dragEnd(state, bus, vy), { moduleKey: "__trayPanelModule" });

    setLevel(state, bus, 0, true);
  },

  onDisable({ state }) {
    destroyAllTabs(state);
    state.overlay?.remove();
    state.panel?.remove();

    state.overlay = null;
    state.panel = null;
    state.content = null;
    state.currentSource = null;
    state.tabCache.clear();
  },

  onParam({ param, value, state, bus }) {
    if (param === "level1") state.params.level1 = value / 100;
    if (param === "level2") state.params.level2 = value / 100;

    if (param === "animDuration") {
      state.params.animDuration = value;
      if (state.panel) state.panel.style.transition = `transform ${value}ms ease`;
      if (state.overlay) state.overlay.style.transition = `background ${value}ms ease`;
      bus.emit("trayPanel:motion", { animDuration: value });
    }

    if (param === "panelColor") state.params.panelColor = value;
    if (param === "panelAlpha") state.params.panelAlpha = value;
    if (param === "panelBlur") state.params.panelBlur = value;
    if (param === "overlayMode") state.params.overlayMode = !!value;
    if (param === "overlayDarkness") state.params.overlayDarkness = value;
    if (param === "velocityThreshold") state.params.velocityThreshold = value;
    if (param === "rubberResistance") state.params.rubberResistance = value;
    if (param === "intentDistancePx") state.params.intentDistancePx = value;

    applyPanelVisuals(state);
    applyOffset(state, bus, offsetForLevel(state, state.level), true, state.level);
  }
});

function hostShowTab(state, source, mount) {
  let tab = state.tabCache.get(source);

  if (!tab) {
    const host = document.createElement("div");
    Object.assign(host.style, {
      width: "100%",
      height: "100%",
      maxHeight: "100%",
      minHeight: "0",
      display: "none",
      flexDirection: "column",
      overflow: "hidden",
      boxSizing: "border-box"
    });

    state.content.appendChild(host);

    const cleanup = mount({ container: host });

    tab = {
      source,
      host,
      cleanup: typeof cleanup === "function" ? cleanup : null
    };

    state.tabCache.set(source, tab);
  }

  state.tabCache.forEach(item => {
    item.host.style.display = item.source === source ? "flex" : "none";
  });

  state.currentSource = source;
}

function destroyAllTabs(state) {
  state.tabCache.forEach(tab => {
    try { tab.cleanup?.(); } catch (_) {}
    tab.host?.remove();
  });
}

function applyPanelVisuals(state) {
  if (!state.panel) return;

  const rgb = hexToRgb(state.params.panelColor) || { r: 20, g: 20, b: 20 };

  state.panel.style.background = `rgba(${rgb.r},${rgb.g},${rgb.b},${clamp(state.params.panelAlpha, 0.25, 1)})`;
  state.panel.style.backdropFilter = `blur(${clamp(state.params.panelBlur, 0, 28)}px)`;
  state.panel.style.webkitBackdropFilter = state.panel.style.backdropFilter;
}

function offsetForLevel(state, level) {
  const vh = window.innerHeight;
  if (level === 2) return vh * state.params.level2;
  if (level === 1) return vh * state.params.level1;
  return 0;
}

function maxOffset(state) {
  return window.innerHeight * state.params.level2;
}

function applyOffset(state, bus, rawOffset, animate, levelHint) {
  if (!state.panel || !state.overlay || !state.content) return;

  const vh = window.innerHeight;
  const max = maxOffset(state);
  let visualOffset = rawOffset;

  if (visualOffset < 0) {
    visualOffset *= clamp(state.params.rubberResistance, 0.05, 0.6);
  } else if (visualOffset > max) {
    visualOffset = max + (visualOffset - max) * clamp(state.params.rubberResistance, 0.05, 0.6);
  }

  state.currentOffset = visualOffset;
  state.panel.style.transition = animate ? `transform ${state.params.animDuration}ms ease` : "none";
  state.panel.style.transform = `translateY(${vh - visualOffset}px)`;

  const safeOffset = clamp(visualOffset, 0, max);
  const trayOffset = Math.max(0, visualOffset);

  state.content.style.maxHeight = `${Math.max(0, safeOffset - 12)}px`;

  const ratio = max > 0 ? clamp(safeOffset / max, 0, 1) : 0;
  state.overlay.style.background = `rgba(0,0,0,${ratio * state.params.overlayDarkness})`;
  state.overlay.style.pointerEvents = ratio > 0.01 ? "auto" : "none";

  const level = typeof levelHint === "number" ? levelHint : state.level;

  bus.emit("trayPanel:offset", {
    offsetPx: trayOffset,
    safeOffsetPx: safeOffset,
    level,
    dragging: !animate
  });

  bus.emit("ui:viewportInsetsChanged", {
    bottom: state.params.overlayMode ? 0 : safeOffset,
    rawBottom: safeOffset,
    level,
    overlayMode: state.params.overlayMode,
    dragging: !animate,
    source: "__trayPanelModule"
  });
}

function setLevel(state, bus, level, silent = false) {
  state.level = clampInt(level, 0, 2);
  state.dragging = false;
  state.dragLastDy = 0;
  state.dragStartOffset = offsetForLevel(state, state.level);

  applyOffset(state, bus, offsetForLevel(state, state.level), !silent, state.level);

  if (state.level === 0) bus.emit("trayPanel:closed");
}

function dragMove(state, bus, dy) {
  if (!state.dragging) return;

  state.dragLastDy = Number(dy) || 0;
  applyOffset(state, bus, state.currentOffset - state.dragLastDy, false);
}

function dragEnd(state, bus, vy) {
  state.dragging = false;

  const velocity = Number(vy) || 0;
  const thr = Number(state.params.velocityThreshold) || 720;
  const off = clamp(state.currentOffset, 0, maxOffset(state));
  const startOff = clamp(state.dragStartOffset, 0, maxOffset(state));
  const delta = off - startOff;
  const intent = Number(state.params.intentDistancePx) || 36;

  if (Math.abs(velocity) >= thr) {
    setLevel(state, bus, nextLevelByDirection(state.level, velocity < 0 ? 1 : -1));
    return;
  }

  if (Math.abs(delta) >= intent) {
    setLevel(state, bus, nextLevelByDirection(state.level, delta > 0 ? 1 : -1));
    return;
  }

  setLevel(state, bus, nearestLevel(state, off));
}

function nextLevelByDirection(level, dir) {
  if (dir > 0) return clampInt(level + 1, 0, 2);
  if (dir < 0) return clampInt(level - 1, 0, 2);
  return clampInt(level, 0, 2);
}

function nearestLevel(state, offset) {
  const vh = window.innerHeight;
  const targets = [
    { l: 0, px: 0 },
    { l: 1, px: vh * state.params.level1 },
    { l: 2, px: vh * state.params.level2 }
  ];

  const nearest = targets.reduce((a, b) =>
    Math.abs(b.px - offset) < Math.abs(a.px - offset) ? b : a
  );

  return nearest.l;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, Number(v)));
}

function clampInt(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function hexToRgb(hex) {
  const clean = String(hex || "").trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;

  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
}

// CHANGELOG v14:
// • Убран рассинхрон между tray и trayPanel при rubber-offset.
// • trayPanel теперь отдаёт tray визуальный offset, а viewport — safe offset.
// • content/overlay/insets остаются clamp-safe.
// • Сохранён быстрый swipe v13.
// • Сохранён directional snap и intentDistancePx.
// • Визуал панели не изменён.