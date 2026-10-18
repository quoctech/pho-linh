import Phaser from 'phaser';

export const MIST_DUST_SHEET_PATH = 'assets/monsters/mist-dust/sheets';
export const MIST_DUST_SFX_PATH = 'assets/monsters/mist-dust/sfx/mp3';

export const MIST_DUST_SPRITE_KEYS = {
  idle: 'mist-dust-high-hp',
  attack: 'mist-dust-normal-attack',
  defend: 'mist-dust-shield',
  poisonCast: 'mist-dust-cast',
  hit: 'mist-dust-hit',
  death: 'mist-dust-death',
  highHp: 'mist-dust-high-hp',
  energy: 'mist-dust-energy',
  lowHp: 'mist-dust-low-hp',
  poisoned: 'mist-dust-poison',
  shield: 'mist-dust-shield',
  heal: 'mist-dust-heal',
  antiHeal: 'mist-dust-anti-heal',
  dodge: 'mist-dust-dodge',
  stunned: 'mist-dust-stun',
  frameWidth: 330,
  frameHeight: 329,
  displayWidth: 84,
  displayHeight: 84,
  originY: 0.88,
} as const;

const MIST_DUST_SHEET_SPECS = [
  ['mist-dust-high-hp', 'mist-dust-high-hp-sheet.webp', 330, 312],
  ['mist-dust-normal-attack', 'mist-dust-normal-attack-sheet.webp', 330, 329],
  ['mist-dust-cast', 'mist-dust-cast-sheet.webp', 329, 329],
  ['mist-dust-death', 'mist-dust-death-sheet.webp', 459, 445],
  ['mist-dust-dodge', 'mist-dust-dodge-sheet.webp', 330, 329],
  ['mist-dust-energy', 'mist-dust-energy-sheet.webp', 449, 459],
  ['mist-dust-heal', 'mist-dust-heal-sheet.webp', 330, 329],
  ['mist-dust-hit', 'mist-dust-hit-sheet.webp', 329, 329],
  ['mist-dust-low-hp', 'mist-dust-low-hp-sheet.webp', 330, 314],
  ['mist-dust-anti-heal', 'mist-dust-anti-heal-sheet.webp', 330, 330],
  ['mist-dust-poison', 'mist-dust-poison-sheet.webp', 330, 329],
  ['mist-dust-shield', 'mist-dust-shield-sheet.webp', 449, 433],
  ['mist-dust-stun', 'mist-dust-stun-sheet.webp', 329, 330],
] as const;

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
  for (const [key, file, frameWidth, frameHeight] of MIST_DUST_SHEET_SPECS) {
    scene.load.spritesheet(key, `${MIST_DUST_SHEET_PATH}/${file}`, { frameWidth, frameHeight });
  }
}

export function ensureMistDustAnimations(scene: Phaser.Scene): void {
  const looping = [
    MIST_DUST_SPRITE_KEYS.idle,
    MIST_DUST_SPRITE_KEYS.highHp,
    MIST_DUST_SPRITE_KEYS.energy,
    MIST_DUST_SPRITE_KEYS.lowHp,
    MIST_DUST_SPRITE_KEYS.poisoned,
    MIST_DUST_SPRITE_KEYS.shield,
  ] as const;
  for (const key of looping) {
    createAnimation(scene, key, 8, -1);
  }
  for (const key of [
    MIST_DUST_SPRITE_KEYS.attack,
    MIST_DUST_SPRITE_KEYS.defend,
    MIST_DUST_SPRITE_KEYS.poisonCast,
    MIST_DUST_SPRITE_KEYS.hit,
    MIST_DUST_SPRITE_KEYS.death,
    MIST_DUST_SPRITE_KEYS.heal,
    MIST_DUST_SPRITE_KEYS.antiHeal,
    MIST_DUST_SPRITE_KEYS.dodge,
    MIST_DUST_SPRITE_KEYS.stunned,
  ] as const) {
    createAnimation(scene, key, key === MIST_DUST_SPRITE_KEYS.attack ? 14 : 10, 0);
  }
}

function createAnimation(scene: Phaser.Scene, key: string, frameRate: number, repeat: number): void {
  if (scene.anims.exists(key) || !scene.textures.exists(key)) return;
  scene.anims.create({
    key,
    frames: scene.anims.generateFrameNumbers(key, { start: 0, end: 7 }),
    frameRate,
    repeat,
  });
}
