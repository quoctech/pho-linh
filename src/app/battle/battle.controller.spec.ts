import {
  findLegalMoves,
  type GameEvent,
  type Match3State,
  type SwapAction,
} from '../../game-core';
import { BattleController, type BattleEventPlayer } from './battle.controller';

class RecordingEventPlayer implements BattleEventPlayer {
  readonly batches: GameEvent[][] = [];

  async play(events: readonly GameEvent[]): Promise<void> {
    this.batches.push([...events]);
  }
}

describe('BattleController', () => {
  it('plays engine events and publishes the new state after the sequence', async () => {
    const player = new RecordingEventPlayer();
    const controller = new BattleController(101, player);
    const states: Match3State[] = [];
    controller.subscribe((state) => states.push(state));
    const move = findLegalMoves(controller.currentState.board)[0];
    const action: SwapAction = {
      kind: 'swap',
      ...move,
      actionId: 'controller-1',
    };

    const result = await controller.dispatch(action);

    expect(result?.accepted).toBe(true);
    expect(player.batches).toHaveLength(1);
    expect(states.at(-1)?.turn).toBe(1);
    expect(controller.isLocked).toBe(false);
  });

  it('ignores a second action while the first event sequence is playing', async () => {
    let release!: () => void;
    const player: BattleEventPlayer = {
      play: () => new Promise<void>((resolve) => {
        release = resolve;
      }),
    };
    const controller = new BattleController(202, player);
    const move = findLegalMoves(controller.currentState.board)[0];
    const first: SwapAction = {
      kind: 'swap',
      ...move,
      actionId: 'controller-lock-1',
    };

    const firstDispatch = controller.dispatch(first);
    const secondDispatch = await controller.dispatch({
      ...first,
      actionId: 'controller-lock-2',
    });

    expect(secondDispatch).toBeUndefined();
    release();
    await firstDispatch;
    expect(controller.currentState.turn).toBe(1);
  });
});
