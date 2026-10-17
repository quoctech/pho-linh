import type { Attributes, DerivedStats, EquipmentBonuses, PlayerBattleState } from './types';

export const BASE_ATTRIBUTES: Attributes = {
  str: 5,
  vit: 5,
  agi: 5,
  int: 5,
};

export function computeDerivedStats(
  attributes: Attributes,
  equipmentBonuses: EquipmentBonuses = {},
): DerivedStats {
  const str = safeAttribute(attributes.str);
  const vit = safeAttribute(attributes.vit);
  const agi = safeAttribute(attributes.agi);
  const int = safeAttribute(attributes.int);
  const maxHp = Math.max(1, 200 + 20 * vit + safeBonus(equipmentBonuses.maxHp));
  const atk = Math.max(0, 10 + 3 * str + safeBonus(equipmentBonuses.atk));
  const defense = Math.max(0, 2 * vit + safeBonus(equipmentBonuses.defense));
  const skillPower = Math.max(0, 5 + 3 * int + safeBonus(equipmentBonuses.skillPower));
  const agiBonus = Math.min(0.2, agi * 0.005 + safeBonus(equipmentBonuses.agiBonus));

  return {
    maxHp,
    atk,
    defense,
    skillPower,
    agiBonus,
    power: Math.round(maxHp / 10 + atk * 4 + defense * 2 + skillPower * 2),
  };
}

export function createPlayerBattleState(
  attributes: Attributes = BASE_ATTRIBUTES,
  equipmentBonuses = {},
): PlayerBattleState {
  const stats = computeDerivedStats(attributes, equipmentBonuses);
  return {
    level: 1,
    attributes,
    stats,
    currentHp: stats.maxHp,
    shield: 0,
    energy: 0,
    poisonPotency: 0,
    poisonTurns: 0,
  };
}

export function clampPlayerState(player: PlayerBattleState): PlayerBattleState {
  const fallbackStats = computeDerivedStats(player.attributes);
  const maxHp = safePositive(player.stats.maxHp, fallbackStats.maxHp);
  const stats: DerivedStats = {
    ...player.stats,
    maxHp,
    atk: safeNonNegative(player.stats.atk, fallbackStats.atk),
    defense: safeNonNegative(player.stats.defense, fallbackStats.defense),
    skillPower: safeNonNegative(player.stats.skillPower, fallbackStats.skillPower),
    agiBonus: safeNonNegative(player.stats.agiBonus, fallbackStats.agiBonus),
    power: safeNonNegative(player.stats.power, fallbackStats.power),
  };
  return {
    ...player,
    stats,
    currentHp: Math.max(0, Math.min(maxHp, safeNonNegative(player.currentHp, 0))),
    shield: Math.max(0, Math.min(Math.round(maxHp * 0.5), safeNonNegative(player.shield, 0))),
    energy: Math.max(0, Math.min(100, safeNonNegative(player.energy, 0))),
    poisonPotency: safeNonNegative(player.poisonPotency, 0),
    poisonTurns: Math.max(0, Math.floor(safeNonNegative(player.poisonTurns, 0))),
  };
}

function safeAttribute(value: number): number {
  return safeNonNegative(value, 5);
}

function safeBonus(value: number | undefined): number {
  return safeNonNegative(value, 0);
}

function safePositive(value: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function safeNonNegative(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}
