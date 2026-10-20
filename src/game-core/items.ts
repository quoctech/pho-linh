import { CHARACTER_DATA } from './game-data';
import type { EquipmentBonuses, EquipmentSlots, ItemInstance, ItemRarity, ItemTemplate } from './types';

const BONUS_LABELS: Readonly<Record<keyof EquipmentBonuses, string>> = {
  maxHp: 'HP', atk: 'ATK', defense: 'DEF', skillPower: 'Skill Power', agi: 'AGI',
};

/** Mô tả hiển thị theo chỉ số thật trong trận (bonus × equipmentScale của character.json). */
function describe(bonuses: EquipmentBonuses): string {
  const scale = CHARACTER_DATA.derivedStats.equipmentScale;
  return (Object.keys(BONUS_LABELS) as (keyof EquipmentBonuses)[])
    .filter((key) => bonuses[key])
    .map((key) => `+${((bonuses[key] ?? 0) * scale).toLocaleString('vi-VN')} ${BONUS_LABELS[key]}`)
    .join(', ');
}

function item(template: Omit<ItemTemplate, 'description'>): ItemTemplate {
  return { ...template, description: describe(template.bonuses) };
}

export const ITEM_TEMPLATES: Readonly<Record<string, ItemTemplate>> = {
  twig_blade: item({ id: 'twig_blade', name: 'Kiếm Cành', slot: 'weapon', rarity: 'common', price: 30, bonuses: { atk: 5 } }),
  lantern_blade: item({ id: 'lantern_blade', name: 'Kiếm Đèn', slot: 'weapon', rarity: 'rare', price: 90, bonuses: { atk: 12, skillPower: 4 } }),
  cloth_coat: item({ id: 'cloth_coat', name: 'Áo Vải', slot: 'armor', rarity: 'common', price: 30, bonuses: { maxHp: 35, defense: 2 } }),
  mist_coat: item({ id: 'mist_coat', name: 'Áo Sương', slot: 'armor', rarity: 'rare', price: 90, bonuses: { maxHp: 70, defense: 6 } }),
  leaf_charm: item({ id: 'leaf_charm', name: 'Bùa Lá', slot: 'charm', rarity: 'common', price: 30, bonuses: { agi: 2 } }),
  moon_charm: item({ id: 'moon_charm', name: 'Bùa Trăng', slot: 'charm', rarity: 'rare', price: 90, bonuses: { skillPower: 14 } }),
  swift_charm: item({ id: 'swift_charm', name: 'Bùa Nhanh', slot: 'charm', rarity: 'common', price: 30, bonuses: { agi: 4 } }),
  sturdy_charm: item({ id: 'sturdy_charm', name: 'Bùa Bền', slot: 'charm', rarity: 'rare', price: 90, bonuses: { maxHp: 50, defense: 4 } }),
};

export const INVENTORY_CAPACITY = 60;

export function createItemInstance(templateId: string, instanceId: string, obtainedAt = Date.now()): ItemInstance {
  if (!ITEM_TEMPLATES[templateId]) throw new Error(`Unknown item template: ${templateId}`);
  return { instanceId, templateId, obtainedAt };
}

export function getEquippedItemIds(equipment: EquipmentSlots): readonly string[] {
  return [equipment.weapon, equipment.armor, equipment.charm].filter((id): id is string => Boolean(id));
}

export function getItemRarity(templateId: string): ItemRarity | undefined {
  return ITEM_TEMPLATES[templateId]?.rarity;
}
