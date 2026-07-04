// ======================================================
// NOSLEEP_ENGINE — gizmoInput.js v7
// Circular rotation ring gestures + corrected visual direction
// ======================================================

import { collectGizmo3DInteractiveObjects } from "./gizmo3D.js";

export function bindGizmo3DInput({ state, bus }) {
  const input = {
    active: null,
    canvas: null,
    handlers: null
  };

  state.input3D = input;
  attachGizmo3DInput({ state, bus });

  return input;
}

export function attachGizmo3DInput({ state, bus }) {
  const input = state.input3D;
  const runtime = state.runtime;
  const stage = state.stageRuntime;
  const canvas = stage?.canvas;

  if (!input || !runtime?.ready || !canvas || input.canvas === canvas) return;

  detachGizmo3DInput(state);

  const down = e => onPointerDown(e, state, bus);
  const move = e => onPointerMove(e, state, bus);
  const up = e => onPointerUp(e, state, bus);

  canvas.addEventListener("pointerdown", down, { passive: false, capture: true });
  canvas.addEventListener("pointermove", move, { passive: false, capture: true });
  canvas.addEventListener("pointerup", up, { passive: false, capture: true });
  canvas.addEventListener("pointercancel", up, { passive: false, capture: true });

  input.canvas = canvas;
  input.handlers = { down, move, up };
}

export function detachGizmo3DInput(state) {
  const input = state.input3D;
  if (!input?.canvas || !input.handlers) return;

  input.canvas.removeEventListener("pointerdown", input.handlers.down, true);
  input.canvas.removeEventListener("pointermove", input.handlers.move, true);
  input.canvas.removeEventListener("pointerup", input.handlers.up, true);
  input.canvas.removeEventListener("pointercancel", input.handlers.up, true);

  input.canvas = null;
  input.handlers = null;
  input.active = null;
}

export function destroyGizmo3DInput(state) {
  detachGizmo3DInput(state);
  state.input3D = null;
}

function onPointerDown(e, state, bus) {
  const hit = pickGizmo(e, state);
  if (!hit) return;

  e.preventDefault();
  e.stopPropagation();

  const data = hit.object.userData || {};
  const sign = Number(data.sign) || 1;

  state.input3D.active = {
    pointerId: e.pointerId,
    kind: data.kind,
    id: data.id,
    axis: data.axis || null,
    sign,
    action: data.action || null,
    startX: e.clientX,
    startY: e.clientY,
    lastAmount: 0,
    lastFactor: 1,
    stretchContext: createStretchContext(state, data.axis, sign),
    rotationContext: createRotationContext(state, data.axis, e.clientX, e.clientY)
  };

  e.target.setPointerCapture?.(e.pointerId);

  bus.emit("entityGizmo:gestureStart", {
    nodeId: state.selectedNodeId,
    kind: data.kind,
    id: data.id,
    axis: data.axis || null,
    sign,
    action: data.action || null
  });

  if (data.kind === "scale" && data.action === "step") {
    emitScaleStep(state, bus, sign);
  }
}

function onPointerMove(e, state, bus) {
  const g = state.input3D?.active;
  if (!g || g.pointerId !== e.pointerId || !state.selectedNodeId) return;

  e.preventDefault();
  e.stopPropagation();

  const dx = e.clientX - g.startX;
  const dy = e.clientY - g.startY;

  if (g.kind === "stretch") emitStretch(state, bus, g, dx, dy);
  if (g.kind === "rotate") emitRotate(state, bus, g, e.clientX, e.clientY);
  if (g.kind === "scale" && g.action === "drag") emitScaleDrag(state, bus, g, dy);
}

function onPointerUp(e, state, bus) {
  const g = state.input3D?.active;
  if (!g || g.pointerId !== e.pointerId) return;

  e.preventDefault();
  e.stopPropagation();

  bus.emit("entityGizmo:gestureEnd", {
    nodeId: state.selectedNodeId,
    kind: g.kind,
    id: g.id,
    axis: g.axis,
    sign: g.sign,
    action: g.action
  });

  state.input3D.active = null;
}

function pickGizmo(e, state) {
  const stage = state.stageRuntime;
  const runtime = state.runtime;

  if (!stage?.camera || !runtime?.ready) return null;

  const raycaster = stage.raycaster || new stage.THREE.Raycaster();
  const rect = stage.canvas?.getBoundingClientRect?.();

  if (!rect) return null;

  const pointer = {
    x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((e.clientY - rect.top) / rect.height) * 2 + 1
  };

  const objects = collectGizmo3DInteractiveObjects(runtime)
    .filter(isInteractiveHitObject);

  if (!objects.length) return null;

  raycaster.setFromCamera(pointer, stage.camera);

  const hits = raycaster.intersectObjects(objects, true)
    .filter(hit => isInteractiveHitObject(hit.object));

  return hits[0] || null;
}

function isInteractiveHitObject(obj) {
  if (!obj?.userData?.gizmoInteractive) return false;
  if (obj.userData.gizmoInteractiveEnabled !== true) return false;
  if (!isEffectivelyVisible(obj)) return false;
  return true;
}

function isEffectivelyVisible(obj) {
  let current = obj;

  while (current) {
    if (current.visible === false) return false;
    current = current.parent;
  }

  return true;
}

function emitStretch(state, bus, gesture, dx, dy) {
  const amount =
    screenDeltaToLocalAxisDelta(state, gesture, dx, dy) *
    Number(state.params.stretchSensitivity ?? 0.012);

  const deltaAmount = amount - Number(gesture.lastAmount || 0);
  gesture.lastAmount = amount;

  bus.emit("entityEditor:stretchNode", {
    nodeId: state.selectedNodeId,
    axis: gesture.axis,
    sign: gesture.sign,
    amount: deltaAmount
  });
}

