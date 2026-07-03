// ======================================
// NOSLEEP_ENGINE — TRAY MODULE (v13)
// Functional tray controller + px/s velocity
// ======================================

import { defineModule } from "../../engine/moduleFactory.js";
import {
  createTrayDom,
  createTrayButtonElement,
  createGlowElement,
  createIconElement,
  applyTrayVisuals,
  applyTrayPosition,
  applyTrayMotion,
  disableTrayMotion,
  applyButtonsVisuals
} from "./trayVisuals.js";

const trayInspector = {
  "Высота трея (vh)": { min: 6, max: 18, step: 1, value: 7, param: "trayHeight", type: "slider" },
  "Ширина трея (% экрана)": { min: 60, max: 100, step: 1, value: 96, param: "trayWidth", type: "slider" },
  "Отступ снизу (px)": { min: 0, max: 40, step: 1, value: 12, param: "marginBottom", type: "slider" },
  "Отступ по бокам (px)": { min: 0, max: 40, step: 1, value: 9, param: "marginSide", type: "slider", hidden: true },
  "Скругление (px)": { min: 8, max: 32, step: 1, value: 19, param: "radius", type: "slider" },

  "Цвет панели": { value: "#141414", param: "panelColor", type: "color" },
  "Прозрачность панели": { min: 0.6, max: 1, step: 0.02, value: 0.9, param: "alpha", type: "slider" },
  "Цвет рамки": { value: "#545454", param: "borderColor", type: "color" },
  "Толщина рамки (px)": { min: 0, max: 4, step: 1, value: 1, param: "borderWidth", type: "slider", hidden: true },
  "Размер тени (px)": { min: 0, max: 200, step: 5, value: 50, param: "shadowSize", type: "slider" },

  "Яркость активной иконки": { min: 1, max: 2.4, step: 0.05, value: 1.35, param: "activeBrightness", type: "slider", hidden: true },
  "Интенсивность glow (px)": { min: 0, max: 30, step: 1, value: 10, param: "iconGlowSize", type: "slider", hidden: true },
  "Цвет glow": { value: "#00ccff", param: "iconGlowColor", type: "color" },
  "Тинт иконок (mask)": { type: "toggle", value: 1, param: "maskTint", hidden: true },
  "Цвет иконки": { value: "#ffffff", param: "iconTint", type: "color" },

  "Показывать ручку (handle)": { type: "toggle", value: 1, param: "showHandle" },
  "Порог старта drag (px)": { min: 3, max: 20, step: 1, value: 5, param: "dragStartThreshold", type: "slider", hidden: true },
  "Окно скорости (мс)": { min: 40, max: 180, step: 10, value: 50, param: "velocityWindowMs", type: "slider", hidden: true },
  "Блокировка click после drag (мс)": { min: 80, max: 320, step: 10, value: 160, param: "postDragClickBlockMs", type: "slider", hidden: true }
};

