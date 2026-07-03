// ======================================================
// NOSLEEP_ENGINE — entityStageInput.js v1
// Private input helper for Entity Stage 3D
// ======================================================
//
// CHANGELOG v1:
// • Вынесены pointerdown / pointermove / pointerup
// • Вынесены pinch zoom helpers
// • Вынесен resetPointerState
// • Вынесен transformSelectedByPointer
// • Input-layer остаётся приватной частью entityStage3D
// ======================================================

import {
  updateCamera,
  clampZoomParams,
  clamp
} from "./entityStageCamera.js";

import {
  pickMesh,
  beginObjectMoveDrag,
  moveSelectedByPointerPlane
} from "./entityStagePicking.js";

export function bindStageInput(state) {
  if (!state.renderer?.domElement) return;

  const canvas = state.renderer.domElement;

  state.inputHandlers = {
    pointerdown: e => onPointerDown(e, state),
    pointermove: e => onPointerMove(e, state),
    pointerup: e => onPointerUp(e, state),
    pointercancel: e => onPointerUp(e, state),
    pointerleave: e => onPointerUp(e, state),
    wheel: e => onWheel(e, state)
  };

  canvas.addEventListener("pointerdown", state.inputHandlers.pointerdown, { passive: false });
  canvas.addEventListener("pointermove", state.inputHandlers.pointermove, { passive: false });
  canvas.addEventListener("pointerup", state.inputHandlers.pointerup, { passive: false });
  canvas.addEventListener("pointercancel", state.inputHandlers.pointercancel, { passive: false });
  canvas.addEventListener("pointerleave", state.inputHandlers.pointerleave, { passive: false });
  canvas.addEventListener("wheel", state.inputHandlers.wheel, { passive: false });
}

export function unbindStageInput(state) {
  const canvas = state.renderer?.domElement;
  const h = state.inputHandlers;

  if (canvas && h) {
    canvas.removeEventListener("pointerdown", h.pointerdown);
    canvas.removeEventListener("pointermove", h.pointermove);
    canvas.removeEventListener("pointerup", h.pointerup);
    canvas.removeEventListener("pointercancel", h.pointercancel);
    canvas.removeEventListener("pointerleave", h.pointerleave);
    canvas.removeEventListener("wheel", h.wheel);
  }

  state.inputHandlers = null;
}

export function resetPointerState(state) {
  state.pointerDown = false;
  state.draggingCamera = false;
  state.draggingObject = false;
  state.pinching = false;
  state.activePointers.clear();
  state.dragPlane = null;
  state.dragOffset = null;
  state.dragPoint = null;
}

function onPointerDown(e, state) {
  if (!state.camera || !state.renderer) return;

  e.preventDefault();

  state.activePointers.set(e.pointerId, {
    x: e.clientX,
    y: e.clientY
  });

  if (state.activePointers.size >= 2) {
    startPinch(state);
    return;
  }

  state.pointerDown = true;
  state.lastX = e.clientX;
  state.lastY = e.clientY;

  const hit = pickMesh(state, e.clientX, e.clientY);

  if (hit) {
    const nodeId = hit.userData.nodeId;

    state.bus?.emit("entityEditor:selectNode", { nodeId });

    if (state.transformMode === "move") {
      beginObjectMoveDrag(state, hit, e.clientX, e.clientY);
      state.draggingObject = true;
      state.draggingCamera = false;
      return;
    }

    state.draggingObject = true;
    state.draggingCamera = false;
    return;
  }

  state.bus?.emit("entityEditor:selectNode", { nodeId: null });

  state.draggingCamera = true;
  state.draggingObject = false;
}

function onPointerMove(e, state) {
  if (!state.camera || !state.pointerDown) return;

  e.preventDefault();

  if (state.activePointers.has(e.pointerId)) {
    state.activePointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY
    });
  }

  if (state.pinching) {
    updatePinch(state);
    return;
  }

  const dx = e.clientX - state.lastX;
  const dy = e.clientY - state.lastY;

  state.lastX = e.clientX;
  state.lastY = e.clientY;

  if (state.draggingObject && state.selectedNodeId) {
    transformSelectedByPointer(state, dx, dy, e.clientX, e.clientY);
    return;
  }

  if (state.draggingCamera) {
    const speed = Number(state.params.cameraSpeed) || 1;

    state.yaw -= dx * 0.006 * speed;
    state.pitch += dy * 0.005 * speed;
    state.pitch = clamp(state.pitch, state.params.minPitch, state.params.maxPitch);

    updateCamera(state);
  }
}

function onPointerUp(e, state) {
  e.preventDefault();

  state.activePointers.delete(e.pointerId);

  if (state.activePointers.size < 2) {
    state.pinching = false;
  }

  if (state.activePointers.size === 0) {
    resetPointerState(state);
  }
}

function onWheel(e, state) {
  e.preventDefault();

  clampZoomParams(state);

  state.distance += e.deltaY * 0.006;
  state.distance = clamp(state.distance, state.params.minZoom, state.params.maxZoom);

  updateCamera(state);
}

function startPinch(state) {
  const points = [...state.activePointers.values()];
  if (points.length < 2) return;

  state.pinching = true;
  state.draggingCamera = false;
  state.draggingObject = false;
  state.dragPlane = null;
  state.dragOffset = null;
  state.dragPoint = null;

  state.pinchStartDistance = distance2D(points[0], points[1]);
  state.pinchStartCameraDistance = state.distance;
}

function updatePinch(state) {
  const points = [...state.activePointers.values()];
  if (points.length < 2 || !state.pinchStartDistance) return;

  const current = distance2D(points[0], points[1]);
  const ratio = state.pinchStartDistance / Math.max(1, current);

  state.distance = state.pinchStartCameraDistance * ratio;
  state.distance = clamp(state.distance, state.params.minZoom, state.params.maxZoom);

  updateCamera(state);
}

function distance2D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function transformSelectedByPointer(state, dx, dy, clientX, clientY) {
  const nodeId = state.selectedNodeId;
  const mesh = state.meshes.get(nodeId);
  if (!mesh) return;

  if (state.transformMode === "move") {
    moveSelectedByPointerPlane(state, mesh, clientX, clientY);
    return;
  }

  if (state.transformMode === "rotate") {
    mesh.rotation.y += dx * 0.01;
    mesh.rotation.x += dy * 0.01;

    emitTransform(state, nodeId, {
      rotation: {
        x: radToDeg(mesh.rotation.x),
        y: radToDeg(mesh.rotation.y),
        z: radToDeg(mesh.rotation.z)
      }
    });

    return;
  }

  if (state.transformMode === "scale") {
    const delta = 1 + dy * -0.004;
    const next = clamp(mesh.scale.x * delta, 0.1, 5);

    mesh.scale.set(next, next, next);

    emitTransform(state, nodeId, {
      scale: {
        x: next,
        y: next,
        z: next
      }
    });
  }
}

function emitTransform(state, nodeId, transform) {
  state.bus?.emit("entityEditor:transformNode", {
    nodeId,
    transform
  });
}

function radToDeg(v) {
  return v * 180 / Math.PI;
}

