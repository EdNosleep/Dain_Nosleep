// ===============================
// Dain_Coin — MAIN ENTRY POINT (v8)
// Layered Project Structure Migration
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

import { playerDefaults } from "./gameplay/player/playerDefaults.js";
import { registerEquipmentLogicModule } from "./gameplay/player/equipmentLogic.js";

const INSPECTOR_STORAGE_KEY = "DainCoin_Inspector_v25";

const DEFAULT_ENABLED_MODULES = [
  "__saveManagerModule",
  "__inspectorModule",
  "__inspectorColorPresetsModule",

  "__backgroundSnakesModule",
  "__backgroundSnakesEffectsModule",

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

// ====== SCENE ROOT ======
const root = document.getElementById("game-root");

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

const boot = document.getElementById("boot");
if (boot) boot.remove();

// ====== CORE INIT ======
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

// ====== REGISTER MODULES ======
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

registerTrayModule(core);
registerTrayPanelModule(core);

registerTrayButtonAbilitiesModule(core);
registerTrayButton1Module(core);
registerTrayButtonInventoryModule(core);
registerTrayButton3Module(core);
registerConsoleModule(core);

registerEquipmentLogicModule(core);

// ====== START ======
restoreEnabledModulesFromInspectorOrDefaults();

console.log("main.js v8: layered structure migration enabled");

// ============================================================================
// RESTORE ENABLED MODULES
// ============================================================================

function restoreEnabledModulesFromInspectorOrDefaults() {
  const stored = loadInspectorStored();
  const savedEnabled = readSavedEnabledModules(stored);

  const modulesToEnable =
    savedEnabled.length > 0
      ? savedEnabled
      : DEFAULT_ENABLED_MODULES;

  modulesToEnable.forEach(key => {
    core.enableModule(key);
  });
}

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

// CHANGELOG v8:
// • Переведены импорты на новую layered-структуру проекта
// • core.js перенесён в engine/
// • meta/dev файлы вынесены в meta/
// • player/equipment/coin вынесены в gameplay/
// • Entity Editor разделён на entity/logic, entity/stage, entity/ui
// • tray UI вынесен в ui/tray/
// • console.js вынесен в ui/dev/
// • background-модули вынесены в visual/background/