// ===================================================================
// BACKGROUND SNAKES EFFECTS — v46
// -------------------------------------------------------------------
// Ключ: __backgroundSnakesEffectsModule
// Зависимость: __backgroundSnakesModule
//
// CHANGELOG v46:
// • Добавлен параметр "Яркость вспышки (%)" → flashOpacity (0–200%)
// • Вся вспышка теперь умножается на коэффициент flashOpacity
// • Ничего не сломано, логика v45 сохранена полностью
// ===================================================================

import { defineModule } from "../../engine/moduleFactory.js";

export const backgroundSnakesEffectsInspector = {
  "Эффект неона (вкл)": {
    type: "toggle",
    value: false,
    param: "neonEnabled"
  },

  "Голова (вкл)": {
    type: "toggle",
    value: false,
    param: "headEnabled"
  },

  "Вспышка неона (вкл)": {
    type: "toggle",
    value: false,
    param: "flashEnabled"
  },

  // NEW 🔥 — яркость вспышки
  "Яркость вспышки (%)": {
    type: "slider",
    min: 0,
    max: 200,
    step: 5,
    value: 15,
    param: "flashOpacity"
  },

  "Буст при броске монеты (вкл)": {
    type: "toggle",
    value: true,
    param: "boostEnabled"
  },

  "Скорость буста (%)": {
    type: "slider",
    min: 100,
    max: 1500,
    step: 10,
    value: 900,
    param: "boostSpeed"
  },

  "Длительность буста (мс)": {
    type: "slider",
    min: 100,
    max: 2000,
    step: 50,
    value: 600,
    param: "boostDuration"
  }
};

// ===================================================================
// MODULE
// ===================================================================

export const registerBackgroundSnakesEffectsModule = defineModule({
  key: "__backgroundSnakesEffectsModule",
  name: "Фон: Кибер-Змейки — Эффекты v46",
  inspector: backgroundSnakesEffectsInspector,
  dependencies: ["__backgroundSnakesModule"],

  createState() {
    return {
      canvas: null,
      ctx: null,
      bus: null,
      store: null,

      snakes: [],
      resizeHandler: null,

      boostActive: false,
      boostStartTime: 0,
      boostFade: 0,

      flashStrength: 0,
      originalBrightness: 1,

      params: {
        neonEnabled: true,
        headEnabled: true,

        flashEnabled: true,
        flashOpacity: 100, // NEW

        boostEnabled: true,
        boostSpeed: 250,
        boostDuration: 800,

        glowStrength: 10,
        glowRadius: 13,
        whiteGlowSize: 16,
        whiteGlowStrength: 40,
        headSize: 1
      }
    };
  },

  onStart({ ctx, state, store }) {
    state.bus = ctx.bus;
    state.store = store;

    const container =
      ctx.container || document.getElementById("game-container");
    if (!container) return;

    const bgRoot =
      container.querySelector('[data-bg-snakes-root="1"]') ||
      [...container.children].find((el) => el.style?.zIndex === "0");

    const canvas = document.createElement("canvas");
    Object.assign(canvas.style, {
      position: "absolute",
      inset: 0,
      pointerEvents: "none"
    });

    if (bgRoot) {
      const snakeCanvas = bgRoot.querySelector("canvas");
      if (snakeCanvas && snakeCanvas.nextSibling) {
        bgRoot.insertBefore(canvas, snakeCanvas.nextSibling);
      } else {
        bgRoot.appendChild(canvas);
      }
    } else {
      container.prepend(canvas);
    }

    state.canvas = canvas;
    state.ctx = canvas.getContext("2d");

    resizeCanvas(state);

    state.bus.on(
      "bg2:frame",
      ({ snakes }) => {
        state.snakes = snakes || [];
        drawEffects(state);
      },
      { moduleKey: "__backgroundSnakesEffectsModule" }
    );

    state.bus.on(
      "coin:spinStart",
      () => triggerBoost(state),
      { moduleKey: "__backgroundSnakesEffectsModule" }
    );

    state.bus.on(
      "__backgroundSnakesModule:beforeUpdate",
      (payload) => applyBoostToMovement(state, payload),
      { moduleKey: "__backgroundSnakesEffectsModule" }
    );

    state.resizeHandler = () => resizeCanvas(state);
    window.addEventListener("resize", state.resizeHandler);

    state.originalBrightness =
      state.store.get("bg2:brightness") ?? 1;
  },

  onDisable({ state }) {
    if (state.bus) state.bus.offModule("__backgroundSnakesEffectsModule");

    if (state.resizeHandler) {
      window.removeEventListener("resize", state.resizeHandler);
      state.resizeHandler = null;
    }

    if (state.canvas?.parentNode) {
      state.canvas.remove();
    }

    state.store.set("bg2:brightness", state.originalBrightness);

    state.canvas = null;
    state.ctx = null;
    state.snakes = [];
  },

  onParam({ param, value, state }) {
    if (param in state.params) {
      state.params[param] = value;
    }
  }
});

