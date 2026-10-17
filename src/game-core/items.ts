import type { EquipmentSlots, ItemInstance, ItemRarity, ItemTemplate } from './types';

export const ITEM_TEMPLATES: Readonly<Record<string, ItemTemplate>> = {
  twig_blade: { id: 'twig_blade', name: 'Kiếm Cành', slot: 'weapon', rarity: 'common', price: 30, bonuses: { atk: 5 }, description: '+5 ATK' },
  lantern_blade: { id: 'lantern_blade', name: 'Kiếm Đèn', slot: 'weapon', rarity: 'rare', price: 90, bonuses: { atk: 12, skillPower: 4 }, description: '+12 ATK, +4 Skill Power' },
  cloth_coat: { id: 'cloth_coat', name: 'Áo Vải', slot: 'armor', rarity: 'common', price: 30, bonuses: { maxHp: 35, defense: 2 }, description: '+35 HP, +2 DEF' },
  mist_coat: { id: 'mist_coat', name: 'Áo Sương', slot: 'armor', rarity: 'rare', price: 90, bonuses: { maxHp: 70, defense: 6 }, description: '+70 HP, +6 DEF' },
  leaf_charm: { id: 'leaf_charm', name: 'Bùa Lá', slot: 'charm', rarity: 'common', price: 30, bonuses: { agiBonus: 0.02 }, description: '+2% AGI' },
  moon_charm: { id: 'moon_charm', name: 'Bùa Trăng', slot: 'charm', rarity: 'rare', price: 90, bonuses: { skillPower: 14 }, description: '+14 Skill Power' },
  swift_charm: { id: 'swift_charm', name: 'Bùa Nhanh', slot: 'charm', rarity: 'common', price: 30, bonuses: { agiBonus: 0.04 }, description: '+4% AGI' },
  sturdy_charm: { id: 'sturdy_charm', name: 'Bùa Bền', slot: 'charm', rarity: 'rare', price: 90, bonuses: { maxHp: 50, defense: 4 }, description: '+50 HP, +4 DEF' },
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
