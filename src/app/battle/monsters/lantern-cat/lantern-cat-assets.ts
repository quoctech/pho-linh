import Phaser from 'phaser';

export const LANTERN_CAT_SHEET_PATH = 'assets/monsters/mieu-den/sheets';
export const LANTERN_CAT_SFX_PATH = 'assets/monsters/mieu-den/sfx/mp3';
const LANTERN_SKILL_SFX_PATH = 'assets/audio/combat/lantern-cat';

export const LANTERN_CAT_SPRITE_KEYS = {
  idle: 'mieu-den-high-hp',
  attack: 'mieu-den-normal-attack',
  defend: 'mieu-den-defend',
  poisonCast: 'mieu-den-cast',
  hit: 'mieu-den-hit',
  death: 'mieu-den-death',
  highHp: 'mieu-den-high-hp',
  energy: 'mieu-den-energy',
  lowHp: 'mieu-den-low-hp',
  poisoned: 'mieu-den-poison',
  shield: 'mieu-den-shield',
  heal: 'mieu-den-heal',
  antiHeal: 'mieu-den-anti-heal',
  dodge: 'mieu-den-dodge',
  stunned: 'mieu-den-stun',
  frameWidth: 512,
  frameHeight: 512,
  displayWidth: 92,
  displayHeight: 92,
  originY: 0.9,
} as const;

export const LANTERN_CAT_ATTACK_FX_KEY = 'mieu-den-normal-attack-fx';
export const LANTERN_CAT_CAST_FX_KEY = 'mieu-den-cast-fx';

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
  lanternHighHp: 'sfx-lantern-high-hp',
  lanternEnergy: 'sfx-lantern-energy',
  lanternLowHp: 'sfx-lantern-low-hp',
  lanternHeal: 'sfx-lantern-heal',
  lanternAntiHeal: 'sfx-lantern-anti-heal',
  lanternDodge: 'sfx-lantern-dodge',
  lanternStun: 'sfx-lantern-stun',
  lanternLongCharge: 'sfx-lantern-long-charge',
  lanternLongDash: 'sfx-lantern-long-dash',
  lanternLongImpact: 'sfx-lantern-long-impact',
  lanternLongStun: 'sfx-lantern-long-stun',
} as const;

export const LANTERN_SFX_FILES: Readonly<Record<string, string>> = {
  [LANTERN_SFX_KEYS.lanternAttack]: `${LANTERN_CAT_SFX_PATH}/normal-attack.mp3`,
  [LANTERN_SFX_KEYS.lanternAttackImpact]: `${LANTERN_CAT_SFX_PATH}/normal-attack-impact.mp3`,
  [LANTERN_SFX_KEYS.lanternDefend]: `${LANTERN_CAT_SFX_PATH}/shield.mp3`,
  [LANTERN_SFX_KEYS.lanternHit]: `${LANTERN_CAT_SFX_PATH}/hit.mp3`,
  [LANTERN_SFX_KEYS.lanternDeath]: `${LANTERN_CAT_SFX_PATH}/death.mp3`,
  [LANTERN_SFX_KEYS.lanternPoisonCast]: `${LANTERN_CAT_SFX_PATH}/poison.mp3`,
  [LANTERN_SFX_KEYS.lanternPoisonProjectile]: `${LANTERN_CAT_SFX_PATH}/poison-projectile.mp3`,
  [LANTERN_SFX_KEYS.lanternHighHp]: `${LANTERN_CAT_SFX_PATH}/high-hp.mp3`,
  [LANTERN_SFX_KEYS.lanternEnergy]: `${LANTERN_CAT_SFX_PATH}/energy.mp3`,
  [LANTERN_SFX_KEYS.lanternLowHp]: `${LANTERN_CAT_SFX_PATH}/low-hp.mp3`,
  [LANTERN_SFX_KEYS.lanternHeal]: `${LANTERN_CAT_SFX_PATH}/heal.mp3`,
  [LANTERN_SFX_KEYS.lanternAntiHeal]: `${LANTERN_CAT_SFX_PATH}/anti-heal.mp3`,
  [LANTERN_SFX_KEYS.lanternDodge]: `${LANTERN_CAT_SFX_PATH}/dodge.mp3`,
  [LANTERN_SFX_KEYS.lanternStun]: `${LANTERN_CAT_SFX_PATH}/stun.mp3`,
  [LANTERN_SFX_KEYS.lanternLongCharge]: `${LANTERN_SKILL_SFX_PATH}/long-mieu-lien-kich-charge.mp3`,
  [LANTERN_SFX_KEYS.lanternLongDash]: `${LANTERN_SKILL_SFX_PATH}/long-mieu-lien-kich-dash.mp3`,
  [LANTERN_SFX_KEYS.lanternLongImpact]: `${LANTERN_SKILL_SFX_PATH}/long-mieu-lien-kich-impact.mp3`,
  [LANTERN_SFX_KEYS.lanternLongStun]: `${LANTERN_SKILL_SFX_PATH}/long-mieu-lien-kich-stun.mp3`,
};

