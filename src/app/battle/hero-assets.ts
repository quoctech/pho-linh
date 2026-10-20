import Phaser from 'phaser';
import {
  ACTOR_FRAME_RATE,
  actorFrameKey,
  actorRow,
  actorRows,
  ensureActorAnimation,
  femaleActorForElement,
  preloadActorFrames,
  preloadActorRows,
  type ActorFrameId,
} from './actor-frame-assets';

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
  /** Physical V2 row id when an animation is backed by separated images. */
  readonly assetId?: string;
  /** Used only by the legacy female spritesheets. */
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
export const HERO_FEMALE_ELEMENT_ASSET_ROOTS: Readonly<Record<HeroElement, string>> = {
  metal: 'assets/hero-female-elements/metal', wood: 'assets/hero-female-elements/wood',
  water: 'assets/hero-female-elements/water', fire: 'assets/hero-female-elements/fire',
  earth: 'assets/hero-female-elements/earth',
};
const HERO_RUNTIME_KEY_PREFIX = 'hero-duo-v21';
const HERO_METAL_RUNTIME_KEY_PREFIX = 'hero-metal';
export const HERO_ACTION_FRAME_WIDTH = 512;
export const HERO_ACTION_FRAME_HEIGHT = 512;
export const HERO_STATUS_FRAME_WIDTH = 480;
export const HERO_STATUS_FRAME_HEIGHT = 540;
export const HERO_METAL_FRAME_WIDTH = 186;
export const HERO_METAL_FRAME_HEIGHT = 231;
export const HERO_METAL_FRAME_COUNT = 6;
export const HERO_METAL_FRAME_RATE = ACTOR_FRAME_RATE;

// Battle sprites use one idle-calibrated scale per actor. Frame dimensions
// remain natural, so wide attacks can extend beyond the idle canvas.
export const HERO_DISPLAY_WIDTH = 90;
export const HERO_DISPLAY_HEIGHT = 160;
export const HERO_DISPLAY_ORIGIN_Y = 1;
// Fallback width for Kim when the scene has no opponent visual to match yet.
// BattleScene normally uses the current monster's display width instead.
export const HERO_METAL_DISPLAY_WIDTH = 92;

export const HERO_ASSETS_AVAILABLE: Readonly<Record<HeroGender, boolean>> = { male: true, female: true };
export const HERO_ELEMENTS_AVAILABLE: Readonly<Record<HeroElement, boolean>> = { metal: true, wood: true, water: true, fire: true, earth: true };

/** The 24 gameplay states shared by every male element runtime. */
export const HERO_ELEMENT_ANIMATION_NAMES = [
  'idle', 'energy', 'rage', 'low_hp', 'high_hp', 'heal', 'anti_heal', 'poisoned', 'stunned', 'shield',
  'damage_reduction', 'control_immunity', 'skill_locked', 'hit', 'dodge', 'death', 'normal_attack', 'cast',
  'poison_cast', 'poison_impact', 'frozen', 'burning', 'lightning_struck', 'armor_break',
] as const satisfies readonly HeroAnimationName[];
export const HERO_METAL_ANIMATION_NAMES = HERO_ELEMENT_ANIMATION_NAMES;

