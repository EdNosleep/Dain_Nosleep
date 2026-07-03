// ======================================================
// NOSLEEP_ENGINE — entityStage3D.js v23
// Stage Preview Mesh Drag
// ======================================================

import { defineModule } from "../../engine/moduleFactory.js";
import * as THREE from "../../libs/three.module.js";

import {
  updateCamera,
  clampPitchParams,
  clampZoomParams,
  clamp
} from "./entityStageCamera.js";

import {
  createStageDOM,
  applyStageViewportLift
} from "./entityStageDom.js";

import {
  setupThree,
  applyRendererParams,
  loop,
  rebuildRendererEnvironment,
  disposeRendererEnvironment
} from "./entityStageRenderer.js";

import { createGeometry } from "./entityStageGeometry.js";

import {
  createStageMesh,
  applySelection,
  refreshMeshColors,
  disposeMesh
} from "./entityStageMaterials.js";

import { screenToWorldGround } from "./entityStagePicking.js";

import {
  unbindStageInput,
  resetPointerState
} from "./entityStageInput.js";

const KEY = "__entityStage3DModule";

export const registerEntityStage3DModule = defineModule({
  key: KEY,
  name: "Entity Stage 3D",

  inspector: {
    "Прозрачный фон": { param: "transparentBackground", type: "toggle", value: false },
    "Цвет фона": { param: "backgroundColor", type: "color", value: "#ffffff" },

    "Base Grid включена": { param: "baseGridEnabled", type: "toggle", value: true },
    "Base Grid прозрачность": {
      param: "baseGridOpacity",
      type: "range",
      min: 0,
      max: 1,
      step: 0.05,
      value: 0.35
    },

    "Environment включён": { param: "environmentEnabled", type: "toggle", value: true },
    "Mobile Safe": { param: "environmentMobileSafe", type: "toggle", value: false },

    "Цвет змей": { param: "environmentLineColor", type: "color", value: "#000000" },
    "Яркость змей": {
      param: "environmentLineOpacity",
      type: "range",
      min: 0,
      max: 100,
      step: 1,
      value: 42
    },

    "Glow цвет": { param: "environmentGlowColor", type: "color", value: "#000000" },
    "Glow яркость": {
      param: "environmentGlowBrightness",
      type: "range",
      min: 0,
      max: 100,
      step: 1,
      value: 32
    },

    "Количество змей": {
      param: "environmentSnakeCount",
      type: "range",
      min: 1,
      max: 140,
      step: 1,
      value: 90
    },
    "Мин. скорость змей": {
      param: "environmentSnakeMinSpeed",
      type: "range",
      min: 1,
      max: 160,
      step: 1,
      value: 34
    },
    "Макс. скорость змей": {
      param: "environmentSnakeMaxSpeed",
      type: "range",
      min: 1,
      max: 240,
      step: 1,
      value: 96
    },
    "Множитель скорости": {
      param: "environmentSnakeSpeedMul",
      type: "range",
      min: 50,
      max: 400,
      step: 5,
      value: 220
    },

    "Длина сегмента": {
      param: "environmentSnakeSegmentLength",
      type: "range",
      min: 40,
      max: 700,
      step: 10,
      value: 390
    },
    "Длина хвоста": {
      param: "environmentSnakeTrailLength",
      type: "range",
      min: 8,
      max: 140,
      step: 1,
      value: 80
    },
    "Толщина змей": {
      param: "environmentSnakeThickness",
      type: "range",
      min: 0.3,
      max: 8,
      step: 0.1,
      value: 2
    },
    "Сужение хвоста": {
      param: "environmentSnakeTaper",
      type: "range",
      min: 0.4,
      max: 4,
      step: 0.05,
      value: 1.45
    },

    "Мин. время поворота": {
      param: "environmentSnakeTurnMin",
      type: "range",
      min: 0.05,
      max: 4,
      step: 0.05,
      value: 0.35
    },
    "Макс. время поворота": {
      param: "environmentSnakeTurnMax",
      type: "range",
      min: 0.1,
      max: 8,
      step: 0.05,
      value: 1.65
    },
    "Шанс квадрата": {
      param: "environmentSnakeLoopChance",
      type: "range",
      min: 0,
      max: 50,
      step: 1,
      value: 3
    },

    "Глубина параллакса": {
      param: "environmentParallaxDepth",
      type: "range",
      min: 0,
      max: 700,
      step: 5,
      value: 220
    },
    "Плавность параллакса": {
      param: "environmentParallaxSmooth",
      type: "range",
      min: 1,
      max: 100,
      step: 1,
      value: 24
    },
    "Глубина слоя": {
      param: "environmentDepthStrength",
      type: "range",
      min: 0,
      max: 900,
      step: 5,
      value: 220
    },
    "Размер поверхности": {
      param: "environmentSurfaceScale",
      type: "range",
      min: 120,
      max: 420,
      step: 10,
      value: 260
    },

    "Прозрачность Environment": {
      param: "environmentGlobalOpacity",
      type: "range",
      min: 0,
      max: 100,
      step: 1,
      value: 100
    },
    "Pixel Ratio Limit": {
      param: "environmentPixelRatio",
      type: "range",
      min: 1,
      max: 2,
      step: 0.05,
      value: 1.35
    },

    "Качество сцены": { param: "quality", type: "range", min: 0, max: 2, step: 1, value: 2, hidden: true },
    "Качество геометрии": { param: "geometryQuality", type: "range", min: 0, max: 100, step: 1, value: 85, hidden: true },

    "Цвет фигур": { param: "meshColor", type: "color", value: "#b9b2ff", hidden: true },
    "Цвет выделенной фигуры": { param: "selectedMeshColor", type: "color", value: "#ffd36a", hidden: true },
    "Свечение выделенной фигуры": { param: "selectedEmissiveColor", type: "color", value: "#332000", hidden: true },

    "Preview прозрачность": {
      param: "previewOpacity",
      type: "range",
      min: 0.15,
      max: 1,
      step: 0.05,
      value: 0.62,
      hidden: true
    },
    "Preview цвет": {
      param: "previewColor",
      type: "color",
      value: "#ffd36a",
      hidden: true
    },

    "Интенсивность света": { param: "lightIntensity", type: "range", min: 0.3, max: 2, step: 0.05, value: 1.15, hidden: true },
    "Скорость камеры": { param: "cameraSpeed", type: "range", min: 0.2, max: 2, step: 0.1, value: 1, hidden: true },

    "Мин. pitch камеры": { param: "minPitch", type: "range", min: -1.2, max: 0.2, step: 0.05, value: -0.05, hidden: true },
    "Макс. pitch камеры": { param: "maxPitch", type: "range", min: -0.2, max: 1.2, step: 0.05, value: 0.85, hidden: true },
    "Мин. zoom камеры": { param: "minZoom", type: "range", min: 1.5, max: 8, step: 0.1, value: 3, hidden: true },
    "Макс. zoom камеры": { param: "maxZoom", type: "range", min: 6, max: 24, step: 0.5, value: 21, hidden: true },

    "Viewport Lift Factor": { param: "viewportLiftFactor", type: "range", min: 0, max: 1, step: 0.05, value: 0.45, hidden: true },
    "Viewport Zoom Factor": { param: "viewportZoomFactor", type: "range", min: 0, max: 0.02, step: 0.001, value: 0.014, hidden: true },
    "Viewport Overscan Bottom": { param: "viewportOverscanBottom", type: "range", min: 0, max: 400, step: 10, value: 180, hidden: true }
  },

  dependencies: ["__entityEditorLogicModule"],

  createState() {
    return {
      params: {
        quality: 1,
        geometryQuality: 45,
        meshColor: "#b9b2ff",
        selectedMeshColor: "#ffd36a",
        selectedEmissiveColor: "#332000",
        previewOpacity: 0.62,
        previewColor: "#ffd36a",

        transparentBackground: false,
        backgroundColor: "#ffffff",
        lightIntensity: 1.15,
        cameraSpeed: 1,
        minPitch: -0.95,
        maxPitch: 0.75,
        minZoom: 3,
        maxZoom: 14,
        viewportLiftFactor: 0.45,
        viewportZoomFactor: 0.004,
        viewportOverscanBottom: 180,

        baseGridEnabled: true,
        baseGridOpacity: 0.35,

        environmentEnabled: true,
        environmentMobileSafe: true,

        environmentLineColor: "#000000",
        environmentLineOpacity: 42,
        environmentGlowColor: "#000000",
        environmentGlowBrightness: 32,

        environmentSnakeCount: 42,
        environmentSnakeMinSpeed: 34,
        environmentSnakeMaxSpeed: 96,
        environmentSnakeSpeedMul: 220,
        environmentSnakeSegmentLength: 390,
        environmentSnakeTrailLength: 80,
        environmentSnakeThickness: 2,
        environmentSnakeTaper: 1.45,
        environmentSnakeTurnMin: 0.35,
        environmentSnakeTurnMax: 1.65,
        environmentSnakeLoopChance: 3,

        environmentParallaxDepth: 220,
        environmentParallaxSmooth: 24,
        environmentDepthStrength: 220,
        environmentSurfaceScale: 260,
        environmentGlobalOpacity: 100,
        environmentPixelRatio: 1.35
      },

      THREE,
      root: null,
      canvasHost: null,
      scene: null,
      camera: null,
      renderer: null,
      raycaster: null,
      pointer: null,
      environment: null,
      bus: null,
      resizeHandler: null,
      inputHandlers: null,
      meshes: new Map(),
      selectedNodeId: null,
      transformMode: "move",
      lastDraft: null,
      raf: 0,
      running: false,
      viewportLiftPx: 0,
      viewportZoomOffset: 0,
      lastViewportRawBottom: 0,
      lastViewportOverlayMode: true,
      yaw: 0.45,
      pitch: -0.25,
      distance: 26,
      cameraTarget: { x: 0, y: 0, z: 0 },
      pointerDown: false,
      draggingCamera: false,
      draggingObject: false,
      lastX: 0,
      lastY: 0,
      activePointers: new Map(),
      pinching: false,
      pinchStartDistance: 0,
      pinchStartCameraDistance: 7,
      dragPlane: null,
      dragOffset: null,
      dragPoint: null,
      unsubDraft: null,

      previewMesh: null,
      previewPrimitiveId: null,
      previewPosition: null,
      previewInsideStage: false
    };
  },

  onStart({ ctx, state, bus, store }) {
    state.bus = bus;
    state.THREE = THREE;

    createStageDOM(ctx.container, state);
    setupThree(state);
    applyRendererParams(state);
    renderDraft(state, store.get("entityDraft"));

    state.unsubDraft = store.subscribe("entityDraft", draft => {
      renderDraft(state, draft);
    });

    bus.on("ui:viewportInsetsChanged", payload => {
      state.lastViewportRawBottom = Number(payload?.rawBottom) || 0;
      state.lastViewportOverlayMode = !!payload?.overlayMode;
      applyStageViewportLift(state, payload);
      applyViewportZoom(state);
    }, { moduleKey: KEY });

    bus.on("entityEditor:setTool", payload => {
      const mode = payload?.tool || payload?.mode;
      if (!["move", "rotate", "scale"].includes(mode)) return;
      state.transformMode = mode;
    }, { moduleKey: KEY });

    bus.on("ui:assetDragStart", payload => {
      handleAssetPreviewStart(state, payload);
    }, { moduleKey: KEY });

    bus.on("ui:assetDragMove", payload => {
      handleAssetPreviewMove(state, payload);
    }, { moduleKey: KEY });

    bus.on("ui:assetDragEnd", payload => {
      handleAssetDrop(state, bus, payload);
    }, { moduleKey: KEY });

    state.running = true;
    loop(state);
  },

  onDisable({ state }) {
    state.running = false;
    cancelAnimationFrame(state.raf);
    state.raf = 0;

    clearPreviewMesh(state);
    unbindStageInput(state);

    try { state.unsubDraft?.(); } catch (_) {}
    state.unsubDraft = null;

    if (state.resizeHandler) {
      window.removeEventListener("resize", state.resizeHandler);
      state.resizeHandler = null;
    }

    disposeRendererEnvironment(state);

    for (const mesh of state.meshes.values()) {
      disposeMesh(mesh);
    }

    state.meshes.clear();

    try { state.renderer?.dispose?.(); } catch (_) {}
    state.root?.remove();

    state.root = null;
    state.canvasHost = null;
    state.scene = null;
    state.camera = null;
    state.renderer = null;
    state.raycaster = null;
    state.pointer = null;
    state.environment = null;
    state.bus = null;
    state.lastDraft = null;

    resetPointerState(state);
  },

  onParam({ param, value, state }) {
    state.params[param] = value;

    if (param === "geometryQuality") {
      rebuildAllMeshGeometry(state);
      rebuildPreviewGeometry(state);
    }

    if (
      param === "meshColor" ||
      param === "selectedMeshColor" ||
      param === "selectedEmissiveColor"
    ) {
      refreshMeshColors(state);
    }

    if (param === "previewColor" || param === "previewOpacity") {
      refreshPreviewMaterial(state);
    }

    if (param === "minPitch" || param === "maxPitch") {
      clampPitchParams(state);
      state.pitch = clamp(state.pitch, state.params.minPitch, state.params.maxPitch);
      updateCamera(state);
    }

    if (param === "minZoom" || param === "maxZoom") {
      clampZoomParams(state);
      state.distance = clamp(state.distance, state.params.minZoom, state.params.maxZoom);
      updateCamera(state);
    }

    if (param === "viewportLiftFactor") {
      applyStageViewportLift(state, {
        bottom: state.lastViewportOverlayMode ? 0 : state.lastViewportRawBottom,
        rawBottom: state.lastViewportRawBottom,
        overlayMode: state.lastViewportOverlayMode,
        dragging: false
      });
    }

    if (param === "viewportOverscanBottom") {
      applyStageViewportLift(state, {
        bottom: state.lastViewportOverlayMode ? 0 : state.lastViewportRawBottom,
        rawBottom: state.lastViewportRawBottom,
        overlayMode: state.lastViewportOverlayMode,
        dragging: false
      });
    }

    if (param === "viewportZoomFactor") {
      applyViewportZoom(state);
    }

    if (isEnvironmentRebuildParam(param)) {
      rebuildRendererEnvironment(state);
    }

    applyRendererParams(state);
  }
});

