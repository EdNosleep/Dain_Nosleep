// ======================================================
// NOSLEEP_ENGINE — interactionGizmo.js v10
// 3D Runtime Gizmo Coordinator + quaternion transform
// ======================================================

import { defineModule } from "../../engine/moduleFactory.js";
import { getPrimitiveDimensions, normalizePrimitiveId } from "../data/primitiveDimensions.js";

import {
  createGizmo3D,
  destroyGizmo3D,
  rebuildGizmo3D,
  applyGizmo3DParams,
  applyGizmo3DLayout,
  applyGizmo3DBounds,
  setGizmo3DVisible,
  setGizmo3DTransform
} from "./runtime/gizmo3D.js";

import {
  bindGizmo3DInput,
  attachGizmo3DInput,
  destroyGizmo3DInput
} from "./runtime/gizmoInput.js";

const KEY = "__interactionGizmoModule";

export const registerInteractionGizmoModule = defineModule({
  key: KEY,
  name: "Interaction Gizmo",

  inspector: {
    "Показать Gizmo": { param: "visible", type: "toggle", value: true },

    "Stretch чувствительность": { param: "stretchSensitivity", type: "range", min: 0.002, max: 0.05, step: 0.001, value: 0.012 },
    "Rotation чувствительность": { param: "rotationSensitivity", type: "range", min: 0.05, max: 1.2, step: 0.05, value: 0.28 },
    "Scale чувствительность": { param: "scaleSensitivity", type: "range", min: 0.002, max: 0.05, step: 0.001, value: 0.01 },

    "Stretch цвет": { param: "stretchHandleColor", type: "color", value: "#00ccff" },
    "Stretch прозрачность": { param: "stretchHandleOpacity", type: "range", min: 0.05, max: 1, step: 0.05, value: 0.42 },
    "Stretch glow": { param: "stretchHandleGlow", type: "range", min: 0, max: 1, step: 0.05, value: 0.18 },
    "Stretch дистанция": { param: "stretchHandleDistance", type: "range", min: 0.45, max: 1.8, step: 0.05, value: 0.86 },
    "Stretch длина": { param: "stretchHandleLength", type: "range", min: 0.12, max: 0.8, step: 0.02, value: 0.34 },
    "Stretch радиус": { param: "stretchHandleRadius", type: "range", min: 0.03, max: 0.2, step: 0.005, value: 0.085 },
    "Stretch touch radius": { param: "stretchTouchRadius", type: "range", min: 0.08, max: 0.45, step: 0.01, value: 0.22 },

    "Ring X цвет": { param: "rotationRingXColor", type: "color", value: "#ffd36a" },
    "Ring Y цвет": { param: "rotationRingYColor", type: "color", value: "#b9b2ff" },
    "Ring прозрачность": { param: "rotationRingOpacity", type: "range", min: 0.05, max: 1, step: 0.05, value: 0.34 },
    "Ring glow": { param: "rotationRingGlow", type: "range", min: 0, max: 1, step: 0.05, value: 0.16 },
    "Ring радиус": { param: "rotationRingRadius", type: "range", min: 0.4, max: 2, step: 0.05, value: 0.055 },
    "Ring толщина": { param: "rotationRingTube", type: "range", min: 0.01, max: 0.16, step: 0.005, value: 0.035 },
    "Ring touch толщина": { param: "rotationRingHitTube", type: "range", min: 0.04, max: 0.38, step: 0.01, value: 0.16 },
    "Ring X offset Y": { param: "rotationRingXOffsetY", type: "range", min: -1.5, max: 1.5, step: 0.05, value: 0 },
    "Ring Y offset X": { param: "rotationRingYOffsetX", type: "range", min: -1.5, max: 1.5, step: 0.05, value: 0 },

    "Scale цвет": { param: "scaleHandleColor", type: "color", value: "#ffffff" },
    "Scale акцент": { param: "scaleHandleAccentColor", type: "color", value: "#00ccff" },
    "Scale offset X 3D": { param: "scaleOffsetX3D", type: "range", min: 0.5, max: 2.4, step: 0.05, value: 1.18 },
    "Scale высота 3D": { param: "scaleHeight3D", type: "range", min: 0.6, max: 2.4, step: 0.05, value: 1.28 },
    "Scale radius": { param: "scaleBarRadius", type: "range", min: 0.01, max: 0.12, step: 0.005, value: 0.025 },
    "Scale thumb": { param: "scaleThumbRadius", type: "range", min: 0.04, max: 0.24, step: 0.01, value: 0.105 },
    "Scale arrow": { param: "scaleArrowSize", type: "range", min: 0.05, max: 0.28, step: 0.01, value: 0.13 },
    "Scale touch": { param: "scaleHitRadius", type: "range", min: 0.08, max: 0.45, step: 0.01, value: 0.2 }
  },

  dependencies: [
    "__entityEditorLogicModule",
    "__entityStage3DModule",
    "__gizmoStateControllerModule"
  ],

  createState() {
    return {
      params: {
        visible: true,

        stretchSensitivity: 0.012,
        rotationSensitivity: 0.28,
        scaleSensitivity: 0.01,

        stretchHandleColor: "#00ccff",
        stretchHandleOpacity: 0.42,
        stretchHandleGlow: 0.18,
        stretchHandleDistance: 0.86,
        stretchHandleLength: 0.34,
        stretchHandleRadius: 0.085,
        stretchTouchRadius: 0.22,

        rotationRingXColor: "#ffd36a",
        rotationRingYColor: "#b9b2ff",
        rotationRingOpacity: 0.34,
        rotationRingGlow: 0.16,
        rotationRingRadius: 0.92,
        rotationRingTube: 0.035,
        rotationRingHitTube: 0.16,
        rotationRingXOffsetY: -0.66,
        rotationRingYOffsetX: -0.66,

        scaleHandleColor: "#ffffff",
        scaleHandleAccentColor: "#00ccff",
        scaleOffsetX3D: 1.18,
        scaleHeight3D: 1.28,
        scaleBarRadius: 0.025,
        scaleThumbRadius: 0.105,
        scaleArrowSize: 0.13,
        scaleHitRadius: 0.2
      },

      runtime: null,
      stageRuntime: null,
      input3D: null,

      draft: null,
      selectedNode: null,
      selectedNodeId: null,

      presentation: null,
      layout: null,

      unsubDraft: null,
      raf: 0,
      running: false
    };
  },

  onStart({ store, bus, state }) {
    bindGizmo3DInput({ state, bus });

    bus.on("entityStage3D:runtime", payload => {
      handleStageRuntime(state, payload, bus);
      syncGizmo(state);
    }, { moduleKey: KEY });

    bus.on("entityStage3D:runtimeDisposed", () => {
      destroyGizmo3DInput(state);
      destroyGizmo3D(state.runtime);
      state.runtime = null;
      state.stageRuntime = null;
    }, { moduleKey: KEY });

    bus.on("entityGizmo:presentationChanged", payload => {
      state.presentation = payload?.presentation || null;
      state.layout = payload?.layout || payload?.presentation?.layout || null;

      if (state.runtime) {
        applyGizmo3DLayout(state.runtime, getEffectiveLayout(state));
      }

      syncGizmo(state);
    }, { moduleKey: KEY });

    bus.on("entityGizmo:layoutChanged", payload => {
      if (payload?.presentation) {
        state.presentation = payload.presentation;
      }

      state.layout = payload?.layout || payload?.presentation?.layout || null;

      if (state.runtime) {
        applyGizmo3DLayout(state.runtime, getEffectiveLayout(state));
      }

      syncGizmo(state);
    }, { moduleKey: KEY });

    state.unsubDraft = store.subscribe("entityDraft", draft => {
      state.draft = draft || null;
      updateSelectedNode(state);
      syncGizmo(state);
    });

    state.draft = store.get("entityDraft") || null;
    updateSelectedNode(state);

    bus.emit("entityStage3D:requestRuntime", {
      requestId: `${KEY}_${Date.now()}`
    });

    state.running = true;
    tick(state);
  },

  onDisable({ state }) {
    state.running = false;
    cancelAnimationFrame(state.raf);
    state.raf = 0;

    try { state.unsubDraft?.(); } catch (_) {}
    state.unsubDraft = null;

    destroyGizmo3DInput(state);
    destroyGizmo3D(state.runtime);

    state.runtime = null;
    state.stageRuntime = null;
    state.draft = null;
    state.selectedNode = null;
    state.selectedNodeId = null;
    state.presentation = null;
    state.layout = null;
  },

  onParam({ param, value, state }) {
    state.params[param] = value;

    if (!state.runtime) return;

    if (isRebuildParam(param)) {
      rebuildGizmo3D(state.runtime, state.params);
    } else {
      applyGizmo3DParams(state.runtime, state.params);
    }

    applyGizmo3DLayout(state.runtime, getEffectiveLayout(state));
    applyGizmo3DBounds(state.runtime, getSelectedNodeBounds(state), state.params);
    syncGizmo(state);
  }
});

