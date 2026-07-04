// ======================================================
// NOSLEEP_ENGINE — entityStageFocusRenderLayer.js v14
// Hidden edges via Editor Proxy Factory + draft primitive resolve
// ======================================================

import { createEditorProxy } from "../editor/proxy/editorProxyFactory.js";

const KEY = "__entityStage3DModule";

export function bindStageFocusRenderLayer(state, bus) {
  state.focusRenderLayer = {
    active: false,
    nodeId: null,
    overlay: null,
    targetMesh: null,
    savedTargetRenderOrder: 0
  };

  bus.on("entityFocus:entered", payload => {
    enableFocusRenderLayer(state, payload?.nodeId || null);
  }, { moduleKey: KEY });

  bus.on("entityFocus:left", () => {
    disableFocusRenderLayer(state);
  }, { moduleKey: KEY });

  bus.on("entityEditor:nodeSelected", payload => {
    const nodeId = payload?.nodeId || null;

    if (state.focusRenderLayer?.active && nodeId !== state.focusRenderLayer.nodeId) {
      disableFocusRenderLayer(state);
    }
  }, { moduleKey: KEY });

  bus.on("entityEditor:nodeDeleted", payload => {
    const nodeId = payload?.nodeId || null;

    if (state.focusRenderLayer?.active && nodeId === state.focusRenderLayer.nodeId) {
      disableFocusRenderLayer(state);
    }
  }, { moduleKey: KEY });

  bus.on("entityEditor:changed", () => {
    validateFocusRenderLayer(state);
  }, { moduleKey: KEY });
}

export function destroyStageFocusRenderLayer(state) {
  disableFocusRenderLayer(state);
  state.focusRenderLayer = null;
}

export function enableFocusRenderLayer(state, nodeId) {
  if (!state.scene || !state.THREE || !nodeId) return;

  disableFocusRenderLayer(state);

  const layer = state.focusRenderLayer;
  const targetMesh = state.meshes.get(nodeId);

  if (!layer || !targetMesh) return;

  const overlay = createHiddenEdgeOverlay(state, targetMesh, nodeId);
  if (!overlay) return;

  layer.active = true;
  layer.nodeId = nodeId;
  layer.overlay = overlay;
  layer.targetMesh = targetMesh;
  layer.savedTargetRenderOrder = Number(targetMesh.renderOrder) || 0;

  overlay.renderOrder = 70;
  targetMesh.renderOrder = 80;

  state.scene.add(overlay);
  applyGizmoVisualPriority(state);
}

export function disableFocusRenderLayer(state) {
  const layer = state.focusRenderLayer;
  if (!layer?.active && !layer?.overlay) return;

  if (layer.targetMesh) {
    layer.targetMesh.renderOrder = layer.savedTargetRenderOrder || 0;
  }

  if (layer.overlay) {
    try { state.scene?.remove(layer.overlay); } catch (_) {}
    disposeOverlay(layer.overlay);
  }

  layer.active = false;
  layer.nodeId = null;
  layer.overlay = null;
  layer.targetMesh = null;
  layer.savedTargetRenderOrder = 0;
}

function validateFocusRenderLayer(state) {
  const layer = state.focusRenderLayer;
  if (!layer?.active) return;

  const currentMesh = layer.nodeId ? state.meshes.get(layer.nodeId) : null;

  if (!currentMesh || currentMesh !== layer.targetMesh) {
    disableFocusRenderLayer(state);
  }
}

function createHiddenEdgeOverlay(state, targetMesh, nodeId) {
  const THREE = state.THREE;
  const primitiveId = resolvePrimitiveId(state, targetMesh, nodeId);

  const overlay = createEditorProxy({
    THREE,
    primitiveId,
    geometryType: primitiveId,
    quality: resolveProxyQuality(state)
  });

  if (!overlay) return null;

  applyHiddenEdgeMaterialRules(THREE, overlay);

  overlay.name = `NOSLEEP_FocusHiddenEdges_${nodeId || "target"}_${primitiveId}`;
  overlay.frustumCulled = false;
  overlay.raycast = () => null;

  overlay.userData.focusOverlay = true;
  overlay.userData.ignorePicking = true;

  syncOverlayToTarget(overlay, targetMesh);

  overlay.onBeforeRender = () => {
    const currentMesh = state.meshes.get(nodeId);

    if (!currentMesh || currentMesh !== targetMesh) {
      disableFocusRenderLayer(state);
      return;
    }

    syncOverlayToTarget(overlay, targetMesh);
  };

  return overlay;
}

