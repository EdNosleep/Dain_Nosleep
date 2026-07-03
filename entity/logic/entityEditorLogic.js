// ======================================================
// Dain_Coin — entityEditorLogic.js (v1)
// Single Authority for 3D entity draft
// ======================================================

import { defineModule } from "../../engine/moduleFactory.js";
import { getPrimitiveDef } from "../data/primitiveCatalog.js";

const KEY = "__entityEditorLogicModule";

export const registerEntityEditorLogicModule = defineModule({
  key: KEY,
  name: "Entity Editor Logic",

  inspector: {
    "Автовыбор нового объекта": {
      param: "autoSelectNewNode",
      type: "toggle",
      value: 1
    },
    "Шаг перемещения": {
      param: "moveStep",
      type: "range",
      min: 0.05,
      max: 1,
      step: 0.05,
      value: 0.2
    },
    "Шаг вращения": {
      param: "rotateStep",
      type: "range",
      min: 5,
      max: 45,
      step: 5,
      value: 15
    },
    "Шаг масштаба": {
      param: "scaleStep",
      type: "range",
      min: 0.05,
      max: 0.5,
      step: 0.05,
      value: 0.1
    }
  },

  dependencies: [],

  createState() {
    return {
      params: {
        autoSelectNewNode: true,
        moveStep: 0.2,
        rotateStep: 15,
        scaleStep: 0.1
      }
    };
  },

  onStart({ bus, store, state }) {
    ensureDraft(store);
    ensurePresets(store);

    bus.on("entityEditor:addPrimitive", payload => {
      const primitiveId = payload?.primitiveId;
      const def = getPrimitiveDef(primitiveId);
      if (!def) {
        bus.emit("entityEditor:error", { reason: "unknownPrimitive", primitiveId });
        return;
      }

      const draft = getDraft(store);
      const node = createNode(def, payload?.transform);

      const nextDraft = {
        ...draft,
        selectedNodeId: state.params.autoSelectNewNode ? node.id : draft.selectedNodeId,
        nodes: [...draft.nodes, node],
        updatedAt: Date.now()
      };

      store.set("entityDraft", nextDraft);
      bus.emit("entityEditor:draftChanged", nextDraft);
      bus.emit("entityEditor:nodeAdded", { node });
    }, { moduleKey: KEY, priority: 10 });

    bus.on("entityEditor:selectNode", ({ nodeId } = {}) => {
      const draft = getDraft(store);
      const exists = !nodeId || draft.nodes.some(n => n.id === nodeId);
      if (!exists) return;

      const nextDraft = {
        ...draft,
        selectedNodeId: nodeId || null,
        updatedAt: Date.now()
      };

      store.set("entityDraft", nextDraft);
      bus.emit("entityEditor:selectionChanged", { nodeId: nextDraft.selectedNodeId });
      bus.emit("entityEditor:draftChanged", nextDraft);
    }, { moduleKey: KEY, priority: 10 });

    bus.on("entityEditor:transformNode", ({ nodeId, transform } = {}) => {
      if (!nodeId || !transform) return;

      const draft = getDraft(store);
      const nextNodes = draft.nodes.map(node => {
        if (node.id !== nodeId) return node;

        return {
          ...node,
          transform: mergeTransform(node.transform, transform)
        };
      });

      const nextDraft = {
        ...draft,
        nodes: nextNodes,
        updatedAt: Date.now()
      };

      store.set("entityDraft", nextDraft);
      bus.emit("entityEditor:draftChanged", nextDraft);
    }, { moduleKey: KEY, priority: 10 });

    bus.on("entityEditor:deleteSelected", () => {
      const draft = getDraft(store);
      if (!draft.selectedNodeId) return;

      const nextDraft = {
        ...draft,
        selectedNodeId: null,
        nodes: draft.nodes.filter(n => n.id !== draft.selectedNodeId),
        updatedAt: Date.now()
      };

      store.set("entityDraft", nextDraft);
      bus.emit("entityEditor:draftChanged", nextDraft);
    }, { moduleKey: KEY, priority: 10 });

    bus.on("entityEditor:clearDraft", () => {
      const nextDraft = createEmptyDraft();
      store.set("entityDraft", nextDraft);
      bus.emit("entityEditor:draftChanged", nextDraft);
    }, { moduleKey: KEY, priority: 10 });

    bus.on("entityEditor:saveAsPreset", ({ name = "Custom Part", slot = "custom" } = {}) => {
      const draft = getDraft(store);
      if (!draft.nodes.length) {
        bus.emit("entityEditor:error", { reason: "emptyDraft" });
        return;
      }

      const preset = {
        id: `preset_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`,
        version: 1,
        type: "entityPreset",
        name,
        slot,
        source: "entityDraft",
        nodes: JSON.parse(JSON.stringify(draft.nodes)),
        createdAt: Date.now()
      };

      const presets = store.get("customEntityPresets");
      const nextPresets = Array.isArray(presets) ? [...presets, preset] : [preset];

      store.set("customEntityPresets", nextPresets);
      bus.emit("entityEditor:presetSaved", { preset });
    }, { moduleKey: KEY, priority: 10 });
  },

  onDisable() {},

  onParam({ param, value, state }) {
    state.params[param] = value;
  }
});

