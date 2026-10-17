import { DEFAULT_MATCH3_CONFIG } from './config';
import {
  areAdjacent,
  cloneBoard,
  createBoard,
  findLegalMoves,
  findMatches,
  isInsideBoard,
  reshuffleBoard,
  swapCells,
} from './board';
import { nextInt } from './rng';
import {
  type Board,
  type GameEvent,
  type GemType,
  type Match3Config,
  type Match3State,
  type ResolveResult,
  type SwapAction,
} from './types';

function createInitialEvent(
  state: Match3State,
  actionId: string,
  sequence: number,
  type: GameEvent['type'],
  payload: Readonly<Record<string, unknown>>,
  turn = state.turn,
): GameEvent {
  return {
    eventId: `${actionId}:${sequence}`,
    actionId,
    battleId: state.battleId,
    turn,
    type,
    payload,
  };
}

function boardPayload(board: Board): Readonly<Record<string, unknown>> {
  return { board: cloneBoard(board) };
}

function matchMetadata(
  board: Board,
  coordinates: readonly { readonly row: number; readonly col: number }[],
): { readonly gemCounts: Readonly<Record<string, number>>; readonly longMatchBonus: number } {
  const gemCounts: Record<string, number> = {};
  let longestLine = 0;

  for (const coord of coordinates) {
    const gem = board[coord.row][coord.col];
    gemCounts[gem] = (gemCounts[gem] ?? 0) + 1;

    let horizontal = 1;
    for (let col = coord.col - 1; col >= 0 && board[coord.row][col] === gem; col -= 1) {
      horizontal += 1;
    }
    for (let col = coord.col + 1; col < board[coord.row].length && board[coord.row][col] === gem; col += 1) {
      horizontal += 1;
    }

    let vertical = 1;
    for (let row = coord.row - 1; row >= 0 && board[row][coord.col] === gem; row -= 1) {
      vertical += 1;
    }
    for (let row = coord.row + 1; row < board.length && board[row][coord.col] === gem; row += 1) {
      vertical += 1;
    }
    longestLine = Math.max(longestLine, horizontal, vertical);
  }

  return {
    gemCounts,
    longMatchBonus: longestLine >= 5 ? 20 : longestLine >= 4 ? 10 : 0,
  };
}

export function createInitialState(
  seed: number,
  config: Match3Config = DEFAULT_MATCH3_CONFIG,
  battleId = 'm0-battle',
): Match3State {
  const generated = createBoard(seed, config);
  return {
    battleId,
    seed: seed >>> 0,
    rngState: generated.rngState,
    board: generated.board,
    turn: 0,
    phase: 'ready',
    actionLog: [],
  };
}

function rejectSwap(
  state: Match3State,
  action: SwapAction,
  reason: string,
): ResolveResult {
  return {
    nextState: state,
    accepted: false,
    events: [
      createInitialEvent(state, action.actionId, 0, 'SWAP_REJECTED', { reason }),
    ],
  };
}

function refillBoard(
  board: Board,
  rngState: number,
  config: Match3Config,
): { board: Board; rngState: number } {
  const working: Array<Array<GemType | undefined>> = board.map((row) => [...row]);
  let nextRngState = rngState;

  for (let col = 0; col < config.cols; col += 1) {
    const remaining: GemType[] = [];
    for (let row = config.rows - 1; row >= 0; row -= 1) {
      const gem = working[row][col];
      if (gem) {
        remaining.push(gem);
      }
    }

    for (let row = config.rows - 1; row >= 0; row -= 1) {
      const gem = remaining[config.rows - 1 - row];
      if (gem) {
        working[row][col] = gem;
      } else {
        const random = nextInt(nextRngState, config.gemTypes.length);
        nextRngState = random.state;
        working[row][col] = config.gemTypes[random.value];
      }
    }
  }

  return {
    board: working as Board,
    rngState: nextRngState,
  };
}

