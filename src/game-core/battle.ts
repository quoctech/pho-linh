import { DEFAULT_BATTLE_CONFIG } from './config';
import { findLegalMoves, findMatches, reshuffleBoard, swapCells } from './board';
import { createMonsterBattleState, MONSTER_DEFINITIONS } from './monsters/monster-definitions';
import { clampPlayerState, createPlayerBattleState } from './player';
import { createInitialState, resolveSwap } from './resolve';
import { nextInt } from './rng';
import {
  GEM_TYPES,
  type BattleAction,
  type BattleConfig,
  type BattlePhase,
  type BattleResolveResult,
  type BattleState,
  type GameEvent,
  type Match3State,
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
): { readonly state: BattleState; readonly events: GameEvent[]; readonly nextSequence: number } {
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
    return { state: workingState, events, nextSequence: sequence };
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
    const priority = matched.length
      + (counts['attack'] ?? 0) * tactics.attack
      + (counts['shield'] ?? 0) * tactics.shield
      + (counts['heal'] ?? 0) * tactics.heal
      + (counts['poison'] ?? 0) * tactics.poison
      + (counts['energy'] ?? 0) * tactics.defense;
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
  events.push(...monsterEvents);
  events.push(event(state, actionId, sequence + monsterEvents.length, 'MONSTER_SWAP_RESOLVED', {
    actor: 'monster',
    from: move.from,
    to: move.to,
    matchCount: resolved.events.filter((monsterEvent) => monsterEvent.type === 'MATCH_FOUND').length,
    board: resolved.nextState.board,
  }));

  return {
    state: { ...workingState, board: resolved.nextState.board, rngState: resolved.nextState.rngState },
    events,
    nextSequence: sequence + monsterEvents.length + 1,
  };
}

function resolveMonsterSequence(
  state: BattleState,
  actionId: string,
  startSequence: number,
  config: BattleConfig,
): { readonly state: BattleState; readonly events: GameEvent[] } {
  const thinking = nextInt(state.rngState, 10);
  const thinkingSeconds = thinking.value + 1;
  const thinkingState = { ...state, rngState: thinking.state };
  const thinkingEvent = event(state, actionId, startSequence, 'MONSTER_THINKING', {
    actor: 'monster',
    seconds: thinkingSeconds,
    label: `${state.monster.name} đang suy nghĩ... ${thinkingSeconds}s`,
  });
  const move = resolveMonsterMove(thinkingState, actionId, startSequence + 1, config);
  const turn = resolveMonsterTurn(
    { ...move.state, phase: 'MONSTER_TURN' },
    actionId,
    move.nextSequence,
    config,
  );
  return { state: turn.state, events: [thinkingEvent, ...move.events, ...turn.events] };
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

function applyDamage(
  player: PlayerBattleState,
  monster: BattleState['monster'],
  amount: number,
): { readonly player: PlayerBattleState; readonly monster: BattleState['monster']; readonly absorbed: number } {
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
    monster,
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
        const agiMultiplier = cascade >= 2 ? 1 + player.stats.agiBonus : 1;
        const raw = count * (player.stats.atk / 3);
        const damage = Math.max(1, Math.round(raw * multiplier * agiMultiplier) - monster.defense);
        monster = { ...monster, currentHp: Math.max(0, monster.currentHp - damage) };
        events.push(
          event(state, actionId, sequence, 'DAMAGE_APPLIED', {
            actor: 'player',
            source: 'attack_gems',
            amount: damage,
            cascade,
            target: 'monster',
          }),
        );
        sequence += 1;
      }

      if (gem === 'heal') {
        const amount = Math.round(count * (8 + player.attributes.int * 0.6) * multiplier);
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
        const amount = Math.round(count * (8 + player.attributes.vit * 0.5) * multiplier);
        const cap = Math.round(player.stats.maxHp * config.shieldCapMaxHpRatio);
        const gained = Math.min(cap - player.shield, amount);
        player = clampPlayerState({ ...player, shield: player.shield + amount });
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
        const amount = count * 8 + longMatchBonus;
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
        const amount = Math.round(count * (3 + player.attributes.int * 0.4) * multiplier);
        const cap = Math.round(monster.maxHp * 0.2);
        const applied = Math.min(cap - monster.poisonPotency, amount);
        monster = {
          ...monster,
          poisonPotency: Math.min(cap, monster.poisonPotency + amount),
          poisonTurns: 3,
        };
        events.push(
          event(state, actionId, sequence, 'POISON_APPLIED', {
            actor: 'player',
            amount: applied,
            requested: amount,
            turns: 3,
            target: 'monster',
          }),
        );
        sequence += 1;
      }
    }

    if (monster.currentHp <= 0) {
      const next = appendOutcome(
        { ...state, player: clampPlayerState(player), monster },
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
    state: { ...state, player: clampPlayerState(player), monster },
    events,
    nextSequence: sequence,
  };
}

