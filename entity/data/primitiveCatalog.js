// ======================================================
// Dain_Coin — primitiveCatalog.js (v1)
// ======================================================

export const primitiveCatalog = {
  cube: {
    id: "cube",
    type: "primitive",
    name: "Куб",
    icon: "■",
    geometry: "box",
    color: "#ededed",
    defaultScale: { x: 1, y: 1, z: 1 }
  },

  sphere: {
    id: "sphere",
    type: "primitive",
    name: "Сфера",
    icon: "●",
    geometry: "sphere",
    color: "#ededed",
    defaultScale: { x: 1, y: 1, z: 1 }
  },

  cone: {
    id: "cone",
    type: "primitive",
    name: "Конус",
    icon: "▲",
    geometry: "cone",
    color: "#ededed",
    defaultScale: { x: 1, y: 1, z: 1 }
  },

  cylinder: {
    id: "cylinder",
    type: "primitive",
    name: "Цилиндр",
    icon: "▮",
    geometry: "cylinder",
    color: "#ededed",
    defaultScale: { x: 1, y: 1, z: 1 }
  },

  capsule: {
    id: "capsule",
    type: "primitive",
    name: "Капсула",
    icon: "⬤",
    geometry: "capsule",
    color: "#ededed",
    defaultScale: { x: 0.8, y: 1.4, z: 0.8 }
  }
};

export function getPrimitiveDef(id) {
  return primitiveCatalog[id] || null;
}

// CHANGELOG v1:
// • Добавлен read-only каталог примитивов
// • Заложены cube / sphere / cone / cylinder / capsule
// • Добавлены color, icon, geometry, defaultScale