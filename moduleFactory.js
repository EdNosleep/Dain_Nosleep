// ===================================================================
// Dain_Coin — MODULE FACTORY (v2.1)
// -------------------------------------------------------------------
// ✔ Поддержка HOOK API v1.0
// ✔ Модули могут объявлять hooks: []
// ✔ core → ctx.callHook(name, payload)
// ✔ Автогенерация событий: `${key}:${hook}`
// ✔ Никаких изменений в логике старых модулей
// ✔ HOOK API v1.0 (без изменений)
// ✔ Обратная совместимость 100%
// ✔ NEW: Inspector Bootstrap (до onStart)
// ===================================================================

export function defineModule(config) {
  const {
    key,
    name,
    inspector = {},
    dependencies = [],
    createState,
    onStart,
    onDisable,
    onParam,

    hooks = []
  } = config;

  if (!key) {
    throw new Error('[moduleFactory] "key" is required for module');
  }

  return function registerModule(core) {
    if (!core || typeof core.registerModule !== 'function') {
      console.warn('[moduleFactory] core is not valid, module:', key);
      return;
    }

    const bus = typeof core.getBus === 'function' ? core.getBus() : null;
    const store = typeof core.getStore === 'function' ? core.getStore() : null;
    const state = typeof createState === 'function' ? createState() : {};
    let lastCtx = null;
    let inspectorBootstrapped = false;

    // =============================================================
    // Inspector Bootstrap (SAFE)
    // =============================================================
    function bootstrapInspectorParams() {
      if (inspectorBootstrapped) return;
      inspectorBootstrapped = true;

      if (!inspector || !core || typeof core.applyParam !== 'function') {
        return;
      }

      // если core умеет отдавать сохранённые параметры — используем
      const stored =
        typeof core.getInspectorStored === 'function'
          ? core.getInspectorStored()
          : null;

      for (const label in inspector) {
        const def = inspector[label];
        if (!def || def.param == null) continue;

        const storedKey = `param::${key}::${def.param}`;
        const value =
          stored && storedKey in stored
            ? stored[storedKey]
            : def.value;

        try {
          core.applyParam(key, def.param, value);
        } catch (e) {
          console.error(
            `[moduleFactory] Inspector bootstrap error ${key}:${def.param}`,
            e
          );
        }
      }
    }

    // =============================================================
    // Hooks
    // =============================================================
    function callHook(hookName, payload) {
      if (!hooks.includes(hookName)) return;
      const eventName = `${key}:${hookName}`;
      try {
        bus.emit(eventName, payload);
      } catch (e) {
        console.error(`[moduleFactory] Hook emit error: ${eventName}`, e);
      }
    }

    const mod = {
      name: name || key.replace(/^__/, ''),
      inspector,
      dependencies: Array.isArray(dependencies) ? [...dependencies] : [],
      enabled: false,
      hooks,

      start(ctx) {
        if (mod.enabled) return;

        lastCtx =
          ctx || (typeof core.getContext === 'function'
            ? core.getContext()
            : null);

        if (lastCtx) {
          lastCtx.callHook = callHook;
        }

        // =====================================================
        // 🔑 NEW: Inspector Bootstrap BEFORE onStart
        // =====================================================
        bootstrapInspectorParams();

        if (hooks.length > 0) {
          hooks.forEach((h) => {
            console.log(
              `[moduleFactory] Registered hook channel: ${key}:${h}`
            );
          });
        }

        if (typeof onStart === 'function') {
          try {
            onStart({ ctx: lastCtx, state, core, bus, store, mod });
          } catch (e) {
            console.error(`[moduleFactory] Error in onStart for ${key}`, e);
          }
        }

        mod.enabled = true;
      },

      disable() {
        if (!mod.enabled) return;

        if (typeof onDisable === 'function') {
          try {
            onDisable({ ctx: lastCtx, state, core, bus, store, mod });
          } catch (e) {
            console.error(`[moduleFactory] Error in onDisable for ${key}`, e);
          }
        }

        mod.enabled = false;
      },

      applyParam(param, value) {
        if (!state.params) state.params = {};
        state.params[param] = value;

        if (typeof onParam === 'function') {
          try {
            onParam({
              param,
              value,
              ctx: lastCtx,
              state,
              core,
              bus,
              store,
              mod
            });
          } catch (e) {
            console.error(
              `[moduleFactory] Error in onParam for ${key}:${param}`,
              e
            );
          }
        }
      }
    };

    core.registerModule(key, mod);

    if (typeof window !== 'undefined') {
      window[key] = mod;
    }

    console.log(`[moduleFactory] Module registered via factory v2.1: ${key}`);
    return mod;
  };
}