export function resolveSwap(
  state: Match3State,
  action: SwapAction,
  config: Match3Config = DEFAULT_MATCH3_CONFIG,
): ResolveResult {
  if (state.phase !== 'ready') {
    return rejectSwap(state, action, 'phase-locked');
  }
  if (!isInsideBoard(action.from, config) || !isInsideBoard(action.to, config)) {
    return rejectSwap(state, action, 'outside-board');
  }
  if (!areAdjacent(action.from, action.to)) {
    return rejectSwap(state, action, 'not-adjacent');
  }

  const events: GameEvent[] = [
    createInitialEvent(state, action.actionId, 0, 'SWAP_STARTED', {
      from: action.from,
      to: action.to,
    }),
  ];
  let sequence = 1;
  let nextBoard = swapCells(state.board, action.from, action.to);
  let rngState = state.rngState;
  let matches = findMatches(nextBoard, config);

  if (matches.length === 0) {
    return rejectSwap(state, action, 'no-match');
  }

  let cascade = 0;
  while (matches.length > 0 && cascade < config.maxCascade) {
    cascade += 1;
    events.push(
      createInitialEvent(state, action.actionId, sequence, 'CASCADE_STARTED', {
        cascade,
      }),
    );
    sequence += 1;
    events.push(
      createInitialEvent(state, action.actionId, sequence, 'MATCH_FOUND', {
        cascade,
        coordinates: matches,
      }),
    );
    sequence += 1;

    const cleared = new Set(matches.map((coord) => `${coord.row}:${coord.col}`));
    const metadata = matchMetadata(nextBoard, matches);
    const clearedBoard = nextBoard.map((row, rowIndex) =>
      row.map((gem, colIndex) =>
        cleared.has(`${rowIndex}:${colIndex}`) ? undefined : gem,
      ),
    );
    events.push(
      createInitialEvent(state, action.actionId, sequence, 'GEMS_CLEARED', {
        cascade,
        coordinates: matches,
        ...metadata,
        ...boardPayload(clearedBoard as Board),
      }),
    );
    sequence += 1;

    const fallenBoard: Array<GemType | undefined>[] = Array.from(
      { length: config.rows },
      () => Array<GemType | undefined>(config.cols),
    );
    for (let col = 0; col < config.cols; col += 1) {
      const remaining: GemType[] = [];
      for (let row = config.rows - 1; row >= 0; row -= 1) {
        const gem = clearedBoard[row][col];
        if (gem) {
          remaining.push(gem);
        }
      }
      for (let row = config.rows - 1; row >= 0; row -= 1) {
        fallenBoard[row][col] = remaining[config.rows - 1 - row];
      }
    }
    events.push(
      createInitialEvent(state, action.actionId, sequence, 'GEMS_FALLING', {
        cascade,
        ...boardPayload(fallenBoard as Board),
      }),
    );
    sequence += 1;

    const refilled = refillBoard(fallenBoard as Board, rngState, config);
    rngState = refilled.rngState;
    nextBoard = refilled.board;
    events.push(
      createInitialEvent(state, action.actionId, sequence, 'GEMS_REFILLED', {
        cascade,
        ...boardPayload(nextBoard),
      }),
    );
    sequence += 1;
    matches = findMatches(nextBoard, config);
  }

  if (matches.length > 0) {
    const stabilized = createBoard(rngState, config);
    nextBoard = stabilized.board;
    rngState = stabilized.rngState;
    events.push(
      createInitialEvent(state, action.actionId, sequence, 'BOARD_FORCED_STABILIZE', {
        cascade: config.maxCascade,
        ...boardPayload(nextBoard),
      }),
    );
    sequence += 1;
  }

  if (findLegalMoves(nextBoard, config).length === 0) {
    const reshuffled = reshuffleBoard(nextBoard, rngState, config);
    nextBoard = reshuffled.board;
    rngState = reshuffled.rngState;
    events.push(
      createInitialEvent(state, action.actionId, sequence, 'BOARD_RESHUFFLED', {
        usedFallback: reshuffled.usedFallback,
        ...boardPayload(nextBoard),
      }),
    );
  }

  return {
    accepted: true,
    events,
    nextState: {
      ...state,
      board: nextBoard,
      rngState,
      turn: state.turn + 1,
      actionLog: [...state.actionLog, action],
    },
  };
}
