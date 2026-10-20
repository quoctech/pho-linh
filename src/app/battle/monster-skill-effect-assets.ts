import Phaser from 'phaser';
import type { ActorFrameId } from './actor-frame-assets';

export type MonsterSkillEffectId = 'mist_suong_mu_xam_thuc' | 'lantern_long_mieu_lien_kich';

export interface MonsterSkillEffectDefinition {
  readonly id: MonsterSkillEffectId;
  readonly monsterId: Extract<ActorFrameId, 'mist_blob' | 'lantern_cat'>;
  readonly textureKeys: readonly string[];
  readonly animationKey: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frameRate: number;
  readonly displayWidth: number;
}

const assetRoot = 'assets/vfx/monster-skills';

const definition = (
  id: MonsterSkillEffectId,
  monsterId: Extract<ActorFrameId, 'mist_blob' | 'lantern_cat'>,
  folder: string,
  fileStem: string,
  frameWidth: number,
  frameHeight: number,
): MonsterSkillEffectDefinition => {
  const animationKey = monsterId === 'mist_blob'
    ? 'monster-skill-mist-suong-mu-xam-thuc'
    : 'monster-skill-lantern-long-mieu-lien-kich';
  return {
    id,
    monsterId,
    animationKey,
    textureKeys: Array.from({ length: 6 }, (_, index) => `${animationKey}-frame-${index + 1}`),
    frameWidth,
    frameHeight,
    frameRate: 12,
    displayWidth: 128,
  };
};

export const MONSTER_SKILL_EFFECTS: Readonly<Record<MonsterSkillEffectId, MonsterSkillEffectDefinition>> = {
  mist_suong_mu_xam_thuc: definition(
    'mist_suong_mu_xam_thuc',
    'mist_blob',
    'mist-dust/skill-suong-mu-xam-thuc',
    'skill_suong_mu_xam_thuc',
    364,
    462,
  ),
  lantern_long_mieu_lien_kich: definition(
    'lantern_long_mieu_lien_kich',
    'lantern_cat',
    'lantern-cat/skill-long-mieu-lien-kich',
    'skill_long_mieu_lien_kich',
    435,
    532,
  ),
};

const effectFolders: Readonly<Record<MonsterSkillEffectId, string>> = {
  mist_suong_mu_xam_thuc: 'mist-dust/skill-suong-mu-xam-thuc',
  lantern_long_mieu_lien_kich: 'lantern-cat/skill-long-mieu-lien-kich',
};
const effectFileStems: Readonly<Record<MonsterSkillEffectId, string>> = {
  mist_suong_mu_xam_thuc: 'skill_suong_mu_xam_thuc',
  lantern_long_mieu_lien_kich: 'skill_long_mieu_lien_kich',
};

export function monsterSkillEffectForMonster(monsterId: ActorFrameId): MonsterSkillEffectDefinition | undefined {
  return Object.values(MONSTER_SKILL_EFFECTS).find((effect) => effect.monsterId === monsterId);
}

export function preloadMonsterSkillEffects(
  scene: Phaser.Scene,
  monsterId: ActorFrameId,
): void {
  const effect = monsterSkillEffectForMonster(monsterId);
  if (!effect) return;
  const folder = effectFolders[effect.id];
  const fileStem = effectFileStems[effect.id];
  effect.textureKeys.forEach((key, index) => {
    scene.load.image(key, `${assetRoot}/${folder}/${fileStem}_${String(index + 1).padStart(2, '0')}.webp`);
  });
}

export function ensureMonsterSkillEffectAnimations(
  scene: Phaser.Scene,
  monsterId: ActorFrameId,
): void {
  const effect = monsterSkillEffectForMonster(monsterId);
  if (!effect || scene.anims.exists(effect.animationKey)) return;
  if (!effect.textureKeys.every((key) => scene.textures.exists(key))) return;
  scene.anims.create({
    key: effect.animationKey,
    frames: effect.textureKeys.map((key) => ({ key })),
    frameRate: effect.frameRate,
    repeat: 0,
  });
}

