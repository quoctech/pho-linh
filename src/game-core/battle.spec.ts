import {
  computeDerivedStats,
  createBattleState,
  areAdjacent,
  DEFAULT_BATTLE_CONFIG,
  clampPlayerState,
  findLegalMoves,
  resolveBattleAction,
  type GemType,
  type BattleState,
} from './index';

const MATCH_ROWS: readonly (readonly GemType[])[] = [
  ['attack', 'heal', 'attack', 'attack', 'shield', 'energy'],
  ['heal', 'shield', 'energy', 'poison', 'heal', 'shield'],
  ['energy', 'poison', 'heal', 'shield', 'energy', 'poison'],
  ['shield', 'energy', 'poison', 'heal', 'shield', 'energy'],
  ['poison', 'heal', 'shield', 'energy', 'poison', 'heal'],
  ['heal', 'attack', 'energy', 'poison', 'shield', 'attack'],
];

function stateWithMatch(gem: GemType, overrides: Partial<BattleState> = {}): BattleState {
  const board: GemType[][] = MATCH_ROWS.map((row) => [...row]);
  board[0] = [gem, gem === 'attack' ? 'heal' : 'attack', gem, gem, 'shield', 'energy'];
  return {
    ...createBattleState(99),
    ...overrides,
    board,
    monster: { ...createBattleState(99).monster, currentHp: 999, ...overrides.monster },
    player: { ...createBattleState(99).player, ...overrides.player },
  };
}

function resolveGemMatch(gem: GemType, overrides: Partial<BattleState> = {}) {
  const state = stateWithMatch(gem, overrides);
  return resolveBattleAction(state, {
    kind: 'swap',
    from: { row: 0, col: 0 },
    to: { row: 0, col: 1 },
    actionId: `match-${gem}`,
  });
}

