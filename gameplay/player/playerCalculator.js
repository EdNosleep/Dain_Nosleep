// ======================================================
// Dain_Coin — playerCalculator (v1)
// Чистый калькулятор итоговых характеристик игрока
// ======================================================
//
// CHANGELOG v1:
// • calculatePlayerStats(state, catalog)
// • Учитывает base stats + эффекты экипированной аватарки
// • Ничего не хранит и ничего не мутирует (pure)
//
// ======================================================

export function calculatePlayerStats(storeState, catalog) {
  const player = storeState?.player || {};
  const base = player?.base || {};
  const equipment = storeState?.equipment || {};

  const level = Number(player.level) || 1;

  const baseStrength = Number(base.strength) || 0;
  const baseHealth = Number(base.health) || 0;

  const avatarId = equipment.avatarId || null;
  const avatarDef =
    avatarId && catalog?.avatars
      ? catalog.avatars[avatarId] || null
      : null;

  const add = avatarDef?.effects?.statsAdd || {};
  const bonusStrength = Number(add.strength) || 0;
  const bonusHealth = Number(add.health) || 0;

  const strength = baseStrength + bonusStrength;
  const health = baseHealth + bonusHealth;

  return {
    level,
    strength,
    health,
    equipped: {
      avatarId
    },
    bonuses: {
      strength: bonusStrength,
      health: bonusHealth
    }
  };
}

