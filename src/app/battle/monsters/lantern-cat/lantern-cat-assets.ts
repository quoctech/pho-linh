import Phaser from 'phaser';
import { actorAnimationKey, actorRows, ensureActorAnimation, preloadActorFrames } from '../../actor-frame-assets';

const action = (row: string) => actorAnimationKey('lantern_cat', row);

export const LANTERN_CAT_SPRITE_KEYS = {
  idle: action('idle'),
  attack: action('normal_attack_a'),
  heavyAttack: action('normal_attack_b'),
  specialAttack: action('skill_1'),
  defend: action('skill_2'),
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
  frameWidth: 225,
  frameHeight: 129,
  displayWidth: 96,
  displayHeight: 92 * 129 / 225,
  originY: 1,
} as const;

/** V2 has no monster audio or standalone skill FX. */
export function preloadLanternCatSprites(scene: Phaser.Scene): void {
  preloadActorFrames(scene, 'lantern_cat');
}

export function ensureLanternCatAnimations(scene: Phaser.Scene): void {
  const persistent = new Set(['idle', 'energy_rage', 'low_hp', 'high_hp', 'poison', 'shield']);
  for (const row of actorRows('lantern_cat')) ensureActorAnimation(scene, 'lantern_cat', row.id, action(row.id), persistent.has(row.id) ? -1 : 0);
}
