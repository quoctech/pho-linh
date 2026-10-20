import {
  CHARACTER_DATA,
  COMBAT_DATA,
  MONSTER_COMBAT_BALANCE,
  MONSTER_DATA,
} from './game-data';
import { MONSTER_DEFINITIONS } from './monsters/monster-definitions';

describe('local game data contract', () => {
  it('keeps character formulas and combat limits in JSON data', () => {
    expect(CHARACTER_DATA.schemaVersion).toBe(1);
    expect(CHARACTER_DATA.baseAttributes).toEqual({ str: 5, vit: 5, agi: 5, int: 5 });
    expect(CHARACTER_DATA.derivedStats.maxHp.vitPerPoint).toBe(20);
    expect(CHARACTER_DATA.skills.cloud_break_lantern.baseDamage).toBe(50);
    expect(Object.keys(CHARACTER_DATA.elementSkills)).toEqual(['metal', 'wood', 'water', 'fire', 'earth']);
    expect(CHARACTER_DATA.elementSkills['fire'].primarySkillLabel).toBe('Hỏa Vũ Liên Châu');
    expect(CHARACTER_DATA.elementSkills['water'].primarySkillIcon).toBe('thuy_han_trieu_pha_khong');
    expect(CHARACTER_DATA.elementSkills['water'].secondarySkillIcon).toBe('thuy_bang_phong_thien_ly');
    expect(CHARACTER_DATA.limits.maxEnergy).toBe(100);
  });

  it('exposes every monster definition and shared monster rules from JSON', () => {
    expect(Object.keys(MONSTER_DATA.definitions)).toEqual([
      'mist_blob',
      'lantern_cat',
      'bamboo_mantis',
      'cloud_fox_boss',
    ]);
    expect(MONSTER_DEFINITIONS).toEqual(MONSTER_DATA.definitions);
    expect(MONSTER_COMBAT_BALANCE.heavyDamageMultiplier).toBe(1.7);
    expect(MONSTER_DEFINITIONS['mist_blob'].dodgeChance).toBe(0.25);
  });

  it('keeps the match-3 and battle config in the shared combat JSON', () => {
    expect(COMBAT_DATA.match3.gemTypes).toEqual(['attack', 'heal', 'shield', 'energy', 'poison']);
    expect(COMBAT_DATA.match3.balanceVersion).toBe(1);
    expect(COMBAT_DATA.battle.maxTurns).toBe(24);
  });
});
