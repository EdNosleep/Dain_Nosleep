// ======================================================
// NOSLEEP_ENGINE — scaleBuilder.js v1
// 3D uniform scale control builder
// ======================================================
//
// Role:
// • Builds a 3D vertical scale slider.
// • Includes bar, round thumb, top step arrow, bottom step arrow.
// • Provides wide invisible hit zones.
// • Does not read/write Store.
// • Does not emit events.
// • Does not know about EntityEditorLogic.
// ======================================================

export function buildScaleHandle(THREE, params = {}) {
  const root = new THREE.Group();
  root.name = "NOSLEEP_Gizmo_ScaleHandle";

  const color = normalizeColor(params.scaleHandleColor, "#ffffff");
  const accent = normalizeColor(params.scaleHandleAccentColor, "#00ccff");

  const offsetX = Number(params.scaleOffsetX3D ?? 1.18);
  const height = Number(params.scaleHeight3D ?? 1.28);
  const barRadius = Number(params.scaleBarRadius ?? 0.025);
  const thumbRadius = Number(params.scaleThumbRadius ?? 0.105);
  const arrowSize = Number(params.scaleArrowSize ?? 0.13);
  const hitRadius = Number(params.scaleHitRadius ?? 0.2);

  root.position.set(offsetX, 0, 0);

  const barMaterial = new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity: clamp(Number(params.scaleBarOpacity ?? 0.34), 0.05, 1),
    roughness: 0.22,
    metalness: 0.18,
    emissive: color,
    emissiveIntensity: clamp(Number(params.scaleBarGlow ?? 0.08), 0, 1),
    depthTest: true,
    depthWrite: false
  });

  const thumbMaterial = new THREE.MeshStandardMaterial({
    color: accent,
    transparent: true,
    opacity: clamp(Number(params.scaleThumbOpacity ?? 0.72), 0.05, 1),
    roughness: 0.18,
    metalness: 0.28,
    emissive: accent,
    emissiveIntensity: clamp(Number(params.scaleThumbGlow ?? 0.22), 0, 1),
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

  const bar = new THREE.Mesh(
    new THREE.CapsuleGeometry(barRadius, height, 4, 12),
    barMaterial
  );

  bar.name = "NOSLEEP_Gizmo_Scale_Bar";
  bar.userData.gizmoVisual = true;

  const thumb = new THREE.Mesh(
    new THREE.SphereGeometry(thumbRadius, 20, 12),
    thumbMaterial
  );

  thumb.name = "NOSLEEP_Gizmo_Scale_Thumb";
  thumb.userData.gizmoVisual = true;

  const dragHit = new THREE.Mesh(
    new THREE.CapsuleGeometry(hitRadius, height * 1.08, 4, 12),
    hitMaterial.clone()
  );

  dragHit.name = "NOSLEEP_Gizmo_Scale_DragHit";
  dragHit.userData.gizmoInteractive = true;
  dragHit.userData.kind = "scale";
  dragHit.userData.id = "scaleDrag";
  dragHit.userData.action = "drag";

  const upArrow = createTriangleArrow(THREE, {
    name: "NOSLEEP_Gizmo_Scale_UpArrow",
    color: accent,
    opacity: params.scaleArrowOpacity,
    glow: params.scaleArrowGlow,
    size: arrowSize,
    direction: 1
  });

  upArrow.position.y = height * 0.62;
  upArrow.userData.gizmoVisual = true;

  const downArrow = createTriangleArrow(THREE, {
    name: "NOSLEEP_Gizmo_Scale_DownArrow",
    color: accent,
    opacity: params.scaleArrowOpacity,
    glow: params.scaleArrowGlow,
    size: arrowSize,
    direction: -1
  });

  downArrow.position.y = -height * 0.62;
  downArrow.userData.gizmoVisual = true;

  const upHit = new THREE.Mesh(
    new THREE.SphereGeometry(hitRadius * 0.95, 12, 8),
    hitMaterial.clone()
  );

  upHit.name = "NOSLEEP_Gizmo_Scale_UpHit";
  upHit.position.y = height * 0.62;
  upHit.userData.gizmoInteractive = true;
  upHit.userData.kind = "scale";
  upHit.userData.id = "scaleStepUp";
  upHit.userData.action = "step";
  upHit.userData.sign = 1;

  const downHit = new THREE.Mesh(
    new THREE.SphereGeometry(hitRadius * 0.95, 12, 8),
    hitMaterial.clone()
  );

  downHit.name = "NOSLEEP_Gizmo_Scale_DownHit";
  downHit.position.y = -height * 0.62;
  downHit.userData.gizmoInteractive = true;
  downHit.userData.kind = "scale";
  downHit.userData.id = "scaleStepDown";
  downHit.userData.action = "step";
  downHit.userData.sign = -1;

  root.add(bar, thumb, dragHit, upArrow, downArrow, upHit, downHit);

  return root;
}

export function applyScaleHandleParams(root, THREE, params = {}) {
  if (!root) return;

  const offsetX = Number(params.scaleOffsetX3D ?? 1.18);
  root.position.x = offsetX;

  const color = normalizeColor(params.scaleHandleColor, "#ffffff");
  const accent = normalizeColor(params.scaleHandleAccentColor, "#00ccff");

  root.traverse(obj => {
    if (!obj?.material || !obj.userData?.gizmoVisual) return;

    const isAccent =
      obj.name.includes("Thumb") ||
      obj.name.includes("Arrow");

    const nextColor = isAccent ? accent : color;

    obj.material.color?.set?.(nextColor);
    obj.material.emissive?.set?.(nextColor);
    obj.material.needsUpdate = true;
  });
}

function createTriangleArrow(THREE, {
  name,
  color,
  opacity,
  glow,
  size,
  direction
}) {
  const shape = new THREE.Shape();

  if (direction >= 0) {
    shape.moveTo(0, size);
    shape.lineTo(-size * 0.72, -size * 0.42);
    shape.lineTo(size * 0.72, -size * 0.42);
  } else {
    shape.moveTo(0, -size);
    shape.lineTo(-size * 0.72, size * 0.42);
    shape.lineTo(size * 0.72, size * 0.42);
  }

  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: size * 0.16,
    bevelEnabled: true,
    bevelThickness: size * 0.035,
    bevelSize: size * 0.025,
    bevelSegments: 2
  });

  geometry.center();

  const material = new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity: clamp(Number(opacity ?? 0.62), 0.05, 1),
    roughness: 0.2,
    metalness: 0.24,
    emissive: color,
    emissiveIntensity: clamp(Number(glow ?? 0.18), 0, 1),
    depthTest: true,
    depthWrite: false
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  return mesh;
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

// CHANGELOG v1:
// • Создан builder для 3D Uniform Scale Handle.
// • Добавлена вертикальная полупрозрачная полоска.
// • Добавлен круглый thumb-ползунок.
// • Добавлены верхняя/нижняя треугольные step-стрелки.
// • Добавлены широкие невидимые hit-зоны scaleDrag / scaleStepUp / scaleStepDown.
// • Builder не содержит Store, EventBus и бизнес-логики.

