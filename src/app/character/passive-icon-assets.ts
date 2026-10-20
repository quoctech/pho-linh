import type { ElementId } from '../../game-core';

export interface PassiveIconDefinition {
  readonly id: string;
  readonly element: ElementId;
  readonly label: string;
  readonly description: string;
  readonly file: string;
  readonly width: number;
  readonly height: number;
}

export const PASSIVE_ICON_ROOT = 'assets/passive-icons-v1/icons_webp';
const PASSIVE_ICON_SIZE = { width: 296, height: 352 } as const;

export const PASSIVE_ICONS: Readonly<Record<ElementId, PassiveIconDefinition>> = {
  metal: {
    id: 'kim_kiem_tam_bat_diet', element: 'metal', label: 'Kiếm Tâm Bất Diệt',
    description: 'Từ đòn thứ hai liên tiếp, có 40% chí mạng và tăng 40% sát thương.',
    file: 'kim_kiem_tam_bat_diet.webp', ...PASSIVE_ICON_SIZE,
  },
  wood: {
    id: 'moc_sinh_co_bat_tan', element: 'wood', label: 'Sinh Cơ Bất Tận',
    description: 'Tăng 40% hồi phục khi quái đang Dính độc.',
    file: 'moc_sinh_co_bat_tan.webp', ...PASSIVE_ICON_SIZE,
  },
  water: {
    id: 'thuy_han_tuc_ngung_ket', element: 'water', label: 'Hàn Tức Ngưng Kết',
    description: 'Giảm 25% sát thương từ hit thứ ba liên tiếp.',
    file: 'thuy_han_tuc_ngung_ket.webp', ...PASSIVE_ICON_SIZE,
  },
  fire: {
    id: 'hoa_liet_diem_chi_tam', element: 'fire', label: 'Liệt Diễm Chi Tâm',
    description: 'Thiêu đốt mục tiêu và cộng 20 sát thương khi mục tiêu đang cháy.',
    file: 'hoa_liet_diem_chi_tam.webp', ...PASSIVE_ICON_SIZE,
  },
  earth: {
    id: 'tho_bat_dong_nhu_son', element: 'earth', label: 'Bất Động Như Sơn',
    description: 'Giảm 10% sát thương khi đang có Khiên.',
    file: 'tho_bat_dong_nhu_son.webp', ...PASSIVE_ICON_SIZE,
  },
};

export function passiveIconForElement(element: ElementId): PassiveIconDefinition {
  return PASSIVE_ICONS[element];
}

export function passiveIconPath(element: ElementId): string {
  return `${PASSIVE_ICON_ROOT}/${passiveIconForElement(element).file}`;
}
