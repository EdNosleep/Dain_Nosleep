// ========================================================
// Dain_Coin — COIN EFFECT NEON (v4 — Smooth Wave + STRONG BRIGHTNESS)
// Усиленная насыщенность, но та же красивая расходящаяся волна.
// ========================================================

import { defineModule } from "./moduleFactory.js";

export const coinEffectNeonInspector = {
  "Цвет": { type: "color", value: "#88e0ff", param: "color" },
  "Длительность (сек)": { type: "slider", min: 0.2, max: 3, step: 0.1, value: 1, param: "duration" },
  "Яркость (%)": { type: "slider", min: 20, max: 800, step: 10, value: 400, param: "strength" },
  "Размер (%)": { type: "slider", min: 80, max: 300, step: 5, value: 150, param: "size" }
};

export const registerCoinEffectNeonModule = defineModule({
  key: "__coinEffectNeon",
  name: "FX Неон (Wave + Strong Brightness)",
  inspector: coinEffectNeonInspector,
  dependencies: ["__coinModule"],

  createState() {
    return {
      params: {
        color: "#88e0ff",
        duration: 1,
        strength: 400,   // ярче по умолчанию
        size: 150
      },
      wrap: null
    };
  },

  onStart({ ctx, state, bus }) {
    const wrap = ctx.container.querySelector("div > div");
    if (!wrap) return;
    state.wrap = wrap;

    bus.on("coin:spinEnd", () => spawnNeon(state.wrap, state.params), {
      moduleKey: "__coinEffectNeon"
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
// SMOOTH WAVE — WITH HIGH BRIGHTNESS
// ========================================================

function spawnNeon(wrap, p) {
  const neon = document.createElement("div");

  const s = p.size;
  const k = p.strength / 200;  // ярче = плотнее цвет

  // коэффициенты яркости (усиленные)
  const core = s * 0.35 * k;   // раньше было 0.15–0.25
  const mid = s * 0.75 * k;
  const outer = s * 1.6 * k;   // значительно ярче

  // —————— 1) мягкий старт — безопасно, без лагов ——————
  Object.assign(neon.style, {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: `${s}px`,
    height: `${s}px`,
    borderRadius: "50%",
    transform: "translate(-50%, -50%) scale(0.4)",
    pointerEvents: "none",
    zIndex: "-1",
    opacity: 0.5,

    // Мягкий стартовый glow
    boxShadow: `
      0 0 ${core * 0.25}px ${p.color},
      0 0 ${mid * 0.20}px ${p.color}
    `,

    transition: `
      opacity ${p.duration}s ease-out,
      transform ${p.duration}s ease-out,
      box-shadow ${p.duration}s ease-out
    `
  });

  wrap.appendChild(neon);

  // —————— 2) яркий пик вспышки ——————
  requestAnimationFrame(() => {
    neon.style.opacity = 1;
    neon.style.boxShadow = `
      /* яркое плотное ядро */
      0 0 ${core}px ${p.color},

      /* мощный основной контур */
      0 0 ${mid}px ${p.color},

      /* расширенная сияющая аура */
      0 0 ${outer}px ${p.color},

      /* дополнительный bloom-слой (дает плотность) */
      inset 0 0 ${core * 0.25}px ${p.color}
    `;
  });

  // —————— 3) расширение и угасание ——————
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      neon.style.transform = "translate(-50%, -50%) scale(1.6)";
      neon.style.opacity = "0";

      neon.style.boxShadow = `
        0 0 ${core * 0.5}px ${p.color},
        0 0 ${mid * 0.45}px ${p.color},
        0 0 ${outer * 0.35}px ${p.color}
      `;
    });
  });

  setTimeout(() => neon.remove(), p.duration * 1000);
}