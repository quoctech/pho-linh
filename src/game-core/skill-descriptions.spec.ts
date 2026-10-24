import { CHARACTER_DATA } from './game-data';
import { describePlayerSkillEffects } from './skill-descriptions';

describe('mô tả kỹ năng sinh từ data', () => {
  it('mô tả đúng số liệu skill của 5 hệ', () => {
    const skills = CHARACTER_DATA.elementSkills;
    expect(describePlayerSkillEffects(skills['metal'].primarySkill)).toEqual([
      'Gây 180% ATK · xuyên Khiên',
      'Giảm 30% DEF đối thủ · 2 lượt',
    ]);
    expect(describePlayerSkillEffects(skills['water'].primarySkill)[0]).toBe('Trừ thẳng 1.100 Khiên (hết Khiên → trừ HP)');
    expect(describePlayerSkillEffects(skills['fire'].primarySkill)[0]).toBe('3 đòn × 40% ATK (tổng 120% ATK)');
    expect(describePlayerSkillEffects(skills['earth'].primarySkill)).toContain('40% Choáng 1 lượt (bỏ lượt hành động)');
    expect(describePlayerSkillEffects(skills['earth'].secondarySkill, 800)).toContain('Tạo Khiên 200% DEF (1.600)');
  });

  it('bỏ dòng sát thương khi caller tự hiển thị số thật', () => {
    const effects = describePlayerSkillEffects(CHARACTER_DATA.elementSkills['wood'].primarySkill, undefined, { includeDamage: false });
    expect(effects).toEqual(['Hút 15 Năng lượng của mục tiêu']);
  });

  it('mỗi hệ có hồ sơ giới thiệu đầy đủ trong JSON', () => {
    for (const profile of Object.values(CHARACTER_DATA.elementProfiles)) {
      expect(profile.className.length).toBeGreaterThan(0);
      expect(profile.boardPassive.description.length).toBeGreaterThan(0);
      expect(profile.classPassive.description.length).toBeGreaterThan(0);
    }
  });
});
