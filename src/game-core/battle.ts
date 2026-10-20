import { DEFAULT_BATTLE_CONFIG } from './config';
import { findLegalMoves, findMatches, reshuffleBoard, swapCells } from './board';
import { createMonsterBattleState, MONSTER_DEFINITIONS } from './monsters/monster-definitions';
import { chooseLanternCatAction, resolveLanternCatTurn } from './monsters/lantern-cat';
import { applyMonsterAttackDamage, matchDamageMultiplier } from './monsters/monster-combat';
import { clampPlayerState, createPlayerBattleState } from './player';
import { createInitialState, resolveSwap } from './resolve';
import { nextInt } from './rng';
import { CHARACTER_DATA, COMBAT_DATA, MONSTER_COMBAT_BALANCE, type PlayerSkillData } from './game-data';
import { elementalModifier, elementRelationship } from './elements';

import {
  GEM_TYPES,
  type BattleAction,
  type BattleConfig,
  type BattlePhase,
  type BattleResolveResult,
  type BattleState,
  type GameEvent,
  type Match3State,
  type MonsterBattleState,
  type PlayerBattleState,
  type SkillAction,
  type SwapAction,
} from './types';

function event(
  state: BattleState,
  actionId: string,
  sequence: number,
  type: GameEvent['type'],
  payload: Readonly<Record<string, unknown>> = {},
  turn = state.turn,
): GameEvent {
  return {
    eventId: `${actionId}:battle:${sequence}`,
    actionId,
    battleId: state.battleId,
    turn,
    type,
    payload,
  };
}

function value<T>(payload: Readonly<Record<string, unknown>>, key: string, fallback: T): T {
  return (payload[key] as T | undefined) ?? fallback;
}

function monsterShieldCap(monster: Pick<MonsterBattleState, 'maxHp' | 'shieldCap'>, config: BattleConfig): number {
  return typeof monster.shieldCap === 'number'
    ? Math.max(0, monster.shieldCap)
    : Math.round(monster.maxHp * config.shieldCapMaxHpRatio);
}

function toMatch3State(state: BattleState, config: BattleConfig): Match3State {
  return {
    battleId: state.battleId,
    seed: state.seed,
    rngState: state.rngState,
    board: state.board,
    turn: state.turn,
    phase: state.phase === 'PLAYER_READY' ? 'ready' : 'ended',
    actionLog: state.actionLog.filter((action): action is SwapAction => action.kind === 'swap'),
  };
}

export function createBattleState(
  seed: number,
  monsterId = 'mist_blob',
  battleId = 'm1-battle',
  config: BattleConfig = DEFAULT_BATTLE_CONFIG,
  player?: PlayerBattleState,
): BattleState {
  const boardState = createInitialState(seed, config.match3, battleId);
  return {
    battleId,
    seed: seed >>> 0,
    rngState: boardState.rngState,
    balanceVersion: config.match3.balanceVersion,
    board: boardState.board,
    turn: 0,
    maxTurns: config.maxTurns,
    phase: 'PLAYER_READY',
    player: player ?? createPlayerBattleState(),
    playerSkipTurns: 0,
    monsterActionDelay: 0,
    damageTakenStreak: 0,
    monster: createMonsterBattleState(monsterId),
    telegraph: `${createMonsterBattleState(monsterId).name} chuẩn bị hành động`,
    terminalReason: undefined,
    actionLog: [],
  };
}

function reject(state: BattleState, action: BattleAction, reason: string): BattleResolveResult {
  return {
    nextState: state,
    accepted: false,
    events: [
      event(state, action.actionId, 0, 'SWAP_REJECTED', { reason }),
    ],
  };
}

function comboMultiplier(cascade: number, config: BattleConfig): number {
  return config.comboMultipliers[Math.min(cascade - 1, config.comboMultipliers.length - 1)] ?? 1;
}

/**
 * V2: nộ nhận theo độ dài match ngọc vàng (3→15, 4→25, 5→40, 6→50), không nhân cascade.
 * `count` là tổng ô vàng bị clear trong bước resolve; với match thẳng đây là độ dài line.
 */
function playerEnergyGain(count: number): number {
  if (count < 3) return 0;
  const key = String(Math.min(6, count));
  return COMBAT_DATA.energyByMatchLength[key] ?? 0;
}

function resolveMonsterMove(
  state: BattleState,
  actionId: string,
  startSequence: number,
  config: BattleConfig,
): {
  readonly state: BattleState;
  readonly events: GameEvent[];
  readonly nextSequence: number;
  readonly attackGemCount: number;
  readonly gemEvents: readonly GameEvent[];
} {
  let workingState = state;
  let legalMoves = findLegalMoves(workingState.board, config.match3);
  const events: GameEvent[] = [];
  let sequence = startSequence;
  if (legalMoves.length === 0) {
    const reshuffled = reshuffleBoard(workingState.board, workingState.rngState, config.match3);
    workingState = { ...workingState, board: reshuffled.board, rngState: reshuffled.rngState };
    legalMoves = findLegalMoves(workingState.board, config.match3);
    events.push(event(state, actionId, sequence, 'BOARD_RESHUFFLED', {
      actor: 'monster',
      usedFallback: reshuffled.usedFallback,
      board: reshuffled.board,
    }));
    sequence += 1;
  }
  if (legalMoves.length === 0) {
    return { state: workingState, events, nextSequence: sequence, attackGemCount: 0, gemEvents: [] };
  }

  const scoredMoves = legalMoves.map((candidate) => {
    const swappedBoard = swapCells(workingState.board, candidate.from, candidate.to);
    const matched = findMatches(swappedBoard, config.match3);
    const counts = matched.reduce<Record<string, number>>((result, coord) => {
      const gem = swappedBoard[coord.row][coord.col];
      result[gem] = (result[gem] ?? 0) + 1;
      return result;
    }, {});
    const tactics = workingState.monster.tactics;
    const isLanternCat = workingState.monster.id === 'lantern_cat';
    const plannedAction = workingState.monster.nextAction;
    const lowHp = workingState.monster.currentHp < workingState.monster.maxHp * MONSTER_COMBAT_BALANCE.lowHpPhaseRatio;
    const attackPriority = tactics.attack + (isLanternCat ? 10 : 0);
    const healPriority = lowHp ? tactics.heal + (isLanternCat ? 10 : 0) : 0;
    const energyPriority = workingState.monster.energy < config.energyCap
      ? tactics.energy + (isLanternCat && plannedAction === 'energy' ? 8 : 0)
      : 0;
    const poisonPriority = isLanternCat && plannedAction !== 'poison'
      ? 0
      : tactics.poison + (isLanternCat ? 10 : 0);
    const shieldPriority = isLanternCat ? 0 : tactics.shield;
    const priority = matched.length
      + (counts['attack'] ?? 0) * attackPriority
      + (counts['shield'] ?? 0) * shieldPriority
      + (counts['heal'] ?? 0) * healPriority
      + (counts['poison'] ?? 0) * poisonPriority
      + (counts['energy'] ?? 0) * energyPriority;
    return { candidate, priority };
  });
  const highestPriority = Math.max(...scoredMoves.map((move) => move.priority));
  const preferredMoves = scoredMoves.filter((move) => move.priority === highestPriority);
  const selected = nextInt(workingState.rngState, preferredMoves.length);
  const move = preferredMoves[selected.value].candidate;
  const fromGem = workingState.board[move.from.row][move.from.col];
  const toGem = workingState.board[move.to.row][move.to.col];
  events.push(
    event(state, actionId, sequence, 'MONSTER_MOVE_SELECTED', {
      actor: 'monster',
      from: move.from,
      to: move.to,
      fromGem,
      toGem,
      label: `${state.monster.name} chọn ${fromGem} → ${toGem}`,
    }),
  );
  sequence += 1;

  const resolved = resolveSwap(
    {
      battleId: workingState.battleId,
      seed: workingState.seed,
      rngState: selected.state,
      board: workingState.board,
      turn: workingState.turn,
      phase: 'ready',
      actionLog: [],
    },
    { kind: 'swap', ...move, actionId: `${actionId}:monster-swap` },
    config.match3,
  );
  const monsterEvents = resolved.events.map((monsterEvent, index) =>
    index === 0
      ? { ...monsterEvent, type: 'MONSTER_SWAP_STARTED' as const, payload: { ...monsterEvent.payload, actor: 'monster' } }
      : { ...monsterEvent, payload: { ...monsterEvent.payload, actor: 'monster' } },
  );
  const gemEvents = resolved.events.filter((monsterEvent) => monsterEvent.type === 'GEMS_CLEARED');
  const gemCounts = gemEvents.reduce<Record<string, number>>((counts, monsterEvent) => {
    const sourceCounts = value<Readonly<Record<string, number>>>(monsterEvent.payload, 'gemCounts', {});
    for (const [gem, count] of Object.entries(sourceCounts)) counts[gem] = (counts[gem] ?? 0) + count;
    return counts;
  }, {});
  const attackGemCount = gemEvents.reduce((total, monsterEvent) => {
    const sourceCounts = value<Readonly<Record<string, number>>>(monsterEvent.payload, 'gemCounts', {});
    return total + (sourceCounts['attack'] ?? 0);
  }, 0);
  events.push(...monsterEvents);
  events.push(event(state, actionId, sequence + monsterEvents.length, 'MONSTER_SWAP_RESOLVED', {
    actor: 'monster',
    from: move.from,
    to: move.to,
    matchCount: resolved.events.filter((monsterEvent) => monsterEvent.type === 'MATCH_FOUND').length,
    gemCounts,
    board: resolved.nextState.board,
  }));

  return {
    state: { ...workingState, board: resolved.nextState.board, rngState: resolved.nextState.rngState },
    events,
    nextSequence: sequence + monsterEvents.length + 1,
    attackGemCount,
    gemEvents,
  };
}

