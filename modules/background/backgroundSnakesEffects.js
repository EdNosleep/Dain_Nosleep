// ===================================================================
// BACKGROUND EFFECTS — v35
// -------------------------------------------------------------------
// • "Неон" отключает ТОЛЬКО неоновые эффекты (inner glow + TRON outline)
// • ГОЛОВА ВСЕГДА ВИДНА (независимо от неона)
// • Размер головы = 1 (бетон)
// • Цвет головы — в инспекторе
// • Яркость головы и эффектов привязана к яркости змейки
// • Идеальный слой: над background2, под монетой
// ===================================================================

import { defineModule } from "../../moduleFactory.js";

export const backgroundSnakesEffectsInspector = {
  "Неон (вкл/выкл)": {
    type: "toggle",
    value: true,
    param: "neonEnabled"
  },

  "Цвет головы": {
    type: "color",
    value: "#ffffff",
    param: "headColor"
  }
};

export const registerBackgroundSnakesEffectsModule = defineModule({
  key: "__backgroundSnakesEffects",
  name: "Фон: Кибер-Змейки, Эффекты V35",
  inspector: backgroundSnakesEffectsInspector,
  dependencies: ["__coinModule"],

  createState() {
    return {
      canvas: null,
      ctx: null,
      bus: null,
      store: null,
      snakes: [],

      params: {
        neonEnabled: true,

        // забетонированный неон
        glowStrength: 10,
        glowRadius: 13,

        // белый TRON контур — часть неона
        whiteGlowSize: 16,
        whiteGlowStrength: 40,

        // голова — всегда рисуется
        headColor: "#ffffff",
        headSize: 1
      }
    };
  },

  onStart({ ctx, state, store }) {
    state.bus = ctx.bus;
    state.store = store;

    const container = ctx.container;

    // === Ищем background2 root (zIndex: 0) ===
    const bg2root = [...container.children].find(
      el => el.style?.zIndex === "0"
    );

    const canvas = document.createElement("canvas");
    Object.assign(canvas.style, {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      zIndex: 1
    });

    // Вставка в root
    if (bg2root) {
      const snakeCanvas = bg2root.querySelector("canvas");
      if (snakeCanvas && snakeCanvas.nextSibling) {
        bg2root.insertBefore(canvas, snakeCanvas.nextSibling);
      } else {
        bg2root.appendChild(canvas);
      }
    } else {
      container.appendChild(canvas);
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
      { moduleKey: "__backgroundSnakesEffects" }
    );

    window.addEventListener("resize", () => resizeCanvas(state));
  },

  onDisable({ state }) {
    if (state.bus) state.bus.offModule("__backgroundSnakesEffects");
    if (state.canvas?.parentNode) state.canvas.remove();
  },

  onParam({ param, value, state }) {
    state.params[param] = value;
  }
});

// ===================================================================
// Resize
// ===================================================================

function resizeCanvas(state) {
  const cnv = state.canvas;
  const parent = cnv.parentNode;
  const dpr = window.devicePixelRatio || 1;

  cnv.width = parent.clientWidth * dpr;
  cnv.height = parent.clientHeight * dpr;

  cnv.style.width = "100%";
  cnv.style.height = "100%";

  state.ctx.resetTransform();
  state.ctx.scale(dpr, dpr);
}

// ===================================================================
// DRAW
// ===================================================================

function drawEffects(state) {
  const ctx = state.ctx;
  if (!ctx) return;

  const {
    neonEnabled,
    glowStrength,
    glowRadius,
    whiteGlowSize,
    whiteGlowStrength,
    headColor,
    headSize
  } = state.params;

  ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);

  const snakes = state.snakes || [];
  const rgba = a => hexToRGBA(headColor, a);

  const globalBrightness =
    state.store?.get("bg2:brightness") ?? 1;

  for (const snake of snakes) {
    const pts = snake.points;
    if (!pts || pts.length < 2) continue;

    const path = new Path2D();
    path.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) path.lineTo(pts[i].x, pts[i].y);

    const depth = snake.depth ?? 0;
    const depthFactor = 0.5 + (1 - depth) * 0.5;

    const brightness =
      snake.brightness ??
      globalBrightness ??
      1;

    const totalAlpha = brightness * depthFactor;

    // ===== НЕОН (inner glow + TRON outline) =====
    if (neonEnabled) {

      // Inner glow
      {
        const fade = (glowStrength / 100) * totalAlpha;
        if (fade > 0.01) {
          ctx.save();
          ctx.globalAlpha = fade;

          ctx.strokeStyle = rgba(1);
          ctx.lineWidth = glowRadius;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";

          ctx.shadowColor = rgba(1);
          ctx.shadowBlur = glowRadius * 0.9;

          ctx.stroke(path);
          ctx.restore();
        }
      }

      // TRON white outline
      {
        ctx.save();
        ctx.globalAlpha = totalAlpha;

        ctx.strokeStyle = "white";
        ctx.lineWidth = 1.2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.shadowColor = "white";
        ctx.shadowBlur = whiteGlowSize * (whiteGlowStrength / 50);

        ctx.stroke(path);
        ctx.restore();
      }
    }

    // ===== ГОЛОВА — ВСЕГДА РИСУЕТСЯ =====
    {
      const h = snake.head;

      ctx.save();
      ctx.globalAlpha = totalAlpha;

      ctx.shadowColor = rgba(1);
      ctx.shadowBlur = 14;

      ctx.fillStyle = rgba(1);

      ctx.beginPath();
      ctx.arc(h.x, h.y, headSize * 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(h.x, h.y, headSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
}

// ===================================================================
// Utils
// ===================================================================

function hexToRGBA(hex, a = 1) {
  let h = hex.replace("#", "");
  if (h.length === 3)
    h = h[0]+h[0] + h[1]+h[1] + h[2]+h[2];

  const r = parseInt(h.slice(0,2), 16) || 0;
  const g = parseInt(h.slice(2,4), 16) || 0;
  const b = parseInt(h.slice(4,6), 16) || 0;

  return `rgba(${r},${g},${b},${a})`;
}