// ===================================================================
// BOOST + FLASH
// ===================================================================

function triggerBoost(state) {
  const { flashEnabled, boostEnabled } = state.params;

  if (!flashEnabled && !boostEnabled) return;

  state.boostActive = true;
  state.boostStartTime = performance.now();
  state.boostFade = 1;

  if (flashEnabled) {
    state.flashStrength = 1;

    state.originalBrightness =
      state.store.get("bg2:brightness") ?? 1;

    state.store.set(
      "bg2:brightness",
      state.originalBrightness * (1 + 1.4)
    );
  }
}

function applyBoostToMovement(effects, payload) {
  const snakesState = payload?.state;
  if (!snakesState) return;

  const { flashEnabled, boostEnabled } = effects.params;

  const now = performance.now();
  const dur = effects.params.boostDuration;
  const t = now - effects.boostStartTime;

  if (!effects.boostActive || t >= dur) {
    effects.boostActive = false;
    effects.boostFade = 0;
    effects.flashStrength = 0;

    if (flashEnabled) {
      effects.store.set(
        "bg2:brightness",
        effects.originalBrightness
      );
    }

    const p = snakesState.params;
    const cache = snakesState.cache;
    if (cache) {
      cache.speedMul = p.speedMul;
      cache.segmentLength = p.segmentLength;
    }
    return;
  }

  const fade = 1 - t / dur;
  effects.boostFade = fade;

  if (flashEnabled) {
    effects.flashStrength = fade;

    effects.store.set(
      "bg2:brightness",
      effects.originalBrightness * (1 + fade * 1.4)
    );
  }

  if (!boostEnabled) return;

  const { boostSpeed } = effects.params;
  const base = boostSpeed / 100;
  const factor = 1 + (base - 1) * fade;

  const p = snakesState.params;
  const cache = snakesState.cache;

  cache.speedMul = p.speedMul * factor;
  cache.segmentLength = p.segmentLength * (1 + 0.4 * fade);
}

// ===================================================================
// CANVAS RESIZE
// ===================================================================

function resizeCanvas(state) {
  const cnv = state.canvas;
  const ctx = state.ctx;

  if (!cnv || !ctx) return;

  const parent = cnv.parentNode;
  const dpr = window.devicePixelRatio || 1;

  cnv.width = parent.clientWidth * dpr;
  cnv.height = parent.clientHeight * dpr;

  cnv.style.width = "100%";
  cnv.style.height = "100%";

  ctx.resetTransform();
  ctx.scale(dpr, dpr);
}

// ===================================================================
// DRAW FX
// ===================================================================