const LANTERN_CAT_SHEET_SPECS = [
  [LANTERN_CAT_SPRITE_KEYS.highHp, 'high-hp-sheet.webp'],
  [LANTERN_CAT_SPRITE_KEYS.energy, 'energy-sheet.webp'],
  [LANTERN_CAT_SPRITE_KEYS.lowHp, 'low-hp-sheet.webp'],
  [LANTERN_CAT_SPRITE_KEYS.poisoned, 'poison-sheet.webp'],
  [LANTERN_CAT_SPRITE_KEYS.shield, 'shield-sheet.webp'],
  [LANTERN_CAT_SPRITE_KEYS.heal, 'heal-sheet.webp'],
  [LANTERN_CAT_SPRITE_KEYS.antiHeal, 'anti-heal-sheet.webp'],
  [LANTERN_CAT_SPRITE_KEYS.dodge, 'dodge-sheet.webp'],
  [LANTERN_CAT_SPRITE_KEYS.stunned, 'stun-sheet.webp'],
  [LANTERN_CAT_SPRITE_KEYS.attack, 'normal-attack-sheet.webp'],
  [LANTERN_CAT_SPRITE_KEYS.poisonCast, 'cast-sheet.webp'],
  [LANTERN_CAT_SPRITE_KEYS.hit, 'hit-sheet.webp'],
  [LANTERN_CAT_SPRITE_KEYS.death, 'death-sheet.webp'],
  [LANTERN_CAT_ATTACK_FX_KEY, 'normal-attack-fx-sheet.webp'],
  [LANTERN_CAT_CAST_FX_KEY, 'cast-fx-sheet.webp'],
] as const;

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
    scene.load.audio(key, file);
  }
}

export function preloadLanternCatSprites(scene: Phaser.Scene): void {
  for (const [key, file] of LANTERN_CAT_SHEET_SPECS) {
    scene.load.spritesheet(key, `${LANTERN_CAT_SHEET_PATH}/${file}`, {
      frameWidth: LANTERN_CAT_SPRITE_KEYS.frameWidth,
      frameHeight: LANTERN_CAT_SPRITE_KEYS.frameHeight,
    });
  }
}

export function ensureLanternCatAnimations(scene: Phaser.Scene): void {
  for (const key of [
    LANTERN_CAT_SPRITE_KEYS.idle,
    LANTERN_CAT_SPRITE_KEYS.highHp,
    LANTERN_CAT_SPRITE_KEYS.energy,
    LANTERN_CAT_SPRITE_KEYS.lowHp,
    LANTERN_CAT_SPRITE_KEYS.poisoned,
    LANTERN_CAT_SPRITE_KEYS.shield,
  ] as const) {
    createAnimation(scene, key, 8, -1);
  }
  createAnimation(scene, LANTERN_CAT_SPRITE_KEYS.defend, 10, 0, LANTERN_CAT_SPRITE_KEYS.shield);
  for (const key of [
    LANTERN_CAT_SPRITE_KEYS.attack,
    LANTERN_CAT_SPRITE_KEYS.poisonCast,
    LANTERN_CAT_SPRITE_KEYS.hit,
    LANTERN_CAT_SPRITE_KEYS.death,
    LANTERN_CAT_SPRITE_KEYS.heal,
    LANTERN_CAT_SPRITE_KEYS.antiHeal,
    LANTERN_CAT_SPRITE_KEYS.dodge,
    LANTERN_CAT_SPRITE_KEYS.stunned,
  ] as const) {
    createAnimation(scene, key, key === LANTERN_CAT_SPRITE_KEYS.attack ? 14 : 10, 0);
  }
  createAnimation(scene, LANTERN_CAT_ATTACK_FX_KEY, 14, 0);
  createAnimation(scene, LANTERN_CAT_CAST_FX_KEY, 12, 0);
}

export function ensureLanternCatSkillAnimations(scene: Phaser.Scene): void {
  for (const key of [
    LANTERN_SKILL_VFX_KEYS.castCircle,
    LANTERN_SKILL_VFX_KEYS.multiStrike,
    LANTERN_SKILL_VFX_KEYS.impactStun,
  ] as const) {
    createAnimation(scene, key, 12, 0);
  }
}

function createAnimation(
  scene: Phaser.Scene,
  key: string,
  frameRate: number,
  repeat: number,
  textureKey = key,
): void {
  if (scene.anims.exists(key) || !scene.textures.exists(textureKey)) return;
  scene.anims.create({
    key,
    frames: scene.anims.generateFrameNumbers(textureKey, { start: 0, end: 7 }),
    frameRate,
    repeat,
  });
}
