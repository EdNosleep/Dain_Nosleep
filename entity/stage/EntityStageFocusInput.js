// ======================================================
// NOSLEEP_ENGINE — entityStageFocusInput.js v2
// Focus input gate: tap exits, swipe rotates camera
// ======================================================

const KEY = "__entityStage3DModule";

export function bindStageFocusInput(state, bus) {
  state.focusInput = {
    canvas: null,
    handlers: null,
    pointer: null,
    phase: "idle",
    nodeId: null
  };

  bus.on("entityFocus:phaseChanged", payload => {
    state.focusInput.phase = payload?.phase || "idle";
    state.focusInput.nodeId = payload?.nodeId || null;
  }, { moduleKey: KEY });

  attachFocusInput(state, bus);
}

export function attachFocusInput(state, bus) {
  const canvas = state.renderer?.domElement || null;
  const input = state.focusInput;

  if (!canvas || !input || input.canvas === canvas) return;

  destroyStageFocusInput(state);

  state.focusInput = input;
  input.canvas = canvas;

  const down = e => onPointerDown(e, state);
  const move = e => onPointerMove(e, state);
  const up = e => onPointerUp(e, state, bus);
  const cancel = () => {
    input.pointer = null;
  };

  canvas.addEventListener("pointerdown", down, { passive: false, capture: true });
  canvas.addEventListener("pointermove", move, { passive: false, capture: true });
  canvas.addEventListener("pointerup", up, { passive: false, capture: true });
  canvas.addEventListener("pointercancel", cancel, { passive: false, capture: true });

  input.handlers = { down, move, up, cancel };
}

export function destroyStageFocusInput(state) {
  const input = state.focusInput;
  if (!input?.canvas || !input.handlers) return;

  input.canvas.removeEventListener("pointerdown", input.handlers.down, true);
  input.canvas.removeEventListener("pointermove", input.handlers.move, true);
  input.canvas.removeEventListener("pointerup", input.handlers.up, true);
  input.canvas.removeEventListener("pointercancel", input.handlers.cancel, true);

  input.canvas = null;
  input.handlers = null;
  input.pointer = null;
}

function onPointerDown(e, state) {
  if (!state.focusInput) return;

  state.focusInput.pointer = {
    id: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    lastX: e.clientX,
    lastY: e.clientY,
    maxMoved: 0,
    time: performance.now()
  };
}

function onPointerMove(e, state) {
  const input = state.focusInput;
  const p = input?.pointer;

  if (!p || p.id !== e.pointerId) return;

  const dx = e.clientX - p.x;
  const dy = e.clientY - p.y;

  p.lastX = e.clientX;
  p.lastY = e.clientY;
  p.maxMoved = Math.max(p.maxMoved, Math.sqrt(dx * dx + dy * dy));
}

function onPointerUp(e, state, bus) {
  const input = state.focusInput;
  const start = input?.pointer;

  if (!input || !start || start.id !== e.pointerId) return;

  input.pointer = null;

  const dx = e.clientX - start.x;
  const dy = e.clientY - start.y;
  const moved = Math.max(start.maxMoved, Math.sqrt(dx * dx + dy * dy));
  const duration = performance.now() - start.time;

  const isTap = moved <= 8 && duration <= 320;
  if (!isTap) return;

  const hit = pickTopObject(e, state);
  if (isGizmoHit(hit)) return;

  const inFocus =
    input.phase === "entering" ||
    input.phase === "focused";

  if (inFocus) {
    e.preventDefault();
    e.stopPropagation();

    bus.emit("entityFocus:requestExit", {
      reason: "tapOutsideGizmo"
    });

    return;
  }

  const selectedNodeId = state.selectedNodeId;
  if (!selectedNodeId) return;

  const selectedMesh = state.meshes.get(selectedNodeId);
  if (!selectedMesh) return;

  if (!belongsToMesh(hit?.object, selectedMesh)) return;

  e.preventDefault();
  e.stopPropagation();

  bus.emit("entityFocus:requestEnter", {
    nodeId: selectedNodeId,
    camera: {
      yaw: state.yaw,
      pitch: state.pitch,
      distance: state.distance,
      cameraTarget: { ...state.cameraTarget }
    }
  });
}

function pickTopObject(e, state) {
  if (!state.camera || !state.scene || !state.THREE) return null;

  const canvas = state.renderer?.domElement;
  const rect = canvas?.getBoundingClientRect?.();
  if (!rect) return null;

  const pointer = {
    x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((e.clientY - rect.top) / rect.height) * 2 + 1
  };

  const raycaster = state.raycaster || new state.THREE.Raycaster();
  raycaster.setFromCamera(pointer, state.camera);

  const objects = [];

  state.scene.traverse(obj => {
    if (!obj?.isMesh) return;
    if (obj.userData?.isPreview) return;
    objects.push(obj);
  });

  const hits = raycaster.intersectObjects(objects, true);
  return hits[0] || null;
}

function isGizmoHit(hit) {
  let obj = hit?.object || null;

  while (obj) {
    if (obj.userData?.gizmoInteractive || obj.userData?.gizmoRoot) return true;
    obj = obj.parent;
  }

  return false;
}

function belongsToMesh(object, mesh) {
  let current = object;

  while (current) {
    if (current === mesh) return true;
    current = current.parent;
  }

  return false;
}

// CHANGELOG v2:
// • Выход из Focus теперь только по настоящему tap, не по swipe.
// • Добавлен pointermove и maxMoved tracking.
// • Свайпы в свободной зоне проходят дальше в Stage camera input.
// • Во Focus камера продолжает вращаться вокруг cameraTarget выбранного объекта.
// • Tap по Gizmo не закрывает Focus.
// • Второй tap по выбранному объекту для входа во Focus сохранён.