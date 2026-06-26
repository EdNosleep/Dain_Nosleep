// ===============================
// Dain_Coin — MAIN ENTRY POINT (v11)
// Ordered Boot Queue + Inspector Params Restore
// ===============================

import { core } from "./engine/core.js";

import { registerSaveManagerModule } from "./meta/saveManager.js";
import { registerInspectorModule } from "./meta/inspector.js";
import { registerInspectorColorPresetsModule } from "./meta/inspectorColorPresets.js";

import { registerBackgroundSnakesModule } from "./visual/background/backgroundSnakes.js";
import { registerBackgroundSnakesEffectsModule } from "./visual/background/backgroundSnakesEffects.js";

import { registerCoinModule } from "./gameplay/coin/coin.js";
import { registerTestWebmModule } from "./test/testWebm.js";

import { registerTrayModule } from "./ui/tray/tray.js";
import { registerTrayPanelModule } from "./ui/tray/trayPanel.js";
import { registerTrayButtonAbilitiesModule } from "./ui/tray/buttonAbilities.js";
import { registerTrayButton1Module } from "./ui/tray/trayButton1.js";
import { registerTrayButtonInventoryModule } from "./ui/tray/trayButtonInventory.js";
import { registerTrayButton3Module } from "./ui/tray/trayButton3.js";
import { registerConsoleModule } from "./ui/dev/console.js";

import { registerEntityEditorLogicModule } from "./entity/logic/entityEditorLogic.js";
import { registerEntityStage3DModule } from "./entity/stage/entityStage3D.js";
import { registerEntityToolbarModule } from "./entity/ui/entityToolbar.js";

import { registerTestShooterCameraModule } from "./entity/stage/testShooterCamera.js";

import { playerDefaults } from "./gameplay/player/playerDefaults.js";
import { registerEquipmentLogicModule } from "./gameplay/player/equipmentLogic.js";

const INSPECTOR_STORAGE_KEY = "DainCoin_Inspector_v25";

const DEFAULT_ENABLED_MODULES = [
  "__saveManagerModule",
  "__inspectorModule",
  "__inspectorColorPresetsModule",

//  "__backgroundSnakesModule",
//  "__backgroundSnakesEffectsModule",

//   "__coinModule",
//   "__testWebmModule",

  "__entityEditorLogicModule",
  "__entityStage3DModule",
  "__entityToolbarModule",

  "__trayModule",
  "__trayPanelModule",

  "__trayButtonAbilitiesModule",
  "__trayButton1Module",
  "__trayButtonInventoryModule",
  "__trayButton3Module",
  "__consoleModule",

  "__equipmentLogicModule"
];

const MODULE_BOOT_ORDER = [
  "__saveManagerModule",
  "__inspectorModule",
  "__inspectorColorPresetsModule",

  "__backgroundSnakesModule",
  "__backgroundSnakesEffectsModule",

  "__coinModule",
  "__testWebmModule",

  "__entityEditorLogicModule",
  "__entityStage3DModule",
  "__entityToolbarModule",

//  "__testShooterCameraModule",

  "__trayModule",
  "__trayPanelModule",

  "__trayButtonAbilitiesModule",
  "__trayButton1Module",
  "__trayButtonInventoryModule",
  "__trayButton3Module",
  "__consoleModule",

  "__equipmentLogicModule"
];

const root = document.getElementById("game-root");
const boot = document.getElementById("boot");
const bootLabel = document.getElementById("boot-label");
const bootProgress = document.getElementById("boot-progress");

const gameContainer = document.createElement("div");
gameContainer.id = "game-container";

Object.assign(gameContainer.style, {
  position: "relative",
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
  alignItems: "center",
  overflow: "hidden"
});

root.appendChild(gameContainer);

setBootProgress(3, "Подготовка ядра…");

core.init({
  container: gameContainer,
  initialState: {
    ...playerDefaults,
    entityDraft: {
      id: "entity_draft_001",
      version: 1,
      selectedNodeId: null,
      nodes: [],
      updatedAt: Date.now()
    },
    customEntityPresets: []
  },
  inspectorStorageKey: INSPECTOR_STORAGE_KEY,
  defaultEnabledModules: DEFAULT_ENABLED_MODULES
});

