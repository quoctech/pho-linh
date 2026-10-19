import Phaser from 'phaser';
import { actorAnimationKey, actorRows, ensureActorAnimation, preloadActorFrames } from '../../actor-frame-assets';

export const MIST_DUST_SFX_PATH = 'assets/monsters/mist-dust/sfx/mp3';
const action = (row: string) => actorAnimationKey('mist_blob', row);

export const MIST_DUST_SPRITE_KEYS = {
  idle: action('idle'),
  attack: action('normal_attack_a'),
  heavyAttack: action('normal_attack_b'),
  defend: action('mist_body'),
  poisonCast: action('suong_mu_xam_thuc'),
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
  frameWidth: 132,
  frameHeight: 114,
  displayWidth: 84,
  displayHeight: 84 * 114 / 132,
  originY: 1,
} as const;

export const MIST_DUST_SFX_KEYS = {
  attack: 'sfx-mist-dust-attack',
  cast: 'sfx-mist-dust-cast',
  death: 'sfx-mist-dust-death',
  dodge: 'sfx-mist-dust-dodge',
  energy: 'sfx-mist-dust-energy',
  heal: 'sfx-mist-dust-heal',
  highHp: 'sfx-mist-dust-high-hp',
  hit: 'sfx-mist-dust-hit',
  lowHp: 'sfx-mist-dust-low-hp',
  poison: 'sfx-mist-dust-poison',
  projectile: 'sfx-mist-dust-projectile',
  shield: 'sfx-mist-dust-shield',
  stun: 'sfx-mist-dust-stun',
  antiHeal: 'sfx-mist-dust-anti-heal',
} as const;

export const MIST_DUST_SFX_FILES: Readonly<Record<string, string>> = {
  [MIST_DUST_SFX_KEYS.attack]: 'mist-dust-attack.mp3',
  [MIST_DUST_SFX_KEYS.cast]: 'mist-dust-cast.mp3',
  [MIST_DUST_SFX_KEYS.death]: 'mist-dust-death.mp3',
  [MIST_DUST_SFX_KEYS.dodge]: 'mist-dust-dodge.mp3',
  [MIST_DUST_SFX_KEYS.energy]: 'mist-dust-energy.mp3',
  [MIST_DUST_SFX_KEYS.heal]: 'mist-dust-heal.mp3',
  [MIST_DUST_SFX_KEYS.highHp]: 'mist-dust-high-hp.mp3',
  [MIST_DUST_SFX_KEYS.hit]: 'mist-dust-hit.mp3',
  [MIST_DUST_SFX_KEYS.lowHp]: 'mist-dust-low-hp.mp3',
  [MIST_DUST_SFX_KEYS.poison]: 'mist-dust-poison.mp3',
  [MIST_DUST_SFX_KEYS.projectile]: 'mist-dust-projectile.mp3',
  [MIST_DUST_SFX_KEYS.shield]: 'mist-dust-shield.mp3',
  [MIST_DUST_SFX_KEYS.stun]: 'mist-dust-stun.mp3',
  [MIST_DUST_SFX_KEYS.antiHeal]: 'mist-dust-anti-heal.mp3',
};

export function preloadMistDustAssets(scene: Phaser.Scene): void {
  for (const [key, file] of Object.entries(MIST_DUST_SFX_FILES)) {
    scene.load.audio(key, `${MIST_DUST_SFX_PATH}/${file}`);
  }
}

export function preloadMistDustSprites(scene: Phaser.Scene): void {
  preloadActorFrames(scene, 'mist_blob');
}

export function ensureMistDustAnimations(scene: Phaser.Scene): void {
  const persistent = new Set(['idle', 'energy_rage', 'low_hp', 'high_hp', 'poison', 'shield']);
  for (const row of actorRows('mist_blob')) ensureActorAnimation(scene, 'mist_blob', row.id, action(row.id), persistent.has(row.id) ? -1 : 0);
}
