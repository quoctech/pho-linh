export const GEM_TYPES = [
  'attack',
  'heal',
  'shield',
  'energy',
  'poison',
] as const;

export type GemType = (typeof GEM_TYPES)[number];
export type Board = ReadonlyArray<ReadonlyArray<GemType>>;

export interface Coord {
  readonly row: number;
  readonly col: number;
}

export interface SwapAction {
  readonly kind: 'swap';
  readonly from: Coord;
  readonly to: Coord;
  readonly actionId: string;
}

export type Match3Phase = 'ready' | 'resolving' | 'ended';

export interface Match3State {
  readonly battleId: string;
  readonly seed: number;
  readonly rngState: number;
  readonly board: Board;
  readonly turn: number;
  readonly phase: Match3Phase;
  readonly actionLog: readonly SwapAction[];
}

export interface Match3Config {
  readonly rows: number;
  readonly cols: number;
  readonly gemTypes: readonly GemType[];
  readonly maxCascade: number;
  readonly maxGenerationAttempts: number;
  readonly balanceVersion: number;
}

export interface CoordPair {
  readonly from: Coord;
  readonly to: Coord;
}

export interface GameEvent {
  readonly eventId: string;
  readonly battleId: string;
  readonly turn: number;
  readonly type:
    | 'SWAP_STARTED'
    | 'SWAP_REJECTED'
    | 'MATCH_FOUND'
    | 'GEMS_CLEARED'
    | 'GEMS_FALLING'
    | 'GEMS_REFILLED'
    | 'CASCADE_STARTED'
    | 'BOARD_RESHUFFLED'
    | 'BOARD_FORCED_STABILIZE';
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface ResolveResult {
  readonly nextState: Match3State;
  readonly events: readonly GameEvent[];
  readonly accepted: boolean;
}
