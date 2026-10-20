import {
  MONSTER_SKILL_EFFECTS,
  preloadMonsterSkillEffects,
} from './monster-skill-effect-assets';

describe('monster skill effect assets', () => {
  it('describes both six-frame effects with their standard aspect ratios', () => {
    expect(Object.keys(MONSTER_SKILL_EFFECTS)).toEqual([
      'mist_suong_mu_xam_thuc',
      'lantern_long_mieu_lien_kich',
    ]);
    expect(MONSTER_SKILL_EFFECTS.mist_suong_mu_xam_thuc.textureKeys).toHaveLength(6);
    expect(MONSTER_SKILL_EFFECTS.mist_suong_mu_xam_thuc.frameWidth).toBe(364);
    expect(MONSTER_SKILL_EFFECTS.mist_suong_mu_xam_thuc.frameHeight).toBe(462);
    expect(MONSTER_SKILL_EFFECTS.lantern_long_mieu_lien_kich.textureKeys).toHaveLength(6);
    expect(MONSTER_SKILL_EFFECTS.lantern_long_mieu_lien_kich.frameWidth).toBe(435);
    expect(MONSTER_SKILL_EFFECTS.lantern_long_mieu_lien_kich.frameHeight).toBe(532);
  });

  it('preloads only the effect belonging to the active monster', () => {
    const loaded: string[] = [];
    const scene = { load: { image: (_key: string, path: string) => loaded.push(path) } } as never;

    preloadMonsterSkillEffects(scene, 'mist_blob');
    expect(loaded).toHaveLength(6);
    expect(loaded.every((path) => path.includes('mist-dust/skill-suong-mu-xam-thuc'))).toBe(true);

    loaded.length = 0;
    preloadMonsterSkillEffects(scene, 'lantern_cat');
    expect(loaded).toHaveLength(6);
    expect(loaded.every((path) => path.includes('lantern-cat/skill-long-mieu-lien-kich'))).toBe(true);
  });
});

