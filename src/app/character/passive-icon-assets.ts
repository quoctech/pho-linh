import { CHARACTER_DATA, type ElementId } from '../../game-core';

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

const PASSIVE_ICON_FILES: Readonly<Record<ElementId, { readonly id: string; readonly file: string }>> = {
  metal: { id: 'kim_kiem_tam_bat_diet', file: 'kim_kiem_tam_bat_diet.webp' },
  wood: { id: 'moc_sinh_co_bat_tan', file: 'moc_sinh_co_bat_tan.webp' },
  water: { id: 'thuy_han_tuc_ngung_ket', file: 'thuy_han_tuc_ngung_ket.webp' },
  fire: { id: 'hoa_liet_diem_chi_tam', file: 'hoa_liet_diem_chi_tam.webp' },
  earth: { id: 'tho_bat_dong_nhu_son', file: 'tho_bat_dong_nhu_son.webp' },
};

/** Tên và mô tả nội tại nghề lấy từ character.json → elementProfiles để luôn khớp cơ chế hiện hành. */
export const PASSIVE_ICONS: Readonly<Record<ElementId, PassiveIconDefinition>> = Object.fromEntries(
  (Object.keys(PASSIVE_ICON_FILES) as ElementId[]).map((element) => {
    const passive = CHARACTER_DATA.elementProfiles[element].classPassive;
    return [element, { ...PASSIVE_ICON_FILES[element], element, label: passive.name, description: passive.description, ...PASSIVE_ICON_SIZE }];
  }),
) as Record<ElementId, PassiveIconDefinition>;

export function passiveIconForElement(element: ElementId): PassiveIconDefinition {
  return PASSIVE_ICONS[element];
}

export function passiveIconPath(element: ElementId): string {
  return `${PASSIVE_ICON_ROOT}/${passiveIconForElement(element).file}`;
}
