// ======================================================
// NOSLEEP_ENGINE — entityStageFocusNavigation.js v1
// Camera Intent resolver for Focus Editing
// ======================================================

export function requestFocusCameraIntent(state, payload = {}) {
  const nodeId = payload.nodeId;
  const targetMesh = nodeId ? state.meshes.get(nodeId) : null;

  if (!targetMesh || !state.camera || !state.THREE) {
    return createDirectIntent(payload);
  }

  if (payload.occlusionCheck === false) {
    return createDirectIntent(payload);
  }

  const target = getMeshWorldPosition(state, targetMesh);
  const blocked = isTargetOccluded(state, targetMesh, target);

  if (!blocked) {
    return {
      ...createDirectIntent(payload),
      target
    };
  }

  const leftScore = scoreOrbitSide(state, targetMesh, target, -1, payload);
  const rightScore = scoreOrbitSide(state, targetMesh, target, 1, payload);

  const side = rightScore >= leftScore ? "right" : "left";
  const sign = side === "right" ? 1 : -1;

  return {
    intent: `orbit-${side}`,
    type: "orbit",
    side,
    sign,
    angle: Number(payload.bypassAngle) || 38,
    target,
    distance: Number(payload.focusDistance) || 5,
    pitch: Number(payload.focusPitch) || 0.18,
    occluded: true,
    score: Math.max(leftScore, rightScore)
  };
}

function createDirectIntent(payload = {}) {
  return {
    intent: "direct",
    type: "direct",
    target: null,
    distance: Number(payload.focusDistance) || 5,
    pitch: Number(payload.focusPitch) || 0.18,
    occluded: false
  };
}

function isTargetOccluded(state, targetMesh, target) {
  const THREE = state.THREE;
  const raycaster = state.raycaster || new THREE.Raycaster();

  const cameraPos = state.camera.getWorldPosition(new THREE.Vector3());
  const targetPos = new THREE.Vector3(target.x, target.y, target.z);

  const direction = targetPos.clone().sub(cameraPos);
  const distance = direction.length();

  if (distance <= 0.001) return false;

  direction.normalize();

  raycaster.set(cameraPos, direction);
  raycaster.far = distance;

  const objects = collectSceneMeshes(state, targetMesh);
  const hits = raycaster.intersectObjects(objects, true);

  if (!hits.length) return false;

  const first = hits[0]?.object;
  return !belongsToMesh(first, targetMesh);
}

function scoreOrbitSide(state, targetMesh, target, sign, payload = {}) {
  const THREE = state.THREE;

  const angle = degToRad(Number(payload.bypassAngle) || 38) * sign;
  const targetPos = new THREE.Vector3(target.x, target.y, target.z);
  const cameraPos = state.camera.getWorldPosition(new THREE.Vector3());

  const offset = cameraPos.clone().sub(targetPos);
  offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);

  const testCameraPos = targetPos.clone().add(offset);
  const direction = targetPos.clone().sub(testCameraPos);
  const distance = direction.length();

  if (distance <= 0.001) return 0;

  direction.normalize();

  const raycaster = state.raycaster || new THREE.Raycaster();
  raycaster.set(testCameraPos, direction);
  raycaster.far = distance;

  const objects = collectSceneMeshes(state, targetMesh);
  const hits = raycaster.intersectObjects(objects, true);

  if (!hits.length) return 100;

  const first = hits[0]?.object;
  if (belongsToMesh(first, targetMesh)) return 100;

  return Math.max(0, 100 - hits.length * 25);
}

function collectSceneMeshes(state, targetMesh) {
  const result = [];

  for (const mesh of state.meshes.values()) {
    if (!mesh) continue;
    if (mesh.userData?.isPreview) continue;
    result.push(mesh);
  }

  if (targetMesh && !result.includes(targetMesh)) {
    result.push(targetMesh);
  }

  return result;
}

function belongsToMesh(object, mesh) {
  let current = object;

  while (current) {
    if (current === mesh) return true;
    current = current.parent;
  }

  return false;
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

function degToRad(v) {
  return v * Math.PI / 180;
}

// CHANGELOG v1:
// • Добавлен Camera Intent resolver для Focus Editing.
// • Поддержаны intent: direct / orbit-left / orbit-right.
// • Добавлена проверка occlusion через Raycaster.
// • Orbit выбирает более свободную сторону обхода.
// • Модуль не двигает камеру и не меняет Store.
// • FocusCamera сможет исполнять intent без знания деталей occlusion.