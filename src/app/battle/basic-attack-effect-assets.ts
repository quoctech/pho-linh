import Phaser from 'phaser';
import type { ElementId } from '../../game-core';

export interface BasicAttackEffectDefinition {
  readonly id: string;
  readonly element: Extract<ElementId, 'metal' | 'wood' | 'water' | 'fire' | 'earth'>;
  readonly folder: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly textureKeys: readonly string[];
  readonly animationKey: string;
  readonly frameRate: number;
  readonly displayWidth: number;
  readonly rotationDegrees?: number;
}

const ASSET_ROOT = 'assets/vfx/hero-basic-attacks/v1';
const FRAME_COUNT = 6;
const FRAME_RATE = 12;
const DISPLAY_WIDTH = 132;

function definition(
  element: BasicAttackEffectDefinition['element'],
  id: string,
  folder: string,
  frameWidth: number,
  frameHeight: number,
  rotationDegrees?: number,
): BasicAttackEffectDefinition {
  const animationKey = `hero-basic-attack-effect-${element}`;
  return {
    id,
    element,
    folder,
    frameWidth,
    frameHeight,
    textureKeys: Array.from({ length: FRAME_COUNT }, (_, index) => `${animationKey}-frame-${index + 1}`),
    animationKey,
    frameRate: FRAME_RATE,
    displayWidth: DISPLAY_WIDTH,
    rotationDegrees,
  };
}

export const BASIC_ATTACK_EFFECTS: Readonly<Record<BasicAttackEffectDefinition['element'], BasicAttackEffectDefinition>> = {
  metal: definition('metal', 'basic_attack_kim_kiem_v2', 'basic_attack_kim_kiem_v2', 395, 483),
  wood: definition('wood', 'basic_attack_moc_gay_v2', 'basic_attack_moc_gay_v2', 387, 534),
  water: definition('water', 'basic_attack_thuy_thuong_v2', 'basic_attack_thuy_thuong_v2', 368, 524, -40),
  fire: definition('fire', 'basic_attack_hoa_cung_v2', 'basic_attack_hoa_cung_v2', 515, 389),
  earth: definition('earth', 'basic_attack_tho_dao_v2', 'basic_attack_tho_dao_v2', 387, 441),
};

export function basicAttackEffectForElement(element: ElementId): BasicAttackEffectDefinition {
  return BASIC_ATTACK_EFFECTS[element];
}

export function fitBasicAttackEffectDisplaySize(
  effect: Pick<BasicAttackEffectDefinition, 'frameWidth' | 'frameHeight'>,
  displayWidth = DISPLAY_WIDTH,
): { readonly width: number; readonly height: number } {
  return {
    width: displayWidth,
    height: Math.max(1, Math.round(displayWidth * effect.frameHeight / effect.frameWidth)),
  };
}

export function preloadBasicAttackEffects(scene: Phaser.Scene, element: ElementId): void {
  const effect = basicAttackEffectForElement(element);
  effect.textureKeys.forEach((key, index) => {
    if (!scene.textures.exists(key)) {
      scene.load.image(
        key,
        `${ASSET_ROOT}/${effect.folder}/frames_webp/${effect.id}_${String(index + 1).padStart(2, '0')}.webp`,
      );
    }
  });
}

export function ensureBasicAttackEffectAnimations(scene: Phaser.Scene, element: ElementId): void {
  const effect = basicAttackEffectForElement(element);
  if (scene.anims.exists(effect.animationKey) || !effect.textureKeys.every((key) => scene.textures.exists(key))) return;
  scene.anims.create({
    key: effect.animationKey,
    frames: effect.textureKeys.map((key) => ({ key })),
    frameRate: effect.frameRate,
    repeat: 0,
  });
}
