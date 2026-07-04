// ======================================================
// NOSLEEP_ENGINE — stretchBuilder.js v2
// Polished 3D stretch handles + visual priority
// ======================================================

export function buildStretchHandles(THREE, params = {}) {
  const root = new THREE.Group();
  root.name = "NOSLEEP_Gizmo_StretchHandles";

  const visualColor = normalizeColor(params.stretchHandleColor, "#00ccff");
  const hitColor = 0xffffff;

  const visualMaterial = new THREE.MeshStandardMaterial({
    color: visualColor,
    transparent: true,
    opacity: clamp(Number(params.stretchHandleOpacity ?? 0.48), 0.05, 1),
    roughness: 0.18,
    metalness: 0.32,
    emissive: visualColor,
    emissiveIntensity: clamp(Number(params.stretchHandleGlow ?? 0.26), 0, 1),
    depthTest: true,
    depthWrite: false
  });

  const hitMaterial = new THREE.MeshBasicMaterial({
    color: hitColor,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false
  });

  const distance = Number(params.stretchHandleDistance ?? 0.9);
  const length = Number(params.stretchHandleLength ?? 0.34);
  const radius = Number(params.stretchHandleRadius ?? 0.085);
  const hitRadius = Number(params.stretchTouchRadius ?? 0.24);

  const defs = [
    { id: "right", axis: "x", sign: 1, position: [distance, 0, 0], rotation: [0, 0, -90] },
    { id: "left", axis: "x", sign: -1, position: [-distance, 0, 0], rotation: [0, 0, 90] },
    { id: "top", axis: "y", sign: 1, position: [0, distance, 0], rotation: [0, 0, 0] },
    { id: "bottom", axis: "y", sign: -1, position: [0, -distance, 0], rotation: [0, 0, 180] },
    { id: "front", axis: "z", sign: 1, position: [0, 0, distance], rotation: [90, 0, 0] },
    { id: "back", axis: "z", sign: -1, position: [0, 0, -distance], rotation: [-90, 0, 0] }
  ];

  for (const def of defs) {
    root.add(createArrowHandle({
      THREE,
      def,
      visualMaterial,
      hitMaterial,
      length,
      radius,
      hitRadius
    }));
  }

  return root;
}

function createArrowHandle({
  THREE,
  def,
  visualMaterial,
  hitMaterial,
  length,
  radius,
  hitRadius
}) {
  const group = new THREE.Group();
  group.name = `NOSLEEP_Gizmo_Stretch_${def.id}`;
  group.position.set(def.position[0], def.position[1], def.position[2]);
  group.rotation.set(
    degToRad(def.rotation[0]),
    degToRad(def.rotation[1]),
    degToRad(def.rotation[2])
  );

  group.userData.gizmoHandle = true;
  group.userData.kind = "stretch";
  group.userData.id = def.id;
  group.userData.axis = def.axis;
  group.userData.sign = def.sign;

  const shaft = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, length, 5, 16),
    visualMaterial.clone()
  );

  shaft.name = `NOSLEEP_Gizmo_Stretch_${def.id}_Shaft`;
  shaft.position.y = -length * 0.16;
  shaft.renderOrder = 20;
  shaft.userData.gizmoVisual = true;

  const head = new THREE.Mesh(
    new THREE.ConeGeometry(radius * 1.9, length * 0.58, 24, 1),
    visualMaterial.clone()
  );

  head.name = `NOSLEEP_Gizmo_Stretch_${def.id}_Head`;
  head.position.y = length * 0.34;
  head.renderOrder = 21;
  head.userData.gizmoVisual = true;

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.42, 18, 10),
    visualMaterial.clone()
  );

  glow.name = `NOSLEEP_Gizmo_Stretch_${def.id}_GlowCore`;
  glow.position.y = length * 0.16;
  glow.scale.set(0.82, 1.28, 0.82);
  glow.renderOrder = 19;
  glow.userData.gizmoVisual = true;

  const hit = new THREE.Mesh(
    new THREE.CapsuleGeometry(hitRadius, length * 1.46, 4, 12),
    hitMaterial.clone()
  );

  hit.name = `NOSLEEP_Gizmo_Stretch_${def.id}_Hit`;
  hit.position.y = 0;
  hit.renderOrder = 30;
  hit.userData.gizmoInteractive = true;
  hit.userData.kind = "stretch";
  hit.userData.id = def.id;
  hit.userData.axis = def.axis;
  hit.userData.sign = def.sign;

  group.add(shaft, head, glow, hit);
  return group;
}

export function applyStretchHandleParams(root, THREE, params = {}) {
  if (!root) return;

  const color = normalizeColor(params.stretchHandleColor, "#00ccff");
  const opacity = clamp(Number(params.stretchHandleOpacity ?? 0.48), 0.05, 1);
  const glow = clamp(Number(params.stretchHandleGlow ?? 0.26), 0, 1);

  root.traverse(obj => {
    if (!obj?.material || !obj.userData?.gizmoVisual) return;

    obj.material.color?.set?.(color);
    obj.material.emissive?.set?.(color);
    obj.material.opacity = opacity;
    obj.material.emissiveIntensity = glow;
    obj.material.needsUpdate = true;

    if (obj.name.includes("GlowCore")) {
      obj.material.opacity = Math.min(0.72, opacity * 0.72);
      obj.material.emissiveIntensity = Math.min(1, glow * 1.35);
    }
  });
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
// • Ручки получили более премиальный volumetric look.
// • Добавлен GlowCore для мягкого объёмного свечения.
// • Ручкам задан renderOrder выше, чем у rotation rings.
// • Hit-зоны остались широкими и невидимыми.
// • Увеличено качество Capsule/Cone geometry.
// • Store/EventBus не используются.