// ======================================================
// NOSLEEP_ENGINE — entityStageGeometry.js v2
// Shared primitive geometry factory for Entity Stage
// ======================================================
//
// CHANGELOG v2:
// • Исправлен cube → BoxGeometry без fallback-зависимости.
// • Добавлена normalizePrimitiveId() для cube/box.
// • Геометрии теперь устойчиво принимают и id, и geometry alias.
// ======================================================

import * as THREE from "../../libs/three.module.js";

export function createGeometry(state, primitiveId) {
  const id = normalizePrimitiveId(primitiveId);
  const seg = getGeometrySegments(state);

  if (id === "sphere") {
    return new THREE.SphereGeometry(0.5, seg.sphereWidth, seg.sphereHeight);
  }

  if (id === "cube") {
    return new THREE.BoxGeometry(1, 1, 1);
  }

  if (id === "cone") {
    return new THREE.ConeGeometry(0.5, 1, seg.coneRadial);
  }

  if (id === "cylinder") {
    return new THREE.CylinderGeometry(0.5, 0.5, 1, seg.cylinderRadial);
  }

  if (id === "capsule") {
    return new THREE.CapsuleGeometry(0.35, 0.7, seg.capsuleCap, seg.capsuleRadial);
  }

  return new THREE.BoxGeometry(1, 1, 1);
}

function normalizePrimitiveId(value) {
  const id = String(value || "").trim().toLowerCase();

  if (id === "box") return "cube";
  if (id === "cube") return "cube";
  if (id === "sphere") return "sphere";
  if (id === "cone") return "cone";
  if (id === "cylinder") return "cylinder";
  if (id === "capsule") return "capsule";

  return "cube";
}

function getGeometrySegments(state) {
  const q = clamp(Number(state.params.geometryQuality) || 45, 0, 100);
  const t = q / 100;

  return {
    sphereWidth: Math.round(6 + t * 42),
    sphereHeight: Math.round(4 + t * 28),
    coneRadial: Math.round(5 + t * 43),
    cylinderRadial: Math.round(5 + t * 43),
    capsuleCap: Math.round(3 + t * 9),
    capsuleRadial: Math.round(6 + t * 26)
  };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}