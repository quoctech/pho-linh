import Phaser from 'phaser';
import type { ElementId } from '../../game-core';

export type HeroSkillEffectId =
  | 'skill_kim_quang_pha_giap'
  | 'skill_van_kiem_quy_tong'
  | 'skill_thanh_dang_troi_hon'
  | 'skill_van_diep_doc_chu'
  | 'skill_han_trieu_pha_khong'
  | 'skill_bang_phong_thien_ly'
  | 'skill_hoa_vu_lien_chau'
  | 'skill_phan_thien_xa_nhat'
  | 'skill_son_nhac_tran_dia'
  | 'skill_huyen_nham_ho_the';

export interface HeroSkillEffectDefinition {
  readonly id: HeroSkillEffectId;
  readonly skillId: string;
  readonly label: string;
  readonly element: Extract<ElementId, 'metal' | 'wood' | 'water' | 'fire' | 'earth'>;
  readonly folder: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly textureKeys: readonly string[];
  readonly animationKey: string;
  readonly frameRate: number;
  readonly displayWidth: number;
}

const assetRoots: Readonly<Record<HeroSkillEffectDefinition['element'], string>> = {
  metal: 'assets/vfx/hero-skills/kim-moc-v1',
  wood: 'assets/vfx/hero-skills/kim-moc-v1',
  water: 'assets/vfx/hero-skills/thuy-hoa-tho-v3',
  fire: 'assets/vfx/hero-skills/thuy-hoa-tho-v3',
  earth: 'assets/vfx/hero-skills/thuy-hoa-tho-v3',
};

const definition = (
  id: HeroSkillEffectId,
  skillId: string,
  label: string,
  element: HeroSkillEffectDefinition['element'],
  folder: string,
  frameWidth: number,
  frameHeight: number,
): HeroSkillEffectDefinition => {
  const animationKey = `hero-skill-effect-${id.replaceAll('_', '-')}`;
  return {
    id, skillId, label, element, folder, frameWidth, frameHeight,
    textureKeys: Array.from({ length: 6 }, (_, index) => `${animationKey}-frame-${index + 1}`),
    animationKey,
    frameRate: 12,
    displayWidth: 150,
  };
};

export const HERO_SKILL_EFFECTS: Readonly<Record<HeroSkillEffectId, HeroSkillEffectDefinition>> = {
  skill_kim_quang_pha_giap: definition('skill_kim_quang_pha_giap', 'kim_quang_pha_giap', 'Kim Quang Phá Giáp', 'metal', 'skill_kim_quang_pha_giap', 426, 391),
  skill_van_kiem_quy_tong: definition('skill_van_kiem_quy_tong', 'van_kiem_quy_tong', 'Vạn Kiếm Quy Tông', 'metal', 'skill_van_kiem_quy_tong', 447, 551),
  skill_thanh_dang_troi_hon: definition('skill_thanh_dang_troi_hon', 'thanh_dang_troi_hon', 'Thanh Đằng Trói Hồn', 'wood', 'skill_thanh_dang_troi_hon', 449, 546),
  skill_van_diep_doc_chu: definition('skill_van_diep_doc_chu', 'thanh_moc_hoi_xuan', 'Vạn Diệp Độc Chú', 'wood', 'skill_van_diep_doc_chu', 441, 450),
  skill_han_trieu_pha_khong: definition('skill_han_trieu_pha_khong', 'han_trieu_pha_khong', 'Hàn Triều Phá Không', 'water', 'skill_han_trieu_pha_khong', 475, 398),
  skill_bang_phong_thien_ly: definition('skill_bang_phong_thien_ly', 'bang_phong_thien_ly', 'Băng Phong Thiên Lý', 'water', 'skill_bang_phong_thien_ly', 508, 423),
  skill_hoa_vu_lien_chau: definition('skill_hoa_vu_lien_chau', 'hoa_vu_lien_chau', 'Hỏa Vũ Liên Châu', 'fire', 'skill_hoa_vu_lien_chau', 408, 377),
  skill_phan_thien_xa_nhat: definition('skill_phan_thien_xa_nhat', 'phan_thien_xa_nhat', 'Phần Thiên Xạ Nhật', 'fire', 'skill_phan_thien_xa_nhat', 452, 420),
  skill_son_nhac_tran_dia: definition('skill_son_nhac_tran_dia', 'son_nhac_tran_dia', 'Sơn Nhạc Trấn Địa', 'earth', 'skill_son_nhac_tran_dia', 433, 382),
  skill_huyen_nham_ho_the: definition('skill_huyen_nham_ho_the', 'huyen_nham_ho_the', 'Huyền Nham Hộ Thể', 'earth', 'skill_huyen_nham_ho_the', 410, 467),
};

export function heroSkillEffectForSkill(skillId: string): HeroSkillEffectDefinition | undefined {
  return Object.values(HERO_SKILL_EFFECTS).find((effect) => effect.skillId === skillId);
}

export function heroSkillEffectsForElement(element: ElementId): readonly HeroSkillEffectDefinition[] {
  return Object.values(HERO_SKILL_EFFECTS).filter((effect) => effect.element === element);
}

export function fitHeroSkillEffectDisplaySize(
  effect: Pick<HeroSkillEffectDefinition, 'frameWidth' | 'frameHeight'>,
  displayWidth = 150,
): { readonly width: number; readonly height: number } {
  return { width: displayWidth, height: Math.max(1, Math.round(displayWidth * effect.frameHeight / effect.frameWidth)) };
}

export function preloadHeroSkillEffects(scene: Phaser.Scene, element: ElementId): void {
  for (const effect of heroSkillEffectsForElement(element)) {
    effect.textureKeys.forEach((key, index) => {
      if (!scene.textures.exists(key)) {
        scene.load.image(key, `${assetRoots[effect.element]}/${effect.folder}/frames_webp/${effect.id}_${String(index + 1).padStart(2, '0')}.webp`);
      }
    });
  }
}

export function ensureHeroSkillEffectAnimations(scene: Phaser.Scene, element: ElementId): void {
  for (const effect of heroSkillEffectsForElement(element)) {
    if (scene.anims.exists(effect.animationKey) || !effect.textureKeys.every((key) => scene.textures.exists(key))) continue;
    scene.anims.create({
      key: effect.animationKey,
      frames: effect.textureKeys.map((key) => ({ key })),
      frameRate: effect.frameRate,
      repeat: 0,
    });
  }
}
