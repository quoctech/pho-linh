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
): { readonly player: PlayerBattleState; readonly absorbed: number } {
  const incoming = Number.isFinite(amount) ? Math.max(1, amount) : 1;
  const safePlayer = clampPlayerState(player);
  const absorbed = Math.min(safePlayer.shield, incoming);
  return {
    absorbed,
    player: clampPlayerState({
      ...safePlayer,
      shield: safePlayer.shield - absorbed,
      currentHp: safePlayer.currentHp - (incoming - absorbed),
    }),
  };
}
