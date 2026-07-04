// ======================================================
// NOSLEEP_ENGINE — entityFocusController.js v2
// Single Authority for Entity Focus Editing State
// ======================================================

import { defineModule } from "../../engine/moduleFactory.js";

const KEY = "__entityFocusControllerModule";

const PHASE = {
  IDLE: "idle",
  ENTERING: "entering",
  FOCUSED: "focused",
  LEAVING: "leaving"
};

export const registerEntityFocusControllerModule = defineModule({
  key: KEY,
  name: "Entity Focus Controller",

  inspector: {
    "Focus включён": { param: "enabled", type: "toggle", value: true },
    "Focus distance": { param: "focusDistance", type: "range", min: 2, max: 12, step: 0.25, value: 5 },
    "Focus pitch": { param: "focusPitch", type: "range", min: -0.6, max: 0.9, step: 0.05, value: 0.18 },
    "Focus duration": { param: "focusDurationMs", type: "range", min: 120, max: 900, step: 20, value: 420 },
    "Exit duration": { param: "exitDurationMs", type: "range", min: 120, max: 900, step: 20, value: 360 },
    "Occlusion check": { param: "occlusionCheck", type: "toggle", value: true },
    "Orbit bypass angle": { param: "bypassAngle", type: "range", min: 10, max: 90, step: 5, value: 38 }
  },

  dependencies: ["__entityEditorLogicModule", "__entityStage3DModule"],

  createState() {
    return {
      params: {
        enabled: true,
        focusDistance: 5,
        focusPitch: 0.18,
        focusDurationMs: 420,
        exitDurationMs: 360,
        occlusionCheck: true,
        bypassAngle: 38
      },

      phase: PHASE.IDLE,
      active: false,
      nodeId: null,
      previousCamera: null
    };
  },

  onStart({ bus, state }) {
    bus.on("entityFocus:requestEnter", payload => {
      if (!state.params.enabled) return;

      const nodeId = payload?.nodeId;
      if (!nodeId) return;
      if (state.phase === PHASE.ENTERING || state.phase === PHASE.FOCUSED) return;

      state.phase = PHASE.ENTERING;
      state.active = true;
      state.nodeId = nodeId;
      state.previousCamera = payload?.camera || null;

      emitPhase(bus, state, "enterRequested");

      bus.emit("entityFocus:entered", {
        nodeId,
        phase: state.phase,
        previousCamera: state.previousCamera,
        focusDistance: Number(state.params.focusDistance) || 5,
        focusPitch: Number(state.params.focusPitch) || 0.18,
        focusDurationMs: Number(state.params.focusDurationMs) || 420,
        occlusionCheck: state.params.occlusionCheck !== false,
        bypassAngle: Number(state.params.bypassAngle) || 38
      });
    }, { moduleKey: KEY, priority: 20 });

    bus.on("entityFocus:enterComplete", ({ nodeId } = {}) => {
      if (state.phase !== PHASE.ENTERING) return;
      if (nodeId && nodeId !== state.nodeId) return;

      state.phase = PHASE.FOCUSED;
      state.active = true;

      emitPhase(bus, state, "enterComplete");

      bus.emit("entityFocus:focused", {
        nodeId: state.nodeId,
        phase: state.phase
      });
    }, { moduleKey: KEY, priority: 20 });

    bus.on("entityFocus:requestExit", payload => {
      if (state.phase === PHASE.IDLE || state.phase === PHASE.LEAVING) return;

      const nodeId = state.nodeId;
      const previousCamera = state.previousCamera;

      state.phase = PHASE.LEAVING;
      state.active = true;

      emitPhase(bus, state, payload?.reason || "exitRequested");

      bus.emit("entityFocus:left", {
        nodeId,
        phase: state.phase,
        reason: payload?.reason || "requestExit",
        previousCamera,
        exitDurationMs: Number(state.params.exitDurationMs) || 360
      });
    }, { moduleKey: KEY, priority: 20 });

    bus.on("entityFocus:exitComplete", ({ nodeId } = {}) => {
      if (state.phase !== PHASE.LEAVING) return;
      if (nodeId && nodeId !== state.nodeId) return;

      const prevNodeId = state.nodeId;

      state.phase = PHASE.IDLE;
      state.active = false;
      state.nodeId = null;
      state.previousCamera = null;

      emitPhase(bus, state, "exitComplete", prevNodeId);
    }, { moduleKey: KEY, priority: 20 });

    bus.on("entityFocus:toggle", payload => {
      if (state.phase === PHASE.IDLE) {
        bus.emit("entityFocus:requestEnter", payload || {});
        return;
      }

      if (state.phase === PHASE.FOCUSED || state.phase === PHASE.ENTERING) {
        bus.emit("entityFocus:requestExit", { reason: "toggle" });
      }
    }, { moduleKey: KEY, priority: 20 });

    bus.on("entityEditor:selectionChanged", ({ nodeId } = {}) => {
      if (state.phase === PHASE.IDLE) return;
      if (nodeId === state.nodeId) return;

      bus.emit("entityFocus:requestExit", {
        reason: "selectionChanged"
      });
    }, { moduleKey: KEY, priority: 5 });
  },

  onDisable({ bus, state }) {
    if (state.phase !== PHASE.IDLE) {
      bus.emit("entityFocus:left", {
        nodeId: state.nodeId,
        phase: PHASE.LEAVING,
        reason: "moduleDisabled",
        previousCamera: state.previousCamera,
        exitDurationMs: 0
      });
    }

    state.phase = PHASE.IDLE;
    state.active = false;
    state.nodeId = null;
    state.previousCamera = null;
  },

  onParam({ param, value, state }) {
    state.params[param] = value;
  }
});

function emitPhase(bus, state, reason, overrideNodeId = null) {
  bus.emit("entityFocus:phaseChanged", {
    phase: state.phase,
    active: state.active,
    nodeId: overrideNodeId || state.nodeId,
    reason
  });
}

// CHANGELOG v2:
// • Добавлена фазовая машина idle / entering / focused / leaving.
// • requestEnter теперь переводит Focus в entering.
// • Добавлены entityFocus:enterComplete и entityFocus:focused.
// • requestExit теперь переводит Focus в leaving.
// • Добавлен entityFocus:exitComplete для возврата в idle.
// • Добавлено entityFocus:phaseChanged.
// • Controller остаётся Single Authority состояния Focus.
// • Камера, occlusion и input по-прежнему будут отдельными helper-модулями.

