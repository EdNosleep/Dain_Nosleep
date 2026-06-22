// ===================================================================
// BACKGROUND SNAKES — v53 (VIRTUAL CAMERA FIELD)
// ===================================================================

import { defineModule } from "../../engine/moduleFactory.js";

export const backgroundSnakesInspector = {
  "Фон: прозрачный (вкл)": { type: "toggle", value: true, param: "bgTransparent" },
  "Цвет фона": { type: "color", value: "#000000", param: "bgColor" },
  "Цвет линии": { type: "color", value: "#000000", param: "color" },

  "Количество лучей": { type: "slider", min: 1, max: 200, step: 1, value: 80, param: "count" },
  "Глубина параллакса (%)": { type: "slider", min: 0, max: 900, step: 5, value: 750, param: "depthStrength" },
  "Яркость (%)": { type: "slider", min: 0, max: 100, step: 5, value: 40, param: "brightness" },
  "Скорость": { type: "slider", min: 50, max: 300, step: 10, value: 220, param: "speedMul" },
  "Длина отрезка (px)": { type: "slider", min: 40, max: 600, step: 10, value: 550, param: "segmentLength" },

  "3D camera sync (вкл)": { type: "toggle", value: true, param: "cameraSyncEnabled" },
  "3D parallax X": { type: "slider", min: 0, max: 700, step: 5, value: 210, param: "cameraParallaxX" },
  "3D parallax Y": { type: "slider", min: 0, max: 420, step: 5, value: 120, param: "cameraParallaxY" },

  "Внутренняя поверхность (вкл)": { type: "toggle", value: true, param: "innerSurfaceMode" },
  "Размер активной зоны (%)": { type: "slider", min: 120, max: 420, step: 10, value: 260, param: "surfaceScale" },
  "Скорость перемещения фона (%)": { type: "slider", min: 1, max: 100, step: 1, value: 28, param: "cameraFollowSpeed" }
};

export const registerBackgroundSnakesModule = defineModule({
  key: "__backgroundSnakesModule",
  name: "Фон: Кибер-Змейки v53",
  inspector: backgroundSnakesInspector,
  dependencies: [],

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

      camera: {
        yaw: 0,
        pitch: 0,
        lastYaw: null,
        lastPitch: null,
        worldX: 0,
        worldY: 0,
        targetWorldX: 0,
        targetWorldY: 0
      },

      params: {
        brightness: 100,
        color: "#00eaff",
        bgColor: "#000000",
        bgTransparent: false,

        count: 24,
        segmentLength: 390,
        segThickness: 2,
        speedMul: 220,
        depthStrength: 200,

        cameraSyncEnabled: true,
        cameraParallaxX: 210,
        cameraParallaxY: 120,

        innerSurfaceMode: true,
        surfaceScale: 260,
        cameraFollowSpeed: 28
      },

      cache: {
        brightness: 1,
        colorRGB: { r: 0, g: 255, b: 255 },
        segThickness: 2,
        segmentLength: 390,
        speedMul: 220,
        depthStrength: 2
      }
    };
  },

  onStart({ ctx, state }) {
    const container = ctx.container || document.getElementById("game-container");
    if (!container) return;

    state.bus = ctx.bus;
    state.store = ctx.store;

    const root = document.createElement("div");
    root.dataset.bgSnakesRoot = "1";

    Object.assign(root.style, {
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
      overflow: "hidden",
      zIndex: 0
    });

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

    state.store?.set("bg2:brightness", state.cache.brightness);
    state.store?.set("bg2:color", state.params.color);

    state.bus?.on("entityStage3D:cameraChanged", payload => {
      updateCameraWorld(state, payload);
    }, { moduleKey: "__backgroundSnakesModule" });

    state.lastTime = performance.now();
    state.ready = true;

    requestAnimationFrame(() => requestAnimationFrame(() => rebuildParticles(state)));

    const loop = now => {
      state.rafId = requestAnimationFrame(loop);

      const dt = (now - state.lastTime) / 1000;
      state.lastTime = now;
      state.time += dt;

      updateCameraSmoothing(state, dt);
      updateParticles(state, dt);
      draw(state);
    };

    loop(performance.now());

    state.resizeHandler = () => {
      resizeCanvas(state);
      if (state.ready) stabilizeParticlesAroundCamera(state);
    };

    window.addEventListener("resize", state.resizeHandler);
  },

  onDisable({ state }) {
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = null;

    state.bus?.offModule("__backgroundSnakesModule");

    if (state.resizeHandler) {
      window.removeEventListener("resize", state.resizeHandler);
      state.resizeHandler = null;
    }

    state.root?.remove();

    state.ready = false;
    state.particles = [];
    state.root = null;
    state.canvas = null;
    state.ctx = null;
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
        state.store?.set("bg2:color", state.params.color);
        break;

      case "count":
        state.params.count = clamp(Math.round(num), 1, 80);
        if (state.ready) rebuildParticles(state);
        break;

      case "depthStrength":
        state.params.depthStrength = clamp(num, 0, 900);
        break;

      case "brightness":
        state.params.brightness = clamp(num, 0, 100);
        state.store?.set("bg2:brightness", state.params.brightness / 100);
        break;

      case "speedMul":
        state.params.speedMul = clamp(num, 50, 300);
        break;

      case "segmentLength":
        state.params.segmentLength = clamp(num, 40, 600);
        break;

      case "cameraSyncEnabled":
        state.params.cameraSyncEnabled = !!value;
        break;

      case "cameraParallaxX":
        state.params.cameraParallaxX = clamp(num, 0, 700);
        break;

      case "cameraParallaxY":
        state.params.cameraParallaxY = clamp(num, 0, 420);
        break;

      case "innerSurfaceMode":
        state.params.innerSurfaceMode = !!value;
        break;

      case "surfaceScale":
        state.params.surfaceScale = clamp(num, 120, 420);
        stabilizeParticlesAroundCamera(state);
        break;

      case "cameraFollowSpeed":
        state.params.cameraFollowSpeed = clamp(num, 1, 100);
        break;
    }

    updateCache(state);
  }
});