function handleAssetPreviewStart(state, payload) {
  if (!state.scene || !state.camera || payload?.kind !== "primitive") return;

  const primitiveId = payload.primitiveId || payload.id;
  if (!primitiveId) return;

  createPreviewMesh(state, primitiveId);
  handleAssetPreviewMove(state, payload);
}

function handleAssetPreviewMove(state, payload) {
  if (!state.previewMesh || !state.root || !state.camera || payload?.kind !== "primitive") return;

  const x = Number(payload.clientX);
  const y = Number(payload.clientY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;

  const inside = isPointInsideStage(state, x, y);
  state.previewInsideStage = inside;

  if (!inside) {
    state.previewMesh.visible = false;
    state.previewPosition = null;
    return;
  }

  const pos = screenToWorldGround(state, x, y);
  state.previewPosition = pos;

  state.previewMesh.position.set(
    Number(pos.x) || 0,
    Number(pos.y) || 0,
    Number(pos.z) || 0
  );

  state.previewMesh.visible = true;
}

function handleAssetDrop(state, bus, payload) {
  if (!state.root || !state.camera || payload?.kind !== "primitive") {
    clearPreviewMesh(state);
    return;
  }

  const primitiveId = payload.primitiveId || payload.id || state.previewPrimitiveId;
  if (!primitiveId) {
    clearPreviewMesh(state);
    return;
  }

  const x = Number(payload.clientX);
  const y = Number(payload.clientY);

  const inside = Number.isFinite(x) && Number.isFinite(y)
    ? isPointInsideStage(state, x, y)
    : state.previewInsideStage;

  if (!inside) {
    bus.emit("ui:assetDropRejected", {
      kind: "primitive",
      primitiveId,
      reason: "outsideStage"
    });

    clearPreviewMesh(state);
    return;
  }

  const pos = state.previewPosition || screenToWorldGround(state, x, y);

  bus.emit("entityEditor:addPrimitive", {
    primitiveId,
    transform: { position: pos }
  });

  bus.emit("ui:assetDropAccepted", {
    kind: "primitive",
    primitiveId,
    position: pos
  });

  clearPreviewMesh(state);
}

function createPreviewMesh(state, primitiveId) {
  clearPreviewMesh(state);

  const geometry = createGeometry(state, primitiveId);
  if (!geometry) return;

  const material = createPreviewMaterial(state);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `preview_${primitiveId}`;
  mesh.visible = false;
  mesh.frustumCulled = false;
  mesh.raycast = () => null;
  mesh.userData.isPreview = true;
  mesh.userData.primitiveId = primitiveId;

  state.scene.add(mesh);

  state.previewMesh = mesh;
  state.previewPrimitiveId = primitiveId;
  state.previewPosition = null;
  state.previewInsideStage = false;
}

function clearPreviewMesh(state) {
  const mesh = state.previewMesh;

  if (mesh && state.scene) {
    try { state.scene.remove(mesh); } catch (_) {}
  }

  if (mesh?.geometry) {
    try { mesh.geometry.dispose(); } catch (_) {}
  }

  if (mesh?.material) {
    disposeMaterial(mesh.material);
  }

  state.previewMesh = null;
  state.previewPrimitiveId = null;
  state.previewPosition = null;
  state.previewInsideStage = false;
}

function rebuildPreviewGeometry(state) {
  if (!state.previewMesh || !state.previewPrimitiveId) return;

  const geometry = createGeometry(state, state.previewPrimitiveId);
  if (!geometry) return;

  try { state.previewMesh.geometry?.dispose?.(); } catch (_) {}
  state.previewMesh.geometry = geometry;
}

function refreshPreviewMaterial(state) {
  if (!state.previewMesh) return;

  disposeMaterial(state.previewMesh.material);
  state.previewMesh.material = createPreviewMaterial(state);
}

function createPreviewMaterial(state) {
  const opacity = clamp(Number(state.params.previewOpacity) || 0.62, 0.05, 1);
  const color = normalizeHexColor(state.params.previewColor || state.params.selectedMeshColor || "#ffd36a");

  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.42,
    metalness: 0.08,
    transparent: true,
    opacity,
    depthWrite: opacity >= 0.95,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.14
  });
}

