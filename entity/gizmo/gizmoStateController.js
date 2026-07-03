// ======================================================
// NOSLEEP_ENGINE — gizmoStateController.js v2
// Single Authority for Gizmo Presentation State
// ======================================================

import { defineModule } from "../../engine/moduleFactory.js";
import { resolveGizmoLayoutWithPresentation } from "./gizmoLayoutResolver.js";

const KEY = "__gizmoStateControllerModule";

export const registerGizmoStateControllerModule = defineModule({
  key: KEY,
  name: "Gizmo State Controller",

  inspector: {
    "Gizmo State включён": { param: "enabled", type: "toggle", value: true },
    "Tool по умолчанию": {
      param: "defaultTool",
      type: "select",
      value: "default",
      options: ["default", "stretch", "rotate", "scale"]
    }
  },

  dependencies: ["__entityEditorLogicModule", "__entityFocusControllerModule"],

  createState() {
    return {
      params: {
        enabled: true,
        defaultTool: "default"
      },

      selectedNodeId: null,
      focusPhase: "idle",
      focusNodeId: null,
      tool: "default",
      layout: null,
      presentation: null
    };
  },

  onStart({ store, bus, state }) {
    state.tool = state.params.defaultTool || "default";

    state.unsubDraft = store.subscribe("entityDraft", draft => {
      state.selectedNodeId = draft?.selectedNodeId || null;
      publishPresentation(state, bus, "selectionChanged");
    });

    const draft = store.get("entityDraft");
    state.selectedNodeId = draft?.selectedNodeId || null;

    bus.on("entityFocus:phaseChanged", payload => {
      state.focusPhase = payload?.phase || "idle";
      state.focusNodeId = payload?.nodeId || null;
      publishPresentation(state, bus, "focusPhaseChanged");
    }, { moduleKey: KEY });

    bus.on("entityGizmo:setTool", payload => {
      const tool = payload?.tool || payload?.mode;
      if (!["default", "stretch", "rotate", "scale"].includes(tool)) return;

      state.tool = tool;
      publishPresentation(state, bus, "toolChanged");
    }, { moduleKey: KEY });

    bus.on("entityGizmo:resetTool", () => {
      state.tool = state.params.defaultTool || "default";
      publishPresentation(state, bus, "toolReset");
    }, { moduleKey: KEY });

    publishPresentation(state, bus, "start");
  },

  onDisable({ state }) {
    try { state.unsubDraft?.(); } catch (_) {}
    state.unsubDraft = null;

    state.selectedNodeId = null;
    state.focusPhase = "idle";
    state.focusNodeId = null;
    state.tool = "default";
    state.layout = null;
    state.presentation = null;
  },

  onParam({ param, value, state }) {
    state.params[param] = value;

    if (param === "defaultTool") {
      state.tool = value || "default";
    }
  }
});

function publishPresentation(state, bus, reason) {
  if (!state.params.enabled) return;

  const { layout, presentation } = resolveGizmoLayoutWithPresentation({
    selectedNodeId: state.selectedNodeId,
    focusPhase: state.focusPhase,
    focusNodeId: state.focusNodeId,
    tool: state.tool
  });

  state.layout = layout;
  state.presentation = presentation;

  bus.emit("entityGizmo:presentationChanged", {
    reason,
    selectedNodeId: state.selectedNodeId,
    focusPhase: state.focusPhase,
    focusNodeId: state.focusNodeId,
    tool: state.tool,
    presentation,
    layout
  });

  bus.emit("entityGizmo:layoutChanged", {
    reason,
    selectedNodeId: state.selectedNodeId,
    focusPhase: state.focusPhase,
    focusNodeId: state.focusNodeId,
    tool: state.tool,
    layout,
    presentation
  });
}

// CHANGELOG v2:
// • GizmoStateController теперь публикует presentation.
// • Добавлено событие entityGizmo:presentationChanged.
// • entityGizmo:layoutChanged сохранён для совместимости.
// • layout теперь является частью presentation pipeline.
// • state хранит layout и presentation.
// • Старый InteractionGizmo v7 продолжает работать без изменений.