function applyMonsterGemEffects(
  state: BattleState,
  baseEvents: readonly GameEvent[],
  actionId: string,
  startSequence: number,
  config: BattleConfig,
): { readonly state: BattleState; readonly events: GameEvent[]; readonly nextSequence: number } {
  let monster = state.monster;
  const events: GameEvent[] = [];
  let sequence = startSequence;

  for (const source of baseEvents) {
    if (source.type !== 'GEMS_CLEARED') continue;
    const counts = value<Readonly<Record<string, number>>>(source.payload, 'gemCounts', {});
    const cascade = value(source.payload, 'cascade', 1);
    const longMatchBonus = value(source.payload, 'longMatchBonus', 0);
    const multiplier = comboMultiplier(cascade, config);

    const healCount = counts['heal'] ?? 0;
    if (healCount > 0) {
      const monsterHeal = CHARACTER_DATA.combat.monsterGems.heal;
      const requested = Math.round(healCount * (monsterHeal.base + monster.level * monsterHeal.levelMultiplier) * multiplier);
      const amount = Math.min(monster.maxHp - monster.currentHp, requested);
      monster = { ...monster, currentHp: Math.min(monster.maxHp, monster.currentHp + requested) };
      events.push(event(state, actionId, sequence, 'HEAL_APPLIED', {
        actor: 'monster',
        amount,
        requested,
        capped: amount < requested,
        target: 'monster',
      }));
      sequence += 1;
    }

    const shieldCount = counts['shield'] ?? 0;
    if (shieldCount > 0) {
      const monsterShield = CHARACTER_DATA.combat.monsterGems.shield;
      const requested = Math.round(shieldCount * (monsterShield.base + monster.defense * monsterShield.defMultiplier) * multiplier);
      const cap = monsterShieldCap(monster, config);
      const amount = Math.max(0, Math.min(cap - monster.shield, requested));
      monster = { ...monster, shield: Math.min(cap, monster.shield + requested) };
      events.push(event(state, actionId, sequence, 'SHIELD_GAINED', {
        actor: 'monster',
        amount,
        requested,
        cap,
        target: 'monster',
      }));
      sequence += 1;
    }

    const energyCount = counts['energy'] ?? 0;
    if (energyCount > 0) {
      const requested = energyCount * CHARACTER_DATA.combat.monsterGems.energy.perGem + longMatchBonus;
      const amount = Math.max(0, Math.min(CHARACTER_DATA.limits.maxEnergy - monster.energy, requested));
      monster = { ...monster, energy: Math.min(CHARACTER_DATA.limits.maxEnergy, monster.energy + requested) };
      events.push(event(state, actionId, sequence, 'ENERGY_GAINED', {
        actor: 'monster',
        amount,
        requested,
        target: 'monster',
        source: 'monster_energy_gems',
      }));
      sequence += 1;
    }
  }

  return { state: { ...state, monster }, events, nextSequence: sequence };
}

function resolveMonsterSequence(
  state: BattleState,
  actionId: string,
  startSequence: number,
  config: BattleConfig,
): { readonly state: BattleState; readonly events: GameEvent[] } {
  // Keep the pause readable but varied: 1.2s, 1.3s ... 3.0s.
  // The tenths are generated by the deterministic core RNG so replay/save
  // behaviour stays stable and the UI never has to choose a random delay.
  const thinkingConfig = MONSTER_COMBAT_BALANCE.thinkingSeconds;
  const thinking = nextInt(state.rngState, thinkingConfig.steps);
  const thinkingSeconds = Number((thinkingConfig.minimum + thinking.value * thinkingConfig.step).toFixed(1));
  const thinkingState = { ...state, rngState: thinking.state };
  const thinkingEvent = event(state, actionId, startSequence, 'MONSTER_THINKING', {
    actor: 'monster',
    seconds: thinkingSeconds,
    label: `${state.monster.name} đang chuẩn bị... ${thinkingSeconds.toFixed(1)} giây`,
  });
  const move = resolveMonsterMove(thinkingState, actionId, startSequence + 1, config);
  const gemEffects = applyMonsterGemEffects(
    move.state,
    move.gemEvents,
    actionId,
    move.nextSequence,
    config,
  );
  const turn = resolveMonsterTurn(
    { ...gemEffects.state, phase: 'MONSTER_TURN' },
    actionId,
    gemEffects.nextSequence,
    move.attackGemCount,
    config,
  );
  const events = [thinkingEvent, ...move.events, ...gemEffects.events, ...turn.events];
  if (turn.state.playerSkipTurns > 0 && turn.state.phase === 'PLAYER_READY') {
    const skipped = resolveSkippedPlayerTurn(turn.state, `${actionId}:skip`, config);
    return {
      state: skipped.state,
      events: [...events, ...skipped.events],
    };
  }
  return {
    state: turn.state,
    events,
  };
}

function resolveSkippedPlayerTurn(
  state: BattleState,
  actionId: string,
  config: BattleConfig,
): { readonly state: BattleState; readonly events: GameEvent[] } {
  const events: GameEvent[] = [
    event(state, actionId, 0, 'PLAYER_TURN_SKIPPED', {
      actor: 'monster',
      source: 'lantern_cat_long_mieu_lien_kich',
      turns: 1,
      remainingTurns: Math.max(0, state.playerSkipTurns - 1),
      label: 'Nhân vật bị choáng — mất lượt',
    }),
  ];
  const nextState = {
    ...state,
    turn: state.turn + 1,
    phase: 'MONSTER_TURN' as const,
    playerSkipTurns: Math.max(0, state.playerSkipTurns - 1),
  };
  const nextMonsterTurn = resolveMonsterSequence(nextState, `${actionId}:monster`, 1, config);
  return {
    state: nextMonsterTurn.state,
    events: [...events, ...nextMonsterTurn.events],
  };
}

