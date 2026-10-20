import { clampPlayerState } from '../player';
import {
  applyMonsterGuard,
  matchDamageMultiplier,
  monsterAttackIncoming,
  reflectMonsterDamage,
  resolveIncomingMonsterDamage,
  rollPlayerDodge,
} from './monster-combat';
import { CHARACTER_DATA, MONSTER_COMBAT_BALANCE } from '../game-data';
import type {
  BattleConfig,
  BattleState,
  GameEvent,
  MonsterBattleState,
} from '../types';

export type LanternCatAction = 'basic' | 'guard' | 'energy' | 'poison' | 'heavy';

export interface LanternCatTurnContext {
  readonly state: BattleState;
  readonly actionId: string;
  readonly startSequence: number;
  readonly attackGemCount: number;
  readonly config: BattleConfig;
  readonly createEvent: (
    sequence: number,
    type: GameEvent['type'],
    payload?: Readonly<Record<string, unknown>>,
  ) => GameEvent;
}

export interface LanternCatTurnResult {
  readonly state: BattleState;
  readonly events: readonly GameEvent[];
  readonly nextSequence: number;
}

/** Miêu Đèn: đánh thường → tích năng lượng → tích năng lượng → gieo độc → bạo kích. */
export function chooseLanternCatAction(actionCount: number): LanternCatAction {
  switch (actionCount % 5) {
    case 1:
    case 2: return 'energy';
    case 3: return 'poison';
    case 4: return 'heavy';
    default: return 'basic';
  }
}

