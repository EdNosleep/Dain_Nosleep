// ======================================================
// NOSLEEP_ENGINE — entityStageFocusCamera.js v2
// Focus camera executor + Camera Intent
// ======================================================

import { updateCamera, clamp } from "./entityStageCamera.js";
import { requestFocusCameraIntent } from "./entityStageFocusNavigation.js";

const KEY = "__entityStage3DModule";

export function bindStageFocusCamera(state, bus) {
  state.focusCamera = {
    tween: null,
    previousCamera: null
  };

  bus.on("entityFocus:entered", payload => {
    enterFocusCamera(state, bus, payload);
  }, { moduleKey: KEY });

  bus.on("entityFocus:left", payload => {
    leaveFocusCamera(state, bus, payload);
  }, { moduleKey: KEY });
}

export function destroyStageFocusCamera(state) {
  cancelFocusTween(state);
  state.focusCamera = null;
}

function enterFocusCamera(state, bus, payload = {}) {
  const nodeId = payload.nodeId;
  const nodeMesh = nodeId ? state.meshes.get(nodeId) : null;

  if (!nodeMesh) {
    bus.emit("entityFocus:enterComplete", { nodeId, reason: "missingMesh" });
    return;
  }

  state.focusCamera.previousCamera = {
    yaw: state.yaw,
    pitch: state.pitch,
    distance: state.distance,
    cameraTarget: { ...state.cameraTarget }
  };

  const intent = requestFocusCameraIntent(state, payload);
  const target = intent.target || getMeshWorldPosition(state, nodeMesh);

  const to = buildCameraTargetFromIntent(state, intent, target);

  startCameraTween(state, {
    to,
    duration: Number(payload.focusDurationMs) || 420,
    onDone: () => {
      bus.emit("entityFocus:enterComplete", {
        nodeId,
        intent: intent.intent,
        occluded: !!intent.occluded
      });
    }
  });
}

function leaveFocusCamera(state, bus, payload = {}) {
  const nodeId = payload.nodeId;
  const previous = state.focusCamera?.previousCamera || payload.previousCamera;

  if (!previous) {
    bus.emit("entityFocus:exitComplete", { nodeId, reason: "missingPreviousCamera" });
    return;
  }

  startCameraTween(state, {
    to: previous,
    duration: Number(payload.exitDurationMs) || 360,
    onDone: () => {
      bus.emit("entityFocus:exitComplete", { nodeId });
    }
  });
}

function buildCameraTargetFromIntent(state, intent, target) {
  const pitch = clamp(
    Number(intent.pitch ?? 0.18),
    state.params.minPitch,
    state.params.maxPitch
  );

  const distance = clamp(
    Number(intent.distance ?? 5),
    state.params.minZoom,
    state.params.maxZoom
  );

  let yaw = state.yaw;

  if (intent.type === "orbit") {
    yaw = state.yaw + degToRad(Number(intent.angle || 38) * Number(intent.sign || 1));
  }

  return {
    yaw,
    pitch,
    distance,
    cameraTarget: {
      x: Number(target.x) || 0,
      y: Number(target.y) || 0,
      z: Number(target.z) || 0
    }
  };
}

function startCameraTween(state, { to, duration, onDone }) {
  cancelFocusTween(state);

  const from = {
    yaw: state.yaw,
    pitch: state.pitch,
    distance: state.distance,
    cameraTarget: { ...state.cameraTarget }
  };

  const start = performance.now();
  const safeDuration = Math.max(0, Number(duration) || 0);

  const tween = {
    cancelled: false,
    raf: 0
  };

  state.focusCamera.tween = tween;

  const step = now => {
    if (tween.cancelled) return;

    const t = safeDuration <= 0
      ? 1
      : clamp((now - start) / safeDuration, 0, 1);

    const k = easeInOutCubic(t);

    state.yaw = lerpAngle(from.yaw, to.yaw, k);
    state.pitch = lerp(from.pitch, to.pitch, k);
    state.distance = lerp(from.distance, to.distance, k);

    state.cameraTarget = {
      x: lerp(from.cameraTarget.x, to.cameraTarget.x, k),
      y: lerp(from.cameraTarget.y, to.cameraTarget.y, k),
      z: lerp(from.cameraTarget.z, to.cameraTarget.z, k)
    };

    updateCamera(state);

    if (t < 1) {
      tween.raf = requestAnimationFrame(step);
      return;
    }

    state.focusCamera.tween = null;
    onDone?.();
  };

  tween.raf = requestAnimationFrame(step);
}

function cancelFocusTween(state) {
  const tween = state.focusCamera?.tween;
  if (!tween) return;

  tween.cancelled = true;
  cancelAnimationFrame(tween.raf);
  state.focusCamera.tween = null;
}

function getMeshWorldPosition(state, mesh) {
  const THREE = state.THREE;
  mesh.updateMatrixWorld(true);

  const v = mesh.getWorldPosition(new THREE.Vector3());

  return {
    x: Number(v.x) || 0,
    y: Number(v.y) || 0,
    z: Number(v.z) || 0
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpAngle(a, b, t) {
  const delta = normalizeAngle(b - a);
  return a + delta * t;
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function degToRad(v) {
  return v * Math.PI / 180;
}

// CHANGELOG v2:
// • FocusCamera теперь использует entityStageFocusNavigation.js.
// • Добавлена поддержка Camera Intent: direct / orbit-left / orbit-right.
// • Direct focus сохраняет текущий yaw.
// • Orbit focus мягко меняет yaw на bypass angle.
// • enterComplete сообщает intent и occluded.
// • Возврат камеры в previousCamera сохранён.
// • Controller остаётся Single Authority состояния Focus.

