// ======================================================
// Dain_Coin — entityStageEnvironment.js v4
// Inner Sphere Snakes — Visibility Fix + Inspector Sync
// ======================================================

import * as THREE from "../../libs/three.module.js";

export function createStageEnvironment(state) {
  disposeStageEnvironment(state);

  const root = new THREE.Group();
  root.name = "stageEnvironmentRoot";

  const shell = createSnakeShell(state);
  root.add(shell.group);

  state.environment = {
    root,
    shell,
    time: 0
  };

  state.scene.add(root);
  applyStageEnvironmentParams(state);
  updateSnakeGeometry(state, shell);
}

export function updateStageEnvironment(state, dt = 1 / 60) {
  const env = state.environment;
  if (!env?.root || !env.shell) return;

  env.root.visible = !!state.params.environmentEnabled;
  if (!env.root.visible) return;

  env.time += dt;

  updateSnakes(state, env.shell, dt);
  updateSnakeGeometry(state, env.shell);
}

export function applyStageEnvironmentParams(state) {
  const env = state.environment;
  if (!env?.root || !env.shell) return;

  const p = state.params;

  env.root.position.set(
    Number(p.environmentCenterX ?? 0),
    Number(p.environmentCenterY ?? 0),
    Number(p.environmentCenterZ ?? 0)
  );

  env.root.rotation.set(
    degToRad(Number(p.environmentRotationX ?? 0)),
    degToRad(Number(p.environmentRotationY ?? 0)),
    degToRad(Number(p.environmentRotationZ ?? 0))
  );

  const color = normalizeColor(p.environmentLineColor, "#000000");
  const opacity = clamp01((Number(p.environmentLineOpacity ?? 85)) / 100);

  env.shell.materials.glowSoft.color.set(color);
  env.shell.materials.glowSoft.opacity = opacity * 0.18;

  env.shell.materials.glowMid.color.set(color);
  env.shell.materials.glowMid.opacity = opacity * 0.38;

  env.shell.materials.core.color.set(color);
  env.shell.materials.core.opacity = opacity;

  env.shell.group.visible = !!p.environmentTracesEnabled;
}

export function rebuildStageEnvironment(state) {
  if (!state.scene) return;
  createStageEnvironment(state);
}

export function disposeStageEnvironment(state) {
  const env = state.environment;
  if (!env) return;

  if (env.root?.parent) env.root.parent.remove(env.root);
  disposeObject(env.root);

  state.environment = null;
}

function createSnakeShell(state) {
  const radius = Number(state.params.environmentShellRadius ?? 34);
  const count = resolveSnakeCount(state);

  const snakes = [];
  for (let i = 0; i < count; i++) {
    snakes.push(createSnake(state, radius));
  }

  const group = new THREE.Group();
  group.name = "innerSphereSnakeShell";

  const glowSoft = createLineLayer(state, 0.18);
  const glowMid = createLineLayer(state, 0.38);
  const core = createLineLayer(state, 1);

  glowSoft.name = "snakeGlowSoft";
  glowMid.name = "snakeGlowMid";
  core.name = "snakeCore";

  group.add(glowSoft, glowMid, core);

  return {
    radius,
    snakes,
    group,
    layers: { glowSoft, glowMid, core },
    materials: {
      glowSoft: glowSoft.material,
      glowMid: glowMid.material,
      core: core.material
    }
  };
}

function createLineLayer(state, alphaMul) {
  const color = normalizeColor(state.params.environmentLineColor, "#000000");
  const opacity =
    clamp01((Number(state.params.environmentLineOpacity ?? 85)) / 100) * alphaMul;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0.01, 0, 0], 3));

  const material = new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: false
  });

  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  lines.renderOrder = -100;

  return lines;
}

function createSnake(state, radius) {
  const normal = randomSpherePoint();
  const dir = randomTangent(normal);

  const speedBase = Number(state.params.environmentSnakeSpeed ?? 1);
  const speedRandom = rand(0.45, 1.65);

  return {
    radius: radius * rand(0.88, 1.12),
    normal,
    dir,
    speed: speedBase * speedRandom,
    turnTimer: rand(
      Number(state.params.environmentSnakeTurnMin ?? 0.35),
      Number(state.params.environmentSnakeTurnMax ?? 1.8)
    ),
    trail: [],
    maxTrail: Math.round(Number(state.params.environmentSnakeTrailLength ?? 64)),
    loopQueue: null,
    loopChance: Number(state.params.environmentSnakeLoopChance ?? 4) / 100
  };
}