function resolveMonsterTurn(
  state: BattleState,
  actionId: string,
  startSequence: number,
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
    monster = {
      ...monster,
      currentHp: Math.max(0, monster.currentHp - poisonDamage),
      poisonTurns: monster.poisonTurns - 1,
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

  const action = monster.nextAction;
  if (action === 'guard') {
    monster = { ...monster, defense: monster.baseDefense + 12 };
    events.push(event(state, actionId, sequence, 'MONSTER_GUARDED', {
      actor: 'monster',
      actionId: `${actionId}:monster:${monster.actionCount}`,
      action: 'guard',
      defenseBonus: 12,
      label: `${monster.name} dựng thế phòng thủ`,
    }));
    sequence += 1;
  } else {
    const multiplier = action === 'heavy' ? 1.7 : 1;
    const incoming = Math.max(1, Math.round(monster.attack * multiplier) - Math.floor(player.stats.defense * 0.6));
    const damage = applyDamage(player, monster, incoming);
    player = damage.player;
    events.push(
      event(state, actionId, sequence, 'MONSTER_ATTACKED', {
        actor: 'monster',
        actionId: `${actionId}:monster:${monster.actionCount}`,
        action,
        label: action === 'heavy' ? `${monster.name} tung đòn nặng` : `${monster.name} tấn công`,
        amount: incoming,
        hpDamage: Math.max(0, incoming - damage.absorbed),
        shieldAbsorbed: damage.absorbed,
        target: 'player',
      }),
    );
    sequence += 1;
  }

  if (player.currentHp <= 0) {
    return {
      state: appendOutcome(
        { ...state, player, monster },
        events,
        actionId,
        sequence,
        'DEFEAT',
        'player_hp_zero',
      ),
      events,
    };
  }

  if (state.turn >= config.maxTurns) {
    return {
      state: appendOutcome(
        { ...state, player, monster },
        events,
        actionId,
        sequence,
        'DEFEAT',
        'turn_limit',
      ),
      events,
    };
  }

  const nextCount = monster.actionCount + 1;
  const nextPhase = monster.currentHp <= monster.maxHp * 0.5 ? 2 : 1;
  const nextAction = chooseMonsterAction(monster, nextPhase, nextCount);
  monster = { ...monster, actionCount: nextCount, phase: nextPhase, nextAction };
  events.push(
    event(state, actionId, sequence, 'MONSTER_TELEGRAPH', {
      actionId: `${actionId}:telegraph:${nextCount}`,
      action: nextAction,
      label: `${monster.name} chuẩn bị ${nextAction === 'heavy' ? 'đòn nặng' : nextAction === 'guard' ? 'phòng thủ' : 'tấn công'}`,
      text: `${monster.name} chuẩn bị ${nextAction}`,
    }),
  );
  return {
    state: {
      ...state,
      player: clampPlayerState(player),
      monster,
      phase: 'PLAYER_READY',
      telegraph: `${monster.name} chuẩn bị ${nextAction}`,
    },
    events,
  };
}

function chooseMonsterAction(monster: BattleState['monster'], phase: 1 | 2, actionCount: number): 'basic' | 'guard' | 'heavy' {
  const definition = MONSTER_DEFINITIONS[monster.id];
  if (!definition) return 'basic';
  if (monster.id === 'cloud_fox_boss' && phase === 2) return actionCount % 2 === 0 ? 'heavy' : 'basic';
  if (
    definition.behaviors.includes('guard') &&
    actionCount % 3 === 1 &&
    monster.tactics.defense >= monster.tactics.attack * 0.5
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
  const playerState = clampPlayerState(state.player);
  if (playerState.energy < config.energyCap) {
    return reject(state, action, 'not-enough-energy');
  }

  const damage = Math.max(
    1,
    Math.round(50 + playerState.stats.skillPower * 4) - Math.floor(state.monster.defense * 0.5),
  );
  const events: GameEvent[] = [
    event(state, action.actionId, 0, 'SKILL_USED', {
      skillId: action.skillId,
      energySpent: config.energyCap,
    }),
    event(state, action.actionId, 1, 'DAMAGE_APPLIED', {
      actor: 'player',
      source: action.skillId,
      amount: damage,
      target: 'monster',
    }),
  ];
  const monster = {
    ...state.monster,
    currentHp: Math.max(0, state.monster.currentHp - damage),
  };
  const player = { ...playerState, energy: 0 };
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
