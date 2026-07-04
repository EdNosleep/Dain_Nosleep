// ======================================================
// NOSLEEP_ENGINE — gizmoInfoPanel.js v1
// Selected node live transform info panel
// ======================================================

import { defineModule } from "../../../engine/moduleFactory.js";

const KEY = "__gizmoInfoPanelModule";

export const registerGizmoInfoPanelModule = defineModule({
  key: KEY,
  name: "Gizmo Info Panel",

  inspector: {
    "InfoPanel включён": { param: "enabled", type: "toggle", value: true },
    "InfoPanel scale": { param: "scale", type: "range", min: 0.75, max: 1.35, step: 0.05, value: 1 },
    "InfoPanel top": { param: "top", type: "range", min: 60, max: 260, step: 5, value: 92 },
    "InfoPanel left": { param: "left", type: "range", min: 8, max: 120, step: 4, value: 14 }
  },

  dependencies: ["__entityEditorLogicModule", "__gizmoStateControllerModule"],

  createState() {
    return {
      params: {
        enabled: true,
        scale: 1,
        top: 92,
        left: 14
      },

      root: null,
      rows: new Map(),

      draft: null,
      selectedNode: null,
      visible: false
    };
  },

  onStart({ ctx, store, bus, state }) {
    state.root = createRoot();
    ctx.container.appendChild(state.root);

    createRows(state);

    bus.on("entityGizmo:presentationChanged", payload => {
      const presentation = payload?.presentation || null;
      state.visible = !!presentation?.ui?.infoPanel;
      applyPanelState(state);
    }, { moduleKey: KEY });

    bus.on("entityGizmo:layoutChanged", payload => {
      const presentation = payload?.presentation || null;
      const layout = payload?.layout || presentation?.layout || null;
      state.visible = !!presentation?.ui?.infoPanel || !!layout?.infoPanel;
      applyPanelState(state);
    }, { moduleKey: KEY });

    state.unsubDraft = store.subscribe("entityDraft", draft => {
      state.draft = draft || null;
      updateSelectedNode(state);
      renderValues(state);
      applyPanelState(state);
    });

    state.draft = store.get("entityDraft") || null;
    updateSelectedNode(state);
    renderValues(state);
    applyPanelState(state);
  },

  onDisable({ state }) {
    try { state.unsubDraft?.(); } catch (_) {}
    state.unsubDraft = null;

    state.rows.clear();
    state.root?.remove();
    state.root = null;
    state.draft = null;
    state.selectedNode = null;
    state.visible = false;
  },

  onParam({ param, value, state }) {
    state.params[param] = value;
    applyPanelState(state);
  }
});

function createRoot() {
  const root = document.createElement("div");
  root.className = "nosleep-gizmo-info-panel";

  Object.assign(root.style, {
    position: "absolute",
    left: "14px",
    top: "92px",
    zIndex: "998",
    width: "172px",
    padding: "10px",
    borderRadius: "18px",
    background: "rgba(14,18,28,0.56)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.18)",
    boxShadow: "0 16px 45px rgba(0,0,0,0.28)",
    color: "#ffffff",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    pointerEvents: "none",
    opacity: "0",
    transform: "scale(1)",
    transformOrigin: "top left",
    transition: "opacity 0.18s ease, transform 0.18s ease"
  });

  const title = document.createElement("div");
  title.textContent = "TRANSFORM";

  Object.assign(title.style, {
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "0.14em",
    opacity: "0.72",
    marginBottom: "8px"
  });

  root.appendChild(title);
  return root;
}

function createRows(state) {
  const fields = [
    ["px", "PX"], ["py", "PY"], ["pz", "PZ"],
    ["rx", "RX"], ["ry", "RY"], ["rz", "RZ"],
    ["sx", "SX"], ["sy", "SY"], ["sz", "SZ"]
  ];

  for (const [key, label] of fields) {
    const row = document.createElement("div");
    const l = document.createElement("span");
    const v = document.createElement("span");

    l.textContent = label;
    v.textContent = "0.00";

    Object.assign(row.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      height: "18px",
      fontSize: "11px",
      fontWeight: "700"
    });

    Object.assign(l.style, {
      opacity: "0.55"
    });

    Object.assign(v.style, {
      fontVariantNumeric: "tabular-nums",
      opacity: "0.95"
    });

    row.appendChild(l);
    row.appendChild(v);
    state.root.appendChild(row);
    state.rows.set(key, v);
  }
}

function updateSelectedNode(state) {
  const nodeId = state.draft?.selectedNodeId || null;
  const nodes = Array.isArray(state.draft?.nodes) ? state.draft.nodes : [];
  state.selectedNode = nodes.find(n => n.id === nodeId) || null;
}

function renderValues(state) {
  const node = state.selectedNode;
  const t = node?.transform || {};
  const p = t.position || {};
  const r = t.rotation || {};
  const s = t.scale || {};

  setRow(state, "px", p.x, 2);
  setRow(state, "py", p.y, 2);
  setRow(state, "pz", p.z, 2);

  setRow(state, "rx", r.x, 1);
  setRow(state, "ry", r.y, 1);
  setRow(state, "rz", r.z, 1);

  setRow(state, "sx", s.x, 2);
  setRow(state, "sy", s.y, 2);
  setRow(state, "sz", s.z, 2);
}

function setRow(state, key, value, digits) {
  const el = state.rows.get(key);
  if (!el) return;

  const n = Number(value);
  el.textContent = Number.isFinite(n) ? n.toFixed(digits) : "0.00";
}

function applyPanelState(state) {
  if (!state.root) return;

  const visible =
    !!state.params.enabled &&
    !!state.visible &&
    !!state.selectedNode;

  const scale = Number(state.params.scale) || 1;
  const top = Number(state.params.top) || 92;
  const left = Number(state.params.left) || 14;

  state.root.style.opacity = visible ? "1" : "0";
  state.root.style.left = `${left}px`;
  state.root.style.top = `${top}px`;
  state.root.style.transform = `scale(${scale})`;
}

// CHANGELOG v1:
// • Добавлена InfoPanel для выбранной фигуры.
// • Показывает Position X/Y/Z, Rotation X/Y/Z, Scale X/Y/Z.
// • Слушает entityGizmo:presentationChanged и layoutChanged fallback.
// • Читает entityDraft через Store subscribe.
// • Пока только отображает значения, без редактирования.
// • Добавлены Inspector параметры enabled / scale / top / left.

