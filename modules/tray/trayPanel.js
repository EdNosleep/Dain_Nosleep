// ======================================
// Dain_Coin — TRAY PANEL MODULE (v9)
// Elastic Bottom Sheet + Proper Scroll
// ======================================
//
// CHANGELOG v9:
// • Динамический scroll:
//   - content.maxHeight = currentOffset - topInset
//   - scroll работает на любом уровне
// • Content Host (mount/unmount) сохранён
// • 3 уровня (0 / 1 / 2)
// • Swipe + velocity snap
// • Rubber overscroll
// • Пропорциональный overlay
//
// ======================================

import { defineModule } from "../../moduleFactory.js";

// ====== INSPECTOR ======

const panelInspector = {
  "Высота уровня 1 (%)": {
    min: 20, max: 50, step: 1, value: 33,
    param: "level1", type: "slider", hidden: true
  },
  "Высота уровня 2 (%)": {
    min: 60, max: 90, step: 1, value: 80,
    param: "level2", type: "slider", hidden: true
  },
  "Скорость анимации (мс)": {
    min: 150, max: 650, step: 25, value: 350,
    param: "animDuration", type: "slider"
  },
  "Макс. затемнение overlay": {
    min: 0, max: 0.8, step: 0.05, value: 0.5,
    param: "overlayDarkness", type: "slider",
  },
  "Порог скорости свайпа (px/s)": {
    min: 250, max: 2200, step: 50, value: 800,
    param: "velocityThreshold", type: "slider", hidden: true 
  },
  "Сопротивление overscroll": {
    min: 0.15, max: 0.6, step: 0.05, value: 0.35,
    param: "rubberResistance", type: "slider", hidden: true 
  }
};

// ====== MODULE ======

export const registerTrayPanelModule = defineModule({
  key: "__trayPanelModule",
  name: "Панель трея (v9)",
  inspector: panelInspector,
  dependencies: [],

  createState() {
    return {
      params: {
        level1: panelInspector["Высота уровня 1 (%)"].value / 100,
        level2: panelInspector["Высота уровня 2 (%)"].value / 100,
        animDuration: panelInspector["Скорость анимации (мс)"].value,
        overlayDarkness: panelInspector["Макс. затемнение overlay"].value,
        velocityThreshold: panelInspector["Порог скорости свайпа (px/s)"].value,
        rubberResistance: panelInspector["Сопротивление overscroll"].value
      },

      level: 0,
      dragging: false,
      currentOffset: 0,

      overlay: null,
      panel: null,
      content: null,

      // content host
      currentCleanup: null
    };
  },

  onStart({ state, bus }) {
    // ====== OVERLAY ======
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,0)",
      pointerEvents: "none",
      transition: `background ${state.params.animDuration}ms ease`,
      zIndex: 8990
    });

    overlay.onclick = () =>
      bus.emit("tray:setPanelLevel", { level: 0 });

    // ====== PANEL ======
    const panel = document.createElement("div");
    Object.assign(panel.style, {
      position: "fixed",
      left: "0",
      right: "0",
      bottom: "0",
      height: "100%",
      transform: "translateY(100%)",
      transition: `transform ${state.params.animDuration}ms ease`,
      background: "rgba(20,20,20,0.95)",
      backdropFilter: "blur(12px)",
      boxShadow: "0 -10px 30px rgba(0,0,0,0.45)",
      zIndex: 8995,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    });

    // ====== CONTENT ======
    const content = document.createElement("div");
    Object.assign(content.style, {
      flex: "1",
      overflowY: "auto",
      overscrollBehavior: "contain",
      padding: "16px",
      color: "#fff",
      boxSizing: "border-box"
    });

    panel.appendChild(content);
    document.body.append(overlay, panel);

    state.overlay = overlay;
    state.panel = panel;
    state.content = content;

    // sync tray motion
    bus.emit("trayPanel:motion", { animDuration: state.params.animDuration });

    // ====== EVENTS ======

    bus.on("tray:openPanel", (payload = {}) => {
      if (payload.mount) hostSetContent(state, payload.mount);
      setLevel(state, bus, 1);
    }, { moduleKey: "__trayPanelModule" });

    bus.on("tray:closePanel", () =>
      setLevel(state, bus, 0),
      { moduleKey: "__trayPanelModule" }
    );

    bus.on("tray:setPanelLevel", ({ level }) =>
      setLevel(state, bus, level),
      { moduleKey: "__trayPanelModule" }
    );

    bus.on("tray:panelDragStart", () => {
      state.dragging = true;
    }, { moduleKey: "__trayPanelModule" });

    bus.on("tray:panelDragMove", ({ dy }) =>
      dragMove(state, bus, dy),
      { moduleKey: "__trayPanelModule" }
    );

    bus.on("tray:panelDragEnd", ({ vy }) =>
      dragEnd(state, bus, vy),
      { moduleKey: "__trayPanelModule" }
    );

    setLevel(state, bus, 0, true);
  },

  onDisable({ state }) {
    hostClearContent(state);
    state.overlay?.remove();
    state.panel?.remove();
  },

  onParam({ param, value, state, bus }) {
    switch (param) {
      case "level1":
        state.params.level1 = value / 100;
        break;
      case "level2":
        state.params.level2 = value / 100;
        break;
      case "animDuration":
        state.params.animDuration = value;
        state.panel.style.transition = `transform ${value}ms ease`;
        state.overlay.style.transition = `background ${value}ms ease`;
        bus.emit("trayPanel:motion", { animDuration: value });
        break;
      case "overlayDarkness":
        state.params.overlayDarkness = value;
        break;
      case "velocityThreshold":
        state.params.velocityThreshold = value;
        break;
      case "rubberResistance":
        state.params.rubberResistance = value;
        break;
    }
  }
});

