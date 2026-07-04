// ======================================================
// NOSLEEP_ENGINE — gizmoLayoutResolver.js v2
// Legacy Layout Adapter over Gizmo Presentation
// ======================================================

import { resolveGizmoPresentation } from "./presentation/gizmoPresentation.js";

export function resolveGizmoLayout(state = {}) {
  return resolveGizmoPresentation(state).layout;
}

export function resolveGizmoLayoutWithPresentation(state = {}) {
  const presentation = resolveGizmoPresentation(state);

  return {
    layout: presentation.layout,
    presentation
  };
}

// CHANGELOG v2:
// • gizmoLayoutResolver стал совместимым адаптером над gizmoPresentation.
// • Старая функция resolveGizmoLayout() сохранена без изменения контракта.
// • Добавлена resolveGizmoLayoutWithPresentation() для следующего этапа.
// • Логика режимов перенесена в presentation/gizmoPresentation.js.
// • Текущий interactionGizmo.js v7 не требует изменений.