function updateCameraWorld(state, payload) {
  if (!state.params.cameraSyncEnabled) return;

  const yaw = Number(payload?.yaw) || 0;
  const pitch = Number(payload?.pitch) || 0;

  if (state.camera.lastYaw === null) {
    state.camera.lastYaw = yaw;
    state.camera.lastPitch = pitch;
    state.camera.yaw = yaw;
    state.camera.pitch = pitch;
    return;
  }

  let dyaw = yaw - state.camera.lastYaw;

  if (dyaw > Math.PI) dyaw -= Math.PI * 2;
  if (dyaw < -Math.PI) dyaw += Math.PI * 2;

  const dpitch = pitch - state.camera.lastPitch;

  state.camera.targetWorldX += dyaw * state.params.cameraParallaxX;
  state.camera.targetWorldY += dpitch * state.params.cameraParallaxY;

  state.camera.lastYaw = yaw;
  state.camera.lastPitch = pitch;
  state.camera.yaw = yaw;
  state.camera.pitch = pitch;
}

function updateCameraSmoothing(state, dt) {
  if (!state.params.cameraSyncEnabled) {
    state.camera.worldX += (0 - state.camera.worldX) * 0.08;
    state.camera.worldY += (0 - state.camera.worldY) * 0.08;
    return;
  }

  const speed = clamp(state.params.cameraFollowSpeed / 100, 0.01, 1);
  const k = 1 - Math.pow(1 - speed, dt * 60);

  state.camera.worldX += (state.camera.targetWorldX - state.camera.worldX) * k;
  state.camera.worldY += (state.camera.targetWorldY - state.camera.worldY) * k;
}

function getActiveRect(state) {
  const w = state.root?.clientWidth || window.innerWidth;
  const h = state.root?.clientHeight || window.innerHeight;
  const scale = state.params.innerSurfaceMode ? state.params.surfaceScale / 100 : 1;

  const aw = w * scale;
  const ah = h * scale;

  return {
    left: state.camera.worldX - aw * 0.5,
    right: state.camera.worldX + aw * 0.5,
    top: state.camera.worldY - ah * 0.5,
    bottom: state.camera.worldY + ah * 0.5,
    width: aw,
    height: ah
  };
}

function stabilizeParticlesAroundCamera(state) {
  if (!state.particles.length) return;

  const rect = getActiveRect(state);

  for (const p of state.particles) {
    wrapParticleInRect(p, rect);
  }
}

