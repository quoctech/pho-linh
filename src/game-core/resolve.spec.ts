import {
  createInitialState,
  findLegalMoves,
  resolveSwap,
  type SwapAction,
} from './index';

describe('Match-3 resolver', () => {
  it('rejects non-adjacent swaps without spending a turn', () => {
    const state = createInitialState(1);
    const action: SwapAction = {
      kind: 'swap',
      from: { row: 0, col: 0 },
      to: { row: 2, col: 2 },
      actionId: 'invalid-distance',
    };

    const result = resolveSwap(state, action);

    expect(result.accepted).toBe(false);
    expect(result.nextState).toEqual(state);
    expect(result.events[0].type).toBe('SWAP_REJECTED');
  });

  it('rejects a swap that does not create a match', () => {
    const state = createInitialState(22);
    const legalMoves = new Set(
      findLegalMoves(state.board).map(({ from, to }) => `${from.row}:${from.col}-${to.row}:${to.col}`),
    );
    let invalid: SwapAction | undefined;

    for (let row = 0; row < 6 && !invalid; row += 1) {
      for (let col = 0; col < 5 && !invalid; col += 1) {
        const key = `${row}:${col}-${row}:${col + 1}`;
        if (!legalMoves.has(key)) {
          invalid = {
            kind: 'swap',
            from: { row, col },
            to: { row, col: col + 1 },
            actionId: 'no-match',
          };
        }
      }
    }

    expect(invalid).toBeDefined();
    const result = resolveSwap(state, invalid!);
    expect(result.accepted).toBe(false);
    expect(result.nextState).toEqual(state);
  });

  it('resolves a legal swap, increments the turn, and leaves a stable board', () => {
    const state = createInitialState(42);
    const move = findLegalMoves(state.board)[0];
    const action: SwapAction = {
      kind: 'swap',
      ...move,
      actionId: 'legal-1',
    };

    const result = resolveSwap(state, action);

    expect(result.accepted).toBe(true);
    expect(result.nextState.turn).toBe(1);
    expect(result.nextState.actionLog).toEqual([action]);
    expect(result.nextState.board).toHaveLength(6);
    expect(result.nextState.board.flat()).not.toContain(undefined);
    expect(result.events.some((event) => event.type === 'GEMS_CLEARED')).toBe(true);
    expect(result.events.length).toBeGreaterThan(1);
  });

  it('replays the same action deterministically', () => {
    const initial = createInitialState(1234);
    const move = findLegalMoves(initial.board)[0];
    const action: SwapAction = {
      kind: 'swap',
      ...move,
      actionId: 'replay-1',
    };

    const first = resolveSwap(initial, action);
    const second = resolveSwap(initial, action);

    expect(second).toEqual(first);
  });

  it('does not loop when repeatedly resolving generated boards', () => {
    let state = createInitialState(9876);

    for (let turn = 0; turn < 30; turn += 1) {
      const move = findLegalMoves(state.board)[0];
      const result = resolveSwap(state, {
        kind: 'swap',
        ...move,
        actionId: `stress-${turn}`,
      });
      expect(result.accepted).toBe(true);
      state = result.nextState;
    }
  });
});
