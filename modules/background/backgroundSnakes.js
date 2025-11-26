// ===================================================================
// BACKGROUND2 — v41 (Parallax Neon Snakes, Unified Brightness)
// -------------------------------------------------------------------
// ✔ Полностью рабочая версия 3.9
// ✔ Только обновлённый инспектор
// ✔ Общая яркость → управляет змейками И эффектами
// ✔ Запись в store("bg2:brightness") для эффектов
// ✔ Толщина линии забетонирована
// ===================================================================

import { defineModule } from "../../moduleFactory.js";

export const backgroundSnakesInspector = {
  // 1. Прозрачный фон
  "Фон: прозрачный (вкл)": {
    type: "toggle",
    value: false,
    param: "bgTransparent"
  },

  // 2. Цвет фона
  "Цвет фона": {
    type: "color",
    value: "#000000",
    param: "bgColor"
  },

  // 3. Цвет линии
  "Цвет линии": {
    type: "color",
    value: "#00eaff",
    param: "color"
  },

  // 4. Количество лучей
  "Количество лучей": {
    type: "slider",
    min: 1, max: 15, step: 1,
    value: 8,
    param: "count"
  },

  // 5. Глубина параллакса
  "Глубина параллакса (%)": {
    type: "slider",
    min: 0, max: 200, step: 5,
    value: 200,
    param: "depthStrength"
  },

  // 6. Яркость
  "Яркость (%)": {
    type: "slider",
    min: 0, max: 100, step: 5,
    value: 100,
    param: "brightness"
  },

  // 7. Скорость
  "Скорость": {
    type: "slider",
    min: 50, max: 300, step: 10,
    value: 220,
    param: "speedMul"
  },

  // 8. Длина отрезка
  "Длина отрезка (px)": {
    type: "slider",
    min: 40, max: 600, step: 10,
    value: 390,
    param: "segmentLength"
  }
};

export const registerBackgroundSnakesModule = defineModule({
  key: "__backgroundSnakesModule",
  name: "Фон: Кибер-Змейки V41",
  inspector: backgroundSnakesInspector,
  dependencies: [],

  createState() {
    return {
      ready: false,
      root: null,
      canvas: null,
      ctx: null,
      bus: null,
      store: null,
      rafId: null,
      lastTime: 0,
      time: 0,
      particles: [],
      params: {
        brightness: 100,
        color: "#00eaff",

        bgColor: "#000000",
        bgTransparent: false,

        count: 8,
        segmentLength: 390,
        segThickness: 2, // забетонировано
        speedMul: 220,
        depthStrength: 200
      }
    };
  },

  onStart({ ctx, state }) {
    const container =
      ctx.container || document.getElementById("game-container");
    if (!container) return;

    state.bus = ctx.bus;
    state.store = ctx.store; // ★ store нужен для яркости эффектов

    // root container
    const root = document.createElement("div");
    Object.assign(root.style, {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      overflow: "hidden",
      zIndex: 0
    });

    // canvas
    const canvas = document.createElement("canvas");
    applyCanvasBackground(state, canvas);

    root.appendChild(canvas);
    container.prepend(root);

    state.root = root;
    state.canvas = canvas;
    state.ctx = canvas.getContext("2d");

    resizeCanvas(state);
    rebuildParticles(state);

    // сразу обновляем общую яркость в store
    if (state.store) {
      state.store.set("bg2:brightness", state.params.brightness / 100);
    }

    state.lastTime = performance.now();
    state.ready = true;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => rebuildParticles(state));
    });

    const loop = (now) => {
      state.rafId = requestAnimationFrame(loop);

      const dt = (now - state.lastTime) / 1000;
      state.lastTime = now;
      state.time += dt;

      updateParticles(state, dt);
      draw(state);
    };

    loop();
    window.addEventListener("resize", () => resizeCanvas(state));
  },

  onDisable({ state }) {
    if (state.rafId) cancelAnimationFrame(state.rafId);
    if (state.root?.parentNode) state.root.remove();
    state.ready = false;
    state.particles = [];
  },

  onParam({ param, value, state }) {
    const num = Number(value);

    switch (param) {
      case "bgColor":
        state.params.bgColor = value;
        applyCanvasBackground(state, state.canvas);
        return;

      case "bgTransparent":
        state.params.bgTransparent = !!value;
        applyCanvasBackground(state, state.canvas);
        return;

      case "color":
        state.params.color = String(value);
        return;

      case "count":
        state.params.count = clamp(Math.round(num), 1, 15);
        if (state.ready) rebuildParticles(state);
        return;

      case "depthStrength":
        state.params.depthStrength = clamp(num, 0, 200);
        return;

      case "brightness":
        state.params.brightness = clamp(num, 0, 100);
        // ★ ЯРКОСТЬ ЭФФЕКТОВ = ЯРКОСТЬ ЗМЕЙКИ
        if (state.store) {
          state.store.set("bg2:brightness", state.params.brightness / 100);
        }
        return;

      case "speedMul":
        state.params.speedMul = clamp(num, 50, 300);
        return;

      case "segmentLength":
        state.params.segmentLength = clamp(num, 40, 600);
        return;
    }
  }
});

