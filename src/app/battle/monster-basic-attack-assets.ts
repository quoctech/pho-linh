import Phaser from 'phaser';
import type { ActorFrameId } from './actor-frame-assets';

export type TestMonsterId = Extract<ActorFrameId, 'mist_blob' | 'lantern_cat' | 'cloud_fox_boss' | 'bamboo_mantis'>;
export interface MonsterBasicAttackDefinition {
  readonly monsterId: TestMonsterId; readonly folder: string; readonly fileStem: string;
  readonly textureKeys: readonly string[]; readonly animationKey: string;
  readonly frameWidth: number; readonly frameHeight: number; readonly frameRate: number; readonly displayWidth: number;
}

const definition = (monsterId: TestMonsterId, folder: string, fileStem: string, frameWidth: number, frameHeight: number): MonsterBasicAttackDefinition => ({
  monsterId, folder, fileStem, textureKeys: Array.from({ length: 6 }, (_, index) => `monster-basic-attack-${monsterId}-${index + 1}`),
  animationKey: `monster-basic-attack-${monsterId}`, frameWidth, frameHeight, frameRate: 12, displayWidth: 118,
});

export const MONSTER_BASIC_ATTACKS: Readonly<Record<TestMonsterId, MonsterBasicAttackDefinition>> = {
  mist_blob: definition('mist_blob', 'suong_hon', 'suong_hon', 423, 479),
  lantern_cat: definition('lantern_cat', 'mieu_den', 'mieu_den', 470, 653),
  cloud_fox_boss: definition('cloud_fox_boss', 'cao_may', 'cao_may', 433, 437),
  bamboo_mantis: definition('bamboo_mantis', 'bo_la_tre', 'bo_la_tre', 404, 480),
};

export function monsterBasicAttackForMonster(monsterId: TestMonsterId): MonsterBasicAttackDefinition { return MONSTER_BASIC_ATTACKS[monsterId]; }
export function preloadMonsterBasicAttack(scene: Phaser.Scene, monsterId: TestMonsterId): void {
  const effect = monsterBasicAttackForMonster(monsterId);
  effect.textureKeys.forEach((key, index) => {
    if (!scene.textures.exists(key)) scene.load.image(key, `assets/vfx/monster-basic-attacks-v1/${effect.folder}/${effect.fileStem}_${String(index + 1).padStart(2, '0')}.webp`);
  });
}
export function ensureMonsterBasicAttackAnimation(scene: Phaser.Scene, monsterId: TestMonsterId): void {
  const effect = monsterBasicAttackForMonster(monsterId);
  if (scene.anims.exists(effect.animationKey) || !effect.textureKeys.every((key) => scene.textures.exists(key))) return;
  scene.anims.create({ key: effect.animationKey, frames: effect.textureKeys.map((key) => ({ key })), frameRate: effect.frameRate, repeat: 0 });
}

