// ========================================================
// Dain_Coin — COIN EFFECT RING (v6 FINAL — tight pulse)
// Одна нода → много волн через CSS, минимальная пауза,
// стабильность уровня Prem, работает в любом DOM.
// ========================================================

import { defineModule } from "../../moduleFactory.js";

export const coinEffectRingInspector = {
  "Цвет": { type: "color", value: "#ffd966", param: "color" },
  "Размер (%)": { type: "slider", min: 80, max: 300, step: 5, value: 150, param: "size" },
  "Яркость (%)": { type: "slider", min: 20, max: 300, step: 5, value: 150, param: "strength" },
  "Длительность волны (сек)": { type: "slider", min: 0.2, max: 2, step: 0.1, value: 0.8, param: "wave" },
  "Кол-во волн": { type: "slider", min: 1, max: 7, step: 1, value: 3, param: "count" }
};

export const registerCoinEffectRingModule = defineModule({
  key: "__coinEffectRing",
  name: "FX Кольца — Pulse Tight",
  inspector: coinEffectRingInspector,
  dependencies: ["__coinModule"],

  createState() {
    return {
      params: {
        color: "#ffd966",
        size: 150,
        strength: 150,
        wave: 0.8,
        count: 3
      },
      wrap: null
    };
  },

  onStart({ ctx, state, bus }) {
    const wrap = ctx.container.querySelector("div > div");
    if (!wrap) return;
    state.wrap = wrap;

    bus.on("coin:spinEnd", () => runRingFX(state), {
      moduleKey: "__coinEffectRing"
    });
  },

  onDisable({ state }) {
    state.wrap = null;
  },

  onParam({ param, value, state }) {
    state.params[param] = value;
  }
});

// ========================================================
// RUN EFFECT
// ========================================================

function runRingFX(state) {
  const wrap = state.wrap;
  if (!wrap) return;

  const p = state.params;
  const totalDuration = p.wave * p.count;

  const node = document.createElement("div");

  Object.assign(node.style, {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: `${p.size}px`,
    height: `${p.size}px`,
    transform: "translate(-50%, -50%) scale(0.1)",
    borderRadius: "50%",
    border: `${Math.max(2, p.size * 0.04)}px solid ${p.color}`,
    opacity: p.strength / 150,
    pointerEvents: "none",
    zIndex: "-1",
    animation: `ringPulse ${p.wave}s ease-out ${p.count}`
  });

  wrap.appendChild(node);

  setTimeout(() => node.remove(), totalDuration * 1000);
}

// ========================================================
// KEYFRAMES (inject once) — TIGHT PULSE VERSION
// ========================================================

if (!document.getElementById("ringPulse-keyframes")) {
  const style = document.createElement("style");
  style.id = "ringPulse-keyframes";
  style.innerHTML = `
  @keyframes ringPulse {
    0% {
      transform: translate(-50%, -50%) scale(0.1);
      opacity: 1;
    }
    85% {
      transform: translate(-50%, -50%) scale(2.5);
      opacity: 0;
    }
    100% {
      transform: translate(-50%, -50%) scale(0.1);
      opacity: 0;
    }
  }`;
  document.head.appendChild(style);
}