// ===================================================================
// INTERNAL LOGIC
// ===================================================================

function applyCanvasBackground(state, canvas) {
  canvas.style.background =
    state.params.bgTransparent ? "transparent" : state.params.bgColor;
}

function resizeCanvas(state) {
  const cnv = state.canvas;
  if (!cnv) return;

  const dpr = window.devicePixelRatio || 1;
  cnv.width = state.root.clientWidth * dpr;
  cnv.height = state.root.clientHeight * dpr;
  cnv.style.width = "100%";
  cnv.style.height = "100%";

  state.ctx.resetTransform();
  state.ctx.scale(dpr, dpr);
}

function rebuildParticles(state) {
  state.particles = [];
  for (let i = 0; i < state.params.count; i++) {
    state.particles.push(makeParticle(state));
  }
}

function makeParticle(state) {
  const w = state.root.clientWidth;
  const h = state.root.clientHeight;

  return {
    x: Math.random() * w,
    y: Math.random() * h,
    segments: [{ dir: "down", len: 20 }],
    speed: 40 + Math.random() * 60,
    turnTimer: 0.4 + Math.random() * 1.5,
    trail: [],
    loopQueue: null,
    depth: Math.random()
  };
}

function chooseTurn(dir) {
  if (dir === "down" || dir === "up") {
    return Math.random() < 0.5 ? "left" : "right";
  } else {
    return Math.random() < 0.5 ? "up" : "down";
  }
}

function generateLoopSequence(last) {
  switch (last) {
    case "down": return ["left","up","right","down"];
    case "up": return ["right","down","left","up"];
    case "left": return ["up","right","down","left"];
    case "right": return ["down","left","up","right"];
  }
}

function updateParticles(state, dt) {
  const w = state.root.clientWidth;
  const h = state.root.clientHeight;

  const maxLen = state.params.segmentLength;
  const speedBaseMul = state.params.speedMul / 100;
  const depthStrength = state.params.depthStrength / 100;

  for (const p of state.particles) {
    const seg = p.segments[p.segments.length - 1];

    const z = p.depth || 0;
    const depthFactorRaw = 1 - z * depthStrength;
    const depthFactor = clamp(depthFactorRaw, 0.35, 1);

    const s = p.speed * speedBaseMul * depthFactor;

    switch (seg.dir) {
      case "down": p.y += s * dt; break;
      case "up":   p.y -= s * dt; break;
      case "left": p.x -= s * dt; break;
      case "right":p.x += s * dt; break;
    }

    seg.len += s * dt;
    if (seg.len > maxLen) seg.len = maxLen;

    p.turnTimer -= dt;
    if (p.turnTimer <= 0) {
      p.turnTimer = 0.4 + Math.random() * 1.5;
      const last = seg.dir;

      if (!p.loopQueue && Math.random() < 0.03) {
        p.loopQueue = generateLoopSequence(last);
      }

      if (p.loopQueue?.length > 0) {
        p.segments.push({ dir: p.loopQueue.shift(), len: 0 });
        if (p.loopQueue.length === 0) p.loopQueue = null;
      } else {
        p.segments.push({ dir: chooseTurn(last), len: 0 });
      }
    }

    if (p.segments.length > 2) {
      const a = p.segments[p.segments.length - 1];
      const b = p.segments[p.segments.length - 2];
      if (a.dir === b.dir) {
        b.len += a.len;
        p.segments.pop();
      }
    }

    let total = p.segments.reduce((s, sgm) => s + sgm.len, 0);
    while (total > maxLen && p.segments.length > 0) {
      const first = p.segments[0];
      const excess = total - maxLen;

      if (first.len > excess) {
        first.len -= excess;
        total -= excess;
      } else {
        total -= first.len;
        p.segments.shift();
      }
    }

    p.trail.push({ x: p.x, y: p.y, life: 1 });
    if (p.trail.length > 80) p.trail.shift();

    for (const t of p.trail) {
      const depthFadeMul = 1 + z * depthStrength * 0.5;
      t.life -= 0.02 * depthFadeMul;
    }

    if (isTailOutside(p, w, h)) {
      Object.assign(p, makeParticle(state));
    }
  }
}

