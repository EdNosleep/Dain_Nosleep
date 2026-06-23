// ======================================================
// Dain_Coin — entityStageDom.js v3
// Inspector-driven viewport lift
// ======================================================

const DEFAULT_BACKGROUND =
  "radial-gradient(circle at 55% 30%, #2b2b36 0%, #14141b 48%, #09090d 100%)";

export function createStageDOM(container, state) {
  const root = document.createElement("div");
  Object.assign(root.style, {
    position: "fixed",
    inset: "0",
    zIndex: "100",
    overflow: "hidden",
    touchAction: "none",
    background: DEFAULT_BACKGROUND,
    transform: "translate3d(0, 0, 0)",
    transition: "transform 260ms ease",
    willChange: "transform"
  });

  const canvasHost = document.createElement("div");
  Object.assign(canvasHost.style, {
    position: "absolute",
    inset: "0"
  });

  root.append(canvasHost);
  container.appendChild(root);

  state.root = root;
  state.canvasHost = canvasHost;
  state.viewportLiftPx = 0;

  applyStageBackground(state);
}

export function applyStageBackground(state) {
  if (!state.root) return;

  if (state.params.transparentBackground) {
    state.root.style.background = "transparent";
    return;
  }

  const color = String(state.params.backgroundColor || "").trim();
  state.root.style.background = color || DEFAULT_BACKGROUND;
}

export function applyStageViewportLift(state, payload = {}) {
  if (!state.root) return;

  const bottom = clampNumber(payload.bottom, 0, window.innerHeight);
  const dragging = !!payload.dragging;
  const liftFactor = clampNumber(state.params.viewportLiftFactor ?? 0.45, 0, 1);

  const liftPx = bottom * liftFactor;
  state.viewportLiftPx = liftPx;

  state.root.style.transition = dragging
    ? "none"
    : "transform 260ms ease";

  state.root.style.transform =
    `translate3d(0, ${-liftPx}px, 0)`;
}

function clampNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

// CHANGELOG v3:
// • Lift Factor теперь берётся из state.params.viewportLiftFactor.
// • Сохранён transform-based lift без resize renderer.
// • Сцена продолжает подниматься realtime при drag панели.