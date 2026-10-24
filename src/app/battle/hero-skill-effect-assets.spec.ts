import {
  HERO_SKILL_EFFECTS,
  ensureHeroSkillEffectAnimations,
  fitHeroSkillEffectDisplaySize,
  heroSkillEffectForSkill,
  preloadHeroSkillEffects,
} from './hero-skill-effect-assets';

describe('hero skill effect assets', () => {
  it('maps all element skill effects to six WebP frames with manifest dimensions', () => {
    expect(Object.keys(HERO_SKILL_EFFECTS)).toEqual([
      'skill_kim_quang_pha_giap', 'skill_van_kiem_quy_tong', 'skill_thanh_dang_troi_hon', 'skill_van_diep_doc_chu',
      'skill_han_trieu_pha_khong', 'skill_bang_phong_thien_ly', 'skill_hoa_vu_lien_chau', 'skill_phan_thien_xa_nhat',
      'skill_son_nhac_tran_dia', 'skill_huyen_nham_ho_the',
    ]);
    expect(Object.values(HERO_SKILL_EFFECTS).map(({ frameWidth, frameHeight }) => [frameWidth, frameHeight])).toEqual([
      [512, 512], [512, 512], [512, 512], [512, 512], [512, 512], [512, 512],
      [512, 512], [512, 512], [512, 512], [512, 512],
    ]);
    for (const effect of Object.values(HERO_SKILL_EFFECTS)) {
      expect(effect.textureKeys).toHaveLength(6);
      expect(effect.textureKeys.every((key) => key.length > 0)).toBe(true);
    }
  });

  it('preloads only Kim and Mộc effects and creates one-shot animations', () => {
    const loaded: string[] = [];
    const animations: unknown[] = [];
    const loadedKeys = new Set<string>();
    const scene = {
      textures: { exists: (key: string) => loadedKeys.has(key) },
      load: { image: (key: string, path: string) => { loadedKeys.add(key); loaded.push(path); } },
      anims: { exists: () => false, create: (config: unknown) => animations.push(config) },
    } as never;
    preloadHeroSkillEffects(scene, 'metal');
    preloadHeroSkillEffects(scene, 'wood');
    preloadHeroSkillEffects(scene, 'water');
    preloadHeroSkillEffects(scene, 'fire');
    preloadHeroSkillEffects(scene, 'earth');
    expect(loaded).toHaveLength(60);
    expect(loaded.every((path) => path.endsWith('.webp'))).toBe(true);
    ensureHeroSkillEffectAnimations(scene, 'metal');
    ensureHeroSkillEffectAnimations(scene, 'wood');
    ensureHeroSkillEffectAnimations(scene, 'water');
    ensureHeroSkillEffectAnimations(scene, 'fire');
    ensureHeroSkillEffectAnimations(scene, 'earth');
    expect(animations).toHaveLength(10);
    expect(animations.every((config) => (config as { repeat: number; frameRate: number }).repeat === 0)).toBe(true);
    expect(animations.filter((config) => (config as { frameRate: number }).frameRate === 8)).toHaveLength(3);
    expect(animations.filter((config) => (config as { frameRate: number }).frameRate === 9)).toHaveLength(4);
    expect(animations.filter((config) => (config as { frameRate: number }).frameRate === 10)).toHaveLength(3);
    expect(animations.filter((config) => (config as { frameRate: number }).frameRate === 12)).toHaveLength(0);
  });

  it('preserves each effect aspect ratio', () => {
    expect(fitHeroSkillEffectDisplaySize(HERO_SKILL_EFFECTS.skill_van_kiem_quy_tong)).toEqual({ width: 150, height: 150 });
    expect(fitHeroSkillEffectDisplaySize(HERO_SKILL_EFFECTS.skill_van_diep_doc_chu)).toEqual({ width: 150, height: 150 });
    expect(fitHeroSkillEffectDisplaySize(HERO_SKILL_EFFECTS.skill_han_trieu_pha_khong)).toEqual({ width: 150, height: 150 });
    expect(fitHeroSkillEffectDisplaySize(HERO_SKILL_EFFECTS.skill_bang_phong_thien_ly)).toEqual({ width: 150, height: 150 });
    expect(fitHeroSkillEffectDisplaySize(HERO_SKILL_EFFECTS.skill_son_nhac_tran_dia)).toEqual({ width: 150, height: 150 });
    expect(fitHeroSkillEffectDisplaySize(HERO_SKILL_EFFECTS.skill_huyen_nham_ho_the)).toEqual({ width: 150, height: 150 });
    expect(HERO_SKILL_EFFECTS.skill_son_nhac_tran_dia.target).toBe('monster');
    expect(HERO_SKILL_EFFECTS.skill_huyen_nham_ho_the.target).toBe('player');
    expect(HERO_SKILL_EFFECTS.skill_kim_quang_pha_giap.travel).toBe(true);
    expect(HERO_SKILL_EFFECTS.skill_van_kiem_quy_tong.travel).toBe(true);
    expect(HERO_SKILL_EFFECTS.skill_han_trieu_pha_khong.travel).toBe(true);
    expect(HERO_SKILL_EFFECTS.skill_bang_phong_thien_ly.travel).toBe(true);
    expect(HERO_SKILL_EFFECTS.skill_thanh_dang_troi_hon.travel).toBe(true);
    expect(HERO_SKILL_EFFECTS.skill_van_diep_doc_chu.travel).toBe(true);
    expect(HERO_SKILL_EFFECTS.skill_thanh_dang_troi_hon.rotationDegrees).toBe(-45);
    expect(HERO_SKILL_EFFECTS.skill_son_nhac_tran_dia.travel).toBe(true);
    expect(HERO_SKILL_EFFECTS.skill_son_nhac_tran_dia.rotationDegrees).toBe(-45);
    expect(HERO_SKILL_EFFECTS.skill_huyen_nham_ho_the.travel).toBe(false);
    expect(heroSkillEffectForSkill('dia_sat_phan_chan')?.skillId).toBe('huyen_nham_ho_the');
    expect(HERO_SKILL_EFFECTS.skill_han_trieu_pha_khong.rotationDegrees).toBe(-42);
    expect(heroSkillEffectForSkill('thuy_linh_ho_the')?.skillId).toBe('bang_phong_thien_ly');
    expect(heroSkillEffectForSkill('phan_thien_hoa_vu')?.skillId).toBe('phan_thien_xa_nhat');
    expect(HERO_SKILL_EFFECTS.skill_phan_thien_xa_nhat.travel).toBe(true);
    expect(HERO_SKILL_EFFECTS.skill_hoa_vu_lien_chau.rotationDegrees).toBe(-5);
    expect(HERO_SKILL_EFFECTS.skill_phan_thien_xa_nhat.rotationDegrees).toBe(-5);
    expect(HERO_SKILL_EFFECTS.skill_phan_thien_xa_nhat.displayWidth).toBe(170);
    expect(HERO_SKILL_EFFECTS.skill_phan_thien_xa_nhat.tint).toBe(0xffa13d);
    expect(HERO_SKILL_EFFECTS.skill_bang_phong_thien_ly.displayWidth).toBe(170);
    expect(HERO_SKILL_EFFECTS.skill_bang_phong_thien_ly.tint).toBe(0xb9efff);
  });
});