function ensureDraft(store) {
  const draft = store.get("entityDraft");
  if (!draft || typeof draft !== "object") {
    store.set("entityDraft", createEmptyDraft());
  }
}

function ensurePresets(store) {
  const presets = store.get("customEntityPresets");
  if (!Array.isArray(presets)) {
    store.set("customEntityPresets", []);
  }
}

function getDraft(store) {
  const draft = store.get("entityDraft");
  if (!draft || typeof draft !== "object") return createEmptyDraft();

  return {
    id: draft.id || "entity_draft_001",
    version: draft.version || 1,
    selectedNodeId: draft.selectedNodeId || null,
    nodes: Array.isArray(draft.nodes) ? draft.nodes : [],
    updatedAt: draft.updatedAt || Date.now()
  };
}

function createEmptyDraft() {
  return {
    id: "entity_draft_001",
    version: 1,
    selectedNodeId: null,
    nodes: [],
    updatedAt: Date.now()
  };
}

function createNode(def, transform = {}) {
  return {
    id: `node_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`,
    primitiveId: def.id,
    name: def.name,
    geometry: def.geometry,
    material: {
      color: def.color
    },
    transform: {
      position: {
        x: transform?.position?.x ?? 0,
        y: transform?.position?.y ?? 0,
        z: transform?.position?.z ?? 0
      },
      rotation: {
        x: transform?.rotation?.x ?? 0,
        y: transform?.rotation?.y ?? 0,
        z: transform?.rotation?.z ?? 0
      },
      scale: {
        x: transform?.scale?.x ?? def.defaultScale?.x ?? 1,
        y: transform?.scale?.y ?? def.defaultScale?.y ?? 1,
        z: transform?.scale?.z ?? def.defaultScale?.z ?? 1
      }
    }
  };
}

function mergeTransform(prev, patch) {
  return {
    position: {
      x: patch?.position?.x ?? prev.position.x,
      y: patch?.position?.y ?? prev.position.y,
      z: patch?.position?.z ?? prev.position.z
    },
    rotation: {
      x: patch?.rotation?.x ?? prev.rotation.x,
      y: patch?.rotation?.y ?? prev.rotation.y,
      z: patch?.rotation?.z ?? prev.rotation.z
    },
    scale: {
      x: patch?.scale?.x ?? prev.scale.x,
      y: patch?.scale?.y ?? prev.scale.y,
      z: patch?.scale?.z ?? prev.scale.z
    }
  };
}

// CHANGELOG v1:
// • Создан Single Authority для entityDraft
// • Добавлены add/select/transform/delete/clear/savePreset события
// • UI и Stage не пишут Store напрямую
// • customEntityPresets сохраняются через logic-модуль

