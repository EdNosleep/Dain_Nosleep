// ======================================================
// NOSLEEP_ENGINE — entityStageGeometry.js v3
// Shared primitive geometry factory + dimensions config
// ======================================================

import * as THREE from "../../libs/three.module.js";
import {
  getPrimitiveDimensions,
  normalizePrimitiveId
} from "../data/primitiveDimensions.js";

export function createGeometry(state, primitiveId) {
  const id = normalizePrimitiveId(primitiveId);
  const dim = getPrimitiveDimensions(id);
  const seg = getGeometrySegments(state);

  if (id === "sphere") {
    return new THREE.SphereGeometry(
      dim.radius,
      seg.sphereWidth,
      seg.sphereHeight
    );
  }

  if (id === "cube") {
    return new THREE.BoxGeometry(
      dim.size,
      dim.size,
      dim.size
    );
  }

  if (id === "cone") {
    return new THREE.ConeGeometry(
      dim.radius,
      dim.height,
      seg.coneRadial
    );
  }

  if (id === "cylinder") {
    return new THREE.CylinderGeometry(
      dim.radius,
      dim.radius,
      dim.height,
      seg.cylinderRadial
    );
  }

  if (id === "capsule") {
    return new THREE.CapsuleGeometry(
      dim.radius,
      dim.cylinderHeight,
      seg.capsuleCap,
      seg.capsuleRadial
    );
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

// CHANGELOG v3:
// • Размеры примитивов вынесены в primitiveDimensions.js.
// • Capsule исправлена: radius 0.25 + cylinderHeight 0.5 = totalHeight 1.
// • Удалён локальный normalizePrimitiveId.
// • Все примитивы теперь используют общий размерный контракт.