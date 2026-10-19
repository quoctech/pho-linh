import Phaser from 'phaser';

export type HeroGender = 'male' | 'female';

export type HeroAnimationName =
  | 'idle'
  | 'energy'
  | 'high_hp'
  | 'low_hp'
  | 'poisoned'
  | 'shield'
  | 'heal'
  | 'anti_heal'
  | 'stunned'
  | 'hit'
  | 'dodge'
  | 'death'
  | 'normal_attack'
  | 'normal_attack_fx'
  | 'attack_projectile'
  | 'cast'
  | 'cast_impact'
  | 'poison_cast'
  | 'frozen'
  | 'burning'
  | 'lightning_struck'
  | 'skill_locked'
  | 'armor_break';

export type HeroSfxName =
  | 'idle'
  | 'energy'
  | 'high_hp'
  | 'low_hp'
  | 'heal'
  | 'anti_heal'
  | 'poisoned'
  | 'stunned'
  | 'shield'
  | 'hit'
  | 'death'
  | 'dodge'
  | 'normal_attack'
  | 'normal_attack_fx'
  | 'attack_impact'
  | 'attack_projectile'
  | 'cast_charge'
  | 'cast_release'
  | 'cast_impact';

export type HeroTransientAnimation =
  | 'attack'
  | 'cast'
  | 'hit'
  | 'death'
  | 'stunned'
  | 'heal'
  | 'antiHeal'
  | 'dodge'
  | 'poisonCast';

export interface HeroAnimationMetadata {
  readonly key: string;
  readonly textureKey: string;
  readonly sheet: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly startFrame: number;
  readonly frameCount: number;
  readonly frameRate: number;
  readonly repeat: number;
}

export interface HeroDisplaySize {
  readonly width: number;
  readonly height: number;
}

export interface HeroSpriteKeys {
  readonly idle: string;
  readonly attack: string;
  readonly attackFx: string;
  readonly projectile: string;
  readonly cast: string;
  readonly castImpact: string;
  readonly heal: string;
  readonly antiHeal: string;
  readonly hit: string;
  readonly death: string;
  readonly highHp: string;
  readonly energy: string;
  readonly lowHp: string;
  readonly poisoned: string;
  readonly stunned: string;
  readonly shield: string;
  readonly dodge: string;
  readonly poisonCast: string;
  readonly frozen: string;
  readonly burning: string;
  readonly lightningStruck: string;
  readonly skillLocked: string;
  readonly armorBreak: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly displayWidth: number;
  readonly displayHeight: number;
  readonly originY: number;
}

export const HERO_ASSET_ROOT = 'assets/hero-duo-v21-edgefix';
const HERO_RUNTIME_KEY_PREFIX = 'hero-duo-v21';
export const HERO_ACTION_FRAME_WIDTH = 512;
export const HERO_ACTION_FRAME_HEIGHT = 512;
export const HERO_STATUS_FRAME_WIDTH = 480;
export const HERO_STATUS_FRAME_HEIGHT = 540;
export const HERO_FRAME_WIDTH = HERO_ACTION_FRAME_WIDTH;
export const HERO_FRAME_HEIGHT = HERO_ACTION_FRAME_HEIGHT;
export const HERO_DISPLAY_WIDTH = 84;
// Match the default monster presentation box. This is intentionally fixed
// for every hero animation so the new status/combat sheets cannot make the
// character appear taller on scene entry or during an effect.
export const HERO_DISPLAY_HEIGHT = 84;

// The previous male asset pack has been removed. Keep the runtime contract
// ready for the incoming 2.5D pack, but do not request missing files.
export const HERO_ASSETS_AVAILABLE: Readonly<Record<HeroGender, boolean>> = {
  male: false,
  female: true,
};

export type HeroStatusAnimationName =
  | 'idle'
  | 'energy'
  | 'low_hp'
  | 'high_hp'
  | 'heal'
  | 'anti_heal'
  | 'poisoned'
  | 'stunned'
  | 'shield';

export const HERO_STATUS_ANIMATION_NAMES: readonly HeroStatusAnimationName[] = [
  'idle',
  'energy',
  'low_hp',
  'high_hp',
  'heal',
  'anti_heal',
  'poisoned',
  'stunned',
  'shield',
];

