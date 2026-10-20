import { createDefaultSave, isResumableBattle, migrateSave } from './save';
import { applyBattleReward, commitAttributeAllocation, devGrantAttributePoints, devGrantGold, devGrantLevels, devSetLevel, getExpRequired, resetAttributePoints, spentAttributePoints } from './progression';
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

  it('drops an unfinished battle saved with an older balance version (old 300 HP stats)', () => {
    const current = createBattleState(4);
    const stale = { ...current, balanceVersion: 5, player: { ...current.player, currentHp: 300, stats: { ...current.player.stats, maxHp: 300 } } };
    expect(isResumableBattle(current)).toBe(true);
    expect(isResumableBattle(stale)).toBe(false);
    expect(migrateSave({ ...createDefaultSave(), activeBattle: stale }).activeBattle).toBeUndefined();
    expect(migrateSave({ ...createDefaultSave(), activeBattle: current }).activeBattle?.battleId).toBe(current.battleId);
    expect(current.player.stats.maxHp).toBe(9000);
  });

  it('keeps old settings valid and defaults the new gender choice to male', () => {
    const save = createDefaultSave();
    const oldSave = { ...save, settings: { music: true, sfx: false, reducedMotion: false } };
    expect(migrateSave(oldSave).settings.gender).toBe('male');
    expect(migrateSave({ ...oldSave, settings: { ...oldSave.settings, gender: 'female' } }).settings.gender).toBe('female');
    expect(migrateSave(oldSave).settings.element).toBe('metal');
    expect(migrateSave({ ...oldSave, settings: { ...oldSave.settings, element: 'water' } }).settings.element).toBe('water');
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

describe('công cụ cân bằng offline (Dev mode)', () => {
  it('cấp điểm, lên cấp, tẩy điểm và đặt cấp theo đúng số điểm mỗi cấp', () => {
    const base = createDefaultSave().profile;
    const withPoints = devGrantAttributePoints(base, 10);
    expect(withPoints.unspentPoints).toBe(10);

    const spent = commitAttributeAllocation(withPoints, { str: 4, vit: 6 });
    expect(spentAttributePoints(spent)).toBe(10);
    expect(resetAttributePoints(spent)).toMatchObject({ unspentPoints: 10, attributes: { str: 5, vit: 5, agi: 5, int: 5 } });

    const leveled = devGrantLevels(spent, 5);
    expect(leveled.level).toBe(6);
    expect(leveled.unspentPoints).toBe(15); // 5 cấp × 3 điểm, giữ điểm đã cộng
    expect(spentAttributePoints(leveled)).toBe(10);

    const level20 = devSetLevel(leveled, 20);
    expect(level20).toMatchObject({ level: 20, exp: 0, unspentPoints: 57, attributes: { str: 5, vit: 5, agi: 5, int: 5 } });
    expect(devSetLevel(base, 500).level).toBe(99);
    expect(devGrantGold(base, 1000).gold).toBe(1000);
  });
});
