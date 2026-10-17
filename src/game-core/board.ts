import { DEFAULT_MATCH3_CONFIG } from './config';
import { nextInt, normalizeSeed } from './rng';
import {
  type Board,
  type Coord,
  type CoordPair,
  type GemType,
  type Match3Config,
} from './types';

export interface BoardGenerationResult {
  readonly board: Board;
  readonly rngState: number;
}

export interface ReshuffleResult extends BoardGenerationResult {
  readonly usedFallback: boolean;
}

export function coordKey(coord: Coord): string {
  return `${coord.row}:${coord.col}`;
}

export function isInsideBoard(
  coord: Coord,
  config: Match3Config = DEFAULT_MATCH3_CONFIG,
): boolean {
  return (
    Number.isInteger(coord.row) &&
    Number.isInteger(coord.col) &&
    coord.row >= 0 &&
    coord.row < config.rows &&
    coord.col >= 0 &&
    coord.col < config.cols
  );
}

export function areAdjacent(from: Coord, to: Coord): boolean {
  return Math.abs(from.row - to.row) + Math.abs(from.col - to.col) === 1;
}

export function cloneBoard(board: Board): GemType[][] {
  return board.map((row) => [...row]);
}

export function swapCells(board: Board, from: Coord, to: Coord): Board {
  const next = cloneBoard(board);
  const value = next[from.row][from.col];
  next[from.row][from.col] = next[to.row][to.col];
  next[to.row][to.col] = value;
  return next;
}

/** Pick one gem using the configured weights while keeping RNG in game-core. */
export function selectGem(
  state: number,
  config: Match3Config = DEFAULT_MATCH3_CONFIG,
): { readonly gem: GemType; readonly state: number } {
  const weights = config.gemTypes.map((gem) => {
    const configured = config.gemWeights?.[gem];
    return Number.isFinite(configured) && configured !== undefined
      ? Math.max(1, Math.floor(configured))
      : 1;
  });
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);
  const random = nextInt(state, totalWeight);
  let cursor = random.value;
  for (let index = 0; index < config.gemTypes.length; index += 1) {
    cursor -= weights[index];
    if (cursor < 0) {
      return { gem: config.gemTypes[index], state: random.state };
    }
  }
  return { gem: config.gemTypes[config.gemTypes.length - 1], state: random.state };
}

export function findMatches(
  board: Board,
  config: Match3Config = DEFAULT_MATCH3_CONFIG,
): readonly Coord[] {
  const matches = new Map<string, Coord>();

  for (let row = 0; row < config.rows; row += 1) {
    let start = 0;
    while (start < config.cols) {
      const gem = board[row][start];
      let end = start + 1;
      while (end < config.cols && board[row][end] === gem) {
        end += 1;
      }
      if (end - start >= 3) {
        for (let col = start; col < end; col += 1) {
          const coord = { row, col };
          matches.set(coordKey(coord), coord);
        }
      }
      start = end;
    }
  }

  for (let col = 0; col < config.cols; col += 1) {
    let start = 0;
    while (start < config.rows) {
      const gem = board[start][col];
      let end = start + 1;
      while (end < config.rows && board[end][col] === gem) {
        end += 1;
      }
      if (end - start >= 3) {
        for (let row = start; row < end; row += 1) {
          const coord = { row, col };
          matches.set(coordKey(coord), coord);
        }
      }
      start = end;
    }
  }

  return [...matches.values()];
}

export function findLegalMoves(
  board: Board,
  config: Match3Config = DEFAULT_MATCH3_CONFIG,
): readonly CoordPair[] {
  const moves: CoordPair[] = [];

  for (let row = 0; row < config.rows; row += 1) {
    for (let col = 0; col < config.cols; col += 1) {
      const from = { row, col };
      const candidates = [
        { row, col: col + 1 },
        { row: row + 1, col },
      ];

      for (const to of candidates) {
        if (!isInsideBoard(to, config)) {
          continue;
        }
        if (findMatches(swapCells(board, from, to), config).length > 0) {
          moves.push({ from, to });
        }
      }
    }
  }

  return moves;
}

function createCandidateBoard(
  state: number,
  config: Match3Config,
): BoardGenerationResult {
  const board: GemType[][] = [];
  let rngState = state;

  for (let row = 0; row < config.rows; row += 1) {
    const nextRow: GemType[] = [];
    for (let col = 0; col < config.cols; col += 1) {
      let selected: GemType | undefined;
      let attempts = 0;

      while (!selected && attempts < config.gemTypes.length * 2) {
        const random = selectGem(rngState, config);
        rngState = random.state;
        const candidate = random.gem;
        const horizontalMatch = col >= 2 && nextRow[col - 1] === candidate && nextRow[col - 2] === candidate;
        const verticalMatch = row >= 2 && board[row - 1][col] === candidate && board[row - 2][col] === candidate;
        if (!horizontalMatch && !verticalMatch) {
          selected = candidate;
        }
        attempts += 1;
      }

      if (!selected) {
        selected = config.gemTypes[(row + col) % config.gemTypes.length];
      }
      nextRow.push(selected);
    }
    board.push(nextRow);
  }

  return { board, rngState };
}

function fallbackBoard(config: Match3Config): Board {
  return Array.from({ length: config.rows }, (_, row) =>
    Array.from(
      { length: config.cols },
      (_, col) => config.gemTypes[(row + col) % config.gemTypes.length],
    ),
  );
}

export function createBoard(
  seed: number,
  config: Match3Config = DEFAULT_MATCH3_CONFIG,
): BoardGenerationResult {
  let rngState = normalizeSeed(seed);

  for (let attempt = 0; attempt < config.maxGenerationAttempts; attempt += 1) {
    const candidate = createCandidateBoard(rngState, config);
    rngState = candidate.rngState;
    if (findMatches(candidate.board, config).length === 0 && findLegalMoves(candidate.board, config).length > 0) {
      return candidate;
    }
  }

  const fallback = fallbackBoard(config);
  if (findMatches(fallback, config).length === 0 && findLegalMoves(fallback, config).length > 0) {
    return { board: fallback, rngState };
  }

  throw new Error('Unable to create a stable Match-3 board');
}

export function reshuffleBoard(
  board: Board,
  rngState: number,
  config: Match3Config = DEFAULT_MATCH3_CONFIG,
): ReshuffleResult {
  const gems = board.flat();
  let state = normalizeSeed(rngState);

  for (let attempt = 0; attempt < config.maxGenerationAttempts; attempt += 1) {
    const shuffled = [...gems];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const random = nextInt(state, index + 1);
      state = random.state;
      [shuffled[index], shuffled[random.value]] = [shuffled[random.value], shuffled[index]];
    }

    const candidate = Array.from({ length: config.rows }, (_, row) =>
      shuffled.slice(row * config.cols, (row + 1) * config.cols),
    );
    if (findMatches(candidate, config).length === 0 && findLegalMoves(candidate, config).length > 0) {
      return { board: candidate, rngState: state, usedFallback: false };
    }
  }

  const generated = createBoard(state, config);
  return { ...generated, usedFallback: true };
}
