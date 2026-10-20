import { ELEMENT_SKILL_CONFIG, elementSkillIconFramePaths, fitSkillIconDisplaySize, getElementSkillVisualState, skillIconPath } from './element-skill-assets';

describe('static skill icon assets', () => {
  it('maps both skills for every element to existing WebP files', () => {
    const elements = ['metal', 'wood', 'water', 'fire', 'earth'] as const;
    const expected = {
      metal: ['kim_kim_quang_pha_giap', 'kim_van_kiem_quy_tong'], wood: ['moc_thanh_dang_troi_hon', 'moc_van_diep_doc_chu'],
      water: ['thuy_han_trieu_pha_khong', 'thuy_bang_phong_thien_ly'], fire: ['hoa_hoa_vu_lien_chau', 'hoa_phan_thien_xa_nhat'],
      earth: ['tho_son_nhac_tran_dia', 'tho_huyen_nham_ho_the'],
    } as const;
    for (const element of elements) {
      const config = ELEMENT_SKILL_CONFIG[element];
      expect([config.primarySkillIcon, config.secondarySkillIcon]).toEqual(expected[element]);
      expect(elementSkillIconFramePaths(element, 'primarySkill')).toHaveLength(1);
      expect(elementSkillIconFramePaths(element, 'secondarySkill')).toHaveLength(1);
      expect(elementSkillIconFramePaths(element, 'primarySkill')[0]).toMatch(/\.webp$/);
      expect(skillIconPath(config.primarySkillIcon)).toContain('hud-icons-v2');
    }
  });
  it('keeps static icon size and state feedback independent', () => {
    expect(getElementSkillVisualState('primarySkill', true, 100, 100)).toEqual({ active: true, locked: false, animate: false });
    expect(getElementSkillVisualState('secondarySkill', true, 100, 100)).toEqual({ active: false, locked: true, animate: false });
    expect(fitSkillIconDisplaySize(165, 148)).toEqual({ width: 48, height: 43 });
    expect(fitSkillIconDisplaySize(165, 132)).toEqual({ width: 48, height: 38 });
  });
});
