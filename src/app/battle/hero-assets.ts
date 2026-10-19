import Phaser from 'phaser';

export type HeroGender = 'male' | 'female';
export type HeroElement = 'metal' | 'wood' | 'water' | 'fire' | 'earth';

export type HeroAnimationName =
  | 'idle' | 'energy' | 'rage' | 'high_hp' | 'low_hp' | 'poisoned' | 'shield'
  | 'damage_reduction' | 'control_immunity' | 'heal' | 'anti_heal' | 'stunned'
  | 'hit' | 'dodge' | 'death' | 'normal_attack' | 'normal_attack_fx'
  | 'attack_projectile' | 'cast' | 'cast_impact' | 'poison_cast' | 'poison_impact'
  | 'frozen' | 'burning' | 'lightning_struck' | 'skill_locked' | 'armor_break';

export type HeroSfxName =
  | 'idle' | 'energy' | 'high_hp' | 'low_hp' | 'heal' | 'anti_heal' | 'poisoned'
  | 'stunned' | 'shield' | 'hit' | 'death' | 'dodge' | 'normal_attack'
  | 'normal_attack_fx' | 'attack_impact' | 'attack_projectile' | 'cast_charge'
  | 'cast_release' | 'cast_impact';

export type HeroTransientAnimation =
  | 'attack' | 'cast' | 'hit' | 'death' | 'stunned' | 'heal' | 'antiHeal' | 'dodge' | 'poisonCast';

export interface HeroAnimationMetadata {
  readonly key: string;
  readonly textureKey: string;
  /** Kept for the legacy female sheets; Metal uses individual framePaths. */
  readonly sheet: string;
  readonly framePaths: readonly string[];
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly startFrame: number;
  readonly frameCount: number;
  readonly frameRate: number;
  readonly repeat: number;
}

export interface HeroDisplaySize { readonly width: number; readonly height: number; }

export interface HeroSpriteKeys {
  readonly idle: string; readonly attack: string; readonly attackFx: string; readonly projectile: string;
  readonly cast: string; readonly castImpact: string; readonly heal: string; readonly antiHeal: string;
  readonly hit: string; readonly death: string; readonly highHp: string; readonly energy: string;
  readonly lowHp: string; readonly poisoned: string; readonly stunned: string; readonly shield: string;
  readonly dodge: string; readonly poisonCast: string; readonly frozen: string; readonly burning: string;
  readonly lightningStruck: string; readonly skillLocked: string; readonly armorBreak: string;
  readonly frameWidth: number; readonly frameHeight: number; readonly displayWidth: number;
  readonly displayHeight: number; readonly originY: number;
}

export const HERO_ASSET_ROOT = 'assets/hero-duo-v21-edgefix';
export const HERO_METAL_ASSET_ROOT = 'assets/hero-metal';
export const HERO_ELEMENT_ASSET_ROOTS: Readonly<Record<HeroElement, string>> = {
  metal: HERO_METAL_ASSET_ROOT,
  wood: 'assets/hero-wood',
  water: 'assets/hero-water',
  fire: 'assets/hero-fire',
  earth: 'assets/hero-earth',
};
const HERO_RUNTIME_KEY_PREFIX = 'hero-duo-v21';
const HERO_METAL_RUNTIME_KEY_PREFIX = 'hero-metal';
export const HERO_ACTION_FRAME_WIDTH = 512;
export const HERO_ACTION_FRAME_HEIGHT = 512;
export const HERO_STATUS_FRAME_WIDTH = 480;
export const HERO_STATUS_FRAME_HEIGHT = 540;
export const HERO_METAL_FRAME_WIDTH = 1080;
export const HERO_METAL_FRAME_HEIGHT = 1920;
export const HERO_METAL_FRAME_COUNT = 6;
export const HERO_METAL_FRAME_RATE = 8;

// Fixed 9:16 actor box. These values must not be derived from monster assets
// or from the native dimensions of the current animation frame.
export const HERO_DISPLAY_WIDTH = 90;
export const HERO_DISPLAY_HEIGHT = 160;
export const HERO_DISPLAY_ORIGIN_Y = 1;

export const HERO_ASSETS_AVAILABLE: Readonly<Record<HeroGender, boolean>> = { male: true, female: true };
export const HERO_ELEMENTS_AVAILABLE: Readonly<Record<HeroElement, boolean>> = { metal: true, wood: true, water: true, fire: true, earth: true };

/** The 24 folders shipped by the Male Metal pack. */
export const HERO_ELEMENT_ANIMATION_NAMES = [
  'idle', 'energy', 'rage', 'low_hp', 'high_hp', 'heal', 'anti_heal', 'poisoned', 'stunned', 'shield',
  'damage_reduction', 'control_immunity', 'skill_locked', 'hit', 'dodge', 'death', 'normal_attack', 'cast',
  'poison_cast', 'poison_impact', 'frozen', 'burning', 'lightning_struck', 'armor_break',
] as const satisfies readonly HeroAnimationName[];
export const HERO_METAL_ANIMATION_NAMES = HERO_ELEMENT_ANIMATION_NAMES;