/** Shared V2 action rows for Mộc, Thủy, Hỏa and Thổ. */
export const HERO_ELEMENT_RUNTIME_MAPPING: Readonly<Record<string, string>> = {
  idle: 'idle', energy: 'energy_rage', rage: 'energy_rage', low_hp: 'low_hp', high_hp: 'high_hp', heal: 'heal',
  anti_heal: 'anti_heal', poisoned: 'poison', stunned: 'stun', shield: 'shield',
  damage_reduction: 'shield', control_immunity: 'shield', skill_locked: 'skill_lock',
  hit: 'hit', dodge: 'dodge', death: 'defeat', normal_attack: 'normal_attack_a', cast: 'skill_cast',
  poison_cast: 'element_projectile', poison_impact: 'element_projectile', frozen: 'frozen', burning: 'burning',
  lightning_struck: 'lightning', armor_break: 'armor_break',
};
/** Female five-element packs use the same state row vocabulary as the male V2 packs. */
export const HERO_FEMALE_ELEMENT_RUNTIME_MAPPING: Readonly<Record<string, string>> = {
  idle: 'idle', energy: 'energy_rage', rage: 'energy_rage', low_hp: 'low_hp', high_hp: 'high_hp', heal: 'heal',
  anti_heal: 'anti_heal', poisoned: 'poison', stunned: 'stun', shield: 'shield',
  damage_reduction: 'shield', control_immunity: 'shield', skill_locked: 'skill_lock',
  hit: 'hit', dodge: 'dodge', death: 'defeat', normal_attack: 'normal_attack_a', cast: 'skill_cast',
  poison_cast: 'element_projectile', poison_impact: 'element_projectile', frozen: 'frozen', burning: 'burning',
  lightning_struck: 'lightning', armor_break: 'armor_break', normal_attack_fx: 'normal_attack_b',
  attack_projectile: 'element_projectile', cast_impact: 'element_projectile',
};
/** Kim V2 retains its own names for energy, attack and named skills. */
export const HERO_METAL_RUNTIME_MAPPING: Readonly<Record<string, string>> = {
  idle: 'idle', energy: 'energy_charge', rage: 'rage_powerup', low_hp: 'low_hp', high_hp: 'high_hp',
  heal: 'heal', anti_heal: 'anti_heal', poisoned: 'poison', stunned: 'stun', shield: 'shield',
  damage_reduction: 'shield', control_immunity: 'shield', skill_locked: 'skill_lock', hit: 'hit',
  dodge: 'dodge', death: 'defeat', normal_attack: 'normal_attack', cast: 'skill_cast',
  poison_cast: 'poison_projectile', poison_impact: 'poison_projectile', frozen: 'frozen',
  burning: 'burning', lightning_struck: 'lightning', armor_break: 'armor_break',
};

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
export function heroBasicAttackRow(element: HeroElement): string {
  return element === 'metal' ? 'normal_attack' : 'normal_attack_a';
}

/** Returns the actor whose frame geometry should be used for a runtime animation. */
export function heroActorForAnimation(gender: HeroGender, element: HeroElement, animation: HeroAnimationName): ActorFrameId {
  return gender === 'male' ? element : femaleActorForElement(element);
}

export function heroAnimationTextureKey(gender: HeroGender, name: HeroAnimationName, frame = 0, element: HeroElement = 'metal'): string {
  const metadata = gender === 'male'
    ? HERO_ELEMENT_ANIMATION_METADATA[element]?.[name]
    : HERO_FEMALE_ELEMENT_ANIMATION_METADATA[element]?.[name];
  if (metadata?.assetId) {
    const actor = heroActorForAnimation(gender, element, name);
    return actorFrameKey(actor, metadata.assetId, frame);
  }
  return metadata?.textureKey ?? '';
}
function actorRowMetadata(actor: ActorFrameId, row: string, key: string, repeat = 0): HeroAnimationMetadata {
  const entry = actorRow(actor, row);
  const framePaths = entry?.frames.map((frame) => frame.file) ?? [];
  return {
    key, textureKey: row ? actorFrameKey(actor, row, 0) : '', assetId: row,
    sheet: '', framePaths,
    frameWidth: entry?.equalFrameSize.w ?? 0,
    frameHeight: entry?.equalFrameSize.h ?? 0,
    startFrame: 0,
    frameCount: framePaths.length,
    frameRate: HERO_METAL_FRAME_RATE,
    repeat,
  };
}
function maleMetadata(name: HeroAnimationName, element: HeroElement): HeroAnimationMetadata {
  const row = (element === 'metal' ? HERO_METAL_RUNTIME_MAPPING : HERO_ELEMENT_RUNTIME_MAPPING)[name];
  return actorRowMetadata(element, row, `${HERO_RUNTIME_KEY_PREFIX}-${element}-${name}`, ['idle', 'energy', 'rage', 'low_hp', 'high_hp', 'poisoned', 'stunned', 'shield', 'damage_reduction', 'control_immunity'].includes(name) ? -1 : 0);
}
function femaleElementMetadata(name: HeroAnimationName, element: HeroElement): HeroAnimationMetadata {
  const actor = femaleActorForElement(element);
  const row = HERO_FEMALE_ELEMENT_RUNTIME_MAPPING[name];
  return actorRowMetadata(actor, row, `${HERO_RUNTIME_KEY_PREFIX}-female-${element}-${name}`, ['idle', 'energy', 'rage', 'low_hp', 'high_hp', 'poisoned', 'stunned', 'shield', 'damage_reduction', 'control_immunity'].includes(name) ? -1 : 0);
}
function femaleMetadata(name: HeroAnimationName): HeroAnimationMetadata {
  const config = LEGACY_ANIMATION_METADATA[name];
  return { ...config, key: keyFor('female', name), textureKey: keyFor('female', name), sheet: `${name}-sheet.webp`, framePaths: [`female/sheets/${name}-sheet.webp`], startFrame: 0 };
}

