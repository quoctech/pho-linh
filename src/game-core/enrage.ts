import { COMBAT_DATA } from './game-data';

/**
 * Cuồng Nộ (Balance V7) chống trận kéo dài: từ hành động thứ `startTurn + 1`, mỗi lượt thêm một tầng.
 * `actionTurn` là số thứ tự (1-based) của hành động đang resolve, tức `state.turn + 1`.
 */
export function enrageStacksForTurn(actionTurn: number): number {
  const startTurn = COMBAT_DATA.battle.enrage?.startTurn ?? 0;
  if (startTurn <= 0 || !Number.isFinite(actionTurn)) return 0;
  return Math.max(0, Math.floor(actionTurn) - startTurn);
}

/** Hệ số sát thương trực tiếp cho cả hai phía (ngọc đỏ, skill, đòn/skill quái). */
export function enrageDamageMultiplier(stacks: number): number {
  return 1 + Math.max(0, stacks) * (COMBAT_DATA.battle.enrage?.damageBonusPerTurn ?? 0);
}

/** Hệ số hồi máu của quái (ngọc xanh lá, skill hồi, hồi theo lượt) khi đang Cuồng Nộ. */
export function enrageMonsterHealMultiplier(stacks: number): number {
  return stacks > 0 ? COMBAT_DATA.battle.enrage?.monsterHealMultiplier ?? 1 : 1;
}
