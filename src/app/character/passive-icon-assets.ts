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
    description: 'Tăng tỷ lệ chí mạng khi liên tục tấn công cùng một mục tiêu.',
    file: 'kim_kiem_tam_bat_diet.webp', ...PASSIVE_ICON_SIZE,
  },
  wood: {
    id: 'moc_sinh_co_bat_tan', element: 'wood', label: 'Sinh Cơ Bất Tận',
    description: 'Tăng hiệu quả hồi phục khi trên chiến trường có mục tiêu đang Dính độc.',
    file: 'moc_sinh_co_bat_tan.webp', ...PASSIVE_ICON_SIZE,
  },
  water: {
    id: 'thuy_han_tuc_ngung_ket', element: 'water', label: 'Hàn Tức Ngưng Kết',
    description: 'Tăng hiệu quả khống chế lên mục tiêu đã bị Làm chậm.',
    file: 'thuy_han_tuc_ngung_ket.webp', ...PASSIVE_ICON_SIZE,
  },
  fire: {
    id: 'hoa_liet_diem_chi_tam', element: 'fire', label: 'Liệt Diễm Chi Tâm',
    description: 'Tăng sát thương lên mục tiêu đang Thiêu đốt.',
    file: 'hoa_liet_diem_chi_tam.webp', ...PASSIVE_ICON_SIZE,
  },
  earth: {
    id: 'tho_bat_dong_nhu_son', element: 'earth', label: 'Bất Động Như Sơn',
    description: 'Tăng khả năng chống chịu khi đang có Khiên.',
    file: 'tho_bat_dong_nhu_son.webp', ...PASSIVE_ICON_SIZE,
  },
};

export function passiveIconForElement(element: ElementId): PassiveIconDefinition {
  return PASSIVE_ICONS[element];
}

export function passiveIconPath(element: ElementId): string {
  return `${PASSIVE_ICON_ROOT}/${passiveIconForElement(element).file}`;
}
