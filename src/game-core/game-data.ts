import characterJson from '../assets/game-data/character.json';
import combatJson from '../assets/game-data/combat.json';
import monstersJson from '../assets/game-data/monsters.json';
import type { Attributes, BattleConfig, GemType, MonsterDefinition } from './types';

export interface CharacterData {
  readonly schemaVersion: number;
  readonly id: string;
  readonly baseAttributes: Attributes;
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
  readonly derivedStats: {
    readonly maxHp: { readonly base: number; readonly vitPerPoint: number };
    readonly atk: { readonly base: number; readonly strPerPoint: number };
    readonly defense: { readonly base: number; readonly vitPerPoint: number };
    readonly skillPower: { readonly base: number; readonly intPerPoint: number };
    readonly agiBonus: { readonly agiPerPoint: number; readonly cap: number };
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
    readonly attackGemStatDivisor: number;
    readonly heal: { readonly base: number; readonly intMultiplier: number };
    readonly shield: { readonly base: number; readonly vitMultiplier: number };
    readonly energy: { readonly perGem: number };
    readonly poison: { readonly intBase: number; readonly intMultiplier: number; readonly turns: number };
  };
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
    readonly secondarySkillId: string;
    readonly secondarySkillLabel: string;
    readonly secondarySkillIcon: string;
    readonly secondarySkillFolder: string;
  }>>;
}

export interface MonsterCombatBalance {
  readonly lowHpPhaseRatio: number;
  readonly tacticDefenseRatio: number;
  readonly thinkingSeconds: { readonly minimum: number; readonly steps: number; readonly step: number };
  readonly heavyDamageMultiplier: number;
  readonly defenseMitigationMultiplier: number;
  readonly guardDefenseBonus: number;
  readonly mistGuardShield: number;
  readonly playerEnergyOnMonsterAttack: number;
  readonly monsterEnergyOnAttack: number;
  readonly poisonPotencyMultiplier: number;
  readonly poisonTurns: number;
  readonly lanternCatSkill: {
    readonly maxHpDamageRatio: number;
    readonly playerEnergyDrainRatio: number;
    readonly energyRestored: number;
  };
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
  readonly battle: {
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
