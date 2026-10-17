import type { MonsterBattleState, MonsterDefinition } from '../types';

export const MIST_BLOB: MonsterDefinition = {
  id: 'mist_blob',
  name: 'Bụi Sương',
  level: 1,
  maxHp: 400,
  attack: 20,
  defense: 2,
  behaviorId: 'basic',
  behaviors: ['basic', 'poison'],
  tactics: { attack: 8, defense: 1, heal: 0, shield: 2, poison: 1 },
  expReward: 35,
  goldReward: 12,
};

export const LANTERN_CAT: MonsterDefinition = {
  id: 'lantern_cat', name: 'Miêu Đèn', level: 2, maxHp: 260, attack: 28, defense: 6,
  behaviorId: 'guard', behaviors: ['basic', 'guard', 'poison'], expReward: 65, goldReward: 24,
  tactics: { attack: 5, defense: 8, heal: 2, shield: 7, poison: 1 },
  unlockRequirement: { monsterId: 'mist_blob', wins: 2 },
};

export const BAMBOO_MANTIS: MonsterDefinition = {
  id: 'bamboo_mantis', name: 'Bọ Lá Tre', level: 3, maxHp: 360, attack: 38, defense: 10,
  behaviorId: 'heavy', behaviors: ['basic', 'heavy', 'poison'], expReward: 105, goldReward: 42,
  tactics: { attack: 8, defense: 2, heal: 1, shield: 3, poison: 4 },
  unlockRequirement: { monsterId: 'lantern_cat', wins: 1 },
};

export const CLOUD_FOX_BOSS: MonsterDefinition = {
  id: 'cloud_fox_boss', name: 'Cáo Mây', level: 5, maxHp: 620, attack: 52, defense: 14,
  behaviorId: 'boss', behaviors: ['basic', 'guard', 'heavy', 'poison'], expReward: 240, goldReward: 100,
  tactics: { attack: 8, defense: 7, heal: 3, shield: 6, poison: 5 },
  unlockRequirement: { monsterId: 'bamboo_mantis', wins: 1 },
};

export const MONSTER_DEFINITIONS: Readonly<Record<string, MonsterDefinition>> = {
  [MIST_BLOB.id]: MIST_BLOB,
  [LANTERN_CAT.id]: LANTERN_CAT,
  [BAMBOO_MANTIS.id]: BAMBOO_MANTIS,
  [CLOUD_FOX_BOSS.id]: CLOUD_FOX_BOSS,
};

export function createMonsterBattleState(monsterId: string): MonsterBattleState {
  const definition = MONSTER_DEFINITIONS[monsterId] ?? MIST_BLOB;
  return {
    ...definition,
    baseDefense: definition.defense,
    currentHp: definition.maxHp,
    energy: 0,
    shield: 0,
    poisonPotency: 0,
    poisonTurns: 0,
    nextAction: definition.behaviors[0] ?? 'basic',
    phase: 1,
    actionCount: 0,
  };
}
