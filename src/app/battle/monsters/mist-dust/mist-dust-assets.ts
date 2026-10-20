import Phaser from 'phaser';
import { actorAnimationKey, actorRows, ensureActorAnimation, preloadActorFrames } from '../../actor-frame-assets';

const action = (row: string) => actorAnimationKey('mist_blob', row);

export const MIST_DUST_SPRITE_KEYS = {
  idle: action('idle'),
  attack: action('normal_attack_a'),
  heavyAttack: action('normal_attack_b'),
  defend: action('skill_2'),
  poisonCast: action('skill_1'),
  projectile: action('element_projectile'),
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
  frameWidth: 134,
  frameHeight: 114,
  displayWidth: 84,
  displayHeight: 84 * 114 / 134,
  originY: 1,
} as const;

/** V2 has no monster audio. Kept as a compatibility no-op for scene setup. */
export function preloadMistDustSprites(scene: Phaser.Scene): void {
  preloadActorFrames(scene, 'mist_blob');
}

export function ensureMistDustAnimations(scene: Phaser.Scene): void {
  const persistent = new Set(['idle', 'energy_rage', 'low_hp', 'high_hp', 'poison', 'shield']);
  for (const row of actorRows('mist_blob')) ensureActorAnimation(scene, 'mist_blob', row.id, action(row.id), persistent.has(row.id) ? -1 : 0);
}