export const HERO_ANIMATION_METADATA: Readonly<Record<HeroGender, Readonly<Record<HeroAnimationName, HeroAnimationMetadata>>>> = {
  male: Object.fromEntries(HERO_ANIMATION_NAMES.map((name) => [name, maleMetadata(name, 'metal')])) as Record<HeroAnimationName, HeroAnimationMetadata>,
  female: Object.fromEntries(HERO_ANIMATION_NAMES.map((name) => [name, femaleMetadata(name)])) as Record<HeroAnimationName, HeroAnimationMetadata>,
};

export const HERO_ELEMENT_ANIMATION_METADATA: Readonly<Record<HeroElement, Readonly<Record<HeroAnimationName, HeroAnimationMetadata>>>> = Object.fromEntries(
  (['metal', 'wood', 'water', 'fire', 'earth'] as const).map((element) => [
    element,
    Object.fromEntries(HERO_ANIMATION_NAMES.map((name) => [name, maleMetadata(name, element)])),
  ]),
) as Record<HeroElement, Readonly<Record<HeroAnimationName, HeroAnimationMetadata>>>;

export const HERO_FEMALE_ELEMENT_ANIMATION_METADATA: Readonly<Record<HeroElement, Readonly<Record<HeroAnimationName, HeroAnimationMetadata>>>> = Object.fromEntries(
  (['metal', 'wood', 'water', 'fire', 'earth'] as const).map((element) => [
    element,
    Object.fromEntries(HERO_ANIMATION_NAMES.map((name) => [name, femaleElementMetadata(name, element)])),
  ]),
) as Record<HeroElement, Readonly<Record<HeroAnimationName, HeroAnimationMetadata>>>;

export type MetalSkillAnimationSlot = 'basicAttack' | 'primarySkill' | 'secondarySkill';
export function heroSkillRow(element: HeroElement, slot: MetalSkillAnimationSlot): string {
  if (slot === 'basicAttack') return heroBasicAttackRow(element);
  if (element === 'metal') return { primarySkill: 'kim_quang_pha_giap', secondarySkill: 'van_kiem_quy_tong' }[slot];
  return { primarySkill: 'skill_1', secondarySkill: 'skill_2' }[slot];
}
export function heroSkillAnimationKey(element: HeroElement, slot: MetalSkillAnimationSlot): string { return `${HERO_RUNTIME_KEY_PREFIX}-${element}-${slot}`; }
export function metalSkillAnimationKey(slot: MetalSkillAnimationSlot): string { return heroSkillAnimationKey('metal', slot); }

