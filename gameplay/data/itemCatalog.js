// ======================================================
// Dain_Coin — itemCatalog (v1)
// Каталог ВСЕХ предметов игры (истина проекта)
// ======================================================
//
// CHANGELOG v1:
// • Добавлены 3 аватарки
// • Редкость + imageSrc
// • Effects-структура заложена (id1 даёт strength +5)
//
// ======================================================

export const itemCatalog = {
  avatars: {
    id1: {
      id: "id1",
      type: "avatar",
      name: "Кот",
      rarity: "common",
      imageSrc: "./assets/tray/trayButtons1/trayIcon1.png",
      effects: {
        statsAdd: { strength: 5 }
      }
    },

    id2: {
      id: "id2",
      type: "avatar",
      name: "Дракон",
      rarity: "rare",
      imageSrc: "./assets/avatars/playerAvatar2.png",
      effects: {
        statsAdd: {}
      }
    },

    id3: {
      id: "id3",
      type: "avatar",
      name: "Пёс",
      rarity: "epic",
      imageSrc: "./assets/avatars/playerAvatar3.png",
      effects: {
        statsAdd: {}
      }
    },
    
    id4: {
      id: "id4",
      type: "avatar",
      name: "Пёс",
      rarity: "epic",
      imageSrc: "./assets/avatars/playerAvatar3.png",
      effects: {
        statsAdd: {}
      }
    },

    id5: {
      id: "id5",
      type: "avatar",
      name: "Пёс",
      rarity: "epic",
      imageSrc: "./assets/avatars/playerAvatar3.png",
      effects: {
        statsAdd: {}
      }
    },

    id6: {
      id: "id6",
      type: "avatar",
      name: "Пёс",
      rarity: "epic",
      imageSrc: "./assets/avatars/playerAvatar3.png",
      effects: {
        statsAdd: {}
      }
    },

    id7: {
      id: "id7",
      type: "avatar",
      name: "Пёс",
      rarity: "epic",
      imageSrc: "./assets/avatars/playerAvatar3.png",
      effects: {
        statsAdd: {}
      }
    },

    id8: {
      id: "id8",
      type: "avatar",
      name: "Пёс",
      rarity: "epic",
      imageSrc: "./assets/avatars/playerAvatar3.png",
      effects: {
        statsAdd: {}
      }
    },

    id9: {
      id: "id9",
      type: "avatar",
      name: "Пёс",
      rarity: "epic",
      imageSrc: "./assets/avatars/playerAvatar3.png",
      effects: {
        statsAdd: {}
      }
    }
  },
  
  skins: {
    skin1: {
      id: "skin1",
      type: "skin",
      name: "Неоновый",
      rarity: "common",
      imageSrc: "./assets/skins/skin1.png",
      effects: {
        statsAdd: {}
      }
    },

    skin2: {
      id: "skin2",
      type: "skin",
      name: "Огненный",
      rarity: "rare",
      imageSrc: "./assets/skins/skin2.png",
      effects: {
        statsAdd: {}
      }
    },

    skin3: {
      id: "skin3",
      type: "skin",
      name: "Теневой",
      rarity: "epic",
      imageSrc: "./assets/skins/skin3.png",
      effects: {
        statsAdd: {}
      }
    }
  }
};
