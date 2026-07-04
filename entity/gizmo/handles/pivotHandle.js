// ======================================================
// NOSLEEP_ENGINE — pivotHandle.js v1
// Reserved hidden pivot handle
// ======================================================

export function createPivotHandle(root, state) {
  const group = document.createElement("div");
  Object.assign(group.style, {
    position: "absolute",
    inset: "0",
    display: "none",
    pointerEvents: "none"
  });

  root.appendChild(group);
  return { root: group };
}

export function updatePivotHandle(state) {
  const pack = state.renderer?.pivot;
  if (!pack?.root) return;

  pack.root.style.display = "none";
}

export function destroyPivotHandle(pack) {
  pack?.root?.remove();
}

// CHANGELOG v1:
// • Добавлен reserved Pivot handle.
// • Pivot пока полностью скрыт.
// • Файл нужен как архитектурный задел под Animation System.
// • UI/gesture логика не реализуется на этом этапе.

