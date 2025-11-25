// ===============================
// Dain_Coin — CORE (v3)
// Модульное ядро с EventBus v2 + авто-отпиской модулей
// ===============================
//
// CHANGELOG v3:
// • Интегрирован EventBus v2 (priority, namespaces, moduleKey)
// • Автоматическая отписка всех слушателей при disableModule()
// • Контекст теперь содержит { container, bus, store }
// • API полностью совместим с v2/v1
// ===============================

import { createEventBus } from "./events.js";
import { createStore } from "./store.js";

export const core = (() => {

  // =========================
  // РЕЕСТР
  // =========================
  const registry = new Map();      // key -> module object
  const dependents = new Map();    // dependency -> Set(modules)

  // =========================
  // ИНФРАСТРУКТУРА
  // =========================
  const bus   = createEventBus();  // улучшенный eventBus v2
  const store = createStore();     // глобальный state-store

  let context = {
    container: null,
    bus,
    store
  };

  // =========================
  // INIT
  // =========================
  function init(opts = {}) {
    context.container = opts.container ?? null;

    if (!context.container) {
      console.warn("[core] init: container is missing");
    }

    // загрузка initial state (опционально)
    if (opts.initialState && typeof opts.initialState === "object") {
      for (const [k, v] of Object.entries(opts.initialState)) {
        store.set(k, v);
      }
    }

    console.log("[core] v3 initialized");
  }

  // =========================
  // РЕГИСТРАЦИЯ МОДУЛЯ
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

    // Заполняем карту зависимостей
    mod.dependencies.forEach(dep => {
      if (!dependents.has(dep)) dependents.set(dep, new Set());
      dependents.get(dep).add(key);
    });

    // Глобальный доступ
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
    Array.from(registry.entries()).map(([key, module]) => ({ key, module }));

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

    // 1) Включить зависимости
    mod.dependencies.forEach(dep => enableModule(dep, visited));

    // 2) Старт модуля
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

    // 1) Выключаем зависящие
    const deps = dependents.get(key);
    if (deps) {
      deps.forEach(dep => disableModule(dep, visited));
    }

    // 2) Удаляем слушатели EventBus этого модуля
    bus.offModule(key);

    // 3) Вызываем disable()
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
  // EVENT BUS API (обёртка)
  // =========================

  function on(event, handler, opts = {}) {
    // автоматически проставим moduleKey, если модуль активен
    if (opts.moduleKey == null && opts.module != null) {
      opts.moduleKey = opts.module;
    }
    return bus.on(event, handler, opts);
  }

  const off = (event, handler) => bus.off(event, handler);
  const once = (e, h, o) => bus.once(e, h, o);
  const emit = (e, p) => bus.emit(e, p);
  const offModule = (m) => bus.offModule(m);

  // =========================
  // STORE API
  // =========================
  const getState        = (k) => store.get(k);
  const setState        = (k, v) => store.set(k, v);
  const updateState     = (k, fn) => store.update(k, fn);
  const subscribeState   = (k, fn) => store.subscribe(k, fn);
  const unsubscribeState = (k, fn) => store.unsubscribe(k, fn);
  const getStore        = () => store;

  // =========================
  // PUBLIC
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