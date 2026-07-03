// ======================================================
// NOSLEEP_ENGINE — concentricPulseTestButton.js v1
// Test helper button for concentricPulse effect
// ======================================================

import { defineModule } from "../../engine/moduleFactory.js";

const KEY = "__concentricPulseTestButtonModule";
const EFFECT_ID = "concentricPulse_testButton_hold";

export const registerConcentricPulseTestButtonModule = defineModule({
  key: KEY,
  name: "Concentric Pulse Test Button",

  inspector: {
    "Показать тестовую кнопку": { param: "enabled", type: "toggle", value: true },

    "Кнопка X %": { param: "buttonX", type: "range", min: 0, max: 100, step: 1, value: 50 },
    "Кнопка Y %": { param: "buttonY", type: "range", min: 0, max: 100, step: 1, value: 50 },

    "Цвет": { param: "pulseColor", type: "color", value: "#00ccff" },
    "Opacity": { param: "pulseOpacity", type: "range", min: 0.05, max: 1, step: 0.05, value: 0.78 },
    "Radius": { param: "pulseRadius", type: "range", min: 12, max: 220, step: 2, value: 78 },
    "Interval": { param: "pulseInterval", type: "range", min: 30, max: 260, step: 10, value: 80 },
    "Duration": { param: "pulseDuration", type: "range", min: 220, max: 1800, step: 20, value: 740 },
    "Glow": { param: "pulseGlow", type: "range", min: 0, max: 70, step: 1, value: 28 },
    "Line width": { param: "pulseLineWidth", type: "range", min: 1, max: 10, step: 0.5, value: 2.5 }
  },

  dependencies: ["__visualEngineModule"],

  createState() {
    return {
      params: {
        enabled: true,
        buttonX: 50,
        buttonY: 50,

        pulseColor: "#00ccff",
        pulseOpacity: 0.78,
        pulseRadius: 78,
        pulseInterval: 80,
        pulseDuration: 740,
        pulseGlow: 28,
        pulseLineWidth: 2.5
      },

      button: null,
      pointerId: null,
      active: false
    };
  },

  onStart({ ctx, bus, state }) {
    state.button = createButton();
    ctx.container.appendChild(state.button);

    applyButtonPosition(state);

    const down = e => {
      if (!state.params.enabled) return;

      e.preventDefault();
      e.stopPropagation();

      state.pointerId = e.pointerId;
      state.active = true;

      state.button.setPointerCapture?.(e.pointerId);
      moveButtonToPointer(state, e.clientX, e.clientY);
      startPulse(bus, state, e.clientX, e.clientY);
      setPressed(state, true);
    };

    const move = e => {
      if (!state.active || e.pointerId !== state.pointerId) return;

      e.preventDefault();
      e.stopPropagation();

      moveButtonToPointer(state, e.clientX, e.clientY);

      bus.emit("visual:move", {
        id: EFFECT_ID,
        target: {
          x: e.clientX,
          y: e.clientY
        }
      });
    };

    const up = e => {
      if (!state.active || e.pointerId !== state.pointerId) return;

      e.preventDefault();
      e.stopPropagation();

      stopPulse(bus, state);
    };

    state.button.addEventListener("pointerdown", down, { passive: false });
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up, { passive: false });
    window.addEventListener("pointercancel", up, { passive: false });

    state.cleanup = () => {
      state.button?.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };

    updateVisibility(state);
  },

  onDisable({ bus, state }) {
    stopPulse(bus, state);

    try { state.cleanup?.(); } catch (_) {}
    state.cleanup = null;

    try { state.button?.remove(); } catch (_) {}
    state.button = null;
  },

  onParam({ param, value, state }) {
    state.params[param] = value;

    if (param === "buttonX" || param === "buttonY") {
      applyButtonPosition(state);
    }

    if (param === "enabled") {
      updateVisibility(state);
    }
  }
});

function createButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Pulse";

  Object.assign(button.style, {
    position: "fixed",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: "74px",
    height: "74px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.22)",
    background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.22), rgba(0,204,255,0.22) 42%, rgba(6,10,18,0.84) 100%)",
    color: "white",
    fontSize: "13px",
    fontWeight: "800",
    letterSpacing: "0.03em",
    boxShadow: "0 18px 50px rgba(0,204,255,0.22), inset 0 0 24px rgba(255,255,255,0.08)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    zIndex: "1250",
    touchAction: "none",
    userSelect: "none",
    WebkitUserSelect: "none"
  });

  return button;
}

function applyButtonPosition(state) {
  if (!state.button || state.active) return;

  const x = clamp(Number(state.params.buttonX) || 0, 0, 100);
  const y = clamp(Number(state.params.buttonY) || 0, 0, 100);

  state.button.style.left = `${x}%`;
  state.button.style.top = `${y}%`;
  state.button.style.transform = "translate(-50%, -50%)";
}

function moveButtonToPointer(state, x, y) {
  if (!state.button) return;

  state.button.style.left = `${x}px`;
  state.button.style.top = `${y}px`;
  state.button.style.transform = "translate(-50%, -50%)";
}

function updateVisibility(state) {
  if (!state.button) return;
  state.button.style.display = state.params.enabled ? "block" : "none";
}

function startPulse(bus, state, x, y) {
  bus.emit("visual:play", {
    id: EFFECT_ID,
    effect: "concentricPulse",
    target: { x, y },
    overrides: {
      pulseColor: state.params.pulseColor,
      pulseOpacity: state.params.pulseOpacity,
      pulseRadius: state.params.pulseRadius,
      pulseInterval: state.params.pulseInterval,
      pulseDuration: state.params.pulseDuration,
      pulseGlow: state.params.pulseGlow,
      pulseLineWidth: state.params.pulseLineWidth
    },
    source: KEY
  });
}

function stopPulse(bus, state) {
  bus.emit("visual:stop", { id: EFFECT_ID });

  state.pointerId = null;
  state.active = false;

  setPressed(state, false);
}

function setPressed(state, pressed) {
  if (!state.button) return;

  state.button.style.boxShadow = pressed
    ? "0 20px 70px rgba(0,204,255,0.44), inset 0 0 34px rgba(255,255,255,0.16)"
    : "0 18px 50px rgba(0,204,255,0.22), inset 0 0 24px rgba(255,255,255,0.08)";
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// CHANGELOG v1:
// • Создан helper-модуль для теста concentricPulse.
// • Inspector: включение кнопки, позиция X/Y %, параметры эффекта.
// • При удержании кнопки запускается бесконечный pulse.
// • При drag кнопка и эффект следуют за пальцем.
// • При отпускании эффект останавливается.