export const registerTrayModule = defineModule({
  key: "__trayModule",
  name: "Нижний трей",
  inspector: trayInspector,
  dependencies: [],

  createState() {
    return {
      params: {
        trayHeight: trayInspector["Высота трея (vh)"].value,
        trayWidth: trayInspector["Ширина трея (% экрана)"].value,
        marginBottom: trayInspector["Отступ снизу (px)"].value,
        marginSide: trayInspector["Отступ по бокам (px)"].value,
        radius: trayInspector["Скругление (px)"].value,
        panelColor: trayInspector["Цвет панели"].value,
        alpha: trayInspector["Прозрачность панели"].value,
        borderColor: trayInspector["Цвет рамки"].value,
        borderWidth: trayInspector["Толщина рамки (px)"].value,
        shadowSize: trayInspector["Размер тени (px)"].value,
        activeBrightness: trayInspector["Яркость активной иконки"].value,
        iconGlowSize: trayInspector["Интенсивность glow (px)"].value,
        iconGlowColor: trayInspector["Цвет glow"].value,
        maskTint: !!trayInspector["Тинт иконок (mask)"].value,
        iconTint: trayInspector["Цвет иконки"].value,
        showHandle: !!trayInspector["Показывать ручку (handle)"].value,
        dragStartThreshold: trayInspector["Порог старта drag (px)"].value,
        velocityWindowMs: trayInspector["Окно скорости (мс)"].value,
        postDragClickBlockMs: trayInspector["Блокировка click после drag (мс)"].value
      },

      panelOffsetPx: 0,
      panelLevel: 0,
      animDuration: 300,

      tray: null,
      handle: null,
      buttonsWrap: null,

      buttons: new Map(),
      activeId: null,

      touching: false,
      dragging: false,
      dragStartedEmitted: false,
      startY: 0,
      lastY: 0,
      touchId: null,
      suppressClickUntil: 0,
      samples: [],
      samplesLastBackup: null
    };
  },

  onStart({ state, bus }) {
    const { tray, handle, buttonsWrap } = createTrayDom(state);

    document.body.appendChild(tray);

    state.tray = tray;
    state.handle = handle;
    state.buttonsWrap = buttonsWrap;

    applyTrayVisuals(state);
    applyButtonsVisuals(state);

    bus.on("trayPanel:motion", ({ animDuration }) => {
      if (typeof animDuration !== "number") return;
      state.animDuration = animDuration;
      applyTrayMotion(state);
    }, { moduleKey: "__trayModule" });

    bus.on("trayPanel:offset", ({ offsetPx, level, dragging }) => {
      state.panelOffsetPx = offsetPx || 0;
      state.panelLevel = typeof level === "number" ? level : 0;

      if (dragging) disableTrayMotion(state);
      else applyTrayMotion(state);

      applyTrayPosition(state);

      if (state.panelLevel === 0) deactivateButton(state);
    }, { moduleKey: "__trayModule" });

    bus.on("trayPanel:closed", () => deactivateButton(state), {
      moduleKey: "__trayModule"
    });

    bus.on("tray:registerButton", data => registerButton(state, bus, data), {
      moduleKey: "__trayModule"
    });

    bus.on("tray:updateButton", ({ id, iconSize }) => {
      const entry = state.buttons.get(id);
      if (!entry || typeof iconSize !== "number") return;

      entry.data.iconSize = iconSize;
      applyButtonsVisuals(state);
    }, { moduleKey: "__trayModule" });

    tray.addEventListener("touchstart", e => onTouchStart(e, state), { passive: false });
    tray.addEventListener("touchmove", e => onTouchMove(e, state, bus), { passive: false });
    tray.addEventListener("touchend", e => onTouchEnd(e, state, bus), { passive: false });
    tray.addEventListener("touchcancel", e => onTouchEnd(e, state, bus), { passive: false });
  },

  onDisable({ state }) {
    state.buttons.clear();
    state.tray?.remove();

    state.tray = null;
    state.buttonsWrap = null;
    state.handle = null;
    state.activeId = null;

    resetTouchState(state);
  },

  onParam({ param, value, state }) {
    state.params[param] = value;

    if (param === "showHandle" && state.handle) {
      state.handle.style.display = value ? "flex" : "none";
    }

    if (
      param === "activeBrightness" ||
      param === "iconGlowSize" ||
      param === "iconGlowColor" ||
      param === "maskTint" ||
      param === "iconTint"
    ) {
      applyButtonsVisuals(state);
    }

    applyTrayVisuals(state);
  }
});

function registerButton(state, bus, data) {
  const {
    id,
    order = 0,
    icon,
    iconSrc,
    iconSize,
    preferImg = false,
    onClick
  } = data || {};

  if (!id || state.buttons.has(id) || !state.buttonsWrap) return;

  const btn = createTrayButtonElement();
  btn.dataset.trayButton = id;

  const glowEl = createGlowElement();
  btn.appendChild(glowEl);

  const finalIconSize = typeof iconSize === "number" ? iconSize : 26;
  const iconEl = createIconElement(state, {
    iconSrc,
    icon,
    iconSize: finalIconSize,
    preferImg
  });

  iconEl.style.position = "relative";
  iconEl.style.zIndex = "1";
  iconEl.style.transition = "filter 0.18s ease";
  iconEl.style.willChange = "filter";

  btn.appendChild(iconEl);

  btn.onmousedown = () => (btn.style.transform = "scale(0.92)");
  btn.onmouseup = () => (btn.style.transform = "scale(1)");
  btn.onmouseleave = () => (btn.style.transform = "scale(1)");

  btn.onclick = () => {
    if (state.dragging || performance.now() < state.suppressClickUntil) return;

    bus.emit("tray:buttonPressed", { id });
    activateButton(state, id);

    if (typeof onClick === "function") {
      onClick();
    } else {
      bus.emit("tray:openPanel", { source: id });
    }
  };

  state.buttons.set(id, {
    button: btn,
    iconEl,
    glowEl,
    data: { ...data, order, iconSize: finalIconSize }
  });

  renderOrderedButtons(state);
  applyButtonsVisuals(state);
}

