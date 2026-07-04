// ======================================================
// NOSLEEP_ENGINE — gizmoPresentation.js v2
// Gizmo Presentation facade
// ======================================================

import { buildGizmoPresentation } from "./gizmoPresentationBuilder.js";

export function resolveGizmoPresentation(state = {}) {
  return buildGizmoPresentation(state);
}

// CHANGELOG v2:
// • gizmoPresentation стал фасадом над gizmoPresentationBuilder.
// • Логика разделена на builder + resolvers.
// • Внешний контракт resolveGizmoPresentation(state) сохранён.