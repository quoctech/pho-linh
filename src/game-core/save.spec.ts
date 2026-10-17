import { createDefaultSave, migrateSave } from './save';
import { applyBattleReward, commitAttributeAllocation, getExpRequired } from './progression';
import { createBattleState } from './battle';

describe('M2 progression and save', () => {
  it('levels multiple times and keeps exp overflow', () => {
    const save = { ...createDefaultSave(), profile: { ...createDefaultSave().profile, exp: 140 } };
    const state = { ...createBattleState(5, 'cloud_fox_boss', 'reward-overflow'), monster: { ...createBattleState(5, 'cloud_fox_boss').monster, currentHp: 0 }, phase: 'VICTORY' as const };
    const result = applyBattleReward(save, state);
    expect(result.leveledUp).toBeGreaterThan(1);
    expect(result.save.profile.unspentPoints).toBe(result.leveledUp * 3);
  });

  it('is idempotent for the same battle', () => {
    const save = createDefaultSave();
    const state = { ...createBattleState(6, 'mist_blob', 'same-battle'), phase: 'VICTORY' as const };
    const once = applyBattleReward(save, state).save;
    const twice = applyBattleReward(once, state).save;
    expect(twice).toEqual(once);
  });

  it('migrates invalid data to a safe default and keeps active legacy battle', () => {
    const battle = createBattleState(3);
    expect(migrateSave('{bad')).toEqual(createDefaultSave());
    expect(migrateSave({ schemaVersion: 1 }, battle).activeBattle?.battleId).toBe(battle.battleId);
  });

  it('keeps old settings valid and defaults the new gender choice to male', () => {
    const save = createDefaultSave();
    const oldSave = { ...save, settings: { music: true, sfx: false, reducedMotion: false } };
    expect(migrateSave(oldSave).settings.gender).toBe('male');
    expect(migrateSave({ ...oldSave, settings: { ...oldSave.settings, gender: 'female' } }).settings.gender).toBe('female');
  });

  it('allocates only available points', () => {
    const save = createDefaultSave();
    const profile = { ...save.profile, unspentPoints: 3 };
    const committed = commitAttributeAllocation(profile, { str: 2, vit: 2 });
    expect(committed.unspentPoints).toBe(0);
    expect(committed.attributes.str + committed.attributes.vit).toBe(13);
    expect(getExpRequired(2)).toBe(150);
  });
});
