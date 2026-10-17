import {
  createInitialState,
  resolveSwap,
  type GameEvent,
  type Match3Config,
  type Match3State,
  type ResolveResult,
  type SwapAction,
} from '../../game-core';

export interface BattleEventPlayer {
  play(events: readonly GameEvent[]): Promise<void>;
}

export type BattleStateListener = (state: Match3State) => void;

export class BattleController {
  private state: Match3State;
  private locked = false;
  private readonly listeners = new Set<BattleStateListener>();

  constructor(
    seed: number,
    private readonly eventPlayer?: BattleEventPlayer,
    config?: Match3Config,
  ) {
    this.state = createInitialState(seed, config);
  }

  get currentState(): Match3State {
    return this.state;
  }

  get isLocked(): boolean {
    return this.locked;
  }

  subscribe(listener: BattleStateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  async dispatch(action: SwapAction): Promise<ResolveResult | undefined> {
    if (this.locked) {
      return undefined;
    }

    this.locked = true;
    try {
      const result = resolveSwap(this.state, action);
      if (this.eventPlayer) {
        await this.eventPlayer.play(result.events);
      }
      this.state = result.nextState;
      this.notify();
      return result;
    } finally {
      this.locked = false;
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