/** Runtime aliases from the battle vocabulary to the Metal pack folders. */
export const HERO_ELEMENT_RUNTIME_MAPPING: Readonly<Record<string, string>> = {
  idle: 'idle', energy: 'energy', rage: 'rage', low_hp: 'low_hp', high_hp: 'high_hp', heal: 'heal',
  anti_heal: 'heal_reduction', poisoned: 'poisoned', stunned: 'stunned', shield: 'shield',
  damage_reduction: 'damage_reduction', control_immunity: 'control_immunity', skill_locked: 'skill_locked',
  hit: 'hit', dodge: 'dodge', death: 'defeated', normal_attack: 'basic_attack', cast: 'skill_cast',
  poison_cast: 'poison_shot_cast', poison_impact: 'poison_impact', frozen: 'frozen', burning: 'burned',
  lightning_struck: 'lightning_struck', armor_break: 'armor_break',
};
export const HERO_METAL_RUNTIME_MAPPING = HERO_ELEMENT_RUNTIME_MAPPING;

export type HeroStatusAnimationName = 'idle' | 'energy' | 'low_hp' | 'high_hp' | 'heal' | 'anti_heal' | 'poisoned' | 'stunned' | 'shield';
export const HERO_STATUS_ANIMATION_NAMES: readonly HeroStatusAnimationName[] = ['idle', 'energy', 'low_hp', 'high_hp', 'heal', 'anti_heal', 'poisoned', 'stunned', 'shield'];
export const HERO_ANIMATION_NAMES: readonly HeroAnimationName[] = [...HERO_ELEMENT_ANIMATION_NAMES, 'normal_attack_fx', 'attack_projectile', 'cast_impact'];
export const HERO_MALE_ONLY_ANIMATION_NAMES: readonly HeroAnimationName[] = ['rage', 'damage_reduction', 'control_immunity', 'poison_impact', 'poison_cast', 'frozen', 'burning', 'lightning_struck', 'skill_locked', 'armor_break'];
export const HERO_LEGACY_SUPPORT_ANIMATION_NAMES: readonly HeroAnimationName[] = ['normal_attack_fx', 'attack_projectile', 'cast_impact'];
export const HERO_SFX_NAMES: readonly HeroSfxName[] = ['idle', 'energy', 'high_hp', 'low_hp', 'heal', 'anti_heal', 'poisoned', 'stunned', 'shield', 'hit', 'death', 'dodge', 'normal_attack', 'normal_attack_fx', 'attack_impact', 'attack_projectile', 'cast_charge', 'cast_release', 'cast_impact'];

type HeroAnimationConfig = Omit<HeroAnimationMetadata, 'key' | 'textureKey' | 'sheet' | 'framePaths' | 'startFrame'>;
const LEGACY_ANIMATION_METADATA: Readonly<Record<HeroAnimationName, HeroAnimationConfig>> = {
  idle: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 7, repeat: -1 }, energy: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 8, repeat: -1 }, rage: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 8, repeat: -1 }, high_hp: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 7, repeat: -1 }, low_hp: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 8, repeat: -1 }, poisoned: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 8, repeat: -1 }, shield: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 8, repeat: -1 }, damage_reduction: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 8, repeat: -1 }, control_immunity: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 8, repeat: -1 }, heal: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 9, repeat: 0 }, anti_heal: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 9, repeat: 0 }, stunned: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 7, repeat: -1 }, hit: { frameWidth: 512, frameHeight: 512, frameCount: 4, frameRate: 11, repeat: 0 }, dodge: { frameWidth: 512, frameHeight: 512, frameCount: 4, frameRate: 13, repeat: 0 }, death: { frameWidth: 512, frameHeight: 512, frameCount: 4, frameRate: 8, repeat: 0 }, normal_attack: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 13, repeat: 0 }, normal_attack_fx: { frameWidth: 512, frameHeight: 512, frameCount: 4, frameRate: 15, repeat: 0 }, attack_projectile: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 14, repeat: 0 }, cast: { frameWidth: 512, frameHeight: 512, frameCount: 12, frameRate: 12, repeat: 0 }, cast_impact: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 14, repeat: 0 }, poison_cast: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 10, repeat: 0 }, poison_impact: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 10, repeat: 0 }, frozen: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 8, repeat: 0 }, burning: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 8, repeat: 0 }, lightning_struck: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 8, repeat: 0 }, skill_locked: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 8, repeat: 0 }, armor_break: { frameWidth: 512, frameHeight: 512, frameCount: 8, frameRate: 8, repeat: 0 },
};

