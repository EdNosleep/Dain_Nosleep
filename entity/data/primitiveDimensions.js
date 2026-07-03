// ======================================================
// NOSLEEP_ENGINE — primitiveDimensions.js v1
// Shared primitive dimensions source
// ======================================================

export const PRIMITIVE_DIMENSIONS = {
  cube: {
    size: 1
  },

  sphere: {
    radius: 0.5
  },

  cone: {
    radius: 0.5,
    height: 1
  },

  cylinder: {
    radius: 0.5,
    height: 1
  },

  capsule: {
    radius: 0.25,
    cylinderHeight: 0.5,
    totalHeight: 1
  }
};

export function getPrimitiveDimensions(primitiveId) {
  const id = normalizePrimitiveId(primitiveId);
  return PRIMITIVE_DIMENSIONS[id] || PRIMITIVE_DIMENSIONS.cube;
}

export function normalizePrimitiveId(value) {
  const id = String(value || "").trim().toLowerCase();

  if (id === "box") return "cube";
  if (id === "cube") return "cube";
  if (id === "sphere") return "sphere";
  if (id === "cone") return "cone";
  if (id === "cylinder") return "cylinder";
  if (id === "capsule") return "capsule";

  return "cube";
}

// CHANGELOG v1:
// • Добавлен единый источник размеров примитивов.
// • Нормализованы cube/box/sphere/cone/cylinder/capsule.
// • Capsule приведена к общей высоте 1.