function isTailOutside(p, w, h) {
  let x = p.x;
  let y = p.y;

  for (let i = p.segments.length - 1; i >= 0; i--) {
    const s = p.segments[i];
    switch (s.dir) {
      case "down":  y -= s.len; break;
      case "up":    y += s.len; break;
      case "left":  x += s.len; break;
      case "right": x -= s.len; break;
    }
  }

  return (x < -100 || x > w + 100 || y < -100 || y > h + 100);
}

// ===================================================================
// DRAW + premium neon + parallax + emit
// ===================================================================

function draw(state) {
  const ctx = state.ctx;
  const w = state.root.clientWidth;
  const h = state.root.clientHeight;

  const base = hexToRGB(state.params.color);
  const alphaBase = state.params.brightness / 100;
  const thicknessBase = state.params.segThickness;
  const depthStrength = state.params.depthStrength / 100;

  ctx.clearRect(0, 0, w, h);

  // TRAILS
  for (const p of state.particles) {
    const tr = p.trail;
    const path = new Path2D();
    const z = p.depth || 0;
    const depthFactor = clamp(1 - z * depthStrength, 0.4, 1);

    for (let i = 2; i < tr.length; i += 2) {
      const t0 = tr[i - 2];
      const t1 = tr[i];

      let fade = t1.life * 0.6 * alphaBase * depthFactor;
      if (fade <= 0) continue;

      path.moveTo(t0.x, t0.y);
      path.lineTo(t1.x, t1.y);

      ctx.strokeStyle =
        `rgba(${base.r},${base.g},${base.b},${fade})`;
      ctx.lineWidth =
        thicknessBase * fade * (0.7 + depthFactor * 0.6);
      ctx.lineCap = "round";
      ctx.stroke(path);
    }
  }

  // MAIN SNAKES
  for (const p of state.particles) {
    const pts = buildSnakePoints(p);
    if (pts.length < 2) continue;

    const z = p.depth || 0;
    const depthFactor = clamp(1 - z * depthStrength, 0.35, 1);

    const baseColor = `rgba(${base.r},${base.g},${base.b},`;
    const segmentCount = pts.length;

    for (let i = 1; i < segmentCount; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];

      const t = i / segmentCount;
      const inv = 1 - t;

      const brightness =
        alphaBase *
        (0.4 + inv * 0.6) *
        (0.5 + depthFactor * 0.5);

      const thick =
        thicknessBase *
        (0.4 + inv * 1.4) *
        (0.5 + depthFactor * 0.7);

      // Wide glow
      ctx.strokeStyle = `${baseColor}${brightness * 0.12})`;
      ctx.lineWidth = thick * 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();

      // Inner glow
      ctx.strokeStyle = `${baseColor}${brightness * 0.25})`;
      ctx.lineWidth = thick * 2.3;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();

      // Core line
      ctx.strokeStyle = `${baseColor}${brightness})`;
      ctx.lineWidth = thick;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }

  // EMIT EFFECTS UPDATE
  if (state.bus) {
    const snakes = state.particles.map(p => ({
      head: { x: p.x, y: p.y },
      segments: p.segments,
      trail: p.trail,
      points: buildSnakePoints(p),
      depth: p.depth,
      brightness: state.params.brightness / 100 // ★ важный момент
    }));

    state.bus.emit("bg2:frame", { snakes });
  }
}

// ===================================================================
// UTILS
// ===================================================================

function buildSnakePoints(p) {
  const pts = [];
  let x = p.x;
  let y = p.y;

  pts.push({ x, y });

  for (let i = p.segments.length - 1; i >= 0; i--) {
    const s = p.segments[i];
    switch (s.dir) {
      case "down": y -= s.len; break;
      case "up":   y += s.len; break;
      case "left": x += s.len; break;
      case "right":x -= s.len; break;
    }
    pts.push({ x, y });
  }

  return pts;
}

function clamp(v, mn, mx) {
  return Math.max(mn, Math.min(mx, v));
}

function hexToRGB(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3)
    h = h[0]+h[0] + h[1]+h[1] + h[2]+h[2];

  return {
    r: parseInt(h.slice(0,2), 16),
    g: parseInt(h.slice(2,4), 16),
    b: parseInt(h.slice(4,6), 16)
  };
}