export type HeroPersistentStatus =
  | 'idle'
  | 'highHp'
  | 'energy'
  | 'lowHp'
  | 'poisoned'
  | 'shield';

export type HeroHpBand = 'low' | 'normal' | 'high';

export interface HeroStatusSnapshot {
  readonly currentHp: number;
  readonly maxHp: number;
  readonly shield: number;
  readonly poisonTurns: number;
  readonly energy: number;
}

export function getHeroPersistentStatus(status: HeroStatusSnapshot): HeroPersistentStatus {
  if (status.shield > 0) return 'shield';
  if (status.poisonTurns > 0) return 'poisoned';
  if (status.energy > 50) return 'energy';

  const hpRatio = getHpRatio(status.currentHp, status.maxHp);
  if (hpRatio <= 0.3) return 'lowHp';
  if (hpRatio >= 0.7) return 'highHp';
  return 'idle';
}

export function getHeroHpBand(currentHp: number, maxHp: number): HeroHpBand {
  const hpRatio = getHpRatio(currentHp, maxHp);
  if (hpRatio <= 0.3) return 'low';
  if (hpRatio >= 0.7) return 'high';
  return 'normal';
}

function getHpRatio(currentHp: number, maxHp: number): number {
  if (!Number.isFinite(currentHp) || !Number.isFinite(maxHp) || maxHp <= 0) return 0;
  return Math.max(0, Math.min(1, currentHp / maxHp));
}
