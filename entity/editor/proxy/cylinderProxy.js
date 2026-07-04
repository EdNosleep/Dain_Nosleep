// ======================================================
// NOSLEEP_ENGINE — cylinderProxy.js v2
// Cylinder editor proxy + shared dimensions
// ======================================================

import { getPrimitiveDimensions } from "../../data/primitiveDimensions.js";

export function createCylinderProxy({ THREE, quality = 12 }) {
  const dim = getPrimitiveDimensions("cylinder");
  const points = [];
  const q = clampQuality(quality);

  const r = dim.radius;
  const halfH = dim.height * 0.5;

  addCircle(points, q, r, halfH);
  addCircle(points, q, r, -halfH);

  addVertical(points, r, 0, -halfH, halfH);
  addVertical(points, -r, 0, -halfH, halfH);
  addVertical(points, 0, r, -halfH, halfH);
  addVertical(points, 0, -r, -halfH, halfH);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));

  return new THREE.LineSegments(geometry, createLineMaterial(THREE));
}

function addCircle(points, segments, r, y) {
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;

    points.push(Math.cos(a0) * r, y, Math.sin(a0) * r);
    points.push(Math.cos(a1) * r, y, Math.sin(a1) * r);
  }
}

function addVertical(points, x, z, bottomY, topY) {
  points.push(x, bottomY, z);
  points.push(x, topY, z);
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
// • Cylinder proxy переведён на primitiveDimensions.js.
// • Радиус и высота теперь берутся из общего размерного контракта.
// • Каркас: 2 окружности + 4 вертикальные образующие сохранён.