function renderOrderedButtons(state) {
  const ordered = [...state.buttons.entries()].sort(
    (a, b) => (a[1].data.order || 0) - (b[1].data.order || 0)
  );

  state.buttonsWrap.innerHTML = "";
  ordered.forEach(([, obj]) => state.buttonsWrap.appendChild(obj.button));
}

function activateButton(state, id) {
  state.activeId = id;
  applyButtonsVisuals(state);
}

function deactivateButton(state) {
  state.activeId = null;
  applyButtonsVisuals(state);
}

function onTouchStart(e, state) {
  if (!e.touches || e.touches.length !== 1) return;

  const touch = e.touches[0];
  const y = touch.clientY;

  state.touching = true;
  state.dragging = false;
  state.dragStartedEmitted = false;
  state.startY = y;
  state.lastY = y;
  state.touchId = touch.identifier;
  state.samples = [];
  state.samplesLastBackup = null;

  recordSample(state, y);
}

function onTouchMove(e, state, bus) {
  if (!state.touching) return;

  const touch = getActiveTouch(e, state.touchId);
  if (!touch) return;

  const y = touch.clientY;
  const dyFromStart = y - state.startY;
  const threshold = Number(state.params.dragStartThreshold) || 5;

  if (!state.dragging) {
    if (Math.abs(dyFromStart) < threshold) return;

    state.dragging = true;
    state.dragStartedEmitted = true;
    state.lastY = y;
    state.samples = [];
    state.samplesLastBackup = null;

    recordSample(state, y);
    bus.emit("tray:panelDragStart");

    e.preventDefault();
    return;
  }

  const dy = y - state.lastY;
  state.lastY = y;

  recordSample(state, y);
  e.preventDefault();

  if (dy !== 0) {
    bus.emit("tray:panelDragMove", { dy });
  }
}

function onTouchEnd(e, state, bus) {
  if (!state.touching) return;

  if (!state.dragging || !state.dragStartedEmitted) {
    resetTouchState(state);
    return;
  }

  if (e && typeof e.preventDefault === "function") {
    e.preventDefault();
  }

  const vy = computeVelocityPxPerSecond(state);
  bus.emit("tray:panelDragEnd", { vy });

  state.suppressClickUntil = performance.now() + (Number(state.params.postDragClickBlockMs) || 160);

  resetTouchState(state, { keepClickLock: true });
}

function resetTouchState(state, options = {}) {
  state.touching = false;
  state.dragging = false;
  state.dragStartedEmitted = false;
  state.startY = 0;
  state.lastY = 0;
  state.touchId = null;
  state.samples = [];
  state.samplesLastBackup = null;

  if (!options.keepClickLock) {
    state.suppressClickUntil = 0;
  }
}

function getActiveTouch(e, touchId) {
  if (!e.touches || e.touches.length === 0) return null;

  for (const touch of e.touches) {
    if (touch.identifier === touchId) return touch;
  }

  return null;
}

function recordSample(state, y) {
  const now = performance.now();
  state.samples.push({ t: now, y });

  const win = Number(state.params.velocityWindowMs) || 50;
  const cutoff = now - win;

  while (state.samples.length > 0 && state.samples[0].t < cutoff) {
    state.samples.shift();
  }

  if (state.samples.length >= 2) {
    state.samplesLastBackup = [...state.samples];
  }
}

function computeVelocityPxPerSecond(state) {
  const samples = state.samples.length >= 2
    ? state.samples
    : (state.samplesLastBackup || []);

  if (!samples || samples.length < 2) return 0;

  const first = samples[0];
  const last = samples[samples.length - 1];
  const dtMs = last.t - first.t;

  if (dtMs <= 0) return 0;

  return ((last.y - first.y) / dtMs) * 1000;
}

// CHANGELOG v13:
// • Velocity теперь отдаётся в px/s, как ожидает trayPanel.
// • Исправлена причина “не всегда открывает” при быстрых свайпах.
// • Сохранён gated drag: dragStart только после порога.
// • Сохранена защита от случайного click после drag.
// • Визуальный слой остаётся в trayVisuals.js.