import Phaser from 'phaser';
import { actorAnimationKey, actorRows, ensureActorAnimation, preloadActorFrames } from '../../actor-frame-assets';

export const LANTERN_CAT_SFX_PATH = 'assets/monsters/mieu-den/sfx/mp3';
const LANTERN_SKILL_SFX_PATH = 'assets/audio/combat/lantern-cat';
const action = (row: string) => actorAnimationKey('lantern_cat', row);

export const LANTERN_CAT_SPRITE_KEYS = {
  idle: action('idle'),
  attack: action('normal_attack_a'),
  heavyAttack: action('normal_attack_b'),
  specialAttack: action('long_mieu_lien_kich'),
  defend: action('linh_dang_ho_menh'),
  poisonCast: action('fire_projectile'),
  hit: action('hit'),
  death: action('defeat'),
  highHp: action('high_hp'),
  energy: action('energy_rage'),
  lowHp: action('low_hp'),
  poisoned: action('poison'),
  shield: action('shield'),
  heal: action('heal'),
  antiHeal: action('anti_heal'),
  dodge: action('dodge'),
  stunned: action('stun'),
  skillLocked: action('skill_lock'),
  frozen: action('frozen'),
  burning: action('burning'),
  lightningStruck: action('lightning'),
  armorBreak: action('armor_break'),
  frameWidth: 170,
  frameHeight: 126,
  displayWidth: 92,
  displayHeight: 92 * 126 / 170,
  originY: 1,
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
  preloadActorFrames(scene, 'lantern_cat');
  for (const [key, file] of [[LANTERN_CAT_ATTACK_FX_KEY, 'normal-attack-fx-sheet.webp'], [LANTERN_CAT_CAST_FX_KEY, 'cast-fx-sheet.webp']] as const) {
    scene.load.spritesheet(key, `assets/monsters/mieu-den/sheets/${file}`, { frameWidth: 512, frameHeight: 512 });
  }
}

export function ensureLanternCatAnimations(scene: Phaser.Scene): void {
  const persistent = new Set(['idle', 'energy_rage', 'low_hp', 'high_hp', 'poison', 'shield']);
  for (const row of actorRows('lantern_cat')) ensureActorAnimation(scene, 'lantern_cat', row.id, action(row.id), persistent.has(row.id) ? -1 : 0);
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