function disposeMaterial(material) {
  if (Array.isArray(material)) {
    material.forEach(m => {
      try { m?.dispose?.(); } catch (_) {}
    });
    return;
  }

  try { material?.dispose?.(); } catch (_) {}
}

function isPointInsideStage(state, x, y) {
  const rect = state.root?.getBoundingClientRect?.();
  if (!rect) return false;

  return (
    x >= rect.left &&
    x <= rect.right &&
    y >= rect.top &&
    y <= rect.bottom
  );
}

function applyViewportZoom(state) {
  const rawBottom = Number(state.lastViewportRawBottom) || 0;
  const zoomFactor = clamp(Number(state.params.viewportZoomFactor) || 0, 0, 0.02);

  state.viewportZoomOffset = state.lastViewportOverlayMode
    ? 0
    : rawBottom * zoomFactor;

  updateCamera(state);
}

function renderDraft(state, draft) {
  if (!state.scene) return;

  state.lastDraft = draft;

  const nodes = Array.isArray(draft?.nodes) ? draft.nodes : [];
  const alive = new Set(nodes.map(n => n.id));

  state.selectedNodeId = draft?.selectedNodeId || null;

  for (const [id, mesh] of state.meshes.entries()) {
    if (!alive.has(id)) {
      state.scene.remove(mesh);
      disposeMesh(mesh);
      state.meshes.delete(id);
    }
  }

  nodes.forEach(node => {
    let mesh = state.meshes.get(node.id);

    if (!mesh) {
      const geometry = createGeometry(state, node.primitiveId);
      mesh = createStageMesh(state, node, geometry);
      state.meshes.set(node.id, mesh);
      state.scene.add(mesh);
    }

    applyNodeToMesh(mesh, node);
    applySelection(state, mesh, node.id === state.selectedNodeId);
  });
}

