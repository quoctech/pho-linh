import { nextInt, nextRandom } from './rng';
import { CHARACTER_DATA, COMBAT_DATA } from './game-data';
import { ITEM_TEMPLATES, INVENTORY_CAPACITY, createItemInstance, getEquippedItemIds } from './items';
import { MONSTER_DEFINITIONS } from './monsters/monster-definitions';
import { computeDerivedStats } from './player';
import type {
  Attributes, BattleOutcome, BattleState, EquipmentBonuses, EquipmentSlots, ItemInstance,
  LocalSaveV1, MonsterProgress, PlayerProfile, RewardGrant, RewardJournalEntry, PendingReward,
} from './types';

export const MAX_INVENTORY = INVENTORY_CAPACITY;

export function getExpRequired(level: number): number {
  const progression = CHARACTER_DATA.progression;
  return Math.max(
    progression.minimumExpRequired,
    progression.expBase + Math.max(0, level - 1) * progression.expPerLevel,
  );
}

export function createDefaultProfile(): PlayerProfile {
  const progression = CHARACTER_DATA.progression;
  return {
    level: progression.startingLevel,
    exp: progression.startingExp,
    gold: progression.startingGold,
    attributes: { ...CHARACTER_DATA.baseAttributes },
    unspentPoints: progression.startingUnspentPoints,
  };
}

export function previewAttributeAllocation(profile: PlayerProfile, draft: Partial<Attributes>): PlayerProfile {
  const spend = Object.values(draft).reduce((sum, value) => sum + Math.max(0, value ?? 0), 0);
  const points = Math.max(0, Math.min(profile.unspentPoints, spend));
  const attributes = { ...profile.attributes };
  let remaining = points;
  for (const key of ['str', 'vit', 'agi', 'int'] as const) {
    const applied = Math.max(0, Math.min(draft[key] ?? 0, remaining));
    attributes[key] += applied;
    remaining -= applied;
  }
  return { ...profile, attributes, unspentPoints: profile.unspentPoints - points };
}

export function commitAttributeAllocation(profile: PlayerProfile, draft: Partial<Attributes>): PlayerProfile {
  return previewAttributeAllocation(profile, draft);
}

export function equipmentBonuses(inventory: readonly ItemInstance[], equipment: EquipmentSlots): EquipmentBonuses {
  const result: Record<string, number> = {};
  for (const id of getEquippedItemIds(equipment)) {
    const item = inventory.find((instance) => instance.instanceId === id);
    const bonuses = item ? ITEM_TEMPLATES[item.templateId]?.bonuses : undefined;
    if (!bonuses) continue;
    for (const key of ['maxHp', 'atk', 'defense', 'skillPower', 'agiBonus'] as const) result[key] = (result[key] ?? 0) + (bonuses[key] ?? 0);
  }
  return result;
}

export function computeProfileStats(save: Pick<LocalSaveV1, 'profile' | 'inventory' | 'equipment'>) {
  return computeDerivedStats(save.profile.attributes, equipmentBonuses(save.inventory, save.equipment));
}

function monsterIdOf(outcome: BattleOutcome | BattleState): string {
  return 'monster' in outcome ? outcome.monster.id : outcome.monsterId ?? 'mist_blob';
}

function resultOf(outcome: BattleOutcome | BattleState): string {
  return 'phase' in outcome ? outcome.phase : outcome.result;
}

function seedOf(outcome: BattleOutcome | BattleState): number {
  return 'seed' in outcome && typeof outcome.seed === 'number' ? outcome.seed : hash(outcome.battleId);
}

function hash(value: string): number {
  let result = 2166136261;
  for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
  return result >>> 0;
}

function makeDrop(monsterId: string, seed: number, battleId: string): ItemInstance | undefined {
  const roll = nextRandom(seed);
  if (roll.value < 1 - COMBAT_DATA.monsterRewards.dropChance) return undefined;
  const rarity = roll.value < COMBAT_DATA.monsterRewards.rareDropThreshold ? 'common' : 'rare';
  const definition = MONSTER_DEFINITIONS[monsterId] ?? MONSTER_DEFINITIONS['mist_blob'];
  const fallback = MONSTER_DEFINITIONS['mist_blob'];
  const pool = (definition.dropPool ?? fallback.dropPool ?? []).filter((id) => ITEM_TEMPLATES[id].rarity === rarity);
  if (pool.length === 0) return undefined;
  const picked = nextInt(roll.state, pool.length);
  return createItemInstance(pool[picked.value], `${battleId}:item:${picked.value}`, 0);
}

