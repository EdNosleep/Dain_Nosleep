// ===============================
// Dain_Coin — STORE (v2)
// ===============================
// • Единый источник истины
// • Поддержка nested keys ("player.equipped.avatar")
// • subscribe / unsubscribe
// • batch / silent режим
// • reset для Inspector / Бога
// • getAll для save/export
// ===============================

export function createStore() {
  let state = {};
  const listeners = new Map(); // key -> Set(fn)
  let silent = false;

  // =========================
  // UTILS
  // =========================
  const clone = obj => JSON.parse(JSON.stringify(obj));

  const resolvePath = (obj, path, create = false) => {
    const parts = path.split(".");
    let cur = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!(p in cur)) {
        if (!create) return null;
        cur[p] = {};
      }
      cur = cur[p];
    }

    return { target: cur, key: parts[parts.length - 1] };
  };

  const notify = (key, value) => {
    if (silent) return;

    const subs = listeners.get(key);
    if (subs) {
      subs.forEach(fn => {
        try { fn(value); } catch (e) {
          console.error("[store] listener error:", e);
        }
      });
    }
  };

  // =========================
  // API
  // =========================
  function get(key) {
    if (!key) return undefined;
    const parts = key.split(".");
    let cur = state;
    for (const p of parts) {
      if (cur == null) return undefined;
      cur = cur[p];
    }
    return cur;
  }

  function set(key, value) {
    const resolved = resolvePath(state, key, true);
    if (!resolved) return;

    resolved.target[resolved.key] = value;
    notify(key, value);
  }

  function update(key, fn) {
    const prev = get(key);
    const next = fn(prev);
    set(key, next);
  }

  function subscribe(key, fn) {
    if (!listeners.has(key)) {
      listeners.set(key, new Set());
    }
    listeners.get(key).add(fn);

    return () => unsubscribe(key, fn);
  }

  function unsubscribe(key, fn) {
    const set = listeners.get(key);
    if (!set) return;
    set.delete(fn);
    if (!set.size) listeners.delete(key);
  }

  function getAll() {
    return clone(state);
  }

  // =========================
  // CONTROL
  // =========================
  function reset(nextState = {}) {
    silent = true;
    state = clone(nextState);
    silent = false;

    // уведомляем всех подписчиков
    listeners.forEach((_, key) => {
      notify(key, get(key));
    });
  }

  function batch(fn) {
    silent = true;
    try {
      fn();
    } finally {
      silent = false;
    }
  }

  // =========================
  // DEBUG
  // =========================
  function _dump() {
    return state;
  }

  // =========================
  // PUBLIC
  // =========================
  return {
    get,
    set,
    update,
    subscribe,
    unsubscribe,

    getAll,
    reset,
    batch,

    _dump
  };
}