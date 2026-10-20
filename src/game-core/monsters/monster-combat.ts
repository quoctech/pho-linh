import { clampPlayerState } from '../player';
import { CHARACTER_DATA, MONSTER_COMBAT_BALANCE } from '../game-data';
import type { GameEvent, MonsterBattleState, PlayerBattleState } from '../types';

type CreateEvent = (
  sequence: number,
  type: GameEvent['type'],
  payload?: Readonly<Record<string, unknown>>,
) => GameEvent;

export function matchDamageMultiplier(matchCount: number): number {
  const multipliers = MONSTER_COMBAT_BALANCE.matchDamageMultipliers;
  const key = String(Math.min(6, Math.max(3, Math.floor(matchCount))));
  return multipliers[key] ?? 1;
}

/** DEF hiệu lực = DEF gốc × (1 − giảm DEF đang áp) + DEF cộng từ guard đang áp. */
export function recomputeMonsterDefense(monster: MonsterBattleState): MonsterBattleState {
  const reduction = monster.defenseReductionTurns > 0 ? monster.defenseReductionPercent : 0;
  const guardBonus = monster.guardTurns > 0 ? MONSTER_COMBAT_BALANCE.guardDefenseBonus : 0;
  return {
    ...monster,
    defense: Math.max(0, Math.round(monster.baseDefense * (1 - reduction))) + guardBonus,
  };
}

export function applyMonsterGuard(monster: MonsterBattleState): MonsterBattleState {
  return recomputeMonsterDefense({ ...monster, guardTurns: MONSTER_COMBAT_BALANCE.guardTurns });
}

export function applyMonsterAttackDamage(
  player: PlayerBattleState,
  amount: number,
  damageMultiplier = 1,
): { readonly player: PlayerBattleState; readonly absorbed: number; readonly incoming: number } {
  // toFixed tránh sai số float của các hệ số giảm nhân dồn (vd 0.9 × 0.75) khi làm tròn.
  const incoming = Number.isFinite(amount) ? Math.max(1, Math.round(Number((amount * damageMultiplier).toFixed(6)))) : 1;
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

export interface IncomingMonsterDamageResult {
  readonly player: PlayerBattleState;
  readonly monster: MonsterBattleState;
  /** Sát thương sau mọi giảm trừ, trước khi khiên hấp thụ. */
  readonly incoming: number;
  readonly absorbed: number;
  readonly damageMultiplier: number;
  readonly damageTakenStreak: number;
  readonly events: GameEvent[];
  readonly nextSequence: number;
}

/**
 * Pipeline chung cho mọi đòn quái đánh vào người chơi:
 * nội tại Thủy (chuỗi nhận đòn) × nội tại Thổ (đang có khiên) × giảm sát thương chủ động
 * (Huyền Nham Hộ Thể) → khiên hấp thụ → HP. Phản đòn chạy riêng qua `reflectMonsterDamage`
 * để caller phát event theo đúng thứ tự sau MONSTER_ATTACKED.
 */
export function resolveIncomingMonsterDamage(
  player: PlayerBattleState,
  monster: MonsterBattleState,
  rawIncoming: number,
  damageTakenStreak: number,
  createEvent: CreateEvent,
  startSequence: number,
): IncomingMonsterDamageResult {
  const events: GameEvent[] = [];
  let sequence = startSequence;
  const nextStreak = damageTakenStreak + 1;
  const waterPassive = CHARACTER_DATA.passives.water;
  const waterReduction = player.element === 'water' && nextStreak >= (waterPassive.damageStreakMin ?? 3)
    ? 1 - (waterPassive.damageReduction ?? 0)
    : 1;
  const earthReduction = player.element === 'earth' && player.shield > 0
    ? 1 - (CHARACTER_DATA.passives.earth.shieldDamageReduction ?? 0)
    : 1;
  const activeReduction = player.damageReductionTurns > 0 ? 1 - player.damageReductionPercent : 1;
  const damageMultiplier = waterReduction * earthReduction * activeReduction;
  if (waterReduction < 1 || earthReduction < 1) {
    events.push(createEvent(sequence++, 'PASSIVE_TRIGGERED', {
      passiveId: waterReduction < 1 ? 'water_damage_reduction' : 'earth_shield_resistance',
      element: player.element,
      multiplier: waterReduction * earthReduction,
      streak: nextStreak,
      target: 'player',
    }));
  }
  const damage = applyMonsterAttackDamage(player, rawIncoming, damageMultiplier);
  return {
    player: damage.player,
    monster,
    incoming: damage.incoming,
    absorbed: damage.absorbed,
    damageMultiplier,
    damageTakenStreak: nextStreak,
    events,
    nextSequence: sequence,
  };
}

/** Huyền Nham Hộ Thể: phản một phần sát thương đã nhận về quái (qua khiên quái trước). */
export function reflectMonsterDamage(
  player: PlayerBattleState,
  monster: MonsterBattleState,
  incoming: number,
  createEvent: CreateEvent,
  startSequence: number,
): { readonly monster: MonsterBattleState; readonly events: GameEvent[]; readonly nextSequence: number } {
  if (player.reflectDamageRatio <= 0 || incoming <= 0) return { monster, events: [], nextSequence: startSequence };
  const reflected = Math.max(1, Math.round(incoming * player.reflectDamageRatio));
  const absorbed = Math.min(monster.shield, reflected);
  const hpDamage = reflected - absorbed;
  const nextMonster = {
    ...monster,
    shield: monster.shield - absorbed,
    currentHp: Math.max(0, monster.currentHp - hpDamage),
  };
  return {
    monster: nextMonster,
    events: [createEvent(startSequence, 'DAMAGE_REFLECTED', {
      actor: 'player', amount: hpDamage, shieldAbsorbed: absorbed, target: 'monster', source: 'earth_reflect',
    })],
    nextSequence: startSequence + 1,
  };
}
