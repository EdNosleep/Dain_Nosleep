// ======================================================
// Dain_Coin — entityStage3D.js v22
// Stage Canvas Snakes Inspector Cleanup
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
    "Mobile Safe": { param: "environmentMobileSafe", type: "toggle", value: true },

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
      value: 42
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

    "Интенсивность света": { param: "lightIntensity", type: "range", min: 0.3, max: 2, step: 0.05, value: 1.15, hidden: true },
    "Скорость камеры": { param: "cameraSpeed", type: "range", min: 0.2, max: 2, step: 0.1, value: 1, hidden: true },

    "Мин. pitch камеры": { param: "minPitch", type: "range", min: -1.2, max: 0.2, step: 0.05, value: -0.05, hidden: true },
    "Макс. pitch камеры": { param: "maxPitch", type: "range", min: -0.2, max: 1.2, step: 0.05, value: 0.85, hidden: true },
    "Мин. zoom камеры": { param: "minZoom", type: "range", min: 1.5, max: 8, step: 0.1, value: 3, hidden: true },
    "Макс. zoom камеры": { param: "maxZoom", type: "range", min: 6, max: 24, step: 0.5, value: 21, hidden: true },

    "Viewport Lift Factor": { param: "viewportLiftFactor", type: "range", min: 0, max: 1, step: 0.05, value: 0.45, hidden: true },
    "Viewport Zoom Factor": { param: "viewportZoomFactor", type: "range", min: 0, max: 0.02, step: 0.001, value: 0.014, hidden: true }
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
      unsubDraft: null
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

    if (param === "geometryQuality") rebuildAllMeshGeometry(state);

    if (
      param === "meshColor" ||
      param === "selectedMeshColor" ||
      param === "selectedEmissiveColor"
    ) {
      refreshMeshColors(state);
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

    if (param === "viewportZoomFactor") {
      applyViewportZoom(state);
    }

    if (isEnvironmentRebuildParam(param)) {
      rebuildRendererEnvironment(state);
    }

    applyRendererParams(state);
  }
});

function handleAssetDrop(state, bus, payload) {
  if (!state.root || !state.camera || payload?.kind !== "primitive") return;

  const primitiveId = payload.primitiveId || payload.id;
  if (!primitiveId) return;

  const x = Number(payload.clientX);
  const y = Number(payload.clientY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;

  const rect = state.root.getBoundingClientRect();

  const inside =
    x >= rect.left &&
    x <= rect.right &&
    y >= rect.top &&
    y <= rect.bottom;

  if (!inside) {
    bus.emit("ui:assetDropRejected", {
      kind: "primitive",
      primitiveId,
      reason: "outsideStage"
    });
    return;
  }

  const pos = screenToWorldGround(state, x, y);

  bus.emit("entityEditor:addPrimitive", {
    primitiveId,
    transform: { position: pos }
  });

  bus.emit("ui:assetDropAccepted", {
    kind: "primitive",
    primitiveId,
    position: pos
  });
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

function degToRad(v) {
  return v * Math.PI / 180;
}

// CHANGELOG v22:
// • Inspector очищен под Stage Canvas Snakes v6.
// • Удалены устаревшие shell/center/rotation/traces параметры от сферического Environment.
// • Добавлены актуальные параметры: glow, min/max speed, segment length, thickness, surface scale, pixel ratio.
// • Loop Chance переименован в "Шанс квадрата".
// • Rebuild теперь вызывается только для параметров, которые реально пересоздают частицы.
// • Сохранены Stage lifecycle, drag/drop, Store Single Authority и EventBus-контракт.