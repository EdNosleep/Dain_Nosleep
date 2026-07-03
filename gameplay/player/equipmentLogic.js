// ======================================================
// Dain_Coin — equipmentLogic module (FINAL)
// Drop-in evolution of avatarLogic
// Uses defineModule (!!!)
// ======================================================

import { defineModule } from "../../engine/moduleFactory.js";
import { itemCatalog } from "../data/itemCatalog.js";
import { calculatePlayerStats } from "./playerCalculator.js";

// ------------------------------------------------------
// SLOT CONFIG
// ------------------------------------------------------

const SLOTS = {
  avatar: {
    slot: "avatar",
    inventoryKey: "avatars",
    equipmentKey: "avatarId",
    catalogKey: "avatars",
    selectEvent: "avatar:select",
    rejectEvent: "avatar:selectRejected",
    affectsStats: true
  },

  skin: {
    slot: "skin",
    inventoryKey: "skins",
    equipmentKey: "skinId",
    catalogKey: "skins",
    selectEvent: "skin:select",
    rejectEvent: "skin:selectRejected",
    affectsStats: false
  }
};

export const registerEquipmentLogicModule = defineModule({
  key: "__equipmentLogicModule",
  name: "Equipment Logic (FINAL)",
  inspector: {},
  dependencies: [],

  createState() {
    return {};
  },

  onStart({ bus, store }) {
    // ==================================================
    // 1) Пересчёт — СТРОГО как в avatarLogic
    // ==================================================
    const recalcAndStore = () => {
      const equipment = store.get("equipment");
      if (!equipment?.avatarId) return;

      const storeState = {
        player: store.get("player"),
        equipment,
        inventory: store.get("inventory")
      };

      const stats = calculatePlayerStats(storeState, itemCatalog);
      store.set("playerStats", stats);
      bus.emit("player:statsUpdated", stats);
    };

    // ==================================================
    // 2) Initial calc (уважаем playerDefaults)
    // ==================================================
    const eqInit = store.get("equipment");
    if (eqInit?.avatarId) {
      recalcAndStore();
    }

    // ==================================================
    // 3) Slot selection handlers (обобщённый avatarLogic)
    // ==================================================
    Object.values(SLOTS).forEach(cfg => {
      bus.on(
        cfg.selectEvent,
        ({ id } = {}) => {
          if (!id) return;

          const inv = store.get("inventory") || {};
          const owned = Array.isArray(inv[cfg.inventoryKey])
            ? inv[cfg.inventoryKey]
            : [];

          if (!owned.includes(id)) {
            bus.emit(cfg.rejectEvent, { reason: "notOwned", id });
            return;
          }

          if (!itemCatalog?.[cfg.catalogKey]?.[id]) {
            bus.emit(cfg.rejectEvent, { reason: "notInCatalog", id });
            return;
          }

          const eqPrev = store.get("equipment") || {};
          if (eqPrev[cfg.equipmentKey] === id) return;

          store.set("equipment", {
            ...eqPrev,
            [cfg.equipmentKey]: id
          });

          bus.emit("equipment:changed", {
            slot: cfg.slot,
            id
          });

          if (cfg.affectsStats) {
            recalcAndStore();
          }
        },
        { moduleKey: "__equipmentLogicModule", priority: 10 }
      );
    });

    // ==================================================
    // 4) Реакция на внешние изменения Store (1:1 avatarLogic)
    // ==================================================
    const unsubPlayer = store.subscribe("player", () => {
      const eq = store.get("equipment");
      if (eq?.avatarId) recalcAndStore();
    });

    const unsubEquip = store.subscribe("equipment", (eq) => {
      if (eq?.avatarId) recalcAndStore();
    });

    this.__unsubAll = () => {
      try { unsubPlayer?.(); } catch (_) {}
      try { unsubEquip?.(); } catch (_) {}
    };
  },

  onDisable() {
    try { this.__unsubAll?.(); } catch (_) {}
    this.__unsubAll = null;
  }
});