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

export const HUD_BAR_CROPS = {
  heroHp: { x: 0, y: 38, width: 520, height: 128 },
  heroEnergy: { x: 0, y: 38, width: 510, height: 128 },
  monsterHp: { x: 0, y: 18, width: 520, height: 122 },
  monsterEnergy: { x: 0, y: 18, width: 510, height: 122 },
} as const;

export const HUD_BAR_ASSET_PATHS = {
  heroHp: 'assets/hud-icons-v1/hud/hero_hp.webp',
  heroEnergy: 'assets/hud-icons-v1/hud/hero_energy.webp',
  monsterHp: 'assets/hud-icons-v1/hud/monster_hp.webp',
  monsterEnergy: 'assets/hud-icons-v1/hud/monster_energy.webp',
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
  scene.load.image(STATUS_UI_KEYS.healthBars, HUD_BAR_ASSET_PATHS.heroHp);
  scene.load.image(STATUS_UI_KEYS.energyBars, HUD_BAR_ASSET_PATHS.heroEnergy);
  scene.load.image('status-monster-health-bars', HUD_BAR_ASSET_PATHS.monsterHp);
  scene.load.image('status-monster-energy-bars', HUD_BAR_ASSET_PATHS.monsterEnergy);
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
