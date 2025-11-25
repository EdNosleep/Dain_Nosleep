// ===============================
// Dain_Coin — STORE (v1)
// Простой key-value store с подписками
// ===============================
//
// API:
// const store = createStore({ energy: 10 });
// store.get('energy');
// store.set('energy', 5);
// store.update('energy', prev => prev - 1);
// const unsub = store.subscribe('energy', (val, prev) => {});
// unsub();
// store.getAll();
// ===============================

export function createStore(initialState = {}) {
  const state = { ...initialState };
  const subs = new Map(); // key -> Set<handler>

  function get(key) {
    return state[key];
  }

  function getAll() {
    return { ...state };
  }

  function notify(key, value, prev) {
    const set = subs.get(key);
    if (!set || set.size === 0) return;
    Array.from(set).forEach(fn => {
      try {
        fn(value, prev);
      } catch (e) {
        console.error(`[store] Error in subscriber for "${key}"`, e);
      }
    });
  }

  function set(key, value) {
    const prev = state[key];
    state[key] = value;
    notify(key, value, prev);
  }

  function update(key, updater) {
    if (typeof updater !== 'function') return;
    const prev = state[key];
    const next = updater(prev);
    if (next === prev) return;
    state[key] = next;
    notify(key, next, prev);
  }

  function subscribe(key, handler) {
    if (!key || typeof handler !== 'function') return () => {};
    if (!subs.has(key)) {
      subs.set(key, new Set());
    }
    subs.get(key).add(handler);
    return () => unsubscribe(key, handler);
  }

  function unsubscribe(key, handler) {
    const set = subs.get(key);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) {
      subs.delete(key);
    }
  }

  return {
    get,
    getAll,
    set,
    update,
    subscribe,
    unsubscribe
  };
}

