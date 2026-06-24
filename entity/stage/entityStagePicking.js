// ======================================================
// Dain_Coin — entityStagePicking.js v1
// Private picking helper for Entity Stage 3D
// ======================================================
//
// CHANGELOG v1:
// • Вынесен pickMesh
// • Вынесен screenToWorldGround
// • Вынесен camera-facing drag plane
// • Вынесено moveSelectedByPointerPlane
// ======================================================

import * as THREE from "../../libs/three.module.js";

export function pickMesh(state, clientX, clientY) {
  if (!state.raycaster || !state.pointer || !state.camera) return null;

  state.pointer.x = (clientX / window.innerWidth) * 2 - 1;
  state.pointer.y = -(clientY / window.innerHeight) * 2 + 1;

  state.raycaster.setFromCamera(state.pointer, state.camera);

  const hits = state.raycaster.intersectObjects([...state.meshes.values()], false);
  return hits[0]?.object || null;
}

export function beginObjectMoveDrag(state, mesh, clientX, clientY) {
  if (!mesh || !state.camera) return;

  const cameraDirection = new THREE.Vector3();
  state.camera.getWorldDirection(cameraDirection);

  state.dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
    cameraDirection,
    mesh.position
  );

  const hitPoint = intersectPointerPlane(state, clientX, clientY, state.dragPlane);

  if (!hitPoint) {
    state.dragOffset = new THREE.Vector3(0, 0, 0);
    state.dragPoint = mesh.position.clone();
    return;
  }

  state.dragOffset = mesh.position.clone().sub(hitPoint);
  state.dragPoint = hitPoint.clone();
}

export function moveSelectedByPointerPlane(state, mesh, clientX, clientY) {
  if (!state.dragPlane) return;

  const hitPoint = intersectPointerPlane(state, clientX, clientY, state.dragPlane);
  if (!hitPoint) return;

  const offset = state.dragOffset || new THREE.Vector3(0, 0, 0);
  const next = hitPoint.clone().add(offset);

  mesh.position.copy(next);

  state.bus?.emit("entityEditor:transformNode", {
    nodeId: mesh.userData.nodeId,
    transform: {
      position: {
        x: mesh.position.x,
        y: mesh.position.y,
        z: mesh.position.z
      }
    }
  });
}

export function screenToWorldGround(state, clientX, clientY) {
  const pointer = new THREE.Vector2(
    (clientX / window.innerWidth) * 2 - 1,
    -(clientY / window.innerHeight) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pointer, state.camera);

  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1);
  const point = new THREE.Vector3();

  raycaster.ray.intersectPlane(plane, point);

  return {
    x: point.x || 0,
    y: point.y || 0,
    z: point.z || 0
  };
}

function intersectPointerPlane(state, clientX, clientY, plane) {
  if (!state.raycaster || !state.pointer || !state.camera || !plane) return null;

  state.pointer.x = (clientX / window.innerWidth) * 2 - 1;
  state.pointer.y = -(clientY / window.innerHeight) * 2 + 1;

  state.raycaster.setFromCamera(state.pointer, state.camera);

  const point = new THREE.Vector3();

  const hit = state.raycaster.ray.intersectPlane(plane, point);
  return hit ? point : null;
}

