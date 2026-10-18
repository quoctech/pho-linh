import Phaser from 'phaser';

export const STATUS_UI_FRAME_WIDTH = 443;
export const STATUS_UI_FRAME_HEIGHT = 443;
export const STATUS_UI_FRAME_RATE = 8;

export const STATUS_UI_KEYS = {
  heroShield: 'status-hero-shield',
  heroPoison: 'status-hero-poisoned',
  heroEnergy: 'status-hero-energy70plus',
  monsterShield: 'status-monster-shield',
  monsterPoison: 'status-monster-poisoned',
  monsterEnergy: 'status-monster-energy70plus',
  healthBars: 'status-ui-health-bars',
  energyBars: 'status-ui-energy-bars',
} as const;

export type StatusOverlayKey =
  | 'heroShield'
  | 'heroPoison'
  | 'heroEnergy'
  | 'monsterShield'
  | 'monsterPoison'
  | 'monsterEnergy';

const OVERLAY_ASSETS: Readonly<Record<StatusOverlayKey, string>> = {
  heroShield: 'assets/status-ui/hero/hero-shield-sheet-fullhd.webp',
  heroPoison: 'assets/status-ui/hero/hero-poisoned-sheet-fullhd.webp',
  heroEnergy: 'assets/status-ui/hero/hero-energy70plus-sheet-fullhd.webp',
  monsterShield: 'assets/status-ui/monster/monster-shield-sheet-fullhd.webp',
  monsterPoison: 'assets/status-ui/monster/monster-poisoned-sheet-fullhd.webp',
  monsterEnergy: 'assets/status-ui/monster/monster-energy70plus-sheet-fullhd.webp',
};

export function preloadStatusUiAssets(
  scene: Phaser.Scene,
  includeHeroOverlays = true,
  includeMonsterOverlays = true,
): void {
  for (const [name, path] of Object.entries(OVERLAY_ASSETS)) {
    if (!includeHeroOverlays && (name === 'heroShield' || name === 'heroPoison' || name === 'heroEnergy')) continue;
    if (!includeMonsterOverlays && (name === 'monsterShield' || name === 'monsterPoison' || name === 'monsterEnergy')) continue;
    scene.load.spritesheet(STATUS_UI_KEYS[name as StatusOverlayKey], path, {
      frameWidth: STATUS_UI_FRAME_WIDTH,
      frameHeight: STATUS_UI_FRAME_HEIGHT,
    });
  }
  scene.load.spritesheet(
    STATUS_UI_KEYS.healthBars,
    'assets/status-ui/ui/ui-health-bars-sheet-fullhd.webp',
    { frameWidth: STATUS_UI_FRAME_WIDTH, frameHeight: STATUS_UI_FRAME_HEIGHT },
  );
  scene.load.spritesheet(
    STATUS_UI_KEYS.energyBars,
    'assets/status-ui/ui/ui-energy-bars-sheet-fullhd.webp',
    { frameWidth: STATUS_UI_FRAME_WIDTH, frameHeight: STATUS_UI_FRAME_HEIGHT },
  );
}

export function ensureStatusUiAnimations(scene: Phaser.Scene): void {
  for (const key of [
    STATUS_UI_KEYS.heroShield,
    STATUS_UI_KEYS.heroPoison,
    STATUS_UI_KEYS.heroEnergy,
    STATUS_UI_KEYS.monsterShield,
    STATUS_UI_KEYS.monsterPoison,
    STATUS_UI_KEYS.monsterEnergy,
  ] as const) {
    if (scene.anims.exists(key) || !scene.textures.exists(key)) continue;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(key, { start: 0, end: 7 }),
      frameRate: STATUS_UI_FRAME_RATE,
      repeat: -1,
    });
  }
}
