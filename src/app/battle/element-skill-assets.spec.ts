import {
  ELEMENT_SKILL_CONFIG,
  elementSkillAnimationKey,
  elementSkillFrameNames,
  usesElementSkillAtlas,
} from './element-skill-assets';

describe('five-element skill runtime assets', () => {
  it('registers the basic attack and both named skills for every element', () => {
    const elements = ['metal', 'wood', 'water', 'fire', 'earth'] as const;
    const expectedPrimary = {
      metal: ['kim_quang_pha_giap', 'Kim Quang Phá Giáp'],
      wood: ['van_doc_phe_tam', 'Vạn Độc Phệ Tâm'],
      water: ['han_bang_phong_an', 'Hàn Băng Phong Ấn'],
      fire: ['liet_diem_xuyen_tam', 'Liệt Diễm Xuyên Tâm'],
      earth: ['bat_dong_son_ha', 'Bất Động Sơn Hà'],
    } as const;
    const keys = new Set<string>();

    for (const element of elements) {
      const config = ELEMENT_SKILL_CONFIG[element];
      expect(usesElementSkillAtlas(element)).toBe(false);
      expect(config.atlasImage).toBe('');
      expect(config.atlasJson).toBe('');
      expect([config.basicAttackFolder, config.primarySkillFolder, config.secondarySkillFolder]).toHaveLength(3);
      expect(config.primarySkillFolder).toBe(expectedPrimary[element][0]);
      expect(config.primarySkillLabel).toBe(expectedPrimary[element][1]);
      for (const slot of ['basicAttack', 'primarySkill', 'secondarySkill'] as const) {
        const key = elementSkillAnimationKey(element, slot);
        expect(keys.has(key)).toBe(false);
        keys.add(key);
        expect(elementSkillFrameNames(element, slot)).toHaveLength(0);
      }
    }
    expect(keys.size).toBe(15);
  });
});
