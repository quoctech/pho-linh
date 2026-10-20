import Phaser from 'phaser';
import { MONSTER_DATA } from '../../game-core';

/** Id VFX = `vfxId` khai báo trong monsters.json → skills. */
export type MonsterSkillEffectId =
  | 'skill_suong_mu_xam_thuc'
  | 'skill_long_mieu_lien_kich'
  | 'skill_luc_diep_doc_cham'
  | 'skill_luc_diep_an_tung'
  | 'skill_bich_van_bang_bang'
  | 'skill_van_suong_ao_ao'
  | 'skill_vu_luu_thuan';

export interface MonsterSkillEffectDefinition {
  readonly id: MonsterSkillEffectId;
  readonly textureKeys: readonly string[];
  readonly animationKey: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frameRate: number;
  readonly displayWidth: number;
  /** Thư mục chứa frame, tương đối với assets/vfx/monster-skills. */
  readonly folder: string;
}

const assetRoot = 'assets/vfx/monster-skills';
const boLaTreCaoMay = 'bo-la-tre-cao-may-v2';

const definition = (
  id: MonsterSkillEffectId,
  folder: string,
  frameWidth: number,
  frameHeight: number,
): MonsterSkillEffectDefinition => {
  const animationKey = `monster-skill-${id.replace(/_/g, '-')}`;
  return {
    id,
    folder,
    animationKey,
    textureKeys: Array.from({ length: 6 }, (_, index) => `${animationKey}-frame-${index + 1}`),
    frameWidth,
    frameHeight,
    frameRate: 12,
    displayWidth: 128,
  };
};

export const MONSTER_SKILL_EFFECTS: Readonly<Record<MonsterSkillEffectId, MonsterSkillEffectDefinition>> = {
  skill_suong_mu_xam_thuc: definition('skill_suong_mu_xam_thuc', 'mist-dust/skill-suong-mu-xam-thuc', 364, 462),
  skill_long_mieu_lien_kich: definition('skill_long_mieu_lien_kich', 'lantern-cat/skill-long-mieu-lien-kich', 435, 532),
  skill_luc_diep_doc_cham: definition('skill_luc_diep_doc_cham', `${boLaTreCaoMay}/skill_luc_diep_doc_cham/frames_webp`, 409, 505),
  skill_luc_diep_an_tung: definition('skill_luc_diep_an_tung', `${boLaTreCaoMay}/skill_luc_diep_an_tung/frames_webp`, 447, 487),
  skill_bich_van_bang_bang: definition('skill_bich_van_bang_bang', `${boLaTreCaoMay}/skill_bich_van_bang_bang/frames_webp`, 510, 507),
  skill_van_suong_ao_ao: definition('skill_van_suong_ao_ao', `${boLaTreCaoMay}/skill_van_suong_ao_ao/frames_webp`, 465, 486),
  skill_vu_luu_thuan: definition('skill_vu_luu_thuan', `${boLaTreCaoMay}/skill_vu_luu_thuan/frames_webp`, 384, 482),
};

export function isMonsterSkillEffectId(value: string): value is MonsterSkillEffectId {
  return Object.prototype.hasOwnProperty.call(MONSTER_SKILL_EFFECTS, value);
}

/** VFX của mọi skill mà quái này khai báo trong data. */
export function monsterSkillEffectsForMonster(monsterId: string): readonly MonsterSkillEffectDefinition[] {
  return (MONSTER_DATA.definitions[monsterId]?.skills ?? [])
    .map((skill) => skill.vfxId)
    .filter(isMonsterSkillEffectId)
    .map((id) => MONSTER_SKILL_EFFECTS[id]);
}

export function preloadMonsterSkillEffects(scene: Phaser.Scene, monsterId: string): void {
  for (const effect of monsterSkillEffectsForMonster(monsterId)) {
    effect.textureKeys.forEach((key, index) => {
      scene.load.image(key, `${assetRoot}/${effect.folder}/${effect.id}_${String(index + 1).padStart(2, '0')}.webp`);
    });
  }
}

export function ensureMonsterSkillEffectAnimations(scene: Phaser.Scene, monsterId: string): void {
  for (const effect of monsterSkillEffectsForMonster(monsterId)) {
    if (scene.anims.exists(effect.animationKey)) continue;
    if (!effect.textureKeys.every((key) => scene.textures.exists(key))) continue;
    scene.anims.create({
      key: effect.animationKey,
      frames: effect.textureKeys.map((key) => ({ key })),
      frameRate: effect.frameRate,
      repeat: 0,
    });
  }
}