function keyFor(gender: HeroGender, name: HeroAnimationName): string { return `${HERO_RUNTIME_KEY_PREFIX}-${gender}-${name}`; }
function metalKey(name: string, frame: number, element: HeroElement = 'metal'): string { return `${HERO_METAL_RUNTIME_KEY_PREFIX}-${element}-${name}-${frame + 1}`; }
export function heroAnimationTextureKey(gender: HeroGender, name: HeroAnimationName, frame = 0, element: HeroElement = 'metal'): string {
  const metadata = gender === 'male' ? HERO_ELEMENT_ANIMATION_METADATA[element]?.[name] : HERO_ANIMATION_METADATA[gender]?.[name];
  if (gender === 'male') return metalKey(HERO_ELEMENT_RUNTIME_MAPPING[name] ?? name, frame, element);
  return metadata?.textureKey ?? '';
}
function metalMetadata(name: HeroAnimationName, element: HeroElement = 'metal'): HeroAnimationMetadata {
  const folder = HERO_ELEMENT_RUNTIME_MAPPING[name];
  const framePaths = folder ? Array.from({ length: HERO_METAL_FRAME_COUNT }, (_, index) => `${folder}/${folder}_${String(index + 1).padStart(2, '0')}.webp`) : [];
  return { key: `${HERO_RUNTIME_KEY_PREFIX}-${element}-${name}`, textureKey: metalKey(folder ?? name, 0, element), sheet: '', framePaths, frameWidth: HERO_METAL_FRAME_WIDTH, frameHeight: HERO_METAL_FRAME_HEIGHT, startFrame: 0, frameCount: framePaths.length, frameRate: HERO_METAL_FRAME_RATE, repeat: ['idle', 'energy', 'rage', 'low_hp', 'high_hp', 'poisoned', 'stunned', 'shield', 'damage_reduction', 'control_immunity'].includes(name) ? -1 : 0 };
}
function femaleMetadata(name: HeroAnimationName): HeroAnimationMetadata {
  const config = LEGACY_ANIMATION_METADATA[name];
  return { ...config, key: keyFor('female', name), textureKey: keyFor('female', name), sheet: `${name}-sheet.webp`, framePaths: [`female/sheets/${name}-sheet.webp`], startFrame: 0 };
}

export const HERO_ANIMATION_METADATA: Readonly<Record<HeroGender, Readonly<Record<HeroAnimationName, HeroAnimationMetadata>>>> = {
  male: Object.fromEntries(HERO_ANIMATION_NAMES.map((name) => [name, metalMetadata(name)])) as Record<HeroAnimationName, HeroAnimationMetadata>,
  female: Object.fromEntries(HERO_ANIMATION_NAMES.map((name) => [name, femaleMetadata(name)])) as Record<HeroAnimationName, HeroAnimationMetadata>,
};

export const HERO_ELEMENT_ANIMATION_METADATA: Readonly<Record<HeroElement, Readonly<Record<HeroAnimationName, HeroAnimationMetadata>>>> = Object.fromEntries(
  (['metal', 'wood', 'water', 'fire', 'earth'] as const).map((element) => [
    element,
    Object.fromEntries(HERO_ANIMATION_NAMES.map((name) => [name, metalMetadata(name, element)])),
  ]),
) as Record<HeroElement, Readonly<Record<HeroAnimationName, HeroAnimationMetadata>>>;

function createHeroSpriteKeys(gender: HeroGender, element: HeroElement = 'metal'): HeroSpriteKeys {
  const metadata = gender === 'male' ? HERO_ELEMENT_ANIMATION_METADATA[element] : HERO_ANIMATION_METADATA[gender];
  const key = (name: HeroAnimationName): string => metadata[name].key;
  return {
    idle: key('idle'), attack: key('normal_attack'), attackFx: gender === 'male' ? '' : key('normal_attack_fx'), projectile: gender === 'male' ? '' : key('attack_projectile'), cast: key('cast'), castImpact: gender === 'male' ? '' : key('cast_impact'), heal: key('heal'), antiHeal: key('anti_heal'), hit: key('hit'), death: key('death'), highHp: key('high_hp'), energy: key('energy'), lowHp: key('low_hp'), poisoned: key('poisoned'), stunned: `${HERO_RUNTIME_KEY_PREFIX}-${element}-${gender}-stunned-event`, shield: key('shield'), dodge: key('dodge'), poisonCast: key('poison_cast'), frozen: key('frozen'), burning: key('burning'), lightningStruck: key('lightning_struck'), skillLocked: key('skill_locked'), armorBreak: key('armor_break'), frameWidth: gender === 'male' ? HERO_METAL_FRAME_WIDTH : HERO_ACTION_FRAME_WIDTH, frameHeight: gender === 'male' ? HERO_METAL_FRAME_HEIGHT : HERO_ACTION_FRAME_HEIGHT, displayWidth: HERO_DISPLAY_WIDTH, displayHeight: HERO_DISPLAY_HEIGHT, originY: HERO_DISPLAY_ORIGIN_Y,
  };
}
export const HERO_SPRITE_KEYS: Readonly<Record<HeroGender, HeroSpriteKeys>> = { male: createHeroSpriteKeys('male'), female: createHeroSpriteKeys('female') };
export const HERO_ELEMENT_SPRITE_KEYS: Readonly<Record<HeroElement, HeroSpriteKeys>> = Object.fromEntries(
  (['metal', 'wood', 'water', 'fire', 'earth'] as const).map((element) => [element, createHeroSpriteKeys('male', element)]),
) as Record<HeroElement, HeroSpriteKeys>;
export function heroDisplaySize(_gender: HeroGender, _animation: HeroAnimationName): HeroDisplaySize { return { width: HERO_DISPLAY_WIDTH, height: HERO_DISPLAY_HEIGHT }; }
export function heroSfxKey(gender: HeroGender, name: HeroSfxName): string { return `hero-${gender}-${name}-sfx`; }