function handleStageRuntime(state, payload, bus) {
  if (!payload?.ready || !payload.THREE || !payload.scene) return;

  state.stageRuntime = payload;

  if (!state.runtime?.ready) {
    state.runtime = createGizmo3D({
      THREE: payload.THREE,
      scene: payload.scene
    });

    rebuildGizmo3D(state.runtime, state.params);
    applyGizmo3DLayout(state.runtime, getEffectiveLayout(state));
    applyGizmo3DBounds(state.runtime, getSelectedNodeBounds(state), state.params);
  }

  attachGizmo3DInput({ state, bus });
}

function tick(state) {
  if (!state.running) return;

  syncGizmo(state);
  state.raf = requestAnimationFrame(() => tick(state));
}

function syncGizmo(state) {
  const runtime = state.runtime;
  const node = state.selectedNode;

  if (!runtime?.ready) return;

  const layout = getEffectiveLayout(state);
  const visible =
    !!state.params.visible &&
    !!node &&
    !!state.stageRuntime?.ready &&
    layout.visible !== false;

  setGizmo3DVisible(runtime, visible);

  if (!visible) return;

  setGizmo3DTransform(runtime, normalizeNodeTransform(node));
  applyGizmo3DLayout(runtime, layout);
  applyGizmo3DBounds(runtime, getSelectedNodeBounds(state), state.params);
}

