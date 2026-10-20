import characterJson from '../assets/game-data/character.json';
import combatJson from '../assets/game-data/combat.json';
import monstersJson from '../assets/game-data/monsters.json';
import type { Attributes, BattleConfig, ElementId, GemType, MonsterDefinition } from './types';

/** Quan hệ Ngũ Hành giữa nhân vật và quái. */
export type ElementRelationship = 'counter' | 'neutral' | 'countered';
/** Nhóm hiệu quả ngọc chịu ảnh hưởng của modifier Ngũ Hành. */
export type ElementCategory = 'damage' | 'support' | 'energy';

export interface PlayerSkillData {
  readonly energyCost: number;
  readonly baseDamage: number;
  readonly skillPowerMultiplier: number;
  readonly defenseMultiplier: number;
  readonly attackMultiplier?: number;
  readonly bypassShield?: boolean;
  readonly defenseReduction?: number;
  readonly defenseReductionTurns?: number;
  readonly fixedDamage?: number;
  readonly fixedDamageTarget?: 'shield_or_hp';
  readonly hitCount?: number;
  readonly energySteal?: number;
  readonly poisonAtkFactor?: number;
  readonly poisonTurns?: number;
  readonly damageTakenBonus?: number;
  readonly damageTakenBonusTurns?: number;
  readonly controlEffect?: 'stun' | 'freeze';
  readonly controlChance?: number;
  readonly controlTurns?: number;
  readonly selfShieldDefenseMultiplier?: number;
  readonly selfDamageReduction?: number;
  readonly selfDamageReductionTurns?: number;
  readonly controlImmunityTurns?: number;
  readonly reflectDamageRatio?: number;
}

export interface ElementProfileData {
  readonly elementLabel: string;
  readonly className: string;
  readonly hanzi: string;
  readonly weapon: string;
  readonly role: string;
  readonly intro: string;
  readonly boardPassive: { readonly name: string; readonly description: string };
  readonly classPassive: { readonly name: string; readonly description: string };
}

export interface CharacterData {
  readonly schemaVersion: number;
  readonly id: string;
  readonly baseAttributes: Attributes;
  /** Công cụ test cân bằng offline (chỉ hiện khi bật Dev mode). */
  readonly devTools: {
    readonly pointSteps: readonly number[];
    readonly levelSteps: readonly number[];
    readonly goldStep: number;
    readonly maxLevel: number;
  };
  readonly progression: {
    readonly startingLevel: number;
    readonly startingExp: number;
    readonly startingGold: number;
    readonly startingUnspentPoints: number;
    readonly expBase: number;
    readonly expPerLevel: number;
    readonly minimumExpRequired: number;
    readonly attributePointsPerLevel: number;
  };
  /** Văn bản giới thiệu nhân vật theo hệ cho màn Thông số (tên lớp, vai trò, nội tại). */
  readonly elementProfiles: Readonly<Record<ElementId, ElementProfileData>>;
  /** Chỉ số Lv1 theo hệ (Balance V6). */
  readonly elementBaseStats: Readonly<Record<ElementId, {
    readonly maxHp: number;
    readonly atk: number;
    readonly defense: number;
    readonly agi: number;
  }>>;
  /** Điểm thuộc tính vượt `baseAttributes` cộng thêm vào base theo hệ; trang bị nhân `equipmentScale`. */
  readonly derivedStats: {
    readonly maxHp: { readonly vitPerPoint: number };
    readonly atk: { readonly strPerPoint: number };
    readonly defense: { readonly vitPerPoint: number };
    readonly agi: { readonly agiPerPoint: number };
    readonly skillPower: { readonly base: number; readonly intPerPoint: number };
    readonly equipmentScale: number;
    readonly power: {
      readonly maxHpDivisor: number;
      readonly atkMultiplier: number;
      readonly defenseMultiplier: number;
      readonly skillPowerMultiplier: number;
    };
  };
  readonly limits: {
    readonly minAttribute: number;
    readonly maxEnergy: number;
    readonly shieldMaxHpRatio: number;
    readonly poisonMaxHpRatio: number;
  };
  readonly combat: {
    /** V2: sát thương ngọc đỏ = ATK × số ô × attackTileFactor × modifier Ngũ Hành. */
    readonly attackTileFactor: number;
    /** V2: độc mỗi tầng/lượt = ATK × poisonAtkFactor × modifier Ngũ Hành. */
    readonly poisonAtkFactor: number;
    readonly poisonMaxStacks: number;
    readonly heal: { readonly maxHpFactor: number };
    readonly shield: { readonly defFactor: number };
    readonly poison: { readonly turns: number };
    /** Tỉ lệ né = AGI / (AGI + agiOffset), tối đa maxChance. Dùng chung cho nhân vật và quái. */
    readonly dodge: { readonly agiOffset: number; readonly maxChance: number };
    /** Giảm sát thương nhận = DEF / (DEF + defOffset). Dùng chung cho mọi đòn. */
    readonly defenseMitigation: { readonly defOffset: number };
    /** Hằng số riêng cho hiệu ứng ngọc do quái tự match (không dùng công thức player V2). */
    readonly monsterGems: {
      readonly heal: { readonly maxHpRatioPerGem: number };
      readonly shield: { readonly base: number; readonly defMultiplier: number };
      readonly energy: { readonly perGem: number };
    };
  };
  /** Tham số nội tại nghề theo hệ nhân vật (Balance V3). */
  readonly passives: Readonly<Record<ElementId, {
    // Nội tại nghề (3.x)
    readonly criticalChanceBonus?: number;
    readonly criticalDamageBonus?: number;
    readonly healMultiplierWhenPoisoned?: number;
    readonly burningDamageBonus?: number;
    readonly burningTurns?: number;
    readonly burningAtkFactor?: number;
    readonly shieldDamageReduction?: number;
    readonly freezeExtraTurnsWhenDelayed?: number;
    readonly slowedTurnsAfterDelay?: number;
    // Nội tại bàn cờ (2.2)
    readonly yellowBreakChance?: number;
    readonly yellowBreakEnergy?: number;
    readonly poisonExtraTurns?: number;
    readonly overhealToShield?: boolean;
    readonly shieldMatchMin?: number;
    readonly shieldBonusRatio?: number;
    readonly delayMonsterAttackTurns?: number;
    readonly redDamageBonus?: number;
    readonly redPierceShield?: boolean;
    readonly energyToShieldRatio?: number;
    readonly energyToShieldScale?: number;
  }>>;
  readonly skills: {
    readonly cloud_break_lantern: {
      readonly energyCost: number;
      readonly baseDamage: number;
      readonly skillPowerMultiplier: number;
      readonly defenseMultiplier: number;
    };
  };
  readonly elementSkills: Readonly<Record<string, {
    readonly basicAttackFolder: string;
    readonly primarySkillId: string;
    readonly primarySkillLabel: string;
    readonly primarySkillIcon: string;
    readonly primarySkillFolder: string;
    readonly primarySkill: PlayerSkillData;
    readonly secondarySkillId: string;
    readonly secondarySkillLabel: string;
    readonly secondarySkillIcon: string;
    readonly secondarySkillFolder: string;
    readonly secondarySkill: PlayerSkillData;
  }>>;
}