setBootProgress(8, "Регистрация модулей…");

registerSaveManagerModule(core);
registerInspectorModule(core);
registerInspectorColorPresetsModule(core);

registerBackgroundSnakesModule(core);
registerBackgroundSnakesEffectsModule(core);

registerCoinModule(core);
registerTestWebmModule(core);

registerEntityEditorLogicModule(core);
registerEntityStage3DModule(core);
registerEntityToolbarModule(core);

registerTestShooterCameraModule(core);

registerTrayModule(core);
registerTrayPanelModule(core);

registerTrayButtonAbilitiesModule(core);
registerTrayButton1Module(core);
registerTrayButtonInventoryModule(core);
registerTrayButton3Module(core);
registerConsoleModule(core);

registerEquipmentLogicModule(core);

setBootProgress(12, "Восстановление настроек…");

if (typeof core.restoreInspectorParams === "function") {
  core.restoreInspectorParams();
}

setBootProgress(14, "Запуск модулей…");

restoreEnabledModulesFromInspectorOrDefaults();

console.log("main.js v11: inspector params restored before module boot");

// ============================================================================
// BOOT
// ============================================================================

async function restoreEnabledModulesFromInspectorOrDefaults() {
  const stored = loadInspectorStored();
  const savedEnabled = readSavedEnabledModules(stored);

  const modulesToEnable =
    savedEnabled.length > 0
      ? sortModulesByBootOrder(savedEnabled)
      : DEFAULT_ENABLED_MODULES;

  await enableModulesInBootOrder(modulesToEnable);
  await finishBoot();
}

async function enableModulesInBootOrder(enabledKeys) {
  const orderedKeys = sortModulesByBootOrder(enabledKeys);
  const total = Math.max(orderedKeys.length, 1);

  for (let i = 0; i < orderedKeys.length; i++) {
    const key = orderedKeys[i];
    const percent = 14 + Math.round(((i + 1) / total) * 78);

    setBootProgress(percent, `Включение: ${key}`);

    try {
      await Promise.resolve(core.enableModule(key));
    } catch (error) {
      console.error(`main.js v11: failed to enable module ${key}`, error);
    }

    await waitNextFrame();
  }
}

async function finishBoot() {
  setBootProgress(100, "Готово");
  await wait(180);

  if (boot) {
    boot.style.transition = "opacity 0.22s ease, transform 0.22s ease";
    boot.style.opacity = "0";
    boot.style.transform = "translateX(-50%) translateY(8px)";
    await wait(240);
    boot.remove();
  }
}

function sortModulesByBootOrder(keys) {
  const orderMap = new Map();

  MODULE_BOOT_ORDER.forEach((key, index) => {
    orderMap.set(key, index);
  });

  return [...keys].sort((a, b) => {
    const orderA = orderMap.has(a) ? orderMap.get(a) : Number.MAX_SAFE_INTEGER;
    const orderB = orderMap.has(b) ? orderMap.get(b) : Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });
}

function setBootProgress(percent, label) {
  const safePercent = clamp(Number(percent) || 0, 0, 100);

  if (bootProgress) {
    bootProgress.style.width = `${safePercent}%`;
  }

  if (bootLabel && label) {
    bootLabel.textContent = label;
  }
}

function waitNextFrame() {
  return new Promise(resolve => {
    requestAnimationFrame(() => resolve());
  });
}

function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

// ============================================================================
// INSPECTOR ENABLED MODULES
// ============================================================================

function readSavedEnabledModules(stored) {
  if (!stored || typeof stored !== "object") return [];

  return Object.entries(stored)
    .filter(([key, value]) => key.startsWith("enabled::") && value === true)
    .map(([key]) => key.replace("enabled::", ""));
}

function loadInspectorStored() {
  try {
    return JSON.parse(localStorage.getItem(INSPECTOR_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// CHANGELOG v11:
// • Добавлен вызов core.restoreInspectorParams() после регистрации всех модулей.
// • Inspector params теперь применяются до enableModule().
// • Исправлен баг: настройки применялись только после открытия Inspector.
// • Boot-порядок и восстановление enabled-модулей сохранены.
// • Loading progress получил шаг “Восстановление настроек…”.
// • Остальная логика v10 сохранена.