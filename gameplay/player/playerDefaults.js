// ======================================================
// Dain_Coin — playerDefaults (v1)
// Стартовые данные игрока и инвентаря
// ======================================================
//
// CHANGELOG v1:
// • Добавлены базовые характеристики игрока
// • Добавлено состояние экипировки (avatarId)
// • Добавлен инвентарь аватарок
// • Готово для прямого проброса в core.init({ initialState })
//
// ======================================================

export const playerDefaults = {
  player: {
    level: 5,
    base: {
      strength: 10,
      health: 15
    }
  },

  equipment: {
    avatarId: "id2",
    skinId: "skin3"
  },

  inventory: {
    avatars: ["id1", "id2", "id3", "id4", "id5", "id6", "id7", "id8", "id9"],
    skins: ["skin1", "skin2", "skin3"]
  }
};

