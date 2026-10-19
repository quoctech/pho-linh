import { clampPlayerState } from '../player';
import { applyMonsterAttackDamage, matchDamageMultiplier } from './monster-combat';
import { CHARACTER_DATA, MONSTER_COMBAT_BALANCE } from '../game-data';
import type {
  BattleConfig,
  BattleState,
  GameEvent,
  MonsterBattleState,
} from '../types';

export type LanternCatAction = 'basic' | 'guard' | 'energy' | 'poison' | 'heavy' | 'long_mieu_lien_kich';

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
export function chooseLanternCatAction(actionCount: number): LanternCatAction;
export function chooseLanternCatAction(actionCount: number, energy: number, energyCap: number): LanternCatAction;
export function chooseLanternCatAction(
  actionCount: number,
  energy = 0,
  energyCap = CHARACTER_DATA.limits.maxEnergy,
): LanternCatAction {
  if (energy >= energyCap) return 'long_mieu_lien_kich';
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
    defense: context.state.monster.baseDefense,
  };
  const events: GameEvent[] = [];
  let sequence = context.startSequence;
  let action: LanternCatAction = isLanternCatAction(monster.nextAction)
    ? monster.nextAction
    : chooseLanternCatAction(monster.actionCount, monster.energy, context.config.energyCap);
  if (action === 'long_mieu_lien_kich' && monster.energy < context.config.energyCap) {
    action = chooseLanternCatAction(monster.actionCount, monster.energy, context.config.energyCap);
  }

  if (action === 'long_mieu_lien_kich') {
    const damage = Math.max(1, Math.ceil(player.stats.maxHp * MONSTER_COMBAT_BALANCE.lanternCatSkill.maxHpDamageRatio));
    const energyDrained = Math.min(
      context.config.energyCap,
      Math.max(0, Math.ceil(player.energy * MONSTER_COMBAT_BALANCE.lanternCatSkill.playerEnergyDrainRatio)),
    );
    const monsterEnergyBefore = monster.energy;
    const monsterEnergyAfter = Math.min(context.config.energyCap, MONSTER_COMBAT_BALANCE.lanternCatSkill.energyRestored);
    player = clampPlayerState({
      ...player,
      currentHp: player.currentHp - damage,
      energy: player.energy - energyDrained,
    });
    monster = { ...monster, energy: monsterEnergyAfter };
    events.push(context.createEvent(sequence, 'MONSTER_SKILL_USED', {
      actor: 'monster',
      actionId: `${context.actionId}:monster:${monster.actionCount}:long-mieu-lien-kich`,
      skillId: 'lantern_cat_long_mieu_lien_kich',
      label: `${monster.name} dùng Long Miêu Liên Kích`,
      damage,
      shieldBypassed: true,
      energyBefore: monsterEnergyBefore,
      energySpent: Math.max(0, monsterEnergyBefore - monsterEnergyAfter),
      energyRestored: monsterEnergyAfter,
      playerEnergyBefore: context.state.player.energy,
      playerEnergyDrained: energyDrained,
      playerEnergyAfter: player.energy,
      stunTurns: 1,
      target: 'player',
    }));
    sequence += 1;
    events.push(context.createEvent(sequence, 'DAMAGE_APPLIED', {
      actor: 'monster',
      source: 'lantern_cat_long_mieu_lien_kich',
      actionId: `${context.actionId}:monster:${monster.actionCount}:long-mieu-lien-kich`,
      amount: damage,
      requested: damage,
      hpDamage: damage,
      shieldAbsorbed: 0,
      shieldRemaining: player.shield,
      shieldBypassed: true,
      target: 'player',
      lethal: player.currentHp <= 0,
    }));
    sequence += 1;
    return {
      state: {
        ...context.state,
        player,
        playerSkipTurns: 1,
        monster,
      },
      events,
      nextSequence: sequence,
    };
  }

  if (action === 'guard') {
    monster = { ...monster, defense: monster.baseDefense + MONSTER_COMBAT_BALANCE.guardDefenseBonus };
    events.push(context.createEvent(sequence, 'MONSTER_GUARDED', {
      actor: 'monster',
      actionId: `${context.actionId}:monster:${monster.actionCount}`,
      action: 'guard',
      defenseBonus: MONSTER_COMBAT_BALANCE.guardDefenseBonus,
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
      const matchMultiplier = matchDamageMultiplier(context.attackGemCount);
      const baseDamage = monster.attack
        * (attackAction === 'heavy' ? MONSTER_COMBAT_BALANCE.heavyDamageMultiplier : 1)
        * matchMultiplier;
      const incoming = Math.max(
        1,
        Math.round(baseDamage) - Math.floor(player.stats.defense * MONSTER_COMBAT_BALANCE.defenseMitigationMultiplier),
      );
      const damage = applyMonsterAttackDamage(player, incoming);
      player = damage.player;
      events.push(context.createEvent(sequence, 'MONSTER_ATTACKED', {
        actor: 'monster',
        actionId: `${context.actionId}:monster:${monster.actionCount}`,
        action: attackAction,
        label: attackAction === 'heavy' ? `${monster.name} tung bạo kích` : `${monster.name} tấn công`,
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
      const requested = Math.max(1, Math.round(monster.tactics.poison * MONSTER_COMBAT_BALANCE.poisonPotencyMultiplier));
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
    state: { ...context.state, player, monster },
    events,
    nextSequence: sequence,
  };
}

function isLanternCatAction(action: MonsterBattleState['nextAction']): action is LanternCatAction {
  return action === 'basic'
    || action === 'guard'
    || action === 'energy'
    || action === 'poison'
    || action === 'heavy'
    || action === 'long_mieu_lien_kich';
}
