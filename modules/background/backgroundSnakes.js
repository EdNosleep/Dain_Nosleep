// ===================================================================
// BACKGROUND SNAKES — v50 (HOOK READY)
// -------------------------------------------------------------------
// • База: поведение v43 (визуально без изменений)
// • Поддержка Hook API через EventBus:
//    __backgroundSnakesModule:beforeUpdate   { state, dt }
//    __backgroundSnakesModule:afterUpdate    { state, dt }
//    __backgroundSnakesModule:beforeDecision { particle, lastDir, suggestedDir, dir }
//    __backgroundSnakesModule:afterDecision  { particle, dir }
//    __backgroundSnakesModule:beforeRespawn  { particle, reason, width, height }
//    __backgroundSnakesModule:afterRespawn   { particle, reason }
// • Backward-compatible события:
//    bg2:frame      — снимок состояния для эффектов
//    bg2:particles  — живые ссылки на particles
//    bg2:steer      — старый steering-паттерн (payload.dir можно менять)
// ===================================================================

import { defineModule } from "../../moduleFactory.js";

// ===================================================================
// INSPECTOR
// ===================================================================

export const backgroundSnakesInspector = {
  "Фон: прозрачный (вкл)": {
    type: "toggle",
    value: true,
    param: "bgTransparent"
  },

  "Цвет фона": {
    type: "color",
    value: "#000000",
    param: "bgColor"
  },

  "Цвет линии": {
    type: "color",
    value: "#ed5700",
    param: "color"
  },

  "Количество лучей": {
    type: "slider",
    min: 1,
    max: 50,
    step: 1,
    value: 40,
    param: "count"
  },

  "Глубина параллакса (%)": {
    type: "slider",
    min: 0,
    max: 900,
    step: 5,
    value: 600,
    param: "depthStrength"
  },

  "Яркость (%)": {
    type: "slider",
    min: 0,
    max: 100,
    step: 5,
    value: 100,
    param: "brightness"
  },

  "Скорость": {
    type: "slider",
    min: 50,
    max: 300,
    step: 10,
    value: 220,
    param: "speedMul"
  },

  "Длина отрезка (px)": {
    type: "slider",
    min: 40,
    max: 600,
    step: 10,
    value: 390,
    param: "segmentLength"
  }
};

// ===================================================================
// MODULE
// ===================================================================

export const registerBackgroundSnakesModule = defineModule({
  key: "__backgroundSnakesModule",
  name: "Фон: Кибер-Змейки v50",
  inspector: backgroundSnakesInspector,
  dependencies: [],

  // декларация хуков (информационная)
  hooks: [
    "beforeUpdate",
    "afterUpdate",
    "beforeDecision",
    "afterDecision",
    "beforeRespawn",
    "afterRespawn"
  ],

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

      resizeHandler: null,

      params: {
        brightness: 100,
        color: "#00eaff",

        bgColor: "#000000",
        bgTransparent: false,

        count: 8,
        segmentLength: 390,
        segThickness: 2,
        speedMul: 220,
        depthStrength: 200
      },

      // Кэш горячих параметров
      cache: {
        brightness: 1,
        colorRGB: { r: 0, g: 255, b: 255 },
        segThickness: 2,
        segmentLength: 390,
        speedMul: 220,
        depthStrength: 2.0
      }
    };
  },

  onStart({ ctx, state }) {
    const container =
      ctx.container || document.getElementById("game-container");
    if (!container) return;

    state.bus = ctx.bus;
    state.store = ctx.store;

    // === Root ===
    const root = document.createElement("div");
    Object.assign(root.style, {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      overflow: "hidden",
      zIndex: 0
    });

    // === Canvas ===
    const canvas = document.createElement("canvas");
    applyCanvasBackground(state, canvas);

    root.appendChild(canvas);
    container.prepend(root);

    state.root = root;
    state.canvas = canvas;
    state.ctx = canvas.getContext("2d");

    resizeCanvas(state);
    updateCache(state);
    rebuildParticles(state);

    if (state.store) {
      state.store.set("bg2:brightness", state.cache.brightness);
    }

    state.lastTime = performance.now();
    state.ready = true;

    // небольшой отложенный ресет, когда DOM устаканился
    requestAnimationFrame(() => {
      requestAnimationFrame(() => rebuildParticles(state));
    });

    // основной loop
    const loop = (now) => {
      state.rafId = requestAnimationFrame(loop);

      const dt = (now - state.lastTime) / 1000;
      state.lastTime = now;
      state.time += dt;

      updateParticles(state, dt);
      draw(state);
    };

    loop();

    state.resizeHandler = () => resizeCanvas(state);
    window.addEventListener("resize", state.resizeHandler);
  },

  onDisable({ state }) {
    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }

    if (state.resizeHandler) {
      window.removeEventListener("resize", state.resizeHandler);
      state.resizeHandler = null;
    }

    if (state.root?.parentNode) {
      state.root.remove();
    }

    state.ready = false;
    state.particles = [];
  },

  onParam({ param, value, state }) {
    const num = Number(value);

    switch (param) {
      case "bgColor":
        state.params.bgColor = value;
        applyCanvasBackground(state, state.canvas);
        break;

      case "bgTransparent":
        state.params.bgTransparent = !!value;
        applyCanvasBackground(state, state.canvas);
        break;

      case "color":
        state.params.color = String(value);
        break;

      case "count":
        state.params.count = clamp(Math.round(num), 1, 50);
        if (state.ready) rebuildParticles(state);
        break;

      case "depthStrength":
        state.params.depthStrength = clamp(num, 0, 200);
        break;

      case "brightness":
        state.params.brightness = clamp(num, 0, 100);
        if (state.store) {
          state.store.set("bg2:brightness", num / 100);
        }
        break;

      case "speedMul":
        state.params.speedMul = clamp(num, 50, 300);
        break;

      case "segmentLength":
        state.params.segmentLength = clamp(num, 40, 600);
        break;
    }

    updateCache(state);
  }
});