export interface MonsterCombatBalance {
  readonly lowHpPhaseRatio: number;
  readonly tacticDefenseRatio: number;
  readonly thinkingSeconds: { readonly minimum: number; readonly steps: number; readonly step: number };
  readonly heavyDamageMultiplier: number;
  /** Guard cộng thêm DEF = baseDefense × tỉ lệ. */
  readonly guardDefenseRatio: number;
  /** Số hành động của người chơi mà DEF cộng từ guard còn hiệu lực. */
  readonly guardTurns: number;
  /** Hệ số sát thương quái theo số ngọc đỏ quái match (khóa 3..6, ≥6 dùng khóa 6). */
  readonly matchDamageMultipliers: Readonly<Record<string, number>>;
  readonly mistGuardShield: number;
  readonly playerEnergyOnMonsterAttack: number;
  readonly monsterEnergyOnAttack: number;
  /** Độc quái gieo lên nhân vật mỗi lượt = ATK quái × tỉ lệ. */
  readonly poisonAtkRatio: number;
  readonly poisonTurns: number;
}

export interface MonsterData {
  readonly schemaVersion: number;
  readonly id: string;
  readonly combat: MonsterCombatBalance;
  readonly definitions: Readonly<Record<string, MonsterDefinition>>;
}

export interface CombatData {
  readonly schemaVersion: number;
  readonly id: string;
  readonly match3: {
    readonly rows: number;
    readonly cols: number;
    readonly gemTypes: readonly GemType[];
    readonly gemWeights: Readonly<Partial<Record<GemType, number>>>;
    readonly maxCascade: number;
    readonly maxGenerationAttempts: number;
    readonly balanceVersion: number;
    readonly comboMultipliers: readonly number[];
  };
  /** V2: năng lượng nhận theo độ dài match ngọc vàng (không nhân cascade). */
  readonly energyByMatchLength: Readonly<Record<string, number>>;
  /** V2: vòng tương khắc Ngũ Hành và bảng modifier theo quan hệ. */
  readonly elements: {
    readonly cycle: readonly ElementId[];
    readonly modifier: Readonly<Record<ElementCategory, Readonly<Record<ElementRelationship, number>>>>;
  };
  readonly battle: {
    /** Giới hạn lượt mỗi trận; 0 = không giới hạn. */
    readonly maxTurns: number;
    readonly playerTurnSeconds: number;
  };
  readonly monsterRewards: {
    readonly dropChance: number;
    readonly rareDropThreshold: number;
  };
}

export const CHARACTER_DATA = characterJson as CharacterData;
export const MONSTER_DATA = monstersJson as unknown as MonsterData;
export const MONSTER_COMBAT_BALANCE = MONSTER_DATA.combat;
export const COMBAT_DATA = combatJson as CombatData;

/** Runtime contract shared by the local JSON loader and a future data-center adapter. */
export interface GameDataSnapshot {
  readonly character: CharacterData;
  readonly monsters: MonsterData;
  readonly combat: CombatData;
}

export const LOCAL_GAME_DATA: GameDataSnapshot = {
  character: CHARACTER_DATA,
  monsters: MONSTER_DATA,
  combat: COMBAT_DATA,
};

export function createBattleConfigFromData(): BattleConfig {
  return {
    match3: {
      rows: COMBAT_DATA.match3.rows,
      cols: COMBAT_DATA.match3.cols,
      gemTypes: [...COMBAT_DATA.match3.gemTypes],
      gemWeights: { ...COMBAT_DATA.match3.gemWeights },
      maxCascade: COMBAT_DATA.match3.maxCascade,
      maxGenerationAttempts: COMBAT_DATA.match3.maxGenerationAttempts,
      balanceVersion: COMBAT_DATA.match3.balanceVersion,
    },
    maxTurns: COMBAT_DATA.battle.maxTurns,
    energyCap: CHARACTER_DATA.limits.maxEnergy,
    shieldCapMaxHpRatio: CHARACTER_DATA.limits.shieldMaxHpRatio,
    comboMultipliers: [...COMBAT_DATA.match3.comboMultipliers],
    playerTurnSeconds: COMBAT_DATA.battle.playerTurnSeconds,
  };
}
