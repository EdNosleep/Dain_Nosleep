// ======================================================
// NOSLEEP_ENGINE — gizmoPresentationBuilder.js v2
// Gizmo Presentation Builder + interaction state
// ======================================================

import { resolveGizmoVisibility } from "./gizmoVisibilityResolver.js";
import { resolveGizmoTool } from "./gizmoToolResolver.js";
import { resolveGizmoUi } from "./gizmoUiResolver.js";

export function buildGizmoPresentation(state = {}) {
  const selected = !!state.selectedNodeId;
  const focusPhase = state.focusPhase || "idle";
  const tool = resolveGizmoTool(state);

  const visibility = resolveGizmoVisibility({
    selected,
    focusPhase,
    tool
  });

  const ui = resolveGizmoUi({
    selected,
    visibility,
    tool
  });

  const name = resolvePresentationName({
    selected,
    focusPhase,
    tool,
    visibility
  });

  return {
    name,
    activeTool: tool,

    layout: {
      name,
      visible: visibility.visible,

      stretch: visibility.stretch,
      rotation: visibility.rotation,
      scale: visibility.scale,
      pivot: visibility.pivot,

      stretchInteractive: visibility.stretchInteractive,
      rotationInteractive: visibility.rotationInteractive,
      scaleInteractive: visibility.scaleInteractive,
      pivotInteractive: visibility.pivotInteractive,

      infoPanel: visibility.infoPanel,
      toolDock: visibility.toolDock
    },

    ui,

    meta: {
      source: "gizmoPresentationBuilder",
      version: 2
    }
  };
}

function resolvePresentationName({ selected, focusPhase, tool }) {
  if (!selected) return "hidden";

  const inFocus =
    focusPhase === "entering" ||
    focusPhase === "focused";

  if (!inFocus) return "selected";

  if (tool === "stretch") return "stretch";
  if (tool === "rotate") return "rotate";
  if (tool === "scale") return "scale";

  return "full";
}

// CHANGELOG v2:
// • Presentation layout теперь содержит interaction flags.
// • Runtime получает не только visible-состояние, но и interactive-состояние.
// • selected без Focus получает presentation name "selected".
// • Gizmo visibility больше не равна автоматически Gizmo interaction.
// • Подготовлено разделение Focus Level 1 / Focus Level 2.