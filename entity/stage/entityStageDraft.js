// ======================================================
// NOSLEEP_ENGINE — entityStageDraft.js v2
// Draft rendering helper + quaternion rotation support
// ======================================================

import { createGeometry } from "./entityStageGeometry.js";

import {
  createStageMesh,
  applySelection,
  disposeMesh
} from "./entityStageMaterials.js";

import { emitSelectedProjection } from "./entityStageProjectionApi.js";

export function renderDraft(state, draft) {
  if (!state.scene) return;

  state.lastDraft = draft;

  const nodes = Array.isArray(draft?.nodes) ? draft.nodes : [];
  const alive = new Set(nodes.map(n => n.id));

  state.selectedNodeId = draft?.selectedNodeId || null;

  for (const [id, mesh] of state.meshes.entries()) {
    if (!alive.has(id)) {
      state.scene.remove(mesh);
      disposeMesh(mesh);
      state.meshes.delete(id);
    }
  }

  nodes.forEach(node => {
    let mesh = state.meshes.get(node.id);

    if (!mesh) {
      const geometry = createGeometry(state, node.primitiveId);
      mesh = createStageMesh(state, node, geometry);
      state.meshes.set(node.id, mesh);
      state.scene.add(mesh);
    }

    applyNodeToMesh(mesh, node);
    applySelection(state, mesh, node.id === state.selectedNodeId);
  });

  emitSelectedProjection(state);
}

export function rebuildAllMeshGeometry(state) {
  if (!state.lastDraft || !state.scene) return;

  const nodes = Array.isArray(state.lastDraft.nodes)
    ? state.lastDraft.nodes
    : [];

  nodes.forEach(node => {
    const mesh = state.meshes.get(node.id);
    if (!mesh) return;

    const nextGeometry = createGeometry(state, node.primitiveId);
    if (!nextGeometry) return;

    if (mesh.geometry) mesh.geometry.dispose();
    mesh.geometry = nextGeometry;
  });

  emitSelectedProjection(state);
}

export function disposeAllDraftMeshes(state) {
  for (const mesh of state.meshes.values()) {
    disposeMesh(mesh);
  }

  state.meshes.clear();
}

export function applyNodeToMesh(mesh, node) {
  const t = node.transform || {};
  const p = t.position || {};
  const r = t.rotation || {};
  const q = t.rotationQuaternion || null;
  const s = t.scale || {};
  const stretch = node.stretch || {};

  mesh.position.set(
    Number(p.x) || 0,
    Number(p.y) || 0,
    Number(p.z) || 0
  );

  if (q && mesh.quaternion?.set) {
    mesh.quaternion.set(
      Number(q.x) || 0,
      Number(q.y) || 0,
      Number(q.z) || 0,
      Number.isFinite(Number(q.w)) ? Number(q.w) : 1
    );
  } else {
    mesh.rotation.set(
      degToRad(Number(r.x) || 0),
      degToRad(Number(r.y) || 0),
      degToRad(Number(r.z) || 0)
    );
  }

  mesh.scale.set(
    (Number(s.x) || 1) * (Number(stretch.x) || 1),
    (Number(s.y) || 1) * (Number(stretch.y) || 1),
    (Number(s.z) || 1) * (Number(stretch.z) || 1)
  );
}

function degToRad(v) {
  return v * Math.PI / 180;
}

// CHANGELOG v2:
// • applyNodeToMesh теперь поддерживает transform.rotationQuaternion.
// • Euler rotation сохранён как fallback.
// • transform.scale * node.stretch сохранён.
// • selected projection sync сохранён.