function updateSnakes(state, shell, dt) {
  for (const snake of shell.snakes) {
    const step = snake.speed * dt;

    const next = snake.normal
      .clone()
      .multiplyScalar(snake.radius)
      .add(snake.dir.clone().multiplyScalar(step));

    snake.normal.copy(next.normalize());
    snake.dir.projectOnPlane(snake.normal).normalize();

    snake.trail.push(snake.normal.clone().multiplyScalar(snake.radius));

    while (snake.trail.length > snake.maxTrail) {
      snake.trail.shift();
    }

    snake.turnTimer -= dt;
    if (snake.turnTimer <= 0) {
      snake.turnTimer = rand(
        Number(state.params.environmentSnakeTurnMin ?? 0.35),
        Number(state.params.environmentSnakeTurnMax ?? 1.8)
      );
      turnSnake(snake);
    }
  }
}

function turnSnake(snake) {
  const axis = snake.normal.clone().normalize();

  if (!snake.loopQueue && Math.random() < snake.loopChance) {
    const sign = Math.random() < 0.5 ? -1 : 1;
    snake.loopQueue = [sign, sign, sign, sign];
  }

  let sign;

  if (snake.loopQueue?.length) {
    sign = snake.loopQueue.shift();
    if (!snake.loopQueue.length) snake.loopQueue = null;
  } else {
    sign = Math.random() < 0.5 ? -1 : 1;
  }

  snake.dir.applyAxisAngle(axis, sign * Math.PI * 0.5);
  snake.dir.projectOnPlane(snake.normal).normalize();
}

function updateSnakeGeometry(state, shell) {
  const soft = [];
  const mid = [];
  const core = [];

  const taperPower = Number(state.params.environmentSnakeTaper ?? 1.45);

  for (const snake of shell.snakes) {
    const tr = snake.trail;
    if (tr.length < 2) continue;

    for (let i = 1; i < tr.length; i++) {
      const a = tr[i - 1];
      const b = tr[i];

      const t = i / tr.length;
      const fade = Math.pow(t, taperPower);

      if (fade > 0.08) soft.push(a.x, a.y, a.z, b.x, b.y, b.z);
      if (fade > 0.26) mid.push(a.x, a.y, a.z, b.x, b.y, b.z);
      if (fade > 0.48) core.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }

  replacePositions(shell.layers.glowSoft, soft);
  replacePositions(shell.layers.glowMid, mid);
  replacePositions(shell.layers.core, core);
}

function replacePositions(lineSegments, positions) {
  const safe = positions.length >= 6 ? positions : [0, 0, 0, 0.01, 0, 0];

  lineSegments.geometry.dispose();
  lineSegments.geometry = new THREE.BufferGeometry();
  lineSegments.geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(safe, 3)
  );

  lineSegments.geometry.computeBoundingSphere();
}

function resolveSnakeCount(state) {
  const raw = Number(state.params.environmentSnakeCount ?? 42);
  return state.params.environmentMobileSafe ? Math.min(raw, 48) : Math.min(raw, 140);
}

function randomSpherePoint() {
  const u = Math.random();
  const v = Math.random();

  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);

  return new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta)
  ).normalize();
}

function randomTangent(normal) {
  const helper =
    Math.abs(normal.y) < 0.9
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0);

  return new THREE.Vector3()
    .crossVectors(normal, helper)
    .normalize()
    .applyAxisAngle(normal, rand(0, Math.PI * 2));
}

function disposeObject(obj) {
  if (!obj) return;
  if (obj.children) [...obj.children].forEach(disposeObject);

  try { obj.geometry?.dispose?.(); } catch (_) {}
  try { obj.material?.dispose?.(); } catch (_) {}
}

function normalizeColor(value, fallback) {
  const color = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  if (/^#[0-9a-fA-F]{3}$/.test(color)) return color;
  return fallback;
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function degToRad(v) {
  return v * Math.PI / 180;
}

function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v) || 0));
}

// CHANGELOG v4:
// • Исправлена пустая геометрия при первом кадре.
// • Добавлен fallback-сегмент, чтобы BufferGeometry не была нулевой.
// • depthTest отключён для фоновых змей, чтобы они гарантированно были видимы.
// • Сфера центрируется вокруг сцены, а не уезжает в даль.
// • Подняты дефолтные opacity и radius для быстрой визуальной проверки.
// • Подготовлена синхронизация с entityStage3D v21.