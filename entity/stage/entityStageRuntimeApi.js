// ======================================================
// NOSLEEP_ENGINE — entityStageRuntimeApi.js v1
// Stage Runtime Context API
// ======================================================

const KEY = "__entityStage3DModule";

export function bindStageRuntimeApi(state, bus) {
  bus.on("entityStage3D:requestRuntime", payload => {
    emitStageRuntime(state, payload?.requestId || null);
  }, { moduleKey: KEY });
}

export function emitStageReady(state) {
  state.bus?.emit("entityStage3D:ready", {
    key: KEY,
    projectionApi: true,
    runtimeApi: true,
    events: {
      requestRuntime: "entityStage3D:requestRuntime",
      runtime: "entityStage3D:runtime",
      runtimeDisposed: "entityStage3D:runtimeDisposed",
      requestSelectedProjection: "entityStage3D:requestSelectedProjection",
      requestNodeProjection: "entityStage3D:requestNodeProjection",
      requestWorldToScreen: "entityStage3D:requestWorldToScreen",
      selectedProjection: "entityStage3D:selectedProjection",
      nodeProjection: "entityStage3D:nodeProjection",
      worldToScreenResult: "entityStage3D:worldToScreenResult"
    }
  });
}

export function emitStageRuntime(state, requestId = null) {
  if (!state.bus) return;

  state.bus.emit("entityStage3D:runtime", {
    requestId,
    key: KEY,
    ready: !!(state.scene && state.camera && state.renderer),
    THREE: state.THREE,
    scene: state.scene,
    camera: state.camera,
    renderer: state.renderer,
    raycaster: state.raycaster,
    pointer: state.pointer,
    canvas: state.renderer?.domElement || null,
    viewport: getViewportPayload(state)
  });
}

export function emitStageRuntimeDisposed(state) {
  state.bus?.emit("entityStage3D:runtimeDisposed", {
    key: KEY
  });
}

export function getViewportPayload(state) {
  const rect = state.renderer?.domElement?.getBoundingClientRect?.();

  return {
    width: rect?.width || window.innerWidth || 0,
    height: rect?.height || window.innerHeight || 0,
    left: rect?.left || 0,
    top: rect?.top || 0,
    viewportLiftPx: Number(state.viewportLiftPx) || 0,
    viewportZoomOffset: Number(state.viewportZoomOffset) || 0
  };
}

// CHANGELOG v1:
// • Runtime API вынесен из entityStage3D.js.
// • Добавлены bindStageRuntimeApi / emitStageReady / emitStageRuntime.
// • Добавлен emitStageRuntimeDisposed.
// • Stage по-прежнему не импортирует Gizmo.
// • API работает только через EventBus.

