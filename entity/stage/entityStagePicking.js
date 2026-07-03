// ======================================================
// NOSLEEP_ENGINE — entityStagePicking.js v2
// Canvas-rect safe picking helper for Entity Stage 3D
// ======================================================
//
// CHANGELOG v1:
// • Вынесен pickMesh
// • Вынесен screenToWorldGround
// • Вынесен camera-facing drag plane
// • Вынесено moveSelectedByPointerPlane
//
// CHANGELOG v2:
// • Все pointer → NDC расчёты переведены на canvas.getBoundingClientRect().
// • Исправлен miss-picking при смещённом viewport / lifted stage / mobile browser UI.
// • pickMesh теперь корректнее работает при высоком pitch камеры.
// • screenToWorldGround и drag plane используют тот же canvas-safe расчёт.
// ======================================================

import * as THREE from "../../libs/three.module.js";

export function pickMesh(state, clientX, clientY) {
  if (!state.raycaster || !state.camera) return null;

  const pointer = getCanvasPointer(state, clientX, clientY);
  if (!pointer) return null;

  state.raycaster.setFromCamera(pointer, state.camera);

  const objects = [...state.meshes.values()].filter(mesh => {
    if (!mesh) return false;
    if (mesh.visible === false) return false;
    if (mesh.userData?.isPreview) return false;
    if (mesh.userData?.ignorePicking) return false;
    return true;
  });

  const hits = state.raycaster.intersectObjects(objects, false);
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
  const pointer = getCanvasPointer(state, clientX, clientY);
  if (!pointer || !state.camera) {
    return { x: 0, y: 0, z: 0 };
  }

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
  if (!state.raycaster || !state.camera || !plane) return null;

  const pointer = getCanvasPointer(state, clientX, clientY);
  if (!pointer) return null;

  state.raycaster.setFromCamera(pointer, state.camera);

  const point = new THREE.Vector3();
  const hit = state.raycaster.ray.intersectPlane(plane, point);

  return hit ? point : null;
}

function getCanvasPointer(state, clientX, clientY) {
  const canvas = state.renderer?.domElement;
  const rect = canvas?.getBoundingClientRect?.();

  if (!rect || rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1
  );
}