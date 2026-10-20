import { DEFAULT_BATTLE_CONFIG } from './config';
import { findLegalMoves, findMatches, reshuffleBoard, swapCells } from './board';
import { createMonsterBattleState, MONSTER_DEFINITIONS } from './monsters/monster-definitions';
import { chooseLanternCatAction, resolveLanternCatTurn } from './monsters/lantern-cat';
import { applyMonsterAttackDamage, matchDamageMultiplier } from './monsters/monster-combat';
import { clampPlayerState, createPlayerBattleState } from './player';
import { createInitialState, resolveSwap } from './resolve';
import { nextInt } from './rng';
import { CHARACTER_DATA, MONSTER_COMBAT_BALANCE } from './game-data';

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
      const requested = Math.round(healCount * (CHARACTER_DATA.combat.heal.base + monster.level * 2) * multiplier);
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
      const requested = Math.round(shieldCount * (CHARACTER_DATA.combat.shield.base + monster.defense * CHARACTER_DATA.combat.shield.vitMultiplier) * multiplier);
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
      const requested = energyCount * CHARACTER_DATA.combat.energy.perGem + longMatchBonus;
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
  const events: GameEvent[] = [];
  let sequence = startSequence;

  for (const source of baseEvents) {
    if (source.type !== 'GEMS_CLEARED') {
      continue;
    }

    const counts = value<Readonly<Record<string, number>>>(source.payload, 'gemCounts', {});
    const cascade = value(source.payload, 'cascade', 1);
    const longMatchBonus = value(source.payload, 'longMatchBonus', 0);
    const multiplier = comboMultiplier(cascade, config);
    events.push(
      event(state, actionId, sequence, 'GEMS_EFFECT_APPLIED', {
        cascade,
        counts,
        comboMultiplier: multiplier,
      }),
    );
    sequence += 1;

    for (const gem of GEM_TYPES) {
      const count = counts[gem] ?? 0;
      if (count <= 0) {
        continue;
      }

      if (gem === 'attack') {
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
        const matchMultiplier = matchDamageMultiplier(count);
        const raw = count * (player.stats.atk / CHARACTER_DATA.combat.attackGemStatDivisor) * matchMultiplier;
        const requested = Math.max(1, Math.round(raw * multiplier * agiMultiplier) - monster.defense);
        const damage = applyDamageToMonster(monster, requested);
        monster = damage.monster;
        events.push(
          event(state, actionId, sequence, 'DAMAGE_APPLIED', {
            actor: 'player',
            source: 'attack_gems',
            amount: damage.hpDamage,
            requested,
            shieldAbsorbed: damage.absorbed,
            shieldRemaining: monster.shield,
            shieldBroken: damage.absorbed > 0 && monster.shield === 0,
            matchCount: count,
            matchDamageMultiplier: matchMultiplier,
            comboMultiplier: multiplier,
            cascade,
            target: 'monster',
          }),
        );
        sequence += 1;
      }

      if (gem === 'heal') {
        const amount = Math.round(count * (CHARACTER_DATA.combat.heal.base + player.attributes.int * CHARACTER_DATA.combat.heal.intMultiplier) * multiplier);
        const healed = Math.min(player.stats.maxHp - player.currentHp, amount);
        player = clampPlayerState({ ...player, currentHp: player.currentHp + amount });
        events.push(
          event(state, actionId, sequence, 'HEAL_APPLIED', {
            actor: 'player',
            amount: healed,
            requested: amount,
            capped: healed < amount,
            target: 'player',
          }),
        );
        sequence += 1;
      }

      if (gem === 'shield') {
        const amount = Math.round(count * (CHARACTER_DATA.combat.shield.base + player.attributes.vit * CHARACTER_DATA.combat.shield.vitMultiplier) * multiplier);
        const cap = Math.round(player.stats.maxHp * config.shieldCapMaxHpRatio);
        const gained = Math.min(cap - player.shield, amount);
        player = clampPlayerState({ ...player, shield: player.shield + gained });
        events.push(
          event(state, actionId, sequence, 'SHIELD_GAINED', {
            actor: 'player',
            amount: gained,
            requested: amount,
            target: 'player',
          }),
        );
        sequence += 1;
      }

      if (gem === 'energy') {
        const amount = count * CHARACTER_DATA.combat.energy.perGem + longMatchBonus;
        const gained = Math.min(config.energyCap - player.energy, amount);
        player = clampPlayerState({ ...player, energy: player.energy + amount });
        events.push(
          event(state, actionId, sequence, 'ENERGY_GAINED', {
            actor: 'player',
            amount: gained,
            requested: amount,
            target: 'player',
          }),
        );
        sequence += 1;
      }

      if (gem === 'poison') {
        const amount = Math.round(count * (CHARACTER_DATA.combat.poison.intBase + player.attributes.int * CHARACTER_DATA.combat.poison.intMultiplier) * multiplier);
        const cap = Math.round(monster.maxHp * CHARACTER_DATA.limits.poisonMaxHpRatio);
        const applied = Math.min(cap - monster.poisonPotency, amount);
        monster = {
          ...monster,
          poisonPotency: Math.min(cap, monster.poisonPotency + amount),
          poisonTurns: CHARACTER_DATA.combat.poison.turns,
        };
        events.push(
          event(state, actionId, sequence, 'POISON_APPLIED', {
            actor: 'player',
            amount: applied,
            requested: amount,
            turns: CHARACTER_DATA.combat.poison.turns,
            target: 'monster',
          }),
        );
        sequence += 1;
      }
    }

    if (monster.currentHp <= 0) {
      const next = appendOutcome(
        { ...state, player: clampPlayerState(player), monster, rngState },
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
    state: { ...state, player: clampPlayerState(player), monster, rngState },
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
  let monster = { ...state.monster, defense: state.monster.baseDefense };
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
      const damage = applyMonsterAttackDamage(player, incoming);
      player = damage.player;
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
          amount: incoming,
          baseDamage,
          hpDamage: Math.max(0, incoming - damage.absorbed),
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
    { ...state, player, monster },
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

function resolveSkill(
  state: BattleState,
  action: SkillAction,
  config: BattleConfig,
): BattleResolveResult {
  if (state.phase !== 'PLAYER_READY') {
    return reject(state, action, 'phase-locked');
  }
  if (action.skillId !== 'cloud_break_lantern') {
    return reject(state, action, 'unknown-skill');
  }
  const skillConfig = CHARACTER_DATA.skills.cloud_break_lantern;
  const playerState = clampPlayerState(state.player);
  if (playerState.energy < skillConfig.energyCost) {
    return reject(state, action, 'not-enough-energy');
  }

  const requestedDamage = Math.max(
    1,
    Math.round(
      CHARACTER_DATA.skills.cloud_break_lantern.baseDamage
      + playerState.stats.skillPower * CHARACTER_DATA.skills.cloud_break_lantern.skillPowerMultiplier,
    ) - Math.floor(state.monster.defense * CHARACTER_DATA.skills.cloud_break_lantern.defenseMultiplier),
  );
  const damage = applyDamageToMonster(state.monster, requestedDamage);
  const events: GameEvent[] = [
    event(state, action.actionId, 0, 'SKILL_USED', {
      skillId: action.skillId,
      energySpent: skillConfig.energyCost,
    }),
    event(state, action.actionId, 1, 'DAMAGE_APPLIED', {
      actor: 'player',
      source: action.skillId,
      amount: damage.hpDamage,
      requested: requestedDamage,
      shieldAbsorbed: damage.absorbed,
      shieldRemaining: damage.monster.shield,
      shieldBroken: damage.absorbed > 0 && damage.monster.shield === 0,
      target: 'monster',
    }),
  ];
  const monster = damage.monster;
  const player = { ...playerState, energy: Math.max(0, playerState.energy - skillConfig.energyCost) };
  if (monster.currentHp <= 0) {
    return {
      accepted: true,
      events: [
        ...events,
        event(state, action.actionId, 2, 'BATTLE_WON', {
          result: 'VICTORY',
          reason: 'monster_defeated_by_skill',
        }),
      ],
      nextState: {
        ...state,
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
      turn: state.turn + 1,
      phase: 'MONSTER_TURN',
      actionLog: [...state.actionLog, action],
    },
    action.actionId,
    2,
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
  state = {
    ...state,
    playerSkipTurns,
    monster: { ...state.monster, shield: monsterShield, energy: monsterEnergy },
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
    return resolveSkill(state, action, config);
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
    { ...effects.state, phase: 'MONSTER_TURN' },
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
