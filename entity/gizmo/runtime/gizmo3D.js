// ======================================================
// NOSLEEP_ENGINE — gizmo3D.js v7
// Runtime 3D root + quaternion transform support
// ======================================================

import {
  buildStretchHandles,
  applyStretchHandleParams
} from "../builders/stretchBuilder.js";

import {
  buildRotationRings,
  applyRotationRingParams
} from "../builders/rotationBuilder.js";

import {
  buildScaleHandle,
  applyScaleHandleParams
} from "../builders/scaleBuilder.js";

export function createGizmo3D({ THREE, scene }) {
  if (!THREE || !scene) return createEmptyGizmo3D();

  const root = new THREE.Group();
  root.name = "NOSLEEP_GizmoRoot";
  root.visible = false;
  root.userData.gizmoRoot = true;

  const stretchRoot = new THREE.Group();
  stretchRoot.name = "NOSLEEP_Gizmo_StretchRoot";

  const rotationRoot = new THREE.Group();
  rotationRoot.name = "NOSLEEP_Gizmo_RotationRoot";

  const scaleRoot = new THREE.Group();
  scaleRoot.name = "NOSLEEP_Gizmo_ScaleRoot";

  const pivotRoot = new THREE.Group();
  pivotRoot.name = "NOSLEEP_Gizmo_PivotRoot";
  pivotRoot.visible = false;

  root.add(stretchRoot, rotationRoot, scaleRoot, pivotRoot);
  scene.add(root);

  return {
    ready: true,
    THREE,
    scene,
    root,
    groups: {
      stretch: stretchRoot,
      rotation: rotationRoot,
      scale: scaleRoot,
      pivot: pivotRoot
    },
    built: {
      stretch: null,
      rotation: null,
      scale: null,
      pivot: null
    },
    layout: null,
    bounds: null,
    params: {}
  };
}

export function rebuildGizmo3D(runtime, params = {}) {
  if (!runtime?.ready || !runtime.THREE) return;

  runtime.params = { ...runtime.params, ...params };

  clearGizmo3DGroup(runtime, "stretch");
  clearGizmo3DGroup(runtime, "rotation");
  clearGizmo3DGroup(runtime, "scale");

  const stretch = buildStretchHandles(runtime.THREE, params);
  const rotation = buildRotationRings(runtime.THREE, params);
  const scale = buildScaleHandle(runtime.THREE, params);

  runtime.groups.stretch.add(stretch);
  runtime.groups.rotation.add(rotation);
  runtime.groups.scale.add(scale);

  runtime.built.stretch = stretch;
  runtime.built.rotation = rotation;
  runtime.built.scale = scale;

  applyGizmo3DLayout(runtime, runtime.layout || createLegacyLayout(params));
  applyGizmo3DBounds(runtime, runtime.bounds, runtime.params);
}

export function applyGizmo3DParams(runtime, params = {}) {
  if (!runtime?.ready) return;

  runtime.params = { ...runtime.params, ...params };

  applyStretchHandleParams(runtime.built?.stretch, runtime.THREE, params);
  applyRotationRingParams(runtime.built?.rotation, runtime.THREE, params);
  applyScaleHandleParams(runtime.built?.scale, runtime.THREE, params);

  applyGizmo3DLayout(runtime, runtime.layout || createLegacyLayout(params));
  applyGizmo3DBounds(runtime, runtime.bounds, runtime.params);
}

export function applyGizmo3DLayout(runtime, layout = {}) {
  if (!runtime?.groups) return;

  const nextLayout = normalizeLayout(layout);
  runtime.layout = nextLayout;

  runtime.groups.stretch.visible = !!nextLayout.stretch;
  runtime.groups.rotation.visible = !!nextLayout.rotation;
  runtime.groups.scale.visible = !!nextLayout.scale;
  runtime.groups.pivot.visible = !!nextLayout.pivot;

  applyGroupInteraction(runtime.groups.stretch, nextLayout.stretchInteractive);
  applyGroupInteraction(runtime.groups.rotation, nextLayout.rotationInteractive);
  applyGroupInteraction(runtime.groups.scale, nextLayout.scaleInteractive);
  applyGroupInteraction(runtime.groups.pivot, nextLayout.pivotInteractive);

  setGizmo3DVisible(runtime, nextLayout.visible);
}

export function applyGizmo3DBounds(runtime, bounds = null, params = {}) {
  if (!runtime?.ready || !runtime.groups) return;

  const safe = normalizeBounds(bounds);
  runtime.bounds = safe;

  const maxSize = Math.max(safe.x, safe.y, safe.z);
  const visualScale = clamp(maxSize * 0.42, 0.72, 2.4);

  applyStretchBounds(runtime, safe, visualScale, params);
  applyRotationBounds(runtime, safe, visualScale, params);
  applyScaleBounds(runtime, safe, visualScale, params);
}