// ============================================================================
// CONTENT HOST
// ============================================================================

function hostClearContent(state) {
  if (typeof state.currentCleanup === "function") {
    try { state.currentCleanup(); } catch (_) {}
  }
  state.currentCleanup = null;
  if (state.content) state.content.innerHTML = "";
}

function hostSetContent(state, mount) {
  hostClearContent(state);
  const cleanup = mount({ container: state.content });
  if (typeof cleanup === "function") {
    state.currentCleanup = cleanup;
  }
}

// ============================================================================
// CORE LOGIC
// ============================================================================

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
  const vh = window.innerHeight;
  const max = maxOffset(state);

  let offset = rawOffset;
  if (offset < 0)
    offset *= state.params.rubberResistance;
  else if (offset > max)
    offset = max + (offset - max) * state.params.rubberResistance;

  state.currentOffset = offset;

  state.panel.style.transition = animate
    ? `transform ${state.params.animDuration}ms ease`
    : "none";

  state.panel.style.transform =
    `translateY(${vh - offset}px)`;

  // ====== KEY PART: dynamic scroll height ======
  const safeTop = 12; // отступ сверху под комфорт
  const visibleHeight = Math.max(0, offset - safeTop);
  state.content.style.maxHeight = `${visibleHeight}px`;

  // overlay
  const ratio = clamp(offset / max, 0, 1);
  state.overlay.style.background =
    `rgba(0,0,0,${ratio * state.params.overlayDarkness})`;
  state.overlay.style.pointerEvents =
    ratio > 0.01 ? "auto" : "none";

  bus.emit("trayPanel:offset", {
    offsetPx: clamp(offset, 0, max),
    level: typeof levelHint === "number" ? levelHint : state.level,
    dragging: !animate
  });
}

function setLevel(state, bus, level, silent = false) {
  state.level = clampInt(level, 0, 2);
  state.dragging = false;

  applyOffset(
    state,
    bus,
    offsetForLevel(state, state.level),
    !silent,
    state.level
  );

  if (state.level === 0) {
    hostClearContent(state);
    bus.emit("trayPanel:closed");
  }
}

// ============================================================================
// DRAG
// ============================================================================

function dragMove(state, bus, dy) {
  if (!state.dragging) return;
  applyOffset(state, bus, state.currentOffset - dy, false);
}

function dragEnd(state, bus, vy) {
  state.dragging = false;

  const thr = state.params.velocityThreshold;
  if (Math.abs(vy) >= thr) {
    if (vy < 0) setLevel(state, bus, state.level === 0 ? 1 : 2);
    else setLevel(state, bus, state.level === 2 ? 1 : 0);
    return;
  }

  const vh = window.innerHeight;
  const off = clamp(state.currentOffset, 0, maxOffset(state));

  const targets = [
    { l: 0, px: 0 },
    { l: 1, px: vh * state.params.level1 },
    { l: 2, px: vh * state.params.level2 }
  ];

  const nearest = targets.reduce((a, b) =>
    Math.abs(b.px - off) < Math.abs(a.px - off) ? b : a
  );

  setLevel(state, bus, nearest.l);
}

// ============================================================================
// UTILS
// ============================================================================

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function clampInt(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}