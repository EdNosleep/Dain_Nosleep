// ======================================================
// Dain_Coin — defineTrayButton (v1.3)
// ======================================================
//
// CHANGELOG v1.3:
// • Авто-параметр iconSize в Inspector
// • Дефолт берётся из config.iconSize
// • Live-обновление размера иконки
// ======================================================

import { defineModule } from "./moduleFactory.js";

export function defineTrayButton(config) {
  const {
    key,
    name,

    id,
    order = 0,

    icon,
    iconSrc,
    iconSize = 28,        // 👈 дефолт здесь
    preferImg = false,

    resolveIcon,
    panel,

    inspector = {},
    createState,
    onStart,
    onDisable,
    onParam
  } = config || {};

  if (!key) {
    throw new Error("[defineTrayButton] key is required");
  }

  const trayId = id || key;

  // 👇 АВТО-INSPECTOR
  const finalInspector = {
    "Размер иконки (px)": {
      min: 16,
      max: 64,
      step: 1,
      value: iconSize,
      param: "iconSize",
      type: "slider"
    },
    ...inspector
  };

  return defineModule({
    key,
    name: name || key.replace(/^__/, ""),
    inspector: finalInspector,
    dependencies: ["__trayModule", "__trayPanelModule"],

    createState() {
      return {
        params: {
          iconSize
        }
      };
    },

    async onStart(args) {
      const { bus, state, core } = args;

      if (typeof onStart === "function") {
        await onStart(args);
      }

      let resolved = {};
      if (typeof resolveIcon === "function") {
        resolved = await resolveIcon(args) || {};
      }

      bus.emit("tray:registerButton", {
        id: trayId,
        order,
        icon: resolved.icon ?? icon,
        iconSrc: resolved.iconSrc ?? iconSrc,
        preferImg: resolved.preferImg ?? preferImg,
        iconSize: state.params.iconSize,

        onClick() {
          if (!panel) {
            bus.emit("tray:openPanel");
            return;
          }

          bus.emit("tray:openPanel", {
            source: trayId,
            mount({ container }) {
              return panel({
                container,
                bus,
                store: core.getStore(),
                core,
                state
              });
            }
          });
        }
      });
    },

    onParam({ param, value, bus, state }) {
      if (param === "iconSize") {
        state.params.iconSize = value;

        // 🔥 live update
        bus.emit("tray:updateButton", {
          id: trayId,
          iconSize: value
        });
      }

      if (typeof onParam === "function") {
        onParam({ param, value, bus, state });
      }
    },

    onDisable
  });
}