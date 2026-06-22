// ======================================================
// Dain_Coin — entityStage3D.js v16
// Premium mobile-first Three.js stage
// ======================================================
//
// CHANGELOG v16:
// • DOM-layer вынесен в entityStageDom.js
// • Renderer-layer вынесен в entityStageRenderer.js
// • Главный файл больше не содержит createDOM / setupThree / loop / applyParams
// • Сохранены v15 Input, v14 Picking, v13 Camera, v12 Geometry/Materials
// • entityStage3D стал orchestration + draft sync модулем
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
  createStageDOM
} from "./entityStageDom.js";

import {
  setupThree,
  applyRendererParams,
  loop
} from "./entityStageRenderer.js";

import { createGeometry } from "./entityStageGeometry.js";

import {
  createStageMesh,
  applySelection,
  refreshMeshColors,
  disposeMesh
} from "./entityStageMaterials.js";

import {
  screenToWorldGround
} from "./entityStagePicking.js";

import {
  unbindStageInput,
  resetPointerState
} from "./entityStageInput.js";

const KEY = "__entityStage3DModule";

export const registerEntityStage3DModule = defineModule({
  key: KEY,
  name: "Entity Stage 3D",

  inspector: {
    "Качество сцены": {
      param: "quality",
      type: "range",
      min: 0,
      max: 2,
      step: 1,
      value: 2
    },
    "Качество геометрии": {
      param: "geometryQuality",
      type: "range",
      min: 0,
      max: 100,
      step: 1,
      value: 85
    },
    "Цвет фигур": {
      param: "meshColor",
      type: "color",
      value: "#b9b2ff"
    },
    "Цвет выделенной фигуры": {
      param: "selectedMeshColor",
      type: "color",
      value: "#ffd36a"
    },
    "Свечение выделенной фигуры": {
      param: "selectedEmissiveColor",
      type: "color",
      value: "#332000"
    },
    "Прозрачный фон": {
      param: "transparentBackground",
      type: "toggle",
      value: true
    },
    "Цвет фона": {
      param: "backgroundColor",
      type: "color",
      value: "#111117"
    },
    "Интенсивность света": {
      param: "lightIntensity",
      type: "range",
      min: 0.3,
      max: 2,
      step: 0.05,
      value: 1.15
    },
    "Скорость камеры": {
      param: "cameraSpeed",
      type: "range",
      min: 0.2,
      max: 2,
      step: 0.1,
      value: 1
    },
    "Мин. pitch камеры": {
      param: "minPitch",
      type: "range",
      min: -1.2,
      max: 0.2,
      step: 0.05,
      value: -0.05
    },
    "Макс. pitch камеры": {
      param: "maxPitch",
      type: "range",
      min: -0.2,
      max: 1.2,
      step: 0.05,
      value: 0.85
    },
    "Мин. zoom камеры": {
      param: "minZoom",
      type: "range",
      min: 1.5,
      max: 8,
      step: 0.1,
      value: 3
    },
    "Макс. zoom камеры": {
      param: "maxZoom",
      type: "range",
      min: 6,
      max: 24,
      step: 0.5,
      value: 21
    }
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
        backgroundColor: "#111117",
        lightIntensity: 1.15,
        cameraSpeed: 1,
        minPitch: -0.95,
        maxPitch: 0.75,
        minZoom: 3,
        maxZoom: 14
      },

      THREE,
      root: null,
      canvasHost: null,

      scene: null,
      camera: null,
      renderer: null,
      raycaster: null,
      pointer: null,

      bus: null,
      resizeHandler: null,
      inputHandlers: null,

      meshes: new Map(),
      selectedNodeId: null,
      transformMode: "move",
      lastDraft: null,

      raf: 0,
      running: false,
      
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

    bus.on("entityEditor:setTool", payload => {
      const mode = payload?.tool || payload?.mode;
      if (!["move", "rotate", "scale"].includes(mode)) return;
      state.transformMode = mode;
    }, { moduleKey: KEY });

    bus.on("ui:assetDragEnd", payload => {
      if (!state.root || payload?.kind !== "primitive") return;

      const rect = state.root.getBoundingClientRect();
      const x = payload.clientX;
      const y = payload.clientY;

      const inside =
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom;

      if (!inside) return;

      const pos = screenToWorldGround(state, x, y);

      bus.emit("entityEditor:addPrimitive", {
        primitiveId: payload.id,
        transform: { position: pos }
      });
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

    for (const mesh of state.meshes.values()) {
      disposeMesh(mesh);
    }

    state.meshes.clear();

    if (state.renderer) {
      try { state.renderer.dispose(); } catch (_) {}
    }

    if (state.root) state.root.remove();

    state.root = null;
    state.canvasHost = null;
    state.scene = null;
    state.camera = null;
    state.renderer = null;
    state.raycaster = null;
    state.pointer = null;
    state.bus = null;
    state.lastDraft = null;

    resetPointerState(state);
  },

  onParam({ param, value, state }) {
    state.params[param] = value;

    if (param === "geometryQuality") {
      rebuildAllMeshGeometry(state);
    }

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

    applyRendererParams(state);
  }
});

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

  mesh.position.set(
    Number(p.x) || 0,
    Number(p.y) || 0,
    Number(p.z) || 0
  );

  mesh.rotation.set(
    degToRad(Number(r.x) || 0),
    degToRad(Number(r.y) || 0),
    degToRad(Number(r.z) || 0)
  );

  mesh.scale.set(
    Number(s.x) || 1,
    Number(s.y) || 1,
    Number(s.z) || 1
  );
}

function degToRad(v) {
  return v * Math.PI / 180;
}