export function preloadHeroAssets(scene: Phaser.Scene, gender: HeroGender, element: HeroElement = 'metal'): void {
  if (!HERO_ASSETS_AVAILABLE[gender]) return;
  const animations = gender === 'male' ? HERO_ELEMENT_ANIMATION_METADATA[element] : HERO_ANIMATION_METADATA[gender];
  const loadedTextures = new Set<string>();
  for (const name of HERO_ANIMATION_NAMES) {
    const metadata = animations[name];
    if (gender === 'male') {
      metadata.framePaths.forEach((path, index) => {
        const textureKey = metalKey(HERO_ELEMENT_RUNTIME_MAPPING[name] ?? name, index, element);
        if (loadedTextures.has(textureKey)) return;
        loadedTextures.add(textureKey);
        scene.load.image(textureKey, `${HERO_ELEMENT_ASSET_ROOTS[element]}/${path}`);
      });
    } else if (metadata.sheet && !HERO_MALE_ONLY_ANIMATION_NAMES.includes(name) && !HERO_LEGACY_SUPPORT_ANIMATION_NAMES.includes(name) && !loadedTextures.has(metadata.textureKey)) {
      loadedTextures.add(metadata.textureKey);
      scene.load.spritesheet(metadata.textureKey, `${HERO_ASSET_ROOT}/${metadata.framePaths[0]}`, { frameWidth: metadata.frameWidth, frameHeight: metadata.frameHeight });
    }
  }
  // Kim has no SFX pack. Do not request legacy male SFX paths (or produce 404s).
  if (gender === 'female') {
    for (const name of HERO_SFX_NAMES) scene.load.audio(heroSfxKey(gender, name), [`${HERO_ASSET_ROOT}/${gender}/sfx/mp3/${name}.mp3`, `${HERO_ASSET_ROOT}/${gender}/sfx/ogg/${name}.ogg`]);
  }
}

export function ensureHeroAnimations(scene: Phaser.Scene, gender: HeroGender, element: HeroElement = 'metal'): void {
  if (!HERO_ASSETS_AVAILABLE[gender]) return;
  const animations = gender === 'male' ? HERO_ELEMENT_ANIMATION_METADATA[element] : HERO_ANIMATION_METADATA[gender];
  for (const name of HERO_ANIMATION_NAMES) {
    const metadata = animations[name];
    if (gender === 'male' && metadata.framePaths.length === HERO_METAL_FRAME_COUNT) {
      createAnimation(scene, metadata, metadata.framePaths.map((_, index) => metalKey(HERO_ELEMENT_RUNTIME_MAPPING[name] ?? name, index, element)));
    } else if (gender === 'female' && !HERO_MALE_ONLY_ANIMATION_NAMES.includes(name)) createAnimation(scene, metadata);
  }
  const stunned = animations.stunned;
  createAnimation(scene, { ...stunned, key: gender === 'male' ? HERO_ELEMENT_SPRITE_KEYS[element].stunned : HERO_SPRITE_KEYS[gender].stunned, repeat: 0 }, gender === 'male' ? stunned.framePaths.map((_, index) => metalKey('stunned', index, element)) : undefined);
}

function createAnimation(scene: Phaser.Scene, metadata: HeroAnimationMetadata, frameKeys?: readonly string[]): void {
  if (scene.anims.exists(metadata.key)) return;
  const frames = frameKeys ? frameKeys.map((key) => ({ key })) : scene.anims.generateFrameNumbers(metadata.textureKey, { start: metadata.startFrame, end: metadata.startFrame + metadata.frameCount - 1 });
  if (!frames.length) return;
  scene.anims.create({ key: metadata.key, frames, frameRate: metadata.frameRate, repeat: metadata.repeat });
}
