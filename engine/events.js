// ======================================
// Dain_Coin — EVENT BUS (v2)
// Масштабируемый EventBus для 1000 модулей
// ======================================
//
// Возможности:
// • Приоритеты слушателей
// • Namespaces (zones)
// • Автоматическая отписка при disable()
// • Доступ: bus.on(event, handler, opts)
//    opts = { moduleKey, priority }
// • bus.emit(event, payload)
// • bus.off(event, handler)
// • bus.offModule('__coinModule')
// • bus.debug = true
//
// Структура хранения:
// listeners[event] = [ { handler, priority, moduleKey } ]
// ======================================

export function createEventBus() {
  const listeners = new Map();
  let debug = false;

  function log(...args) {
    if (debug) console.log("[eventBus]", ...args);
  }

  function parseEvent(event) {
    // "physics:coin:spinEnd" → ["physics", "coin", "spinEnd"]
    return event.split(":");
  }

  function on(event, handler, opts = {}) {
    if (!event || typeof handler !== "function") return;

    const entry = {
      handler,
      priority: opts.priority ?? 0,
      moduleKey: opts.moduleKey || null
    };

    if (!listeners.has(event)) {
      listeners.set(event, []);
    }

    listeners.get(event).push(entry);

    // сортируем по приоритету (больший → раньше)
    listeners.get(event).sort((a, b) => b.priority - a.priority);

    log("on", event, "module:", opts.moduleKey, "priority:", entry.priority);

    return () => off(event, handler);
  }

  function off(event, handler) {
    const arr = listeners.get(event);
    if (!arr) return;

    const idx = arr.findIndex((l) => l.handler === handler);
    if (idx >= 0) {
      arr.splice(idx, 1);
      log("off", event);
    }

    if (arr.length === 0) listeners.delete(event);
  }

  function offModule(moduleKey) {
    if (!moduleKey) return;

    listeners.forEach((arr, event) => {
      const filtered = arr.filter((l) => l.moduleKey !== moduleKey);

      if (filtered.length !== arr.length) {
        listeners.set(event, filtered);
        log(`offModule ${moduleKey} removed listeners from ${event}`);
      }

      if (filtered.length === 0) {
        listeners.delete(event);
      }
    });
  }

  function emit(event, payload) {
    const arr = listeners.get(event);
    if (!arr || arr.length === 0) return;

    log("emit", event, "listeners:", arr.length, payload);

    for (const entry of [...arr]) {
      try {
        entry.handler(payload);
      } catch (e) {
        console.error(`[eventBus] Error in handler for "${event}"`, e);
      }
    }
  }

  function once(event, handler, opts = {}) {
    const offFn = on(event, (payload) => {
      offFn();
      handler(payload);
    }, opts);

    return offFn;
  }

  function clear() {
    listeners.clear();
    log("clear all listeners");
  }

  return {
    on,
    off,
    emit,
    once,
    offModule,
    clear,
    get debug() { return debug; },
    set debug(v) { debug = !!v; }
  };
}