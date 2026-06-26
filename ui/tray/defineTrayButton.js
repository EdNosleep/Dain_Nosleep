// ======================================================
// Dain_Coin — defineTrayButton (v1.4)
// Fixed custom createState merge
// ======================================================
//
// CHANGELOG v1.4:
// • Исправлен критический баг: config.createState больше не игнорируется.
// • Inspector снова получает STORAGE_KEY в state.
// • Параметры Inspector сохраняются в правильный localStorage key.
// • Сохранён авто-параметр iconSize.
// • Сохранён live-update размера иконки.
// ======================================================

import { defineModule } from "../../engine/moduleFactory.js";

export function defineTrayButton(config) {
  const {
    key,
    name,

    id,
    order = 0,

    icon,
    iconSrc,
    iconSize = 28,
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
      const customState =
        typeof createState === "function"
          ? createState()
          : {};

      return {
        ...customState,
        params: {
          ...(customState.params || {}),
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