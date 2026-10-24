import { MONSTER_DATA } from '../game-data';
import type { MonsterBattleState, MonsterDefinition } from '../types';

export const MIST_BLOB: MonsterDefinition = MONSTER_DATA.definitions['mist_blob'];
export const LANTERN_CAT: MonsterDefinition = MONSTER_DATA.definitions['lantern_cat'];
export const BAMBOO_MANTIS: MonsterDefinition = MONSTER_DATA.definitions['bamboo_mantis'];
export const CLOUD_FOX_BOSS: MonsterDefinition = MONSTER_DATA.definitions['cloud_fox_boss'];

export const MONSTER_DEFINITIONS: Readonly<Record<string, MonsterDefinition>> = MONSTER_DATA.definitions;

// Temporary QA flag: expose every monster from the target-selection screen
// while the full roster and its V2 art are being reviewed.
export const ALL_MONSTERS_TEMPORARILY_UNLOCKED = true;

export function createMonsterBattleState(monsterId: string): MonsterBattleState {
  const definition = MONSTER_DEFINITIONS[monsterId] ?? MIST_BLOB;
  return {
    ...definition,
    baseDefense: definition.defense,
    currentHp: definition.maxHp,
    energy: 0,
    shield: 0,
    defenseReductionTurns: 0,
    defenseReductionPercent: 0,
    poisonPotency: 0,
    poisonTurns: 0,
    poisonStacks: 0,
    skillPoisonPotency: 0,
    burningPotency: 0,
    burningTurns: 0,
    controlEffect: undefined,
    controlTurns: 0,
    damageTakenBonus: 0,
    damageTakenBonusTurns: 0,
    guardTurns: 0,
    dodgeBonus: 0,
    dodgeBonusCharges: 0,
    dodgeBonusTurns: 0,
    healPerTurn: 0,
    healTurns: 0,
    slowedTurns: 0,
    enrageStacks: 0,
    skillUses: {},
    nextAction: definition.behaviors[0] ?? 'basic',
    phase: 1,
    actionCount: 0,
  };
}
