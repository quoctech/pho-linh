import Phaser from 'phaser';
import {
  areAdjacent,
  DEFAULT_BATTLE_CONFIG,
  findLegalMoves,
  type Board,
  type BattleState,
  type Coord,
  type GameEvent,
  type GemType,
} from '../../game-core';
import { BattleController, type BattleEventPlayer } from './battle.controller';

const GEM_TYPES: readonly GemType[] = ['attack', 'heal', 'shield', 'energy', 'poison'];
const BOARD_SIZE = 6;
const CELL_SIZE = 48;
const BOARD_LEFT = 36;
const BOARD_TOP = 204;
const BOARD_WIDTH = BOARD_SIZE * CELL_SIZE;
const GEM_FALL_DURATION = 200;
const GEM_REFILL_DURATION = 160;
const MONSTER_COMBAT_Y_OFFSET = -32;
const LOGICAL_GAME_WIDTH = 360;
const DEFAULT_LOGICAL_GAME_HEIGHT = 620;
type HeroGender = 'male' | 'female';
interface HeroSpriteKeys {
  readonly idle: string;
  readonly attack: string;
  readonly hit: string;
  readonly death: string;
  readonly projectile: string;
}
interface MonsterSpriteKeys {
  readonly idle: string;
  readonly attack: string;
  readonly defend?: string;
  readonly poisonCast?: string;
  readonly hit: string;
  readonly death: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly displayWidth: number;
  readonly displayHeight: number;
  readonly originY: number;
}
const HERO_SPRITE_KEYS: Record<HeroGender, HeroSpriteKeys> = {
  male: {
    idle: 'hero-swordmaster-idle',
    attack: 'hero-swordmaster-attack',
    hit: 'hero-swordmaster-hit',
    death: 'hero-swordmaster-death',
    projectile: 'hero-swordmaster-projectile',
  },
  female: {
    idle: 'hero-swordmistress-idle',
    attack: 'hero-swordmistress-attack',
    hit: 'hero-swordmistress-hit',
    death: 'hero-swordmistress-death',
    projectile: 'hero-swordmistress-projectile',
  },
};
const MONSTER_SPRITE_KEYS: Readonly<Record<string, MonsterSpriteKeys>> = {
  mist_blob: {
    idle: 'mist-dust-idle',
    attack: 'mist-dust-attack',
    hit: 'mist-dust-hit',
    death: 'mist-dust-death',
    frameWidth: 512,
    frameHeight: 512,
    displayWidth: 84,
    displayHeight: 84,
    originY: 0.88,
  },
  lantern_cat: {
    idle: 'mieu-den-idle',
    attack: 'mieu-den-attack',
    defend: 'mieu-den-defend',
    poisonCast: 'mieu-den-poison-cast',
    hit: 'mieu-den-hit',
    death: 'mieu-den-death',
    frameWidth: 256,
    frameHeight: 384,
    displayWidth: 78,
    displayHeight: 117,
    originY: 0.65,
  },
};
const GEM_ATLAS_KEY = 'pho-linh-gems';
const BATTLE_BACKGROUND_KEY = 'pho-linh-pk-background';
const PARALLAX_BACKGROUND_KEYS = {
  sky: 'pk-layer-sky-moon',
  mid: 'pk-layer-mid-city',
  fx: 'pk-layer-fx-mist-petals',
  ground: 'pk-layer-ground-path',
} as const;
const GEM_ATLAS_FRAMES: Partial<Record<GemType, number>> = {
  attack: 0,
  shield: 1,
  heal: 2,
  energy: 3,
};
const GEM_TEXTURE_KEYS: Partial<Record<GemType, string>> = {
  attack: 'gem-attack',
  heal: 'gem-heal',
  poison: 'gem-poison-pure',
  shield: 'gem-shield',
  energy: 'gem-energy',
};
const VFX_SHEET_KEYS = {
  selectRing: 'fx-select-ring',
  match3: 'fx-match3-burst',
  match4: 'fx-match4-burst',
  match5: 'fx-match5-burst',
  impact: 'fx-gem-impact',
} as const;
const SKILL_VFX_KEYS = {
  icon: 'skill-cloudbreaker-icon',
  castCircle: 'fx-cloudbreaker-cast-circle',
  chargeAura: 'fx-cloudbreaker-charge-aura',
  swordGlow: 'fx-cloudbreaker-sword-glow',
  projectile: 'fx-cloudbreaker-projectile',
  cloudSplit: 'fx-cloudbreaker-cloud-split',
  impact: 'fx-cloudbreaker-impact',
  finishFlash: 'fx-cloudbreaker-finish-flash',
  spark: 'fx-cloudbreaker-spark',
} as const;
const LANTERN_SKILL_VFX_KEYS = {
  icon: 'skill-long-mieu-lien-kich-icon',
  stunIcon: 'skill-long-mieu-stun-icon',
  castCircle: 'fx-long-mieu-cast-circle',
  multiStrike: 'fx-long-mieu-multi-strike',
  impactStun: 'fx-long-mieu-impact-stun',
} as const;
const SFX_KEYS = {
  heroAttack: 'sfx-hero-attack',
  heroHit: 'sfx-hero-hit',
  mistAttack: 'sfx-mist-attack',
  mistHit: 'sfx-mist-hit',
  mistProjectile: 'sfx-mist-projectile',
  lanternAttack: 'sfx-lantern-attack',
  lanternAttackImpact: 'sfx-lantern-attack-impact',
  lanternDefend: 'sfx-lantern-defend',
  lanternHit: 'sfx-lantern-hit',
  lanternDeath: 'sfx-lantern-death',
  lanternPoisonCast: 'sfx-lantern-poison-cast',
  lanternPoisonProjectile: 'sfx-lantern-poison-projectile',
  lanternLongCharge: 'sfx-lantern-long-charge',
  lanternLongDash: 'sfx-lantern-long-dash',
  lanternLongImpact: 'sfx-lantern-long-impact',
  lanternLongStun: 'sfx-lantern-long-stun',
  skillCast: 'sfx-cloudbreaker-cast',
  skillRelease: 'sfx-cloudbreaker-release',
  skillImpact: 'sfx-cloudbreaker-impact',
} as const;

export class BattleScene extends Phaser.Scene implements BattleEventPlayer {
  private controller!: BattleController;
  private readonly gemSprites = new Map<string, Phaser.GameObjects.Container>();
  private readonly vfxSprites = new Set<Phaser.GameObjects.Sprite>();
  private readonly transientEffects = new Set<Phaser.GameObjects.GameObject>();
  private readonly longMieuTimers = new Set<Phaser.Time.TimerEvent>();
  private selection?: Phaser.GameObjects.Rectangle;
  private selectionRing?: Phaser.GameObjects.Sprite;
  private selectedCell?: Coord;
  private pointerStart?: Coord;
  private monsterVisual?: Phaser.GameObjects.Container;
  private monsterBody?: Phaser.GameObjects.Arc;
  private monsterArt?: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
  private monsterSprite?: Phaser.GameObjects.Sprite;
  private lastMonsterActionVisualId?: string;
  private lastLongMieuVisualId?: string;
  private heroVisual?: Phaser.GameObjects.Container;
  private heroSprite?: Phaser.GameObjects.Sprite;
  private heroSpriteKeys: HeroSpriteKeys = HERO_SPRITE_KEYS.male;
  private heroAssetName: 'hero-swordmaster' | 'hero-swordmistress' = 'hero-swordmaster';
  private heroShieldVisual?: Phaser.GameObjects.Container;
  private heroEnergyVisual?: Phaser.GameObjects.Container;
  private heroPoisonVisual?: Phaser.GameObjects.Container;
  private monsterPoisonVisual?: Phaser.GameObjects.Container;
  private energyAuraActive = false;
  private monsterGuardVisual?: Phaser.GameObjects.Container;
  private monsterGuardActive = false;
  private battleBackground?: Phaser.GameObjects.Image;
  private parallaxBackgroundLayers?: {
    readonly sky: Phaser.GameObjects.Image;
    readonly mid: Phaser.GameObjects.Image;
    readonly fx: Phaser.GameObjects.Image;
    readonly ground: Phaser.GameObjects.Image;
  };
  private parallaxStarted = false;
  private battleBackgroundOverlay?: Phaser.GameObjects.Rectangle;
  private playerBar?: Phaser.GameObjects.Graphics;
  private monsterBar?: Phaser.GameObjects.Graphics;
  private playerHpLabel?: Phaser.GameObjects.Text;
  private monsterHpLabel?: Phaser.GameObjects.Text;
  private monsterEnergyLabel?: Phaser.GameObjects.Text;
  private playerPoisonStatus?: Phaser.GameObjects.Text;
  private monsterPoisonStatus?: Phaser.GameObjects.Text;
  private energyLabel?: Phaser.GameObjects.Text;
  private energyBar?: Phaser.GameObjects.Graphics;
  private monsterEnergyBar?: Phaser.GameObjects.Graphics;
  private playerStunIcon?: Phaser.GameObjects.Image;
  private turnLabel?: Phaser.GameObjects.Text;
  private countdownLabel?: Phaser.GameObjects.Text;
  private fpsDebugLabel?: Phaser.GameObjects.Text;
  private telegraphLabel?: Phaser.GameObjects.Text;
  private statusLabel?: Phaser.GameObjects.Text;
  private skillButton?: Phaser.GameObjects.Rectangle;
  private skillIcon?: Phaser.GameObjects.Image;
  private skillButtonText?: Phaser.GameObjects.Text;
  private abandonButtonBackground?: Phaser.GameObjects.Rectangle;
  private abandonButton?: Phaser.GameObjects.Text;
  private unsubscribe?: () => void;
  private turnTimer?: Phaser.Time.TimerEvent;
  private monsterCountdownTimer?: Phaser.Time.TimerEvent;
  private remainingSeconds = DEFAULT_BATTLE_CONFIG.playerTurnSeconds;
  private monsterRemainingMs = 0;
  private monsterMoveFrom?: Phaser.GameObjects.Rectangle;
  private monsterMoveTo?: Phaser.GameObjects.Rectangle;
  private hintMoveFrom?: Phaser.GameObjects.Rectangle;
  private hintMoveTo?: Phaser.GameObjects.Rectangle;
  private hintActive = false;
  private displayedPlayerHp?: number;
  private displayedMonsterHp?: number;
  private displayedMonsterShield?: number;
  private displayedShield?: number;
  private displayedEnergy?: number;
  private displayedMonsterEnergy?: number;
  private displayedPlayerPoisonPotency?: number;
  private displayedPlayerPoisonTurns?: number;
  private displayedMonsterPoisonPotency?: number;
  private displayedMonsterPoisonTurns?: number;
  private fpsDebugElapsed = 0;
  private lastBoard?: Board;
  private sfxEnabled = true;
  private reducedMotion = false;
  private renderQuality = 1;
  private logicalWidth = LOGICAL_GAME_WIDTH;
  private logicalHeight = DEFAULT_LOGICAL_GAME_HEIGHT;

  constructor() {
    super({ key: 'BattleScene' });
  }