function emitRotate(state, bus, gesture, clientX, clientY) {
  const ctx = gesture.rotationContext;
  if (!ctx) return;

  const currentAngle = pointerAngleAroundCenter(ctx.center, clientX, clientY);
  const rawDelta = normalizeAngle(currentAngle - ctx.lastAngle);

  const correctedDelta = rawDelta * ctx.facingSign * -1;

  ctx.accumulated += correctedDelta;
  ctx.lastAngle = currentAngle;

  const sensitivity = Number(state.params.rotationSensitivity ?? 0.28);
  const totalAmount = radToDeg(ctx.accumulated) * sensitivity;
  const deltaAmount = totalAmount - Number(gesture.lastAmount || 0);

  gesture.lastAmount = totalAmount;

  bus.emit("entityEditor:rotateNode", {
    nodeId: state.selectedNodeId,
    axis: gesture.axis,
    rotationAxisWorld: ctx.rotationAxisWorld,
    amount: deltaAmount
  });
}

function emitScaleDrag(state, bus, gesture, dy) {
  const sensitivity = Number(state.params.scaleSensitivity ?? 0.01);
  const totalFactor = Math.max(0.05, 1 + (-dy * sensitivity));
  const prevFactor = Math.max(0.05, Number(gesture.lastFactor || 1));
  const deltaFactor = totalFactor / prevFactor;

  gesture.lastFactor = totalFactor;

  bus.emit("entityEditor:uniformScaleNode", {
    nodeId: state.selectedNodeId,
    factor: deltaFactor
  });
}

function emitScaleStep(state, bus, sign) {
  const factor = sign > 0 ? 1.1 : 0.9;

  bus.emit("entityEditor:uniformScaleNode", {
    nodeId: state.selectedNodeId,
    factor
  });
}

function createStretchContext(state, axis, sign) {
  const stage = state.stageRuntime;
  const root = state.runtime?.root;

  if (!stage?.camera || !root || !axis) return null;

  const THREE = stage.THREE;
  const center = root.getWorldPosition(new THREE.Vector3());
  const axisWorld = getLocalAxisVector(THREE, root, axis, sign);

  const a = center.clone().project(stage.camera);
  const b = center.clone().add(axisWorld).project(stage.camera);

  const dir = {
    x: b.x - a.x,
    y: b.y - a.y
  };

  const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y) || 1;

  return {
    axis,
    sign,
    screenDir: {
      x: dir.x / len,
      y: dir.y / len
    }
  };
}

function createRotationContext(state, axis, clientX, clientY) {
  const stage = state.stageRuntime;
  const root = state.runtime?.root;

  if (!stage?.camera || !stage?.canvas || !root || !axis) return null;

  const THREE = stage.THREE;
  const centerWorld = root.getWorldPosition(new THREE.Vector3());
  const center = worldToScreen(stage, centerWorld);

  if (!center) return null;

  const startAngle = pointerAngleAroundCenter(center, clientX, clientY);
  const rotationAxisWorld = getLocalAxisVector(THREE, root, axis, 1);
  const facingSign = getCameraFacingSign(stage, rotationAxisWorld);

  return {
    center,
    startAngle,
    lastAngle: startAngle,
    accumulated: 0,
    rotationAxisWorld: vectorToPlain(rotationAxisWorld),
    facingSign
  };
}

function getCameraFacingSign(stage, axisWorld) {
  const THREE = stage.THREE;
  const cameraDir = new THREE.Vector3();

  stage.camera.getWorldDirection(cameraDir);

  const dot = axisWorld.dot(cameraDir);

  return dot > 0 ? -1 : 1;
}

function screenDeltaToLocalAxisDelta(state, gesture, dx, dy) {
  const stage = state.stageRuntime;
  const ctx = gesture.stretchContext;

  if (!stage?.canvas || !ctx) return dx;

  const rect = stage.canvas.getBoundingClientRect?.();
  const w = Math.max(1, rect?.width || window.innerWidth || 1);
  const h = Math.max(1, rect?.height || window.innerHeight || 1);

  const ndcDx = (dx / w) * 2;
  const ndcDy = (-dy / h) * 2;

  return (
    ndcDx * ctx.screenDir.x +
    ndcDy * ctx.screenDir.y
  ) * 100;
}

function worldToScreen(stage, world) {
  const rect = stage.canvas?.getBoundingClientRect?.();
  if (!rect || !stage.camera) return null;

  const projected = world.clone().project(stage.camera);

  return {
    x: rect.left + ((projected.x + 1) / 2) * rect.width,
    y: rect.top + ((-projected.y + 1) / 2) * rect.height
  };
}

function pointerAngleAroundCenter(center, clientX, clientY) {
  return Math.atan2(
    clientY - center.y,
    clientX - center.x
  );
}

function getLocalAxisVector(THREE, root, axis, sign) {
  const v = new THREE.Vector3(
    axis === "x" ? sign : 0,
    axis === "y" ? sign : 0,
    axis === "z" ? sign : 0
  );

  v.applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion()));
  return v.normalize();
}

function vectorToPlain(v) {
  return {
    x: Number(v.x) || 0,
    y: Number(v.y) || 0,
    z: Number(v.z) || 0
  };
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function radToDeg(v) {
  return v * 180 / Math.PI;
}

// CHANGELOG v7:
// • Исправлено базовое направление circular rotation gesture.
// • Clockwise/counter-clockwise теперь визуально соответствуют движению пальца.
// • Camera-facing correction v6 сохранён.
// • rotationAxisWorld v5 сохранён.
// • Stretch / Scale / Interaction gating сохранены.