function applyStretchBounds(runtime, bounds, visualScale, params = {}) {
  const root = runtime.built?.stretch;
  if (!root) return;

  const margin = clamp(Number(params.stretchHandleDistance ?? 0.86) * 0.42, 0.28, 1.2);

  const defs = {
    right: { x: bounds.x * 0.5 + margin, y: 0, z: 0 },
    left: { x: -bounds.x * 0.5 - margin, y: 0, z: 0 },
    top: { x: 0, y: bounds.y * 0.5 + margin, z: 0 },
    bottom: { x: 0, y: -bounds.y * 0.5 - margin, z: 0 },
    front: { x: 0, y: 0, z: bounds.z * 0.5 + margin },
    back: { x: 0, y: 0, z: -bounds.z * 0.5 - margin }
  };

  for (const [id, pos] of Object.entries(defs)) {
    const group = root.getObjectByName(`NOSLEEP_Gizmo_Stretch_${id}`);
    if (!group) continue;

    group.position.set(pos.x, pos.y, pos.z);
    group.scale.setScalar(visualScale);
  }
}

function applyRotationBounds(runtime, bounds, visualScale, params = {}) {
  const root = runtime.built?.rotation;
  if (!root) return;

  const maxXZ = Math.max(bounds.x, bounds.z);
  const maxXY = Math.max(bounds.x, bounds.y);
  const radiusScale = clamp(Math.max(maxXZ, maxXY) * 0.54, 0.78, 2.6);

  const offsetY = clamp(Number(params.rotationRingXOffsetY ?? -0.66), -3, 3);
  const offsetX = clamp(Number(params.rotationRingYOffsetX ?? -0.66), -3, 3);

  const ringX = root.getObjectByName("NOSLEEP_Gizmo_rotationX");
  const ringY = root.getObjectByName("NOSLEEP_Gizmo_rotationY");

  if (ringX) {
    ringX.position.y = offsetY;
    ringX.scale.setScalar(radiusScale);
  }

  if (ringY) {
    ringY.position.x = offsetX;
    ringY.scale.setScalar(radiusScale);
  }

  root.scale.setScalar(clamp(visualScale, 0.86, 1.45));
}

function applyScaleBounds(runtime, bounds, visualScale, params = {}) {
  const root = runtime.built?.scale;
  if (!root) return;

  const margin = clamp(Number(params.scaleOffsetX3D ?? 1.18) * 0.55, 0.42, 1.4);

  root.position.x = bounds.x * 0.5 + margin;
  root.scale.setScalar(clamp(visualScale, 0.82, 1.8));
}

export function destroyGizmo3D(runtime) {
  if (!runtime?.ready) return;

  try { runtime.scene?.remove(runtime.root); } catch (_) {}

  disposeObject(runtime.root);

  runtime.ready = false;
  runtime.scene = null;
  runtime.root = null;
  runtime.groups = null;
  runtime.built = null;
  runtime.layout = null;
  runtime.bounds = null;
  runtime.params = {};
}

export function setGizmo3DVisible(runtime, visible) {
  if (!runtime?.root) return;
  runtime.root.visible = !!visible;
}

export function setGizmo3DMode(runtime, mode = "default", options = {}) {
  applyGizmo3DLayout(runtime, modeToLayout(mode, options));
}

export function setGizmo3DTransform(runtime, transform = {}) {
  if (!runtime?.root) return;

  const p = transform.position || {};
  const r = transform.rotation || {};
  const q = transform.rotationQuaternion || null;

  runtime.root.position.set(
    Number(p.x) || 0,
    Number(p.y) || 0,
    Number(p.z) || 0
  );

  if (q && runtime.root.quaternion?.set) {
    runtime.root.quaternion.set(
      Number(q.x) || 0,
      Number(q.y) || 0,
      Number(q.z) || 0,
      Number.isFinite(Number(q.w)) ? Number(q.w) : 1
    );
  } else {
    runtime.root.rotation.set(
      degToRad(Number(r.x) || 0),
      degToRad(Number(r.y) || 0),
      degToRad(Number(r.z) || 0)
    );
  }

  runtime.root.scale.set(1, 1, 1);
}

export function clearGizmo3DGroup(runtime, groupName) {
  const group = runtime?.groups?.[groupName];
  if (!group) return;

  while (group.children.length) {
    const child = group.children.pop();
    disposeObject(child);
  }

  if (runtime.built && groupName in runtime.built) {
    runtime.built[groupName] = null;
  }
}

