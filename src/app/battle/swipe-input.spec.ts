import { describe, expect, it } from 'vitest';
import { swipeTarget } from './swipe-input';

describe('swipeTarget', () => {
  const start = { row: 2, col: 2 };
  const cell = 50;

  it('treats tiny movement as a tap', () => {
    expect(swipeTarget(start, 10, 5, cell, 6)).toBeUndefined();
  });

  it('swaps with the neighbour on a short flick that stays inside the start cell', () => {
    expect(swipeTarget(start, 16, 2, cell, 6)).toEqual({ row: 2, col: 3 });
    expect(swipeTarget(start, 0, -16, cell, 6)).toEqual({ row: 1, col: 2 });
  });

  it('still swaps with the neighbour when the swipe overshoots several cells', () => {
    expect(swipeTarget(start, -140, 10, cell, 6)).toEqual({ row: 2, col: 1 });
  });

  it('uses the dominant axis for diagonal drags', () => {
    expect(swipeTarget(start, 30, 45, cell, 6)).toEqual({ row: 3, col: 2 });
  });

  it('rejects swipes off the board edge', () => {
    expect(swipeTarget({ row: 0, col: 5 }, 40, 0, cell, 6)).toBeUndefined();
    expect(swipeTarget({ row: 0, col: 5 }, 0, -40, cell, 6)).toBeUndefined();
  });
});