describe('M1 battle core', () => {
  it('computes the level-one baseline stats', () => {
    const stats = computeDerivedStats({ str: 5, vit: 5, agi: 5, int: 5 });

    expect(stats.maxHp).toBe(300);
    expect(stats.atk).toBe(25);
    expect(stats.defense).toBe(10);
    expect(stats.skillPower).toBe(20);
    expect(stats.agiBonus).toBe(0.025);
  });

  it('requires full energy before using Đèn Phá Mây', () => {
    const state = createBattleState(10);
    const result = resolveBattleAction(state, {
      kind: 'skill',
      skillId: 'cloud_break_lantern',
      actionId: 'skill-without-energy',
    });

    expect(result.accepted).toBe(false);
    expect(result.nextState).toEqual(state);
  });

  it('clamps invalid HP and energy values instead of propagating NaN', () => {
    const player = createBattleState(112).player;
    const safe = clampPlayerState({ ...player, currentHp: Number.NaN, energy: Number.NaN });

    expect(safe.currentHp).toBe(0);
    expect(safe.energy).toBe(0);
    expect(Number.isFinite(safe.stats.maxHp)).toBe(true);
  });

  it('can win immediately when the skill defeats the monster', () => {
    const state: BattleState = {
      ...createBattleState(11),
      player: { ...createBattleState(11).player, energy: 100 },
      monster: { ...createBattleState(11).monster, currentHp: 100 },
    };
    const result = resolveBattleAction(state, {
      kind: 'skill',
      skillId: 'cloud_break_lantern',
      actionId: 'skill-finish',
    });

    expect(result.accepted).toBe(true);
    expect(result.nextState.phase).toBe('VICTORY');
    expect(result.events.some((event) => event.type === 'BATTLE_WON')).toBe(true);
    expect(result.events.some((event) => event.type === 'MONSTER_ATTACKED')).toBe(false);
  });

  it('allows the skill at exactly 100 energy and spends the energy', () => {
    const state: BattleState = {
      ...createBattleState(111),
      player: { ...createBattleState(111).player, energy: 100 },
      monster: { ...createBattleState(111).monster, currentHp: 999 },
    };
    const result = resolveBattleAction(state, {
      kind: 'skill',
      skillId: 'cloud_break_lantern',
      actionId: 'skill-full-energy',
    });

    expect(result.accepted).toBe(true);
    expect(result.events.some((event) => event.type === 'SKILL_USED')).toBe(true);
    expect(result.nextState.player.energy).toBe(10);
  });

  it('runs a monster turn after a valid swap and consumes shield before HP', () => {
    const initial = createBattleState(12);
    const move = findLegalMoves(initial.board)[0];
    const state: BattleState = {
      ...initial,
      player: { ...initial.player, shield: 20 },
      monster: { ...initial.monster, currentHp: 999 },
    };
    const result = resolveBattleAction(state, {
      kind: 'swap',
      ...move,
      actionId: 'swap-with-shield',
    });

    expect(result.accepted).toBe(true);
    expect(result.events.some((event) => event.type === 'MONSTER_ATTACKED')).toBe(true);
    expect(result.events.find((event) => event.type === 'ENERGY_GAINED' && event.payload['target'] === 'monster')?.payload['amount']).toBe(15);
    expect(result.nextState.player.shield).toBeGreaterThanOrEqual(0);
    expect(result.nextState.player.currentHp).toBeLessThanOrEqual(state.player.currentHp);
    expect(result.nextState.phase).toBe('PLAYER_READY');
  });

  it('subtracts monster attack damage from player HP, not monster HP', () => {
    const initial = createBattleState(122);
    const state: BattleState = {
      ...initial,
      player: { ...initial.player, shield: 0, currentHp: 300 },
      monster: { ...initial.monster, currentHp: 999 },
    };
    const result = resolveBattleAction(state, {
      kind: 'timeout',
      actionId: 'monster-damage-target',
    });
    const attack = result.events.find((event) => event.type === 'MONSTER_ATTACKED');
    const amount = Number(attack?.payload['amount']);

    expect(attack?.payload['target']).toBe('player');
    expect(attack?.payload['hpDamage']).toBe(amount);
    expect(result.nextState.player.currentHp).toBe(300 - amount);
    expect(result.nextState.monster.currentHp).toBe(999);
  });

  it('keeps monster HP unchanged during the monster response to a player swap', () => {
    const initial = createBattleState(123);
    const move = findLegalMoves(initial.board)[0];
    const state: BattleState = {
      ...initial,
      player: { ...initial.player, shield: 0, currentHp: 300 },
      monster: { ...initial.monster, currentHp: 999 },
    };

    const result = resolveBattleAction(state, {
      kind: 'swap',
      ...move,
      actionId: 'monster-response-target',
    }, { ...DEFAULT_BATTLE_CONFIG, shieldCapMaxHpRatio: 0 });
    const attack = result.events.find((event) => event.type === 'MONSTER_ATTACKED');
    const playerDamage = result.events
      .filter((event) => event.type === 'DAMAGE_APPLIED' && event.payload['target'] === 'monster')
      .reduce((total, event) => total + Number(event.payload['amount'] ?? 0), 0);
    const poisonDamage = result.events
      .filter((event) => event.type === 'POISON_TICKED' && event.payload['target'] === 'monster')
      .reduce((total, event) => total + Number(event.payload['amount'] ?? 0), 0);

    expect(attack?.payload['actor']).toBe('monster');
    expect(attack?.payload['target']).toBe('player');
    expect(result.nextState.player.currentHp).toBe(300 - Number(attack?.payload['hpDamage']));
    expect(result.nextState.monster.currentHp).toBe(999 - playerDamage - poisonDamage);
  });

  it('lets Bụi Sương choose a deterministic legal swap and attacks by action, not by attack gems', () => {
    const state = createBattleState(120);
    const result = resolveBattleAction(state, {
      kind: 'timeout',
      actionId: 'timeout-monster-move',
    });
    const selected = result.events.find((event) => event.type === 'MONSTER_MOVE_SELECTED');
    const from = selected?.payload['from'] as { row: number; col: number };
    const to = selected?.payload['to'] as { row: number; col: number };

    expect(result.accepted).toBe(true);
    const thinking = result.events.find((event) => event.type === 'MONSTER_THINKING');
    const thinkingSeconds = Number(thinking?.payload['seconds']);
    expect(thinkingSeconds).toBeGreaterThanOrEqual(1.2);
    expect(thinkingSeconds).toBeLessThanOrEqual(3);
    expect(selected).toBeDefined();
    expect(areAdjacent(from, to)).toBe(true);
    expect(result.events.some((event) => event.type === 'MONSTER_SWAP_STARTED')).toBe(true);
    expect(result.events.some((event) => event.type === 'MONSTER_SWAP_RESOLVED')).toBe(true);
    expect(result.events.some((event) => event.type === 'MONSTER_ATTACKED')).toBe(true);
    expect(result.events.some((event) => event.type === 'MONSTER_ACTION_SKIPPED')).toBe(false);
    expect(selected?.payload['actor']).toBe('monster');
    expect(result.events.find((event) => event.type === 'MONSTER_ATTACKED')?.payload['actor']).toBe('monster');
    expect(result.events.find((event) => event.type === 'MONSTER_ATTACKED')?.payload['baseDamage']).toBe(70);
    expect(result.events.find((event) => event.type === 'MONSTER_ATTACKED')?.payload['amount']).toBe(64);
    expect(result.events.find((event) => event.type === 'ENERGY_GAINED' && event.payload['target'] === 'player')?.payload['amount']).toBe(10);
    expect(result.events.find((event) => event.type === 'ENERGY_GAINED' && event.payload['target'] === 'monster')?.payload['amount']).toBe(15);
    expect(result.events.find((event) => event.type === 'GEMS_CLEARED')?.payload['actor']).toBe('monster');
  });

  it('uses Bụi Sương basic and poison action cycle', () => {
    let state = createBattleState(120);
    const results = [0, 1, 2].map((index) => {
      const result = resolveBattleAction(state, {
        kind: 'timeout',
        actionId: `mist-cycle-${index}`,
      });
      state = result.nextState;
      return result;
    });

    expect(results[0].events.find((event) => event.type === 'MONSTER_ATTACKED')?.payload['action']).toBe('basic');
    expect(results[0].nextState.monster.nextAction).toBe('poison');
    expect(results[1].events.find((event) =>
      event.type === 'POISON_APPLIED' && event.payload['target'] === 'player',
    )?.payload['source']).toBe('monster_poison_action');
    expect(results[1].nextState.monster.nextAction).toBe('basic');
    expect(results[2].events.find((event) => event.type === 'MONSTER_ATTACKED')?.payload['action']).toBe('basic');
    expect(results[2].nextState.monster.nextAction).toBe('poison');
  });

  it('turns timeout into a lost turn and restarts player-ready state after monster action', () => {
    const state = createBattleState(121);
    const result = resolveBattleAction(state, { kind: 'timeout', actionId: 'timeout-1' });

    expect(result.nextState.turn).toBe(state.turn + 1);
    expect(result.events[0].type).toBe('TURN_TIMED_OUT');
    expect(result.nextState.phase).toBe('PLAYER_READY');
  });

  it('applies attack, heal, shield and poison gem effects', () => {
    const attack = resolveGemMatch('attack');
    expect(attack.events.find((event) => event.type === 'DAMAGE_APPLIED')?.payload['actor']).toBe('player');

    const heal = resolveGemMatch('heal', {
      player: { ...createBattleState(99).player, currentHp: 250 },
      monster: { ...createBattleState(99).monster, nextAction: 'guard' },
    });
    expect(heal.events.some((event) => event.type === 'HEAL_APPLIED')).toBe(true);
    expect(heal.nextState.player.currentHp).toBeGreaterThan(250);

    const fullHeal = resolveGemMatch('heal');
    const healEvent = fullHeal.events.find((event) => event.type === 'HEAL_APPLIED');
    expect(healEvent?.payload['amount']).toBe(0);
    expect(healEvent?.payload['capped']).toBe(true);

    const shield = resolveGemMatch('shield', {
      monster: { ...createBattleState(99).monster, nextAction: 'guard' },
    });
    expect(shield.events.some((event) => event.type === 'SHIELD_GAINED')).toBe(true);
    expect(shield.nextState.player.shield).toBeGreaterThan(0);

    const poison = resolveGemMatch('poison');
    expect(poison.events.some((event) => event.type === 'POISON_APPLIED')).toBe(true);
    expect(poison.events.some((event) => event.type === 'POISON_TICKED')).toBe(true);
    expect(poison.events.find((event) => event.type === 'POISON_TICKED')?.payload['target']).toBe('monster');
  });

  it('applies monster poison to the player, ticks it, then clears it', () => {
    const initial = createBattleState(44);
    const poisoned = resolveBattleAction(
      {
        ...initial,
        player: { ...initial.player, currentHp: 250 },
        monster: { ...initial.monster, nextAction: 'poison', actionCount: 1, currentHp: 999 },
      },
      { kind: 'timeout', actionId: 'monster-poison-1' },
    );

    expect(poisoned.events.some((event) =>
      event.type === 'POISON_APPLIED' && event.payload['target'] === 'player')).toBe(true);
    expect(poisoned.nextState.player.poisonPotency).toBeGreaterThan(0);
    expect(poisoned.nextState.player.poisonTurns).toBe(3);

    const ticked = resolveBattleAction(poisoned.nextState, {
      kind: 'timeout',
      actionId: 'monster-poison-2',
    });
    const tick = ticked.events.find((event) =>
      event.type === 'POISON_TICKED' && event.payload['target'] === 'player');

    expect(tick).toBeDefined();
    expect(ticked.nextState.player.currentHp).toBeLessThan(poisoned.nextState.player.currentHp);
    expect(ticked.nextState.player.poisonTurns).toBe(2);
  });

  it('defeats the player when the monster attack reaches zero HP', () => {
    const initial = createBattleState(13);
    const state: BattleState = {
      ...initial,
      player: { ...initial.player, currentHp: 1 },
      monster: { ...initial.monster, currentHp: 999 },
    };
    // Use timeout so the assertion isolates the monster hit and cannot be
    // changed by a board seed producing a simultaneous healing cascade.
    const result = resolveBattleAction(state, {
      kind: 'timeout',
      actionId: 'swap-defeat',
    });

    expect(result.nextState.phase).toBe('DEFEAT');
    expect(result.nextState.terminalReason).toBe('player_hp_zero');
    expect(result.nextState.player.currentHp).toBe(0);
    expect(Number.isFinite(result.nextState.player.currentHp)).toBe(true);
    expect(result.events.find((event) => event.type === 'MONSTER_ATTACKED')?.payload['lethal']).toBe(true);
  });

  it('defeats the player when the turn limit is reached', () => {
    const result = resolveGemMatch('shield', {
      turn: DEFAULT_BATTLE_CONFIG.maxTurns - 1,
      player: { ...createBattleState(99).player, currentHp: 300 },
    });

    expect(result.nextState.phase).toBe('DEFEAT');
    expect(result.nextState.terminalReason).toBe('turn_limit');
  });

  it('abandons a ready battle without accepting more actions', () => {
    const state = createBattleState(14);
    const result = resolveBattleAction(state, {
      kind: 'abandon',
      actionId: 'abandon-1',
    });

    expect(result.accepted).toBe(true);
    expect(result.nextState.phase).toBe('ABANDON');
    expect(result.events[0].type).toBe('BATTLE_ABANDONED');
  });
});
