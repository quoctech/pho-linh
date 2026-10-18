export const LANTERN_CAT_SHEET_PATH = 'assets/monsters/mieu-den/sheets';

export const LANTERN_CAT_SPRITE_KEYS = {
  idle: 'mieu-den-idle',
  attack: 'mieu-den-attack',
  defend: 'mieu-den-defend',
  poisonCast: 'mieu-den-poison-cast',
  hit: 'mieu-den-hit',
  death: 'mieu-den-death',
  frameWidth: 256,
  frameHeight: 384,
  displayWidth: 78,
  displayHeight: 117,
  originY: 0.65,
} as const;

export const LANTERN_SKILL_VFX_KEYS = {
  icon: 'skill-long-mieu-lien-kich-icon',
  stunIcon: 'skill-long-mieu-stun-icon',
  castCircle: 'fx-long-mieu-cast-circle',
  multiStrike: 'fx-long-mieu-multi-strike',
  impactStun: 'fx-long-mieu-impact-stun',
} as const;

export const LANTERN_SFX_KEYS = {
  lanternAttack: 'sfx-lantern-attack',
  lanternAttackImpact: 'sfx-lantern-attack-impact',
  lanternDefend: 'sfx-lantern-defend',
  lanternHit: 'sfx-lantern-hit',
  lanternDeath: 'sfx-lantern-death',
  lanternPoisonCast: 'sfx-lantern-poison-cast',
  lanternPoisonProjectile: 'sfx-lantern-poison-projectile',
  lanternLongCharge: 'sfx-lantern-long-charge',
  lanternLongDash: 'sfx-lantern-long-dash',
  lanternLongImpact: 'sfx-lantern-long-impact',
  lanternLongStun: 'sfx-lantern-long-stun',
} as const;

export const LANTERN_SFX_FILES: Readonly<Record<string, string>> = {
  [LANTERN_SFX_KEYS.lanternAttack]: 'lantern-cat/mieu-den-attack.mp3',
  [LANTERN_SFX_KEYS.lanternAttackImpact]: 'lantern-cat/mieu-den-attack-claw-hit.mp3',
  [LANTERN_SFX_KEYS.lanternDefend]: 'lantern-cat/mieu-den-defend.mp3',
  [LANTERN_SFX_KEYS.lanternHit]: 'lantern-cat/mieu-den-hit.mp3',
  [LANTERN_SFX_KEYS.lanternDeath]: 'lantern-cat/mieu-den-death.mp3',
  [LANTERN_SFX_KEYS.lanternPoisonCast]: 'lantern-cat/mieu-den-poison-cast.mp3',
  [LANTERN_SFX_KEYS.lanternPoisonProjectile]: 'lantern-cat/mieu-den-poison-projectile.mp3',
  [LANTERN_SFX_KEYS.lanternLongCharge]: 'lantern-cat/long-mieu-lien-kich-charge.mp3',
  [LANTERN_SFX_KEYS.lanternLongDash]: 'lantern-cat/long-mieu-lien-kich-dash.mp3',
  [LANTERN_SFX_KEYS.lanternLongImpact]: 'lantern-cat/long-mieu-lien-kich-impact.mp3',
  [LANTERN_SFX_KEYS.lanternLongStun]: 'lantern-cat/long-mieu-lien-kich-stun.mp3',
};
import Phaser from 'phaser';


export function preloadLanternCatAssets(scene: Phaser.Scene): void {
  scene.load.image(
    LANTERN_SKILL_VFX_KEYS.icon,
    'assets/skills/long-mieu-lien-kich/icon/skill-long-mieu-lien-kich-icon.webp',
  );
  scene.load.image(
    LANTERN_SKILL_VFX_KEYS.stunIcon,
    'assets/skills/long-mieu-lien-kich/icon/skill-long-mieu-stun-icon.webp',
  );
  for (const key of [
    LANTERN_SKILL_VFX_KEYS.castCircle,
    LANTERN_SKILL_VFX_KEYS.multiStrike,
    LANTERN_SKILL_VFX_KEYS.impactStun,
  ] as const) {
    scene.load.spritesheet(key, `assets/skills/long-mieu-lien-kich/fx/${key}-sheet.webp`, {
      frameWidth: 362,
      frameHeight: 543,
    });
  }
  for (const [key, file] of Object.entries(LANTERN_SFX_FILES)) {
    scene.load.audio(key, `assets/audio/combat/${file}`);
  }
}

export function preloadLanternCatSprites(scene: Phaser.Scene): void {
  for (const key of [
    LANTERN_CAT_SPRITE_KEYS.idle,
    LANTERN_CAT_SPRITE_KEYS.attack,
    LANTERN_CAT_SPRITE_KEYS.defend,
    LANTERN_CAT_SPRITE_KEYS.poisonCast,
    LANTERN_CAT_SPRITE_KEYS.hit,
    LANTERN_CAT_SPRITE_KEYS.death,
  ] as const) {
    scene.load.spritesheet(key, `${LANTERN_CAT_SHEET_PATH}/${key}-sheet.webp`, {
      frameWidth: LANTERN_CAT_SPRITE_KEYS.frameWidth,
      frameHeight: LANTERN_CAT_SPRITE_KEYS.frameHeight,
    });
  }
}

export function ensureLanternCatSkillAnimations(scene: Phaser.Scene): void {
  for (const key of [
    LANTERN_SKILL_VFX_KEYS.castCircle,
    LANTERN_SKILL_VFX_KEYS.multiStrike,
    LANTERN_SKILL_VFX_KEYS.impactStun,
  ] as const) {
    if (scene.anims.exists(key) || !scene.textures.exists(key)) continue;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(key, { start: 0, end: 7 }),
      frameRate: 12,
      repeat: 0,
    });
  }
}
