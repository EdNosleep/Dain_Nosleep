// ======================================================
// NOSLEEP_ENGINE — entityStageMaterials.js v2
// Private helper for Entity Stage 3D
// ======================================================
//
// CHANGELOG v2:
// • Цвет mesh остаётся управляемым через Inspector.
// • Добавлен безопасный normalizeColor для stage colors.
// • Сохранена логика selected/unselected.
// • Материалы остались единым stage authority для отображения mesh.
// ======================================================

import * as THREE from "../../libs/three.module.js";

export function createStageMesh(state, node, geometry) {
  const material = new THREE.MeshStandardMaterial({
    color: normalizeColor(state.params.meshColor, "#b9b2ff"),
    roughness: 0.55,
    metalness: 0.15
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.nodeId = node.id;

  return mesh;
}

export function applySelection(state, mesh, selected) {
  if (!mesh.material) return;

  const baseColor = normalizeColor(state.params.meshColor, "#b9b2ff");
  const selectedColor = normalizeColor(state.params.selectedMeshColor, "#ffd36a");
  const emissiveColor = normalizeColor(state.params.selectedEmissiveColor, "#332000");

  mesh.material.color.set(selected ? selectedColor : baseColor);
  mesh.material.emissive.set(selected ? emissiveColor : "#000000");
}

export function refreshMeshColors(state) {
  for (const mesh of state.meshes.values()) {
    applySelection(state, mesh, mesh.userData.nodeId === state.selectedNodeId);
  }
}

export function disposeMesh(mesh) {
  try { mesh.geometry?.dispose?.(); } catch (_) {}
  try { mesh.material?.dispose?.(); } catch (_) {}
}

function normalizeColor(value, fallback) {
  const color = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  if (/^#[0-9a-fA-F]{3}$/.test(color)) return color;
  return fallback;
}