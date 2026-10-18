import { clampPlayerState } from '../player';
import { applyMonsterAttackDamage, matchDamageMultiplier } from './monster-combat';
import type {
  BattleConfig,
  BattleState,
  GameEvent,
  MonsterBattleState,
} from '../types';

export type LanternCatAction = 'basic' | 'guard' | 'poison';

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

/** Miêu Đèn: đánh thường → phòng thủ → đánh thường → gieo độc. */
export function chooseLanternCatAction(actionCount: number): LanternCatAction {
  switch (actionCount % 4) {
    case 1: return 'guard';
    case 3: return 'poison';
    default: return 'basic';
  }
}

export function resolveLanternCatTurn(context: LanternCatTurnContext): LanternCatTurnResult {
  let player = clampPlayerState(context.state.player);
  let monster: MonsterBattleState = {
    ...context.state.monster,
    defense: context.state.monster.baseDefense,
  };
  const events: GameEvent[] = [];
  let sequence = context.startSequence;
  const action: LanternCatAction = isLanternCatAction(monster.nextAction)
    ? monster.nextAction
    : chooseLanternCatAction(monster.actionCount);

  if (action === 'guard') {
    monster = { ...monster, defense: monster.baseDefense + 12 };
    events.push(context.createEvent(sequence, 'MONSTER_GUARDED', {
      actor: 'monster',
      actionId: `${context.actionId}:monster:${monster.actionCount}`,
      action: 'guard',
      defenseBonus: 12,
      shieldGained: 0,
      label: `${monster.name} dựng thế phòng thủ`,
    }));
    sequence += 1;
  } else {
    if (context.attackGemCount <= 0 && action === 'basic') {
      events.push(context.createEvent(sequence, 'MONSTER_ACTION_SKIPPED', {
        actor: 'monster',
        actionId: `${context.actionId}:monster:${monster.actionCount}`,
        action,
        reason: 'no-attack-gem',
        label: `${monster.name} không có ngọc tấn công nên không gây sát thương`,
        target: 'player',
      }));
      sequence += 1;
    } else if (context.attackGemCount > 0) {
      const matchMultiplier = matchDamageMultiplier(context.attackGemCount);
      const baseDamage = monster.attack * matchMultiplier;
      const incoming = Math.max(
        1,
        Math.round(baseDamage) - Math.floor(player.stats.defense * 0.6),
      );
      const damage = applyMonsterAttackDamage(player, incoming);
      player = damage.player;
      events.push(context.createEvent(sequence, 'MONSTER_ATTACKED', {
        actor: 'monster',
        actionId: `${context.actionId}:monster:${monster.actionCount}`,
        action,
        label: action === 'poison' ? `${monster.name} gieo độc` : `${monster.name} tấn công`,
        amount: incoming,
        baseDamage,
        hpDamage: Math.max(0, incoming - damage.absorbed),
        shieldAbsorbed: damage.absorbed,
        shieldRemaining: player.shield,
        shieldBroken: damage.absorbed > 0 && player.shield === 0,
        matchCount: context.attackGemCount,
        matchDamageMultiplier: matchMultiplier,
        lethal: player.currentHp <= 0,
        target: 'player',
      }));
      sequence += 1;

      const playerEnergyGained = Math.min(context.config.energyCap - player.energy, 10);
      player = clampPlayerState({ ...player, energy: player.energy + playerEnergyGained });
      events.push(context.createEvent(sequence, 'ENERGY_GAINED', {
        actor: 'monster',
        amount: playerEnergyGained,
        requested: 10,
        target: 'player',
        source: 'monster_attack',
      }));
      sequence += 1;

      const energyGained = Math.min(context.config.energyCap - monster.energy, 15);
      monster = { ...monster, energy: monster.energy + energyGained };
      events.push(context.createEvent(sequence, 'ENERGY_GAINED', {
        actor: 'monster',
        amount: energyGained,
        requested: 15,
        target: 'monster',
        source: 'monster_attack',
      }));
      sequence += 1;
    }

    if (action === 'poison' && monster.tactics.poison > 0) {
      const requested = Math.max(1, Math.round(monster.tactics.poison * 1.5));
      const cap = Math.max(1, Math.round(player.stats.maxHp * 0.2));
      const applied = Math.max(0, Math.min(cap - player.poisonPotency, requested));
      player = clampPlayerState({
        ...player,
        poisonPotency: Math.min(cap, player.poisonPotency + requested),
        poisonTurns: 3,
      });
      events.push(context.createEvent(sequence, 'POISON_APPLIED', {
        actor: 'monster',
        actionId: `${context.actionId}:monster:${monster.actionCount}`,
        amount: applied,
        requested,
        turns: 3,
        source: 'monster_poison_action',
        target: 'player',
      }));
      sequence += 1;
    }
  }

  return {
    state: { ...context.state, player, monster },
    events,
    nextSequence: sequence,
  };
}

function isLanternCatAction(action: MonsterBattleState['nextAction']): action is LanternCatAction {
  return action === 'basic' || action === 'guard' || action === 'poison';
}
