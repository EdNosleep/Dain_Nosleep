// ======================================================
// NOSLEEP_ENGINE — visualStateController.js v3
// Global Visual Intent controller + move support
// ======================================================

export function createVisualStateController({ runtime, getParams }) {
  const active = new Map();

  return {
    play(payload = {}) {
      const effect = String(payload.effect || "").trim();
      if (!effect) return null;

      const id = payload.id || createEffectId(effect);
      const params = mergeParams(getParams?.() || {}, payload.overrides || {});

      stopExisting(active, runtime, id);

      const instance = runtime.play({
        ...payload,
        id,
        effect,
        params
      });

      if (instance) active.set(id, instance);
      return id;
    },

    move(payload = {}) {
      const id = payload.id;
      if (!id) return;

      const instance = active.get(id);
      if (!instance) return;

      runtime.move(instance, payload.target || {});
    },

    stop(payload = {}) {
      const id = payload.id;
      if (!id) return;
      stopExisting(active, runtime, id);
    },

    clear() {
      for (const id of active.keys()) {
        stopExisting(active, runtime, id);
      }
      active.clear();
    }
  };
}

function stopExisting(active, runtime, id) {
  const prev = active.get(id);
  if (!prev) return;

  runtime.stop(prev);
  active.delete(id);
}

function mergeParams(globalParams, overrides) {
  return { ...globalParams, ...overrides };
}

function createEffectId(effect) {
  return `${effect}_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`;
}

// CHANGELOG v3:
// • Добавлен move(id, target) для pointer-follow эффектов.
// • Active effects остаются внутри Visual Engine.
// • Global params + local overrides сохранены.
// • Controller не создаёт DOM.
// • Совместимость play/stop/clear сохранена.