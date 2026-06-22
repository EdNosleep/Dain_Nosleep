// ======================================
// Dain_Coin — PROJECT TREE (v1)
// Editable Project Map Source
// ======================================

export default `
/
├── index.html
├── main.js
│
├── engine/
│   ├── core.js
│   ├── events.js
│   ├── store.js
│   └── moduleFactory.js
│
├── meta/
│   ├── saveManager.js
│   ├── inspector.js
│   └── inspectorColorPresets.js
│
├── gameplay/
│   │
│   ├── coin/
│   │   └── coin.js
│   │
│   ├── player/
│   │   ├── playerDefaults.js
│   │   ├── equipmentLogic.js
│   │   └── playerCalculator.js
│   │
│   └── data/
│       └── itemCatalog.js
│
├── entity/
│   │
│   ├── data/
│   │   └── primitiveCatalog.js
│   │
│   ├── logic/
│   │   └── entityEditorLogic.js
│   │
│   ├── ui/
│   │   └── entityToolbar.js
│   │
│   └── stage/
│       ├── entityStage3D.js
│       ├── entityStageCamera.js
│       ├── entityStageDom.js
│       ├── entityStageRenderer.js
│       ├── entityStageGeometry.js
│       ├── entityStageMaterials.js
│       ├── entityStagePicking.js
│       └── entityStageInput.js
│
├── ui/
│   │
│   ├── tray/
│   │   ├── tray.js
│   │   ├── trayPanel.js
│   │   ├── defineTrayButton.js
│   │   ├── buttonAbilities.js
│   │   ├── trayButton1.js
│   │   ├── trayButtonInventory.js
│   │   └── trayButton3.js
│   │
│   └── dev/
│       └── console.js
│
├── visual/
│   └── background/
│       ├── backgroundSnakes.js
│       └── backgroundSnakesEffects.js
│
├── libs/
│   └── three.js
│
├── test/
│   └── testWebm.js
│
└── assets/
    │
    ├── background/
    │   └── background.png
    │
    ├── coin/
    │   └── coin8/
    │       ├── coin_avers.png
    │       ├── coin_revers.png
    │       └── coin_edge.png
    │
    ├── tray/
    │   └── trayButtons1/
    │       └── trayIconInventory.png
    │
    ├── avatars/
    ├── skins/
    ├── icons/
    ├── textures/
    └── webm/
`;

// CHANGELOG projectTree.js v1:
// • Добавлен отдельный редактируемый источник карты проекта.
// • Карта экспортируется как default string.
// • Решена проблема fetch() в file:// окружении Android/WebView.