import { describe, expect, it } from 'vitest';
import { DEFAULT_BATTLE_CONFIG } from '../config';
import { createBattleState } from '../battle';
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
});
