// ======================================================
// NOSLEEP_ENGINE — rotationRings.js v2
// Rotation rings renderer
// ======================================================

export function createRotationRings(root, state) {
  const group = document.createElement("div");
  Object.assign(group.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none"
  });

  const rings = new Map();

  const yaw = makeRing("yaw");
  yaw.dataset.axis = "y";

  const pitch = makeRing("pitch");
  pitch.dataset.axis = "x";

  group.append(yaw, pitch);
  rings.set("yaw", yaw);
  rings.set("pitch", pitch);

  root.appendChild(group);
  return { root: group, rings };
}

export function updateRotationRings(state) {
  const pack = state.renderer?.rotation;
  const center = state.projectionData?.centerScreen;

  if (!pack || !center?.visible) return;

  const size = Number(state.params.ringSize ?? 190);

  for (const [id, el] of pack.rings.entries()) {
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.marginLeft = `${-size / 2}px`;
    el.style.marginTop = `${-size / 2}px`;

    const rotate = id === "pitch" ? " rotate(90deg)" : "";
    el.style.transform = `translate3d(${center.x}px, ${center.y}px, 0)${rotate}`;
  }
}

export function destroyRotationRings(pack) {
  pack?.root?.remove();
  pack?.rings?.clear?.();
}

function makeRing(type) {
  const el = document.createElement("button");
  el.type = "button";
  el.dataset.ring = type;

  Object.assign(el.style, {
    position: "absolute",
    borderRadius: "999px",
    background: "transparent",
    border: type === "yaw"
      ? "14px solid rgba(255,211,106,0.28)"
      : "14px solid rgba(185,178,255,0.24)",
    pointerEvents: "auto",
    touchAction: "none",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent"
  });

  return el;
}

// CHANGELOG v2:
// • Rotation rings теперь читают state.projectionData.
// • Убран старый доступ к state.projection как payload.
// • yaw/pitch логика сохранена.
// • DOM-слой не содержит EventBus и Store-логики.