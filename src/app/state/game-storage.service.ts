import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { createDefaultSave, migrateSave } from '../../game-core';
import type { BattleState, LocalSaveV1 } from '../../game-core';

@Injectable({ providedIn: 'root' })
export class GameStorage {
  private readonly key = 'pho-linh:save:v1';
  private readonly legacyKey = 'pho-linh:m1:battle-session';

  async load(): Promise<LocalSaveV1> {
    let stored: { value: string | null };
    try { stored = await Preferences.get({ key: this.key }); } catch { return createDefaultSave(); }
    if (stored.value) {
      try { return migrateSave(JSON.parse(stored.value)); } catch { return createDefaultSave(); }
    }
    let legacy: { value: string | null };
    try { legacy = await Preferences.get({ key: this.legacyKey }); } catch { return createDefaultSave(); }
    let legacyValue: unknown;
    try { legacyValue = legacy.value ? JSON.parse(legacy.value) : undefined; } catch { legacyValue = undefined; }
    const save = migrateSave(legacyValue);
    await this.save(save);
    return save;
  }

  async save(save: LocalSaveV1): Promise<void> {
    try { await Preferences.set({ key: this.key, value: JSON.stringify(save) }); } catch { /* Web fallback: gameplay remains usable for this session. */ }
  }

  async update(mutator: (save: LocalSaveV1) => LocalSaveV1): Promise<LocalSaveV1> {
    const next = mutator(await this.load());
    await this.save(next);
    return next;
  }

  async saveBattle(save: LocalSaveV1, state: BattleState): Promise<void> {
    await this.save({ ...save, activeBattle: state });
  }

  async clearActiveBattle(): Promise<void> {
    const save = await this.load();
    const { activeBattle: _activeBattle, ...withoutBattle } = save;
    await this.save(withoutBattle);
  }
}
