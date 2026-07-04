// ======================================================
// NOSLEEP_ENGINE — gizmoUiResolver.js v1
// Gizmo UI resolver
// ======================================================

export function resolveGizmoUi({ selected, visibility, tool }) {
  return {
    toolDock: !!selected && visibility.visible !== false,
    infoPanel: !!visibility.infoPanel,
    activeTool: tool || "default"
  };
}

// CHANGELOG v1:
// • UI-слой Presentation вынесен отдельно.
// • ToolDock и InfoPanel теперь вычисляются не в renderer.
// • Подготовка к DOM ToolDock / InfoPanel.

