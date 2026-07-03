// ======================================================
// NOSLEEP_ENGINE — visualEngine.js v3
// Global Visual Engine + helper-ready pulse defaults
// ======================================================

import { defineModule } from "../engine/moduleFactory.js";
import { createVisualStateController } from "./visualStateController.js";
import { createVisualRuntime } from "./visualRuntime.js";

const KEY = "__visualEngineModule";

export const registerVisualEngineModule = defineModule({
  key: KEY,
  name: "Visual Engine",

  inspector: {
    "Visual Engine включён": { param: "enabled", type: "toggle", value: true },

    "Pulse цвет": { param: "pulseColor", type: "color", value: "#00ccff" },
    "Pulse opacity": { param: "pulseOpacity", type: "range", min: 0.05, max: 1, step: 0.05, value: 0.72 },
    "Pulse rings": { param: "pulseRings", type: "range", min: 1, max: 12, step: 1, value: 5 },
    "Pulse interval": { param: "pulseInterval", type: "range", min: 30, max: 260, step: 10, value: 90 },
    "Pulse duration": { param: "pulseDuration", type: "range", min: 220, max: 1800, step: 20, value: 760 },
    "Pulse radius": { param: "pulseRadius", type: "range", min: 12, max: 220, step: 2, value: 74 },
    "Pulse glow": { param: "pulseGlow", type: "range", min: 0, max: 60, step: 1, value: 24 },
    "Pulse line width": { param: "pulseLineWidth", type: "range", min: 1, max: 10, step: 0.5, value: 2.5 }
  },

  dependencies: [],

  createState() {
    return {
      params: {
        enabled: true,
        pulseColor: "#00ccff",
        pulseOpacity: 0.72,
        pulseRings: 5,
        pulseInterval: 90,
        pulseDuration: 760,
        pulseRadius: 74,
        pulseGlow: 24,
        pulseLineWidth: 2.5
      },
      controller: null,
      runtime: null
    };
  },

  onStart({ ctx, bus, state }) {
    state.runtime = createVisualRuntime({ root: ctx.container });

    state.controller = createVisualStateController({
      runtime: state.runtime,
      getParams: () => state.params
    });

    bus.on("visual:play", payload => {
      if (!state.params.enabled) return;
      state.controller.play(payload);
    }, { moduleKey: KEY });

    bus.on("visual:move", payload => {
      if (!state.params.enabled) return;
      state.controller.move(payload);
    }, { moduleKey: KEY });

    bus.on("visual:stop", payload => {
      state.controller.stop(payload);
    }, { moduleKey: KEY });

    bus.on("visual:clear", () => {
      state.controller.clear();
    }, { moduleKey: KEY });
  },

  onDisable({ state }) {
    state.controller?.clear();
    state.runtime?.destroy();

    state.controller = null;
    state.runtime = null;
  },

  onParam({ param, value, state }) {
    state.params[param] = value;
  }
});

// CHANGELOG v3:
// • Добавлен visual:move для эффектов, следующих за пальцем.
// • Pulse defaults настроены под hold-effect.
// • Visual Engine остаётся глобальным, не entity-specific.
// • API visual:play / visual:move / visual:stop / visual:clear сохранён.
// • Подготовлено подключение helper-модулей эффектов.