// ======================================================
// NOSLEEP_ENGINE — visualRuntime.js v3
// Global Visual effects runtime executor + move support
// ======================================================

import {
  playConcentricPulse,
  moveConcentricPulse,
  stopConcentricPulse
} from "./effects/concentricPulse.js";

export function createVisualRuntime({ root }) {
  const layer = createLayer();
  root.appendChild(layer);

  return {
    layer,

    play(intent) {
      if (intent.effect === "concentricPulse") {
        return playConcentricPulse({ layer, intent });
      }
      return null;
    },

    move(instance, target) {
      if (!instance) return;

      if (instance.effect === "concentricPulse") {
        moveConcentricPulse(instance, target);
      }
    },

    stop(instance) {
      if (!instance) return;

      if (instance.effect === "concentricPulse") {
        stopConcentricPulse(instance);
      }
    },

    destroy() {
      try {
        while (layer.firstChild) layer.firstChild.remove();
        layer.remove();
      } catch (_) {}
    }
  };
}

function createLayer() {
  const layer = document.createElement("div");

  Object.assign(layer.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    overflow: "hidden",
    zIndex: "1200",
    contain: "layout paint style"
  });

  layer.dataset.visualEngine = "true";
  return layer;
}

// CHANGELOG v3:
// • Добавлен runtime.move().
// • concentricPulse теперь может следовать за пальцем.
// • Runtime остаётся DOM overlay executor.
// • Runtime не знает источник intent.
// • destroy полностью очищает DOM.