// ===================================================================
// INTERNAL LOGIC
// ===================================================================

function applyCanvasBackground(state, canvas) {
  if (!canvas) return;
  canvas.style.background =
    state.params.bgTransparent ? "transparent" : state.params.bgColor;
}

function resizeCanvas(state) {
  const cnv = state.canvas;
  if (!cnv || !state.root || !state.ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const w = state.root.clientWidth;
  const h = state.root.clientHeight;

  cnv.width = w * dpr;
  cnv.height = h * dpr;
  cnv.style.width = "100%";
  cnv.style.height = "100%";

  state.ctx.resetTransform();
  state.ctx.scale(dpr, dpr);
}

function updateCache(state) {
  const p = state.params;

  state.cache.brightness = p.brightness / 100;
  state.cache.segThickness = p.segThickness;
  state.cache.segmentLength = p.segmentLength;
  state.cache.speedMul = p.speedMul;
  state.cache.depthStrength = p.depthStrength / 100;
  state.cache.colorRGB = hexToRGB(p.color);
}

function rebuildParticles(state) {
  if (!state.root) return;
  state.particles = [];
  for (let i = 0; i < state.params.count; i++) {
    state.particles.push(makeParticle(state));
  }
}

function makeParticle(state) {
  const w = state.root.clientWidth || 0;
  const h = state.root.clientHeight || 0;

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
  }
  return Math.random() < 0.5 ? "up" : "down";
}

function generateLoopSequence(last) {
  switch (last) {
    case "down":  return ["left", "up", "right", "down"];
    case "up":    return ["right", "down", "left", "up"];
    case "left":  return ["up", "right", "down", "left"];
    case "right": return ["down", "left", "up", "right"];
    default:      return null;
  }
}