function appendOutcome(
  state: BattleState,
  events: GameEvent[],
  actionId: string,
  sequence: number,
  result: 'VICTORY' | 'DEFEAT',
  reason: string,
): BattleState {
  const phase: BattlePhase = result === 'VICTORY' ? 'VICTORY' : 'DEFEAT';
  events.push(
    event(
      state,
      actionId,
      sequence,
      result === 'VICTORY' ? 'BATTLE_WON' : 'BATTLE_LOST',
      { result, reason },
    ),
  );
  return {
    ...state,
    phase,
    terminalReason: reason,
  };
}

function applyDamageToMonster(
  monster: BattleState['monster'],
  amount: number,
): { readonly monster: BattleState['monster']; readonly absorbed: number; readonly hpDamage: number } {
  const incoming = Number.isFinite(amount) ? Math.max(1, amount) : 1;
  const absorbed = Math.min(monster.shield, incoming);
  const hpDamage = incoming - absorbed;
  return {
    absorbed,
    hpDamage,
    monster: {
      ...monster,
      shield: monster.shield - absorbed,
      currentHp: Math.max(0, monster.currentHp - hpDamage),
    },
  };
}

function applyDirectHpDamageToMonster(
  monster: BattleState['monster'],
  amount: number,
): { readonly monster: BattleState['monster']; readonly absorbed: number; readonly hpDamage: number } {
  const hpDamage = Number.isFinite(amount) ? Math.max(1, Math.round(amount)) : 1;
  return {
    absorbed: 0,
    hpDamage,
    monster: { ...monster, currentHp: Math.max(0, monster.currentHp - hpDamage) },
  };
}

function applyMonsterDefenseReduction(
  monster: BattleState['monster'],
  percent: number,
  turns: number,
): BattleState['monster'] {
  const reduction = Math.max(0, Math.min(1, percent));
  const duration = Math.max(0, Math.floor(turns));
  return {
    ...monster,
    defense: Math.max(0, Math.round(monster.baseDefense * (1 - reduction))),
    defenseReductionPercent: reduction,
    defenseReductionTurns: duration,
  };
}

function consumeMonsterDefenseReduction(monster: BattleState['monster']): BattleState['monster'] {
  if (monster.defenseReductionTurns <= 0) return monster;
  const remaining = monster.defenseReductionTurns - 1;
  return remaining > 0
    ? { ...monster, defenseReductionTurns: remaining }
    : { ...monster, defense: monster.baseDefense, defenseReductionTurns: 0, defenseReductionPercent: 0 };
}

function playerDirectAttackStreak(
  player: PlayerBattleState,
  targetId: string,
): PlayerBattleState {
  return {
    ...player,
    attackStreakTargetId: targetId,
    attackStreak: player.attackStreakTargetId === targetId ? player.attackStreak + 1 : 1,
  };
}

function applyGemEffects(
  state: BattleState,
  baseEvents: readonly GameEvent[],
  actionId: string,
  startSequence: number,
  config: BattleConfig,
): { readonly state: BattleState; readonly events: GameEvent[]; readonly nextSequence: number } {
  let player = clampPlayerState(state.player);
  let monster = state.monster;
  let rngState = state.rngState;
  let monsterActionDelay = state.monsterActionDelay;
  const events: GameEvent[] = [];
  let sequence = startSequence;

  // Balance V3: hệ số hiệu quả ngọc theo tương khắc Ngũ Hành và tham số nội tại nghề.
  // Tính một lần cho cả lượt; game-core quyết định, UI chỉ đọc event.
  const combat = CHARACTER_DATA.combat;
  const passive = CHARACTER_DATA.passives[player.element];
  const relationship = elementRelationship(player.element, monster.element ?? player.element);
  const damageMod = elementalModifier(relationship, 'damage');
  const supportMod = elementalModifier(relationship, 'support');
  const energyMod = elementalModifier(relationship, 'energy');
  const shieldCap = Math.round(player.stats.maxHp * config.shieldCapMaxHpRatio);

  for (const source of baseEvents) {
    if (source.type !== 'GEMS_CLEARED') {
      continue;
    }

    const counts = value<Readonly<Record<string, number>>>(source.payload, 'gemCounts', {});
    const cascade = value(source.payload, 'cascade', 1);
    const multiplier = comboMultiplier(cascade, config);
    events.push(
      event(state, actionId, sequence, 'GEMS_EFFECT_APPLIED', {
        cascade,
        counts,
        comboMultiplier: multiplier,
        elementRelationship: relationship,
        element: player.element,
      }),
    );
    sequence += 1;

    if ((counts['attack'] ?? 0) <= 0) {
      player = { ...player, attackStreakTargetId: undefined, attackStreak: 0 };
    }

    for (const gem of GEM_TYPES) {
      const count = counts[gem] ?? 0;
      if (count <= 0) {
        continue;
      }

      if (gem === 'attack') {
        player = playerDirectAttackStreak(player, monster.id);
        const isCriticalEligible = player.attackStreak >= 2;
        let isCritical = false;
        let criticalRoll: number | undefined;
        if (isCriticalEligible) {
          const roll = nextInt(rngState, 100);
          rngState = roll.state;
          criticalRoll = roll.value;
          isCritical = roll.value < (passive?.criticalChanceBonus ?? 0) * 100;
        }
        if (monster.id === 'mist_blob') {
          const dodgeRoll = nextInt(rngState, 100);
          rngState = dodgeRoll.state;
          const dodgeChance = monster.dodgeChance ?? 0;
          if (dodgeRoll.value < dodgeChance * 100) {
            events.push(
              event(state, actionId, sequence, 'MONSTER_DODGED', {
                actor: 'monster',
                source: 'mist_dust_normal_attack_dodge',
                chance: dodgeChance,
                roll: dodgeRoll.value,
                matchCount: count,
                target: 'monster',
                label: `${monster.name} né đòn đánh thường`,
              }),
            );
            sequence += 1;
            continue;
          }
        }
        const agiMultiplier = cascade >= 2 ? 1 + player.stats.agiBonus : 1;
        const raw = player.stats.atk * count * combat.attackTileFactor * damageMod * multiplier * agiMultiplier;
        const criticalMultiplier = isCritical ? 1 + (passive?.criticalDamageBonus ?? 0) : 1;
        const burningBonus = player.element === 'fire' && monster.burningTurns > 0
          ? passive?.burnDamageBonus ?? 0
          : 0;
        const requested = Math.max(1, Math.round(raw * criticalMultiplier + burningBonus) - monster.defense);
        const damage = applyDamageToMonster(monster, requested);
        monster = damage.monster;
        events.push(
          event(state, actionId, sequence, 'DAMAGE_APPLIED', {
            actor: 'player',
            source: 'attack_gems',
            amount: damage.hpDamage,
            requested,
            critical: isCritical,
            criticalChance: isCriticalEligible ? passive?.criticalChanceBonus ?? 0 : 0,
            criticalRoll,
            criticalMultiplier,
            burningBonus,
            shieldAbsorbed: damage.absorbed,
            shieldRemaining: monster.shield,
            shieldBroken: damage.absorbed > 0 && monster.shield === 0,
            matchCount: count,
            comboMultiplier: multiplier,
            elementRelationship: relationship,
            elementalModifier: damageMod,
            cascade,
            target: 'monster',
          }),
        );
        sequence += 1;
        if (isCritical) {
          events.push(event(state, actionId, sequence, 'PASSIVE_TRIGGERED', {
            passiveId: 'metal_critical',
            element: 'metal',
            amount: criticalMultiplier,
            streak: player.attackStreak,
            target: 'monster',
            label: 'Kiếm Tâm Bất Diệt — chí mạng',
          }));
          sequence += 1;
        }
        if (player.element === 'fire' && monster.currentHp > 0) {
          const turns = passive?.burningTurns ?? 3;
          const potency = Math.max(1, Math.round(player.stats.atk * (passive?.burningAtkFactor ?? 0.1)));
          monster = { ...monster, burningPotency: potency, burningTurns: turns };
          events.push(event(state, actionId, sequence, 'BURNING_APPLIED', {
            actor: 'player', amount: potency, turns, target: 'monster', source: 'attack_gems',
          }));
          sequence += 1;
        }
      }

      if (gem === 'heal') {
        const healMultiplier = player.element === 'wood' && monster.poisonTurns > 0 && monster.poisonPotency > 0
          ? passive?.healMultiplierWhenPoisoned ?? 1
          : 1;
        const amount = Math.round(player.stats.maxHp * combat.heal.maxHpFactor * count * supportMod * multiplier * healMultiplier);
        const healed = Math.min(player.stats.maxHp - player.currentHp, amount);
        player = clampPlayerState({ ...player, currentHp: player.currentHp + amount });
        events.push(
          event(state, actionId, sequence, 'HEAL_APPLIED', {
            actor: 'player',
            amount: healed,
            requested: amount,
            capped: healed < amount,
            elementalModifier: supportMod,
            passiveMultiplier: healMultiplier,
            target: 'player',
          }),
        );
        sequence += 1;

        if (healMultiplier > 1) {
          events.push(event(state, actionId, sequence, 'PASSIVE_TRIGGERED', {
            passiveId: 'wood_healing', element: 'wood', amount: healMultiplier, target: 'player',
            label: 'Sinh Cơ Bất Tận — hồi phục tăng 40%',
          }));
          sequence += 1;
        }
      }

      if (gem === 'shield') {
        const amount = Math.round(player.stats.defense * combat.shield.defFactor * count * supportMod * multiplier);
        const gained = Math.min(shieldCap - player.shield, amount);
        player = clampPlayerState({ ...player, shield: player.shield + gained });
        events.push(
          event(state, actionId, sequence, 'SHIELD_GAINED', {
            actor: 'player',
            amount: gained,
            requested: amount,
            elementalModifier: supportMod,
            target: 'player',
          }),
        );
        sequence += 1;

      }

      if (gem === 'energy') {
        const amount = Math.round(playerEnergyGain(count) * energyMod);
        const gained = Math.min(config.energyCap - player.energy, amount);
        player = clampPlayerState({ ...player, energy: player.energy + amount });
        events.push(
          event(state, actionId, sequence, 'ENERGY_GAINED', {
            actor: 'player',
            amount: gained,
            requested: amount,
            matchCount: count,
            elementalModifier: energyMod,
            target: 'player',
          }),
        );
        sequence += 1;

      }

      if (gem === 'poison') {
        // V2: độc theo tầng — mỗi nhóm ngọc tím cộng một tầng (tối đa poisonMaxStacks),
        // mỗi tầng gây ATK × poisonAtkFactor mỗi lượt, duration reset về poison.turns
        // poisonPotency lưu tổng sát thương/lượt.
        const perStack = Math.max(0, Math.round(player.stats.atk * combat.poisonAtkFactor * damageMod * multiplier));
        const stacks = Math.min(combat.poisonMaxStacks, monster.poisonStacks + 1);
        const potency = stacks * perStack;
        const turns = combat.poison.turns;
        monster = { ...monster, poisonStacks: stacks, poisonPotency: potency, poisonTurns: turns };
        events.push(
          event(state, actionId, sequence, 'POISON_APPLIED', {
            actor: 'player',
            amount: potency,
            perStack,
            stacks,
            turns,
            elementalModifier: damageMod,
            target: 'monster',
          }),
        );
        sequence += 1;
      }
    }

    if (monster.currentHp <= 0) {
      const next = appendOutcome(
        { ...state, player: clampPlayerState(player), monster, rngState, monsterActionDelay },
        events,
        actionId,
        sequence,
        'VICTORY',
        'monster_defeated_by_gems',
      );
      return { state: next, events, nextSequence: sequence + 1 };
    }
  }

  return {
    state: { ...state, player: clampPlayerState(player), monster, rngState, monsterActionDelay },
    events,
    nextSequence: sequence,
  };
}

