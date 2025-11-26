// ===============================
// Dain_Coin — MODULE FACTORY (v1)
// ===============================
//
// Назначение:
// • Единый шаблон для создания модулей
// • Гарантия протокола: name, inspector, dependencies,
//   enabled, start(ctx), disable(), applyParam(param, value)
// • Автодоступ к core, bus, store
//
// Использование:
//
// import { defineModule } from './moduleFactory.js';
//
// export const registerSomeModule = defineModule({
//   key: '__someModule',
//   name: 'Какой-то модуль',
//   inspector: { /* параметры для инспектора */ },
//   dependencies: ['__coinModule'],
//
//   createState() {
//     return { dom: null };
//   },
//
//   onStart({ ctx, state, core, bus, store, mod }) {
//     // Логика старта
//   },
//
//   onDisable({ ctx, state, core, bus, store, mod }) {
//     // Чистка
//   },
//
//   onParam({ param, value, ctx, state, core, bus, store, mod }) {
//     // Реакция на изменения параметров
//   }
// });
// ===============================

export function defineModule(config) {
  const {
    key,
    name,
    inspector = {},
    dependencies = [],
    createState,
    onStart,
    onDisable,
    onParam
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

    const mod = {
      name: name || key.replace(/^__/, ''),
      inspector,
      dependencies: Array.isArray(dependencies) ? [...dependencies] : [],
      enabled: false,

      start(ctx) {
        if (mod.enabled) return;
        lastCtx = ctx || (typeof core.getContext === 'function' ? core.getContext() : null);
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

    console.log(`[moduleFactory] Module registered via factory: ${key}`);
    return mod;
  };
}

