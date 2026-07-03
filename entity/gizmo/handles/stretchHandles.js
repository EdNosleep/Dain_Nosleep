// ======================================================
// NOSLEEP_ENGINE — stretchHandles.js v2
// Stretch handles renderer
// ======================================================

export function createStretchHandles(root, state) {
  const group = document.createElement("div");
  Object.assign(group.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none"
  });

  const handles = new Map();

  [
    ["right", "x", 1, "R"],
    ["left", "x", -1, "L"],
    ["top", "y", 1, "T"],
    ["bottom", "y", -1, "B"],
    ["front", "z", 1, "F"],
    ["back", "z", -1, "K"]
  ].forEach(([id, axis, sign, label]) => {
    const el = makeHandle(label);
    el.dataset.axis = axis;
    el.dataset.sign = String(sign);
    group.appendChild(el);
    handles.set(id, el);
  });

  root.appendChild(group);
  return { root: group, handles };
}

export function updateStretchHandles(state) {
  const pack = state.renderer?.stretch;
  const projection = state.projectionData;

  if (!pack) return;

  const size = Number(state.params.handleSize ?? 52);

  for (const [id, el] of pack.handles.entries()) {
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.marginLeft = `${-size / 2}px`;
    el.style.marginTop = `${-size / 2}px`;

    const p = projection?.handles?.[id]?.screen;

    if (!p?.visible || !shouldShowHandle(id, projection)) {
      el.style.display = "none";
      continue;
    }

    el.style.display = "block";
    el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
  }
}

export function destroyStretchHandles(pack) {
  pack?.root?.remove();
  pack?.handles?.clear?.();
}

function makeHandle(label) {
  const el = document.createElement("button");
  el.type = "button";
  el.textContent = label;

  Object.assign(el.style, {
    position: "absolute",
    borderRadius: "999px",
    border: "1px solid rgba(0,204,255,0.82)",
    background: "rgba(0,204,255,0.18)",
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: "900",
    pointerEvents: "auto",
    touchAction: "none",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    boxShadow: "0 0 16px rgba(0,204,255,0.28)"
  });

  return el;
}

function shouldShowHandle(id, projection) {
  const handles = projection?.handles || {};
  const center = projection?.centerScreen;
  const p = handles[id]?.screen;

  if (!center || !p) return false;

  const dx = p.x - center.x;
  const dy = p.y - center.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  return dist > 22;
}

// CHANGELOG v2:
// • Stretch handles теперь читают state.projectionData.
// • Убран старый доступ к state.projection как payload.
// • Сохранена базовая фильтрация близких ручек.
// • DOM-слой не содержит EventBus и Store-логики.