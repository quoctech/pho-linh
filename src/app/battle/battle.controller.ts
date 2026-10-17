import {
  createBattleState,
  resolveBattleAction,
  type BattleAction,
  type BattleConfig,
  type BattleState,
  type GameEvent,
  type BattleResolveResult,
} from '../../game-core';

export interface BattleEventPlayer {
  play(events: readonly GameEvent[]): Promise<void>;
}

export type BattleStateListener = (state: BattleState) => void;

export class BattleController {
  private state: BattleState;
  private locked = false;
  private idleResolvers: Array<() => void> = [];
  private eventPlayer?: BattleEventPlayer;
  private readonly listeners = new Set<BattleStateListener>();

  constructor(
    seedOrState: number | BattleState,
    eventPlayer?: BattleEventPlayer,
    private readonly config?: BattleConfig,
  ) {
    this.state = typeof seedOrState === 'number'
      ? createBattleState(seedOrState, 'mist_blob', `m1-${(seedOrState >>> 0).toString(16)}`, config)
      : seedOrState;
    this.eventPlayer = eventPlayer;
  }

  get currentState(): BattleState {
    return this.state;
  }

  get isLocked(): boolean {
    return this.locked;
  }

  get isTerminal(): boolean {
    return ['VICTORY', 'DEFEAT', 'ABANDON'].includes(this.state.phase);
  }

  attachEventPlayer(eventPlayer: BattleEventPlayer | undefined): void {
    this.eventPlayer = eventPlayer;
  }

  waitUntilIdle(): Promise<void> {
    if (!this.locked) {
      return Promise.resolve();
    }
    return new Promise((resolve) => this.idleResolvers.push(resolve));
  }

  subscribe(listener: BattleStateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  async dispatch(action: BattleAction): Promise<BattleResolveResult | undefined> {
    if (this.locked) {
      return undefined;
    }

    this.locked = true;
    try {
      const result = resolveBattleAction(this.state, action, this.config);
      if (this.eventPlayer) {
        await this.eventPlayer.play(result.events);
      }
      this.state = result.nextState;
      this.notify();
      return result;
    } finally {
      this.locked = false;
      const resolvers = this.idleResolvers.splice(0);
      for (const resolve of resolvers) {
        resolve();
      }
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
