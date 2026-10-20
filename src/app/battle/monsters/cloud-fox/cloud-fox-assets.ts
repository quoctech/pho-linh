import Phaser from 'phaser';
import { actorAnimationKey, actorRows, ensureActorAnimation, preloadActorFrames } from '../../actor-frame-assets';

const action = (row: string) => actorAnimationKey('cloud_fox_boss', row);

export const CLOUD_FOX_SPRITE_KEYS = {
  idle: action('idle'),
  attack: action('normal_attack_a'),
  heavyAttack: action('van_khi_ho_ly'),
  specialAttack: action('van_khi_ho_ly'),
  defend: action('ao_anh_hoan_vu'),
  poisonCast: action('element_projectile'),
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
  frameWidth: 148,
  frameHeight: 137,
  displayWidth: 96,
  displayHeight: 96 * 137 / 148,
  originY: 1,
} as const;

export function preloadCloudFoxSprites(scene: Phaser.Scene): void {
  preloadActorFrames(scene, 'cloud_fox_boss');
}

export function ensureCloudFoxAnimations(scene: Phaser.Scene): void {
  const persistent = new Set(['idle', 'energy_rage', 'low_hp', 'high_hp', 'poison', 'shield']);
  for (const row of actorRows('cloud_fox_boss')) {
    ensureActorAnimation(scene, 'cloud_fox_boss', row.id, action(row.id), persistent.has(row.id) ? -1 : 0);
  }
}
