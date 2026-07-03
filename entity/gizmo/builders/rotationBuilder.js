// ======================================================
// NOSLEEP_ENGINE — rotationBuilder.js v2
// Polished 3D rotation rings
// ======================================================

export function buildRotationRings(THREE, params = {}) {
  const root = new THREE.Group();
  root.name = "NOSLEEP_Gizmo_RotationRings";

  const radius = Number(params.rotationRingRadius ?? 0.92);
  const tube = Number(params.rotationRingTube ?? 0.028);
  const hitTube = Number(params.rotationRingHitTube ?? 0.18);

  const xOffsetY = Number(params.rotationRingXOffsetY ?? -0.66);
  const yOffsetX = Number(params.rotationRingYOffsetX ?? -0.66);

  root.add(
    createRing({
      THREE,
      id: "rotationX",
      axis: "x",
      color: normalizeColor(params.rotationRingXColor, "#ffd36a"),
      opacity: params.rotationRingOpacity,
      glow: params.rotationRingGlow,
      radius,
      tube,
      hitTube,
      position: [0, xOffsetY, 0],
      rotation: [0, 90, 0]
    }),

    createRing({
      THREE,
      id: "rotationY",
      axis: "y",
      color: normalizeColor(params.rotationRingYColor, "#b9b2ff"),
      opacity: params.rotationRingOpacity,
      glow: params.rotationRingGlow,
      radius,
      tube,
      hitTube,
      position: [yOffsetX, 0, 0],
      rotation: [90, 0, 0]
    })
  );

  return root;
}

function createRing({
  THREE,
  id,
  axis,
  color,
  opacity,
  glow,
  radius,
  tube,
  hitTube,
  position,
  rotation
}) {
  const group = new THREE.Group();
  group.name = `NOSLEEP_Gizmo_${id}`;
  group.position.set(position[0], position[1], position[2]);
  group.rotation.set(degToRad(rotation[0]), degToRad(rotation[1]), degToRad(rotation[2]));

  group.userData.gizmoHandle = true;
  group.userData.kind = "rotate";
  group.userData.id = id;
  group.userData.axis = axis;

  const visualMaterial = new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity: clamp(Number(opacity ?? 0.26), 0.03, 1),
    roughness: 0.18,
    metalness: 0.34,
    emissive: color,
    emissiveIntensity: clamp(Number(glow ?? 0.18), 0, 1),
    depthTest: true,
    depthWrite: false
  });

  const hitMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false
  });

  const visual = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 14, 112),
    visualMaterial
  );

  visual.name = `NOSLEEP_Gizmo_${id}_Visual`;
  visual.renderOrder = 5;
  visual.userData.gizmoVisual = true;
  visual.userData.kind = "rotate";
  visual.userData.id = id;
  visual.userData.axis = axis;

  const hit = new THREE.Mesh(
    new THREE.TorusGeometry(radius, hitTube, 8, 72),
    hitMaterial
  );

  hit.name = `NOSLEEP_Gizmo_${id}_Hit`;
  hit.renderOrder = 4;
  hit.userData.gizmoInteractive = true;
  hit.userData.kind = "rotate";
  hit.userData.id = id;
  hit.userData.axis = axis;

  group.add(visual, hit);
  return group;
}

export function applyRotationRingParams(root, THREE, params = {}) {
  if (!root) return;

  const opacity = clamp(Number(params.rotationRingOpacity ?? 0.26), 0.03, 1);
  const glow = clamp(Number(params.rotationRingGlow ?? 0.18), 0, 1);
  const xColor = normalizeColor(params.rotationRingXColor, "#ffd36a");
  const yColor = normalizeColor(params.rotationRingYColor, "#b9b2ff");

  root.traverse(obj => {
    if (!obj?.material || !obj.userData?.gizmoVisual) return;

    const color = obj.userData.axis === "x" ? xColor : yColor;

    obj.material.color?.set?.(color);
    obj.material.emissive?.set?.(color);
    obj.material.opacity = opacity;
    obj.material.emissiveIntensity = glow;
    obj.material.needsUpdate = true;
  });

  const ringX = root.getObjectByName("NOSLEEP_Gizmo_rotationX");
  const ringY = root.getObjectByName("NOSLEEP_Gizmo_rotationY");

  if (ringX) ringX.position.y = Number(params.rotationRingXOffsetY ?? -0.66);
  if (ringY) ringY.position.x = Number(params.rotationRingYOffsetX ?? -0.66);
}

function normalizeColor(value, fallback) {
  if (typeof value === "number") return value;
  const str = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(str)) return str;
  if (/^#[0-9a-fA-F]{3}$/.test(str)) return str;
  return fallback;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function degToRad(v) {
  return v * Math.PI / 180;
}

// CHANGELOG v2:
// • Кольца стали визуально мягче и тоньше.
// • Снижен opacity по умолчанию, чтобы они не спорили с ручками.
// • Добавлен renderOrder для нижнего визуального приоритета колец.
// • Сохранены широкие невидимые hit-зоны.
// • X-ring остаётся у нижней грани, Y-ring — у левой грани.
// • Store/EventBus не используются.