function rebuildAllMeshGeometry(state) {
  if (!state.lastDraft || !state.scene) return;

  const nodes = Array.isArray(state.lastDraft.nodes) ? state.lastDraft.nodes : [];

  nodes.forEach(node => {
    const mesh = state.meshes.get(node.id);
    if (!mesh) return;

    const nextGeometry = createGeometry(state, node.primitiveId);
    if (!nextGeometry) return;

    if (mesh.geometry) mesh.geometry.dispose();
    mesh.geometry = nextGeometry;
  });
}

function applyNodeToMesh(mesh, node) {
  const t = node.transform || {};
  const p = t.position || {};
  const r = t.rotation || {};
  const s = t.scale || {};

  mesh.position.set(Number(p.x) || 0, Number(p.y) || 0, Number(p.z) || 0);

  mesh.rotation.set(
    degToRad(Number(r.x) || 0),
    degToRad(Number(r.y) || 0),
    degToRad(Number(r.z) || 0)
  );

  mesh.scale.set(Number(s.x) || 1, Number(s.y) || 1, Number(s.z) || 1);
}

function isEnvironmentRebuildParam(param) {
  return [
    "environmentMobileSafe",
    "environmentSnakeCount",
    "environmentSnakeMinSpeed",
    "environmentSnakeMaxSpeed"
  ].includes(param);
}

function normalizeHexColor(value, fallback = "#ffd36a") {
  const color = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  if (/^#[0-9a-fA-F]{3}$/.test(color)) return color;
  return fallback;
}

function degToRad(v) {
  return v * Math.PI / 180;
}

// CHANGELOG v23:
// • Добавлен Stage Preview Mesh для drag примитивов из Inventory.
// • Stage теперь слушает ui:assetDragStart / ui:assetDragMove / ui:assetDragEnd.
// • Preview использует createGeometry и Three.js сцену, а не DOM/SVG ghost.
// • Позиция preview и финального addPrimitive теперь берётся из одного screenToWorldGround пайплайна.
// • Добавлены previewMesh / previewPrimitiveId / previewPosition / previewInsideStage в state.
// • Добавлены hidden Inspector параметры previewOpacity и previewColor.
// • Preview корректно очищается при drop, reject и onDisable.
// • Сохранены Store Single Authority, EventBus-контракт и lifecycle модуля.