export const HERO_ANIMATION_NAMES: readonly HeroAnimationName[] = [
  'idle',
  'energy',
  'high_hp',
  'low_hp',
  'poisoned',
  'shield',
  'heal',
  'anti_heal',
  'stunned',
  'hit',
  'dodge',
  'death',
  'normal_attack',
  'normal_attack_fx',
  'attack_projectile',
  'cast',
  'cast_impact',
  'poison_cast',
  'frozen',
  'burning',
  'lightning_struck',
  'skill_locked',
  'armor_break',
];

export const HERO_MALE_ONLY_ANIMATION_NAMES: readonly HeroAnimationName[] = [
  'poison_cast',
  'frozen',
  'burning',
  'lightning_struck',
  'skill_locked',
  'armor_break',
];

// These support effects belonged to the removed male legacy sheet pack. The
// new combat pack does not ship replacements, so the battle scene falls back
// to its generated projectile/impact visuals without requesting old files.
export const HERO_LEGACY_SUPPORT_ANIMATION_NAMES: readonly HeroAnimationName[] = [
  'normal_attack_fx',
  'attack_projectile',
  'cast_impact',
];

export const HERO_SFX_NAMES: readonly HeroSfxName[] = [
  'idle',
  'energy',
  'high_hp',
  'low_hp',
  'heal',
  'anti_heal',
  'poisoned',
  'stunned',
  'shield',
  'hit',
  'death',
  'dodge',
  'normal_attack',
  'normal_attack_fx',
  'attack_impact',
  'attack_projectile',
  'cast_charge',
  'cast_release',
  'cast_impact',
];

type HeroAnimationConfig = Omit<HeroAnimationMetadata, 'key' | 'textureKey' | 'sheet' | 'startFrame'>;

const LEGACY_ANIMATION_METADATA: Readonly<Record<HeroAnimationName, HeroAnimationConfig>> = {
  idle: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 7, repeat: -1 },
  energy: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 8, repeat: -1 },
  high_hp: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 7, repeat: -1 },
  low_hp: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 8, repeat: -1 },
  poisoned: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 8, repeat: -1 },
  shield: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 8, repeat: -1 },
  heal: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 9, repeat: 0 },
  anti_heal: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 9, repeat: 0 },
  stunned: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 7, repeat: -1 },
  hit: { frameWidth: 512, frameHeight: 512, frameCount: 4, frameRate: 11, repeat: 0 },
  dodge: { frameWidth: 512, frameHeight: 512, frameCount: 4, frameRate: 13, repeat: 0 },
  death: { frameWidth: 512, frameHeight: 512, frameCount: 4, frameRate: 8, repeat: 0 },
  normal_attack: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 13, repeat: 0 },
  normal_attack_fx: { frameWidth: 512, frameHeight: 512, frameCount: 4, frameRate: 15, repeat: 0 },
  attack_projectile: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 14, repeat: 0 },
  cast: { frameWidth: 512, frameHeight: 512, frameCount: 12, frameRate: 12, repeat: 0 },
  cast_impact: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 14, repeat: 0 },
  poison_cast: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 10, repeat: 0 },
  frozen: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 8, repeat: 0 },
  burning: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 8, repeat: 0 },
  lightning_struck: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 8, repeat: 0 },
  skill_locked: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 8, repeat: 0 },
  armor_break: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 8, repeat: 0 },
};

function createHeroAnimationMetadata(gender: HeroGender): Readonly<Record<HeroAnimationName, HeroAnimationMetadata>> {
  return Object.fromEntries(
    HERO_ANIMATION_NAMES.map((name) => [
      name,
      (() => {
        const config = LEGACY_ANIMATION_METADATA[name];
        return {
          ...config,
          key: `${HERO_RUNTIME_KEY_PREFIX}-${gender}-${name}`,
          textureKey: `${HERO_RUNTIME_KEY_PREFIX}-${gender}-${name}`,
          startFrame: 0,
          sheet: HERO_ASSETS_AVAILABLE[gender] ? `${gender}/sheets/${name}-sheet.webp` : '',
        };
      })(),
    ]),
  ) as Record<HeroAnimationName, HeroAnimationMetadata>;
}

export const HERO_ANIMATION_METADATA: Readonly<Record<HeroGender, Readonly<Record<HeroAnimationName, HeroAnimationMetadata>>>> = {
  male: createHeroAnimationMetadata('male'),
  female: createHeroAnimationMetadata('female'),
};

