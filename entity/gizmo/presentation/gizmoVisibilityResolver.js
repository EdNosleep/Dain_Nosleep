// ======================================================
// NOSLEEP_ENGINE — gizmoVisibilityResolver.js v3
// Focus-gated handles + selected scale control
// ======================================================

export function resolveGizmoVisibility({ selected, focusPhase, tool }) {
  if (!selected) {
    return createVisibility(false);
  }

  const inFocus =
    focusPhase === "entering" ||
    focusPhase === "focused";

  if (!inFocus) {
    return createVisibility(true, {
      stretch: false,
      rotation: false,
      scale: true,
      infoPanel: false,
      toolDock: true
    });
  }

  if (tool === "stretch") {
    return createVisibility(true, {
      stretch: true,
      rotation: false,
      scale: true,
      infoPanel: false
    });
  }

  if (tool === "rotate") {
    return createVisibility(true, {
      stretch: false,
      rotation: true,
      scale: true,
      infoPanel: false
    });
  }

  if (tool === "scale") {
    return createVisibility(true, {
      stretch: false,
      rotation: false,
      scale: true,
      infoPanel: false
    });
  }

  return createVisibility(true, {
    stretch: true,
    rotation: true,
    scale: true,
    infoPanel: true
  });
}

function createVisibility(visible, patch = {}) {
  const result = {
    visible,

    stretch: false,
    rotation: false,
    scale: false,
    pivot: false,

    stretchInteractive: false,
    rotationInteractive: false,
    scaleInteractive: false,
    pivotInteractive: false,

    infoPanel: false,
    toolDock: visible,

    ...patch
  };

  result.stretchInteractive = !!result.visible && !!result.stretch;
  result.rotationInteractive = !!result.visible && !!result.rotation;
  result.scaleInteractive = !!result.visible && !!result.scale;
  result.pivotInteractive = !!result.visible && !!result.pivot;

  return result;
}

// CHANGELOG v3:
// • Вернул scale control рядом с выбранной фигурой.
// • В selected без Focus видим и работает только scale.
// • Stretch/rotation по-прежнему скрыты и неинтерактивны вне Focus.
// • Во Focus scale остаётся доступным вместе с активными tool-режимами.
// • Interaction flags сохранены: невидимые части Gizmo не ловят tap.