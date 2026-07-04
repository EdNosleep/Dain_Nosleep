// ======================================================
// NOSLEEP_ENGINE — scaleHandle.js v2
// Uniform scale handle renderer
// ======================================================

export function createScaleHandle(root, state) {
  const group = document.createElement("div");
  Object.assign(group.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none"
  });

  const el = document.createElement("button");
  el.type = "button";
  el.textContent = "↕";

  Object.assign(el.style, {
    position: "absolute",
    width: "46px",
    height: "132px",
    marginLeft: "-23px",
    marginTop: "-66px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(0,0,0,0.38)",
    color: "#ffffff",
    fontSize: "24px",
    fontWeight: "900",
    pointerEvents: "auto",
    touchAction: "none",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    boxShadow: "0 0 22px rgba(255,255,255,0.14)"
  });

  group.appendChild(el);
  root.appendChild(group);

  return { root: group, el };
}

export function updateScaleHandle(state) {
  const pack = state.renderer?.scale;
  const center = state.projectionData?.centerScreen;

  if (!pack?.el || !center?.visible) return;

  const h = Number(state.params.scaleHeight ?? 132);
  const offsetX = Number(state.params.scaleOffsetX ?? 128);

  pack.el.style.height = `${h}px`;
  pack.el.style.marginTop = `${-h / 2}px`;
  pack.el.style.transform =
    `translate3d(${center.x + offsetX}px, ${center.y}px, 0)`;
}

export function destroyScaleHandle(pack) {
  pack?.root?.remove();
}

// CHANGELOG v2:
// • Scale handle теперь читает state.projectionData.
// • Убран старый доступ к state.projection как payload.
// • Логика вертикального mobile slider сохранена.
// • DOM-слой не содержит EventBus и Store-логики.