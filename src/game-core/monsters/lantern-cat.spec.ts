import { describe, expect, it } from 'vitest';
import { DEFAULT_BATTLE_CONFIG } from '../config';
import { createBattleState, resolveBattleAction } from '../battle';
import {
  chooseLanternCatAction,
  resolveLanternCatTurn,
} from './lantern-cat';
import type { BattleState, GameEvent } from '../types';

/** Tắt né theo AGI để test cô lập đòn đánh của quái. */
function noDodge(player: BattleState['player']): BattleState['player'] {
  return { ...player, stats: { ...player.stats, agi: 0, dodgeChance: 0 } };
}

describe('Miêu Đèn behavior', () => {
  it('uses the updated attack/defense stats and prioritizes recovery resources', () => {
    const monster = createBattleState(20, 'lantern_cat').monster;

    expect(monster.attack).toBe(1350);
    expect(monster.defense).toBe(320);
    expect(monster.agi).toBe(300);
    expect(monster.tactics.heal).toBe(10);
    expect(monster.tactics.energy).toBe(10);
    expect(monster.tactics.shield).toBe(0);
  });

  it('uses one attack, two energy, one poison and one heavy turn', () => {
    expect([0, 1, 2, 3, 4].map(chooseLanternCatAction)).toEqual([
      'basic',
      'energy',
      'energy',
      'poison',
      'heavy',
    ]);
  });

  it('resolves guard without borrowing Sương Hồn actions', () => {
    const initial = createBattleState(21, 'lantern_cat');
    const state = {
      ...initial,
      phase: 'MONSTER_TURN' as const,
      monster: { ...initial.monster, nextAction: 'guard' as const },
    };
    const result = resolveLanternCatTurn({
      state,
      actionId: 'lantern-guard',
      startSequence: 0,
      attackGemCount: 0,
      config: DEFAULT_BATTLE_CONFIG,
      createEvent: (sequence, type, payload = {}): GameEvent => ({
        eventId: `lantern-guard:${sequence}`,
        actionId: 'lantern-guard',
        battleId: state.battleId,
        turn: state.turn,
        type,
        payload,
      }),
    });

    expect(result.events.some((event) => event.type === 'MONSTER_GUARDED')).toBe(true);
    expect(result.events.some((event) => event.type === 'SHIELD_GAINED')).toBe(false);
    expect(result.state.monster.defense).toBe(Math.round(initial.monster.baseDefense * 1.2)); // guard +20% DEF
  });

  it('applies poison as Miêu Đèn action and only attacks when attack gems exist', () => {
    const initial = createBattleState(22, 'lantern_cat');
    const state = {
      ...initial,
      phase: 'MONSTER_TURN' as const,
      monster: { ...initial.monster, nextAction: 'poison' as const },
    };
    const result = resolveLanternCatTurn({
      state,
      actionId: 'lantern-poison',
      startSequence: 0,
      attackGemCount: 0,
      config: DEFAULT_BATTLE_CONFIG,
      createEvent: (sequence, type, payload = {}): GameEvent => ({
        eventId: `lantern-poison:${sequence}`,
        actionId: 'lantern-poison',
        battleId: state.battleId,
        turn: state.turn,
        type,
        payload,
      }),
    });

    expect(result.events.some((event) => event.type === 'POISON_APPLIED')).toBe(true);
    expect(result.events.some((event) => event.type === 'MONSTER_ATTACKED')).toBe(false);
    expect(result.state.player.poisonTurns).toBe(3);
  });

  it('attacks when sword gems are available during an energy turn', () => {
    const initial = createBattleState(25, 'lantern_cat');
    const state = {
      ...initial,
      phase: 'MONSTER_TURN' as const,
      player: noDodge(initial.player),
      monster: { ...initial.monster, nextAction: 'energy' as const },
    };
    const result = resolveLanternCatTurn({
      state,
      actionId: 'lantern-energy-attack',
      startSequence: 0,
      attackGemCount: 3,
      config: DEFAULT_BATTLE_CONFIG,
      createEvent: (sequence, type, payload = {}): GameEvent => ({
        eventId: `lantern-energy-attack:${sequence}`,
        actionId: 'lantern-energy-attack',
        battleId: state.battleId,
        turn: state.turn,
        type,
        payload,
      }),
    });

    expect(result.events.find((event) => event.type === 'MONSTER_ATTACKED')?.payload['action']).toBe('basic');
  });

  it('uses the stronger bạo kích action on its heavy turn', () => {
    const initial = createBattleState(26, 'lantern_cat');
    const state = {
      ...initial,
      phase: 'MONSTER_TURN' as const,
      player: noDodge(initial.player),
      monster: { ...initial.monster, nextAction: 'heavy' as const },
    };
    const result = resolveLanternCatTurn({
      state,
      actionId: 'lantern-heavy',
      startSequence: 0,
      attackGemCount: 1,
      config: DEFAULT_BATTLE_CONFIG,
      createEvent: (sequence, type, payload = {}): GameEvent => ({
        eventId: `lantern-heavy:${sequence}`,
        actionId: 'lantern-heavy',
        battleId: state.battleId,
        turn: state.turn,
        type,
        payload,
      }),
    });

    const attack = result.events.find((event) => event.type === 'MONSTER_ATTACKED');
    expect(attack?.payload['action']).toBe('heavy');
    expect(attack?.payload['baseDamage']).toBe(2295); // 1350 × 1.7
  });

  it('Long Miêu Liên Kích (80 nộ): 130% ATK qua khiên, Thiêu đốt 10% maxHP × 2 lượt, Choáng 1 lượt', () => {
    const initial = createBattleState(23, 'lantern_cat');
    const state = {
      ...initial,
      player: { ...initial.player, currentHp: 9000, shield: 2000, energy: 50 },
      monster: { ...initial.monster, energy: 80 },
    };
    const result = resolveBattleAction(state, { kind: 'timeout', actionId: 'lantern-long-mieu' });
    const skillUsed = result.events.find((event) => event.type === 'MONSTER_SKILL_USED');
    const hit = result.events.find((event) => event.type === 'DAMAGE_APPLIED' && event.payload['source'] === 'lantern_cat_long_mieu_lien_kich');

    expect(skillUsed?.payload['energySpent']).toBe(80);
    expect(hit?.payload['requested']).toBe(1450); // 1350 × 1.3 × (1 − 400 / 2300)
    expect(hit?.payload['shieldAbsorbed']).toBe(1450);
    expect(hit?.payload['amount']).toBe(0);
    expect(result.events.some((event) => event.type === 'BURNING_APPLIED' && event.payload['target'] === 'player' && event.payload['amount'] === 900)).toBe(true);
    const skipped = result.events.find((event) => event.type === 'PLAYER_TURN_SKIPPED');
    expect(skipped?.payload['effect']).toBe('stun');
    // Lượt bị choáng tự chuyển sang lượt quái kế tiếp → thiêu đốt tick lần 1.
    expect(result.events.find((event) => event.type === 'BURNING_TICKED' && event.payload['target'] === 'player')?.payload['amount']).toBe(900);
    expect(result.nextState.player.energy).toBeGreaterThanOrEqual(50); // không còn hút nộ
  });

  it('Long Miêu Liên Kích chưa dùng khi dưới 80 nộ', () => {
    const initial = createBattleState(27, 'lantern_cat');
    const result = resolveBattleAction(
      { ...initial, monster: { ...initial.monster, energy: 40, currentHp: 999 } },
      { kind: 'timeout', actionId: 'lantern-not-ready' },
    );
    const skillUsed = result.events.some((event) => event.type === 'MONSTER_SKILL_USED');
    const energyAfterGems = result.events
      .filter((event) => event.type === 'ENERGY_GAINED' && event.payload['target'] === 'monster' && event.payload['source'] === 'monster_energy_gems')
      .reduce((total, event) => total + Number(event.payload['amount'] ?? 0), 40);
    expect(skillUsed).toBe(energyAfterGems >= 80);
  });

  it('automatically skips one player turn after the skill', () => {
    const initial = createBattleState(24, 'lantern_cat');
    const state = {
      ...initial,
      player: { ...initial.player, energy: 50 },
      monster: { ...initial.monster, energy: 100, nextAction: 'long_mieu_lien_kich' as const, currentHp: 999 },
    };
    const result = resolveBattleAction(state, {
      kind: 'timeout',
      actionId: 'lantern-auto-skip',
    });

    expect(result.accepted).toBe(true);
    expect(result.events.some((event) => event.type === 'MONSTER_SKILL_USED')).toBe(true);
    expect(result.events.some((event) => event.type === 'PLAYER_TURN_SKIPPED')).toBe(true);
    expect(result.nextState.playerSkipTurns).toBe(0);
    expect(result.nextState.phase).toBe('PLAYER_READY');
    expect(result.nextState.turn).toBe(2);
  });
});