function applyCanvasBackground(state, canvas) {
  if (!canvas) return;
  canvas.style.background =
    state.params.bgTransparent ? "transparent" : state.params.bgColor;
}

function resizeCanvas(state) {
  const cnv = state.canvas;
  if (!cnv || !state.root || !state.ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
  state.particles = [];

  const rect = getActiveRect(state);

  for (let i = 0; i < state.params.count; i++) {
    state.particles.push(makeParticleInRect(state, rect));
  }
}

function makeParticleInRect(state, rect) {
  return {
    x: rect.left + Math.random() * rect.width,
    y: rect.top + Math.random() * rect.height,
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
    case "down": return ["left", "up", "right", "down"];
    case "up": return ["right", "down", "left", "up"];
    case "left": return ["up", "right", "down", "left"];
    case "right": return ["down", "left", "up", "right"];
    default: return null;
  }
}

function updateParticles(state, dt) {
  const bus = state.bus;
  const rect = getActiveRect(state);

  const maxLen = state.cache.segmentLength;
  const speedBaseMul = state.cache.speedMul / 100;
  const depthStrength = state.cache.depthStrength;

  bus?.emit("__backgroundSnakesModule:beforeUpdate", { state, dt });

  for (const p of state.particles) {
    const seg = p.segments[p.segments.length - 1];
    const z = p.depth || 0;
    const depthFactor = clamp(1 - z * depthStrength, 0.35, 1);
    const s = p.speed * speedBaseMul * depthFactor;

    switch (seg.dir) {
      case "down": p.y += s * dt; break;
      case "up": p.y -= s * dt; break;
      case "left": p.x -= s * dt; break;
      case "right": p.x += s * dt; break;
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
        const dirFromLoop = p.loopQueue.shift();
        p.segments.push({ dir: dirFromLoop, len: 0 });
        if (p.loopQueue.length === 0) p.loopQueue = null;
      } else {
        let newDir = chooseTurn(last);

        if (bus) {
          const decisionPayload = {
            particle: p,
            lastDir: last,
            suggestedDir: newDir,
            dir: newDir
          };

          bus.emit("__backgroundSnakesModule:beforeDecision", decisionPayload);
          if (typeof decisionPayload.dir === "string") newDir = decisionPayload.dir;

          const steerPayload = {
            particle: p,
            last,
            suggested: newDir,
            dir: newDir
          };

          bus.emit("bg2:steer", steerPayload);
          if (typeof steerPayload.dir === "string") newDir = steerPayload.dir;

          bus.emit("__backgroundSnakesModule:afterDecision", {
            particle: p,
            dir: newDir
          });
        }

        p.segments.push({ dir: newDir, len: 0 });
      }
    }

    mergeSameDirectionSegments(p);
    trimSnakeLength(p, maxLen);
    updateTrail(p, depthStrength);

    if (state.params.innerSurfaceMode) {
      wrapParticleInRect(p, rect);
    } else if (isTailOutsideScreenSpace(state, p)) {
      bus?.emit("__backgroundSnakesModule:beforeRespawn", {
        particle: p,
        reason: "offscreen",
        width: state.root.clientWidth,
        height: state.root.clientHeight
      });

      Object.assign(p, makeParticleInRect(state, rect));

      bus?.emit("__backgroundSnakesModule:afterRespawn", {
        particle: p,
        reason: "offscreen"
      });
    }
  }

  bus?.emit("__backgroundSnakesModule:afterUpdate", { state, dt });
}

function mergeSameDirectionSegments(p) {
  if (p.segments.length <= 2) return;

  const a = p.segments[p.segments.length - 1];
  const b = p.segments[p.segments.length - 2];

  if (a.dir === b.dir) {
    b.len += a.len;
    p.segments.pop();
  }
}

function trimSnakeLength(p, maxLen) {
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
}

function updateTrail(p, depthStrength) {
  p.trail.push({ x: p.x, y: p.y, life: 1 });
  if (p.trail.length > 80) p.trail.shift();

  const z = p.depth || 0;

  for (const t of p.trail) {
    t.life -= 0.02 * (1 + z * depthStrength * 0.5);
  }
}

