// ======================================================
// Dain_Coin — entityToolbar.js v1
// Entity Editor toolbar module
// ======================================================
//
// CHANGELOG v1:
// • Новый отдельный модуль toolbar для Entity Editor
// • Кнопки Move / Rotate / Scale вынесены из entityStage3D
// • Delete и Save работают через EventBus
// • Активный инструмент публикуется как entityEditor:setTool
// • Добавлены Inspector-параметры позиции, масштаба и прозрачности
// ======================================================

import { defineModule } from "../../engine/moduleFactory.js";

const KEY = "__entityToolbarModule";

export const registerEntityToolbarModule = defineModule({
  key: KEY,
  name: "Entity Toolbar",

  inspector: {
    "Показать toolbar": {
      param: "visible",
      type: "toggle",
      value: true
    },
    "Размер кнопок": {
      param: "buttonHeight",
      type: "range",
      min: 28,
      max: 48,
      step: 1,
      value: 34
    },
    "Прозрачность фона": {
      param: "panelOpacity",
      type: "range",
      min: 0.2,
      max: 0.8,
      step: 0.02,
      value: 0.42
    },
    "Позиция": {
      param: "position",
      type: "select",
      value: "top-left",
      options: ["top-left", "top-right", "bottom-left", "bottom-right"]
    }
  },

  dependencies: ["__entityEditorLogicModule", "__entityStage3DModule"],

  createState() {
    return {
      params: {
        visible: true,
        buttonHeight: 34,
        panelOpacity: 0.42,
        position: "top-left"
      },

      root: null,
      activeTool: "move",
      buttons: new Map(),
      unsubDraft: null,
      selectedNodeId: null
    };
  },

  onStart({ ctx, state, bus, store }) {
    createDOM(ctx.container, state, bus);
    applyParams(state);
    emitTool(state, bus);

    state.unsubDraft = store.subscribe("entityDraft", draft => {
      state.selectedNodeId = draft?.selectedNodeId || null;
      refreshButtons(state);
    });

    const draft = store.get("entityDraft");
    state.selectedNodeId = draft?.selectedNodeId || null;
    refreshButtons(state);
  },

  onDisable({ state }) {
    try { state.unsubDraft?.(); } catch (_) {}
    state.unsubDraft = null;

    if (state.root) state.root.remove();

    state.root = null;
    state.buttons.clear();
    state.selectedNodeId = null;
  },

  onParam({ param, value, state }) {
    state.params[param] = value;
    applyParams(state);
  }
});

function createDOM(container, state, bus) {
  const root = document.createElement("div");
  Object.assign(root.style, {
    position: "fixed",
    zIndex: "130",
    display: "flex",
    gap: "8px",
    padding: "8px",
    borderRadius: "18px",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.12)",
    pointerEvents: "auto",
    touchAction: "manipulation"
  });

  [
    ["move", "Move"],
    ["rotate", "Rotate"],
    ["scale", "Scale"]
  ].forEach(([tool, label]) => {
    const btn = makeToolButton(label);

    btn.onclick = () => {
      state.activeTool = tool;
      refreshButtons(state);
      emitTool(state, bus);
    };

    btn.dataset.tool = tool;
    state.buttons.set(tool, btn);
    root.appendChild(btn);
  });

  const del = makeToolButton("Delete");
  del.onclick = () => {
    bus.emit("entityEditor:deleteSelected");
  };
  del.dataset.action = "delete";
  state.buttons.set("delete", del);
  root.appendChild(del);

  const save = makeToolButton("Save");
  save.onclick = () => {
    const name = prompt("Название пресета?", "Custom Part");

    bus.emit("entityEditor:saveAsPreset", {
      name: name || "Custom Part",
      slot: "custom"
    });
  };
  save.dataset.action = "save";
  state.buttons.set("save", save);
  root.appendChild(save);

  container.appendChild(root);
  state.root = root;

  refreshButtons(state);
}

function makeToolButton(label) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;

  Object.assign(btn.style, {
    height: "34px",
    padding: "0 12px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent"
  });

  return btn;
}

function emitTool(state, bus) {
  bus.emit("entityEditor:setTool", {
    tool: state.activeTool
  });
}

function refreshButtons(state) {
  for (const [key, btn] of state.buttons.entries()) {
    const active = key === state.activeTool;

    if (btn.dataset.tool) {
      btn.style.background = active
        ? "rgba(0,204,255,0.22)"
        : "rgba(255,255,255,0.08)";

      btn.style.borderColor = active
        ? "rgba(0,204,255,0.7)"
        : "rgba(255,255,255,0.14)";
    }

    if (key === "delete") {
      btn.disabled = !state.selectedNodeId;
      btn.style.opacity = state.selectedNodeId ? "1" : "0.42";
    }
  }
}

function applyParams(state) {
  if (!state.root) return;

  state.root.style.display = state.params.visible ? "flex" : "none";
  state.root.style.background = `rgba(0,0,0,${Number(state.params.panelOpacity) || 0.42})`;

  for (const btn of state.buttons.values()) {
    btn.style.height = `${Number(state.params.buttonHeight) || 34}px`;
  }

  applyPosition(state);
}

function applyPosition(state) {
  if (!state.root) return;

  const pos = state.params.position || "top-left";

  state.root.style.left = "";
  state.root.style.right = "";
  state.root.style.top = "";
  state.root.style.bottom = "";

  if (pos === "top-left") {
    state.root.style.left = "12px";
    state.root.style.top = "calc(var(--safe-top, 0px) + 12px)";
  }

  if (pos === "top-right") {
    state.root.style.right = "12px";
    state.root.style.top = "calc(var(--safe-top, 0px) + 12px)";
  }

  if (pos === "bottom-left") {
    state.root.style.left = "12px";
    state.root.style.bottom = "calc(var(--safe-bottom, 0px) + 12px)";
  }

  if (pos === "bottom-right") {
    state.root.style.right = "12px";
    state.root.style.bottom = "calc(var(--safe-bottom, 0px) + 12px)";
  }
}

