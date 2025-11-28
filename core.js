// ===================================================================
// Dain_Coin — CORE (v4)
// -------------------------------------------------------------------
// ✔ Поддержка HOOK API v1.0 (совместно с moduleFactory v2)
// ✔ Контекст теперь имеет:
//      - container
//      - bus
//      - store
//      - callHook(moduleKey, hookName, payload)
// ✔ Полная обратная совместимость с v3
// ===================================================================

import { createEventBus } from "./events.js";
import { createStore } from "./store.js";

export const core = (() => {

  // =========================
  // РЕЕСТР МОДУЛЕЙ
  // =========================
  const registry = new Map();      // key -> module object
  const dependents = new Map();    // dependencyKey -> Set(moduleKeys)

  // =========================
  // ИНФРА
  // =========================
  const bus   = createEventBus();  // EventBus v2
  const store = createStore();

  // NEW: стандартная оболочка контекста
  let context = {
    container: null,
    bus,
    store,

    // NEW: универсальный hook-caller
    callHook(moduleKey, hookName, payload) {
      const eventName = `${moduleKey}:${hookName}`;
      try {
        bus.emit(eventName, payload);
      } catch (e) {
        console.error(`[core] Hook emit failed: ${eventName}`, e);
      }
    }
  };

  // =========================
  // INIT
  // =========================
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

    console.log("[core] v4 initialized");
  }

  // =========================
  // REGISTER MODULE
  // =========================
  function registerModule(key, mod) {
    if (!key || !mod) {
      console.warn("[core] registerModule: invalid", key, mod);
      return;
    }

    mod.key = key;

    if (!Array.isArray(mod.dependencies))
      mod.dependencies = [];

    registry.set(key, mod);

    // карта зависимостей
    mod.dependencies.forEach(dep => {
      if (!dependents.has(dep)) dependents.set(dep, new Set());
      dependents.get(dep).add(key);
    });

    if (typeof window !== "undefined") {
      window[key] = mod;
    }

    console.log(`[core] Registered module: ${key}`);
  }

  // =========================
  // GETTERS
  // =========================
  const getModule = (k) => registry.get(k) || null;

  const getModules = () =>
    Array.from(registry.entries())
      .map(([key, module]) => ({ key, module }));

  // =========================
  // ENABLE MODULE
  // =========================
  function enableModule(key, visited = new Set()) {
    if (!key || visited.has(key)) return;
    visited.add(key);

    const mod = registry.get(key);
    if (!mod) {
      console.warn("[core] enableModule: not found", key);
      return;
    }

    // 1. включаем зависимости
    mod.dependencies.forEach(dep =>
      enableModule(dep, visited)
    );

    // 2. старт
    if (!mod.enabled && typeof mod.start === "function") {
      try {
        mod.start(context);
        mod.enabled = true;
        console.log(`[core] ENABLE ${key}`);
      } catch (e) {
        console.error(`[core] Error start ${key}`, e);
      }
    }
  }

  // =========================
  // DISABLE MODULE
  // =========================
  function disableModule(key, visited = new Set()) {
    if (!key || visited.has(key)) return;
    visited.add(key);

    const mod = registry.get(key);
    if (!mod) {
      console.warn("[core] disableModule: not found", key);
      return;
    }

    // 1. выключаем зависимые
    const deps = dependents.get(key);
    if (deps) {
      deps.forEach(dep =>
        disableModule(dep, visited)
      );
    }

    // 2. EventBus cleanup
    bus.offModule(key);

    // 3. disable()
    if (mod.enabled && typeof mod.disable === "function") {
      try {
        mod.disable();
        mod.enabled = false;
        console.log(`[core] DISABLE ${key}`);
      } catch (e) {
        console.error(`[core] Error disable ${key}`, e);
      }
    }
  }

  // =========================
  // APPLY PARAM
  // =========================
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

  // =========================
  // EVENT BUS API
  // =========================
  function on(event, handler, opts = {}) {
    if (opts.moduleKey == null && opts.module != null) {
      opts.moduleKey = opts.module;
    }
    return bus.on(event, handler, opts);
  }

  const off       = (e, h) => bus.off(e, h);
  const once      = (e, h, o) => bus.once(e, h, o);
  const emit      = (e, p) => bus.emit(e, p);
  const offModule = (m) => bus.offModule(m);

  // =========================
  // STORE API
  // =========================
  const getState         = (k) => store.get(k);
  const setState         = (k, v) => store.set(k, v);
  const updateState      = (k, fn) => store.update(k, fn);
  const subscribeState   = (k, fn) => store.subscribe(k, fn);
  const unsubscribeState = (k, fn) => store.unsubscribe(k, fn);
  const getStore         = () => store;

  // =========================
  // ПУБЛИЧНЫЙ API CORE v4
  // =========================
  return {
    init,
    registerModule,
    getModule,
    getModules,
    enableModule,
    disableModule,
    applyParam,

    // event bus
    on,
    off,
    once,
    emit,
    offModule,
    getBus: () => bus,

    // store
    getState,
    setState,
    updateState,
    subscribeState,
    unsubscribeState,
    getStore,

    // context
    getContext: () => context
  };
})();

if (typeof window !== "undefined") {
  window.__DainCore = core;
}