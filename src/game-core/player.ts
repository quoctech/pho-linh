import { CHARACTER_DATA } from './game-data';
import type { Attributes, DerivedStats, ElementId, EquipmentBonuses, PlayerBattleState } from './types';

export const BASE_ATTRIBUTES: Attributes = { ...CHARACTER_DATA.baseAttributes };

export function computeDerivedStats(
  attributes: Attributes,
  equipmentBonuses: EquipmentBonuses = {},
): DerivedStats {
  const str = safeAttribute(attributes.str, CHARACTER_DATA.baseAttributes.str);
  const vit = safeAttribute(attributes.vit, CHARACTER_DATA.baseAttributes.vit);
  const agi = safeAttribute(attributes.agi, CHARACTER_DATA.baseAttributes.agi);
  const int = safeAttribute(attributes.int, CHARACTER_DATA.baseAttributes.int);
  const formula = CHARACTER_DATA.derivedStats;
  const maxHp = Math.max(1, formula.maxHp.base + formula.maxHp.vitPerPoint * vit + safeBonus(equipmentBonuses.maxHp));
  const atk = Math.max(0, formula.atk.base + formula.atk.strPerPoint * str + safeBonus(equipmentBonuses.atk));
  const defense = Math.max(0, formula.defense.base + formula.defense.vitPerPoint * vit + safeBonus(equipmentBonuses.defense));
  const skillPower = Math.max(0, formula.skillPower.base + formula.skillPower.intPerPoint * int + safeBonus(equipmentBonuses.skillPower));
  const agiBonus = Math.min(formula.agiBonus.cap, agi * formula.agiBonus.agiPerPoint + safeBonus(equipmentBonuses.agiBonus));

  return {
    maxHp,
    atk,
    defense,
    skillPower,
    agiBonus,
    power: Math.round(
      maxHp / formula.power.maxHpDivisor
      + atk * formula.power.atkMultiplier
      + defense * formula.power.defenseMultiplier
      + skillPower * formula.power.skillPowerMultiplier,
    ),
  };
}

export function createPlayerBattleState(
  attributes: Attributes = BASE_ATTRIBUTES,
  equipmentBonuses = {},
  // Hệ nhân vật lấy từ save (settings.element). Mặc định 'metal' để các test/snapshot
  // cũ không truyền element vẫn chạy được mà không ảnh hưởng tương khắc bất ngờ.
  element: ElementId = 'metal',
): PlayerBattleState {
  const stats = computeDerivedStats(attributes, equipmentBonuses);
  return {
    level: 1,
    element,
    attributes,
    stats,
    currentHp: stats.maxHp,
    shield: 0,
    energy: 0,
    poisonPotency: 0,
    poisonTurns: 0,
    poisonStacks: 0,
    damageReductionTurns: 0,
    damageReductionPercent: 0,
    controlImmunityTurns: 0,
    reflectDamageRatio: 0,
    attackStreakTargetId: undefined,
    attackStreak: 0,
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
    shield: Math.max(0, Math.min(Math.round(maxHp * CHARACTER_DATA.limits.shieldMaxHpRatio), safeNonNegative(player.shield, 0))),
    energy: Math.max(0, Math.min(CHARACTER_DATA.limits.maxEnergy, safeNonNegative(player.energy, 0))),
    poisonPotency: safeNonNegative(player.poisonPotency, 0),
    poisonTurns: Math.max(0, Math.floor(safeNonNegative(player.poisonTurns, 0))),
    poisonStacks: Math.max(0, Math.floor(safeNonNegative(player.poisonStacks, 0))),
    damageReductionTurns: Math.max(0, Math.floor(safeNonNegative(player.damageReductionTurns, 0))),
    damageReductionPercent: Math.max(0, Math.min(1, safeNonNegative(player.damageReductionPercent, 0))),
    controlImmunityTurns: Math.max(0, Math.floor(safeNonNegative(player.controlImmunityTurns, 0))),
    reflectDamageRatio: Math.max(0, Math.min(1, safeNonNegative(player.reflectDamageRatio, 0))),
    attackStreakTargetId: typeof player.attackStreakTargetId === 'string' ? player.attackStreakTargetId : undefined,
    attackStreak: Math.max(0, Math.floor(safeNonNegative(player.attackStreak, 0))),
  };
}

function safeAttribute(value: number, fallback: number): number {
  return safeNonNegative(value, fallback);
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