function resolveMonsterTurn(
  state: BattleState,
  actionId: string,
  startSequence: number,
  attackGemCount: number,
  config: BattleConfig,
): { readonly state: BattleState; readonly events: GameEvent[] } {
  let player = clampPlayerState(state.player);
  let monster = { ...state.monster };
  let damageTakenStreak = 0;
  const events: GameEvent[] = [];
  let sequence = startSequence;

  events.push(event(state, actionId, sequence, 'TURN_STARTED', { turn: state.turn }));
  sequence += 1;

  if (monster.poisonTurns > 0 && monster.poisonPotency > 0) {
    const poisonDamage = monster.poisonPotency;
    const remainingTurns = monster.poisonTurns - 1;
    monster = {
      ...monster,
      currentHp: Math.max(0, monster.currentHp - poisonDamage),
      poisonTurns: remainingTurns,
      poisonPotency: remainingTurns > 0 ? monster.poisonPotency : 0,
      poisonStacks: remainingTurns > 0 ? monster.poisonStacks : 0,
    };
    events.push(
      event(state, actionId, sequence, 'POISON_TICKED', {
        actor: 'monster',
        amount: poisonDamage,
        remainingTurns: monster.poisonTurns,
        source: 'player_poison',
        target: 'monster',
      }),
    );
    sequence += 1;
    if (monster.currentHp <= 0) {
      return {
        state: appendOutcome(
          { ...state, player, monster },
          events,
          actionId,
          sequence,
          'VICTORY',
          'monster_defeated_by_poison',
        ),
        events,
      };
    }
  }

  if (player.poisonTurns > 0 && player.poisonPotency > 0) {
    const poisonDamage = player.poisonPotency;
    const remainingTurns = player.poisonTurns - 1;
    player = clampPlayerState({
      ...player,
      currentHp: player.currentHp - poisonDamage,
      poisonTurns: remainingTurns,
      poisonPotency: remainingTurns > 0 ? player.poisonPotency : 0,
      poisonStacks: remainingTurns > 0 ? player.poisonStacks : 0,
    });
    events.push(
      event(state, actionId, sequence, 'POISON_TICKED', {
        actor: 'player',
        amount: poisonDamage,
        remainingTurns,
        source: 'monster_poison',
        target: 'player',
      }),
    );
    sequence += 1;
    if (player.currentHp <= 0) {
      return {
        state: appendOutcome(
          { ...state, player, monster },
          events,
          actionId,
          sequence,
          'DEFEAT',
          'player_defeated_by_poison',
        ),
        events,
      };
    }
  }

  if (monster.burningTurns > 0 && monster.burningPotency > 0) {
    const burnDamage = monster.burningPotency;
    const remainingTurns = monster.burningTurns - 1;
    monster = {
      ...monster,
      currentHp: Math.max(0, monster.currentHp - burnDamage),
      burningTurns: remainingTurns,
      burningPotency: remainingTurns > 0 ? monster.burningPotency : 0,
    };
    events.push(event(state, actionId, sequence, 'BURNING_TICKED', {
      actor: 'player', amount: burnDamage, remainingTurns, target: 'monster', source: 'fire_passive',
    }));
    sequence += 1;
    if (monster.currentHp <= 0) {
      return {
        state: appendOutcome({ ...state, player, monster }, events, actionId, sequence, 'VICTORY', 'monster_defeated_by_burning'),
        events,
      };
    }
  }

  if (monster.controlTurns > 0) {
    events.push(event(state, actionId, sequence++, 'MONSTER_ACTION_SKIPPED', {
      actor: 'monster', action: monster.controlEffect ?? 'stun', reason: monster.controlEffect ?? 'control',
      label: `${monster.name} bị ${monster.controlEffect === 'freeze' ? 'đóng băng' : 'choáng'} — mất lượt`, target: 'monster',
    }));
    return finishMonsterTurn({ ...state, player, monster: { ...monster, controlTurns: monster.controlTurns - 1, controlEffect: monster.controlTurns > 1 ? monster.controlEffect : undefined }, damageTakenStreak: 0 }, actionId, sequence, events, config);
  }

  // THỦY — Hàn Tức Ngưng Kết: quái bị hoãn, bỏ qua toàn bộ hành động tấn công lượt này
  // (độc vẫn tick ở trên). Trừ một lượt hoãn rồi chuyển sang telegraph lượt kế.
  if (state.monsterActionDelay > 0) {
    events.push(
      event(state, actionId, sequence, 'MONSTER_ACTION_DELAYED', {
        actor: 'monster',
        remaining: state.monsterActionDelay - 1,
        source: 'water_delay_monster',
        label: `${monster.name} bị trì hoãn — mất lượt đánh`,
        target: 'monster',
      }),
    );
    sequence += 1;
    return finishMonsterTurn(
      { ...state, player, monster, monsterActionDelay: state.monsterActionDelay - 1, damageTakenStreak: 0 },
      actionId,
      sequence,
      events,
      config,
    );
  }

  if (monster.id === 'lantern_cat') {
    const lanternTurn = resolveLanternCatTurn({
      state: { ...state, player, monster },
      actionId,
      startSequence: sequence,
      attackGemCount,
      config,
      createEvent: (eventSequence, type, payload = {}) => event(
        state,
        actionId,
        eventSequence,
        type,
        payload,
      ),
    });
    events.push(...lanternTurn.events);
    return finishMonsterTurn(
      lanternTurn.state,
      actionId,
      lanternTurn.nextSequence,
      events,
      config,
    );
  }

  const action = monster.nextAction === 'long_mieu_lien_kich' ? 'basic' : monster.nextAction;
  const mistMatchedAttack = monster.id === 'mist_blob' && attackGemCount > 0;
  let attackAction: 'basic' | 'heavy' | 'poison' | undefined;
  if (action === 'telegraph') {
    if (mistMatchedAttack) {
      attackAction = 'basic';
    } else {
      events.push(event(state, actionId, sequence, 'MONSTER_ACTION_SKIPPED', {
        actor: 'monster',
        actionId: `${actionId}:monster:${monster.actionCount}`,
        action: 'heavy',
        reason: 'telegraph',
        label: `${monster.name} báo đòn mạnh`,
        target: 'player',
      }));
      sequence += 1;
    }
  } else if (action === 'guard') {
    if (monster.id === 'mist_blob') {
      const requested = MONSTER_COMBAT_BALANCE.mistGuardShield;
      const cap = monsterShieldCap(monster, config);
      const amount = Math.max(0, Math.min(cap - monster.shield, requested));
      monster = { ...monster, shield: Math.min(cap, monster.shield + requested) };
      events.push(event(state, actionId, sequence, 'SHIELD_GAINED', {
        actor: 'monster',
        amount,
        requested,
        cap,
        target: 'monster',
        source: 'monster_guard_action',
      }));
      sequence += 1;
      events.push(event(state, actionId, sequence, 'MONSTER_GUARDED', {
        actor: 'monster',
        actionId: `${actionId}:monster:${monster.actionCount}`,
        action: 'guard',
        defenseBonus: 0,
        shieldGained: amount,
        label: `${monster.name} tạo khiên ${amount}`,
      }));
    } else {
      monster = { ...monster, defense: monster.baseDefense + MONSTER_COMBAT_BALANCE.guardDefenseBonus };
      events.push(event(state, actionId, sequence, 'MONSTER_GUARDED', {
        actor: 'monster',
        actionId: `${actionId}:monster:${monster.actionCount}`,
        action: 'guard',
        defenseBonus: MONSTER_COMBAT_BALANCE.guardDefenseBonus,
        label: `${monster.name} dựng thế phòng thủ`,
      }));
    }
    sequence += 1;
    if (mistMatchedAttack) attackAction = 'basic';
  } else if (attackGemCount <= 0 && action !== 'poison' && monster.id !== 'mist_blob') {
    events.push(event(state, actionId, sequence, 'MONSTER_ACTION_SKIPPED', {
      actor: 'monster',
      actionId: `${actionId}:monster:${monster.actionCount}`,
      action,
      reason: 'no-attack-gem',
      label: `${monster.name} không có ngọc tấn công nên không gây sát thương`,
      target: 'player',
    }));
    sequence += 1;
  } else {
    attackAction = action === 'energy' ? undefined : action;
  }

  if (attackAction && (attackGemCount > 0 || monster.id === 'mist_blob')) {
      const isMistBlob = monster.id === 'mist_blob';
      const actionMultiplier = attackAction === 'heavy' ? MONSTER_COMBAT_BALANCE.heavyDamageMultiplier : 1;
      const matchMultiplier = isMistBlob ? 1 : matchDamageMultiplier(attackGemCount);
      const baseDamage = isMistBlob
        ? attackAction === 'heavy' ? monster.attack * MONSTER_COMBAT_BALANCE.heavyDamageMultiplier : monster.attack
        : monster.attack * actionMultiplier * matchMultiplier;
      const incoming = Math.max(
        1,
        Math.round(baseDamage) - Math.floor(player.stats.defense * MONSTER_COMBAT_BALANCE.defenseMitigationMultiplier),
      );
      const nextDamageStreak = state.damageTakenStreak + 1;
      const waterReduction = player.element === 'water' && nextDamageStreak >= (CHARACTER_DATA.passives.water.damageStreakMin ?? 3)
        ? 1 - (CHARACTER_DATA.passives.water.damageReduction ?? 0)
        : 1;
      const earthReduction = player.element === 'earth' && player.shield > 0
        ? 1 - (CHARACTER_DATA.passives.earth.shieldDamageReduction ?? 0)
        : 1;
      const activeReduction = player.damageReductionTurns > 0 ? 1 - player.damageReductionPercent : 1;
      const damageMultiplier = waterReduction * earthReduction * activeReduction;
      damageTakenStreak = nextDamageStreak;
      if (damageMultiplier < 1) {
        events.push(event(state, actionId, sequence, 'PASSIVE_TRIGGERED', {
          passiveId: player.element === 'water' ? 'water_damage_reduction' : 'earth_shield_resistance',
          element: player.element,
          multiplier: damageMultiplier,
          streak: nextDamageStreak,
          target: 'player',
        }));
        sequence += 1;
      }
      const damage = applyMonsterAttackDamage(player, incoming, damageMultiplier);
      player = damage.player;
      if (player.reflectDamageRatio > 0 && damage.incoming > 0) {
        const reflected = Math.max(1, Math.round(damage.incoming * player.reflectDamageRatio));
        const reflectedDamage = applyDamageToMonster(monster, reflected);
        monster = reflectedDamage.monster;
        events.push(event(state, actionId, sequence++, 'DAMAGE_REFLECTED', { actor: 'player', amount: reflectedDamage.hpDamage, shieldAbsorbed: reflectedDamage.absorbed, target: 'monster', source: 'earth_reflect' }));
      }
      events.push(
        event(state, actionId, sequence, 'MONSTER_ATTACKED', {
          actor: 'monster',
          actionId: `${actionId}:monster:${monster.actionCount}`,
          action: attackAction,
          label: attackAction === 'heavy'
            ? `${monster.name} tung đòn nặng`
            : attackAction === 'poison'
              ? `${monster.name} gieo độc`
              : `${monster.name} tấn công`,
          amount: damage.incoming,
          rawIncoming: incoming,
          baseDamage,
          hpDamage: Math.max(0, damage.incoming - damage.absorbed),
          shieldAbsorbed: damage.absorbed,
          shieldRemaining: player.shield,
          shieldBroken: damage.absorbed > 0 && player.shield === 0,
          matchCount: attackGemCount,
          matchDamageMultiplier: matchMultiplier,
          lethal: player.currentHp <= 0,
          target: 'player',
        }),
      );
      sequence += 1;

      const playerEnergyGained = Math.min(CHARACTER_DATA.limits.maxEnergy - player.energy, MONSTER_COMBAT_BALANCE.playerEnergyOnMonsterAttack);
      player = clampPlayerState({ ...player, energy: player.energy + playerEnergyGained });
      events.push(event(state, actionId, sequence, 'ENERGY_GAINED', {
        actor: 'monster',
        amount: playerEnergyGained,
        requested: MONSTER_COMBAT_BALANCE.playerEnergyOnMonsterAttack,
        target: 'player',
        source: 'monster_attack',
      }));
      sequence += 1;

      const energyGained = Math.min(CHARACTER_DATA.limits.maxEnergy - monster.energy, MONSTER_COMBAT_BALANCE.monsterEnergyOnAttack);
      monster = { ...monster, energy: monster.energy + energyGained };
      events.push(event(state, actionId, sequence, 'ENERGY_GAINED', {
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
        // Giữ số tầng >0 để HUD biết người chơi đang trúng độc; độc quái lên người
        // chơi vẫn dùng mô hình potency riêng, stack chỉ phục vụ hiển thị.
        poisonStacks: Math.min(CHARACTER_DATA.combat.poisonMaxStacks, player.poisonStacks + 1),
      });
      events.push(
        event(state, actionId, sequence, 'POISON_APPLIED', {
          actor: 'monster',
          actionId: `${actionId}:monster:${monster.actionCount}`,
          amount: applied,
          requested,
          turns: MONSTER_COMBAT_BALANCE.poisonTurns,
          source: 'monster_poison_action',
          target: 'player',
        }),
      );
      sequence += 1;
  }

  return finishMonsterTurn(
    { ...state, player, monster, damageTakenStreak },
    actionId,
    sequence,
    events,
    config,
  );
}

function finishMonsterTurn(
  state: BattleState,
  actionId: string,
  sequence: number,
  events: GameEvent[],
  config: BattleConfig,
): { readonly state: BattleState; readonly events: GameEvent[] } {
  const nextPlayer = clampPlayerState({
    ...state.player,
    damageReductionTurns: Math.max(0, state.player.damageReductionTurns - 1),
    damageReductionPercent: state.player.damageReductionTurns > 1 ? state.player.damageReductionPercent : 0,
    controlImmunityTurns: Math.max(0, state.player.controlImmunityTurns - 1),
    reflectDamageRatio: state.player.damageReductionTurns > 1 ? state.player.reflectDamageRatio : 0,
  });
  state = { ...state, player: nextPlayer };
  if (state.player.currentHp <= 0) {
    return {
      state: appendOutcome(state, events, actionId, sequence, 'DEFEAT', 'player_hp_zero'),
      events,
    };
  }

  if (state.turn >= config.maxTurns) {
    return {
      state: appendOutcome(state, events, actionId, sequence, 'DEFEAT', 'turn_limit'),
      events,
    };
  }

  const nextCount = state.monster.actionCount + 1;
  const nextPhase: 1 | 2 = state.monster.currentHp <= state.monster.maxHp * MONSTER_COMBAT_BALANCE.lowHpPhaseRatio ? 2 : 1;
  const nextAction = chooseMonsterAction(state.monster, nextPhase, nextCount, config.energyCap);
  const nextActionText = monsterActionText(nextAction);
  const monster = { ...state.monster, actionCount: nextCount, phase: nextPhase, nextAction };
  events.push(
    event(state, actionId, sequence, 'MONSTER_TELEGRAPH', {
      actionId: `${actionId}:telegraph:${nextCount}`,
      action: nextAction,
      label: `${monster.name} chuẩn bị ${nextActionText}`,
      text: `${monster.name} chuẩn bị ${nextActionText}`,
    }),
  );
  return {
    state: {
      ...state,
      monster,
      phase: 'PLAYER_READY',
      telegraph: `${monster.name} chuẩn bị ${nextActionText}`,
    },
    events,
  };
}

function monsterActionText(action: BattleState['monster']['nextAction']): string {
  if (action === 'heavy') return 'đòn nặng';
  if (action === 'guard') return 'phòng thủ';
  if (action === 'poison') return 'gieo độc';
  if (action === 'energy') return 'tích năng lượng';
  if (action === 'telegraph') return 'báo đòn mạnh';
  if (action === 'long_mieu_lien_kich') return 'Long Miêu Liên Kích';
  return 'đánh thường';
}

function chooseMonsterAction(
  monster: BattleState['monster'],
  phase: 1 | 2,
  actionCount: number,
  energyCap = CHARACTER_DATA.limits.maxEnergy,
): 'basic' | 'guard' | 'heavy' | 'energy' | 'poison' | 'telegraph' | 'long_mieu_lien_kich' {
  const definition = MONSTER_DEFINITIONS[monster.id];
  if (!definition) return 'basic';
  if (monster.id === 'mist_blob') {
    // Sương Hồn is intentionally simple for the early game: alternate a
    // readable normal attack with a poison cast. It has no heavy/guard turn.
    return actionCount % 2 === 1 ? 'poison' : 'basic';
  }
  if (monster.id === 'lantern_cat') return chooseLanternCatAction(actionCount, monster.energy, energyCap);
  if (monster.id === 'cloud_fox_boss' && phase === 2) return actionCount % 2 === 0 ? 'heavy' : 'basic';
  if (
    definition.behaviors.includes('poison') &&
    monster.tactics.poison > 0 &&
    actionCount % 4 === 3
  ) return 'poison';
  if (
    definition.behaviors.includes('guard') &&
    actionCount % 3 === 1 &&
    monster.tactics.defense >= monster.tactics.attack * MONSTER_COMBAT_BALANCE.tacticDefenseRatio
  ) return 'guard';
  if (
    definition.behaviors.includes('heavy') &&
    actionCount % 3 === 2 &&
    monster.tactics.attack >= monster.tactics.defense
  ) return 'heavy';
  return 'basic';
}

function playerSkillData(element: PlayerBattleState['element'], skillId: string): PlayerSkillData | undefined {
  if (skillId === 'cloud_break_lantern') return CHARACTER_DATA.skills.cloud_break_lantern;
  const elementSkill = CHARACTER_DATA.elementSkills[element];
  if (elementSkill?.primarySkillId === skillId) return elementSkill.primarySkill;
  return elementSkill?.secondarySkillId === skillId ? elementSkill.secondarySkill : undefined;
}

/** Common resolver for every element primary skill. Only data changes per element. */
function resolvePlayerSkill(
  state: BattleState,
  action: SkillAction,
  config: BattleConfig,
): BattleResolveResult {
  if (state.phase !== 'PLAYER_READY') {
    return reject(state, action, 'phase-locked');
  }
  const playerState = clampPlayerState(state.player);
  const skillConfig = playerSkillData(playerState.element, action.skillId);
  if (!skillConfig) {
    return reject(state, action, 'unknown-skill');
  }
  if (playerState.energy < skillConfig.energyCost) {
    return reject(state, action, 'not-enough-energy');
  }

  const passive = CHARACTER_DATA.passives[playerState.element];
  const nextStreak = playerState.attackStreakTargetId === state.monster.id ? playerState.attackStreak + 1 : 1;
  let rngState = state.rngState;
  let critical = false;
  let criticalRoll: number | undefined;
  if (nextStreak >= 2) {
    const roll = nextInt(rngState, 100);
    rngState = roll.state;
    criticalRoll = roll.value;
    critical = roll.value < (passive?.criticalChanceBonus ?? 0) * 100;
  }
  const baseRaw = skillConfig.attackMultiplier !== undefined
    ? playerState.stats.atk * skillConfig.attackMultiplier
    : skillConfig.baseDamage + playerState.stats.skillPower * skillConfig.skillPowerMultiplier;
  const criticalMultiplier = critical ? 1 + (passive?.criticalDamageBonus ?? 0) : 1;
  const burningBonus = playerState.element === 'fire' && state.monster.burningTurns > 0
    ? passive?.burnDamageBonus ?? 0
    : 0;
  const requestedDamage = skillConfig.fixedDamage !== undefined
    ? skillConfig.fixedDamage
    : skillConfig.attackMultiplier !== undefined
    ? Math.max(1, Math.round(baseRaw * criticalMultiplier + burningBonus))
    : Math.max(
      1,
      Math.round(baseRaw * criticalMultiplier + burningBonus)
        - Math.floor(state.monster.defense * skillConfig.defenseMultiplier),
    );
  let monster = state.monster;
  let player: PlayerBattleState = {
    ...playerState,
    energy: Math.max(0, playerState.energy - skillConfig.energyCost),
    attackStreakTargetId: state.monster.id,
    attackStreak: nextStreak,
  };
  const events: GameEvent[] = [
    event(state, action.actionId, 0, 'SKILL_USED', {
      skillId: action.skillId,
      energySpent: skillConfig.energyCost,
    }),
  ];
  let sequence = 1;
  const hitCount = Math.max(1, skillConfig.hitCount ?? 1);
  for (let hit = 0; hit < hitCount; hit += 1) {
    let damage: { monster: typeof monster; hpDamage: number; absorbed: number };
    if (skillConfig.fixedDamage !== undefined) {
      const amount = skillConfig.fixedDamage;
      const absorbed = Math.min(monster.shield, amount);
      damage = monster.shield > 0
        ? { monster: { ...monster, shield: monster.shield - absorbed }, absorbed, hpDamage: 0 }
        : { monster: { ...monster, currentHp: Math.max(0, monster.currentHp - amount) }, absorbed: 0, hpDamage: amount };
    } else {
      const vulnerability = monster.damageTakenBonusTurns > 0 ? 1 + monster.damageTakenBonus : 1;
      const hitDamage = Math.max(1, Math.round(requestedDamage * vulnerability));
      damage = skillConfig.bypassShield
        ? applyDirectHpDamageToMonster(monster, hitDamage)
        : applyDamageToMonster(monster, hitDamage);
    }
    monster = damage.monster;
    events.push(event(state, action.actionId, sequence, 'DAMAGE_APPLIED', {
      actor: 'player', source: action.skillId, amount: damage.hpDamage,
      requested: skillConfig.fixedDamage ?? requestedDamage, shieldAbsorbed: damage.absorbed,
      shieldRemaining: monster.shield, shieldBroken: damage.absorbed > 0 && monster.shield === 0,
      critical, criticalChance: nextStreak >= 2 ? passive?.criticalChanceBonus ?? 0 : 0,
      criticalRoll, criticalMultiplier, burningBonus, attackMultiplier: skillConfig.attackMultiplier,
      bypassShield: skillConfig.bypassShield === true, hitIndex: hit + 1, hitCount, target: 'monster',
    }));
    sequence += 1;
  }
  if (critical) events.push(event(state, action.actionId, sequence++, 'PASSIVE_TRIGGERED', {
    passiveId: 'metal_critical', element: 'metal', amount: criticalMultiplier, streak: nextStreak,
    target: 'monster', label: 'Kiếm Tâm Bất Diệt — chí mạng',
  }));
  if (playerState.element === 'fire' && monster.currentHp > 0) {
    const turns = passive?.burningTurns ?? 3;
    const potency = Math.max(1, Math.round(playerState.stats.atk * (passive?.burningAtkFactor ?? 0.1)));
    monster = { ...monster, burningPotency: potency, burningTurns: turns };
    events.push(event(state, action.actionId, sequence++, 'BURNING_APPLIED', {
      actor: 'player', amount: potency, turns, target: 'monster', source: action.skillId,
    }));
  }
  if (skillConfig.defenseReduction && skillConfig.defenseReductionTurns) {
    monster = applyMonsterDefenseReduction(monster, skillConfig.defenseReduction, skillConfig.defenseReductionTurns);
    events.push(event(state, action.actionId, sequence++, 'DEFENSE_REDUCED', {
      actor: 'player',
      amount: skillConfig.defenseReduction,
      turns: skillConfig.defenseReductionTurns,
      defense: monster.defense,
      target: 'monster',
      source: action.skillId,
    }));
  }
  if (skillConfig.energySteal) {
    const stolen = Math.min(monster.energy, skillConfig.energySteal);
    monster = { ...monster, energy: monster.energy - stolen };
    player = clampPlayerState({ ...player, energy: player.energy + stolen });
    events.push(event(state, action.actionId, sequence++, 'ENERGY_STOLEN', { actor: 'player', amount: stolen, target: 'monster', source: action.skillId }));
  }
  if (skillConfig.poisonAtkFactor) {
    const potency = Math.max(1, Math.round(playerState.stats.atk * skillConfig.poisonAtkFactor));
    monster = { ...monster, poisonPotency: potency, poisonTurns: skillConfig.poisonTurns ?? 3, poisonStacks: 1 };
    events.push(event(state, action.actionId, sequence++, 'POISON_APPLIED', { actor: 'player', amount: potency, turns: monster.poisonTurns, target: 'monster', source: action.skillId }));
  }
  if (skillConfig.controlEffect && (skillConfig.controlChance ?? 0) > 0) {
    const controlRoll = nextInt(rngState, 100);
    rngState = controlRoll.state;
    if (controlRoll.value < (skillConfig.controlChance ?? 0) * 100) {
      monster = { ...monster, controlEffect: skillConfig.controlEffect, controlTurns: skillConfig.controlTurns ?? 1 };
      events.push(event(state, action.actionId, sequence++, 'CONTROL_APPLIED', { actor: 'player', effect: skillConfig.controlEffect, turns: monster.controlTurns, target: 'monster', source: action.skillId }));
    }
  }
  if (skillConfig.damageTakenBonus) {
    monster = { ...monster, damageTakenBonus: skillConfig.damageTakenBonus, damageTakenBonusTurns: skillConfig.damageTakenBonusTurns ?? 2 };
    events.push(event(state, action.actionId, sequence++, 'DAMAGE_VULNERABILITY_APPLIED', { actor: 'player', amount: skillConfig.damageTakenBonus, turns: monster.damageTakenBonusTurns, target: 'monster', source: action.skillId }));
  }
  if (skillConfig.selfShieldDefenseMultiplier || skillConfig.selfDamageReduction || skillConfig.controlImmunityTurns || skillConfig.reflectDamageRatio) {
    const shieldAmount = Math.round(player.stats.defense * (skillConfig.selfShieldDefenseMultiplier ?? 0));
    player = clampPlayerState({ ...player, shield: player.shield + shieldAmount, damageReductionPercent: skillConfig.selfDamageReduction ?? 0, damageReductionTurns: skillConfig.selfDamageReductionTurns ?? 0, controlImmunityTurns: skillConfig.controlImmunityTurns ?? 0, reflectDamageRatio: skillConfig.reflectDamageRatio ?? 0 });
    events.push(event(state, action.actionId, sequence++, 'SHIELD_GAINED', { actor: 'player', amount: shieldAmount, target: 'player', source: action.skillId }));
  }
  if (monster.currentHp <= 0) {
    return {
      accepted: true,
      events: [
        ...events,
          event(state, action.actionId, sequence, 'BATTLE_WON', {
          result: 'VICTORY',
          reason: 'monster_defeated_by_skill',
        }),
      ],
      nextState: {
        ...state,
        rngState,
        player,
        monster,
        phase: 'VICTORY',
        terminalReason: 'monster_defeated_by_skill',
        actionLog: [...state.actionLog, action],
      },
    };
  }

  const afterMonster = resolveMonsterSequence(
    {
      ...state,
      player,
      monster,
      rngState,
      turn: state.turn + 1,
      phase: 'MONSTER_TURN',
      actionLog: [...state.actionLog, action],
    },
    action.actionId,
    sequence,
    config,
  );
  return {
    accepted: true,
    events: [...events, ...afterMonster.events],
    nextState: afterMonster.state,
  };
}

export function resolveBattleAction(
  state: BattleState,
  action: BattleAction,
  config: BattleConfig = DEFAULT_BATTLE_CONFIG,
): BattleResolveResult {
  // Older active-battle snapshots do not have monster shield/energy yet.
  // Normalize them at the action boundary so migration data cannot produce
  // NaN or make a shield effect disappear unexpectedly.
  const monsterShield = Number.isFinite(state.monster.shield)
    ? Math.max(0, Math.min(monsterShieldCap(state.monster, config), state.monster.shield))
    : 0;
  const monsterEnergy = Number.isFinite(state.monster.energy)
    ? Math.max(0, Math.min(CHARACTER_DATA.limits.maxEnergy, state.monster.energy))
    : 0;
  const playerSkipTurns = Number.isFinite(state.playerSkipTurns)
    ? Math.max(0, Math.min(1, state.playerSkipTurns))
    : 0;
  // Các field passive mới của Balance V3 có thể vắng mặt trong snapshot cũ.
  // không có nên chuẩn hóa về 0 để tránh undefined/NaN khi khôi phục save cũ.
  const monsterActionDelay = Number.isFinite(state.monsterActionDelay)
    ? Math.max(0, Math.floor(state.monsterActionDelay))
    : 0;
  const monsterPoisonStacks = Number.isFinite(state.monster.poisonStacks)
    ? Math.max(0, Math.floor(state.monster.poisonStacks))
    : 0;
  const monsterBurningTurns = Number.isFinite(state.monster.burningTurns)
    ? Math.max(0, Math.floor(state.monster.burningTurns))
    : 0;
  const monsterBurningPotency = Number.isFinite(state.monster.burningPotency)
    ? Math.max(0, state.monster.burningPotency)
    : 0;
  const monsterControlTurns = Number.isFinite(state.monster.controlTurns) ? Math.max(0, Math.floor(state.monster.controlTurns)) : 0;
  const monsterDamageTakenBonus = Number.isFinite(state.monster.damageTakenBonus) ? Math.max(0, Math.min(1, state.monster.damageTakenBonus)) : 0;
  const monsterDamageTakenBonusTurns = Number.isFinite(state.monster.damageTakenBonusTurns) ? Math.max(0, Math.floor(state.monster.damageTakenBonusTurns)) : 0;
  const monsterDefenseReductionTurns = Number.isFinite(state.monster.defenseReductionTurns)
    ? Math.max(0, Math.floor(state.monster.defenseReductionTurns))
    : 0;
  const monsterDefenseReductionPercent = Number.isFinite(state.monster.defenseReductionPercent)
    ? Math.max(0, Math.min(1, state.monster.defenseReductionPercent))
    : 0;
  const damageTakenStreak = Number.isFinite(state.damageTakenStreak)
    ? Math.max(0, Math.floor(state.damageTakenStreak))
    : 0;
  const attackStreak = Number.isFinite(state.player.attackStreak)
    ? Math.max(0, Math.floor(state.player.attackStreak))
    : 0;
  state = {
    ...state,
    playerSkipTurns,
    monsterActionDelay,
    damageTakenStreak,
    player: { ...state.player, attackStreak, attackStreakTargetId: state.player.attackStreakTargetId },
    monster: {
      ...state.monster,
      shield: monsterShield,
      energy: monsterEnergy,
      poisonStacks: monsterPoisonStacks,
      burningTurns: monsterBurningTurns,
      burningPotency: monsterBurningPotency,
      defenseReductionTurns: monsterDefenseReductionTurns,
      defenseReductionPercent: monsterDefenseReductionPercent,
      controlTurns: monsterControlTurns,
      damageTakenBonus: monsterDamageTakenBonus,
      damageTakenBonusTurns: monsterDamageTakenBonusTurns,
    },
  };

  if (action.kind === 'abandon') {
    if (state.phase !== 'PLAYER_READY') {
      return reject(state, action, 'phase-locked');
    }
    return {
      accepted: true,
      events: [event(state, action.actionId, 0, 'BATTLE_ABANDONED', { result: 'ABANDON' })],
      nextState: {
        ...state,
        phase: 'ABANDON',
        terminalReason: 'player_abandoned',
        actionLog: [...state.actionLog, action],
      },
    };
  }

  if (action.kind === 'timeout') {
    if (state.phase !== 'PLAYER_READY') return reject(state, action, 'phase-locked');
    const afterMonster = resolveMonsterSequence(
      { ...state, turn: state.turn + 1, phase: 'MONSTER_TURN', actionLog: [...state.actionLog, action] },
      action.actionId,
      1,
      config,
    );
    return {
      accepted: true,
      events: [event(state, action.actionId, 0, 'TURN_TIMED_OUT', { reason: 'player_turn_timeout', seconds: config.playerTurnSeconds }), ...afterMonster.events],
      nextState: afterMonster.state,
    };
  }

  if (action.kind === 'skill') {
    return resolvePlayerSkill(state, action, config);
  }

  if (state.phase !== 'PLAYER_READY') {
    return reject(state, action, 'phase-locked');
  }

  const match3Result = resolveSwap(toMatch3State(state, config), action, config.match3);
  if (!match3Result.accepted) {
    return {
      accepted: false,
      events: match3Result.events,
      nextState: state,
    };
  }

  const afterBoard: BattleState = {
    ...state,
    board: match3Result.nextState.board,
    rngState: match3Result.nextState.rngState,
    turn: match3Result.nextState.turn,
    phase: 'RESOLVING',
    actionLog: [...state.actionLog, action],
  };
  const effects = applyGemEffects(
    afterBoard,
    match3Result.events,
    action.actionId,
    match3Result.events.length,
    config,
  );
  if (effects.state.phase === 'VICTORY') {
    return {
      accepted: true,
      events: [...match3Result.events, ...effects.events],
      nextState: effects.state,
    };
  }

  const monsterTurn = resolveMonsterSequence(
    { ...effects.state, monster: consumeMonsterDefenseReduction(effects.state.monster), phase: 'MONSTER_TURN' },
    action.actionId,
    effects.nextSequence,
    config,
  );
  return {
    accepted: true,
    events: [...match3Result.events, ...effects.events, ...monsterTurn.events],
    nextState: monsterTurn.state,
  };
}
