// ===================================================================
// Dain_Coin — CORE (v7)
// -------------------------------------------------------------------
// ✔ Всё из v6 сохранено
// ✔ Добавлен глобальный restoreInspectorParams()
// ✔ Inspector params теперь можно применить после регистрации модулей,
//   но до запуска enableModule()
// ===================================================================

import { createEventBus } from "./events.js";
import { createStore } from "./store.js";

export const core = (() => {
  const registry = new Map();
  const dependents = new Map();

  const bus = createEventBus();
  const store = createStore();

  let inspectorStorageKey = "DainCoin_Inspector_v25";
  let defaultEnabledModules = [];

  let context = {
    container: null,
    bus,
    store,

    callHook(moduleKey, hookName, payload) {
      const eventName = `${moduleKey}:${hookName}`;
      try {
        bus.emit(eventName, payload);
      } catch (e) {
        console.error(`[core] Hook emit failed: ${eventName}`, e);
      }
    }
  };

  function init(opts = {}) {
    context.container = opts.container ?? null;

    if (!context.container) {
      console.warn("[core] init: container is missing");
    }

    if (opts.initialState && typeof opts.initialState === "object") {
      for (const [k, v] of Object.entries(opts.initialState)) {
        store.set(k, v);
      }
    }

    if (typeof opts.inspectorStorageKey === "string") {
      inspectorStorageKey = opts.inspectorStorageKey;
    }

    if (Array.isArray(opts.defaultEnabledModules)) {
      defaultEnabledModules = [...opts.defaultEnabledModules];
    }

    console.log("[core] v7 initialized");
  }

  function registerModule(key, mod) {
    if (!key || !mod) {
      console.warn("[core] registerModule: invalid", key, mod);
      return;
    }

    mod.key = key;

    if (!Array.isArray(mod.dependencies)) {
      mod.dependencies = [];
    }

    registry.set(key, mod);

    mod.dependencies.forEach(dep => {
      if (!dependents.has(dep)) dependents.set(dep, new Set());
      dependents.get(dep).add(key);
    });

    if (typeof window !== "undefined") {
      window[key] = mod;
    }

    console.log(`[core] Registered module: ${key}`);
  }

  const getModule = key => registry.get(key) || null;

  const getModules = () =>
    Array.from(registry.entries()).map(([key, module]) => ({ key, module }));

  function enableModule(key, visited = new Set()) {
    if (!key || visited.has(key)) return;
    visited.add(key);

    const mod = registry.get(key);
    if (!mod) {
      console.warn("[core] enableModule: not found", key);
      return;
    }

    mod.dependencies.forEach(dep => enableModule(dep, visited));

    if (!mod.enabled && typeof mod.start === "function") {
      try {
        mod.start(context);
        mod.enabled = true;
        persistEnabledState(key, true);
        console.log(`[core] ENABLE ${key}`);
      } catch (e) {
        console.error(`[core] Error start ${key}`, e);
      }
    } else if (mod.enabled) {
      persistEnabledState(key, true);
    }
  }

  function disableModule(key, visited = new Set()) {
    if (!key || visited.has(key)) return;
    visited.add(key);

    const mod = registry.get(key);
    if (!mod) {
      console.warn("[core] disableModule: not found", key);
      return;
    }

    const deps = dependents.get(key);
    if (deps) {
      deps.forEach(dep => disableModule(dep, visited));
    }

    bus.offModule(key);

    if (mod.enabled && typeof mod.disable === "function") {
      try {
        mod.disable();
        mod.enabled = false;
        persistEnabledState(key, false);
        console.log(`[core] DISABLE ${key}`);
      } catch (e) {
        console.error(`[core] Error disable ${key}`, e);
      }
    } else if (!mod.enabled) {
      persistEnabledState(key, false);
    }
  }

  function applyParam(key, param, value) {
    const mod = registry.get(key);
    if (!mod || typeof mod.applyParam !== "function") {
      console.warn("[core] applyParam: invalid", key, param);
      return;
    }

    try {
      mod.applyParam(param, value);
    } catch (e) {
      console.error(`[core] applyParam error ${key}:${param}`, e);
    }
  }

  function restoreInspectorParams() {
    const stored = getInspectorStored();
    let applied = 0;

    getModules().forEach(({ key, module }) => {
      if (!module.inspector) return;

      for (const label in module.inspector) {
        const def = module.inspector[label];
        if (!def || def.param == null) continue;

        const storageKey = `param::${key}::${def.param}`;

        if (Object.prototype.hasOwnProperty.call(stored, storageKey)) {
          applyParam(key, def.param, stored[storageKey]);
          applied++;
        }
      }
    });

    console.log(`[core] restoreInspectorParams applied: ${applied}`);
    return applied;
  }

  function setInspectorStorageKey(key) {
    if (typeof key === "string" && key.trim()) {
      inspectorStorageKey = key;
    }
  }

  function getInspectorStorageKey() {
    return inspectorStorageKey;
  }

  function getInspectorStored() {
    if (typeof localStorage === "undefined") return {};

    try {
      return JSON.parse(localStorage.getItem(inspectorStorageKey)) || {};
    } catch {
      return {};
    }
  }

  function saveInspectorStored(data) {
    if (typeof localStorage === "undefined") return;

    try {
      localStorage.setItem(inspectorStorageKey, JSON.stringify(data || {}));
    } catch (e) {
      console.warn("[core] Failed to save inspector storage", e);
    }
  }

  function persistEnabledState(moduleKey, enabled) {
    if (!moduleKey) return;

    const stored = getInspectorStored();
    stored[`enabled::${moduleKey}`] = !!enabled;
    saveInspectorStored(stored);
  }

  function setDefaultEnabledModules(keys = []) {
    defaultEnabledModules = Array.isArray(keys) ? [...keys] : [];
  }

  function getDefaultEnabledModules() {
    return [...defaultEnabledModules];
  }

  function getEnabledModuleKeys() {
    return getModules()
      .filter(({ module }) => !!module.enabled)
      .map(({ key }) => key);
  }

  function resetModulesToDefaults() {
    const defaults = new Set(defaultEnabledModules);
    const current = getEnabledModuleKeys();

    current.forEach(key => {
      if (!defaults.has(key)) {
        disableModule(key);
      }
    });

    defaultEnabledModules.forEach(key => {
      enableModule(key);
    });

    getModules().forEach(({ key, module }) => {
      persistEnabledState(key, !!module.enabled);
    });

    bus.emit("engine:modulesResetToDefaults", {
      enabled: getEnabledModuleKeys()
    });
  }

  function on(event, handler, opts = {}) {
    if (opts.moduleKey == null && opts.module != null) {
      opts.moduleKey = opts.module;
    }
    return bus.on(event, handler, opts);
  }

  const off = (e, h) => bus.off(e, h);
  const once = (e, h, o) => bus.once(e, h, o);
  const emit = (e, p) => bus.emit(e, p);
  const offModule = m => bus.offModule(m);

  const getState = k => store.get(k);
  const setState = (k, v) => store.set(k, v);
  const updateState = (k, fn) => store.update(k, fn);
  const subscribeState = (k, fn) => store.subscribe(k, fn);
  const unsubscribeState = (k, fn) => store.unsubscribe(k, fn);
  const getStore = () => store;

  return {
    init,
    registerModule,
    getModule,
    getModules,
    enableModule,
    disableModule,
    applyParam,
    restoreInspectorParams,

    setInspectorStorageKey,
    getInspectorStorageKey,
    getInspectorStored,

    setDefaultEnabledModules,
    getDefaultEnabledModules,
    getEnabledModuleKeys,
    resetModulesToDefaults,

    on,
    off,
    once,
    emit,
    offModule,
    getBus: () => bus,

    getState,
    setState,
    updateState,
    subscribeState,
    unsubscribeState,
    getStore,

    getContext: () => context
  };
})();

if (typeof window !== "undefined") {
  window.__DainCore = core;
}

// CHANGELOG v7:
// • Добавлен core.restoreInspectorParams().
// • Восстановление Inspector params вынесено на уровень Core.
// • Params теперь можно применять до запуска модулей.
// • Сохранена логика enabled-state из v6.
// • Store/EventBus/lifecycle не изменены.