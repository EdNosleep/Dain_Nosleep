// ======================================================
// NOSLEEP_ENGINE — entityStageEnvironment.js v6
// Stage Canvas Snakes — Legacy Look / Stage Lifecycle
// ======================================================

export function createStageEnvironment(state) {
  disposeStageEnvironment(state);

  const root = document.createElement("div");
  root.dataset.stageEnvironment = "canvasSnakes";

  Object.assign(root.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    overflow: "hidden",
    zIndex: "0"
  });

  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, {
    width: "100%",
    height: "100%",
    display: "block",
    background: "transparent"
  });

  root.appendChild(canvas);
  state.root?.prepend(root);

  const ctx = canvas.getContext("2d");

  state.environment = {
    root,
    canvas,
    ctx,
    particles: [],
    time: 0,
    camera: {
      lastYaw: null,
      lastPitch: null,
      worldX: 0,
      worldY: 0,
      targetWorldX: 0,
      targetWorldY: 0
    }
  };

  resizeStageEnvironment(state);
  rebuildStageEnvironment(state);
}

export function updateStageEnvironment(state, dt = 1 / 60) {
  const env = state.environment;
  if (!env?.ctx) return;

  env.root.style.display = state.params.environmentEnabled ? "block" : "none";
  if (!state.params.environmentEnabled) return;

  env.time += dt;

  updateCameraParallax(state, dt);
  updateParticles(state, dt);
  draw(state);
}

export function applyStageEnvironmentParams(state) {
  const env = state.environment;
  if (!env?.root) return;

  env.root.style.opacity = String(clamp01((Number(state.params.environmentGlobalOpacity ?? 100)) / 100));
}

export function rebuildStageEnvironment(state) {
  const env = state.environment;
  if (!env) return;

  env.particles = [];

  const count = state.params.environmentMobileSafe
    ? Math.min(Number(state.params.environmentSnakeCount ?? 42), 48)
    : Math.min(Number(state.params.environmentSnakeCount ?? 80), 140);

  const rect = getActiveRect(state);

  for (let i = 0; i < count; i++) {
    env.particles.push(makeParticle(state, rect));
  }
}

export function disposeStageEnvironment(state) {
  const env = state.environment;
  if (!env) return;

  try { env.root?.remove(); } catch (_) {}
  state.environment = null;
}

export function resizeStageEnvironment(state) {
  const env = state.environment;
  if (!env?.canvas || !env?.ctx || !env?.root) return;

  const dprLimit = Number(state.params.environmentPixelRatio ?? 1.35);
  const dpr = Math.min(window.devicePixelRatio || 1, dprLimit);

  const w = env.root.clientWidth || window.innerWidth;
  const h = env.root.clientHeight || window.innerHeight;

  env.canvas.width = Math.max(1, Math.floor(w * dpr));
  env.canvas.height = Math.max(1, Math.floor(h * dpr));

  env.ctx.resetTransform();
  env.ctx.scale(dpr, dpr);
}

function updateCameraParallax(state, dt) {
  const env = state.environment;
  if (!env) return;

  const yaw = Number(state.yaw) || 0;
  const pitch = Number(state.pitch) || 0;

  if (env.camera.lastYaw === null) {
    env.camera.lastYaw = yaw;
    env.camera.lastPitch = pitch;
    return;
  }

  let dyaw = yaw - env.camera.lastYaw;
  if (dyaw > Math.PI) dyaw -= Math.PI * 2;
  if (dyaw < -Math.PI) dyaw += Math.PI * 2;

  const dpitch = pitch - env.camera.lastPitch;

  const depth = Number(state.params.environmentParallaxDepth ?? 220);

  env.camera.targetWorldX += dyaw * depth;
  env.camera.targetWorldY += dpitch * depth * 0.75;

  env.camera.lastYaw = yaw;
  env.camera.lastPitch = pitch;

  const smooth = clamp01((Number(state.params.environmentParallaxSmooth ?? 24)) / 100);
  const k = 1 - Math.pow(1 - smooth, dt * 60);

  env.camera.worldX += (env.camera.targetWorldX - env.camera.worldX) * k;
  env.camera.worldY += (env.camera.targetWorldY - env.camera.worldY) * k;
}

function makeParticle(state, rect) {
  const dir = randomDir();

  return {
    x: rect.left + Math.random() * rect.width,
    y: rect.top + Math.random() * rect.height,
    segments: [{ dir, len: 18 }],
    speed: rand(
      Number(state.params.environmentSnakeMinSpeed ?? 34),
      Number(state.params.environmentSnakeMaxSpeed ?? 96)
    ),
    turnTimer: rand(
      Number(state.params.environmentSnakeTurnMin ?? 0.35),
      Number(state.params.environmentSnakeTurnMax ?? 1.65)
    ),
    trail: [],
    loopQueue: null,
    depth: Math.random()
  };
}

