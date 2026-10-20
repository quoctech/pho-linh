import { CHARACTER_DATA } from './game-data';

/** Tỉ lệ né theo AGI (Balance V6): AGI / (AGI + agiOffset), tối đa `dodge.maxChance`. */
export function dodgeChanceFromAgi(agi: number | undefined, bonus = 0): number {
  const { agiOffset, maxChance } = CHARACTER_DATA.combat.dodge;
  const safeAgi = Number.isFinite(agi) ? Math.max(0, agi as number) : 0;
  const base = safeAgi > 0 ? safeAgi / (safeAgi + agiOffset) : 0;
  return Math.max(0, Math.min(maxChance, base + bonus));
}

/** Tỉ lệ sát thương bị DEF giảm (Balance V6): DEF / (DEF + defOffset). */
export function defenseMitigation(defense: number): number {
  const safeDefense = Number.isFinite(defense) ? Math.max(0, defense) : 0;
  return safeDefense / (safeDefense + CHARACTER_DATA.combat.defenseMitigation.defOffset);
}

/** Sát thương sau DEF; toFixed tránh sai số float khi làm tròn (vd 1500 × 0.76). */
export function applyDefense(amount: number, defense: number): number {
  return Math.max(1, Math.round(Number((amount * (1 - defenseMitigation(defense))).toFixed(6))));
}
