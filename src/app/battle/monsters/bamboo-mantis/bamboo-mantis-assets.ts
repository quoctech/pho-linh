import Phaser from 'phaser';
import { actorAnimationKey, actorRows, ensureActorAnimation, preloadActorFrames } from '../../actor-frame-assets';

const action = (row: string) => actorAnimationKey('bamboo_mantis', row);

export const BAMBOO_MANTIS_SPRITE_KEYS = {
  idle: action('idle'),
  attack: action('normal_attack_a'),
  // V3 has no skill or second attack strip yet. Reuse the supplied attack
  // pose until the dedicated skill assets are delivered.
  heavyAttack: action('normal_attack_a'),
  poisonCast: action('normal_attack_a'),
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
  frameWidth: 176,
  frameHeight: 140,
  displayWidth: 96,
  displayHeight: 96 * 140 / 176,
  originY: 1,
} as const;

export function preloadBambooMantisSprites(scene: Phaser.Scene): void {
  preloadActorFrames(scene, 'bamboo_mantis');
}

export function ensureBambooMantisAnimations(scene: Phaser.Scene): void {
  const persistent = new Set(['idle', 'energy_rage', 'low_hp', 'high_hp', 'poison', 'shield']);
  for (const row of actorRows('bamboo_mantis')) {
    ensureActorAnimation(scene, 'bamboo_mantis', row.id, action(row.id), persistent.has(row.id) ? -1 : 0);
  }
}