function drawEffects(state) {
  const ctx = state.ctx;
  const cnv = state.canvas;

  ctx.clearRect(0, 0, cnv.width, cnv.height);

  const snakes = state.snakes;
  if (!snakes?.length) return;

  const {
    neonEnabled,
    headEnabled,
    glowStrength,
    glowRadius,
    whiteGlowSize,
    whiteGlowStrength,
    headSize
  } = state.params;

  const flashFade = state.flashStrength;

  // NEW: множитель от пользователя
  const flashUser = (state.params.flashOpacity ?? 100) / 100;

  // NEW: учитываем flashUser
  const flashMul = flashFade * flashUser * 1.2;

  const baseHex = resolveBaseSnakeColor(state, snakes);
  const baseRGB = hexToRGB(baseHex);
  const tintRGB = mixWithWhite(baseRGB, 0.4);

  const tintRGBA = (a) => rgbToRGBA(tintRGB, a);
  const baseRGBA = (a) => rgbToRGBA(baseRGB, a);

  const globalBrightness = state.store.get("bg2:brightness") ?? 1;

  const glowMul = 1 + flashFade * 1.4;

  for (const snake of snakes) {
    const pts = snake.points;
    if (!pts || pts.length < 2) continue;

    const path = new Path2D();
    path.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      path.lineTo(pts[i].x, pts[i].y);
    }

    const depth = snake.depth ?? 0;
    const depthFactor = 0.5 + (1 - depth) * 0.5;
    const alpha = (snake.brightness ?? globalBrightness) * depthFactor;

    // 🎆 ВСПЫШКА
    if (flashFade > 0.01 && flashUser > 0.01) {
      ctx.save();
      ctx.globalAlpha = alpha * flashMul * 0.9;
      ctx.strokeStyle = "white";
      ctx.lineWidth = 3.6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke(path);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = alpha * flashMul * 0.7;
      ctx.strokeStyle = tintRGBA(1);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke(path);
      ctx.restore();
    }

    // 🔥 НЕОН
    if (neonEnabled) {
      const innerFade = glowStrength / 100 * alpha * glowMul;

      if (innerFade > 0.01) {
        ctx.save();
        ctx.globalAlpha = innerFade;
        ctx.strokeStyle = baseRGBA(1);
        ctx.lineWidth = glowRadius;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = baseRGBA(1);
        ctx.shadowBlur = glowRadius;
        ctx.stroke(path);
        ctx.restore();
      }

      ctx.save();
      ctx.globalAlpha = alpha * 0.9 * glowMul;
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1.2;
      ctx.shadowColor = "white";
      ctx.shadowBlur = whiteGlowSize * (whiteGlowStrength / 50);
      ctx.stroke(path);
      ctx.restore();
    }

    // 🟣 ГОЛОВА
    if (headEnabled && snake.head) {
      const h = snake.head;

      ctx.save();

      const headAlpha = Math.min(alpha * 1.35 * glowMul, 1);

      ctx.globalAlpha = headAlpha;
      ctx.fillStyle = tintRGBA(1);

      ctx.shadowColor = tintRGBA(1);
      ctx.shadowBlur = 22 * glowMul;

      const outerR = headSize * 2.6;
      ctx.beginPath();
      ctx.arc(h.x, h.y, outerR, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 8 * glowMul;
      ctx.globalAlpha = Math.min(headAlpha * 1.1, 1);

      const coreR = headSize * 1.4;
      ctx.beginPath();
      ctx.arc(h.x, h.y, coreR, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
}

// ===================================================================
// UTILS
// ===================================================================

function resolveBaseSnakeColor(state, snakes) {
  if (snakes.length) {
    const s = snakes[0];
    if (typeof s.color === "string") return s.color;
    if (typeof s.baseColor === "string") return s.baseColor;
  }

  const storeColor = state.store?.get("bg2:color");
  if (typeof storeColor === "string" && storeColor.trim()) {
    return storeColor;
  }

  return "#00eaff";
}

function hexToRGB(hex) {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) {
    h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  }
  return {
    r: parseInt(h.slice(0,2),16),
    g: parseInt(h.slice(2,4),16),
    b: parseInt(h.slice(4,6),16)
  };
}

function rgbToRGBA(rgb,a){
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
}

function mixWithWhite(rgb, t=0.4){
  return {
    r: Math.round(rgb.r + (255 - rgb.r)*t),
    g: Math.round(rgb.g + (255 - rgb.g)*t),
    b: Math.round(rgb.b + (255 - rgb.b)*t)
  };
}