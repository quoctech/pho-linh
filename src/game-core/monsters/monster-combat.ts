import { clampPlayerState } from '../player';
import type { PlayerBattleState } from '../types';

export function matchDamageMultiplier(matchCount: number): number {
  if (matchCount >= 6) return 1.6;
  if (matchCount === 5) return 1.4;
  if (matchCount === 4) return 1.2;
  return 1;
}

export function applyMonsterAttackDamage(
  player: PlayerBattleState,
  amount: number,
  damageMultiplier = 1,
): { readonly player: PlayerBattleState; readonly absorbed: number; readonly incoming: number } {
  const incoming = Number.isFinite(amount) ? Math.max(1, Math.round(amount * damageMultiplier)) : 1;
  const safePlayer = clampPlayerState(player);
  const absorbed = Math.min(safePlayer.shield, incoming);
  return {
    absorbed,
    incoming,
    player: clampPlayerState({
      ...safePlayer,
      shield: safePlayer.shield - absorbed,
      currentHp: safePlayer.currentHp - (incoming - absorbed),
    }),
  };
}
