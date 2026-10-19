import Phaser from 'phaser';
import type { ElementId } from '../../game-core';
import { heroSkillAnimationKey } from './hero-assets';

export type ElementSkillSlot = 'basicAttack' | 'primarySkill' | 'secondarySkill';

export interface ElementSkillConfig {
  readonly element: ElementId;
  readonly atlasKey: string;
  readonly atlasImage: string;
  readonly atlasJson: string;
  readonly basicAttackFolder: string;
  readonly primarySkillFolder: string;
  readonly primarySkillLabel: string;
  readonly secondarySkillFolder: string;
  readonly secondarySkillLabel: string;
}

const ELEMENT_SKILL_DETAILS: Readonly<Record<ElementId, Omit<ElementSkillConfig, 'element' | 'atlasKey' | 'atlasImage' | 'atlasJson'>>> = {
  metal: {
    basicAttackFolder: 'basic_attack',
    primarySkillFolder: 'kim_quang_pha_giap',
    primarySkillLabel: 'Kim Quang Phá Giáp',
    secondarySkillFolder: 'van_kiem_quy_tong',
    secondarySkillLabel: 'Vạn Kiếm Quy Tông',
  },
  wood: {
    basicAttackFolder: 'basic_attack',
    primarySkillFolder: 'van_doc_phe_tam',
    primarySkillLabel: 'Vạn Độc Phệ Tâm',
    secondarySkillFolder: 'thanh_moc_hoi_xuan',
    secondarySkillLabel: 'Thanh Mộc Hồi Xuân',
  },
  water: {
    basicAttackFolder: 'basic_attack',
    primarySkillFolder: 'han_bang_phong_an',
    primarySkillLabel: 'Hàn Băng Phong Ấn',
    secondarySkillFolder: 'thuy_linh_ho_the',
    secondarySkillLabel: 'Thủy Linh Hộ Thể',
  },
  fire: {
    basicAttackFolder: 'basic_attack',
    primarySkillFolder: 'liet_diem_xuyen_tam',
    primarySkillLabel: 'Liệt Diễm Xuyên Tâm',
    secondarySkillFolder: 'phan_thien_hoa_vu',
    secondarySkillLabel: 'Phần Thiên Hỏa Vũ',
  },
  earth: {
    basicAttackFolder: 'basic_attack',
    primarySkillFolder: 'bat_dong_son_ha',
    primarySkillLabel: 'Bất Động Sơn Hà',
    secondarySkillFolder: 'dia_sat_phan_chan',
    secondarySkillLabel: 'Địa Sát Phản Chấn',
  },
};

export const ELEMENT_SKILL_CONFIG: Readonly<Record<ElementId, ElementSkillConfig>> = Object.fromEntries(
  (['metal', 'wood', 'water', 'fire', 'earth'] as const).map((element) => [
    element,
    {
      element,
      ...ELEMENT_SKILL_DETAILS[element],
      atlasKey: `pl-${element}-skills`,
      atlasImage: '',
      atlasJson: '',
    },
  ]),
) as Record<ElementId, ElementSkillConfig>;

export function elementSkillAnimationKey(element: ElementId, slot: ElementSkillSlot): string {
  return heroSkillAnimationKey(element, slot);
}

/** All five male hero skill poses now come from separated V2 frames. */
export function usesElementSkillAtlas(_element: ElementId): boolean { return false; }

export function elementSkillFrameNames(element: ElementId, slot: ElementSkillSlot): readonly string[] {
  if (!usesElementSkillAtlas(element)) return [];
  const config = ELEMENT_SKILL_CONFIG[element];
  const folder = slot === 'basicAttack'
    ? config.basicAttackFolder
    : slot === 'primarySkill'
      ? config.primarySkillFolder
      : config.secondarySkillFolder;
  return Array.from({ length: 6 }, (_, index) => `pl_${element}_${folder}_${String(index + 1).padStart(2, '0')}`);
}

export function preloadElementSkillAssets(scene: Phaser.Scene, element: ElementId): void {
  if (!usesElementSkillAtlas(element)) return;
  const config = ELEMENT_SKILL_CONFIG[element];
  scene.load.atlas(config.atlasKey, config.atlasImage, config.atlasJson);
}

export function ensureElementSkillAnimations(scene: Phaser.Scene, element: ElementId): void {
  if (!usesElementSkillAtlas(element)) return;
  const config = ELEMENT_SKILL_CONFIG[element];
  for (const slot of ['basicAttack', 'primarySkill', 'secondarySkill'] as const) {
    const key = elementSkillAnimationKey(element, slot);
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: elementSkillFrameNames(element, slot).map((frame) => ({ key: config.atlasKey, frame })),
      frameRate: 8,
      repeat: 0,
    });
  }
}