export interface MetalPreviewAction {
  readonly id: string;
  readonly label: string;
}

export const METAL_PREVIEW_ACTIONS: readonly MetalPreviewAction[] = actorRows('metal');

export function metalPreviewAnimationKey(id: string): string { return `${HERO_RUNTIME_KEY_PREFIX}-metal-preview-${id}`; }
export function actorPreviewAnimationKey(actor: HeroElement, id: string): string { return `${HERO_RUNTIME_KEY_PREFIX}-${actor}-preview-${id}`; }

function createHeroSpriteKeys(gender: HeroGender, element: HeroElement = 'metal'): HeroSpriteKeys {
  const metadata = gender === 'male' ? HERO_ELEMENT_ANIMATION_METADATA[element] : HERO_FEMALE_ELEMENT_ANIMATION_METADATA[element];
  const key = (name: HeroAnimationName): string => metadata[name].key;
  return {
    idle: key('idle'), attack: gender === 'male' ? heroSkillAnimationKey(element, 'basicAttack') : key('normal_attack'), attackFx: gender === 'male' ? '' : key('normal_attack_fx'), projectile: gender === 'male' ? '' : key('attack_projectile'), cast: key('cast'), castImpact: gender === 'male' ? '' : key('cast_impact'), heal: key('heal'), antiHeal: key('anti_heal'), hit: key('hit'), death: key('death'), highHp: key('high_hp'), energy: key('energy'), lowHp: key('low_hp'), poisoned: key('poisoned'), stunned: `${HERO_RUNTIME_KEY_PREFIX}-${element}-${gender}-stunned-event`, shield: key('shield'), dodge: key('dodge'), poisonCast: key('poison_cast'), frozen: key('frozen'), burning: key('burning'), lightningStruck: key('lightning_struck'), skillLocked: key('skill_locked'), armorBreak: key('armor_break'), frameWidth: gender === 'male' ? metadata.idle.frameWidth : HERO_ACTION_FRAME_WIDTH, frameHeight: gender === 'male' ? metadata.idle.frameHeight : HERO_ACTION_FRAME_HEIGHT, displayWidth: HERO_DISPLAY_WIDTH, displayHeight: HERO_DISPLAY_HEIGHT, originY: HERO_DISPLAY_ORIGIN_Y,
  };
}
export const HERO_SPRITE_KEYS: Readonly<Record<HeroGender, HeroSpriteKeys>> = { male: createHeroSpriteKeys('male'), female: createHeroSpriteKeys('female') };
export const HERO_ELEMENT_SPRITE_KEYS: Readonly<Record<HeroElement, HeroSpriteKeys>> = Object.fromEntries(
  (['metal', 'wood', 'water', 'fire', 'earth'] as const).map((element) => [element, createHeroSpriteKeys('male', element)]),
) as Record<HeroElement, HeroSpriteKeys>;
export const HERO_FEMALE_ELEMENT_SPRITE_KEYS: Readonly<Record<HeroElement, HeroSpriteKeys>> = Object.fromEntries(
  (['metal', 'wood', 'water', 'fire', 'earth'] as const).map((element) => [element, createHeroSpriteKeys('female', element)]),
) as Record<HeroElement, HeroSpriteKeys>;
export function heroDisplaySize(gender: HeroGender, animation: HeroAnimationName, element: HeroElement = 'metal'): HeroDisplaySize {
  const metadata = gender === 'male'
    ? HERO_ELEMENT_ANIMATION_METADATA[element][animation]
    : HERO_FEMALE_ELEMENT_ANIMATION_METADATA[element][animation];
  const idleWidth = gender === 'male'
    ? HERO_ELEMENT_ANIMATION_METADATA[element].idle.frameWidth
    : HERO_FEMALE_ELEMENT_ANIMATION_METADATA[element].idle.frameWidth;
  if (!metadata.frameWidth || !metadata.frameHeight || !idleWidth) return { width: HERO_DISPLAY_WIDTH, height: HERO_DISPLAY_HEIGHT };
  const scale = HERO_METAL_DISPLAY_WIDTH / idleWidth;
  return { width: metadata.frameWidth * scale, height: metadata.frameHeight * scale };
}
export function heroSfxKey(gender: HeroGender, name: HeroSfxName): string { return `hero-${gender}-${name}-sfx`; }

