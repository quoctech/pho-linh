import Phaser from 'phaser';
import metalManifest from '../../assets/hero-metal/frames-manifest.json';
import woodManifest from '../../assets/hero-wood/frames-manifest.json';
import waterManifest from '../../assets/hero-water/frames-manifest.json';
import fireManifest from '../../assets/hero-fire/frames-manifest.json';
import earthManifest from '../../assets/hero-earth/frames-manifest.json';
import femaleMetalManifest from '../../assets/hero-female-elements/metal/frames-manifest.json';
import femaleWoodManifest from '../../assets/hero-female-elements/wood/frames-manifest.json';
import femaleWaterManifest from '../../assets/hero-female-elements/water/frames-manifest.json';
import femaleFireManifest from '../../assets/hero-female-elements/fire/frames-manifest.json';
import femaleEarthManifest from '../../assets/hero-female-elements/earth/frames-manifest.json';
import mistManifest from '../../assets/monsters/mist-dust/frames-manifest.json';
import lanternManifest from '../../assets/monsters/mieu-den/frames-manifest.json';
import cloudFoxManifest from '../../assets/monsters/cloud-fox/frames-manifest.json';
import bambooMantisManifest from '../../assets/monsters/bamboo-mantis/frames-manifest.json';

export type ActorFrameId =
  | 'metal' | 'wood' | 'water' | 'fire' | 'earth'
  | 'female_metal' | 'female_wood' | 'female_water' | 'female_fire' | 'female_earth'
  | 'mist_blob' | 'lantern_cat' | 'cloud_fox_boss' | 'bamboo_mantis';
export const ACTOR_FRAME_RATE = 12;

const ACTOR_ASSETS = {
  metal: { root: 'assets/hero-metal', manifest: metalManifest },
  wood: { root: 'assets/hero-wood', manifest: woodManifest },
  water: { root: 'assets/hero-water', manifest: waterManifest },
  fire: { root: 'assets/hero-fire', manifest: fireManifest },
  earth: { root: 'assets/hero-earth', manifest: earthManifest },
  female_metal: { root: 'assets/hero-female-elements/metal', manifest: femaleMetalManifest },
  female_wood: { root: 'assets/hero-female-elements/wood', manifest: femaleWoodManifest },
  female_water: { root: 'assets/hero-female-elements/water', manifest: femaleWaterManifest },
  female_fire: { root: 'assets/hero-female-elements/fire', manifest: femaleFireManifest },
  female_earth: { root: 'assets/hero-female-elements/earth', manifest: femaleEarthManifest },
  mist_blob: { root: 'assets/monsters/mist-dust', manifest: mistManifest },
  lantern_cat: { root: 'assets/monsters/mieu-den', manifest: lanternManifest },
  cloud_fox_boss: { root: 'assets/monsters/cloud-fox', manifest: cloudFoxManifest },
  bamboo_mantis: { root: 'assets/monsters/bamboo-mantis', manifest: bambooMantisManifest },
} as const;

export function femaleActorForElement(element: 'metal' | 'wood' | 'water' | 'fire' | 'earth'): ActorFrameId {
  return `female_${element}` as ActorFrameId;
}

export function actorRows(actor: ActorFrameId): readonly { readonly id: string; readonly label: string }[] {
  return ACTOR_ASSETS[actor].manifest.strips;
}

export function actorRow(actor: ActorFrameId, row: string) {
  return ACTOR_ASSETS[actor].manifest.strips.find((entry) => entry.id === row);
}

export function actorFrameKey(actor: ActorFrameId, row: string, index: number): string {
  return `actor-v2-${actor}-${row}-${index + 1}`;
}

export function actorAnimationKey(actor: ActorFrameId, row: string): string {
  return `actor-v2-${actor}-${row}`;
}

export function preloadActorFrames(scene: Phaser.Scene, actor: ActorFrameId): void {
  preloadActorRows(scene, actor, ACTOR_ASSETS[actor].manifest.strips.map((row) => row.id));
}

export function preloadActorRows(scene: Phaser.Scene, actor: ActorFrameId, rowIds: readonly string[]): void {
  const { root, manifest } = ACTOR_ASSETS[actor];
  for (const rowId of rowIds) {
    const row = manifest.strips.find((entry) => entry.id === rowId);
    row?.frames.forEach((frame, index) => {
      const key = actorFrameKey(actor, row.id, index);
      if (!scene.textures.exists(key)) scene.load.image(key, `${root}/${frame.file}`);
    });
  }
}

export function ensureActorAnimation(scene: Phaser.Scene, actor: ActorFrameId, rowId: string, key = actorAnimationKey(actor, rowId), repeat = 0): void {
  if (scene.anims.exists(key)) return;
  const row = actorRow(actor, rowId);
  if (!row) return;
  scene.anims.create({
    key,
    frames: row.frames.map((_, index) => ({ key: actorFrameKey(actor, rowId, index) })),
    frameRate: ACTOR_FRAME_RATE,
    repeat,
  });
}

/** One scale per actor, calibrated from the idle canvas and reused for every action. */
export function actorDisplaySize(actor: ActorFrameId, rowId: string, idleDisplayWidth: number): { width: number; height: number } {
  const idle = actorRow(actor, 'idle')?.equalFrameSize;
  const frame = actorRow(actor, rowId)?.equalFrameSize;
  if (!idle || !frame) return { width: idleDisplayWidth, height: idleDisplayWidth };
  const scale = idleDisplayWidth / idle.w;
  return { width: frame.w * scale, height: frame.h * scale };
}

export function normalizeActorSprite(sprite: Phaser.GameObjects.Sprite, actor: ActorFrameId, idleDisplayWidth: number): void {
  const idle = actorRow(actor, 'idle')?.equalFrameSize;
  if (!idle) return;
  const scale = idleDisplayWidth / idle.w;
  const width = sprite.frame.realWidth || sprite.frame.width;
  const height = sprite.frame.realHeight || sprite.frame.height;
  sprite.setOrigin(0.5, 1).setDisplaySize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
}
