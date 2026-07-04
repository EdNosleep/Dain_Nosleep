// ======================================================
// NOSLEEP_ENGINE — gizmoToolDock.js v2
// Floating Gizmo Tool Dock + startup sync
// ======================================================

import { defineModule } from "../../../engine/moduleFactory.js";
import { getGizmoTools } from "../presentation/gizmoToolResolver.js";

const KEY = "__gizmoToolDockModule";

export const registerGizmoToolDockModule = defineModule({
  key: KEY,
  name: "Gizmo Tool Dock",

  inspector: {
    "ToolDock включён": { param: "enabled", type: "toggle", value: true },
    "ToolDock scale": { param: "scale", type: "range", min: 0.75, max: 1.4, step: 0.05, value: 1 },
    "ToolDock bottom": { param: "bottom", type: "range", min: 80, max: 420, step: 5, value: 210 }
  },

  dependencies: ["__gizmoStateControllerModule"],

  createState() {
    return {
      params: { enabled: true, scale: 1, bottom: 210 },
      root: null,
      buttons: new Map(),
      activeTool: "default",
      visible: false
    };
  },

  onStart({ ctx, bus, state }) {
    state.root = createDockRoot();
    ctx.container.appendChild(state.root);

    for (const tool of getGizmoTools()) {
      const button = createToolButton(tool);

      button.addEventListener("pointerdown", e => {
        e.preventDefault();
        e.stopPropagation();
        bus.emit("entityGizmo:setTool", { tool });
      });

      state.root.appendChild(button);
      state.buttons.set(tool, button);
    }

    bus.on("entityGizmo:presentationChanged", payload => {
      applyPresentationPayload(state, payload);
    }, { moduleKey: KEY });

    bus.on("entityGizmo:layoutChanged", payload => {
      applyPresentationPayload(state, payload);
    }, { moduleKey: KEY });

    applyDockState(state);

    requestAnimationFrame(() => {
      bus.emit("entityGizmo:resetTool", { reason: "toolDockStartupSync" });
    });
  },

  onDisable({ state }) {
    state.buttons.clear();
    state.root?.remove();
    state.root = null;
  },

  onParam({ param, value, state }) {
    state.params[param] = value;
    applyDockState(state);
  }
});

function applyPresentationPayload(state, payload = {}) {
  const presentation = payload.presentation || null;
  const layout = payload.layout || presentation?.layout || null;

  state.activeTool = presentation?.activeTool || payload.tool || "default";
  state.visible = !!presentation?.ui?.toolDock || !!layout?.toolDock;

  applyDockState(state);
}

function createDockRoot() {
  const root = document.createElement("div");

  Object.assign(root.style, {
    position: "absolute",
    left: "50%",
    bottom: "210px",
    transform: "translateX(-50%) scale(1)",
    zIndex: "999",
    display: "flex",
    gap: "8px",
    padding: "8px",
    borderRadius: "999px",
    background: "rgba(14,18,28,0.62)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.22)",
    boxShadow: "0 16px 45px rgba(0,0,0,0.32)",
    pointerEvents: "none",
    opacity: "0",
    transition: "opacity 0.18s ease, transform 0.18s ease"
  });

  return root;
}

function createToolButton(tool) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = getToolLabel(tool);

  Object.assign(button.style, {
    width: "42px",
    height: "42px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.22)",
    background: "rgba(255,255,255,0.12)",
    color: "#fff",
    fontSize: "11px",
    fontWeight: "900",
    outline: "none",
    touchAction: "none"
  });

  return button;
}

function applyDockState(state) {
  if (!state.root) return;

  const visible = !!state.params.enabled && !!state.visible;
  const scale = Number(state.params.scale) || 1;
  const bottom = Number(state.params.bottom) || 210;

  state.root.style.opacity = visible ? "1" : "0";
  state.root.style.pointerEvents = visible ? "auto" : "none";
  state.root.style.bottom = `${bottom}px`;
  state.root.style.transform = `translateX(-50%) scale(${scale})`;

  for (const [tool, button] of state.buttons.entries()) {
    const active = tool === state.activeTool;

    button.style.background = active
      ? "rgba(255,211,106,0.95)"
      : "rgba(255,255,255,0.12)";

    button.style.color = active ? "#151515" : "#ffffff";
  }
}

function getToolLabel(tool) {
  if (tool === "stretch") return "STR";
  if (tool === "rotate") return "ROT";
  if (tool === "scale") return "SCL";
  return "ALL";
}

// CHANGELOG v2:
// • Добавлен startup sync через entityGizmo:resetTool.
// • Добавлен fallback на entityGizmo:layoutChanged.
// • ToolDock теперь не пропускает первое состояние Presentation.
// • zIndex поднят до 999.
// • bottom по умолчанию поднят до 210px.