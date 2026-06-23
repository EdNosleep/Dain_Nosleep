// ======================================================
// Dain_Coin — entityStageGeometry.js v1
// Private helper for Entity Stage 3D
// ======================================================
//
// CHANGELOG v1:
// • Вынесена фабрика геометрии из entityStage3D
// • Вынесен расчёт сегментов geometryQuality
// • Three.js используется локально из ../../libs/three.module.js
// ======================================================

import * as THREE from "../../libs/three.module.js";

export function createGeometry(state, primitiveId) {
  const seg = getGeometrySegments(state);

  if (primitiveId === "sphere") {
    return new THREE.SphereGeometry(0.5, seg.sphereWidth, seg.sphereHeight);
  }

  if (primitiveId === "box") {
    return new THREE.BoxGeometry(1, 1, 1);
  }

  if (primitiveId === "cone") {
    return new THREE.ConeGeometry(0.5, 1, seg.coneRadial);
  }

  if (primitiveId === "cylinder") {
    return new THREE.CylinderGeometry(0.5, 0.5, 1, seg.cylinderRadial);
  }

  if (primitiveId === "capsule") {
    return new THREE.CapsuleGeometry(0.35, 0.7, seg.capsuleCap, seg.capsuleRadial);
  }

  return new THREE.BoxGeometry(1, 1, 1);
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

