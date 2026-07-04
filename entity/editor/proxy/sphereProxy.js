// ======================================================
// NOSLEEP_ENGINE — sphereProxy.js v2
// Sphere editor proxy + shared dimensions
// ======================================================

import { getPrimitiveDimensions } from "../../data/primitiveDimensions.js";

export function createSphereProxy({ THREE, quality = 12 }) {
  const dim = getPrimitiveDimensions("sphere");
  const points = [];
  const q = clampQuality(quality);
  const r = dim.radius;

  addCircle(points, q, "xy", r);
  addCircle(points, q, "xz", r);
  addCircle(points, q, "yz", r);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));

  return new THREE.LineSegments(geometry, createLineMaterial(THREE));
}

function addCircle(points, segments, plane, r) {
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;

    pushPlanePoint(points, plane, Math.cos(a0) * r, Math.sin(a0) * r);
    pushPlanePoint(points, plane, Math.cos(a1) * r, Math.sin(a1) * r);
  }
}

function pushPlanePoint(points, plane, a, b) {
  if (plane === "xy") points.push(a, b, 0);
  else if (plane === "xz") points.push(a, 0, b);
  else points.push(0, a, b);
}

function createLineMaterial(THREE) {
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: false,
    depthTest: true,
    depthWrite: false
  });

  material.depthFunc = THREE.GreaterDepth;
  return material;
}

function clampQuality(v) {
  return Math.max(8, Math.min(32, Math.round(Number(v) || 12)));
}

// CHANGELOG v2:
// • Sphere proxy переведён на primitiveDimensions.js.
// • Радиус теперь берётся из общего размерного контракта.
// • Редакторский каркас из 3 окружностей сохранён.