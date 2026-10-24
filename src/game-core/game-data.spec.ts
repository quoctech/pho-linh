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
    expect(CHARACTER_DATA.derivedStats.maxHp.vitPerPoint).toBe(250);
    expect(CHARACTER_DATA.derivedStats.atk.strPerPoint).toBe(30);
    expect(CHARACTER_DATA.elementBaseStats).toEqual({
      metal: { maxHp: 10500, atk: 1150, defense: 450, agi: 180 },
      wood: { maxHp: 11000, atk: 1050, defense: 500, agi: 120 },
      water: { maxHp: 10000, atk: 1100, defense: 550, agi: 150 },
      fire: { maxHp: 10000, atk: 1050, defense: 350, agi: 220 },
      earth: { maxHp: 10500, atk: 1150, defense: 550, agi: 60 },
    });
    expect(CHARACTER_DATA.combat.dodge.agiOffset).toBe(1900);
    expect(CHARACTER_DATA.combat.defenseMitigation.defOffset).toBe(1900);
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
    const stats = Object.values(MONSTER_DEFINITIONS).map((monster) => [monster.id, monster.maxHp, monster.attack, monster.defense, monster.agi]);
    expect(stats).toEqual([
      ['mist_blob', 9500, 700, 600, 150],
      ['lantern_cat', 14000, 1050, 320, 300],
      ['bamboo_mantis', 14000, 1550, 450, 250],
      ['cloud_fox_boss', 18000, 2100, 500, 380],
    ]);
  });

  it('keeps the match-3 and battle config in the shared combat JSON', () => {
    expect(COMBAT_DATA.match3.gemTypes).toEqual(['attack', 'heal', 'shield', 'energy', 'poison']);
    expect(COMBAT_DATA.match3.balanceVersion).toBe(7);
    expect(COMBAT_DATA.battle.maxTurns).toBe(0); // tạm bỏ giới hạn lượt
  });

  it('exposes Balance V3 gem weights, energy table and elemental modifiers', () => {
    expect(COMBAT_DATA.match3.gemWeights).toEqual({ attack: 25, poison: 20, energy: 20, heal: 18, shield: 17 });
    expect(COMBAT_DATA.energyByMatchLength).toEqual({ '3': 15, '4': 25, '5': 40 });
    expect(COMBAT_DATA.elements.cycle).toEqual(['metal', 'wood', 'earth', 'water', 'fire']);
    expect(COMBAT_DATA.elements.modifier.damage).toEqual({ counter: 1.2, neutral: 1.0, countered: 0.85 });
    expect(COMBAT_DATA.elements.modifier.support).toEqual({ counter: 1.0, neutral: 1.0, countered: 0.9 });
    expect(COMBAT_DATA.elements.modifier.energy).toEqual({ counter: 1.2, neutral: 1.0, countered: 1.0 });
  });

  it('keeps V3 player combat factors and class passives in JSON data', () => {
    expect(CHARACTER_DATA.combat.attackTileFactor).toBe(0.45);
    expect(CHARACTER_DATA.combat.poisonAtkFactor).toBe(0.18);
    expect(CHARACTER_DATA.combat.poisonMaxStacks).toBe(5);
    expect(CHARACTER_DATA.combat.heal.maxHpFactor).toBe(0.03);
    expect(CHARACTER_DATA.combat.shield.defFactor).toBe(0.8);
    expect(CHARACTER_DATA.passives.metal.criticalChanceBonus).toBe(0.4);
    expect(CHARACTER_DATA.passives.metal.criticalDamageBonus).toBe(0.4);
    expect(CHARACTER_DATA.passives.wood.healMultiplierWhenPoisoned).toBe(1.4);
    expect(CHARACTER_DATA.passives.metal.yellowBreakChance).toBe(0.25);
    expect(CHARACTER_DATA.passives.wood.poisonExtraTurns).toBe(1);
    expect(CHARACTER_DATA.passives.water.shieldMatchMin).toBe(4);
    expect(CHARACTER_DATA.passives.fire.redDamageBonus).toBe(0.1);
    expect(CHARACTER_DATA.passives.fire.burningDamageBonus).toBe(0.2);
    expect(CHARACTER_DATA.passives.earth.energyToShieldRatio).toBe(0.35);
    expect(CHARACTER_DATA.passives.fire.burningTurns).toBe(3);
    expect(CHARACTER_DATA.passives.earth.shieldDamageReduction).toBe(0.1);
  });

  it('provides one primary skill contract for every player element', () => {
    const costs = { metal: 100, wood: 50, water: 50, fire: 60, earth: 65 } as const;
    const secondaryCosts = { metal: 60, wood: 90, water: 100, fire: 100, earth: 80 } as const;
    for (const [element, skill] of Object.entries(CHARACTER_DATA.elementSkills)) {
      expect(skill.primarySkillId, element).toBeTruthy();
      expect(skill.primarySkill.energyCost, element).toBe(costs[element as keyof typeof costs]);
      expect(skill.secondarySkill.energyCost, element).toBe(secondaryCosts[element as keyof typeof secondaryCosts]);
      if (element === 'metal') {
        expect(skill.primarySkill.attackMultiplier).toBe(1.8);
        expect(skill.primarySkill.bypassShield).toBe(true);
        expect(skill.secondarySkill.energyCost).toBe(60);
        expect(skill.secondarySkill.attackMultiplier).toBe(1.2);
      }
    }
  });

  it('assigns a Ngũ Hành element to every monster', () => {
    expect(MONSTER_DEFINITIONS['mist_blob'].element).toBe('water');
    expect(MONSTER_DEFINITIONS['lantern_cat'].element).toBe('fire');
    expect(MONSTER_DEFINITIONS['bamboo_mantis'].element).toBe('wood');
    expect(MONSTER_DEFINITIONS['cloud_fox_boss'].element).toBe('water');
  });
});
