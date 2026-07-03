// ======================================================
// NOSLEEP_ENGINE — cubeProxy.js v2
// Cube editor proxy + shared dimensions
// ======================================================

import { getPrimitiveDimensions } from "../../data/primitiveDimensions.js";

export function createCubeProxy({ THREE }) {
  const dim = getPrimitiveDimensions("cube");
  const geometry = new THREE.EdgesGeometry(
    new THREE.BoxGeometry(dim.size, dim.size, dim.size),
    18
  );

  return new THREE.LineSegments(geometry, createLineMaterial(THREE));
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

// CHANGELOG v2:
// • Cube proxy переведён на primitiveDimensions.js.
// • Размер cube теперь берётся из общего размерного контракта.
// • Визуальное поведение v1 сохранено.