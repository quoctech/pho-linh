import { DEFAULT_BATTLE_CONFIG } from './config';
import { findLegalMoves, findMatches, reshuffleBoard, swapCells } from './board';
import { createMonsterBattleState, MONSTER_DEFINITIONS } from './monsters/monster-definitions';
import { monsterDodgeChance, resolveMonsterSkill, selectMonsterSkill } from './monsters/monster-skills';
import { chooseLanternCatAction, resolveLanternCatTurn } from './monsters/lantern-cat';
import {
  applyMonsterGuard,
  matchDamageMultiplier,
  monsterAttackIncoming,
  recomputeMonsterDefense,
  reflectMonsterDamage,
  resolveIncomingMonsterDamage,
  rollPlayerDodge,
} from './monsters/monster-combat';
import { clampPlayerState, createPlayerBattleState } from './player';
import { createInitialState, resolveSwap } from './resolve';
import { nextInt } from './rng';
import { CHARACTER_DATA, COMBAT_DATA, MONSTER_COMBAT_BALANCE, type PlayerSkillData } from './game-data';
import { elementalModifier, elementRelationship } from './elements';
import { applyDefense } from './combat-formulas';

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
 * V6: nộ nhận theo độ dài match ngọc vàng (3→15, 4→25, ≥5→40), không nhân cascade.
 * `count` là tổng ô vàng bị clear trong bước resolve; dài hơn mốc lớn nhất dùng mốc lớn nhất.
 */
