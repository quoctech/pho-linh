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

function stateWithMatch(gem: GemType, overrides: Partial<BattleState> = {}, seed = 99): BattleState {
  const initial = createBattleState(seed);
  const board: GemType[][] = MATCH_ROWS.map((row) => [...row]);
  board[0] = [gem, gem === 'attack' ? 'heal' : 'attack', gem, gem, 'shield', 'energy'];
  return {
    ...initial,
    ...overrides,
    board,
    monster: { ...initial.monster, currentHp: initial.monster.maxHp, ...overrides.monster },
    player: { ...initial.player, ...overrides.player },
  };
}

/** Tắt né theo AGI để test cô lập đòn đánh của quái. */
function noDodge(player: BattleState['player']): BattleState['player'] {
  return { ...player, stats: { ...player.stats, agi: 0, dodgeChance: 0 } };
}

function resolveGemMatch(gem: GemType, overrides: Partial<BattleState> = {}, seed = 99) {
  const state = stateWithMatch(gem, overrides, seed);
  return resolveBattleAction(state, {
    kind: 'swap',
    from: { row: 0, col: 0 },
    to: { row: 0, col: 1 },
    actionId: `match-${gem}`,
  });
}

describe('M1 battle core', () => {
  it('computes the level-one baseline stats per element (V7)', () => {
    const stats = computeDerivedStats({ str: 5, vit: 5, agi: 5, int: 5 });

    expect(stats.maxHp).toBe(10500);
    expect(stats.atk).toBe(1150);
    expect(stats.defense).toBe(450);
    expect(stats.agi).toBe(180);
    expect(stats.dodgeChance).toBeCloseTo(180 / 2080);
    expect(stats.skillPower).toBe(20);
    expect(computeDerivedStats({ str: 5, vit: 5, agi: 5, int: 5 }, {}, 'earth').maxHp).toBe(10500);
  });

  it('adds attribute points above level-one start and scaled equipment', () => {
    const stats = computeDerivedStats({ str: 7, vit: 6, agi: 8, int: 5 }, { atk: 5, agi: 2 }, 'fire');

    expect(stats.atk).toBe(1050 + 2 * 30 + 5 * 25);
    expect(stats.maxHp).toBe(10000 + 250);
    expect(stats.defense).toBe(350 + 10);
    expect(stats.agi).toBe(220 + 3 * 5 + 2 * 25);
  });

  it('uses the V7 Sương Hồn combat stats', () => {
    const monster = createBattleState(100).monster;

    expect(monster.maxHp).toBe(9500);
    expect(monster.attack).toBe(700);
    expect(monster.defense).toBe(600);
    expect(monster.agi).toBe(150);
    expect(monster.shieldCap).toBe(1500);
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
      monster: { ...createBattleState(11).monster, currentHp: 1 },
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
      player: { ...noDodge(initial.player), shield: 600 },
      monster: { ...initial.monster, currentHp: 9999 },
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
      player: { ...noDodge(initial.player), shield: 0, currentHp: 9000 },
      monster: { ...initial.monster, currentHp: 9999 },
    };
    const result = resolveBattleAction(state, {
      kind: 'timeout',
      actionId: 'monster-damage-target',
    });
    const attack = result.events.find((event) => event.type === 'MONSTER_ATTACKED');
    const amount = Number(attack?.payload['amount']);

    expect(attack?.payload['target']).toBe('player');
    expect(attack?.payload['hpDamage']).toBe(amount);
    expect(result.nextState.player.currentHp).toBe(9000 - amount);
    expect(result.nextState.monster.currentHp).toBe(9999);
  });

  it('keeps monster HP unchanged during the monster response to a player swap', () => {
    const initial = createBattleState(123);
    const move = findLegalMoves(initial.board)[0];
    const state: BattleState = {
      ...initial,
      player: { ...noDodge(initial.player), shield: 0, currentHp: 9000 },
      monster: { ...initial.monster, currentHp: 9999 },
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
    const playerHeal = result.events
      .filter((event) => event.type === 'HEAL_APPLIED' && event.payload['target'] === 'player')
      .reduce((total, event) => total + Number(event.payload['amount'] ?? 0), 0);
    expect(result.nextState.player.currentHp).toBe(9000 + playerHeal - Number(attack?.payload['hpDamage']));
    expect(result.nextState.monster.currentHp).toBe(9999 - playerDamage - poisonDamage);
  });

  it('lets Sương Hồn choose a deterministic legal swap and attacks by action, not by attack gems', () => {
    const initial = createBattleState(120);
    const state = { ...initial, player: noDodge(initial.player) };
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
    expect(thinkingSeconds).toBeGreaterThanOrEqual(0.6);
    expect(thinkingSeconds).toBeLessThanOrEqual(1.2);
    expect(selected).toBeDefined();
    expect(areAdjacent(from, to)).toBe(true);
    expect(result.events.some((event) => event.type === 'MONSTER_SWAP_STARTED')).toBe(true);
    expect(result.events.some((event) => event.type === 'MONSTER_SWAP_RESOLVED')).toBe(true);
    expect(result.events.some((event) => event.type === 'MONSTER_ATTACKED')).toBe(true);
    expect(result.events.some((event) => event.type === 'MONSTER_ACTION_SKIPPED')).toBe(false);
    expect(selected?.payload['actor']).toBe('monster');
    expect(result.events.find((event) => event.type === 'MONSTER_ATTACKED')?.payload['actor']).toBe('monster');
    expect(result.events.find((event) => event.type === 'MONSTER_ATTACKED')?.payload['baseDamage']).toBe(700);
    // 700 × (1 − 450 / (450 + 1900)) = 566.0
    expect(result.events.find((event) => event.type === 'MONSTER_ATTACKED')?.payload['amount']).toBe(566);
    expect(result.events.find((event) => event.type === 'ENERGY_GAINED' && event.payload['target'] === 'player')?.payload['amount']).toBe(10);
    expect(result.events.find((event) => event.type === 'ENERGY_GAINED' && event.payload['target'] === 'monster')?.payload['amount']).toBe(15);
    expect(result.events.find((event) => event.type === 'GEMS_CLEARED')?.payload['actor']).toBe('monster');
  });

  it('uses Sương Hồn basic and poison action cycle', () => {
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

  it('lets Sương Hồn deterministically dodge some normal attack matches (AGI 150 → 7.3%)', () => {
    const outcomes = Array.from({ length: 200 }, (_, index) => resolveGemMatch('attack', {}, index + 1));
    const dodged = outcomes.filter((result) => result.events.some((event) => event.type === 'MONSTER_DODGED'));
    const hit = outcomes.filter((result) => result.events.some((event) =>
      event.type === 'DAMAGE_APPLIED' && event.payload['target'] === 'monster',
    ));

    expect(dodged.length).toBeGreaterThan(0);
    expect(hit.length).toBeGreaterThan(0);
    expect(dodged.every((result) => result.events.some((event) => event.type === 'MONSTER_DODGED'))).toBe(true);
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
      player: { ...createBattleState(99).player, currentHp: 5000 },
      monster: { ...createBattleState(99).monster, nextAction: 'guard' },
    });
    expect(heal.events.some((event) => event.type === 'HEAL_APPLIED')).toBe(true);
    expect(heal.nextState.player.currentHp).toBeGreaterThan(5000);

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
        player: { ...initial.player, currentHp: 8000 },
        monster: { ...initial.monster, nextAction: 'poison', actionCount: 1, currentHp: 9999 },
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

  it('defeats the player when a configured turn limit is reached', () => {
    const state = stateWithMatch('shield', { turn: 23, player: { ...createBattleState(99).player, currentHp: 9000 } });
    const result = resolveBattleAction(
      state,
      { kind: 'swap', from: { row: 0, col: 0 }, to: { row: 0, col: 1 }, actionId: 'turn-limit' },
      { ...DEFAULT_BATTLE_CONFIG, maxTurns: 24 },
    );

    expect(result.nextState.phase).toBe('DEFEAT');
    expect(result.nextState.terminalReason).toBe('turn_limit');
  });

  it('has no turn limit by default (combat.json maxTurns = 0)', () => {
    expect(DEFAULT_BATTLE_CONFIG.maxTurns).toBe(0);
    const result = resolveGemMatch('shield', {
      turn: 120,
      player: { ...createBattleState(99).player, currentHp: 9000 },
    });

    expect(result.nextState.phase).toBe('PLAYER_READY');
    expect(result.nextState.terminalReason).toBeUndefined();
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
