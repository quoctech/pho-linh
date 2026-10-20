import {
  MONSTER_SKILL_EFFECTS,
  monsterSkillEffectsForMonster,
  preloadMonsterSkillEffects,
} from './monster-skill-effect-assets';

describe('monster skill effect assets', () => {
  it('describes every six-frame effect with its standard aspect ratio', () => {
    expect(Object.keys(MONSTER_SKILL_EFFECTS)).toHaveLength(7);
    for (const effect of Object.values(MONSTER_SKILL_EFFECTS)) expect(effect.textureKeys).toHaveLength(6);
    expect(MONSTER_SKILL_EFFECTS.skill_suong_mu_xam_thuc.frameWidth).toBe(364);
    expect(MONSTER_SKILL_EFFECTS.skill_long_mieu_lien_kich.frameHeight).toBe(532);
    expect(MONSTER_SKILL_EFFECTS.skill_bich_van_bang_bang.frameWidth).toBe(510);
  });

  it('maps every monster skill vfxId in data to an effect', () => {
    expect(monsterSkillEffectsForMonster('mist_blob').map((effect) => effect.id)).toEqual(['skill_suong_mu_xam_thuc']);
    expect(monsterSkillEffectsForMonster('lantern_cat').map((effect) => effect.id)).toEqual(['skill_long_mieu_lien_kich']);
    expect(monsterSkillEffectsForMonster('bamboo_mantis')).toHaveLength(2);
    expect(monsterSkillEffectsForMonster('cloud_fox_boss')).toHaveLength(3);
  });

  it('preloads only the effects belonging to the active monster', () => {
    const loaded: string[] = [];
    const scene = { load: { image: (_key: string, path: string) => loaded.push(path) } } as never;

    preloadMonsterSkillEffects(scene, 'mist_blob');
    expect(loaded).toHaveLength(6);
    expect(loaded.every((path) => path.includes('mist-dust/skill-suong-mu-xam-thuc/skill_suong_mu_xam_thuc_'))).toBe(true);

    loaded.length = 0;
    preloadMonsterSkillEffects(scene, 'cloud_fox_boss');
    expect(loaded).toHaveLength(18);
    expect(loaded[0]).toBe('assets/vfx/monster-skills/bo-la-tre-cao-may-v2/skill_bich_van_bang_bang/frames_webp/skill_bich_van_bang_bang_01.webp');
  });
});