function updateProgress(save: LocalSaveV1, monsterId: string): Readonly<Record<string, MonsterProgress>> {
  const progress = { ...save.monsterProgress };
  const current = progress[monsterId] ?? { wins: 0, unlocked: monsterId === 'mist_blob' };
  progress[monsterId] = { wins: current.wins + 1, unlocked: true };
  for (const definition of Object.values(MONSTER_DEFINITIONS)) {
    const requirement = definition.unlockRequirement;
    if (requirement && (progress[requirement.monsterId]?.wins ?? 0) >= requirement.wins) {
      const old = progress[definition.id] ?? { wins: 0, unlocked: false };
      progress[definition.id] = { ...old, unlocked: true };
    }
  }
  return progress;
}

export interface RewardApplication { readonly save: LocalSaveV1; readonly reward: RewardGrant; readonly leveledUp: number; }

export function applyBattleReward(save: LocalSaveV1, outcome: BattleOutcome | BattleState): RewardApplication {
  const monsterId = monsterIdOf(outcome);
  if (resultOf(outcome) !== 'VICTORY') return { save, reward: { rewardType: 'battle', battleId: outcome.battleId, exp: 0, gold: 0 }, leveledUp: 0 };
  const claimId = `${outcome.battleId}:battle`;
  const existing = save.rewardJournal.find((entry) => entry.claimId === claimId);
  if (existing) return { save, reward: existing.reward, leveledUp: 0 };
  const definition = MONSTER_DEFINITIONS[monsterId] ?? MONSTER_DEFINITIONS['mist_blob'];
  let level = save.profile.level;
  let exp = save.profile.exp + definition.expReward;
  let points = save.profile.unspentPoints;
  let leveledUp = 0;
  while (exp >= getExpRequired(level)) {
    exp -= getExpRequired(level);
    level += 1;
    points += CHARACTER_DATA.progression.attributePointsPerLevel;
    leveledUp += 1;
  }
  const item = makeDrop(monsterId, seedOf(outcome), outcome.battleId);
  const reward: RewardGrant = { rewardType: 'battle', battleId: outcome.battleId, exp: definition.expReward, gold: definition.goldReward, ...(item ? { item } : {}) };
  const inventory = item && save.inventory.length < MAX_INVENTORY ? [...save.inventory, item] : save.inventory;
  const pendingRewards: readonly PendingReward[] = item && inventory.length === save.inventory.length
    ? [...save.pendingRewards, { claimId: `${claimId}:item`, battleId: outcome.battleId, item }]
    : save.pendingRewards;
  const journal: RewardJournalEntry = { claimId, battleId: outcome.battleId, grantedAt: Date.now(), reward };
  return {
    save: {
      ...save,
      profile: { ...save.profile, level, exp, gold: save.profile.gold + definition.goldReward, unspentPoints: points },
      inventory, pendingRewards, rewardJournal: [...save.rewardJournal, journal], monsterProgress: updateProgress(save, monsterId),
    }, reward, leveledUp,
  };
}

export function equipItem(save: LocalSaveV1, instanceId: string): LocalSaveV1 {
  const item = save.inventory.find((entry) => entry.instanceId === instanceId);
  if (!item || !ITEM_TEMPLATES[item.templateId]) return save;
  const slot = ITEM_TEMPLATES[item.templateId].slot;
  return { ...save, equipment: { ...save.equipment, [slot]: instanceId } };
}

export function unequipItem(save: LocalSaveV1, slot: keyof EquipmentSlots): LocalSaveV1 {
  const equipment = { ...save.equipment };
  delete equipment[slot];
  return { ...save, equipment };
}

export function claimPendingReward(save: LocalSaveV1, claimId: string): LocalSaveV1 {
  if (save.inventory.length >= MAX_INVENTORY) return save;
  const pending = save.pendingRewards.find((entry) => entry.claimId === claimId);
  if (!pending) return save;
  return { ...save, inventory: [...save.inventory, pending.item], pendingRewards: save.pendingRewards.filter((entry) => entry.claimId !== claimId) };
}