function resolvePrimitiveId(state, targetMesh, nodeId) {
  const fromMesh =
    targetMesh?.userData?.primitiveId ||
    targetMesh?.userData?.node?.primitiveId ||
    targetMesh?.userData?.entityNode?.primitiveId ||
    null;

  if (fromMesh) return fromMesh;

  const nodes = Array.isArray(state.lastDraft?.nodes)
    ? state.lastDraft.nodes
    : [];

  const node = nodes.find(n => n?.id === nodeId);
  return node?.primitiveId || node?.geometry || "cube";
}

function resolveProxyQuality(state) {
  const q = Number(state.params?.geometryQuality) || 45;

  if (q >= 85) return 24;
  if (q >= 65) return 18;
  if (q >= 40) return 12;

  return 8;
}

function applyHiddenEdgeMaterialRules(THREE, overlay) {
  overlay.traverse?.(obj => {
    if (!obj.material) return;

    applyToMaterial(obj.material, material => {
      material.color?.set?.(0xffffff);
      material.transparent = false;
      material.depthTest = true;
      material.depthWrite = false;
      material.depthFunc = THREE.GreaterDepth;
      material.needsUpdate = true;
    });
  });

  if (overlay.material) {
    applyToMaterial(overlay.material, material => {
      material.color?.set?.(0xffffff);
      material.transparent = false;
      material.depthTest = true;
      material.depthWrite = false;
      material.depthFunc = THREE.GreaterDepth;
      material.needsUpdate = true;
    });
  }
}

function syncOverlayToTarget(overlay, targetMesh) {
  overlay.position.copy(targetMesh.position);
  overlay.rotation.copy(targetMesh.rotation);
  overlay.scale.copy(targetMesh.scale);
}

function applyGizmoVisualPriority(state) {
  const gizmoRoot = state.scene?.getObjectByName?.("NOSLEEP_GizmoRoot");
  if (!gizmoRoot) return;

  gizmoRoot.traverse(obj => {
    obj.renderOrder = Math.max(Number(obj.renderOrder) || 0, 120);

    if (obj.material) {
      applyToMaterial(obj.material, material => {
        material.depthTest = false;
        material.depthWrite = false;
        material.needsUpdate = true;
      });
    }
  });
}

function applyToMaterial(material, fn) {
  if (Array.isArray(material)) {
    material.forEach(m => m && fn(m));
    return;
  }

  if (material) fn(material);
}

function disposeOverlay(overlay) {
  if (!overlay) return;

  try {
    overlay.traverse?.(obj => {
      try { obj.geometry?.dispose?.(); } catch (_) {}
      disposeMaterial(obj.material);
    });
  } catch (_) {}

  try { overlay.geometry?.dispose?.(); } catch (_) {}
  disposeMaterial(overlay.material);
}

function disposeMaterial(material) {
  if (Array.isArray(material)) {
    material.forEach(m => {
      try { m?.dispose?.(); } catch (_) {}
    });
    return;
  }

  try { material?.dispose?.(); } catch (_) {}
}

// CHANGELOG v14:
// • Исправлено определение primitiveId для proxy.
// • primitiveId теперь берётся из mesh.userData или state.lastDraft.nodes по nodeId.
// • Sphere / cylinder / cone / capsule больше не должны получать cube fallback.
// • Рабочая hidden-edge логика v13 сохранена.
// • FocusRenderLayer остаётся потребителем editorProxyFactory, не создаёт геометрию напрямую.