export function clearAllGizmo3DGroups(runtime) {
  clearGizmo3DGroup(runtime, "stretch");
  clearGizmo3DGroup(runtime, "rotation");
  clearGizmo3DGroup(runtime, "scale");
  clearGizmo3DGroup(runtime, "pivot");
}

export function collectGizmo3DInteractiveObjects(runtime) {
  if (!runtime?.root || runtime.root.visible === false) return [];

  const result = [];

  runtime.root.traverse(obj => {
    if (!obj?.userData?.gizmoInteractive) return;
    if (obj.userData.gizmoInteractiveEnabled !== true) return;
    if (!isEffectivelyVisible(obj, runtime.root)) return;

    result.push(obj);
  });

  return result;
}

function applyGroupInteraction(group, enabled) {
  if (!group) return;

  group.traverse(obj => {
    if (!obj?.userData?.gizmoInteractive) return;
    obj.userData.gizmoInteractiveEnabled = !!enabled;
  });
}

function isEffectivelyVisible(obj, root) {
  let current = obj;

  while (current) {
    if (current.visible === false) return false;
    if (current === root) break;
    current = current.parent;
  }

  return true;
}

function normalizeLayout(layout = {}) {
  const stretch = !!layout.stretch;
  const rotation = !!layout.rotation;
  const scale = !!layout.scale;
  const pivot = !!layout.pivot;
  const visible = layout.visible !== false;

  return {
    name: layout.name || "custom",
    visible,

    stretch,
    rotation,
    scale,
    pivot,

    stretchInteractive:
      layout.stretchInteractive !== undefined
        ? !!layout.stretchInteractive
        : visible && stretch,

    rotationInteractive:
      layout.rotationInteractive !== undefined
        ? !!layout.rotationInteractive
        : visible && rotation,

    scaleInteractive:
      layout.scaleInteractive !== undefined
        ? !!layout.scaleInteractive
        : visible && scale,

    pivotInteractive:
      layout.pivotInteractive !== undefined
        ? !!layout.pivotInteractive
        : visible && pivot,

    infoPanel: !!layout.infoPanel,
    toolDock: !!layout.toolDock
  };
}

function normalizeBounds(bounds = null) {
  return {
    x: clamp(Number(bounds?.x) || 1, 0.05, 100),
    y: clamp(Number(bounds?.y) || 1, 0.05, 100),
    z: clamp(Number(bounds?.z) || 1, 0.05, 100)
  };
}

function createLegacyLayout(params = {}) {
  return modeToLayout(params.mode || "default", {
    scaleAlwaysVisible: params.scaleAlwaysVisible !== false
  });
}

function modeToLayout(mode = "default", options = {}) {
  const scaleAlwaysVisible = options.scaleAlwaysVisible !== false;

  const layout = {
    name: mode,
    visible: true,
    stretch: mode === "default" || mode === "stretch",
    rotation: mode === "default" || mode === "rotate",
    scale:
      mode === "default" ||
      mode === "scale" ||
      mode === "selection" ||
      scaleAlwaysVisible,
    pivot: false
  };

  return {
    ...layout,
    stretchInteractive: layout.stretch,
    rotationInteractive: layout.rotation,
    scaleInteractive: layout.scale,
    pivotInteractive: layout.pivot
  };
}

function createEmptyGizmo3D() {
  return {
    ready: false,
    THREE: null,
    scene: null,
    root: null,
    groups: null,
    built: null,
    layout: null,
    bounds: null,
    params: {}
  };
}

function disposeObject(obj) {
  if (!obj) return;

  try {
    obj.traverse?.(child => {
      disposeGeometry(child);
      disposeMaterial(child);
    });
  } catch (_) {}

  disposeGeometry(obj);
  disposeMaterial(obj);
}

function disposeGeometry(obj) {
  try { obj.geometry?.dispose?.(); } catch (_) {}
}

function disposeMaterial(obj) {
  const material = obj?.material;

  if (Array.isArray(material)) {
    material.forEach(m => {
      try { m?.dispose?.(); } catch (_) {}
    });
    return;
  }

  try { material?.dispose?.(); } catch (_) {}
}

function degToRad(v) {
  return v * Math.PI / 180;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// CHANGELOG v7:
// • setGizmo3DTransform теперь поддерживает rotationQuaternion.
// • Euler rotation сохранён как fallback.
// • Constant-shape Gizmo v6 сохранён.
// • Interaction gating сохранён.