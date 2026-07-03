// ======================================================
// NOSLEEP_ENGINE — entityStagePreview.js v1
// Inventory drag-preview / drop helper for Entity Stage
// ======================================================

import { createGeometry } from "./entityStageGeometry.js";
import { screenToWorldGround } from "./entityStagePicking.js";
import { clamp } from "./entityStageCamera.js";

export function bindStagePreviewApi(state, bus) {
  bus.on("ui:assetDragStart", payload => {
    handleAssetPreviewStart(state, payload);
  }, { moduleKey: "__entityStage3DModule" });

  bus.on("ui:assetDragMove", payload => {
    handleAssetPreviewMove(state, payload);
  }, { moduleKey: "__entityStage3DModule" });

  bus.on("ui:assetDragEnd", payload => {
    handleAssetDrop(state, bus, payload);
  }, { moduleKey: "__entityStage3DModule" });
}

export function handleAssetPreviewStart(state, payload) {
  if (!state.scene || !state.camera || payload?.kind !== "primitive") return;

  const primitiveId = payload.primitiveId || payload.id;
  if (!primitiveId) return;

  createPreviewMesh(state, primitiveId);
  handleAssetPreviewMove(state, payload);
}

export function handleAssetPreviewMove(state, payload) {
  if (!state.previewMesh || !state.root || !state.camera || payload?.kind !== "primitive") return;

  const x = Number(payload.clientX);
  const y = Number(payload.clientY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;

  const inside = isPointInsideStage(state, x, y);
  state.previewInsideStage = inside;

  if (!inside) {
    state.previewMesh.visible = false;
    state.previewPosition = null;
    return;
  }

  const pos = screenToWorldGround(state, x, y);
  state.previewPosition = pos;

  state.previewMesh.position.set(
    Number(pos.x) || 0,
    Number(pos.y) || 0,
    Number(pos.z) || 0
  );

  state.previewMesh.visible = true;
}

export function handleAssetDrop(state, bus, payload) {
  if (!state.root || !state.camera || payload?.kind !== "primitive") {
    clearPreviewMesh(state);
    return;
  }

  const primitiveId = payload.primitiveId || payload.id || state.previewPrimitiveId;
  if (!primitiveId) {
    clearPreviewMesh(state);
    return;
  }

  const x = Number(payload.clientX);
  const y = Number(payload.clientY);

  const inside = Number.isFinite(x) && Number.isFinite(y)
    ? isPointInsideStage(state, x, y)
    : state.previewInsideStage;

  if (!inside) {
    bus.emit("ui:assetDropRejected", {
      kind: "primitive",
      primitiveId,
      reason: "outsideStage"
    });

    clearPreviewMesh(state);
    return;
  }

  const pos = state.previewPosition || screenToWorldGround(state, x, y);

  bus.emit("entityEditor:addPrimitive", {
    primitiveId,
    transform: { position: pos }
  });

  bus.emit("ui:assetDropAccepted", {
    kind: "primitive",
    primitiveId,
    position: pos
  });

  clearPreviewMesh(state);
}

export function createPreviewMesh(state, primitiveId) {
  clearPreviewMesh(state);

  const geometry = createGeometry(state, primitiveId);
  if (!geometry) return;

  const material = createPreviewMaterial(state);

  const mesh = new state.THREE.Mesh(geometry, material);
  mesh.name = `preview_${primitiveId}`;
  mesh.visible = false;
  mesh.frustumCulled = false;
  mesh.raycast = () => null;
  mesh.userData.isPreview = true;
  mesh.userData.primitiveId = primitiveId;

  state.scene.add(mesh);

  state.previewMesh = mesh;
  state.previewPrimitiveId = primitiveId;
  state.previewPosition = null;
  state.previewInsideStage = false;
}

export function clearPreviewMesh(state) {
  const mesh = state.previewMesh;

  if (mesh && state.scene) {
    try { state.scene.remove(mesh); } catch (_) {}
  }

  if (mesh?.geometry) {
    try { mesh.geometry.dispose(); } catch (_) {}
  }

  if (mesh?.material) {
    disposeMaterial(mesh.material);
  }

  state.previewMesh = null;
  state.previewPrimitiveId = null;
  state.previewPosition = null;
  state.previewInsideStage = false;
}

export function rebuildPreviewGeometry(state) {
  if (!state.previewMesh || !state.previewPrimitiveId) return;

  const geometry = createGeometry(state, state.previewPrimitiveId);
  if (!geometry) return;

  try { state.previewMesh.geometry?.dispose?.(); } catch (_) {}
  state.previewMesh.geometry = geometry;
}

export function refreshPreviewMaterial(state) {
  if (!state.previewMesh) return;

  disposeMaterial(state.previewMesh.material);
  state.previewMesh.material = createPreviewMaterial(state);
}

function createPreviewMaterial(state) {
  const THREE = state.THREE;
  const opacity = clamp(Number(state.params.previewOpacity) || 0.62, 0.05, 1);
  const color = normalizeHexColor(
    state.params.previewColor || state.params.selectedMeshColor || "#ffd36a"
  );

  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.42,
    metalness: 0.08,
    transparent: true,
    opacity,
    depthWrite: opacity >= 0.95,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.14
  });
}

function isPointInsideStage(state, x, y) {
  const rect = state.root?.getBoundingClientRect?.();
  if (!rect) return false;

  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
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

function normalizeHexColor(value, fallback = "#ffd36a") {
  const color = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  if (/^#[0-9a-fA-F]{3}$/.test(color)) return color;
  return fallback;
}

// CHANGELOG v1:
// • Inventory drag-preview вынесен из entityStage3D.js.
// • Сохранены ui:assetDragStart / ui:assetDragMove / ui:assetDragEnd.
// • Сохранены события ui:assetDropAccepted / ui:assetDropRejected.
// • Preview material / geometry / cleanup перенесены в helper.
// • entityStage3D.js сможет использовать clearPreviewMesh/rebuildPreviewGeometry/refreshPreviewMaterial.
// • Store не используется, Entity изменяется только через EventBus.

