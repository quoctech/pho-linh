import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { GEM_TYPES, type BattlePhase, type BattleState } from '../../game-core';

interface BattleCheckpoint {
  readonly schemaVersion: 1;
  readonly monsterId: string;
  readonly savedAt: number;
  readonly state: BattleState;
}

@Injectable({ providedIn: 'root' })
export class BattleSessionStore {
  private readonly key = 'pho-linh:m1:battle-session';

  async save(state: BattleState): Promise<void> {
    const checkpoint: BattleCheckpoint = {
      schemaVersion: 1,
      monsterId: state.monster.id,
      savedAt: Date.now(),
      state,
    };
    await Preferences.set({
      key: this.key,
      value: JSON.stringify(checkpoint),
    });
  }

  async load(): Promise<BattleState | undefined> {
    const stored = await Preferences.get({ key: this.key });
    if (!stored.value) {
      return undefined;
    }

    try {
      const checkpoint = JSON.parse(stored.value) as Partial<BattleCheckpoint>;
      if (checkpoint.schemaVersion !== 1 || !checkpoint.state || !this.isBattleState(checkpoint.state)) {
        await this.clear();
        return undefined;
      }
      return checkpoint.state;
    } catch {
      await this.clear();
      return undefined;
    }
  }

  async clear(): Promise<void> {
    await Preferences.remove({ key: this.key });
  }

  private isBattleState(value: BattleState): boolean {
    const phases: readonly BattlePhase[] = [
      'INIT',
      'PLAYER_READY',
      'SWAPPING',
      'RESOLVING',
      'MONSTER_TURN',
      'VICTORY',
      'DEFEAT',
      'ABANDON',
    ];
    return (
      typeof value.battleId === 'string' &&
      Array.isArray(value.board) &&
      value.board.length === 6 &&
      value.board.every((row) =>
        Array.isArray(row) && row.length === 6 && row.every((gem) => GEM_TYPES.includes(gem)),
      ) &&
      typeof value.player?.currentHp === 'number' &&
      typeof value.monster?.currentHp === 'number' &&
      phases.includes(value.phase)
    );
  }
}
