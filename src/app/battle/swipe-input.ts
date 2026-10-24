import type { Coord } from '../../game-core';

/** Fraction of a cell the finger must travel before a press counts as a swipe. */
export const SWIPE_THRESHOLD_CELLS = 0.3;

/**
 * Resolves a swipe by direction instead of by the cell the finger ends on, so
 * short flicks, overshooting past the neighbour, slightly diagonal drags and
 * releases outside the board all still swap with the adjacent gem.
 */
export function swipeTarget(start: Coord, dx: number, dy: number, cellSize: number, boardSize: number): Coord | undefined {
  const threshold = cellSize * SWIPE_THRESHOLD_CELLS;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return undefined;
  const target = Math.abs(dx) >= Math.abs(dy)
    ? { row: start.row, col: start.col + Math.sign(dx) }
    : { row: start.row + Math.sign(dy), col: start.col };
  if (target.row < 0 || target.row >= boardSize || target.col < 0 || target.col >= boardSize) return undefined;
  return target;
}
