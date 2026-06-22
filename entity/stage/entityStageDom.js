// ======================================================
// Dain_Coin — entityStageDom.js v1
// Private DOM helper for Entity Stage 3D
// ======================================================
//
// CHANGELOG v1:
// • Вынесено создание DOM сцены
// • Вынесено применение background / transparentBackground
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
    background: DEFAULT_BACKGROUND
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

