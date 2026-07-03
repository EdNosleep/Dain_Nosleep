// ======================================================
// Dain_Coin — saveManager module (v4)
// Persist / Restore game state with debounce + realtime reset
// ======================================================
//
// CHANGELOG v4:
// • inspector:reset теперь сбрасывает Store В РЕАЛЬНОМ ВРЕМЕНИ
// • Store reset → playerDefaults
// • Сейв удаляется централизованно
// • Debounce autosave сохранён
//
// ======================================================

import { defineModule } from "../engine/moduleFactory.js";
import { playerDefaults } from "../gameplay/player/playerDefaults.js";

const SAVE_KEY = "dain_coin_save_v1";
const SAVE_DEBOUNCE_MS = 300;

export const registerSaveManagerModule = defineModule({
  key: "__saveManagerModule",
  name: "Save Manager (v4)",
  inspector: {},
  dependencies: [],

  createState() {
    return {
      isLoaded: false,
      saveDebounced: null,
      __cleanup: null
    };
  },

  onStart({ store, bus, state }) {
    // ==================================================
    // 1) LOAD
    // ==================================================
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      try {
        const data = JSON.parse(raw);

        if (data && typeof data === "object") {
          store.reset({
            player: data.player,
            inventory: data.inventory,
            equipment: data.equipment
          });

          bus.emit("save:loaded", data);
          console.log("[save] loaded");
        }
      } catch (e) {
        console.warn("[save] failed to parse save", e);
      }
    }

    state.isLoaded = true;

    // ==================================================
    // 2) SAVE (debounced)
    // ==================================================
    const saveNow = () => {
      if (!state.isLoaded) return;

      const snapshot = {
        version: 1,
        player: store.get("player"),
        inventory: store.get("inventory"),
        equipment: store.get("equipment"),
        ts: Date.now()
      };

      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
        bus.emit("save:written", snapshot);
      } catch (e) {
        console.warn("[save] write failed", e);
      }
    };

    state.saveDebounced = debounce(saveNow, SAVE_DEBOUNCE_MS);

    const unsubPlayer = store.subscribe("player", state.saveDebounced);
    const unsubInv    = store.subscribe("inventory", state.saveDebounced);
    const unsubEquip  = store.subscribe("equipment", state.saveDebounced);

    // ==================================================
    // 3) INSPECTOR RESET = HARD RESET
    // ==================================================
    const offReset = bus.on(
      "inspector:reset",
      () => {
        try {
          // 1) удалить сейв
          localStorage.removeItem(SAVE_KEY);

          // 2) сбросить Store к дефолтам В РАНТАЙМЕ
          store.reset({
            player: playerDefaults.player,
            inventory: playerDefaults.inventory,
            equipment: playerDefaults.equipment
          });

          bus.emit("save:reset");
          console.log("[save] hard reset");
        } catch (e) {
          console.warn("[save] reset failed", e);
        }
      },
      {
        moduleKey: "__saveManagerModule",
        priority: 100
      }
    );

    state.__cleanup = () => {
      try { unsubPlayer?.(); } catch (_) {}
      try { unsubInv?.(); } catch (_) {}
      try { unsubEquip?.(); } catch (_) {}
      try { offReset?.(); } catch (_) {}
    };
  },

  onDisable({ state }) {
    try { state.__cleanup?.(); } catch (_) {}
    state.__cleanup = null;
    state.saveDebounced = null;
  }
});

// ======================================================
// Utils
// ======================================================

function debounce(fn, delay = 300) {
  let timer = null;

  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, delay);
  };
}