function getEffectiveLayout(state) {
  const presentationLayout = state.presentation?.layout || null;
  const layout = presentationLayout || state.layout;

  if (layout) {
    return {
      ...layout,
      visible: state.params.visible && layout.visible !== false
    };
  }

  return {
    name: state.selectedNodeId ? "compact-fallback" : "hidden-fallback",
    visible: !!state.selectedNodeId && !!state.params.visible,
    stretch: false,
    rotation: false,
    scale: !!state.selectedNodeId,
    pivot: false,
    stretchInteractive: false,
    rotationInteractive: false,
    scaleInteractive: !!state.selectedNodeId,
    pivotInteractive: false,
    infoPanel: false,
    toolDock: !!state.selectedNodeId
  };
}

function updateSelectedNode(state) {
  const draft = state.draft;
  const nodeId = draft?.selectedNodeId || null;
  const nodes = Array.isArray(draft?.nodes) ? draft.nodes : [];

  state.selectedNodeId = nodeId;
  state.selectedNode = nodes.find(node => node.id === nodeId) || null;
}

function normalizeNodeTransform(node) {
  const t = node?.transform || {};
  const p = t.position || {};
  const r = t.rotation || {};
  const q = t.rotationQuaternion || null;

  return {
    position: {
      x: Number(p.x) || 0,
      y: Number(p.y) || 0,
      z: Number(p.z) || 0
    },
    rotation: {
      x: Number(r.x) || 0,
      y: Number(r.y) || 0,
      z: Number(r.z) || 0
    },
    rotationQuaternion: q
      ? {
          x: Number(q.x) || 0,
          y: Number(q.y) || 0,
          z: Number(q.z) || 0,
          w: Number.isFinite(Number(q.w)) ? Number(q.w) : 1
        }
      : null
  };
}

function getSelectedNodeBounds(state) {
  return getNodeBounds(state.selectedNode);
}

function getNodeBounds(node) {
  if (!node) return { x: 1, y: 1, z: 1 };

  const primitiveId = normalizePrimitiveId(node.primitiveId || node.geometry || "cube");
  const dim = getPrimitiveDimensions(primitiveId);
  const base = primitiveBaseSize(primitiveId, dim);

  const t = node.transform || {};
  const s = t.scale || {};
  const stretch = node.stretch || {};

  return {
    x: Math.max(0.05, base.x * (Number(s.x) || 1) * (Number(stretch.x) || 1)),
    y: Math.max(0.05, base.y * (Number(s.y) || 1) * (Number(stretch.y) || 1)),
    z: Math.max(0.05, base.z * (Number(s.z) || 1) * (Number(stretch.z) || 1))
  };
}

function primitiveBaseSize(id, dim = {}) {
  if (id === "sphere") {
    const d = (Number(dim.radius) || 0.5) * 2;
    return { x: d, y: d, z: d };
  }

  if (id === "cone" || id === "cylinder") {
    const d = (Number(dim.radius) || 0.5) * 2;
    return {
      x: d,
      y: Number(dim.height) || 1,
      z: d
    };
  }

  if (id === "capsule") {
    const d = (Number(dim.radius) || 0.25) * 2;
    return {
      x: d,
      y: Number(dim.totalHeight) || 1,
      z: d
    };
  }

  const size = Number(dim.size) || 1;
  return { x: size, y: size, z: size };
}

function isRebuildParam(param) {
  return [
    "stretchHandleDistance",
    "stretchHandleLength",
    "stretchHandleRadius",
    "stretchTouchRadius",
    "rotationRingRadius",
    "rotationRingTube",
    "rotationRingHitTube",
    "scaleHeight3D",
    "scaleBarRadius",
    "scaleThumbRadius",
    "scaleArrowSize",
    "scaleHitRadius"
  ].includes(param);
}

// CHANGELOG v10:
// • Gizmo transform теперь передаёт rotationQuaternion в runtime.
// • Euler rotation сохранён как fallback.
// • Bounds-aware layout v9 сохранён.
// • Runtime API и Presentation Pipeline сохранены.