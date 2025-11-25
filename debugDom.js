// ===========================================
// DEBUG DOM MARKER — v1
// Помечает каждый div рамкой и номером
// ===========================================

import { defineModule } from "./moduleFactory.js";

export const registerDebugDomModule = defineModule({
  key: "__debugDom",
  name: "DEBUG DOM",
  inspector: {},

  dependencies: [],

  createState() {
    return {};
  },

  onStart({ ctx }) {
    let i = 0;

    ctx.container.querySelectorAll("div").forEach(div => {
      i++;

      div.style.outline = "2px dashed rgba(0,255,0,0.4)";
      div.style.position = "relative";

      const label = document.createElement("div");
      label.textContent = "#" + i;
      Object.assign(label.style, {
        position: "absolute",
        left: "0",
        top: "0",
        padding: "2px 4px",
        fontSize: "10px",
        background: "rgba(0,255,0,0.4)",
        color: "#000",
        zIndex: "999999"
      });

      div.appendChild(label);
    });
  },

  onDisable() {}
});

