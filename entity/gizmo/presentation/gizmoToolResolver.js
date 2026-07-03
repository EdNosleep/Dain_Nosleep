// ======================================================
// NOSLEEP_ENGINE — gizmoToolResolver.js v1
// Gizmo active tool resolver
// ======================================================

const VALID_TOOLS = ["default", "stretch", "rotate", "scale"];

export function resolveGizmoTool(state = {}) {
  const rawTool = state.tool || "default";
  return VALID_TOOLS.includes(rawTool) ? rawTool : "default";
}

export function isValidGizmoTool(tool) {
  return VALID_TOOLS.includes(tool);
}

export function getGizmoTools() {
  return [...VALID_TOOLS];
}

// CHANGELOG v1:
// • Добавлен resolver активного инструмента.
// • Список допустимых tools вынесен в отдельный файл.
// • Подготовка к ToolDock и будущим pivot/vertex/edge/face режимам.