function updateParticles(state, dt) {
  if (!state.root) return;
  const bus = state.bus;

  const w = state.root.clientWidth;
  const h = state.root.clientHeight;

  const maxLen = state.cache.segmentLength;
  const speedBaseMul = state.cache.speedMul / 100;
  const depthStrength = state.cache.depthStrength;

  // HOOK: beforeUpdate (кадр змей)
  if (bus) {
    bus.emit("__backgroundSnakesModule:beforeUpdate", {
      state,
      dt
    });
  }

  for (const p of state.particles) {
    const seg = p.segments[p.segments.length - 1];

    const z = p.depth || 0;
    const depthFactor = clamp(1 - z * depthStrength, 0.35, 1);
    const s = p.speed * speedBaseMul * depthFactor;

    // движение головы
    switch (seg.dir) {
      case "down":  p.y += s * dt; break;
      case "up":    p.y -= s * dt; break;
      case "left":  p.x -= s * dt; break;
      case "right": p.x += s * dt; break;
    }

    seg.len += s * dt;
    if (seg.len > maxLen) seg.len = maxLen;

    // выбор следующего сегмента
    p.turnTimer -= dt;
    if (p.turnTimer <= 0) {
      p.turnTimer = 0.4 + Math.random() * 1.5;
      const last = seg.dir;

      if (!p.loopQueue && Math.random() < 0.03) {
        p.loopQueue = generateLoopSequence(last);
      }

      if (p.loopQueue?.length > 0) {
        const dirFromLoop = p.loopQueue.shift();
        p.segments.push({ dir: dirFromLoop, len: 0 });
        if (p.loopQueue.length === 0) p.loopQueue = null;
      } else {
        // классический выбор направления
        let newDir = chooseTurn(last);

        // HOOK: beforeDecision
        if (bus) {
          const decisionPayload = {
            particle: p,
            lastDir: last,
            suggestedDir: newDir,
            dir: newDir
          };
          bus.emit(
            "__backgroundSnakesModule:beforeDecision",
            decisionPayload
          );
          if (typeof decisionPayload.dir === "string") {
            newDir = decisionPayload.dir;
          }

          // Backward-compatible steering: bg2:steer
          const steerPayload = {
            particle: p,
            last,
            suggested: newDir,
            dir: newDir
          };
          bus.emit("bg2:steer", steerPayload);
          if (typeof steerPayload.dir === "string") {
            newDir = steerPayload.dir;
          }

          // HOOK: afterDecision
          bus.emit(
            "__backgroundSnakesModule:afterDecision",
            { particle: p, dir: newDir }
          );
        }

        p.segments.push({ dir: newDir, len: 0 });
      }
    }

    // слияние соседних сегментов с одинаковым направлением
    if (p.segments.length > 2) {
      const a = p.segments[p.segments.length - 1];
      const b = p.segments[p.segments.length - 2];
      if (a.dir === b.dir) {
        b.len += a.len;
        p.segments.pop();
      }
    }

    // ограничение суммарной длины
    let total = p.segments.reduce((sum, sgm) => sum + sgm.len, 0);
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

    // трейл головы
    p.trail.push({ x: p.x, y: p.y, life: 1 });
    if (p.trail.length > 80) p.trail.shift();

    // затухание трейла
    for (const t of p.trail) {
      t.life -= 0.02 * (1 + z * depthStrength * 0.5);
    }

    // респавн, если хвост далеко за экраном
    if (isTailOutside(p, w, h)) {
      if (bus) {
        bus.emit("__backgroundSnakesModule:beforeRespawn", {
          particle: p,
          reason: "offscreen",
          width: w,
          height: h
        });
      }

      const np = makeParticle(state);
      Object.assign(p, np);

      if (bus) {
        bus.emit("__backgroundSnakesModule:afterRespawn", {
          particle: p,
          reason: "offscreen"
        });
      }
    }
  }

  // HOOK: afterUpdate
  if (bus) {
    bus.emit("__backgroundSnakesModule:afterUpdate", {
      state,
      dt
    });
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

  return x < -100 || x > w + 100 || y < -100 || y > h + 100;
}

// ===================================================================
// DRAW
// ===================================================================

function draw(state) {
  if (!state.root || !state.ctx) return;

  const ctx = state.ctx;
  const w = state.root.clientWidth;
  const h = state.root.clientHeight;

  const base = state.cache.colorRGB;
  const alphaBase = state.cache.brightness;
  const thicknessBase = state.cache.segThickness;
  const depthStrength = state.cache.depthStrength;

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

      // wide glow
      ctx.strokeStyle = `${baseColor}${brightness * 0.12})`;
      ctx.lineWidth = thick * 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();

      // inner glow
      ctx.strokeStyle = `${baseColor}${brightness * 0.25})`;
      ctx.lineWidth = thick * 2.3;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();

      // core line
      ctx.strokeStyle = `${baseColor}${brightness})`;
      ctx.lineWidth = thick;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }

  // EMIT: копии для эффектов + живые particles
  if (state.bus) {
    const snakes = state.particles.map((p) => ({
      head: { x: p.x, y: p.y },
      trail: p.trail.slice(),
      segments: p.segments.slice(),
      points: buildSnakePoints(p),
      depth: p.depth,
      brightness: state.cache.brightness
    }));

    state.bus.emit("bg2:frame", { snakes });
    state.bus.emit("bg2:particles", {
      particles: state.particles
    });
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
      case "down":  y -= s.len; break;
      case "up":    y += s.len; break;
      case "left":  x += s.len; break;
      case "right": x -= s.len; break;
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
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }

  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  };
}
