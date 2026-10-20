import Phaser from 'phaser';
import { CHARACTER_DATA, type ElementId } from '../../game-core';
import { heroSkillAnimationKey } from './hero-assets';

export type ElementSkillSlot = 'basicAttack' | 'primarySkill' | 'secondarySkill';
export type ElementActiveSkillSlot = 'primarySkill' | 'secondarySkill';
export interface ElementSkillVisualState { readonly active: boolean; readonly locked: boolean; readonly animate: boolean; }
export interface SkillIconDisplaySize { readonly width: number; readonly height: number; }

export function fitSkillIconDisplaySize(sourceWidth: number, sourceHeight: number, maxWidth = 48, maxHeight = 48): SkillIconDisplaySize {
  if (![sourceWidth, sourceHeight, maxWidth, maxHeight].every((value) => Number.isFinite(value) && value > 0)) return { width: maxWidth, height: maxHeight };
  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
  return { width: Math.max(1, Math.round(sourceWidth * scale)), height: Math.max(1, Math.round(sourceHeight * scale)) };
}
export function getElementSkillVisualState(slot: ElementActiveSkillSlot, canAct: boolean, energy: number, energyCost: number): ElementSkillVisualState {
  const active = canAct && Number.isFinite(energy) && energy >= energyCost;
  return { active, locked: !active, animate: false };
}

export interface ElementSkillConfig {
  readonly element: ElementId; readonly basicAttackFolder: string;
  readonly primarySkillId: string; readonly primarySkillFolder: string; readonly primarySkillLabel: string; readonly primarySkillIcon: string;
  readonly secondarySkillId: string; readonly secondarySkillFolder: string; readonly secondarySkillLabel: string; readonly secondarySkillIcon: string;
}
export const ELEMENT_SKILL_CONFIG: Readonly<Record<ElementId, ElementSkillConfig>> = Object.fromEntries(
  (['metal', 'wood', 'water', 'fire', 'earth'] as const).map((element) => [element, { element, ...CHARACTER_DATA.elementSkills[element] }]),
) as unknown as Record<ElementId, ElementSkillConfig>;

const ICON_ROOT = 'assets/hud-icons-v2/skill-icons/icons_webp';
const ICON_FILES: Readonly<Record<string, string>> = {
  kim_van_kiem_quy_tong: '01_kim_van_kiem_quy_tong.webp', kim_kim_quang_pha_giap: '02_kim_kim_quang_pha_giap.webp', kim_cuu_thien_loi_kiem: '03_kim_cuu_thien_loi_kiem.webp',
  moc_thanh_dang_troi_hon: '04_moc_thanh_dang_troi_hon.webp', moc_van_diep_doc_chu: '05_moc_van_diep_doc_chu.webp',
  thuy_han_trieu_pha_khong: '06_thuy_han_trieu_pha_khong.webp', thuy_bang_phong_thien_ly: '07_thuy_bang_phong_thien_ly.webp',
  hoa_hoa_vu_lien_chau: '08_hoa_hoa_vu_lien_chau.webp', hoa_phan_thien_xa_nhat: '09_hoa_phan_thien_xa_nhat.webp',
  tho_son_nhac_tran_dia: '10_tho_son_nhac_tran_dia.webp', tho_huyen_nham_ho_the: '11_tho_huyen_nham_ho_the.webp',
};
export function skillIconKey(iconId: string): string { return `skill-icon-${iconId}`; }
export function skillIconPath(iconId: string): string | undefined { const file = ICON_FILES[iconId]; return file ? `${ICON_ROOT}/${file}` : undefined; }
export function elementSkillIconIds(element: ElementId, slot: ElementActiveSkillSlot): readonly string[] {
  const config = ELEMENT_SKILL_CONFIG[element]; return [slot === 'primarySkill' ? config.primarySkillIcon : config.secondarySkillIcon];
}
export function elementSkillIconFrameKeys(element: ElementId, slot: ElementActiveSkillSlot = 'primarySkill'): readonly string[] { return elementSkillIconIds(element, slot).map(skillIconKey); }
export function elementSkillIconFramePaths(element: ElementId, slot: ElementActiveSkillSlot = 'primarySkill'): readonly string[] { return elementSkillIconIds(element, slot).map((iconId) => skillIconPath(iconId) ?? ''); }
export function elementSkillIconAnimationKey(element: ElementId, slot: ElementActiveSkillSlot = 'primarySkill'): string { return skillIconKey(elementSkillIconIds(element, slot)[0]); }
export function preloadElementSkillIcons(scene: Phaser.Scene, element: ElementId): void {
  for (const slot of ['primarySkill', 'secondarySkill'] as const) {
    const iconId = elementSkillIconIds(element, slot)[0]; const path = skillIconPath(iconId);
    if (path && !scene.textures.exists(skillIconKey(iconId))) scene.load.image(skillIconKey(iconId), path);
  }
}
export function ensureElementSkillIconAnimation(_scene: Phaser.Scene, _element: ElementId, _slot: ElementActiveSkillSlot = 'primarySkill'): void { /* Static WebP icon. */ }
export function elementSkillAnimationKey(element: ElementId, slot: ElementSkillSlot): string { return heroSkillAnimationKey(element, slot); }
export function usesElementSkillAtlas(_element: ElementId): boolean { return false; }
export function elementSkillFrameNames(_element: ElementId, _slot: ElementSkillSlot): readonly string[] { return []; }
export function preloadElementSkillAssets(scene: Phaser.Scene, element: ElementId): void { preloadElementSkillIcons(scene, element); }
export function ensureElementSkillAnimations(_scene: Phaser.Scene, _element: ElementId): void { /* Static WebP icons. */ }