function createHeroSpriteKeys(gender: HeroGender): HeroSpriteKeys {
  const key = (name: HeroAnimationName): string => HERO_ANIMATION_METADATA[gender][name].key;
  return {
    idle: key('idle'),
    attack: key('normal_attack'),
    attackFx: key('normal_attack_fx'),
    projectile: key('attack_projectile'),
    cast: key('cast'),
    castImpact: key('cast_impact'),
    heal: key('heal'),
    antiHeal: key('anti_heal'),
    hit: key('hit'),
    death: key('death'),
    highHp: key('high_hp'),
    energy: key('energy'),
    lowHp: key('low_hp'),
    poisoned: key('poisoned'),
    // The pack's stunned clip is a persistent loop. Battle events use the
    // one-shot alias below so a skipped turn never leaves the hero locked.
    stunned: `${HERO_RUNTIME_KEY_PREFIX}-${gender}-stunned-event`,
    shield: key('shield'),
    dodge: key('dodge'),
    poisonCast: key('poison_cast'),
    frozen: key('frozen'),
    burning: key('burning'),
    lightningStruck: key('lightning_struck'),
    skillLocked: key('skill_locked'),
    armorBreak: key('armor_break'),
    frameWidth: HERO_ACTION_FRAME_WIDTH,
    frameHeight: HERO_ACTION_FRAME_HEIGHT,
    displayWidth: 84,
    displayHeight: 84,
    originY: 0.92,
  };
}

export const HERO_SPRITE_KEYS: Readonly<Record<HeroGender, HeroSpriteKeys>> = {
  male: createHeroSpriteKeys('male'),
  female: createHeroSpriteKeys('female'),
};

export function heroDisplaySize(
  _gender: HeroGender,
  _animation: HeroAnimationName,
): HeroDisplaySize {
  return {
    // Every hero animation uses the same hard display box. Animation sheets
    // may contain different transparent padding, but the actor transform must
    // never resize when a status or combat effect starts/ends.
    width: HERO_DISPLAY_WIDTH,
    height: HERO_DISPLAY_HEIGHT,
  };
}

export function heroSfxKey(gender: HeroGender, name: HeroSfxName): string {
  return `hero-${gender}-${name}-sfx`;
}

export function preloadHeroAssets(scene: Phaser.Scene, gender: HeroGender): void {
  if (!HERO_ASSETS_AVAILABLE[gender]) return;
  const animations = HERO_ANIMATION_METADATA[gender];
  const loadedTextures = new Set<string>();
  for (const name of animationNamesForGender(gender)) {
    const metadata = animations[name];
    if (loadedTextures.has(metadata.textureKey)) continue;
    loadedTextures.add(metadata.textureKey);
    scene.load.spritesheet(metadata.textureKey, `${HERO_ASSET_ROOT}/${metadata.sheet}`, {
      frameWidth: metadata.frameWidth,
      frameHeight: metadata.frameHeight,
    });
  }

  for (const name of HERO_SFX_NAMES) {
    const mp3 = `${HERO_ASSET_ROOT}/${gender}/sfx/mp3/${name}.mp3`;
    const ogg = `${HERO_ASSET_ROOT}/${gender}/sfx/ogg/${name}.ogg`;
    scene.load.audio(heroSfxKey(gender, name), [mp3, ogg]);
  }
}

export function ensureHeroAnimations(scene: Phaser.Scene, gender: HeroGender): void {
  if (!HERO_ASSETS_AVAILABLE[gender]) return;
  const animations = HERO_ANIMATION_METADATA[gender];
  for (const name of animationNamesForGender(gender)) {
    const metadata = animations[name];
    createAnimation(scene, metadata);
  }

  const stunned = animations.stunned;
  createAnimation(scene, { ...stunned, key: HERO_SPRITE_KEYS[gender].stunned, repeat: 0 });
}

function animationNamesForGender(gender: HeroGender): readonly HeroAnimationName[] {
  return HERO_ANIMATION_NAMES.filter((name) => (
    !HERO_LEGACY_SUPPORT_ANIMATION_NAMES.includes(name)
    && (gender === 'male' || !HERO_MALE_ONLY_ANIMATION_NAMES.includes(name))
  ));
}

function createAnimation(
  scene: Phaser.Scene,
  metadata: HeroAnimationMetadata,
): void {
  if (scene.anims.exists(metadata.key) || !scene.textures.exists(metadata.textureKey)) return;
  scene.anims.create({
    key: metadata.key,
    frames: scene.anims.generateFrameNumbers(metadata.textureKey, {
      start: metadata.startFrame,
      end: metadata.startFrame + metadata.frameCount - 1,
    }),
    frameRate: metadata.frameRate,
    repeat: metadata.repeat,
  });
}
