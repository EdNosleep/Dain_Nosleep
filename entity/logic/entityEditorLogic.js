// ======================================================
// Dain_Coin — entityEditorLogic.js v5
// Quaternion rotation authority + local/world axis rotate
// ======================================================

import { defineModule } from "../../engine/moduleFactory.js";
import { getPrimitiveDef } from "../data/primitiveCatalog.js";

const KEY = "__entityEditorLogicModule";

export const registerEntityEditorLogicModule = defineModule({
  key: KEY,
  name: "Entity Editor Logic",

  inspector: {
    "Автовыбор нового объекта": { param: "autoSelectNewNode", type: "toggle", value: 1 },
    "Шаг перемещения": { param: "moveStep", type: "range", min: 0.05, max: 1, step: 0.05, value: 0.2 },
    "Шаг вращения": { param: "rotateStep", type: "range", min: 5, max: 45, step: 5, value: 15 },
    "Шаг масштаба": { param: "scaleStep", type: "range", min: 0.05, max: 0.5, step: 0.05, value: 0.1 },
    "Мин. Stretch": { param: "minStretch", type: "range", min: 0.05, max: 0.5, step: 0.05, value: 0.1 },
    "Макс. Stretch": { param: "maxStretch", type: "range", min: 2, max: 12, step: 0.25, value: 8 }
  },

  dependencies: [],

  createState() {
    return {
      params: {
        autoSelectNewNode: true,
        moveStep: 0.2,
        rotateStep: 15,
        scaleStep: 0.1,
        minStretch: 0.1,
        maxStretch: 8
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

      const draft = normalizeDraft(getDraft(store));
      const node = createNode(def, payload?.transform);

      setDraft(store, bus, {
        ...draft,
        selectedNodeId: state.params.autoSelectNewNode ? node.id : draft.selectedNodeId,
        nodes: [...draft.nodes, node]
      });

      bus.emit("entityEditor:nodeAdded", { node });
    }, { moduleKey: KEY, priority: 10 });

    bus.on("entityEditor:selectNode", ({ nodeId } = {}) => {
      const draft = normalizeDraft(getDraft(store));
      const exists = !nodeId || draft.nodes.some(n => n.id === nodeId);
      if (!exists) return;

      setDraft(store, bus, {
        ...draft,
        selectedNodeId: nodeId || null
      });
    }, { moduleKey: KEY, priority: 10 });

    bus.on("entityEditor:transformNode", ({ nodeId, transform } = {}) => {
      if (!nodeId || !transform) return;

      updateNode(store, bus, nodeId, node => ({
        ...node,
        transform: mergeTransform(node.transform, transform)
      }));
    }, { moduleKey: KEY, priority: 10 });

    bus.on("entityEditor:stretchNode", ({ nodeId, axis, sign, amount } = {}) => {
      if (!nodeId || !axis || !Number.isFinite(Number(amount))) return;

      updateNode(store, bus, nodeId, node => {
        const transform = normalizeTransform(node.transform);
        const stretch = normalizeStretch(node.stretch);

        const direction = Number(sign) >= 0 ? 1 : -1;
        const minStretch = Number(state.params.minStretch) || 0.1;
        const maxStretch = Number(state.params.maxStretch) || 8;

        const prev = Number(stretch[axis]) || 1;
        const next = clamp(prev + Number(amount), minStretch, maxStretch);
        const delta = next - prev;

        if (Math.abs(delta) < 0.000001) return node;

        const nextStretch = {
          ...stretch,
          [axis]: next
        };

        const localAxisWorld = getLocalAxisWorld(transform.rotationQuaternion, axis, direction);

        const nextPosition = {
          x: transform.position.x + localAxisWorld.x * delta * 0.5,
          y: transform.position.y + localAxisWorld.y * delta * 0.5,
          z: transform.position.z + localAxisWorld.z * delta * 0.5
        };

        return {
          ...node,
          stretch: nextStretch,
          transform: {
            ...transform,
            position: nextPosition
          }
        };
      });
    }, { moduleKey: KEY, priority: 10 });

    bus.on("entityEditor:rotateNode", ({ nodeId, axis, amount, rotationAxisWorld } = {}) => {
      if (!nodeId || !Number.isFinite(Number(amount))) return;

      updateNode(store, bus, nodeId, node => {
        const transform = normalizeTransform(node.transform);
        const baseQuat = normalizeQuaternion(transform.rotationQuaternion);

        const worldAxis = normalizeAxisVector(
          rotationAxisWorld || getLocalAxisWorld(baseQuat, axis || "y", 1)
        );

        const deltaQuat = quaternionFromAxisAngle(worldAxis, degToRad(Number(amount)));
        const nextQuat = normalizeQuaternion(multiplyQuaternions(deltaQuat, baseQuat));
        const nextEuler = quaternionToEuler(nextQuat);

        return {
          ...node,
          transform: {
            ...transform,
            rotation: nextEuler,
            rotationQuaternion: nextQuat
          }
        };
      });
    }, { moduleKey: KEY, priority: 10 });

    bus.on("entityEditor:uniformScaleNode", ({ nodeId, factor } = {}) => {
      if (!nodeId || !Number.isFinite(Number(factor))) return;

      updateNode(store, bus, nodeId, node => {
        const transform = normalizeTransform(node.transform);
        const f = Math.max(0.05, Number(factor));

        return {
          ...node,
          transform: {
            ...transform,
            scale: {
              x: Math.max(0.05, transform.scale.x * f),
              y: Math.max(0.05, transform.scale.y * f),
              z: Math.max(0.05, transform.scale.z * f)
            }
          }
        };
      });
    }, { moduleKey: KEY, priority: 10 });

    bus.on("entityEditor:deleteSelected", () => {
      const draft = normalizeDraft(getDraft(store));
      const nodeId = draft.selectedNodeId;

      if (!nodeId) return;

      bus.emit("entityFocus:requestExit", {
        nodeId,
        reason: "nodeDeleted"
      });

      setDraft(store, bus, {
        ...draft,
        selectedNodeId: null,
        nodes: draft.nodes.filter(n => n.id !== nodeId)
      });

      bus.emit("entityEditor:nodeDeleted", { nodeId });
    }, { moduleKey: KEY, priority: 10 });

    bus.on("entityEditor:clearDraft", () => {
      const draft = normalizeDraft(getDraft(store));

      if (draft.selectedNodeId) {
        bus.emit("entityFocus:requestExit", {
          nodeId: draft.selectedNodeId,
          reason: "draftCleared"
        });
      }

      setDraft(store, bus, createEmptyDraft());
    }, { moduleKey: KEY, priority: 10 });

    bus.on("entityEditor:saveAsPreset", ({ name = "Custom Part", slot = "custom" } = {}) => {
      const draft = normalizeDraft(getDraft(store));

      if (!draft.nodes.length) {
        bus.emit("entityEditor:error", { reason: "emptyDraft" });
        return;
      }

      const preset = {
        id: `preset_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`,
        version: 5,
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
    return;
  }

  store.set("entityDraft", normalizeDraft(draft));
}

function ensurePresets(store) {
  const presets = store.get("customEntityPresets");
  if (!Array.isArray(presets)) store.set("customEntityPresets", []);
}

function getDraft(store) {
  return store.get("entityDraft") || createEmptyDraft();
}

function setDraft(store, bus, draft) {
  const prevDraft = normalizeDraft(getDraft(store));

  const nextDraft = normalizeDraft({
    ...draft,
    updatedAt: Date.now()
  });

  store.set("entityDraft", nextDraft);

  bus.emit("entityEditor:draftChanged", nextDraft);
  bus.emit("entityEditor:changed", nextDraft);

  if (prevDraft.selectedNodeId !== nextDraft.selectedNodeId) {
    bus.emit("entityEditor:selectionChanged", {
      nodeId: nextDraft.selectedNodeId || null,
      prevNodeId: prevDraft.selectedNodeId || null
    });

    bus.emit("entityEditor:nodeSelected", {
      nodeId: nextDraft.selectedNodeId || null,
      prevNodeId: prevDraft.selectedNodeId || null
    });
  }
}

function updateNode(store, bus, nodeId, updater) {
  const draft = normalizeDraft(getDraft(store));

  const nextNodes = draft.nodes.map(node => {
    if (node.id !== nodeId) return node;
    return normalizeNode(updater(normalizeNode(node)));
  });

  setDraft(store, bus, {
    ...draft,
    nodes: nextNodes
  });
}

function createEmptyDraft() {
  return {
    id: "entity_draft_001",
    version: 5,
    selectedNodeId: null,
    nodes: [],
    updatedAt: Date.now()
  };
}

function createNode(def, transform = {}) {
  const rotation = {
    x: transform?.rotation?.x ?? 0,
    y: transform?.rotation?.y ?? 0,
    z: transform?.rotation?.z ?? 0
  };

  const rotationQuaternion = transform?.rotationQuaternion
    ? normalizeQuaternion(transform.rotationQuaternion)
    : quaternionFromEuler(rotation);

  return normalizeNode({
    id: `node_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`,
    primitiveId: def.id,
    name: def.name,
    geometry: def.geometry,
    material: { color: def.color },
    transform: {
      position: {
        x: transform?.position?.x ?? 0,
        y: transform?.position?.y ?? 0,
        z: transform?.position?.z ?? 0
      },
      rotation,
      rotationQuaternion,
      scale: {
        x: transform?.scale?.x ?? def.defaultScale?.x ?? 1,
        y: transform?.scale?.y ?? def.defaultScale?.y ?? 1,
        z: transform?.scale?.z ?? def.defaultScale?.z ?? 1
      }
    },
    stretch: { x: 1, y: 1, z: 1 },
    pivot: { x: 0, y: 0, z: 0 }
  });
}

function normalizeDraft(draft) {
  return {
    id: draft?.id || "entity_draft_001",
    version: 5,
    selectedNodeId: draft?.selectedNodeId || null,
    nodes: Array.isArray(draft?.nodes) ? draft.nodes.map(normalizeNode) : [],
    updatedAt: draft?.updatedAt || Date.now()
  };
}

function normalizeNode(node) {
  return {
    id: node.id,
    primitiveId: node.primitiveId,
    name: node.name || node.primitiveId || "Node",
    geometry: node.geometry || node.primitiveId || "cube",
    material: {
      color: node.material?.color || "#ededed"
    },
    transform: normalizeTransform(node.transform),
    stretch: normalizeStretch(node.stretch),
    pivot: normalizePivot(node.pivot)
  };
}

function normalizeTransform(transform = {}) {
  const rotation = {
    x: Number(transform.rotation?.x) || 0,
    y: Number(transform.rotation?.y) || 0,
    z: Number(transform.rotation?.z) || 0
  };

  const rotationQuaternion = transform.rotationQuaternion
    ? normalizeQuaternion(transform.rotationQuaternion)
    : quaternionFromEuler(rotation);

  const syncedEuler = quaternionToEuler(rotationQuaternion);

  return {
    position: {
      x: Number(transform.position?.x) || 0,
      y: Number(transform.position?.y) || 0,
      z: Number(transform.position?.z) || 0
    },
    rotation: syncedEuler,
    rotationQuaternion,
    scale: {
      x: Number(transform.scale?.x) || 1,
      y: Number(transform.scale?.y) || 1,
      z: Number(transform.scale?.z) || 1
    }
  };
}

function normalizeStretch(stretch = {}) {
  return {
    x: Number(stretch.x) || 1,
    y: Number(stretch.y) || 1,
    z: Number(stretch.z) || 1
  };
}

function normalizePivot(pivot = {}) {
  return {
    x: Number(pivot.x) || 0,
    y: Number(pivot.y) || 0,
    z: Number(pivot.z) || 0
  };
}

function mergeTransform(prev, patch) {
  const base = normalizeTransform(prev);

  const rotationPatch = patch?.rotation
    ? {
        x: patch.rotation.x ?? base.rotation.x,
        y: patch.rotation.y ?? base.rotation.y,
        z: patch.rotation.z ?? base.rotation.z
      }
    : base.rotation;

  const rotationQuaternion = patch?.rotationQuaternion
    ? normalizeQuaternion(patch.rotationQuaternion)
    : patch?.rotation
      ? quaternionFromEuler(rotationPatch)
      : base.rotationQuaternion;

  return normalizeTransform({
    position: {
      x: patch?.position?.x ?? base.position.x,
      y: patch?.position?.y ?? base.position.y,
      z: patch?.position?.z ?? base.position.z
    },
    rotation: quaternionToEuler(rotationQuaternion),
    rotationQuaternion,
    scale: {
      x: patch?.scale?.x ?? base.scale.x,
      y: patch?.scale?.y ?? base.scale.y,
      z: patch?.scale?.z ?? base.scale.z
    }
  });
}

function getLocalAxisWorld(rotationQuaternion, axis, sign) {
  const q = normalizeQuaternion(rotationQuaternion);

  const v = {
    x: axis === "x" ? sign : 0,
    y: axis === "y" ? sign : 0,
    z: axis === "z" ? sign : 0
  };

  return normalizeAxisVector(rotateVectorByQuaternion(v, q));
}

function quaternionFromEuler(rotation = {}) {
  const x = degToRad(Number(rotation.x) || 0);
  const y = degToRad(Number(rotation.y) || 0);
  const z = degToRad(Number(rotation.z) || 0);

  const c1 = Math.cos(x / 2);
  const c2 = Math.cos(y / 2);
  const c3 = Math.cos(z / 2);
  const s1 = Math.sin(x / 2);
  const s2 = Math.sin(y / 2);
  const s3 = Math.sin(z / 2);

  return normalizeQuaternion({
    x: s1 * c2 * c3 + c1 * s2 * s3,
    y: c1 * s2 * c3 - s1 * c2 * s3,
    z: c1 * c2 * s3 + s1 * s2 * c3,
    w: c1 * c2 * c3 - s1 * s2 * s3
  });
}

function quaternionToEuler(qRaw) {
  const q = normalizeQuaternion(qRaw);

  const sinrCosp = 2 * (q.w * q.x + q.y * q.z);
  const cosrCosp = 1 - 2 * (q.x * q.x + q.y * q.y);
  const x = Math.atan2(sinrCosp, cosrCosp);

  const sinp = 2 * (q.w * q.y - q.z * q.x);
  const y = Math.abs(sinp) >= 1
    ? Math.sign(sinp) * Math.PI / 2
    : Math.asin(sinp);

  const sinyCosp = 2 * (q.w * q.z + q.x * q.y);
  const cosyCosp = 1 - 2 * (q.y * q.y + q.z * q.z);
  const z = Math.atan2(sinyCosp, cosyCosp);

  return {
    x: radToDeg(x),
    y: radToDeg(y),
    z: radToDeg(z)
  };
}

function quaternionFromAxisAngle(axisRaw, angleRad) {
  const axis = normalizeAxisVector(axisRaw);
  const half = angleRad / 2;
  const s = Math.sin(half);

  return normalizeQuaternion({
    x: axis.x * s,
    y: axis.y * s,
    z: axis.z * s,
    w: Math.cos(half)
  });
}

function multiplyQuaternions(a, b) {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
  };
}

function rotateVectorByQuaternion(v, q) {
  const u = { x: q.x, y: q.y, z: q.z };
  const s = q.w;

  const uv = cross(u, v);
  const uuv = cross(u, uv);

  return {
    x: v.x + 2 * (s * uv.x + uuv.x),
    y: v.y + 2 * (s * uv.y + uuv.y),
    z: v.z + 2 * (s * uv.z + uuv.z)
  };
}

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

function normalizeQuaternion(q = {}) {
  const x = Number(q.x) || 0;
  const y = Number(q.y) || 0;
  const z = Number(q.z) || 0;
  const w = Number.isFinite(Number(q.w)) ? Number(q.w) : 1;

  const len = Math.sqrt(x * x + y * y + z * z + w * w) || 1;

  return {
    x: x / len,
    y: y / len,
    z: z / len,
    w: w / len
  };
}

function normalizeAxisVector(v = {}) {
  const x = Number(v.x) || 0;
  const y = Number(v.y) || 0;
  const z = Number(v.z) || 0;
  const len = Math.sqrt(x * x + y * y + z * z) || 1;

  return {
    x: x / len,
    y: y / len,
    z: z / len
  };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function degToRad(v) {
  return v * Math.PI / 180;
}

function radToDeg(v) {
  return v * 180 / Math.PI;
}

// CHANGELOG v5:
// • Добавлен transform.rotationQuaternion как источник истины вращения.
// • entityEditor:rotateNode теперь поддерживает rotationAxisWorld.
// • Вращение применяется через quaternion delta, а не через rotation[axis] += amount.
// • Euler rotation сохраняется как совместимое представление.
// • Stretch теперь использует quaternion для локальной оси.
// • Draft / preset version обновлены до 5.