function updateParticles(state, dt) {
  const env = state.environment;
  const rect = getActiveRect(state);

  const maxLen = Number(state.params.environmentSnakeSegmentLength ?? 390);
  const speedMul = Number(state.params.environmentSnakeSpeedMul ?? 220) / 100;
  const depthStrength = Number(state.params.environmentDepthStrength ?? 220) / 100;

  for (const p of env.particles) {
    const seg = p.segments[p.segments.length - 1];

    const depthFactor = clamp(1 - p.depth * depthStrength, 0.35, 1);
    const speed = p.speed * speedMul * depthFactor;

    moveParticle(p, seg.dir, speed * dt);

    seg.len += speed * dt;
    if (seg.len > maxLen) seg.len = maxLen;

    p.turnTimer -= dt;

    if (p.turnTimer <= 0) {
      p.turnTimer = rand(
        Number(state.params.environmentSnakeTurnMin ?? 0.35),
        Number(state.params.environmentSnakeTurnMax ?? 1.65)
      );

      const last = seg.dir;

      if (!p.loopQueue && Math.random() < Number(state.params.environmentSnakeLoopChance ?? 3) / 100) {
        p.loopQueue = generateLoopSequence(last);
      }

      let nextDir;

      if (p.loopQueue?.length) {
        nextDir = p.loopQueue.shift();
        if (!p.loopQueue.length) p.loopQueue = null;
      } else {
        nextDir = chooseTurn(last);
      }

      p.segments.push({ dir: nextDir, len: 0 });
    }

    mergeSameDirectionSegments(p);
    trimSnakeLength(p, maxLen);
    updateTrail(state, p);
    wrapParticleInRect(p, rect);
  }
}

function draw(state) {
  const env = state.environment;
  const ctx = env.ctx;
  const root = env.root;

  const w = root.clientWidth || window.innerWidth;
  const h = root.clientHeight || window.innerHeight;

  const color = hexToRgb(state.params.environmentLineColor ?? "#000000");
  const glow = hexToRgb(state.params.environmentGlowColor ?? state.params.environmentLineColor ?? "#000000");

  const brightness = clamp01((Number(state.params.environmentLineOpacity ?? 42)) / 100);
  const glowBrightness = clamp01((Number(state.params.environmentGlowBrightness ?? 32)) / 100);
  const thickness = Number(state.params.environmentSnakeThickness ?? 2);
  const depthStrength = Number(state.params.environmentDepthStrength ?? 220) / 100;
  const taperPower = Number(state.params.environmentSnakeTaper ?? 1.45);

  ctx.clearRect(0, 0, w, h);

  for (const p of env.particles) {
    const pts = buildSnakePoints(p).map(pt => worldToScreen(state, pt));
    if (pts.length < 2) continue;

    const depthFactor = clamp(1 - p.depth * depthStrength, 0.35, 1);
    const count = pts.length;

    for (let i = 1; i < count; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];

      const t = i / count;
      const inv = Math.pow(1 - t, taperPower);

      const alpha = brightness * (0.35 + inv * 0.65) * (0.55 + depthFactor * 0.45);
      const thick = thickness * (0.35 + inv * 1.55) * (0.55 + depthFactor * 0.7);

      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.strokeStyle = rgba(glow, alpha * glowBrightness * 0.16);
      ctx.lineWidth = thick * 5.2;
      strokeLine(ctx, p0, p1);

      ctx.strokeStyle = rgba(glow, alpha * glowBrightness * 0.34);
      ctx.lineWidth = thick * 2.8;
      strokeLine(ctx, p0, p1);

      ctx.strokeStyle = rgba(color, alpha);
      ctx.lineWidth = thick;
      strokeLine(ctx, p0, p1);
    }
  }
}

function strokeLine(ctx, a, b) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function updateTrail(state, p) {
  p.trail.push({ x: p.x, y: p.y, life: 1 });

  const maxTrail = Number(state.params.environmentSnakeTrailLength ?? 80);
  while (p.trail.length > maxTrail) p.trail.shift();
}

function getActiveRect(state) {
  const env = state.environment;
  const w = env.root?.clientWidth || window.innerWidth;
  const h = env.root?.clientHeight || window.innerHeight;

  const scale = Number(state.params.environmentSurfaceScale ?? 260) / 100;

  const aw = w * scale;
  const ah = h * scale;

  return {
    left: env.camera.worldX - aw * 0.5,
    right: env.camera.worldX + aw * 0.5,
    top: env.camera.worldY - ah * 0.5,
    bottom: env.camera.worldY + ah * 0.5,
    width: aw,
    height: ah
  };
}

function worldToScreen(state, pt) {
  const env = state.environment;
  const w = env.root?.clientWidth || window.innerWidth;
  const h = env.root?.clientHeight || window.innerHeight;

  return {
    x: pt.x - env.camera.worldX + w / 2,
    y: pt.y - env.camera.worldY + h / 2
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

function moveParticle(p, dir, amount) {
  if (dir === "down") p.y += amount;
  if (dir === "up") p.y -= amount;
  if (dir === "left") p.x -= amount;
  if (dir === "right") p.x += amount;
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
  let total = p.segments.reduce((sum, s) => sum + s.len, 0);

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

function randomDir() {
  const dirs = ["up", "down", "left", "right"];
  return dirs[Math.floor(Math.random() * dirs.length)];
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

function rgba(rgb, a) {
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${clamp01(a)})`;
}

function hexToRgb(hex) {
  let h = String(hex || "#000000").replace("#", "").trim();

  if (h.length === 3) {
    h = h.split("").map(ch => ch + ch).join("");
  }

  if (!/^[0-9a-fA-F]{6}$/.test(h)) h = "000000";

  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  };
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v) || 0));
}

// CHANGELOG v6:
// • Сферические/3D-змеи заменены на Stage Canvas Snakes в стиле legacy backgroundSnakes.
// • Возвращены screen-space прямоугольные маршруты up/down/left/right.
// • Возвращены turnTimer, loopQueue, разные скорости, trail, taper и тройной glow stroke.
// • Убран bg2:frame/EventBus-per-frame и отдельный backgroundSnakes module lifecycle.
// • Canvas теперь живёт внутри Stage Environment helper и синхронизируется с камерой Stage.
// • Сохранены mobileSafe, parallaxDepth, glowColor, glowBrightness и Inspector-ready параметры.