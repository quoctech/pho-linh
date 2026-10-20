import { dodgeChanceFromAgi } from './combat-formulas';
import { CHARACTER_DATA } from './game-data';
import type { Attributes, DerivedStats, ElementId, EquipmentBonuses, PlayerBattleState } from './types';

export const BASE_ATTRIBUTES: Attributes = { ...CHARACTER_DATA.baseAttributes };

/**
 * Balance V6: chỉ số Lv1 lấy theo hệ (`elementBaseStats`); điểm thuộc tính vượt mốc khởi đầu
 * và trang bị (× `equipmentScale`) cộng thêm. Né = AGI / (AGI + 1900).
 */
export function computeDerivedStats(
  attributes: Attributes,
  equipmentBonuses: EquipmentBonuses = {},
  element: ElementId = 'metal',
): DerivedStats {
  const startAttributes = CHARACTER_DATA.baseAttributes;
  const extra = (value: number, start: number) => Math.max(0, safeAttribute(value, start) - start);
  const str = extra(attributes.str, startAttributes.str);
  const vit = extra(attributes.vit, startAttributes.vit);
  const agiPoints = extra(attributes.agi, startAttributes.agi);
  const int = safeAttribute(attributes.int, startAttributes.int);
  const formula = CHARACTER_DATA.derivedStats;
  const base = CHARACTER_DATA.elementBaseStats[element] ?? CHARACTER_DATA.elementBaseStats.metal;
  const gear = (value: number | undefined) => safeBonus(value) * formula.equipmentScale;
  const maxHp = Math.max(1, base.maxHp + formula.maxHp.vitPerPoint * vit + gear(equipmentBonuses.maxHp));
  const atk = Math.max(0, base.atk + formula.atk.strPerPoint * str + gear(equipmentBonuses.atk));
  const defense = Math.max(0, base.defense + formula.defense.vitPerPoint * vit + gear(equipmentBonuses.defense));
  const skillPower = Math.max(0, formula.skillPower.base + formula.skillPower.intPerPoint * int + gear(equipmentBonuses.skillPower));
  const agi = Math.max(0, base.agi + formula.agi.agiPerPoint * agiPoints + gear(equipmentBonuses.agi));

  return {
    maxHp,
    atk,
    defense,
    skillPower,
    agi,
    dodgeChance: dodgeChanceFromAgi(agi),
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
  const stats = computeDerivedStats(attributes, equipmentBonuses, element);
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
    burningPotency: 0,
    burningTurns: 0,
    healReduction: 0,
    healReductionTurns: 0,
    attackStreakTargetId: undefined,
    attackStreak: 0,
  };
}

export function clampPlayerState(player: PlayerBattleState): PlayerBattleState {
  const fallbackStats = computeDerivedStats(player.attributes, {}, player.element);
  const maxHp = safePositive(player.stats.maxHp, fallbackStats.maxHp);
  const stats: DerivedStats = {
    ...player.stats,
    maxHp,
    atk: safeNonNegative(player.stats.atk, fallbackStats.atk),
    defense: safeNonNegative(player.stats.defense, fallbackStats.defense),
    skillPower: safeNonNegative(player.stats.skillPower, fallbackStats.skillPower),
    agi: safeNonNegative(player.stats.agi, fallbackStats.agi),
    dodgeChance: dodgeChanceFromAgi(safeNonNegative(player.stats.agi, fallbackStats.agi)),
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
    burningPotency: safeNonNegative(player.burningPotency, 0),
    burningTurns: Math.max(0, Math.floor(safeNonNegative(player.burningTurns, 0))),
    healReduction: Math.max(0, Math.min(1, safeNonNegative(player.healReduction, 0))),
    healReductionTurns: Math.max(0, Math.floor(safeNonNegative(player.healReductionTurns, 0))),
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
