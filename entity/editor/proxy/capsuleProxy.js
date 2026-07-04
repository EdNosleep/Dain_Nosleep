// ======================================================
// NOSLEEP_ENGINE — capsuleProxy.js v2
// Capsule editor proxy + shared dimensions
// ======================================================

import { getPrimitiveDimensions } from "../../data/primitiveDimensions.js";

export function createCapsuleProxy({ THREE, quality = 12 }) {
  const dim = getPrimitiveDimensions("capsule");
  const points = [];
  const q = clampQuality(quality);

  const r = dim.radius;
  const halfCylinder = dim.cylinderHeight * 0.5;
  const topY = halfCylinder;
  const bottomY = -halfCylinder;

  addCircle(points, q, r, topY);
  addCircle(points, q, r, bottomY);

  addVertical(points, r, 0, bottomY, topY);
  addVertical(points, -r, 0, bottomY, topY);
  addVertical(points, 0, r, bottomY, topY);
  addVertical(points, 0, -r, bottomY, topY);

  addArc(points, q, "xy", topY, r, 1);
  addArc(points, q, "xy", bottomY, r, -1);
  addArc(points, q, "zy", topY, r, 1);
  addArc(points, q, "zy", bottomY, r, -1);

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

function addArc(points, segments, plane, centerY, r, sign) {
  const half = Math.max(4, Math.floor(segments / 2));

  for (let i = 0; i < half; i++) {
    const a0 = (i / half) * Math.PI;
    const a1 = ((i + 1) / half) * Math.PI;

    const y0 = centerY + Math.sin(a0) * r * sign;
    const y1 = centerY + Math.sin(a1) * r * sign;
    const p0 = Math.cos(a0) * r;
    const p1 = Math.cos(a1) * r;

    if (plane === "xy") {
      points.push(p0, y0, 0);
      points.push(p1, y1, 0);
    } else {
      points.push(0, y0, p0);
      points.push(0, y1, p1);
    }
  }
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
// • Capsule proxy теперь использует primitiveDimensions.js.
// • Размер proxy совпадает с render geometry.
// • Высота capsule приведена к totalHeight 1.
// • Радиус proxy уменьшен до 0.25 по общему контракту.