function playerEnergyGain(count: number): number {
  if (count < 3) return 0;
  const lengths = Object.keys(COMBAT_DATA.energyByMatchLength).map(Number).filter(Number.isFinite);
  const key = String(Math.min(Math.max(...lengths), count));
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
      const requested = Math.round(healCount * monster.maxHp * monsterHeal.maxHpRatioPerGem * multiplier);
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
  if (state.monster.controlTurns > 0) {
    return resolveControlledMonsterTurn(state, actionId, startSequence, config);
  }
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

/**
 * Quái bị Đóng băng/Choáng bỏ trọn lượt: không suy nghĩ, không swap ngọc, không nhận hiệu ứng
 * ngọc và không hành động. Độc/Thiêu đốt vẫn tick ở đầu lượt.
 */
function resolveControlledMonsterTurn(
  state: BattleState,
  actionId: string,
  startSequence: number,
  config: BattleConfig,
): { readonly state: BattleState; readonly events: GameEvent[] } {
  const dots = tickTurnStartDoTs({ ...state, phase: 'MONSTER_TURN' }, actionId, startSequence);
  if (dots.terminal) return dots.terminal;
  const { player, events } = dots;
  let { monster } = dots;
  const effect = monster.controlEffect ?? 'stun';
  const remainingTurns = Math.max(0, monster.controlTurns - 1);
  events.push(event(state, actionId, dots.nextSequence, 'MONSTER_ACTION_SKIPPED', {
    actor: 'monster',
    action: effect,
    reason: effect,
    remainingTurns,
    label: `${monster.name} bị ${effect === 'freeze' ? 'đóng băng' : 'choáng'} — mất lượt`,
    target: 'monster',
  }));
  monster = { ...monster, controlTurns: remainingTurns, controlEffect: remainingTurns > 0 ? monster.controlEffect : undefined };
  return finishMonsterTurn(
    { ...state, phase: 'MONSTER_TURN', player, monster, damageTakenStreak: 0 },
    actionId,
    dots.nextSequence + 1,
    events,
    config,
  );
}

function resolveSkippedPlayerTurn(
  state: BattleState,
  actionId: string,
  config: BattleConfig,
): { readonly state: BattleState; readonly events: GameEvent[] } {
  const effect = state.playerSkipEffect ?? 'stun';
  const remainingTurns = Math.max(0, state.playerSkipTurns - 1);
  const events: GameEvent[] = [
    event(state, actionId, 0, 'PLAYER_TURN_SKIPPED', {
      actor: 'monster',
      effect,
      turns: 1,
      remainingTurns,
      label: effect === 'freeze' ? 'Nhân vật bị đóng băng — mất lượt' : 'Nhân vật bị choáng — mất lượt',
    }),
  ];
  // Lượt bị mất vẫn là một hành động của người chơi: debuff đếm theo hành động cũng trôi.
  const nextState = {
    ...state,
    player: tickPlayerDebuffs(state.player),
    monster: tickMonsterDebuffs(state.monster),
    turn: state.turn + 1,
    phase: 'MONSTER_TURN' as const,
    playerSkipTurns: remainingTurns,
    playerSkipEffect: remainingTurns > 0 ? state.playerSkipEffect : undefined,
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
  return recomputeMonsterDefense({
    ...monster,
    defenseReductionPercent: reduction,
    defenseReductionTurns: duration,
  });
}

/**
 * Debuff/buff trên quái tính theo hành động của người chơi: gọi một lần cho mỗi hành động
 * (swap, skill, hết giờ) sau khi damage của hành động đó đã tính xong. Hiệu ứng vừa được
 * áp bởi chính hành động đó không bị trừ, nên "2 lượt tiếp theo" là 2 hành động kế tiếp.
 */
function tickMonsterDebuffs(monster: BattleState['monster']): BattleState['monster'] {
  const defenseReductionTurns = Math.max(0, monster.defenseReductionTurns - 1);
  const damageTakenBonusTurns = Math.max(0, monster.damageTakenBonusTurns - 1);
  return recomputeMonsterDefense({
    ...monster,
    defenseReductionTurns,
    defenseReductionPercent: defenseReductionTurns > 0 ? monster.defenseReductionPercent : 0,
    damageTakenBonusTurns,
    damageTakenBonus: damageTakenBonusTurns > 0 ? monster.damageTakenBonus : 0,
    guardTurns: Math.max(0, monster.guardTurns - 1),
    slowedTurns: Math.max(0, monster.slowedTurns - 1),
    ...tickMonsterDodgeTurns(monster),
  });
}

function tickMonsterDodgeTurns(monster: BattleState['monster']): Pick<BattleState['monster'], 'dodgeBonus' | 'dodgeBonusTurns'> {
  const dodgeBonusTurns = Math.max(0, monster.dodgeBonusTurns - 1);
  return {
    dodgeBonusTurns,
    dodgeBonus: dodgeBonusTurns > 0 || monster.dodgeBonusCharges > 0 ? monster.dodgeBonus : 0,
  };
}

/** Debuff lên nhân vật đếm theo hành động của người chơi (anti-heal của Vụ Lưu Thuẫn). */
function tickPlayerDebuffs(player: PlayerBattleState): PlayerBattleState {
  const healReductionTurns = Math.max(0, player.healReductionTurns - 1);
  return {
    ...player,
    healReductionTurns,
    healReduction: healReductionTurns > 0 ? player.healReduction : 0,
  };
}

/** Thiêu đốt của Phần Thiên Xạ Nhật: nhân direct damage (ngọc đỏ, skill) sau khi trừ DEF. */
function applyDamageTakenBonus(monster: BattleState['monster'], amount: number): number {
  const vulnerability = monster.damageTakenBonusTurns > 0 ? 1 + monster.damageTakenBonus : 1;
  // toFixed tránh sai số float (50 × 1.15 = 57.4999…) làm Math.round lệch 1 điểm.
  return Math.max(1, Math.round(Number((amount * vulnerability).toFixed(6))));
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

/** Nội tại nghề Hỏa (V6): mục tiêu đang Thiêu đốt nhận thêm `burningDamageBonus` (ngọc + skill). */
function burningDamageMultiplier(player: PlayerBattleState, monster: MonsterBattleState): number {
  return player.element === 'fire' && monster.burningTurns > 0
    ? 1 + (CHARACTER_DATA.passives.fire.burningDamageBonus ?? 0)
    : 1;
}

/** THỔ bàn cờ: nộ vừa tích từ ngọc vàng → Khiên = nộ × 0.5 × scale. Trả về sequence kế tiếp. */
function applyEarthEnergyShield(
  state: BattleState,
  actionId: string,
  sequence: number,
  events: GameEvent[],
  energyGained: number,
  shieldCap: number,
  getPlayer: () => PlayerBattleState,
  setPlayer: (player: PlayerBattleState) => void,
): number {
  const player = getPlayer();
  const passive = CHARACTER_DATA.passives.earth;
  if (player.element !== 'earth' || energyGained <= 0 || !passive.energyToShieldRatio) return sequence;
  const requested = Math.round(energyGained * passive.energyToShieldRatio * (passive.energyToShieldScale ?? 1));
  const gained = Math.max(0, Math.min(shieldCap - player.shield, requested));
  setPlayer(clampPlayerState({ ...player, shield: player.shield + gained }));
  events.push(event(state, actionId, sequence, 'SHIELD_GAINED', {
    actor: 'player', amount: gained, requested, target: 'player', source: 'earth_energy_shield',
  }));
  events.push(event(state, actionId, sequence + 1, 'PASSIVE_TRIGGERED', {
    passiveId: 'earth_energy_shield', element: 'earth', amount: gained, energy: energyGained,
    target: 'player', label: 'Huyền Thổ — nộ hóa Khiên',
  }));
  return sequence + 2;
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
        // Né chỉ áp cho đòn ngọc đỏ: né gốc của quái + buff né từ skill quái (V5).
        const dodgeChance = monsterDodgeChance(monster);
        if (dodgeChance > 0) {
          const dodgeRoll = nextInt(rngState, 1000);
          rngState = dodgeRoll.state;
          const buffCharged = monster.dodgeBonusCharges > 0;
          if (buffCharged) {
            const charges = monster.dodgeBonusCharges - 1;
            monster = {
              ...monster,
              dodgeBonusCharges: charges,
              dodgeBonus: charges > 0 || monster.dodgeBonusTurns > 0 ? monster.dodgeBonus : 0,
            };
          }
          if (dodgeRoll.value < dodgeChance * 1000) {
            events.push(
              event(state, actionId, sequence, 'MONSTER_DODGED', {
                actor: 'monster',
                source: buffCharged || monster.dodgeBonusTurns > 0 ? 'monster_dodge_buff' : 'monster_dodge',
                chance: dodgeChance,
                roll: dodgeRoll.value,
                matchCount: count,
                remainingCharges: monster.dodgeBonusCharges,
                remainingTurns: monster.dodgeBonusTurns,
                target: 'monster',
                label: `${monster.name} né đòn đánh thường`,
              }),
            );
            sequence += 1;
            continue;
          }
        }
        const raw = player.stats.atk * count * combat.attackTileFactor * damageMod * multiplier;
        const criticalMultiplier = isCritical ? 1 + (passive?.criticalDamageBonus ?? 0) : 1;
        // HỎA bàn cờ: ngọc đỏ +20% và xuyên khiên; nội tại nghề: +20% vào mục tiêu đang Thiêu đốt.
        const isFire = player.element === 'fire';
        const fireMultiplier = isFire ? 1 + (passive?.redDamageBonus ?? 0) : 1;
        const burningMultiplier = burningDamageMultiplier(player, monster);
        const pierceShield = isFire && passive?.redPierceShield === true;
        const requested = applyDamageTakenBonus(
          monster,
          applyDefense(raw * criticalMultiplier * fireMultiplier * burningMultiplier, monster.defense),
        );
        const damage = pierceShield ? applyDirectHpDamageToMonster(monster, requested) : applyDamageToMonster(monster, requested);
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
            fireMultiplier,
            burningMultiplier,
            pierceShield,
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
        // Vụ Lưu Thuẫn: giảm hồi máu của nhân vật khi còn lượt.
        const healReductionMultiplier = player.healReductionTurns > 0 ? 1 - player.healReduction : 1;
        const amount = Math.round(
          player.stats.maxHp * combat.heal.maxHpFactor * count * supportMod * multiplier * healMultiplier * healReductionMultiplier,
        );
        const healed = Math.min(player.stats.maxHp - player.currentHp, amount);
        player = clampPlayerState({ ...player, currentHp: player.currentHp + amount });
        events.push(
          event(state, actionId, sequence, 'HEAL_APPLIED', {
            actor: 'player',
            amount: healed,
            requested: amount,
            capped: healed < amount,
            healReduction: healReductionMultiplier < 1 ? player.healReduction : 0,
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

        // MỘC bàn cờ: lượng hồi dư khi đầy HP chuyển thành Khiên.
        const overheal = amount - healed;
        if (player.element === 'wood' && passive?.overhealToShield && overheal > 0) {
          const gained = Math.max(0, Math.min(shieldCap - player.shield, overheal));
          player = clampPlayerState({ ...player, shield: player.shield + gained });
          events.push(event(state, actionId, sequence, 'SHIELD_GAINED', {
            actor: 'player', amount: gained, requested: overheal, target: 'player', source: 'wood_overheal',
          }));
          sequence += 1;
          events.push(event(state, actionId, sequence, 'PASSIVE_TRIGGERED', {
            passiveId: 'wood_overheal_shield', element: 'wood', amount: gained, target: 'player',
            label: 'Linh Mộc — hồi dư hóa Khiên',
          }));
          sequence += 1;
        }
      }

      if (gem === 'shield') {
        // THỦY bàn cờ: match khiên dòng ≥4 → khiên ×1.5 và hoãn đòn đánh của quái lượt kế.
        const longestShieldLine = value<Readonly<Record<string, number>>>(source.payload, 'longestLineByGem', {})['shield'] ?? 0;
        const waterLongMatch = player.element === 'water' && longestShieldLine >= (passive?.shieldMatchMin ?? Infinity);
        const waterMultiplier = waterLongMatch ? 1 + (passive?.shieldBonusRatio ?? 0) : 1;
        const amount = Math.round(player.stats.defense * combat.shield.defFactor * count * supportMod * multiplier * waterMultiplier);
        const gained = Math.min(shieldCap - player.shield, amount);
        player = clampPlayerState({ ...player, shield: player.shield + gained });
        events.push(
          event(state, actionId, sequence, 'SHIELD_GAINED', {
            actor: 'player',
            amount: gained,
            requested: amount,
            elementalModifier: supportMod,
            passiveMultiplier: waterMultiplier,
            target: 'player',
          }),
        );
        sequence += 1;
        if (waterLongMatch) {
          monsterActionDelay = Math.max(monsterActionDelay, passive?.delayMonsterAttackTurns ?? 1);
          events.push(event(state, actionId, sequence, 'PASSIVE_TRIGGERED', {
            passiveId: 'water_shield_delay', element: 'water', amount: waterMultiplier, matchLength: longestShieldLine,
            delay: monsterActionDelay, target: 'monster', label: 'Hàn Thủy — khiên tăng, quái bị hoãn đòn',
          }));
          sequence += 1;
        }
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
        sequence = applyEarthEnergyShield(state, actionId, sequence, events, gained, shieldCap, () => player, (next) => { player = next; });
      }

      if (gem === 'poison') {
        // V2: độc theo tầng — mỗi nhóm ngọc tím cộng một tầng (tối đa poisonMaxStacks),
        // mỗi tầng gây ATK × poisonAtkFactor mỗi lượt, duration reset về poison.turns
        // poisonPotency lưu tổng sát thương/lượt, gồm cả phần độc từ skill Mộc (skillPoisonPotency).
        const perStack = Math.max(0, Math.round(player.stats.atk * combat.poisonAtkFactor * damageMod * multiplier));
        const stacks = Math.min(combat.poisonMaxStacks, monster.poisonStacks + 1);
        const potency = stacks * perStack + monster.skillPoisonPotency;
        // MỘC bàn cờ: ngọc tím duy trì độc thêm +1 lượt.
        const baseTurns = combat.poison.turns + (player.element === 'wood' ? passive?.poisonExtraTurns ?? 0 : 0);
        const turns = Math.max(monster.poisonTurns, baseTurns);
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

    // KIM bàn cờ: ngọc vàng bị phá thêm khi ăn ngọc đỏ (resolve.ts quyết định ô bị phá).
    const bonusEnergyGems = value<readonly unknown[]>(source.payload, 'bonusCoordinates', []).length;
    if (bonusEnergyGems > 0) {
      const amount = Math.round(bonusEnergyGems * (passive?.yellowBreakEnergy ?? 0) * energyMod);
      const gained = Math.min(config.energyCap - player.energy, amount);
      player = clampPlayerState({ ...player, energy: player.energy + amount });
      events.push(event(state, actionId, sequence, 'ENERGY_GAINED', {
        actor: 'player', amount: gained, requested: amount, gems: bonusEnergyGems, target: 'player', source: 'metal_passive',
      }));
      sequence += 1;
      events.push(event(state, actionId, sequence, 'PASSIVE_TRIGGERED', {
        passiveId: 'metal_yellow_break', element: 'metal', amount: gained, gems: bonusEnergyGems,
        coordinates: value<readonly unknown[]>(source.payload, 'bonusCoordinates', []),
        target: 'player', label: 'Kiếm Tông — phá ngọc vàng, tích nộ',
      }));
      sequence += 1;
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
  const dots = tickTurnStartDoTs(state, actionId, startSequence);
  if (dots.terminal) return dots.terminal;
  return resolveMonsterAction(state, actionId, dots, attackGemCount, config);
}

interface TurnStartDoTs {
  readonly player: PlayerBattleState;
  readonly monster: MonsterBattleState;
  readonly events: GameEvent[];
  readonly nextSequence: number;
  readonly terminal?: { readonly state: BattleState; readonly events: GameEvent[] };
}

/** Đầu lượt quái: tick độc lên quái, độc lên người chơi và Thiêu đốt. */
function tickTurnStartDoTs(
  state: BattleState,
  actionId: string,
  startSequence: number,
): TurnStartDoTs {
  let player = clampPlayerState(state.player);
  let monster = { ...state.monster };
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
      skillPoisonPotency: remainingTurns > 0 ? monster.skillPoisonPotency : 0,
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
      return { player, monster, events, nextSequence: sequence, terminal: {
        state: appendOutcome(
          { ...state, player, monster },
          events,
          actionId,
          sequence,
          'VICTORY',
          'monster_defeated_by_poison',
        ),
        events,
      } };
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
      return { player, monster, events, nextSequence: sequence, terminal: {
        state: appendOutcome(
          { ...state, player, monster },
          events,
          actionId,
          sequence,
          'DEFEAT',
          'player_defeated_by_poison',
        ),
        events,
      } };
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
      return { player, monster, events, nextSequence: sequence, terminal: {
        state: appendOutcome({ ...state, player, monster }, events, actionId, sequence, 'VICTORY', 'monster_defeated_by_burning'),
        events,
      } };
    }
  }

  // Thiêu đốt lên nhân vật (Long Miêu Liên Kích).
  if (player.burningTurns > 0 && player.burningPotency > 0) {
    const burnDamage = player.burningPotency;
    const remainingTurns = player.burningTurns - 1;
    player = clampPlayerState({
      ...player,
      currentHp: player.currentHp - burnDamage,
      burningTurns: remainingTurns,
      burningPotency: remainingTurns > 0 ? player.burningPotency : 0,
    });
    events.push(event(state, actionId, sequence, 'BURNING_TICKED', {
      actor: 'monster', amount: burnDamage, remainingTurns, target: 'player', source: 'monster_burning',
    }));
    sequence += 1;
    if (player.currentHp <= 0) {
      return { player, monster, events, nextSequence: sequence, terminal: {
        state: appendOutcome({ ...state, player, monster }, events, actionId, sequence, 'DEFEAT', 'player_defeated_by_burning'),
        events,
      } };
    }
  }

  // Hồi máu theo lượt của quái (Lục Diệp Ẩn Tung).
  if (monster.healTurns > 0 && monster.healPerTurn > 0) {
    const perTurn = monster.healPerTurn;
    const healed = Math.min(monster.maxHp - monster.currentHp, perTurn);
    const remainingTurns = monster.healTurns - 1;
    monster = {
      ...monster,
      currentHp: monster.currentHp + healed,
      healTurns: remainingTurns,
      healPerTurn: remainingTurns > 0 ? monster.healPerTurn : 0,
    };
    events.push(event(state, actionId, sequence, 'HEAL_APPLIED', {
      actor: 'monster', amount: healed, requested: perTurn, remainingTurns, target: 'monster', source: 'monster_heal_over_time',
    }));
    sequence += 1;
  }

  return { player, monster, events, nextSequence: sequence };
}

function resolveMonsterAction(
  state: BattleState,
  actionId: string,
  dots: TurnStartDoTs,
  attackGemCount: number,
  config: BattleConfig,
): { readonly state: BattleState; readonly events: GameEvent[] } {
  let player = dots.player;
  let monster = dots.monster;
  let damageTakenStreak = 0;
  let rngState = state.rngState;
  const events = dots.events;
  let sequence = dots.nextSequence;

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
    // Quái vừa bị hoãn = "Làm chậm" cho nội tại Hàn Tức Ngưng Kết trong các hành động kế tiếp.
    monster = { ...monster, slowedTurns: Math.max(monster.slowedTurns, CHARACTER_DATA.passives.water.slowedTurnsAfterDelay ?? 0) };
    return finishMonsterTurn(
      { ...state, player, monster, monsterActionDelay: state.monsterActionDelay - 1, damageTakenStreak: 0 },
      actionId,
      sequence,
      events,
      config,
    );
  }

  // Skill quái (V5): đủ nộ + đúng ngưỡng HP thì dùng skill thay hành động lượt này.
  const skill = selectMonsterSkill(monster);
  if (skill) {
    const skillTurn = resolveMonsterSkill({
      state: { ...state, player, monster },
      skill,
      actionId,
      startSequence: sequence,
      shieldCap: monsterShieldCap(monster, config),
      createEvent: (eventSequence, type, payload = {}) => event(state, actionId, eventSequence, type, payload),
    });
    events.push(...skillTurn.events);
    return finishMonsterTurn(skillTurn.state, actionId, skillTurn.nextSequence, events, config);
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

  // Skill đã telegraph nhưng hết đủ điều kiện (vd bị hút nộ) thì đánh thường.
  const action = monster.nextAction === 'long_mieu_lien_kich' || monster.nextAction === 'skill' ? 'basic' : monster.nextAction;
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
      monster = applyMonsterGuard(monster);
      events.push(event(state, actionId, sequence, 'MONSTER_GUARDED', {
        actor: 'monster',
        actionId: `${actionId}:monster:${monster.actionCount}`,
        action: 'guard',
        defenseBonus: monster.defense - monster.baseDefense,
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

  // Nhân vật né đòn thường/nặng theo AGI (skill quái và đòn gieo độc luôn trúng).
  if (attackAction && (attackGemCount > 0 || monster.id === 'mist_blob') && (attackAction === 'basic' || attackAction === 'heavy')) {
    const dodge = rollPlayerDodge(player, rngState);
    rngState = dodge.rngState;
    if (dodge.dodged) {
      events.push(event(state, actionId, sequence++, 'PLAYER_DODGED', {
        actor: 'player',
        actionId: `${actionId}:monster:${monster.actionCount}`,
        action: attackAction,
        chance: dodge.chance,
        roll: dodge.roll,
        target: 'player',
        label: `Nhân vật né đòn của ${monster.name}`,
      }));
      attackAction = undefined;
    }
  }

  if (attackAction && (attackGemCount > 0 || monster.id === 'mist_blob')) {
      const isMistBlob = monster.id === 'mist_blob';
      const actionMultiplier = attackAction === 'heavy' ? MONSTER_COMBAT_BALANCE.heavyDamageMultiplier : 1;
      const matchMultiplier = isMistBlob ? 1 : matchDamageMultiplier(attackGemCount);
      const baseDamage = isMistBlob
        ? attackAction === 'heavy' ? monster.attack * MONSTER_COMBAT_BALANCE.heavyDamageMultiplier : monster.attack
        : monster.attack * actionMultiplier * matchMultiplier;
      const incoming = monsterAttackIncoming(player, baseDamage);
      const createEvent = (eventSequence: number, type: GameEvent['type'], payload: Readonly<Record<string, unknown>> = {}) =>
        event(state, actionId, eventSequence, type, payload);
      const damage = resolveIncomingMonsterDamage(player, monster, incoming, state.damageTakenStreak, createEvent, sequence);
      events.push(...damage.events);
      sequence = damage.nextSequence;
      damageTakenStreak = damage.damageTakenStreak;
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
          amount: damage.incoming,
          rawIncoming: incoming,
          baseDamage,
          damageMultiplier: damage.damageMultiplier,
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
      const reflected = reflectMonsterDamage(player, monster, damage.incoming, createEvent, sequence);
      monster = reflected.monster;
      events.push(...reflected.events);
      sequence = reflected.nextSequence;

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
      const requested = Math.max(1, Math.round(monster.attack * MONSTER_COMBAT_BALANCE.poisonAtkRatio));
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
    { ...state, player, monster, damageTakenStreak, rngState },
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

  if (state.monster.currentHp <= 0) {
    return {
      state: appendOutcome(state, events, actionId, sequence, 'VICTORY', 'monster_defeated_by_reflect'),
      events,
    };
  }

  // maxTurns = 0: tạm bỏ giới hạn lượt (combat.json → battle.maxTurns).
  if (config.maxTurns > 0 && state.turn >= config.maxTurns) {
    return {
      state: appendOutcome(state, events, actionId, sequence, 'DEFEAT', 'turn_limit'),
      events,
    };
  }

  const nextCount = state.monster.actionCount + 1;
  const nextPhase: 1 | 2 = state.monster.currentHp <= state.monster.maxHp * MONSTER_COMBAT_BALANCE.lowHpPhaseRatio ? 2 : 1;
  // Đủ nộ + đúng ngưỡng HP thì báo trước skill; lượt sau vẫn chọn lại skill theo trạng thái lúc đó.
  const nextSkill = selectMonsterSkill(state.monster);
  const nextAction: MonsterBattleState['nextAction'] = nextSkill ? 'skill' : chooseMonsterAction(state.monster, nextPhase, nextCount);
  const nextActionText = nextSkill ? nextSkill.name : monsterActionText(nextAction);
  const monster = { ...state.monster, actionCount: nextCount, phase: nextPhase, nextAction, nextSkillId: nextSkill?.id };
  events.push(
    event(state, actionId, sequence, 'MONSTER_TELEGRAPH', {
      actionId: `${actionId}:telegraph:${nextCount}`,
      action: nextAction,
      skillId: nextSkill?.id,
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
  if (action === 'skill' || action === 'long_mieu_lien_kich') return 'tuyệt kỹ';
  return 'đánh thường';
}

function chooseMonsterAction(
  monster: BattleState['monster'],
  phase: 1 | 2,
  actionCount: number,
): 'basic' | 'guard' | 'heavy' | 'energy' | 'poison' | 'telegraph' {
  const definition = MONSTER_DEFINITIONS[monster.id];
  if (!definition) return 'basic';
  if (monster.id === 'mist_blob') {
    // Sương Hồn is intentionally simple for the early game: alternate a
    // readable normal attack with a poison cast. It has no heavy/guard turn.
    return actionCount % 2 === 1 ? 'poison' : 'basic';
  }
  if (monster.id === 'lantern_cat') return chooseLanternCatAction(actionCount);
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

/** Skill thuần buff (Huyền Nham Hộ Thể) không gây hit nào lên quái. */
function skillDealsDamage(skillConfig: PlayerSkillData): boolean {
  return skillConfig.fixedDamage !== undefined
    || skillConfig.attackMultiplier !== undefined
    || skillConfig.baseDamage > 0
    || skillConfig.skillPowerMultiplier > 0;
}

/**
 * Sát thương một hit của skill. %ATK: round(ATK × hệ số × crit + bonus Thiêu đốt) − DEF quái
 * (min 1), rồi nhân +% sát thương nhận. fixedDamage (Hàn Triều Phá Không) không trừ DEF.
 */
function skillHitDamage(
  player: PlayerBattleState,
  monster: MonsterBattleState,
  skillConfig: PlayerSkillData,
  criticalMultiplier: number,
  burningMultiplier: number,
): number {
  if (skillConfig.fixedDamage !== undefined) return Math.max(0, skillConfig.fixedDamage);
  const afterDefense = skillConfig.attackMultiplier !== undefined
    ? applyDefense(player.stats.atk * skillConfig.attackMultiplier * criticalMultiplier * burningMultiplier, monster.defense)
    : Math.max(
      1,
      Math.round((skillConfig.baseDamage + player.stats.skillPower * skillConfig.skillPowerMultiplier) * criticalMultiplier * burningMultiplier)
        - Math.floor(monster.defense * skillConfig.defenseMultiplier),
    );
  return applyDamageTakenBonus(monster, afterDefense);
}

export interface PlayerSkillPreview {
  readonly skillId: string;
  readonly config: PlayerSkillData;
  /** Sát thương mỗi hit với trạng thái hiện tại (không tính chí mạng). */
  readonly damagePerHit: number;
  readonly hitCount: number;
  readonly totalDamage: number;
}

/** Dùng chung công thức với resolver để tooltip hiển thị đúng damage thật. */
export function previewPlayerSkill(state: BattleState, skillId: string): PlayerSkillPreview | undefined {
  const player = clampPlayerState(state.player);
  const config = playerSkillData(player.element, skillId);
  if (!config) return undefined;
  const burningMultiplier = burningDamageMultiplier(player, state.monster);
  if (!skillDealsDamage(config)) return { skillId, config, damagePerHit: 0, hitCount: 0, totalDamage: 0 };
  const hitCount = Math.max(1, config.hitCount ?? 1);
  const firstHit = skillHitDamage(player, state.monster, config, 1, burningMultiplier);
  const otherHit = skillHitDamage(player, state.monster, config, 1, 1);
  return {
    skillId,
    config,
    damagePerHit: otherHit,
    hitCount,
    totalDamage: firstHit + otherHit * (hitCount - 1),
  };
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
  const criticalMultiplier = critical ? 1 + (passive?.criticalDamageBonus ?? 0) : 1;
  const burningMultiplier = burningDamageMultiplier(playerState, state.monster);
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
  const hitCount = skillDealsDamage(skillConfig) ? Math.max(1, skillConfig.hitCount ?? 1) : 0;
  for (let hit = 0; hit < hitCount; hit += 1) {
    let damage: { monster: typeof monster; hpDamage: number; absorbed: number };
    // Bonus Thiêu đốt của nội tại Hỏa chỉ cộng một lần cho mỗi lần cast (hit đầu).
    const hitBurningMultiplier = hit === 0 ? burningMultiplier : 1;
    const requested = skillHitDamage(playerState, monster, skillConfig, criticalMultiplier, hitBurningMultiplier);
    if (skillConfig.fixedDamage !== undefined) {
      const absorbed = Math.min(monster.shield, requested);
      damage = monster.shield > 0
        ? { monster: { ...monster, shield: monster.shield - absorbed }, absorbed, hpDamage: 0 }
        : { monster: { ...monster, currentHp: Math.max(0, monster.currentHp - requested) }, absorbed: 0, hpDamage: requested };
    } else {
      damage = skillConfig.bypassShield
        ? applyDirectHpDamageToMonster(monster, requested)
        : applyDamageToMonster(monster, requested);
    }
    monster = damage.monster;
    events.push(event(state, action.actionId, sequence, 'DAMAGE_APPLIED', {
      actor: 'player', source: action.skillId, amount: damage.hpDamage,
      requested, shieldAbsorbed: damage.absorbed,
      shieldRemaining: monster.shield, shieldBroken: damage.absorbed > 0 && monster.shield === 0,
      critical, criticalChance: nextStreak >= 2 ? passive?.criticalChanceBonus ?? 0 : 0,
      criticalRoll, criticalMultiplier, burningMultiplier: hitBurningMultiplier, attackMultiplier: skillConfig.attackMultiplier,
      bypassShield: skillConfig.bypassShield === true, hitIndex: hit + 1, hitCount, target: 'monster',
    }));
    sequence += 1;
  }
  // Hết hành động này: trừ lượt debuff cũ trước khi áp debuff mới của chính skill.
  monster = tickMonsterDebuffs(monster);
  player = tickPlayerDebuffs(player);
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
    // Cộng dồn với độc tầng từ ngọc tím; phần của skill lưu riêng để ngọc tím tính lại không làm mất.
    const potency = Math.max(1, Math.round(playerState.stats.atk * skillConfig.poisonAtkFactor));
    const active = monster.poisonTurns > 0;
    const skillPoisonPotency = (active ? monster.skillPoisonPotency : 0) + potency;
    monster = {
      ...monster,
      poisonPotency: (active ? monster.poisonPotency : 0) + potency,
      skillPoisonPotency,
      poisonTurns: Math.max(active ? monster.poisonTurns : 0, skillConfig.poisonTurns ?? CHARACTER_DATA.combat.poison.turns),
      poisonStacks: Math.max(1, active ? monster.poisonStacks : 0),
    };
    events.push(event(state, action.actionId, sequence++, 'POISON_APPLIED', {
      actor: 'player', amount: monster.poisonPotency, skillPotency: potency, stacks: monster.poisonStacks,
      turns: monster.poisonTurns, target: 'monster', source: action.skillId,
    }));
  }
  if (skillConfig.controlEffect && (skillConfig.controlChance ?? 0) > 0) {
    const controlRoll = nextInt(rngState, 100);
    rngState = controlRoll.state;
    if (controlRoll.value < (skillConfig.controlChance ?? 0) * 100) {
      // THỦY nghề — Hàn Tức Ngưng Kết: quái đang bị Làm chậm thì đóng băng kéo dài thêm.
      const slowedBonus = playerState.element === 'water' && skillConfig.controlEffect === 'freeze' && state.monster.slowedTurns > 0
        ? passive?.freezeExtraTurnsWhenDelayed ?? 0
        : 0;
      monster = { ...monster, controlEffect: skillConfig.controlEffect, controlTurns: (skillConfig.controlTurns ?? 1) + slowedBonus };
      events.push(event(state, action.actionId, sequence++, 'CONTROL_APPLIED', {
        actor: 'player', effect: skillConfig.controlEffect, turns: monster.controlTurns, slowedBonus, target: 'monster', source: action.skillId,
      }));
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
  const monsterSkillPoisonPotency = Number.isFinite(state.monster.skillPoisonPotency)
    ? Math.max(0, Math.min(state.monster.poisonPotency, state.monster.skillPoisonPotency))
    : 0;
  const monsterGuardTurns = Number.isFinite(state.monster.guardTurns) ? Math.max(0, Math.floor(state.monster.guardTurns)) : 0;
  const nonNegativeInt = (value: number | undefined) => (Number.isFinite(value) ? Math.max(0, Math.floor(value as number)) : 0);
  const ratio = (value: number | undefined) => (Number.isFinite(value) ? Math.max(0, Math.min(1, value as number)) : 0);
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
    // Tính lại DEF từ baseDefense để snapshot cũ (guard cộng DEF vĩnh viễn) tự sửa.
    monster: recomputeMonsterDefense({
      ...state.monster,
      baseDefense: Number.isFinite(state.monster.baseDefense) ? state.monster.baseDefense : state.monster.defense,
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
      skillPoisonPotency: monsterSkillPoisonPotency,
      guardTurns: monsterGuardTurns,
      dodgeBonus: ratio(state.monster.dodgeBonus),
      dodgeBonusCharges: nonNegativeInt(state.monster.dodgeBonusCharges),
      dodgeBonusTurns: nonNegativeInt(state.monster.dodgeBonusTurns),
      healPerTurn: nonNegativeInt(state.monster.healPerTurn),
      healTurns: nonNegativeInt(state.monster.healTurns),
      slowedTurns: nonNegativeInt(state.monster.slowedTurns),
      // Snapshot cũ telegraph Long Miêu bằng action riêng; V5 gom vào 'skill'.
      nextAction: state.monster.nextAction === 'long_mieu_lien_kich' ? 'skill' : state.monster.nextAction,
    }),
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
      {
        ...state,
        player: tickPlayerDebuffs(state.player),
        monster: tickMonsterDebuffs(state.monster),
        turn: state.turn + 1,
        phase: 'MONSTER_TURN',
        actionLog: [...state.actionLog, action],
      },
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

  const metalPassive = state.player.element === 'metal' ? CHARACTER_DATA.passives.metal : undefined;
  const match3Result = resolveSwap(toMatch3State(state, config), action, config.match3, {
    attackBreaksEnergyChance: metalPassive?.yellowBreakChance ?? 0,
  });
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
    {
      ...effects.state,
      player: tickPlayerDebuffs(effects.state.player),
      monster: tickMonsterDebuffs(effects.state.monster),
      phase: 'MONSTER_TURN',
    },
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
