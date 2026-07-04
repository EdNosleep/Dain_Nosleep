// ======================================================
// NOSLEEP_ENGINE — entityStageProjectionApi.js v1
// Stage Projection API
// ======================================================

const KEY = "__entityStage3DModule";

export function bindStageProjectionApi(state, bus) {
  bus.on("entityStage3D:requestSelectedProjection", payload => {
    emitSelectedProjection(state, payload?.requestId || null);
  }, { moduleKey: KEY });

  bus.on("entityStage3D:requestNodeProjection", payload => {
    emitNodeProjection(state, payload?.nodeId || null, payload?.requestId || null);
  }, { moduleKey: KEY });

  bus.on("entityStage3D:requestWorldToScreen", payload => {
    emitWorldToScreen(state, payload);
  }, { moduleKey: KEY });
}

export function emitSelectedProjection(state, requestId = null) {
  if (!state.bus) return;

  state.bus.emit("entityStage3D:selectedProjection", {
    requestId,
    projection: getNodeProjection(state, state.selectedNodeId)
  });
}

export function emitNodeProjection(state, nodeId, requestId = null) {
  if (!state.bus) return;

  state.bus.emit("entityStage3D:nodeProjection", {
    requestId,
    nodeId,
    projection: getNodeProjection(state, nodeId)
  });
}

export function emitWorldToScreen(state, payload = {}) {
  if (!state.bus) return;

  const point = payload?.world || payload?.point || null;
  const screen = worldToScreen(state, point);

  state.bus.emit("entityStage3D:worldToScreenResult", {
    requestId: payload?.requestId || null,
    world: normalizeWorldPoint(point),
    screen
  });
}

export function getNodeProjection(state, nodeId) {
  if (!state.camera || !state.renderer || !nodeId) return createEmptyProjection(nodeId);

  const mesh = state.meshes.get(nodeId);
  if (!mesh) return createEmptyProjection(nodeId);

  const THREE = state.THREE;
  mesh.updateMatrixWorld(true);

  const centerWorld = mesh.getWorldPosition(new THREE.Vector3());
  const center = vectorToPlain(centerWorld);
  const centerScreen = worldVectorToScreen(state, centerWorld);

  return {
    nodeId,
    visible: !!centerScreen?.visible,
    center,
    centerScreen,
    handles: buildNodeHandleProjection(state, mesh),
    viewport: getViewportPayload(state)
  };
}

function buildNodeHandleProjection(state, mesh) {
  const THREE = state.THREE;

  const points = {
    right: new THREE.Vector3(0.66, 0, 0),
    left: new THREE.Vector3(-0.66, 0, 0),
    top: new THREE.Vector3(0, 0.66, 0),
    bottom: new THREE.Vector3(0, -0.66, 0),
    front: new THREE.Vector3(0, 0, 0.66),
    back: new THREE.Vector3(0, 0, -0.66)
  };

  const result = {};

  for (const [key, local] of Object.entries(points)) {
    const world = mesh.localToWorld(local.clone());
    const screen = worldVectorToScreen(state, world);

    result[key] = {
      id: key,
      world: vectorToPlain(world),
      screen,
      visible: !!screen?.visible
    };
  }

  return result;
}

export function worldToScreen(state, point) {
  if (!state.camera || !point) return { x: 0, y: 0, visible: false };

  const THREE = state.THREE;
  const world = new THREE.Vector3(
    Number(point.x) || 0,
    Number(point.y) || 0,
    Number(point.z) || 0
  );

  return worldVectorToScreen(state, world);
}

function worldVectorToScreen(state, world) {
  if (!state.camera) return { x: 0, y: 0, visible: false };

  const projected = world.clone().project(state.camera);

  const rect = state.renderer?.domElement?.getBoundingClientRect?.() || {
    left: 0,
    top: 0,
    width: window.innerWidth || 1,
    height: window.innerHeight || 1
  };

  const x = rect.left + ((projected.x + 1) / 2) * rect.width;
  const y = rect.top + ((-projected.y + 1) / 2) * rect.height;

  return {
    x,
    y,
    z: projected.z,
    visible:
      projected.z >= -1 &&
      projected.z <= 1 &&
      x >= rect.left - 160 &&
      x <= rect.left + rect.width + 160 &&
      y >= rect.top - 160 &&
      y <= rect.top + rect.height + 160
  };
}

function createEmptyProjection(nodeId = null) {
  return {
    nodeId,
    visible: false,
    center: null,
    centerScreen: { x: 0, y: 0, visible: false },
    handles: {},
    viewport: {
      width: window.innerWidth || 0,
      height: window.innerHeight || 0
    }
  };
}

function getViewportPayload(state) {
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

function vectorToPlain(v) {
  return {
    x: Number(v.x) || 0,
    y: Number(v.y) || 0,
    z: Number(v.z) || 0
  };
}

function normalizeWorldPoint(point) {
  if (!point) return null;

  return {
    x: Number(point.x) || 0,
    y: Number(point.y) || 0,
    z: Number(point.z) || 0
  };
}

// CHANGELOG v1:
// • Projection API вынесен из entityStage3D.js.
// • Сохранены selectedProjection / nodeProjection / worldToScreenResult.
// • Сохранена проекция center + 6 handle-точек.
// • Store и бизнес-логика не используются.
// • API работает только через EventBus.

