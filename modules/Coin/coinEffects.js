// ===============================================
// Dain_Coin — COIN EFFECTS MODULE (v4)
// Абсолютно независимый модуль, не требует правок coin.js
// ===============================================

import { defineModule } from "./moduleFactory.js";

export const coinEffectsInspector = {
  "Цвет свечения": {
    type: "color",
    value: "#ffdd88",
    param: "glowColor"
  },
  "Длительность (сек)": {
    type: "slider",
    min: 0.2,
    max: 3,
    step: 0.1,
    value: 1.2,
    param: "glowDuration"
  },
  "Яркость (%)": {
    type: "slider",
    min: 10,
    max: 300,
    step: 5,
    value: 140,
    param: "glowStrength"
  },
  "Размер (%)": {
    type: "slider",
    min: 110,
    max: 250,
    step: 5,
    value: 150,
    param: "glowSize"
  }
};

export const registerCoinEffectsModule = defineModule({
  key: "__coinEffectsModule",
  name: "Эффекты монеты",
  inspector: coinEffectsInspector,
  dependencies: ["__coinModule"],

  createState() {
    return {
      params: {
        glowColor: coinEffectsInspector["Цвет свечения"].value,
        glowDuration: coinEffectsInspector["Длительность (сек)"].value,
        glowStrength: coinEffectsInspector["Яркость (%)"].value,
        glowSize: coinEffectsInspector["Размер (%)"].value
      },

      glow: null,
      wrap: null
    };
  },

  onStart({ ctx, state, bus }) {
    // === ищем wrap монеты ===
    const coinLayer = ctx.container.querySelector("div > div");
    if (!coinLayer) {
      console.warn("coinEffects: coinLayer not found");
      return;
    }

    const wrap = coinLayer; // это wrap монеты
    state.wrap = wrap;

    // === создаём свечение в wrap (позади монеты) ===
    const glow = document.createElement("div");
    Object.assign(glow.style, {
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%) scale(0.8)",
      width: "260px",
      height: "260px",
      borderRadius: "50%",
      pointerEvents: "none",
      zIndex: "-1",
      opacity: "0",
      filter: "blur(28px)",
      transition: "opacity 0.25s ease-out, transform 0.25s ease-out"
    });
    wrap.appendChild(glow);
    state.glow = glow;

    // === слушаем окончание броска ===
    bus.on("coin:spinEnd", () => runGlowEffect(state), {
      moduleKey: "__coinEffectsModule"
    });
  },

  onDisable({ state }) {
    if (state.glow?.parentNode) state.glow.remove();
    state.glow = null;
    state.wrap = null;
  },

  onParam({ param, value, state }) {
    state.params[param] = value;
  }
});

// ===============================================
// ЭФФЕКТ СВЕЧЕНИЯ
// ===============================================

function runGlowEffect(state) {
  const glow = state.glow;
  if (!glow) return;

  const p = state.params;

  glow.style.background = `radial-gradient(circle, ${p.glowColor} 0%, transparent 70%)`;

  glow.style.transition = `
    opacity ${p.glowDuration * 0.4}s ease-out,
    transform ${p.glowDuration * 0.4}s ease-out
  `;

  glow.style.transform = `translate(-50%, -50%) scale(${p.glowSize / 100})`;
  glow.style.opacity = `${p.glowStrength / 100}`;

  setTimeout(() => {
    glow.style.transition = `
      opacity ${p.glowDuration * 0.6}s ease-in,
      transform ${p.glowDuration * 0.6}s ease-in
    `;
    glow.style.opacity = "0";
    glow.style.transform = `translate(-50%, -50%) scale(${(p.glowSize / 100) * 1.2})`;
  }, p.glowDuration * 400);
}