function wrapParticleInRect(p, rect) {
  const margin = 180;
  let dx = 0;
  let dy = 0;

  if (p.x < rect.left - margin) dx = rect.width + margin * 2;
  if (p.x > rect.right + margin) dx = -(rect.width + margin * 2);
  if (p.y < rect.top - margin) dy = rect.height + margin * 2;
  if (p.y > rect.bottom + margin) dy = -(rect.height + margin * 2);

  if (!dx && !dy) return;

  p.x += dx;
  p.y += dy;

  for (const t of p.trail) {
    t.x += dx;
    t.y += dy;
  }
}

function isTailOutsideScreenSpace(state, p) {
  const w = state.root.clientWidth;
  const h = state.root.clientHeight;

  let x = p.x - state.camera.worldX + w / 2;
  let y = p.y - state.camera.worldY + h / 2;

  for (let i = p.segments.length - 1; i >= 0; i--) {
    const s = p.segments[i];

    switch (s.dir) {
      case "down": y -= s.len; break;
      case "up": y += s.len; break;
      case "left": x += s.len; break;
      case "right": x -= s.len; break;
    }
  }

  return x < -100 || x > w + 100 || y < -100 || y > h + 100;
}

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

  for (const p of state.particles) {
    const tr = p.trail;
    const path = new Path2D();
    const z = p.depth || 0;
    const depthFactor = clamp(1 - z * depthStrength, 0.4, 1);

    for (let i = 2; i < tr.length; i += 2) {
      const t0 = worldToScreen(state, tr[i - 2]);
      const t1 = worldToScreen(state, tr[i]);

      const fade = tr[i].life * 0.6 * alphaBase * depthFactor;
      if (fade <= 0) continue;

      path.moveTo(t0.x, t0.y);
      path.lineTo(t1.x, t1.y);

      ctx.strokeStyle = `rgba(${base.r},${base.g},${base.b},${fade})`;
      ctx.lineWidth = thicknessBase * fade * (0.7 + depthFactor * 0.6);
      ctx.lineCap = "round";
      ctx.stroke(path);
    }
  }

  for (const p of state.particles) {
    const pts = buildSnakePoints(p).map(pt => worldToScreen(state, pt));
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

      ctx.strokeStyle = `${baseColor}${brightness * 0.12})`;
      ctx.lineWidth = thick * 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();

      ctx.strokeStyle = `${baseColor}${brightness * 0.25})`;
      ctx.lineWidth = thick * 2.3;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();

      ctx.strokeStyle = `${baseColor}${brightness})`;
      ctx.lineWidth = thick;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }

  emitFrame(state);
}

function emitFrame(state) {
  if (!state.bus) return;

  const snakes = state.particles.map(p => ({
    head: worldToScreen(state, { x: p.x, y: p.y }),
    trail: p.trail.map(t => ({
      ...worldToScreen(state, t),
      life: t.life
    })),
    segments: p.segments.slice(),
    points: buildSnakePoints(p).map(pt => worldToScreen(state, pt)),
    depth: p.depth,
    brightness: state.cache.brightness,
    color: state.params.color
  }));

  state.bus.emit("bg2:frame", { snakes });
  state.bus.emit("bg2:particles", { particles: state.particles });
}

function worldToScreen(state, pt) {
  const w = state.root.clientWidth;
  const h = state.root.clientHeight;

  return {
    x: pt.x - state.camera.worldX + w / 2,
    y: pt.y - state.camera.worldY + h / 2
  };
}

function buildSnakePoints(p) {
  const pts = [];
  let x = p.x;
  let y = p.y;

  pts.push({ x, y });

  for (let i = p.segments.length - 1; i >= 0; i--) {
    const s = p.segments[i];

    switch (s.dir) {
      case "down": y -= s.len; break;
      case "up": y += s.len; break;
      case "left": x += s.len; break;
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
  let h = String(hex || "#00eaff").replace("#", "");

  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }

  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  };
}

// CHANGELOG v53:
// • Убран Math.sin(yaw), который создавал заметный разворот фона
// • Добавлена виртуальная камера worldX/worldY
// • Камера двигает окно наблюдения по delta yaw / delta pitch
// • Частицы живут в world-space, а не в screen-space
// • Wrap/respawn теперь считается относительно активного окна камеры
// • draw() и bg2:frame переводят world координаты в screen координаты
// • Добавлена плавность cameraFollowSpeed без движения DOM-слоя