import { describe, expect, it } from 'vitest';
import { DEFAULT_BATTLE_CONFIG } from '../config';
import { createBattleState, resolveBattleAction } from '../battle';
import {
  chooseLanternCatAction,
  resolveLanternCatTurn,
} from './lantern-cat';
import type { GameEvent } from '../types';

describe('Miêu Đèn behavior', () => {
  it('uses its own basic, guard, basic, poison cycle', () => {
    expect([0, 1, 2, 3, 4].map(chooseLanternCatAction)).toEqual([
      'basic',
      'guard',
      'basic',
      'poison',
      'basic',
    ]);
  });

  it('resolves guard without borrowing Bụi Sương actions', () => {
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
    expect(result.state.monster.defense).toBe(initial.monster.baseDefense + 12);
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

  it('prioritizes Long Miêu Liên Kích at full energy', () => {
    expect(chooseLanternCatAction(2, 99, 100)).toBe('basic');
    expect(chooseLanternCatAction(2, 100, 100)).toBe('long_mieu_lien_kich');
  });

  it('deals direct HP damage, drains player energy and leaves ten energy', () => {
    const initial = createBattleState(23, 'lantern_cat');
    const state = {
      ...initial,
      phase: 'MONSTER_TURN' as const,
      player: { ...initial.player, currentHp: 300, shield: 100, energy: 50 },
      monster: { ...initial.monster, energy: 100, nextAction: 'long_mieu_lien_kich' as const },
    };
    const result = resolveLanternCatTurn({
      state,
      actionId: 'lantern-long-mieu',
      startSequence: 0,
      attackGemCount: 0,
      config: DEFAULT_BATTLE_CONFIG,
      createEvent: (sequence, type, payload = {}): GameEvent => ({
        eventId: `lantern-long-mieu:${sequence}`,
        actionId: 'lantern-long-mieu',
        battleId: state.battleId,
        turn: state.turn,
        type,
        payload,
      }),
    });

    expect(result.events.some((event) => event.type === 'MONSTER_SKILL_USED')).toBe(true);
    expect(result.state.player.currentHp).toBe(270);
    expect(result.state.player.shield).toBe(100);
    expect(result.state.player.energy).toBe(40);
    expect(result.state.playerSkipTurns).toBe(1);
    expect(result.state.monster.energy).toBe(10);
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
