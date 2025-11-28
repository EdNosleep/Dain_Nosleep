// ===================================================================
// Dain_Coin — MODULE FACTORY (v2)
// -------------------------------------------------------------------
// ✔ Поддержка HOOK API v1.0
// ✔ Модули могут объявлять hooks: []
// ✔ core → ctx.callHook(name, payload)
// ✔ Автогенерация событий: `${key}:${hook}`
// ✔ Никаких изменений в логике старых модулей
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

    // NEW: массив имён хуков
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

    // =============================================================
    // NEW: Создаём callHook для контекста
    // =============================================================
    function callHook(hookName, payload) {
      // Если модуль не объявил этот хук — пропускаем
      if (!hooks.includes(hookName)) return;

      // Генерируем событие
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

      // NEW: отдаём декларацию хуков наружу
      hooks,

      start(ctx) {
        if (mod.enabled) return;

        lastCtx =
          ctx || (typeof core.getContext === 'function'
            ? core.getContext()
            : null);

        // Добавляем callHook в контекст
        if (lastCtx) {
          lastCtx.callHook = callHook;
        }

        // Автоматическая регистрация событий для хуков
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
            onParam({ param, value, ctx: lastCtx, state, core, bus, store, mod });
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

    console.log(`[moduleFactory] Module registered via factory v2: ${key}`);
    return mod;
  };
}