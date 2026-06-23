// ======================================================
// Dain_Coin — entityStageCamera.js v2
// Viewport zoom offset support
// ======================================================

export function updateCamera(state) {
  if (!state.camera) return;

  const effectiveDistance =
    Math.max(0.1, state.distance + (Number(state.viewportZoomOffset) || 0));

  const x =
    state.cameraTarget.x +
    Math.sin(state.yaw) * Math.cos(state.pitch) * effectiveDistance;

  const y =
    state.cameraTarget.y +
    Math.sin(state.pitch) * effectiveDistance +
    1.5;

  const z =
    state.cameraTarget.z +
    Math.cos(state.yaw) * Math.cos(state.pitch) * effectiveDistance;

  state.camera.position.set(x, y, z);
  state.camera.lookAt(
    state.cameraTarget.x,
    state.cameraTarget.y,
    state.cameraTarget.z
  );

  emitCameraChanged(state);
}

export function emitCameraChanged(state) {
  state.bus?.emit("entityStage3D:cameraChanged", {
    yaw: state.yaw,
    pitch: state.pitch,
    distance: state.distance,
    viewportZoomOffset: Number(state.viewportZoomOffset) || 0,
    effectiveDistance: state.distance + (Number(state.viewportZoomOffset) || 0),
    target: { ...state.cameraTarget }
  });
}

export function clampPitchParams(state) {
  let minPitch = Number(state.params.minPitch);
  let maxPitch = Number(state.params.maxPitch);

  if (!Number.isFinite(minPitch)) minPitch = -0.95;
  if (!Number.isFinite(maxPitch)) maxPitch = 0.75;

  minPitch = clamp(minPitch, -1.2, 0.2);
  maxPitch = clamp(maxPitch, -0.2, 1.2);

  if (minPitch >= maxPitch) {
    minPitch = Math.min(maxPitch - 0.05, 0.15);
  }

  state.params.minPitch = minPitch;
  state.params.maxPitch = maxPitch;
}

export function clampZoomParams(state) {
  let minZoom = Number(state.params.minZoom);
  let maxZoom = Number(state.params.maxZoom);

  if (!Number.isFinite(minZoom)) minZoom = 3;
  if (!Number.isFinite(maxZoom)) maxZoom = 14;

  minZoom = clamp(minZoom, 1.5, 8);
  maxZoom = clamp(maxZoom, 6, 24);

  if (minZoom >= maxZoom) {
    minZoom = Math.max(1.5, maxZoom - 0.5);
  }

  state.params.minZoom = minZoom;
  state.params.maxZoom = maxZoom;
}

export function getPixelRatio(state) {
  const dpr = window.devicePixelRatio || 1;
  const quality = normalizeSceneQuality(state.params.quality);

  if (quality === 0) return Math.min(dpr, 1);
  if (quality === 2) return Math.min(dpr, 2);

  return Math.min(dpr, 1.5);
}

export function normalizeSceneQuality(value) {
  if (value === "low") return 0;
  if (value === "medium") return 1;
  if (value === "high") return 2;

  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 1;

  return clamp(n, 0, 2);
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// CHANGELOG v2:
// • updateCamera теперь учитывает state.viewportZoomOffset.
// • Реальный state.distance не меняется.
// • Добавлен effectiveDistance в cameraChanged event.
// • Сохранены clampPitchParams / clampZoomParams / getPixelRatio.