export function preloadHeroAssets(scene: Phaser.Scene, gender: HeroGender, element: HeroElement = 'metal'): void {
  if (!HERO_ASSETS_AVAILABLE[gender]) return;
  const animations = gender === 'male' ? HERO_ELEMENT_ANIMATION_METADATA[element] : HERO_FEMALE_ELEMENT_ANIMATION_METADATA[element];
  if (gender === 'male') {
    preloadActorFrames(scene, element);
    return;
  }
  const femaleActor = femaleActorForElement(element);
  const femaleRows = [...new Set(HERO_ANIMATION_NAMES.map((name) => animations[name].assetId).filter((row): row is string => Boolean(row)))];
  preloadActorRows(scene, femaleActor, femaleRows);
  const maleSkillRows = ['basicAttack', 'primarySkill', 'secondarySkill']
    .map((slot) => slot === 'basicAttack' ? undefined : heroSkillRow(element, slot as MetalSkillAnimationSlot))
    .filter((row): row is string => Boolean(row));
  preloadActorRows(scene, element, maleSkillRows);
  for (const name of HERO_SFX_NAMES) scene.load.audio(heroSfxKey(gender, name), [`${HERO_ASSET_ROOT}/${gender}/sfx/mp3/${name}.mp3`, `${HERO_ASSET_ROOT}/${gender}/sfx/ogg/${name}.ogg`]);
}

export function ensureHeroAnimations(scene: Phaser.Scene, gender: HeroGender, element: HeroElement = 'metal'): void {
  if (!HERO_ASSETS_AVAILABLE[gender]) return;
  const animations = gender === 'male' ? HERO_ELEMENT_ANIMATION_METADATA[element] : HERO_FEMALE_ELEMENT_ANIMATION_METADATA[element];
  const actor = gender === 'male' ? element : femaleActorForElement(element);
  for (const name of HERO_ANIMATION_NAMES) {
    const metadata = animations[name];
    if (metadata.assetId) ensureActorAnimation(scene, actor, metadata.assetId, metadata.key, metadata.repeat);
  }
  for (const slot of ['basicAttack', 'primarySkill', 'secondarySkill'] as const) {
    const skillActor = gender === 'female' && slot === 'basicAttack' ? actor : element;
    ensureActorAnimation(scene, skillActor, gender === 'female' && slot === 'basicAttack' ? 'normal_attack_a' : heroSkillRow(element, slot), heroSkillAnimationKey(element, slot));
  }
  if (gender === 'male') {
    for (const action of actorRows(element)) {
      ensureActorAnimation(scene, element, action.id, actorPreviewAnimationKey(element, action.id), -1);
    }
  }
  const stunned = animations.stunned;
  if (stunned.assetId) ensureActorAnimation(scene, actor, stunned.assetId, gender === 'male' ? HERO_ELEMENT_SPRITE_KEYS[element].stunned : HERO_FEMALE_ELEMENT_SPRITE_KEYS[element].stunned);
}

function createAnimation(scene: Phaser.Scene, metadata: HeroAnimationMetadata, frameKeys?: readonly string[]): void {
  if (scene.anims.exists(metadata.key)) return;
  const frames = frameKeys ? frameKeys.map((key) => ({ key })) : scene.anims.generateFrameNumbers(metadata.textureKey, { start: metadata.startFrame, end: metadata.startFrame + metadata.frameCount - 1 });
  if (!frames.length) return;
  scene.anims.create({ key: metadata.key, frames, frameRate: metadata.frameRate, repeat: metadata.repeat });
}