  preload(): void {
    this.load.image(BATTLE_BACKGROUND_KEY, 'assets/pk-background-parallax/full-background.webp');
    this.load.image(PARALLAX_BACKGROUND_KEYS.sky, 'assets/pk-background-parallax/layer-sky-moon.webp');
    this.load.image(PARALLAX_BACKGROUND_KEYS.mid, 'assets/pk-background-parallax/layer-mid-city.webp');
    this.load.image(PARALLAX_BACKGROUND_KEYS.fx, 'assets/pk-background-parallax/layer-fx-mist-petals.webp');
    this.load.image(PARALLAX_BACKGROUND_KEYS.ground, 'assets/pk-background-parallax/layer-ground-path.webp');
    const heroGender = this.getHeroGender();
    this.heroSpriteKeys = HERO_SPRITE_KEYS[heroGender];
    this.heroAssetName = heroGender === 'female' ? 'hero-swordmistress' : 'hero-swordmaster';
    this.load.spritesheet(GEM_ATLAS_KEY, 'assets/gems/pho-linh/pho-linh-gems-sheet.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.image('gem-attack', 'assets/gems/attack.webp');
    this.load.image('gem-heal', 'assets/gems/heal.webp');
    this.load.image('gem-poison-pure', 'assets/gems/pho-linh/gem-p-pure.png');
    this.load.image('gem-shield', 'assets/gems/shield.webp');
    this.load.image('gem-energy', 'assets/gems/energy.webp');
    this.load.spritesheet(this.heroSpriteKeys.idle, `assets/${this.heroAssetName}/idle/${this.heroAssetName}-idle-sheet.png`, {
      frameWidth: 512,
      frameHeight: 512,
    });
    this.load.spritesheet(this.heroSpriteKeys.attack, `assets/${this.heroAssetName}/attack/${this.heroAssetName}-attack-sheet.png`, {
      frameWidth: 512,
      frameHeight: 512,
    });
    this.load.spritesheet(this.heroSpriteKeys.hit, `assets/${this.heroAssetName}/hit/${this.heroAssetName}-hit-sheet.png`, {
      frameWidth: 512,
      frameHeight: 512,
    });
    this.load.spritesheet(this.heroSpriteKeys.death, `assets/${this.heroAssetName}/death/${this.heroAssetName}-death-sheet.png`, {
      frameWidth: 512,
      frameHeight: 512,
    });
    this.load.image(this.heroSpriteKeys.projectile, `assets/${this.heroAssetName}/attack/${this.heroAssetName}-flying-sword-projectile.png`);
    this.load.spritesheet(VFX_SHEET_KEYS.selectRing, 'assets/vfx/fx-select-ring/fx-select-ring-sheet.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet(VFX_SHEET_KEYS.match3, 'assets/vfx/fx-match3-burst/fx-match3-burst-sheet.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet(VFX_SHEET_KEYS.match4, 'assets/vfx/fx-match4-burst/fx-match4-burst-sheet.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet(VFX_SHEET_KEYS.match5, 'assets/vfx/fx-match5-burst/fx-match5-burst-sheet.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet(VFX_SHEET_KEYS.impact, 'assets/vfx/fx-gem-impact/fx-gem-impact-sheet.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.image(SKILL_VFX_KEYS.icon, 'assets/skills/den-pha-may/icon/skill-cloudbreaker-icon.webp');
    const skillVfxPath = 'assets/skills/den-pha-may/fx';
    for (const key of [
      SKILL_VFX_KEYS.castCircle,
      SKILL_VFX_KEYS.chargeAura,
      SKILL_VFX_KEYS.swordGlow,
      SKILL_VFX_KEYS.projectile,
      SKILL_VFX_KEYS.cloudSplit,
      SKILL_VFX_KEYS.impact,
      SKILL_VFX_KEYS.finishFlash,
      SKILL_VFX_KEYS.spark,
    ] as const) {
      this.load.spritesheet(key, `${skillVfxPath}/${key}-sheet.webp`, {
        // The supplied 4 × 2 sheets are 1774 × 887; the two-pixel export
        // padding is intentionally ignored by Phaser's integer frame size.
        frameWidth: 443,
        frameHeight: 443,
      });
    }
    this.load.image(
      LANTERN_SKILL_VFX_KEYS.icon,
      'assets/skills/long-mieu-lien-kich/icon/skill-long-mieu-lien-kich-icon.webp',
    );
    this.load.image(
      LANTERN_SKILL_VFX_KEYS.stunIcon,
      'assets/skills/long-mieu-lien-kich/icon/skill-long-mieu-stun-icon.webp',
    );
    const lanternSkillPath = 'assets/skills/long-mieu-lien-kich/fx';
    for (const key of [
      LANTERN_SKILL_VFX_KEYS.castCircle,
      LANTERN_SKILL_VFX_KEYS.multiStrike,
      LANTERN_SKILL_VFX_KEYS.impactStun,
    ] as const) {
      this.load.spritesheet(key, `${lanternSkillPath}/${key}-sheet.webp`, {
        frameWidth: 362,
        frameHeight: 543,
      });
    }
    const sfxPath = 'assets/audio/combat';
    const sfxFiles: Readonly<Record<string, string>> = {
      [SFX_KEYS.heroAttack]: 'hero-attack-sword.mp3',
      [SFX_KEYS.heroHit]: 'hero-hit.mp3',
      [SFX_KEYS.mistAttack]: 'mist-dust-attack.mp3',
      [SFX_KEYS.mistHit]: 'mist-dust-hit.mp3',
      [SFX_KEYS.mistProjectile]: 'mist-dust-projectile.mp3',
      [SFX_KEYS.lanternAttack]: 'lantern-cat/mieu-den-attack.mp3',
      [SFX_KEYS.lanternAttackImpact]: 'lantern-cat/mieu-den-attack-claw-hit.mp3',
      [SFX_KEYS.lanternDefend]: 'lantern-cat/mieu-den-defend.mp3',
      [SFX_KEYS.lanternHit]: 'lantern-cat/mieu-den-hit.mp3',
      [SFX_KEYS.lanternDeath]: 'lantern-cat/mieu-den-death.mp3',
      [SFX_KEYS.lanternPoisonCast]: 'lantern-cat/mieu-den-poison-cast.mp3',
      [SFX_KEYS.lanternPoisonProjectile]: 'lantern-cat/mieu-den-poison-projectile.mp3',
      [SFX_KEYS.lanternLongCharge]: 'lantern-cat/long-mieu-lien-kich-charge.mp3',
      [SFX_KEYS.lanternLongDash]: 'lantern-cat/long-mieu-lien-kich-dash.mp3',
      [SFX_KEYS.lanternLongImpact]: 'lantern-cat/long-mieu-lien-kich-impact.mp3',
      [SFX_KEYS.lanternLongStun]: 'lantern-cat/long-mieu-lien-kich-stun.mp3',
      [SFX_KEYS.skillCast]: 'cloudbreaker-cast.mp3',
      [SFX_KEYS.skillRelease]: 'cloudbreaker-release.mp3',
      [SFX_KEYS.skillImpact]: 'cloudbreaker-impact.mp3',
    };
    for (const [key, file] of Object.entries(sfxFiles)) {
      this.load.audio(key, `${sfxPath}/${file}`);
    }
    const controller = this.registry.get('battleController') as BattleController | undefined;
    const monsterId = controller?.currentState.monster.id ?? 'mist_blob';
    const monsterAssets = MONSTER_SPRITE_KEYS[monsterId] ?? MONSTER_SPRITE_KEYS['mist_blob'];
    if (monsterId === 'mist_blob') {
      this.load.spritesheet(monsterAssets.idle, 'assets/monsters/mist-dust/mist-dust-idle-sheet.png', {
        frameWidth: monsterAssets.frameWidth,
        frameHeight: monsterAssets.frameHeight,
      });
      this.load.spritesheet(monsterAssets.attack, 'assets/monsters/mist-dust/combat/attack/mist-dust-attack-sheet.png', {
        frameWidth: monsterAssets.frameWidth,
        frameHeight: monsterAssets.frameHeight,
      });
      this.load.spritesheet(monsterAssets.hit, 'assets/monsters/mist-dust/combat/hit/mist-dust-hit-sheet.png', {
        frameWidth: monsterAssets.frameWidth,
        frameHeight: monsterAssets.frameHeight,
      });
      this.load.spritesheet(monsterAssets.death, 'assets/monsters/mist-dust/combat/death/mist-dust-death-sheet.png', {
        frameWidth: monsterAssets.frameWidth,
        frameHeight: monsterAssets.frameHeight,
      });
    } else if (monsterId === 'lantern_cat') {
      const base = 'assets/monsters/mieu-den/sheets';
      for (const key of [
        monsterAssets.idle,
        monsterAssets.attack,
        monsterAssets.defend,
        monsterAssets.poisonCast,
        monsterAssets.hit,
        monsterAssets.death,
      ]) {
        if (!key) continue;
        this.load.spritesheet(key, `${base}/${key}-sheet.webp`, {
          frameWidth: monsterAssets.frameWidth,
          frameHeight: monsterAssets.frameHeight,
        });
      }
    }
    if (monsterId === 'mist_blob') {
      this.load.spritesheet('mist-dust-hit-impact', 'assets/monsters/mist-dust/combat/attack-impact/mist-dust-hit-impact-sheet.png', {
        frameWidth: 384,
        frameHeight: 384,
      });
    }
  }

  create(): void {
    this.controller = this.registry.get('battleController') as BattleController;
    this.sfxEnabled = this.registry.get('sfxEnabled') !== false;
    this.reducedMotion = this.registry.get('reducedMotion') === true;
    this.renderQuality = this.safeNumber(Number(this.registry.get('renderQuality')), 1);
    this.logicalWidth = this.safeNumber(Number(this.registry.get('logicalWidth')), LOGICAL_GAME_WIDTH);
    this.logicalHeight = this.safeNumber(Number(this.registry.get('logicalHeight')), DEFAULT_LOGICAL_GAME_HEIGHT);
    this.cameras.main.setOrigin(0, 0).setScroll(0, 0).setZoom(this.renderQuality);
    if (!this.controller) {
      this.controller = new BattleController(0x50484f, this);
    } else {
      this.controller.attachEventPlayer(this);
    }

    this.cameras.main.setBackgroundColor('#171426');
    this.createBattleBackground();
    this.ensureMatch3VfxAnimations();
    this.ensureSkillVfxAnimations();
    this.ensureLanternSkillVfxAnimations();
    this.ensureHeroAnimations();
    this.createHeroVisual();
    this.createHud();
    this.createMonsterVisual();
    this.createProtectionVisuals();
    this.createBoardFrame();
    this.createControls();

    this.selection = this.add
      .rectangle(0, 0, CELL_SIZE - 4, CELL_SIZE - 4)
      .setStrokeStyle(3, 0xffe7a6)
      .setFillStyle(0xffffff, 0)
      .setDepth(10)
      .setVisible(false);
    if (this.textures.exists(VFX_SHEET_KEYS.selectRing) && this.anims.exists(VFX_SHEET_KEYS.selectRing)) {
      this.selectionRing = this.add
        .sprite(0, 0, VFX_SHEET_KEYS.selectRing)
        .setOrigin(0.5)
        .setDisplaySize(46, 46)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(11)
        .setVisible(false)
        .play(VFX_SHEET_KEYS.selectRing);
    }
    this.monsterMoveFrom = this.add.rectangle(0, 0, CELL_SIZE - 8, CELL_SIZE - 8)
      .setStrokeStyle(3, 0x8fd3ff).setFillStyle(0x8fd3ff, 0.12).setDepth(10).setVisible(false);
    this.monsterMoveTo = this.add.rectangle(0, 0, CELL_SIZE - 8, CELL_SIZE - 8)
      .setStrokeStyle(3, 0xa889ff).setFillStyle(0xa889ff, 0.12).setDepth(10).setVisible(false);
    this.hintMoveFrom = this.add.rectangle(0, 0, CELL_SIZE - 6, CELL_SIZE - 6)
      .setStrokeStyle(2, 0xffd45e, 0.95).setFillStyle(0xffd45e, 0.1).setDepth(9).setVisible(false);
    this.hintMoveTo = this.add.rectangle(0, 0, CELL_SIZE - 6, CELL_SIZE - 6)
      .setStrokeStyle(2, 0xfff0a6, 0.95).setFillStyle(0xfff0a6, 0.1).setDepth(9).setVisible(false);

    this.unsubscribe = this.controller.subscribe((state) => this.renderState(state));
    this.syncTurnTimer();
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.events.once('shutdown', this.cleanup, this);
    const battleReady = this.registry.get('battleReady') as (() => void) | undefined;
    battleReady?.();
  }

  override update(_time: number, delta: number): void {
    if (!this.controller) return;
    this.updateFpsDebug(delta);
    // Keep persistent VFX synchronized even while the player is idle. This
    // prevents a tweened shield/aura from remaining visible after its value
    // has already reached zero.
    const shield = this.safeNumber(this.displayedShield ?? this.controller.currentState.player.shield);
    const monsterShield = this.safeNumber(this.displayedMonsterShield ?? this.controller.currentState.monster.shield);
    this.syncProtectionVisuals(shield > 0, monsterShield > 0);
    this.syncEnergyAura(this.safeNumber(this.displayedEnergy ?? this.controller.currentState.player.energy));
    this.syncPoisonVisual(
      this.safeNumber(this.displayedPlayerPoisonTurns ?? this.controller.currentState.player.poisonTurns) > 0,
      this.safeNumber(this.displayedMonsterPoisonTurns ?? this.controller.currentState.monster.poisonTurns) > 0,
    );
  }

  private updateFpsDebug(delta: number): void {
    if (!this.fpsDebugLabel) return;
    this.fpsDebugElapsed += delta;
    if (this.fpsDebugElapsed < 250) return;
    this.fpsDebugElapsed = 0;

    const fps = Math.max(0, Math.round(this.game.loop.actualFps));
    const color = fps >= 50 ? '#49a8ff' : fps >= 30 ? '#f3c64f' : '#ff5d6c';
    this.fpsDebugLabel.setText(`FPS ${fps}`).setColor(color);
  }

  private createBattleBackground(): void {
    if (!this.textures.exists(BATTLE_BACKGROUND_KEY)) return;
    this.battleBackground = this.add
      .image(this.logicalWidth / 2, this.logicalHeight / 2, BATTLE_BACKGROUND_KEY)
      .setOrigin(0.5)
      .setAlpha(0.96)
      .setDepth(-100);
    const hasParallaxLayers = Object.values(PARALLAX_BACKGROUND_KEYS)
      .every((key) => this.textures.exists(key));
    if (hasParallaxLayers) {
      const centerX = this.logicalWidth / 2;
      const centerY = this.logicalHeight / 2;
      this.parallaxBackgroundLayers = {
        sky: this.add.image(centerX, centerY, PARALLAX_BACKGROUND_KEYS.sky).setDepth(-95),
        mid: this.add.image(centerX, centerY, PARALLAX_BACKGROUND_KEYS.mid).setDepth(-90),
        fx: this.add.image(centerX, centerY, PARALLAX_BACKGROUND_KEYS.fx).setDepth(-70).setAlpha(0.68),
        ground: this.add.image(centerX, centerY + 34, PARALLAX_BACKGROUND_KEYS.ground).setDepth(-80),
      };
    }
    this.battleBackgroundOverlay = this.add
      .rectangle(this.logicalWidth / 2, this.logicalHeight / 2, this.logicalWidth, this.logicalHeight, 0x090817, 0.16)
      .setDepth(-60);
    this.resizeBattleBackground();
    this.scale.on('resize', this.resizeBattleBackground, this);
  }

  private resizeBattleBackground(): void {
    if (!this.battleBackgroundOverlay) return;
    const width = this.logicalWidth;
    const height = this.logicalHeight;
    const background = this.battleBackground;
    if (!background) return;
    const source = background.texture.getSourceImage() as HTMLImageElement;
    const scale = Math.max(width / source.width, height / source.height);
    background.setPosition(width / 2, height / 2).setScale(scale);
    const layers = this.parallaxBackgroundLayers;
    if (layers) {
      layers.sky.setPosition(width / 2, height / 2).setScale(scale);
      layers.mid.setPosition(width / 2, height / 2).setScale(scale);
      layers.fx.setPosition(width / 2, height / 2).setScale(scale);
      layers.ground.setPosition(width / 2, height / 2 + 34).setScale(scale);
      this.startParallaxMotion();
    }
    this.battleBackgroundOverlay.setPosition(width / 2, height / 2).setSize(width, height);
  }

  private startParallaxMotion(): void {
    const layers = this.parallaxBackgroundLayers;
    if (!layers || this.parallaxStarted) return;
    this.parallaxStarted = true;
    this.tweens.add({
      targets: layers.sky,
      x: { from: layers.sky.x - 2, to: layers.sky.x + 2 },
      y: { from: layers.sky.y - 1, to: layers.sky.y + 1 },
      yoyo: true,
      repeat: -1,
      duration: 12000,
      ease: 'Sine.InOut',
    });
    this.tweens.add({
      targets: layers.mid,
      x: { from: layers.mid.x - 5, to: layers.mid.x + 5 },
      y: { from: layers.mid.y - 1, to: layers.mid.y + 1 },
      yoyo: true,
      repeat: -1,
      duration: 8500,
      ease: 'Sine.InOut',
    });
    this.tweens.add({
      targets: layers.fx,
      x: { from: layers.fx.x - 8, to: layers.fx.x + 8 },
      alpha: { from: 0.52, to: 0.78 },
      yoyo: true,
      repeat: -1,
      duration: 4200,
      ease: 'Sine.InOut',
    });
  }

  async play(events: readonly GameEvent[]): Promise<void> {
    for (const event of events) {
      const board = event.payload['board'];
      if (event.type === 'GEMS_FALLING' && this.isPartialBoard(board)) {
        this.animateBoardFall(board);
      } else if (event.type === 'GEMS_REFILLED' && this.isBoard(board)) {
        this.animateBoardRefill(board);
      } else if (this.isBoard(board)) {
        this.renderBoard(board);
      }

      this.playEventFeedback(event);
      await this.wait(this.durationForEvent(event));
    }

    const monsterActed = events.some((event) =>
      event.type === 'MONSTER_SWAP_RESOLVED'
      || event.type === 'MONSTER_ATTACKED'
      || event.type === 'MONSTER_GUARDED'
      || event.type === 'MONSTER_SKILL_USED',
    );
    const terminal = events.some((event) =>
      event.type === 'BATTLE_WON' || event.type === 'BATTLE_LOST' || event.type === 'BATTLE_ABANDONED',
    );
    if (monsterActed && !terminal) {
      this.hideMonsterMove();
      this.playerStunIcon?.setVisible(false);
      this.statusLabel?.setText('Tới lượt bạn · Chọn hai ngọc kề nhau');
    }
  }

  private createHud(): void {
    this.fpsDebugLabel = this.add
      .text(8, 8, 'FPS --', {
        color: '#49a8ff',
        fontFamily: 'sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
      })
      .setResolution(this.renderQuality)
      .setOrigin(0, 0)
      .setDepth(100);
    this.turnLabel = this.add
      .text(180, 16, 'Lượt 0 / 24', { color: '#fff8e8', fontFamily: 'sans-serif', fontSize: '14px' })
      .setResolution(this.renderQuality)
      .setOrigin(0.5, 0.5);
    this.countdownLabel = this.add
      .text(180, 35, '', { color: '#f3c64f', fontFamily: 'sans-serif', fontSize: '14px', fontStyle: 'bold' })
      .setResolution(this.renderQuality)
      .setOrigin(0.5, 0.5);

    this.add
      .rectangle(8, 54, 92, 22, 0x211a34, 0.9)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x66567f, 0.9)
      .setDepth(8);
    this.add
      .text(15, 54, 'Nhân vật', { color: '#eee5ff', fontSize: '12px', fontStyle: 'bold' })
      .setResolution(this.renderQuality)
      .setOrigin(0, 0.5)
      .setDepth(9);
    this.playerBar = this.add.graphics();
    this.playerHpLabel = this.add.text(8, 78, '', { color: '#fff8e8', fontSize: '11px' }).setResolution(this.renderQuality);

    this.add
      .rectangle(258, 54, 94, 22, 0x211a34, 0.9)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x66567f, 0.9)
      .setDepth(8);
    this.add
      .text(345, 54, this.controller.currentState.monster.name, { color: '#eee5ff', fontSize: '12px', fontStyle: 'bold' })
      .setResolution(this.renderQuality)
      .setOrigin(1, 0.5)
      .setDepth(9);
    this.monsterBar = this.add.graphics();
    this.monsterHpLabel = this.add.text(352, 78, '', { color: '#fff8e8', fontSize: '12px' })
      .setResolution(this.renderQuality)
      .setOrigin(1, 0.5);
    this.monsterEnergyLabel = this.add.text(352, 110, '', {
      color: '#f3c64f',
      fontSize: '11px',
      fontStyle: 'bold',
    }).setResolution(this.renderQuality).setOrigin(1, 0.5);
    if (this.controller.currentState.monster.id !== 'lantern_cat') {
      this.monsterEnergyLabel.setVisible(false);
    }
    if (this.textures.exists(LANTERN_SKILL_VFX_KEYS.stunIcon)) {
      this.playerStunIcon = this.add
        .image(72, 494, LANTERN_SKILL_VFX_KEYS.stunIcon)
        .setDisplaySize(28, 28)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(18)
        .setVisible(false);
    }
    this.playerPoisonStatus = this.add.text(8, 91, '', {
      color: '#d5aaff',
      fontSize: '10px',
      fontStyle: 'bold',
    }).setResolution(this.renderQuality).setDepth(9);
    this.monsterPoisonStatus = this.add.text(352, 91, '', {
      color: '#d5aaff',
      fontSize: '10px',
      fontStyle: 'bold',
    }).setResolution(this.renderQuality).setOrigin(1, 0).setDepth(9);

    this.telegraphLabel = this.add
      .text(180, 160, '', {
        color: '#f3c64f',
        fontFamily: 'sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
      })
      .setResolution(this.renderQuality)
      .setOrigin(0.5);
    this.statusLabel = this.add
      .text(180, 178, 'Chọn hai viên ngọc kề nhau', {
        color: '#fff8e8',
        fontFamily: 'sans-serif',
        fontSize: '12px',
      })
      .setResolution(this.renderQuality)
      .setOrigin(0.5);
  }

  private createMonsterVisual(): void {
    const monster = this.add.container(294, 145);
    monster.setDepth(6);
    const spriteKeys = this.monsterSpriteKeys();
    if (spriteKeys && this.textures.exists(spriteKeys.idle)) {
      this.ensureMonsterAnimations(spriteKeys);
      if (this.controller.currentState.monster.id === 'mist_blob' && this.textures.exists('mist-dust-hit-impact')) {
        this.createMonsterAnimation('mist-dust-hit-impact', 'mist-dust-hit-impact', 12, 0);
      }
      const sprite = this.add.sprite(0, 0, spriteKeys.idle)
        .setOrigin(0.5, spriteKeys.originY)
        .setDisplaySize(spriteKeys.displayWidth, spriteKeys.displayHeight)
        .setFlipX(true)
        .play(spriteKeys.idle);
      this.monsterArt = sprite;
      this.monsterSprite = sprite;
      monster.add(sprite);
      this.monsterVisual = monster;
      return;
    }
    const body = this.add.circle(0, 0, 30, 0x8b9bc7, 1);
    body.setStrokeStyle(2, 0xe9efff, 0.9);
    const leftEye = this.add.circle(-8, -3, 3.5, 0x26203d, 1);
    const rightEye = this.add.circle(8, -3, 3.5, 0x26203d, 1);
    const mouth = this.add.arc(0, 5, 7, 20, 160, false, 0x26203d, 1);
    monster.add([body, leftEye, rightEye, mouth]);
    this.monsterVisual = monster;
    this.monsterBody = body;
  }

  private createShieldVisual(
    x: number,
    y: number,
    color: number,
    edgeColor: number,
    scale = 1,
  ): Phaser.GameObjects.Container {
    const visual = this.add.container(x, y).setDepth(7).setScale(scale).setVisible(false);
    const shield = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    const shieldPoints = [
      new Phaser.Math.Vector2(0, -40),
      new Phaser.Math.Vector2(29, -27),
      new Phaser.Math.Vector2(25, 10),
      new Phaser.Math.Vector2(0, 39),
      new Phaser.Math.Vector2(-25, 10),
      new Phaser.Math.Vector2(-29, -27),
    ];
    shield.fillStyle(color, 0.12);
    shield.lineStyle(2, edgeColor, 0.92);
    shield.fillPoints(shieldPoints, true);
    shield.strokePoints(shieldPoints, true);

    const shieldCore = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    shieldCore.lineStyle(1, edgeColor, 0.7);
    shieldCore.strokePoints([
      new Phaser.Math.Vector2(0, -29),
      new Phaser.Math.Vector2(20, -20),
      new Phaser.Math.Vector2(17, 6),
      new Phaser.Math.Vector2(0, 27),
      new Phaser.Math.Vector2(-17, 6),
      new Phaser.Math.Vector2(-20, -20),
    ], true);

    const crest = this.add
      .triangle(0, -1, 0, -8, 7, 5, -7, 5, edgeColor, 0.68)
      .setBlendMode(Phaser.BlendModes.ADD);
    visual.add([shield, shieldCore, crest]);
    this.tweens.add({
      targets: visual,
      alpha: { from: 0.55, to: 0.95 },
      scaleX: { from: scale * 0.96, to: scale * 1.03 },
      scaleY: { from: scale * 0.98, to: scale * 1.04 },
      yoyo: true,
      repeat: -1,
      duration: 700,
      ease: 'Sine.InOut',
    });
    return visual;
  }

  private createProtectionVisuals(): void {
    this.heroShieldVisual = this.createShieldVisual(72, 538, 0x6cbcff, 0xbfe4ff);
    this.heroEnergyVisual = this.add.container(72, 538).setDepth(7).setVisible(false);
    const energyCore = this.add
      .ellipse(0, 0, 70, 82, 0xffc84d, 0.08)
      .setStrokeStyle(2, 0xffe58a, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD);
    const energyBurst = this.add.graphics();
    energyBurst.lineStyle(2, 0xffd45e, 0.82);
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      energyBurst.lineBetween(
        Math.cos(angle) * 34,
        Math.sin(angle) * 38,
        Math.cos(angle) * 48,
        Math.sin(angle) * 52,
      );
    }
    this.heroEnergyVisual.add([energyCore, energyBurst]);
    this.heroPoisonVisual = this.createPoisonVisual(72, 538, 1);
    this.monsterPoisonVisual = this.createPoisonVisual(294, 145 + MONSTER_COMBAT_Y_OFFSET, 0.72);
    this.monsterGuardVisual = this.createShieldVisual(294, 145 + MONSTER_COMBAT_Y_OFFSET, 0xa889ff, 0xd8c2ff, 1.06);
    this.tweens.add({
      targets: this.heroEnergyVisual,
      alpha: { from: 0.16, to: 0.5 },
      scaleX: { from: 0.92, to: 1.08 },
      scaleY: { from: 0.92, to: 1.08 },
      angle: { from: -3, to: 3 },
      yoyo: true,
      repeat: -1,
      duration: 420,
      ease: 'Sine.InOut',
    });
  }

  private createPoisonVisual(
    x: number,
    y: number,
    scale: number,
  ): Phaser.GameObjects.Container {
    const visual = this.add.container(x, y)
      .setDepth(7)
      .setScale(scale)
      .setVisible(false);
    const poisonAura = this.add
      .ellipse(0, 0, 82, 108, 0xa85ee8, 0.1)
      .setStrokeStyle(2, 0xd5aaff, 0.78)
      .setBlendMode(Phaser.BlendModes.ADD);
    const poisonWisps = [
      this.add.circle(-24, 22, 4, 0xd5aaff, 0.64),
      this.add.circle(0, -16, 3, 0xb96ff2, 0.72),
      this.add.circle(25, 15, 3.5, 0xe0b8ff, 0.62),
    ];
    visual.add([poisonAura, ...poisonWisps]);
    this.tweens.add({
      targets: visual,
      alpha: { from: 0.36, to: 0.78 },
      angle: { from: -2, to: 2 },
      scaleX: { from: scale * 0.98, to: scale * 1.04 },
      scaleY: { from: scale, to: scale * 1.06 },
      yoyo: true,
      repeat: -1,
      duration: 620,
      ease: 'Sine.InOut',
    });
    return visual;
  }

  private monsterSpriteKeys(): MonsterSpriteKeys | undefined {
    return MONSTER_SPRITE_KEYS[this.controller.currentState.monster.id];
  }

  private ensureMonsterAnimations(keys: MonsterSpriteKeys): void {
    this.createMonsterAnimation(keys.idle, keys.idle, 7, -1);
    this.createMonsterAnimation(keys.attack, keys.attack, 12, 0);
    if (keys.defend) this.createMonsterAnimation(keys.defend, keys.defend, 10, 0);
    if (keys.poisonCast) this.createMonsterAnimation(keys.poisonCast, keys.poisonCast, 10, 0);
    this.createMonsterAnimation(keys.hit, keys.hit, 12, 0);
    this.createMonsterAnimation(keys.death, keys.death, 9, 0);
  }

  private getHeroGender(): HeroGender {
    return this.registry.get('heroGender') === 'female' ? 'female' : 'male';
  }

  private createMonsterAnimation(
    key: string,
    textureKey: string,
    frameRate: number,
    repeat: number,
  ): void {
    if (this.anims.exists(key) || !this.textures.exists(textureKey)) return;
    this.anims.create({
      key,
      frames: this.anims.generateFrameNumbers(textureKey, { start: 0, end: 7 }),
      frameRate,
      repeat,
    });
  }

  private ensureHeroAnimations(): void {
    this.createMonsterAnimation(this.heroSpriteKeys.idle, this.heroSpriteKeys.idle, 8, -1);
    this.createMonsterAnimation(this.heroSpriteKeys.attack, this.heroSpriteKeys.attack, 10, 0);
    this.createMonsterAnimation(this.heroSpriteKeys.hit, this.heroSpriteKeys.hit, 9, 0);
    this.createMonsterAnimation(this.heroSpriteKeys.death, this.heroSpriteKeys.death, 8, 0);
  }

  private createHeroVisual(): void {
    if (!this.textures.exists(this.heroSpriteKeys.idle)) return;
    const hero = this.add.container(72, 578).setDepth(6);
    const sprite = this.add.sprite(0, 0, this.heroSpriteKeys.idle)
      .setOrigin(0.5, 0.92)
      .setDisplaySize(84, 84)
      .play(this.heroSpriteKeys.idle);
    this.heroSprite = sprite;
    this.heroVisual = hero;
    hero.add(sprite);
  }

  private ensureMatch3VfxAnimations(): void {
    this.createVfxAnimation(VFX_SHEET_KEYS.selectRing, VFX_SHEET_KEYS.selectRing, -1);
    this.createVfxAnimation(VFX_SHEET_KEYS.match3, VFX_SHEET_KEYS.match3, 0);
    this.createVfxAnimation(VFX_SHEET_KEYS.match4, VFX_SHEET_KEYS.match4, 0);
    this.createVfxAnimation(VFX_SHEET_KEYS.match5, VFX_SHEET_KEYS.match5, 0);
    this.createVfxAnimation(VFX_SHEET_KEYS.impact, VFX_SHEET_KEYS.impact, 0);
  }

  private ensureSkillVfxAnimations(): void {
    for (const key of [
      SKILL_VFX_KEYS.castCircle,
      SKILL_VFX_KEYS.chargeAura,
      SKILL_VFX_KEYS.swordGlow,
      SKILL_VFX_KEYS.projectile,
      SKILL_VFX_KEYS.cloudSplit,
      SKILL_VFX_KEYS.impact,
      SKILL_VFX_KEYS.finishFlash,
      SKILL_VFX_KEYS.spark,
    ] as const) {
      this.createVfxAnimation(key, key, 0);
    }
  }

  private ensureLanternSkillVfxAnimations(): void {
    for (const key of [
      LANTERN_SKILL_VFX_KEYS.castCircle,
      LANTERN_SKILL_VFX_KEYS.multiStrike,
      LANTERN_SKILL_VFX_KEYS.impactStun,
    ] as const) {
      this.createVfxAnimation(key, key, 0);
    }
  }

  private createVfxAnimation(key: string, textureKey: string, repeat: number): void {
    if (this.anims.exists(key) || !this.textures.exists(textureKey)) return;
    this.anims.create({
      key,
      frames: this.anims.generateFrameNumbers(textureKey, { start: 0, end: 7 }),
      frameRate: 12,
      repeat,
    });
  }

  private spawnVfx(
    key: string,
    x: number,
    y: number,
    displaySize: number,
    depth = 12,
  ): void {
    this.spawnVfxSized(key, x, y, displaySize, displaySize, depth);
  }

  private spawnVfxSized(
    key: string,
    x: number,
    y: number,
    displayWidth: number,
    displayHeight: number,
    depth = 12,
  ): void {
    if (!this.textures.exists(key) || !this.anims.exists(key)) return;
    const fx = this.add
      .sprite(x, y, key)
      .setOrigin(0.5)
      .setDisplaySize(displayWidth, displayHeight)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth)
      .play(key);
    this.vfxSprites.add(fx);
    fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.vfxSprites.delete(fx);
      fx.destroy();
    });
  }

  private animateGemsCleared(coords: readonly Coord[]): void {
    for (const coord of coords) {
      const point = this.boardPoint(coord);
      const gem = this.gemSprites.get(`${coord.row}:${coord.col}`);
      const gemType = gem?.getData('gemType') as GemType | undefined;
      const accent = this.gemAccentColor(gemType);
      this.spawnGemFlash(point.x, point.y, accent);
      this.spawnGemParticles(point.x, point.y, accent);
      if (!gem) continue;

      this.tweens.killTweensOf(gem);
      gem.setAlpha(1).setScale(1);
      this.tweens.add({
        targets: gem,
        scale: 1.12,
        duration: 70,
        ease: 'Quad.Out',
        onComplete: () => {
          this.tweens.add({
            targets: gem,
            scale: 0,
            alpha: 0,
            duration: 150,
            ease: 'Back.In',
          });
        },
      });
    }
  }

  private animateGemSwap(from: Coord, to: Coord): void {
    const fromKey = `${from.row}:${from.col}`;
    const toKey = `${to.row}:${to.col}`;
    const fromGem = this.gemSprites.get(fromKey);
    const toGem = this.gemSprites.get(toKey);
    if (!fromGem || !toGem) return;

    this.gemSprites.set(fromKey, toGem);
    this.gemSprites.set(toKey, fromGem);
    const fromPoint = this.boardPoint(from);
    const toPoint = this.boardPoint(to);
    this.tweens.killTweensOf([fromGem, toGem]);
    this.tweens.add({
      targets: fromGem,
      x: toPoint.x,
      y: toPoint.y,
      scale: 1.06,
      duration: 160,
      ease: 'Cubic.InOut',
      onComplete: () => fromGem.setScale(1),
    });
    this.tweens.add({
      targets: toGem,
      x: fromPoint.x,
      y: fromPoint.y,
      scale: 1.06,
      duration: 160,
      ease: 'Cubic.InOut',
      onComplete: () => toGem.setScale(1),
    });
  }

  private gemAccentColor(gem: GemType | undefined): number {
    if (!gem) return 0xfff0ad;
    return this.gemVisual(gem).color;
  }

  private spawnGemFlash(x: number, y: number, color: number): void {
    const flash = this.add
      .circle(x, y, 20, color, 0.82)
      .setDepth(14)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.transientEffects.add(flash);
    this.tweens.add({
      targets: flash,
      scale: 1.2,
      alpha: 0,
      duration: 120,
      ease: 'Quad.Out',
      onComplete: () => this.destroyTransientEffect(flash),
    });
  }

  private spawnGemParticles(x: number, y: number, color: number): void {
    const particleCount = 4;
    for (let index = 0; index < particleCount; index += 1) {
      const angle = (Math.PI * 2 * index) / particleCount + Phaser.Math.FloatBetween(-0.18, 0.18);
      const distance = Phaser.Math.Between(16, 30);
      const particle = this.add
        .circle(x, y, Phaser.Math.FloatBetween(1.5, 2.5), color, 0.95)
        .setDepth(14)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.transientEffects.add(particle);
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        scale: 0.15,
        alpha: 0,
        duration: Phaser.Math.Between(220, 300),
        ease: 'Cubic.Out',
        onComplete: () => this.destroyTransientEffect(particle),
      });
    }
  }

  private destroyTransientEffect(effect: Phaser.GameObjects.GameObject): void {
    this.transientEffects.delete(effect);
    effect.destroy();
  }

  private createBoardFrame(): void {
    const frame = this.add.graphics();
    frame.fillStyle(0x28213d, 1);
    frame.fillRoundedRect(BOARD_LEFT - 10, BOARD_TOP - 10, BOARD_WIDTH + 20, BOARD_WIDTH + 20, 16);
    frame.lineStyle(2, 0x594b78, 1);
    frame.strokeRoundedRect(BOARD_LEFT - 10, BOARD_TOP - 10, BOARD_WIDTH + 20, BOARD_WIDTH + 20, 16);
  }

  private createControls(): void {
    this.energyLabel = this.add.text(8, 110, 'Năng lượng 0 / 100', {
      color: '#f3c64f',
      fontSize: '14px',
      fontStyle: 'bold',
    }).setResolution(this.renderQuality);
    this.energyBar = this.add.graphics();
    this.monsterEnergyBar = this.add.graphics();
    if (this.controller.currentState.monster.id !== 'lantern_cat') {
      this.monsterEnergyBar.setVisible(false);
    }

    this.skillButton = this.add
      .rectangle(274, 548, 128, 38, 0x6b4fa3, 1)
      .setStrokeStyle(2, 0xd8c2ff, 0.7)
      .setInteractive({ useHandCursor: true });
    this.skillIcon = this.add
      .image(226, 548, SKILL_VFX_KEYS.icon)
      .setDisplaySize(30, 30)
      .setDepth(2)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.skillButtonText = this.add
      .text(286, 548, 'Đèn Phá Mây', { color: '#fff8e8', fontSize: '12px', fontStyle: 'bold' })
      .setResolution(this.renderQuality)
      .setOrigin(0.5);
    this.skillButton.on('pointerdown', () => void this.dispatchSkill());

    this.abandonButtonBackground = this.add
      .rectangle(12, this.logicalHeight - 12, 98, 36, 0x30263f, 0.96)
      .setOrigin(0, 1)
      .setStrokeStyle(2, 0xa87391, 0.85)
      .setDepth(1);
    this.abandonButton = this.add
      .text(26, this.logicalHeight - 30, 'Rời trận', { color: '#f0b4c2', fontSize: '13px', fontStyle: 'bold' })
      .setResolution(this.renderQuality)
      .setOrigin(0, 0.5)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });
    this.abandonButton.on('pointerdown', () => void this.dispatchAbandon());
    this.positionAbandonButton();
    this.scale.on('resize', this.positionAbandonButton, this);
  }

  private positionAbandonButton(): void {
    const bottom = this.logicalHeight - 12;
    this.abandonButtonBackground?.setPosition(12, bottom);
    this.abandonButton?.setPosition(26, bottom - 18);
  }

  private renderState(state: BattleState): void {
    this.displayedPlayerHp = state.player.currentHp;
    this.displayedMonsterHp = state.monster.currentHp;
    this.displayedMonsterShield = state.monster.shield;
    this.displayedShield = state.player.shield;
    this.displayedEnergy = state.player.energy;
    this.displayedMonsterEnergy = state.monster.energy;
    this.displayedPlayerPoisonPotency = state.player.poisonPotency;
    this.displayedPlayerPoisonTurns = state.player.poisonTurns;
    this.displayedMonsterPoisonPotency = state.monster.poisonPotency;
    this.displayedMonsterPoisonTurns = state.monster.poisonTurns;
    this.renderBoard(state.board);
    this.renderBars(state);
    this.telegraphLabel?.setText(state.telegraph);
    this.turnLabel?.setText(`Lượt ${state.turn} / ${state.maxTurns}`);
    this.energyLabel?.setText(`Năng lượng ${state.player.energy} / 100`);
    this.updateSkillButton(state);
    if (state.phase !== 'PLAYER_READY') this.stopTurnTimer();
  }

  private renderBars(state: BattleState): void {
    const playerMaxHp = this.safeNumber(state.player.stats?.maxHp, 1);
    const monsterMaxHp = this.safeNumber(state.monster.maxHp, 1);
    const playerHp = this.clampDisplay(this.displayedPlayerHp ?? state.player.currentHp, 0, playerMaxHp);
    const monsterHp = this.clampDisplay(this.displayedMonsterHp ?? state.monster.currentHp, 0, monsterMaxHp);
    const monsterShield = this.safeNumber(this.displayedMonsterShield ?? state.monster.shield);
    const shield = this.safeNumber(this.displayedShield ?? state.player.shield);
    const energy = this.clampDisplay(this.displayedEnergy ?? state.player.energy, 0, DEFAULT_BATTLE_CONFIG.energyCap);
    const monsterEnergy = this.clampDisplay(
      this.displayedMonsterEnergy ?? state.monster.energy,
      0,
      DEFAULT_BATTLE_CONFIG.energyCap,
    );
    const playerPoisonTurns = Math.max(0, this.displayedPlayerPoisonTurns ?? state.player.poisonTurns);
    const monsterPoisonTurns = Math.max(0, this.displayedMonsterPoisonTurns ?? state.monster.poisonTurns);
    this.drawBar(this.playerBar, 8, 64, 150, playerHp / playerMaxHp, 0x57c982);
    this.drawBar(this.monsterBar, 202, 64, 150, monsterHp / monsterMaxHp, 0xe75b62);
    this.drawBar(this.energyBar, 8, 126, 150, energy / DEFAULT_BATTLE_CONFIG.energyCap, 0xf3c64f);
    this.drawBar(
      this.monsterEnergyBar,
      202,
      126,
      150,
      monsterEnergy / DEFAULT_BATTLE_CONFIG.energyCap,
      0xf3c64f,
    );
    this.playerHpLabel?.setText(`HP ${playerHp} / ${playerMaxHp}  ·  Khiên ${shield}`);
    this.monsterHpLabel?.setText(`HP ${monsterHp} / ${monsterMaxHp}  ·  Khiên ${monsterShield}`);
    this.energyLabel?.setText(`Năng lượng ${energy} / 100`);
    this.monsterEnergyLabel?.setText(`Năng lượng ${monsterEnergy} / 100`);
    this.syncProtectionVisuals(shield > 0, monsterShield > 0);
    this.syncEnergyAura(energy);
    this.syncPoisonVisual(playerPoisonTurns > 0, monsterPoisonTurns > 0);
    this.refreshPoisonStatus();
  }

  private refreshDisplayedBars(): void {
    this.renderBars(this.controller.currentState);
  }

  private syncProtectionVisuals(hasPlayerShield: boolean, hasMonsterShield: boolean): void {
    if (this.heroShieldVisual) {
      this.heroShieldVisual.setPosition(this.heroVisual?.x ?? 72, (this.heroVisual?.y ?? 578) - 40);
      if (hasPlayerShield) {
        this.heroShieldVisual.setAlpha(0.72).setVisible(true);
      } else {
        this.heroShieldVisual.setAlpha(0).setVisible(false);
      }
    }
    if (this.monsterGuardVisual) {
      this.monsterGuardVisual.setPosition(
        this.monsterVisual?.x ?? 294,
        (this.monsterVisual?.y ?? 145) + MONSTER_COMBAT_Y_OFFSET,
      );
      if (hasMonsterShield || this.monsterGuardActive) {
        this.monsterGuardVisual.setAlpha(0.72).setVisible(true);
      } else {
        this.monsterGuardVisual.setAlpha(0).setVisible(false);
      }
    }
  }

  private syncEnergyAura(energy: number): void {
    const charged = energy > 50;
    if (this.heroEnergyVisual) {
      this.heroEnergyVisual.setPosition(this.heroVisual?.x ?? 72, (this.heroVisual?.y ?? 578) - 40);
      if (charged) {
        this.heroEnergyVisual.setAlpha(0.5).setVisible(true);
      } else {
        this.heroEnergyVisual.setAlpha(0).setVisible(false);
      }
    }
    if (charged && !this.energyAuraActive) {
      this.energyAuraActive = true;
      this.playEnergyThresholdEffect();
    } else if (!charged) {
      this.energyAuraActive = false;
    }
  }

  private syncPoisonVisual(playerActive: boolean, monsterActive: boolean): void {
    this.heroPoisonVisual
      ?.setPosition(this.heroVisual?.x ?? 72, (this.heroVisual?.y ?? 578) - 40)
      .setVisible(playerActive);
    this.monsterPoisonVisual
      ?.setPosition(this.monsterVisual?.x ?? 294, (this.monsterVisual?.y ?? 145) + MONSTER_COMBAT_Y_OFFSET)
      .setVisible(monsterActive);
  }

  private refreshPoisonStatus(): void {
    const playerTurns = Math.max(0, this.displayedPlayerPoisonTurns ?? this.controller.currentState.player.poisonTurns);
    const monsterTurns = Math.max(0, this.displayedMonsterPoisonTurns ?? this.controller.currentState.monster.poisonTurns);
    const playerPotency = Math.max(0, this.displayedPlayerPoisonPotency ?? this.controller.currentState.player.poisonPotency);
    const monsterPotency = Math.max(0, this.displayedMonsterPoisonPotency ?? this.controller.currentState.monster.poisonPotency);
    this.playerPoisonStatus?.setText(
      playerTurns > 0 ? `☠ Độc · ${playerTurns} lượt · ${playerPotency}/lượt` : '',
    );
    this.monsterPoisonStatus?.setText(
      monsterTurns > 0 ? `☠ Độc · ${monsterTurns} lượt · ${monsterPotency}/lượt` : '',
    );
  }

  private drawBar(
    graphics: Phaser.GameObjects.Graphics | undefined,
    x: number,
    y: number,
    width: number,
    ratio: number,
    color: number,
  ): void {
    if (!graphics) return;
    graphics.clear();
    graphics.fillStyle(0x3b3355, 1);
    graphics.fillRoundedRect(x, y, width, 8, 4);
    graphics.fillStyle(color, 1);
    const safeRatio = Number.isFinite(ratio) ? ratio : 0;
    graphics.fillRoundedRect(x, y, width * Math.max(0, Math.min(1, safeRatio)), 8, 4);
  }

  private safeNumber(value: number | undefined, fallback = 0): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  private playSfx(key: string, volume: number): void {
    if (!this.sfxEnabled || !this.cache.audio.exists(key)) return;
    try {
      this.sound.play(key, { volume });
    } catch {
      // Audio is an optional presentation layer; never interrupt gameplay.
    }
  }

  private clampDisplay(value: number | undefined, min: number, max: number): number {
    return Math.max(min, Math.min(max, this.safeNumber(value, min)));
  }

  private updateSkillButton(state: BattleState): void {
    const canAct = state.phase === 'PLAYER_READY';
    const skillReady = canAct && state.player.energy >= DEFAULT_BATTLE_CONFIG.energyCap;
    this.skillButton?.setFillStyle(skillReady ? 0x8c5fd1 : 0x403653, 1).setAlpha(skillReady ? 1 : 0.55);
    this.skillIcon?.setAlpha(skillReady ? 1 : 0.55);
    this.skillButtonText?.setAlpha(skillReady ? 1 : 0.55);
    this.setPlayerControlsEnabled(canAct, skillReady);
  }

  private renderBoard(board: Board): void {
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const key = `${row}:${col}`;
        const x = BOARD_LEFT + col * CELL_SIZE + CELL_SIZE / 2;
        const y = BOARD_TOP + row * CELL_SIZE + CELL_SIZE / 2;
        const current = this.gemSprites.get(key);
        if (!current || current.getData('gemType') !== board[row][col]) {
          current?.destroy(true);
          this.gemSprites.set(key, this.createGem(x, y, board[row][col]));
        } else {
          this.tweens.killTweensOf(current);
          current.setPosition(x, y).setScale(1).setAlpha(1).setVisible(true);
        }
      }
    }
    this.lastBoard = board.map((row) => [...row]) as Board;
    this.renderSelection();
  }

  private animateBoardFall(board: ReadonlyArray<ReadonlyArray<GemType | undefined>>): void {
    const nextSprites = new Map<string, Phaser.GameObjects.Container>();
    const claimed = new Set<Phaser.GameObjects.Container>();
    const candidates = [...this.gemSprites.values()]
      .filter((gem) => gem.active && gem.visible && gem.alpha > 0.05 && gem.scale > 0.05);

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const gemType = board[row][col];
        if (!gemType) continue;
        const target = this.boardPoint({ row, col });
        const candidate = candidates
          .filter((gem) => {
            const sourceCol = Math.round((gem.x - BOARD_LEFT - CELL_SIZE / 2) / CELL_SIZE);
            return !claimed.has(gem) && sourceCol === col && gem.getData('gemType') === gemType;
          })
          .sort((first, second) => Math.abs(first.y - target.y) - Math.abs(second.y - target.y))[0];
        const visual = candidate ?? this.createGem(target.x, target.y - CELL_SIZE, gemType);
        claimed.add(visual);
        this.tweens.killTweensOf(visual);
        visual.setVisible(true).setAlpha(1).setScale(1);
        nextSprites.set(`${row}:${col}`, visual);
        this.tweens.add({
          targets: visual,
          x: target.x,
          y: target.y,
          duration: GEM_FALL_DURATION,
          ease: 'Cubic.Out',
        });
      }
    }

    for (const visual of this.gemSprites.values()) {
      if (!claimed.has(visual)) visual.destroy(true);
    }
    this.gemSprites.clear();
    for (const [key, visual] of nextSprites) this.gemSprites.set(key, visual);
    this.renderSelection();
  }

  private animateBoardRefill(board: Board): void {
    const nextSprites = new Map<string, Phaser.GameObjects.Container>();
    const landingPoints: Coord[] = [];
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const key = `${row}:${col}`;
        const target = this.boardPoint({ row, col });
        const current = this.gemSprites.get(key);
        let visual = current;
        if (!visual || visual.getData('gemType') !== board[row][col]) {
          current?.destroy(true);
          visual = this.createGem(target.x, BOARD_TOP - (BOARD_SIZE - row + 1) * CELL_SIZE, board[row][col]);
          landingPoints.push({ row, col });
        }
        this.tweens.killTweensOf(visual);
        visual.setVisible(true).setAlpha(1).setScale(1);
        nextSprites.set(key, visual);
        this.tweens.add({
          targets: visual,
          x: target.x,
          y: target.y,
          duration: GEM_REFILL_DURATION,
          ease: 'Cubic.Out',
        });
      }
    }
    for (const [key, visual] of this.gemSprites) {
      if (!nextSprites.has(key)) visual.destroy(true);
    }
    this.gemSprites.clear();
    for (const [key, visual] of nextSprites) this.gemSprites.set(key, visual);
    this.lastBoard = board.map((row) => [...row]) as Board;
    this.renderSelection();
    this.scheduleLandingImpacts(landingPoints);
  }

  private scheduleLandingImpacts(coords: readonly Coord[]): void {
    for (const coord of coords.slice(0, 6)) {
      this.time.delayedCall(GEM_REFILL_DURATION, () => {
        const point = this.boardPoint(coord);
        this.spawnVfx(VFX_SHEET_KEYS.impact, point.x, point.y, 50, 13);
      });
    }
  }

  private createGem(x: number, y: number, gem: GemType): Phaser.GameObjects.Container {
    const visual = this.gemVisual(gem);
    const container = this.add.container(x, y);
    const atlasFrame = GEM_ATLAS_FRAMES[gem];
    const textureKey = GEM_TEXTURE_KEYS[gem];
    if (atlasFrame !== undefined && this.textures.exists(GEM_ATLAS_KEY)) {
      const icon = this.add.image(0, 0, GEM_ATLAS_KEY, atlasFrame).setDisplaySize(40, 40);
      container.add(icon);
    } else if (textureKey && this.textures.exists(textureKey)) {
      const icon = this.add.image(0, 0, textureKey).setDisplaySize(40, 40);
      container.add(icon);
    } else {
      const circle = this.add.circle(0, 0, 19, visual.color, 1);
      circle.setStrokeStyle(2, 0xfff8e8, 0.55).setAlpha(0.3);
      const label = this.add
        .text(0, 1, visual.symbol, { color: '#fff8e8', fontSize: '18px', fontStyle: 'bold' })
        .setResolution(this.renderQuality)
        .setOrigin(0.5);
      container.add([circle, label]);
    }
    container.setData('gemType', gem);
    return container;
  }

  private gemVisual(gem: GemType): { readonly color: number; readonly symbol: string } {
    switch (gem) {
      case 'attack': return { color: 0xe75b62, symbol: 'A' };
      case 'heal': return { color: 0x57c982, symbol: 'H' };
      case 'shield': return { color: 0x5a9de8, symbol: 'S' };
      case 'energy': return { color: 0xf3c64f, symbol: 'E' };
      case 'poison': return { color: 0xa778df, symbol: 'P' };
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.controller.isLocked || this.controller.currentState.phase !== 'PLAYER_READY') return;
    this.stopMoveHint();
    this.pointerStart = this.cellFromPoint(pointer.worldX, pointer.worldY);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.controller.isLocked || !this.pointerStart || this.controller.currentState.phase !== 'PLAYER_READY') {
      this.pointerStart = undefined;
      return;
    }
    const start = this.pointerStart;
    const end = this.cellFromPoint(pointer.worldX, pointer.worldY);
    this.pointerStart = undefined;
    if (!end) return;

    if (start.row === end.row && start.col === end.col) {
      if (this.selectedCell && this.selectedCell.row === end.row && this.selectedCell.col === end.col) {
        this.selectedCell = undefined;
        this.renderSelection();
        this.statusLabel?.setText('Đã bỏ chọn. Chọn một ngọc khác');
      } else if (this.selectedCell && areAdjacent(this.selectedCell, end)) {
        void this.dispatchSwap(this.selectedCell, end);
      } else {
        this.selectedCell = end;
        this.renderSelection();
        this.statusLabel?.setText(`Đã chọn ${this.gemAt(end)} · Chọn ngọc kề bên để đổi`);
      }
      return;
    }
    if (areAdjacent(start, end)) {
      void this.dispatchSwap(start, end);
      return;
    }
    this.selectedCell = end;
    this.renderSelection();
    this.statusLabel?.setText(`Đã chọn ${this.gemAt(end)} · Chọn ngọc kề bên để đổi`);
  }

  private async dispatchSwap(from: Coord, to: Coord): Promise<void> {
    if (!this.canPlayerAct()) return;
    this.stopTurnTimer();
    this.selectedCell = undefined;
    this.renderSelection();
    this.statusLabel?.setText(`Đang đổi ${this.gemAt(from)} và ${this.gemAt(to)}...`);
    this.setPlayerControlsEnabled(false);
    await this.controller.dispatch({
      kind: 'swap',
      from,
      to,
      actionId: `turn-${this.controller.currentState.turn + 1}`,
    });
    this.syncTurnTimer();
  }

  private async dispatchSkill(): Promise<void> {
    if (!this.canPlayerAct() || this.controller.currentState.player.energy < DEFAULT_BATTLE_CONFIG.energyCap) return;
    this.stopTurnTimer();
    this.setPlayerControlsEnabled(false);
    await this.controller.dispatch({
      kind: 'skill',
      skillId: 'cloud_break_lantern',
      actionId: `skill-${this.controller.currentState.turn + 1}`,
    });
    this.syncTurnTimer();
  }

  private async dispatchAbandon(): Promise<void> {
    if (!this.canPlayerAct()) return;
    this.stopTurnTimer();
    this.setPlayerControlsEnabled(false);
    await this.controller.dispatch({
      kind: 'abandon',
      actionId: `abandon-${this.controller.currentState.turn}`,
    });
  }

  private async dispatchTimeout(): Promise<void> {
    if (!this.canPlayerAct()) return;
    this.stopTurnTimer();
    this.setPlayerControlsEnabled(false);
    await this.controller.dispatch({ kind: 'timeout', actionId: `timeout-${this.controller.currentState.turn + 1}` });
    this.syncTurnTimer();
  }

  private playEventFeedback(event: GameEvent): void {
    const rawAmount = event.payload['amount'];
    const amount = typeof rawAmount === 'number' && Number.isFinite(rawAmount) ? rawAmount : 0;
    switch (event.type) {
      case 'SWAP_STARTED': {
        this.hideMonsterGuardEffect();
        const from = this.coordFromPayload(event.payload['from']);
        const to = this.coordFromPayload(event.payload['to']);
        if (from && to) this.animateGemSwap(from, to);
        this.statusLabel?.setText('Đang đổi ngọc...');
        break;
      }
      case 'MATCH_FOUND':
        this.statusLabel?.setText(event.payload['actor'] === 'monster' ? 'Quái tạo nhóm 3' : 'Bạn tạo nhóm 3');
        break;
      case 'GEMS_CLEARED': {
        const counts = event.payload['gemCounts'];
        const clearedCoords = this.coordsFromPayload(event.payload['coordinates']);
        this.animateGemsCleared(clearedCoords);
        this.spawnMatchBurst(clearedCoords);
        if (typeof counts === 'object' && counts !== null) {
          const gemCounts = counts as Record<string, unknown>;
          const [gem, count] = Object.entries(gemCounts)[0] ?? [];
          const actor = event.payload['actor'] === 'monster' ? 'Quái ghép' : 'Bạn ghép';
          this.statusLabel?.setText(`${actor} ${this.gemName(String(gem))} × ${String(count ?? 0)}`);
        }
        break;
      }
      case 'MONSTER_MOVE_SELECTED': {
        this.stopMonsterCountdown();
        this.countdownLabel?.setColor('#f3c64f').setText('Quái đang chọn ngọc...');
        const from = this.coordFromPayload(event.payload['from']);
        const to = this.coordFromPayload(event.payload['to']);
        if (from && to) this.showMonsterMove(from, to);
        this.statusLabel?.setText(String(event.payload['label'] ?? 'Quái đang chọn ngọc'));
        break;
      }
      case 'MONSTER_SWAP_STARTED':
        {
          const from = this.coordFromPayload(event.payload['from']);
          const to = this.coordFromPayload(event.payload['to']);
          if (from && to) this.animateGemSwap(from, to);
        }
        this.countdownLabel?.setColor('#f3c64f').setText('Quái đang đổi ngọc...');
        this.statusLabel?.setText('Quái đang đổi ngọc...');
        break;
      case 'MONSTER_SWAP_RESOLVED':
        this.countdownLabel?.setColor('#f3c64f').setText('Quái vừa đổi ngọc');
        this.statusLabel?.setText('Quái đã đổi ngọc');
        break;
      case 'TURN_TIMED_OUT':
        this.statusLabel?.setText('Hết thời gian — mất lượt');
        break;
      case 'MONSTER_THINKING':
        this.startMonsterCountdown(this.safeNumber(Number(event.payload['seconds'] ?? 1.2), 1.2));
        this.statusLabel?.setText(String(event.payload['label'] ?? 'Quái đang chuẩn bị...'));
        break;
      case 'DAMAGE_APPLIED':
        if (event.payload['target'] === 'player') {
          this.displayedPlayerHp = Math.max(0, (this.displayedPlayerHp ?? this.controller.currentState.player.currentHp) - amount);
          this.statusLabel?.setText(`-${amount} HP`);
          this.floatNumber(`-${amount} HP`, 80, 59, '#ff9aa4');
          this.shakePlayerBar();
        } else if (event.payload['target'] === 'monster') {
          const monsterShieldAbsorbed = this.safeNumber(Number(event.payload['shieldAbsorbed'] ?? 0));
          const monsterShieldBroken = Boolean(event.payload['shieldBroken'])
            || (monsterShieldAbsorbed > 0 && this.safeNumber(Number(event.payload['shieldRemaining'] ?? 0)) === 0);
          const matchCount = this.safeNumber(Number(event.payload['matchCount'] ?? 0));
          const matchLabel = matchCount >= 3 ? `X${matchCount} · ` : '';
          this.playHeroAnimation('attack');
          this.playSfx(SFX_KEYS.heroAttack, 0.5);
          // Let the sword swing read before launching the projectile.
          this.time.delayedCall(180, () => {
            this.spawnHeroProjectile(() => {
              this.playSfx(
                this.controller.currentState.monster.id === 'lantern_cat'
                  ? SFX_KEYS.lanternHit
                  : SFX_KEYS.mistHit,
                0.52,
              );
              this.playMonsterAnimation('hit');
              this.flashMonster(0xffe7a6);
              this.shakeMonster();
            });
          });
          this.displayedMonsterShield = Math.max(
            0,
            (this.displayedMonsterShield ?? this.controller.currentState.monster.shield) - monsterShieldAbsorbed,
          );
          this.displayedMonsterHp = Math.max(0, (this.displayedMonsterHp ?? this.controller.currentState.monster.currentHp) - amount);
          this.statusLabel?.setText(
            amount > 0
              ? `${matchLabel}Bạn tấn công quái · -${amount} HP${monsterShieldAbsorbed > 0 ? ` · khiên -${monsterShieldAbsorbed}` : ''}`
              : `${matchLabel}Đòn đánh bị khiên quái hấp thụ -${monsterShieldAbsorbed}`,
          );
          this.floatNumber(
            amount > 0 ? `${matchLabel}-${amount} HP` : `${matchLabel}-${monsterShieldAbsorbed} khiên`,
            294,
            104,
            amount > 0 ? '#ff9aa4' : '#9dceff',
          );
          if (monsterShieldBroken) this.playShieldBreakEffect('monster');
        }
        this.refreshDisplayedBars();
        break;
      case 'HEAL_APPLIED':
        const healTarget = event.payload['target'] === 'monster' ? 'monster' : 'player';
        if (healTarget === 'monster') {
          this.displayedMonsterHp = Math.min(
            this.controller.currentState.monster.maxHp,
            (this.displayedMonsterHp ?? this.controller.currentState.monster.currentHp) + amount,
          );
        } else {
          this.displayedPlayerHp = Math.min(
            this.controller.currentState.player.stats.maxHp,
            (this.displayedPlayerHp ?? this.controller.currentState.player.currentHp) + amount,
          );
        }
        if (amount > 0) {
          const point = this.combatPoint(healTarget);
          this.statusLabel?.setText(healTarget === 'monster' ? `Quái hồi ${amount} HP` : `+${amount} HP`);
          this.floatNumber(`+${amount} HP`, point.x, point.y - 50, '#8ff0ad');
          this.playHealEffect(healTarget);
        } else {
          this.statusLabel?.setText(healTarget === 'monster' ? 'HP quái đã đầy' : 'HP đã đầy');
        }
        this.refreshDisplayedBars();
        break;
      case 'SHIELD_GAINED':
        const shieldTarget = event.payload['target'] === 'monster' ? 'monster' : 'player';
        if (shieldTarget === 'player') {
          this.displayedShield = Math.max(0, (this.displayedShield ?? this.controller.currentState.player.shield) + amount);
        } else {
          this.displayedMonsterShield = Math.max(
            0,
            (this.displayedMonsterShield ?? this.controller.currentState.monster.shield) + amount,
          );
        }
        const shieldPoint = this.combatPoint(shieldTarget);
        this.statusLabel?.setText(shieldTarget === 'monster' ? `Quái nhận ${amount} khiên` : `+${amount} khiên`);
        this.floatNumber(`+${amount}`, shieldPoint.x, shieldPoint.y - 50, '#9dceff');
        if (amount > 0) this.playShieldGainEffect(shieldTarget);
        this.refreshDisplayedBars();
        break;
      case 'ENERGY_GAINED':
        const energyTarget = event.payload['target'] === 'monster' ? 'monster' : 'player';
        if (energyTarget === 'player') {
          this.displayedEnergy = Math.min(100, (this.displayedEnergy ?? this.controller.currentState.player.energy) + amount);
        } else {
          this.displayedMonsterEnergy = Math.min(
            DEFAULT_BATTLE_CONFIG.energyCap,
            (this.displayedMonsterEnergy ?? this.controller.currentState.monster.energy) + amount,
          );
        }
        const energyPoint = this.combatPoint(energyTarget);
        this.statusLabel?.setText(energyTarget === 'monster' ? `Quái tích ${amount} năng lượng` : `+${amount} năng lượng`);
        this.floatNumber(`+${amount}`, energyPoint.x, energyPoint.y - 50, '#ffe28c');
        if (amount > 0) this.playEnergyGainEffect(energyTarget);
        this.refreshDisplayedBars();
        break;
      case 'MONSTER_SKILL_USED': {
        const skillId = String(event.payload['skillId'] ?? '');
        if (skillId !== 'lantern_cat_long_mieu_lien_kich') break;
        const skillActionId = String(event.payload['actionId'] ?? '');
        if (skillActionId && skillActionId === this.lastLongMieuVisualId) break;
        this.lastLongMieuVisualId = skillActionId;
        this.displayedMonsterEnergy = this.safeNumber(Number(event.payload['energyRestored'] ?? 10));
        this.displayedEnergy = this.safeNumber(Number(event.payload['playerEnergyAfter'] ?? this.displayedEnergy ?? 0));
        this.countdownLabel?.setColor('#ff7a80').setText('Miêu Đèn đang tung tuyệt kỹ...');
        this.telegraphLabel?.setText('⚡ Miêu Đèn · Long Miêu Liên Kích');
        this.statusLabel?.setText('Miêu Đèn dùng Long Miêu Liên Kích');
        this.playSfx(SFX_KEYS.lanternLongCharge, 0.62);
        this.playMonsterAnimation('attack');
        this.flashMonster(0xd8c2ff);
        this.playLongMieuLienKichEffect();
        this.refreshDisplayedBars();
        break;
      }
      case 'PLAYER_TURN_SKIPPED':
        this.setPlayerControlsEnabled(false);
        this.countdownLabel?.setColor('#d5aaff').setText('Nhân vật bị choáng · mất lượt');
        this.statusLabel?.setText(String(event.payload['label'] ?? 'Nhân vật bị choáng — mất lượt'));
        this.playerStunIcon
          ?.setPosition(this.heroVisual?.x ?? 72, (this.heroVisual?.y ?? 578) - 92)
          .setVisible(true);
        this.tweens.add({
          targets: this.playerStunIcon,
          alpha: { from: 0.55, to: 1 },
          scale: { from: 0.86, to: 1.08 },
          yoyo: true,
          repeat: 2,
          duration: 180,
        });
        break;
      case 'MONSTER_ACTION_SKIPPED':
        if (event.payload['reason'] === 'telegraph') {
          this.countdownLabel?.setColor('#ff7a80').setText('Quái báo đòn mạnh...');
          this.telegraphLabel?.setText(`⚠ ${this.monsterActionText('heavy')}`);
          this.statusLabel?.setText(String(event.payload['label'] ?? 'Quái báo đòn mạnh'));
          this.tweenMonsterTelegraph();
        } else {
          this.statusLabel?.setText(String(event.payload['label'] ?? 'Quái không có ngọc tấn công — không gây sát thương'));
        }
        break;
      case 'POISON_APPLIED':
        if (event.payload['target'] === 'player') {
          const turns = Math.max(0, this.safeNumber(Number(event.payload['turns'] ?? 0)));
          this.displayedPlayerPoisonPotency = Math.max(
            0,
            (this.displayedPlayerPoisonPotency ?? this.controller.currentState.player.poisonPotency) + amount,
          );
          this.displayedPlayerPoisonTurns = turns;
          this.statusLabel?.setText(`NHIỄM ĐỘC! Nhân vật · ${turns} lượt`);
          this.floatNumber(`☠ NHIỄM ĐỘC!`, 80, 104, '#d5aaff', 700);
          const monsterActionId = String(event.payload['actionId'] ?? '');
          if (event.payload['actor'] === 'monster') {
            if (this.controller.currentState.monster.id === 'lantern_cat') {
              this.playSfx(SFX_KEYS.lanternPoisonCast, 0.56);
            }
            if (monsterActionId !== this.lastMonsterActionVisualId) this.playMonsterAnimation('poisonCast');
            this.time.delayedCall(260, () => {
              if (this.controller.currentState.monster.id === 'lantern_cat') {
                this.playSfx(SFX_KEYS.lanternPoisonProjectile, 0.48);
              }
              this.spawnMonsterProjectile(() => {
                this.playPoisonEffect();
                this.playHeroAnimation('hit');
                this.flashHero(0xd5aaff);
                this.shakeHero();
                this.shakePlayerBar();
              }, true);
            });
          } else {
            this.playPoisonEffect();
          }
          this.refreshDisplayedBars();
        } else {
          const turns = Math.max(0, this.safeNumber(Number(event.payload['turns'] ?? 0)));
          this.displayedMonsterPoisonPotency = Math.max(
            0,
            (this.displayedMonsterPoisonPotency ?? this.controller.currentState.monster.poisonPotency) + amount,
          );
          this.displayedMonsterPoisonTurns = turns;
          this.statusLabel?.setText(`NHIỄM ĐỘC! Bụi Sương · ${turns} lượt`);
          this.playPoisonProjectile();
          this.refreshDisplayedBars();
        }
        break;
      case 'POISON_TICKED':
        if (event.payload['target'] === 'player') {
          this.displayedPlayerHp = Math.max(
            0,
            (this.displayedPlayerHp ?? this.controller.currentState.player.currentHp) - amount,
          );
          this.displayedPlayerPoisonTurns = Math.max(0, this.safeNumber(Number(event.payload['remainingTurns'] ?? 0)));
          this.statusLabel?.setText(`☠ Độc gây ${amount} sát thương lên nhân vật`);
          this.floatNumber(`☠ -${amount}`, 80, 104, '#d5aaff');
          this.playPoisonTickEffect('player');
          this.shakeHero();
          this.shakePlayerBar();
        } else {
          this.displayedMonsterHp = Math.max(0, (this.displayedMonsterHp ?? this.controller.currentState.monster.currentHp) - amount);
          this.displayedMonsterPoisonTurns = Math.max(0, this.safeNumber(Number(event.payload['remainingTurns'] ?? 0)));
          this.statusLabel?.setText(`☠ Độc gây ${amount} sát thương lên quái`);
          this.floatNumber(`☠ -${amount}`, 294, 104, '#d5aaff');
          this.playPoisonTickEffect('monster');
        }
        this.refreshDisplayedBars();
        break;
      case 'MONSTER_ATTACKED':
        if (event.payload['target'] !== 'player') return;
        this.hideMonsterGuardEffect();
        const shieldAbsorbed = this.safeNumber(Number(event.payload['shieldAbsorbed'] ?? 0));
        const shieldBroken = Boolean(event.payload['shieldBroken'])
          || (shieldAbsorbed > 0 && this.safeNumber(Number(event.payload['shieldRemaining'] ?? 0)) === 0);
        const attackMatchCount = this.safeNumber(Number(event.payload['matchCount'] ?? 0));
        const attackMatchLabel = attackMatchCount >= 3 ? `X${attackMatchCount} · ` : '';
        const hpDamage = this.safeNumber(Number(event.payload['hpDamage'] ?? Math.max(0, amount - shieldAbsorbed)));
        this.displayedShield = Math.max(
          0,
          (this.displayedShield ?? this.controller.currentState.player.shield) - shieldAbsorbed,
        );
        this.displayedPlayerHp = Math.max(
          0,
          (this.displayedPlayerHp ?? this.controller.currentState.player.currentHp) - hpDamage,
        );
        this.telegraphLabel?.setText(`⚔ ${this.monsterActionText(String(event.payload['action'] ?? 'basic'))}`);
        this.countdownLabel?.setColor('#ff7a80').setText('Quái đang tấn công...');
        this.statusLabel?.setText(
          hpDamage > 0
            ? `${attackMatchLabel}${this.controller.currentState.monster.name} gây ${hpDamage} sát thương${shieldAbsorbed > 0 ? ` · khiên -${shieldAbsorbed}` : ''}`
            : `${attackMatchLabel}${this.controller.currentState.monster.name} đánh vào khiên -${shieldAbsorbed}`,
        );
        this.floatNumber(
          hpDamage > 0 ? `${attackMatchLabel}-${hpDamage} HP` : `${attackMatchLabel}-${shieldAbsorbed} khiên`,
          80,
          59,
          hpDamage > 0 ? '#ff9aa4' : '#9dceff',
        );
        if (shieldBroken) this.playShieldBreakEffect();
        const monsterAction = String(event.payload['action'] ?? 'basic');
        const isPoisonAction = monsterAction === 'poison';
        const monsterId = this.controller.currentState.monster.id;
        if (!isPoisonAction) {
          if (monsterId === 'mist_blob') {
            this.playSfx(SFX_KEYS.mistAttack, 0.5);
          } else if (monsterId === 'lantern_cat') {
            this.playSfx(SFX_KEYS.lanternAttack, 0.56);
          }
        }
        this.lastMonsterActionVisualId = String(event.payload['actionId'] ?? '');
        this.playMonsterAnimation(isPoisonAction ? 'poisonCast' : 'attack');
        // Let the attack pose read first; the projectile launches from the
        // monster's extended strike instead of appearing at the same moment.
        if (!isPoisonAction) this.time.delayedCall(260, () => {
          if (monsterId === 'mist_blob') {
            this.playSfx(SFX_KEYS.mistProjectile, 0.42);
          }
          this.spawnMonsterProjectile(() => {
            if (monsterId === 'lantern_cat') {
              this.playSfx(SFX_KEYS.lanternAttackImpact, 0.56);
            } else if (monsterId === 'mist_blob') {
              this.playSfx(SFX_KEYS.heroHit, 0.52);
            }
            this.playHeroAnimation('hit');
            this.flashHero(0xff7a80);
            this.shakeHero();
            this.shakePlayerBar();
          });
        });
        this.refreshDisplayedBars();
        break;
      case 'MONSTER_GUARDED':
        const shieldGained = this.safeNumber(Number(event.payload['shieldGained'] ?? 0));
        this.countdownLabel?.setColor('#f3c64f').setText(shieldGained > 0 ? 'Quái đang tạo khiên...' : 'Quái đang phòng thủ...');
        this.telegraphLabel?.setText(`◈ ${this.monsterActionText('guard')}`);
        this.statusLabel?.setText(shieldGained > 0 ? `Quái tạo khiên ${shieldGained}` : 'Quái tăng phòng thủ trong 1 lượt');
        if (this.controller.currentState.monster.id === 'lantern_cat') {
          this.playSfx(SFX_KEYS.lanternDefend, 0.54);
        }
        this.playMonsterAnimation('defend');
        this.showMonsterGuardEffect();
        this.tweenMonsterTelegraph();
        break;
      case 'MONSTER_TELEGRAPH':
        this.telegraphLabel?.setText(String(event.payload['text'] ?? `${this.controller.currentState.monster.name} chuẩn bị tấn công`));
        this.tweenMonsterTelegraph();
        break;
      case 'SKILL_USED':
        this.statusLabel?.setText('Đèn Phá Mây!');
        this.playSfx(SFX_KEYS.skillCast, 0.48);
        this.flashMonster(0xcda8ff);
        this.playCloudbreakerEffect();
        break;
      case 'BATTLE_WON':
        this.statusLabel?.setText('Chiến thắng!');
        this.setPlayerControlsEnabled(false);
        this.playerStunIcon?.setVisible(false);
        this.hideMonsterGuardEffect();
        if (this.controller.currentState.monster.id === 'lantern_cat') {
          this.playSfx(SFX_KEYS.lanternDeath, 0.58);
        }
        this.playMonsterAnimation('death');
        this.flashMonster(0xffe7a6);
        break;
      case 'BATTLE_LOST':
        this.statusLabel?.setText('Bạn đã bị đánh bại');
        this.setPlayerControlsEnabled(false);
        this.playerStunIcon?.setVisible(false);
        this.playHeroAnimation('death');
        break;
      case 'BATTLE_ABANDONED':
        this.statusLabel?.setText('Đã bỏ trận');
        this.setPlayerControlsEnabled(false);
        break;
      case 'SWAP_REJECTED':
        this.statusLabel?.setText(this.swapRejectedText(String(event.payload['reason'] ?? 'no-match')));
        break;
      default:
        break;
    }
  }

  private shakeMonster(): void {
    if (!this.monsterVisual) return;
    this.tweens.add({ targets: this.monsterVisual, x: this.monsterVisual.x + 4, yoyo: true, repeat: 2, duration: 45 });
    this.cameras.main.shake(80, 0.002);
  }

  private shakeHero(): void {
    if (!this.heroVisual) return;
    this.tweens.add({ targets: this.heroVisual, x: this.heroVisual.x + 5, yoyo: true, repeat: 3, duration: 42 });
  }

  private shakePlayerBar(): void {
    if (!this.playerBar) return;
    this.tweens.add({ targets: this.playerBar, x: 4, yoyo: true, repeat: 2, duration: 45 });
    this.cameras.main.shake(80, 0.002);
  }

  private tweenMonsterTelegraph(): void {
    if (!this.monsterVisual) return;
    this.tweens.add({ targets: this.monsterVisual, scale: 1.12, yoyo: true, duration: 180 });
  }

  private flashMonster(color: number): void {
    if (this.monsterArt) {
      this.monsterArt.setTint(color);
      this.time.delayedCall(180, () => this.monsterArt?.clearTint());
      return;
    }
    if (!this.monsterBody) return;
    this.monsterBody.setFillStyle(color, 1);
    this.time.delayedCall(180, () => this.monsterBody?.setFillStyle(0x8b9bc7, 1));
  }

  private playMonsterAnimation(action: 'attack' | 'defend' | 'poisonCast' | 'hit' | 'death'): void {
    const sprite = this.monsterSprite;
    const keys = this.monsterSpriteKeys();
    const animationKey = keys?.[action];
    if (!sprite || !animationKey || !this.anims.exists(animationKey)) return;

    sprite.stop();
    if (action === 'attack') {
      sprite.setDisplaySize(
        (keys?.displayWidth ?? 84) * 1.12,
        (keys?.displayHeight ?? 84) * 1.12,
      );
    }
    sprite.play(animationKey);
    if (action === 'death') return;

    sprite.once(`animationcomplete-${animationKey}`, () => {
      if (action === 'attack') {
        sprite.setDisplaySize(keys?.displayWidth ?? 84, keys?.displayHeight ?? 84);
      }
      if (this.monsterSprite === sprite && keys && this.anims.exists(keys.idle)) {
        sprite.play(keys.idle);
      }
    });
  }

  private playHeroAnimation(key: 'attack' | 'hit' | 'death'): void {
    const sprite = this.heroSprite;
    const animationKey = this.heroSpriteKeys[key];
    if (!sprite || !this.anims.exists(animationKey)) return;

    sprite.stop();
    if (key === 'attack') sprite.setDisplaySize(102, 102);
    sprite.play(animationKey);
    if (key === 'death') return;

    sprite.once(`animationcomplete-${animationKey}`, () => {
      if (key === 'attack') sprite.setDisplaySize(84, 84);
      if (this.heroSprite === sprite && this.anims.exists(this.heroSpriteKeys.idle)) {
        sprite.play(this.heroSpriteKeys.idle);
      }
    });
  }

  private spawnHeroProjectile(onImpact?: () => void): void {
    const start = {
      x: (this.heroVisual?.x ?? 72) + 28,
      y: (this.heroVisual?.y ?? 578) - 42,
    };
    const target = {
      x: (this.monsterVisual?.x ?? 294) - 20,
      y: (this.monsterVisual?.y ?? 145) - 24,
    };
    this.spawnTravelTrail(start, target, 0x9ed8ff, 320);
    if (!this.heroVisual || !this.monsterVisual || !this.textures.exists(this.heroSpriteKeys.projectile)) {
      this.spawnCombatImpact(target.x, target.y, 0x9ed8ff, 48);
      onImpact?.();
      return;
    }
    const projectile = this.add
      .image(start.x, start.y, this.heroSpriteKeys.projectile)
      .setDisplaySize(58, 58)
      .setRotation(-0.2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(13);
    this.transientEffects.add(projectile);
    this.tweens.add({
      targets: projectile,
      x: target.x,
      y: target.y,
      scale: 0.55,
      alpha: 0.15,
      rotation: 0.35,
      duration: 320,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.destroyTransientEffect(projectile);
        this.spawnCombatImpact(target.x, target.y, 0x9ed8ff, 48);
        onImpact?.();
      },
    });
  }

  private spawnMonsterProjectile(onImpact?: () => void, poison = false): void {
    const start = {
      x: (this.monsterVisual?.x ?? 294) - 22,
      y: (this.monsterVisual?.y ?? 145) + 6,
    };
    const target = {
      x: this.heroVisual?.x ?? 72,
      y: (this.heroVisual?.y ?? 578) - 40,
    };
    const color = poison ? 0xd5aaff : this.controller.currentState.monster.id === 'lantern_cat' ? 0xffd45e : 0x8ff3ff;
    const textureKey = !poison && this.controller.currentState.monster.id === 'mist_blob' && this.textures.exists('mist-dust-hit-impact')
      ? 'mist-dust-hit-impact'
      : undefined;
    this.spawnTravelTrail(start, target, color, poison ? 360 : 420);
    const projectile = textureKey
      ? this.add
        .sprite(start.x, start.y, textureKey, 0)
        .setOrigin(0.5)
        .setDisplaySize(62, 62)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(14)
        .setRotation(Phaser.Math.Angle.Between(start.x, start.y, target.x, target.y))
      : this.add
        .circle(start.x, start.y, poison ? 7 : 6, color, 0.84)
        .setStrokeStyle(2, 0xfff0ad, 0.8)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(14);
    this.transientEffects.add(projectile);
    this.tweens.add({
      targets: projectile,
      x: target.x,
      y: target.y,
      scale: poison ? 0.7 : 1.35,
      rotation: textureKey ? projectile.rotation + Math.PI * 0.7 : 0,
      duration: poison ? 360 : 420,
      ease: 'Cubic.In',
      onComplete: () => {
        this.destroyTransientEffect(projectile);
        if (textureKey) this.spawnVfx(textureKey, target.x, target.y, 76, 14);
        this.spawnCombatImpact(target.x, target.y, color, poison ? 58 : 56);
        onImpact?.();
      },
    });
  }

  private spawnTravelTrail(
    start: { readonly x: number; readonly y: number },
    target: { readonly x: number; readonly y: number },
    color: number,
    duration: number,
  ): void {
    for (let index = 0; index < 2; index += 1) {
      const trail = this.add
        .circle(start.x, start.y, index === 0 ? 4 : 3, color, 0.72)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(13);
      this.transientEffects.add(trail);
      this.tweens.add({
        targets: trail,
        x: target.x,
        y: target.y,
        scale: 0.15,
        alpha: 0,
        delay: index * 42,
        duration,
        ease: 'Cubic.Out',
        onComplete: () => this.destroyTransientEffect(trail),
      });
    }
  }

  private spawnCombatImpact(x: number, y: number, color: number, size: number): void {
    const ring = this.add
      .circle(x, y, size * 0.24, color, 0.18)
      .setStrokeStyle(3, color, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(15);
    this.transientEffects.add(ring);
    this.tweens.add({
      targets: ring,
      scale: 1.8,
      alpha: 0,
      duration: 220,
      ease: 'Quad.Out',
      onComplete: () => this.destroyTransientEffect(ring),
    });
    this.spawnGemParticles(x, y, color);
  }

  private combatPoint(target: 'player' | 'monster'): { readonly x: number; readonly y: number } {
    return target === 'monster'
      ? { x: this.monsterVisual?.x ?? 294, y: (this.monsterVisual?.y ?? 145) + MONSTER_COMBAT_Y_OFFSET }
      : { x: this.heroVisual?.x ?? 72, y: (this.heroVisual?.y ?? 578) - 40 };
  }

  private flashCombatant(target: 'player' | 'monster', color: number): void {
    if (target === 'monster') {
      this.flashMonster(color);
    } else {
      this.flashHero(color);
    }
  }

  private playHealEffect(target: 'player' | 'monster' = 'player'): void {
    const { x, y } = this.combatPoint(target);
    const ring = this.add
      .circle(x, y, 18, 0x8ff0ad, 0.12)
      .setStrokeStyle(3, 0x8ff0ad, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(15);
    this.transientEffects.add(ring);
    this.tweens.add({
      targets: ring,
      scale: 1.8,
      alpha: 0,
      duration: 360,
      ease: 'Cubic.Out',
      onComplete: () => this.destroyTransientEffect(ring),
    });
    this.spawnGemParticles(x, y, 0x8ff0ad);
    this.flashCombatant(target, 0x8ff0ad);
  }

  private playEnergyThresholdEffect(): void {
    this.statusLabel?.setText('Năng lượng vượt 50 · Sức mạnh bộc phát');
  }

  private playEnergyGainEffect(target: 'player' | 'monster'): void {
    const { x, y } = this.combatPoint(target);
    this.spawnCombatImpact(x, y, 0xffd45e, target === 'monster' ? 62 : 72);
    this.flashCombatant(target, 0xffd45e);
  }

  private playCloudbreakerEffect(): void {
    const start = this.combatPoint('player');
    const target = this.combatPoint('monster');
    this.spawnVfx(SKILL_VFX_KEYS.castCircle, start.x, start.y, 112, 12);
    this.spawnVfx(SKILL_VFX_KEYS.chargeAura, start.x, start.y, 100, 13);
    this.spawnVfx(SKILL_VFX_KEYS.swordGlow, start.x + 12, start.y - 8, 96, 14);

    this.time.delayedCall(180, () => {
      if (!this.textures.exists(SKILL_VFX_KEYS.projectile) || !this.anims.exists(SKILL_VFX_KEYS.projectile)) {
        this.spawnVfx(SKILL_VFX_KEYS.impact, target.x, target.y, 132, 15);
        return;
      }

      const projectile = this.add
        .sprite(start.x + 22, start.y - 16, SKILL_VFX_KEYS.projectile, 0)
        .setOrigin(0.5)
        .setDisplaySize(92, 92)
        .setRotation(Phaser.Math.Angle.Between(start.x, start.y, target.x, target.y))
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(15)
        .play(SKILL_VFX_KEYS.projectile);
      this.playSfx(SFX_KEYS.skillRelease, 0.5);
      this.transientEffects.add(projectile);
      this.tweens.add({
        targets: projectile,
        x: target.x,
        y: target.y,
        scale: 1.18,
        alpha: 0.9,
        duration: 420,
        ease: 'Cubic.In',
        onComplete: () => {
          this.destroyTransientEffect(projectile);
          this.playSfx(SFX_KEYS.skillImpact, 0.56);
          this.spawnVfx(SKILL_VFX_KEYS.cloudSplit, target.x, target.y, 150, 15);
          this.spawnVfx(SKILL_VFX_KEYS.impact, target.x, target.y, 132, 16);
          this.spawnVfx(SKILL_VFX_KEYS.spark, target.x, target.y, 108, 17);
          this.time.delayedCall(100, () => {
            this.spawnVfx(SKILL_VFX_KEYS.finishFlash, target.x, target.y, 156, 18);
          });
        },
      });
    });
  }

  private playLongMieuLienKichEffect(): void {
    const start = this.combatPoint('monster');
    const target = this.combatPoint('player');
    const angle = Phaser.Math.Angle.Between(start.x, start.y, target.x, target.y);
    if (this.textures.exists(LANTERN_SKILL_VFX_KEYS.icon)) {
      const skillIcon = this.add
        .image(start.x, start.y - 66, LANTERN_SKILL_VFX_KEYS.icon)
        .setDisplaySize(32, 32)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(17);
      this.transientEffects.add(skillIcon);
      this.tweens.add({
        targets: skillIcon,
        y: start.y - 84,
        alpha: 0,
        scale: 1.25,
        duration: this.reducedMotion ? 280 : 520,
        ease: 'Cubic.Out',
        onComplete: () => this.destroyTransientEffect(skillIcon),
      });
    }
    this.spawnVfxSized(
      LANTERN_SKILL_VFX_KEYS.castCircle,
      start.x,
      start.y,
      92,
      138,
      12,
    );

    this.scheduleLongMieu(this.reducedMotion ? 90 : 180, () => {
      if (!this.textures.exists(LANTERN_SKILL_VFX_KEYS.multiStrike)
        || !this.anims.exists(LANTERN_SKILL_VFX_KEYS.multiStrike)) {
        this.spawnLongMieuImpact(target.x, target.y);
        return;
      }
      const strike = this.add
        .sprite(start.x, start.y, LANTERN_SKILL_VFX_KEYS.multiStrike, 0)
        .setOrigin(0.5)
        .setDisplaySize(78, 117)
        .setRotation(angle)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(14)
        .play(LANTERN_SKILL_VFX_KEYS.multiStrike);
      this.transientEffects.add(strike);
      this.playSfx(SFX_KEYS.lanternLongDash, 0.56);
      this.tweens.add({
        targets: strike,
        x: target.x,
        y: target.y,
        scale: 1.15,
        duration: this.reducedMotion ? 300 : 420,
        ease: 'Cubic.In',
        onComplete: () => {
          this.destroyTransientEffect(strike);
          if (this.reducedMotion) {
            this.spawnLongMieuImpact(target.x, target.y);
          } else {
            this.playLongMieuStrikes(target.x, target.y, angle);
          }
        },
      });
    });
  }

  private playLongMieuStrikes(x: number, y: number, angle: number): void {
    const offsets = [
      { x: -8, y: -8 },
      { x: 8, y: 0 },
      { x: 0, y: 8 },
    ];
    offsets.forEach((offset, index) => {
      this.scheduleLongMieu(index * 150, () => {
        this.spawnLongMieuStrike(x + offset.x, y + offset.y, angle);
        this.spawnCombatImpact(x + offset.x, y + offset.y, 0xd5aaff, 38);
      });
    });
    this.scheduleLongMieu(480, () => this.spawnLongMieuImpact(x, y));
  }

  private spawnLongMieuStrike(x: number, y: number, angle: number): void {
    if (!this.textures.exists(LANTERN_SKILL_VFX_KEYS.multiStrike)
      || !this.anims.exists(LANTERN_SKILL_VFX_KEYS.multiStrike)) return;
    const strike = this.add
      .sprite(x, y, LANTERN_SKILL_VFX_KEYS.multiStrike, 0)
      .setOrigin(0.5)
      .setDisplaySize(58, 87)
      .setRotation(angle)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(16)
      .setScale(0.8)
      .play(LANTERN_SKILL_VFX_KEYS.multiStrike);
    this.transientEffects.add(strike);
    this.tweens.add({
      targets: strike,
      scale: 1.08,
      alpha: 0.2,
      duration: 135,
      ease: 'Cubic.Out',
    });
    this.scheduleLongMieu(150, () => this.destroyTransientEffect(strike));
  }

  private spawnLongMieuImpact(x: number, y: number): void {
    this.playSfx(SFX_KEYS.lanternLongImpact, 0.62);
    this.playSfx(SFX_KEYS.lanternLongStun, 0.58);
    this.spawnVfxSized(LANTERN_SKILL_VFX_KEYS.impactStun, x, y, 94, 141, 16);
    this.spawnCombatImpact(x, y, 0xd5aaff, 70);
    this.flashHero(0xd5aaff);
    this.playHeroAnimation('hit');
    this.playerStunIcon
      ?.setPosition(this.heroVisual?.x ?? 72, (this.heroVisual?.y ?? 578) - 92)
      .setAlpha(0.95)
      .setVisible(true);
    if (!this.reducedMotion) {
      this.shakeHero();
      this.shakePlayerBar();
    }
  }

  private scheduleLongMieu(delay: number, callback: () => void): void {
    let timer: Phaser.Time.TimerEvent;
    timer = this.time.delayedCall(delay, () => {
      this.longMieuTimers.delete(timer);
      callback();
    });
    this.longMieuTimers.add(timer);
  }

  private playShieldGainEffect(target: 'player' | 'monster' = 'player'): void {
    const { x, y } = this.combatPoint(target);
    if (target === 'monster') {
      this.monsterGuardVisual?.setPosition(x, y).setVisible(true).setAlpha(0.72);
    } else {
      this.heroShieldVisual?.setPosition(x, y).setVisible(true).setAlpha(0.72);
    }
    this.spawnCombatImpact(x, y, 0x9dceff, 58);
    this.flashCombatant(target, 0x9dceff);
  }

  private playShieldBreakEffect(target: 'player' | 'monster' = 'player'): void {
    const { x, y } = this.combatPoint(target);
    if (target === 'monster') {
      this.monsterGuardActive = false;
      this.monsterGuardVisual?.setVisible(false).setAlpha(0);
    } else {
      this.heroShieldVisual?.setVisible(false).setAlpha(0);
    }

    // The persistent shield is removed first, then a short shatter effect
    // makes it clear that the hit broke the shield rather than dealing HP
    // damage silently.
    const color = target === 'monster' ? 0xd8c2ff : 0x9dceff;
    const ring = this.add
      .circle(x, y, 22, color, 0.08)
      .setStrokeStyle(3, color, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(16);
    this.transientEffects.add(ring);
    this.tweens.add({
      targets: ring,
      scale: 1.65,
      alpha: 0,
      duration: 260,
      ease: 'Cubic.Out',
      onComplete: () => this.destroyTransientEffect(ring),
    });

    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 8 + Phaser.Math.FloatBetween(-0.12, 0.12);
      const shard = this.add
        .rectangle(x, y, 3, 12, color, 0.95)
        .setRotation(angle)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(16);
      this.transientEffects.add(shard);
      const distance = Phaser.Math.Between(32, 48);
      this.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        rotation: angle + Phaser.Math.FloatBetween(-0.8, 0.8),
        scale: 0.25,
        alpha: 0,
        duration: Phaser.Math.Between(260, 360),
        ease: 'Cubic.Out',
        onComplete: () => this.destroyTransientEffect(shard),
      });
    }

    this.spawnCombatImpact(x, y, color, 64);
    if (target === 'monster') {
      this.shakeMonster();
    } else {
      this.shakePlayerBar();
    }
  }

  private playPoisonEffect(): void {
    const x = this.heroVisual?.x ?? 72;
    const y = (this.heroVisual?.y ?? 578) - 40;
    this.heroPoisonVisual?.setPosition(x, y).setVisible(true).setAlpha(0.8);
    this.spawnCombatImpact(x, y, 0xd5aaff, 54);
    this.flashHero(0xd5aaff);
    this.spawnPoisonSmoke(x, y);
  }

  private playPoisonProjectile(): void {
    const start = {
      x: BOARD_LEFT + BOARD_WIDTH / 2,
      y: BOARD_TOP + BOARD_WIDTH / 2,
    };
    const target = this.combatPoint('monster');
    const direction = Phaser.Math.Angle.Between(start.x, start.y, target.x, target.y);
    this.spawnTravelTrail(start, target, 0xd5aaff, 360);
    const projectile = this.add
      .circle(start.x, start.y, 7, 0xd5aaff, 0.86)
      .setStrokeStyle(2, 0xf0d7ff, 0.9)
      .setRotation(direction)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(15);
    this.transientEffects.add(projectile);
    this.tweens.add({
      targets: projectile,
      x: target.x,
      y: target.y,
      scale: 0.65,
      alpha: 0.2,
      duration: 360,
      ease: 'Cubic.In',
      onComplete: () => {
        this.destroyTransientEffect(projectile);
        this.spawnCombatImpact(target.x, target.y, 0xd5aaff, 58);
        this.flashMonster(0xd5aaff);
        this.monsterPoisonVisual?.setPosition(target.x, target.y).setVisible(true).setAlpha(0.82);
        this.floatNumber(`☠ NHIỄM ĐỘC!`, target.x, target.y - 48, '#d5aaff', 700);
        this.spawnPoisonSmoke(target.x, target.y);
      },
    });
  }

  private playPoisonTickEffect(target: 'player' | 'monster'): void {
    const point = this.combatPoint(target);
    if (target === 'player') {
      this.heroPoisonVisual?.setPosition(point.x, point.y).setVisible(true).setAlpha(0.86);
    } else {
      this.monsterPoisonVisual?.setPosition(point.x, point.y).setVisible(true).setAlpha(0.86);
    }
    this.spawnCombatImpact(point.x, point.y, 0xd5aaff, target === 'monster' ? 54 : 48);
    this.flashCombatant(target, 0xd5aaff);
    this.spawnPoisonSmoke(point.x, point.y);
  }

  private spawnPoisonSmoke(x: number, y: number): void {
    for (let index = 0; index < 2; index += 1) {
      const wisp = this.add
        .circle(x + Phaser.Math.Between(-24, 24), y + Phaser.Math.Between(-18, 24), Phaser.Math.Between(2, 4), 0xd5aaff, 0.76)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(16);
      this.transientEffects.add(wisp);
      this.tweens.add({
        targets: wisp,
        y: y - Phaser.Math.Between(24, 42),
        x: wisp.x + Phaser.Math.Between(-10, 10),
        scale: 0.2,
        alpha: 0,
        duration: Phaser.Math.Between(360, 520),
        ease: 'Sine.Out',
        onComplete: () => this.destroyTransientEffect(wisp),
      });
    }
  }

  private showMonsterGuardEffect(): void {
    const { x, y } = this.combatPoint('monster');
    this.monsterGuardActive = true;
    this.playShieldGainEffect('monster');
    this.monsterGuardVisual?.setPosition(x, y).setVisible(true).setAlpha(0.72);
  }

  private hideMonsterGuardEffect(): void {
    this.monsterGuardActive = false;
    this.monsterGuardVisual?.setVisible(false).setAlpha(0);
  }

  private flashHero(color: number): void {
    if (!this.heroSprite) return;
    this.heroSprite.setTint(color);
    this.time.delayedCall(180, () => this.heroSprite?.clearTint());
  }

  private monsterActionText(action: string): string {
    const labels: Record<string, string> = {
      basic: 'Đánh thường',
      guard: 'Phòng thủ',
      heavy: 'Đòn nặng',
      poison: 'Gieo độc',
      telegraph: 'Báo đòn mạnh',
      long_mieu_lien_kich: 'Long Miêu Liên Kích',
    };
    return `${this.controller.currentState.monster.name} · ${labels[action] ?? 'Hành động'}`;
  }

  private gemAt(coord: Coord): string {
    return this.gemName(this.controller.currentState.board[coord.row][coord.col]);
  }

  private gemName(gem: string): string {
    const names: Record<GemType, string> = {
      attack: 'ngọc kiếm',
      heal: 'ngọc hồi phục',
      shield: 'ngọc khiên',
      energy: 'ngọc năng lượng',
      poison: 'ngọc độc',
    };
    return GEM_TYPES.includes(gem as GemType) ? names[gem as GemType] : gem;
  }

  private syncTurnTimer(): void {
    if (this.controller.currentState.phase !== 'PLAYER_READY' || this.controller.isLocked) {
      this.stopTurnTimer();
      this.setPlayerControlsEnabled(false);
      return;
    }
    this.stopMonsterCountdown();
    this.stopTurnTimer();
    this.stopMoveHint();
    this.remainingSeconds = DEFAULT_BATTLE_CONFIG.playerTurnSeconds;
    this.updateCountdownLabel();
    this.setPlayerControlsEnabled(true);
    this.turnTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (!this.canPlayerAct()) return;
        this.remainingSeconds -= 1;
        this.updateCountdownLabel();
        if (this.remainingSeconds <= 5) this.showMoveHint();
        if (this.remainingSeconds <= 0) void this.dispatchTimeout();
      },
    });
  }

  private stopTurnTimer(): void {
    this.turnTimer?.remove(false);
    this.turnTimer = undefined;
    this.stopMoveHint();
  }

  private showMoveHint(): void {
    if (this.hintActive || !this.canPlayerAct() || this.selectedCell) return;
    const move = findLegalMoves(this.controller.currentState.board, DEFAULT_BATTLE_CONFIG.match3)[0];
    if (!move) return;

    this.positionMarker(this.hintMoveFrom, move.from);
    this.positionMarker(this.hintMoveTo, move.to);
    this.hintActive = true;
    this.statusLabel?.setText('Gợi ý: đổi hai ngọc đang nhấp nháy');
    this.tweens.add({
      targets: [this.hintMoveFrom, this.hintMoveTo],
      alpha: { from: 0.25, to: 1 },
      scaleX: { from: 0.92, to: 1.08 },
      scaleY: { from: 0.92, to: 1.08 },
      yoyo: true,
      repeat: -1,
      duration: 360,
      ease: 'Sine.InOut',
    });
  }

  private stopMoveHint(): void {
    if (!this.hintActive && !this.hintMoveFrom?.visible && !this.hintMoveTo?.visible) return;
    this.tweens.killTweensOf([this.hintMoveFrom, this.hintMoveTo]);
    this.hintMoveFrom?.setVisible(false).setAlpha(1).setScale(1);
    this.hintMoveTo?.setVisible(false).setAlpha(1).setScale(1);
    this.hintActive = false;
  }

  private startMonsterCountdown(seconds: number): void {
    this.stopTurnTimer();
    this.stopMonsterCountdown();
    this.setPlayerControlsEnabled(false);
    this.monsterRemainingMs = Math.max(0, seconds * 1000);
    this.updateMonsterCountdownLabel();
    this.monsterCountdownTimer = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        this.monsterRemainingMs = Math.max(0, this.monsterRemainingMs - 100);
        this.updateMonsterCountdownLabel();
        if (this.monsterRemainingMs <= 0) {
          this.stopMonsterCountdown();
          this.countdownLabel?.setColor('#f3c64f').setText('Quái đang ra đòn...');
        }
      },
    });
  }

  private stopMonsterCountdown(): void {
    this.monsterCountdownTimer?.remove(false);
    this.monsterCountdownTimer = undefined;
    this.monsterRemainingMs = 0;
  }

  private updateMonsterCountdownLabel(): void {
    const seconds = Math.ceil(this.monsterRemainingMs / 100) / 10;
    const color = seconds <= 1 ? '#ff7a80' : '#f3c64f';
    this.countdownLabel?.setColor(color).setText(`Quái đánh sau: ${seconds.toFixed(1)} giây`);
  }

  private updateCountdownLabel(): void {
    const color = this.remainingSeconds <= 3 ? '#ff7a80' : '#f3c64f';
    this.countdownLabel?.setColor(color).setText(`Thời gian: ${Math.max(0, this.remainingSeconds)} giây`);
  }

  private showMonsterMove(from: Coord, to: Coord): void {
    this.positionMarker(this.monsterMoveFrom, from);
    this.positionMarker(this.monsterMoveTo, to);
  }

  private hideMonsterMove(): void {
    this.monsterMoveFrom?.setVisible(false);
    this.monsterMoveTo?.setVisible(false);
  }

  private positionMarker(marker: Phaser.GameObjects.Rectangle | undefined, coord: Coord): void {
    marker?.setPosition(
      BOARD_LEFT + coord.col * CELL_SIZE + CELL_SIZE / 2,
      BOARD_TOP + coord.row * CELL_SIZE + CELL_SIZE / 2,
    ).setVisible(true);
  }

  private coordFromPayload(value: unknown): Coord | undefined {
    if (typeof value !== 'object' || value === null) return undefined;
    const coord = value as { row?: unknown; col?: unknown };
    return typeof coord.row === 'number' && typeof coord.col === 'number'
      ? { row: coord.row, col: coord.col }
      : undefined;
  }

  private swapRejectedText(reason: string): string {
    if (reason === 'not-adjacent') return 'Chỉ được đổi hai ngọc kề nhau';
    if (reason === 'outside-board') return 'Ngọc đã chọn nằm ngoài bàn';
    if (reason === 'phase-locked') return 'Đang xử lý lượt trước';
    return 'Hai ngọc này chưa tạo nhóm 3 — chưa mất lượt';
  }

  private canPlayerAct(): boolean {
    return !this.controller.isLocked && this.controller.currentState.phase === 'PLAYER_READY';
  }

  private setPlayerControlsEnabled(
    enabled: boolean,
    skillReady = this.controller.currentState.player.energy >= DEFAULT_BATTLE_CONFIG.energyCap,
  ): void {
    if (this.skillButton?.input) {
      this.skillButton.input.enabled = enabled && skillReady;
    }
    if (this.abandonButton?.input) {
      this.abandonButton.input.enabled = enabled;
    }
  }

  private floatNumber(text: string, x: number, y: number, color: string, duration = 550): void {
    const popup = this.add
      .text(x, y, text, { color, fontSize: '16px', fontStyle: 'bold' })
      .setResolution(this.renderQuality)
      .setOrigin(0.5);
    this.tweens.add({ targets: popup, y: y - 30, alpha: 0, duration, onComplete: () => popup.destroy() });
  }

  private cellFromPoint(x: number, y: number): Coord | undefined {
    const col = Math.floor((x - BOARD_LEFT) / CELL_SIZE);
    const row = Math.floor((y - BOARD_TOP) / CELL_SIZE);
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return undefined;
    return { row, col };
  }

  private renderSelection(): void {
    if (!this.selectedCell) {
      this.selection?.setVisible(false);
      this.selectionRing?.setVisible(false);
      return;
    }
    const x = BOARD_LEFT + this.selectedCell.col * CELL_SIZE + CELL_SIZE / 2;
    const y = BOARD_TOP + this.selectedCell.row * CELL_SIZE + CELL_SIZE / 2;
    this.selection?.setPosition(x, y).setVisible(!this.selectionRing);
    this.selectionRing?.setPosition(x, y).setVisible(true);
  }

  private spawnMatchBurst(coords: readonly Coord[]): void {
    if (coords.length < 3) return;
    const key = coords.length >= 5
      ? VFX_SHEET_KEYS.match5
      : coords.length === 4
        ? VFX_SHEET_KEYS.match4
        : VFX_SHEET_KEYS.match3;
    if (coords.length >= 5) {
      const center = coords.reduce(
        (result, coord) => ({ row: result.row + coord.row, col: result.col + coord.col }),
        { row: 0, col: 0 },
      );
      this.spawnVfx(
        key,
        BOARD_LEFT + (center.col / coords.length + 0.5) * CELL_SIZE,
        BOARD_TOP + (center.row / coords.length + 0.5) * CELL_SIZE,
        84,
      );
      return;
    }
    for (const coord of coords) {
      this.spawnVfx(
        key,
        BOARD_LEFT + coord.col * CELL_SIZE + CELL_SIZE / 2,
        BOARD_TOP + coord.row * CELL_SIZE + CELL_SIZE / 2,
        62,
      );
    }
  }

  private coordsFromPayload(value: unknown): Coord[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((entry) => this.coordFromPayload(entry))
      .filter((coord): coord is Coord => coord !== undefined);
  }

  private boardPoint(coord: Coord): { readonly x: number; readonly y: number } {
    return {
      x: BOARD_LEFT + coord.col * CELL_SIZE + CELL_SIZE / 2,
      y: BOARD_TOP + coord.row * CELL_SIZE + CELL_SIZE / 2,
    };
  }

  private durationForEvent(event: GameEvent): number {
    switch (event.type) {
      case 'SWAP_STARTED': return 160;
      case 'MATCH_FOUND': return 180;
      case 'GEMS_CLEARED': return 520;
      case 'DAMAGE_APPLIED':
        return event.payload['target'] === 'monster' ? 560 : 360;
      case 'HEAL_APPLIED': return 360;
      case 'POISON_APPLIED': return event.payload['target'] === 'monster' ? 720 : 420;
      case 'POISON_TICKED': return 520;
      case 'GEMS_FALLING': return GEM_FALL_DURATION;
      case 'GEMS_REFILLED': return GEM_REFILL_DURATION;
      case 'MONSTER_ATTACKED': return event.payload['lethal'] === true ? 1400 : 1000;
      case 'MONSTER_ACTION_SKIPPED': return 260;
      case 'MONSTER_GUARDED': return 260;
      case 'MONSTER_SKILL_USED': return this.reducedMotion ? 650 : 1150;
      case 'PLAYER_TURN_SKIPPED': return 700;
      case 'MONSTER_THINKING': return Number(event.payload['seconds'] ?? 1.2) * 1000;
      case 'MONSTER_MOVE_SELECTED': return 500;
      case 'MONSTER_SWAP_STARTED': return 220;
      case 'MONSTER_SWAP_RESOLVED': return 100;
      case 'TURN_TIMED_OUT': return 500;
      case 'BATTLE_WON': return 1000;
      case 'BATTLE_LOST': return 1300;
      case 'BATTLE_ABANDONED': return 500;
      default: return 80;
    }
  }

  private wait(duration: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(duration, resolve));
  }

  private isBoard(value: unknown): value is Board {
    return (
      Array.isArray(value) &&
      value.length === BOARD_SIZE &&
      value.every((row) => Array.isArray(row) && row.length === BOARD_SIZE && row.every((gem) => GEM_TYPES.includes(gem)))
    );
  }

  private isPartialBoard(value: unknown): value is ReadonlyArray<ReadonlyArray<GemType | undefined>> {
    return (
      Array.isArray(value) &&
      value.length === BOARD_SIZE &&
      value.every((row) => Array.isArray(row) && row.length === BOARD_SIZE && row.every((gem) => gem === undefined || GEM_TYPES.includes(gem)))
    );
  }

  private cleanup(): void {
    this.scale.off('resize', this.resizeBattleBackground, this);
    this.scale.off('resize', this.positionAbandonButton, this);
    this.input.off('pointerdown', this.onPointerDown, this);
    this.input.off('pointerup', this.onPointerUp, this);
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.controller?.attachEventPlayer(undefined);
    this.stopTurnTimer();
    this.stopMonsterCountdown();
    for (const timer of this.longMieuTimers) timer.remove(false);
    this.longMieuTimers.clear();
    this.hideMonsterMove();
    this.selectionRing?.destroy();
    this.selectionRing = undefined;
    for (const fx of this.vfxSprites) fx.destroy();
    this.vfxSprites.clear();
    for (const effect of this.transientEffects) effect.destroy();
    this.transientEffects.clear();
    this.gemSprites.clear();
  }
}