export function resolveLanternCatTurn(context: LanternCatTurnContext): LanternCatTurnResult {
  let player = clampPlayerState(context.state.player);
  let monster: MonsterBattleState = {
    ...context.state.monster,
  };
  const events: GameEvent[] = [];
  let sequence = context.startSequence;
  let damageTakenStreak = 0;
  let rngState = context.state.rngState;
  let dodged = false;
  // Long Miêu Liên Kích đã chuyển sang skill chung trong monsters.json (monster-skills.ts).
  const action: LanternCatAction = isLanternCatAction(monster.nextAction)
    ? monster.nextAction
    : chooseLanternCatAction(monster.actionCount);

  if (action === 'guard') {
    monster = applyMonsterGuard(monster);
    events.push(context.createEvent(sequence, 'MONSTER_GUARDED', {
      actor: 'monster',
      actionId: `${context.actionId}:monster:${monster.actionCount}`,
      action: 'guard',
      defenseBonus: monster.defense - monster.baseDefense,
      shieldGained: 0,
      label: `${monster.name} dựng thế phòng thủ`,
    }));
    sequence += 1;
  } else {
    const shouldAttack = context.attackGemCount > 0;
    const attackAction = action === 'heavy' ? 'heavy' : 'basic';
    if (!shouldAttack && (action === 'basic' || action === 'heavy')) {
      events.push(context.createEvent(sequence, 'MONSTER_ACTION_SKIPPED', {
        actor: 'monster',
        actionId: `${context.actionId}:monster:${monster.actionCount}`,
        action,
        reason: 'no-attack-gem',
        label: `${monster.name} không có ngọc tấn công nên không gây sát thương`,
        target: 'player',
      }));
      sequence += 1;
    } else if (shouldAttack) {
      const dodge = rollPlayerDodge(player, rngState);
      rngState = dodge.rngState;
      dodged = dodge.dodged;
      if (dodged) {
        // Né thành công: không sát thương, không cộng nộ hai bên.
        events.push(context.createEvent(sequence++, 'PLAYER_DODGED', {
          actor: 'player',
          actionId: `${context.actionId}:monster:${monster.actionCount}`,
          action: attackAction,
          chance: dodge.chance,
          roll: dodge.roll,
          target: 'player',
          label: `Nhân vật né đòn của ${monster.name}`,
        }));
      }
    }
    if (shouldAttack && !dodged) {
      const matchMultiplier = matchDamageMultiplier(context.attackGemCount);
      const baseDamage = monster.attack
        * (attackAction === 'heavy' ? MONSTER_COMBAT_BALANCE.heavyDamageMultiplier : 1)
        * matchMultiplier;
      const incoming = monsterAttackIncoming(player, baseDamage);
      const damage = resolveIncomingMonsterDamage(
        player, monster, incoming, context.state.damageTakenStreak, context.createEvent, sequence,
      );
      events.push(...damage.events);
      sequence = damage.nextSequence;
      damageTakenStreak = damage.damageTakenStreak;
      player = damage.player;
      events.push(context.createEvent(sequence, 'MONSTER_ATTACKED', {
        actor: 'monster',
        actionId: `${context.actionId}:monster:${monster.actionCount}`,
        action: attackAction,
        label: attackAction === 'heavy' ? `${monster.name} tung bạo kích` : `${monster.name} tấn công`,
        amount: damage.incoming,
        rawIncoming: incoming,
        baseDamage,
        damageMultiplier: damage.damageMultiplier,
        hpDamage: Math.max(0, damage.incoming - damage.absorbed),
        shieldAbsorbed: damage.absorbed,
        shieldRemaining: player.shield,
        shieldBroken: damage.absorbed > 0 && player.shield === 0,
        matchCount: context.attackGemCount,
        matchDamageMultiplier: matchMultiplier,
        lethal: player.currentHp <= 0,
        target: 'player',
      }));
      sequence += 1;
      const reflected = reflectMonsterDamage(player, monster, damage.incoming, context.createEvent, sequence);
      monster = reflected.monster;
      events.push(...reflected.events);
      sequence = reflected.nextSequence;

      const playerEnergyGained = Math.min(context.config.energyCap - player.energy, MONSTER_COMBAT_BALANCE.playerEnergyOnMonsterAttack);
      player = clampPlayerState({ ...player, energy: player.energy + playerEnergyGained });
      events.push(context.createEvent(sequence, 'ENERGY_GAINED', {
        actor: 'monster',
        amount: playerEnergyGained,
        requested: MONSTER_COMBAT_BALANCE.playerEnergyOnMonsterAttack,
        target: 'player',
        source: 'monster_attack',
      }));
      sequence += 1;

      const energyGained = Math.min(context.config.energyCap - monster.energy, MONSTER_COMBAT_BALANCE.monsterEnergyOnAttack);
      monster = { ...monster, energy: monster.energy + energyGained };
      events.push(context.createEvent(sequence, 'ENERGY_GAINED', {
        actor: 'monster',
        amount: energyGained,
        requested: MONSTER_COMBAT_BALANCE.monsterEnergyOnAttack,
        target: 'monster',
        source: 'monster_attack',
      }));
      sequence += 1;
    }

    if (action === 'poison' && monster.tactics.poison > 0) {
      const requested = Math.max(1, Math.round(monster.attack * MONSTER_COMBAT_BALANCE.poisonAtkRatio));
      const cap = Math.max(1, Math.round(player.stats.maxHp * CHARACTER_DATA.limits.poisonMaxHpRatio));
      const applied = Math.max(0, Math.min(cap - player.poisonPotency, requested));
      player = clampPlayerState({
        ...player,
        poisonPotency: Math.min(cap, player.poisonPotency + requested),
        poisonTurns: MONSTER_COMBAT_BALANCE.poisonTurns,
      });
      events.push(context.createEvent(sequence, 'POISON_APPLIED', {
        actor: 'monster',
        actionId: `${context.actionId}:monster:${monster.actionCount}`,
        amount: applied,
        requested,
        turns: MONSTER_COMBAT_BALANCE.poisonTurns,
        source: 'monster_poison_action',
        target: 'player',
      }));
      sequence += 1;
    }
  }

  return {
    state: { ...context.state, player, monster, damageTakenStreak, rngState },
    events,
    nextSequence: sequence,
  };
}

function isLanternCatAction(action: MonsterBattleState['nextAction']): action is LanternCatAction {
  return action === 'basic'
    || action === 'guard'
    || action === 'energy'
    || action === 'poison'
    || action === 'heavy';
}
