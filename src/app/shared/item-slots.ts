import type { EquipmentSlot } from '../../game-core';

/** Nhãn và icon ô trang bị, dùng chung cho Túi đồ và Cửa hàng. */
export const SLOT_INFO: Readonly<Record<EquipmentSlot, { readonly label: string; readonly icon: string }>> = {
  weapon: { label: 'Vũ khí', icon: '⚔' },
  armor: { label: 'Giáp', icon: '◆' },
  charm: { label: 'Bùa', icon: '✦' },
};
