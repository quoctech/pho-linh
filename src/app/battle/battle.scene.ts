import Phaser from 'phaser';
import { actorFrameKey, normalizeActorSprite, type ActorFrameId } from './actor-frame-assets';
import {
  areAdjacent,
  CHARACTER_DATA,
  DEFAULT_BATTLE_CONFIG,
  findLegalMoves,
  type Board,
  type BattleState,
  type Coord,
  type GameEvent,
  type GemType,
  type ElementId,
} from '../../game-core';
import { BattleController, type BattleEventPlayer } from './battle.controller';
import {
  LANTERN_CAT_SPRITE_KEYS,
  ensureLanternCatAnimations,
  preloadLanternCatSprites,
} from './monsters/lantern-cat/lantern-cat-assets';
import { LanternCatVfx } from './monsters/lantern-cat/lantern-cat-vfx';
import {
  BAMBOO_MANTIS_SPRITE_KEYS,
  ensureBambooMantisAnimations,
  preloadBambooMantisSprites,
} from './monsters/bamboo-mantis/bamboo-mantis-assets';
import {
  CLOUD_FOX_SPRITE_KEYS,
  ensureCloudFoxAnimations,
  preloadCloudFoxSprites,
} from './monsters/cloud-fox/cloud-fox-assets';
import {
  MIST_DUST_SPRITE_KEYS,
  ensureMistDustAnimations,
  preloadMistDustSprites,
} from './monsters/mist-dust/mist-dust-assets';
import { createBattleLayout, type BattleLayout } from './battle-layout';
import {
  getHeroHpBand,
  getHeroPersistentStatus,
  type HeroHpBand,
  type HeroPersistentStatus,
  type HeroStatusSnapshot,
} from './hero-status-vfx';
import { preloadStatusUiAssets, ensureStatusUiAnimations } from './status/status-ui-assets';
import { StatusUiVfx } from './status/status-ui-vfx';
import { BattleVfxPool, GemVisualPool, type VfxQualityTier } from './battle-visual-pools';
import {
  MONSTER_SKILL_EFFECTS,
  ensureMonsterSkillEffectAnimations,
  preloadMonsterSkillEffects,
  type MonsterSkillEffectId,
} from './monster-skill-effect-assets';
import {
  ensureMonsterBasicAttackAnimation,
  monsterBasicAttackForMonster,
  preloadMonsterBasicAttack,
  type TestMonsterId,
} from './monster-basic-attack-assets';
import {
  HERO_ASSETS_AVAILABLE,
  HERO_ELEMENT_SPRITE_KEYS,
  HERO_FEMALE_ELEMENT_SPRITE_KEYS,
  HERO_ELEMENTS_AVAILABLE,
  HERO_SPRITE_KEYS,
  HERO_DISPLAY_HEIGHT,
  HERO_DISPLAY_WIDTH,
  HERO_DISPLAY_ORIGIN_Y,
  heroActorForAnimation,
  heroAnimationTextureKey,
  heroSkillAnimationKey,
  ensureHeroAnimations,
  heroSfxKey,
  preloadHeroAssets,
  type HeroGender,
  type HeroElement,
  type HeroSfxName,
  type HeroSpriteKeys,
  type HeroTransientAnimation,
} from './hero-assets';
import {
  ELEMENT_SKILL_CONFIG,
  elementSkillIconFrameKeys,
  fitSkillIconDisplaySize,
  getElementSkillVisualState,
  ensureElementSkillAnimations,
  preloadElementSkillAssets,
  skillIconKey,
  type ElementActiveSkillSlot,
  type ElementSkillSlot,
} from './element-skill-assets';
import {
  ensureHeroSkillEffectAnimations,
  heroSkillEffectForSkill,
  preloadHeroSkillEffects,
  fitHeroSkillEffectDisplaySize,
} from './hero-skill-effect-assets';
import {
  basicAttackEffectForElement,
  ensureBasicAttackEffectAnimations,
  fitBasicAttackEffectDisplaySize,
  preloadBasicAttackEffects,
} from './basic-attack-effect-assets';

const GEM_TYPES: readonly GemType[] = ['attack', 'heal', 'shield', 'energy', 'poison'];
const BOARD_SIZE = 6;
const GEM_FALL_DURATION = 200;
const GEM_REFILL_DURATION = 160;
const LOGICAL_GAME_WIDTH = 360;
const DEFAULT_LOGICAL_GAME_HEIGHT = 620;
interface MonsterSpriteKeys {
  readonly idle: string;
  readonly attack: string;
  readonly heavyAttack?: string;
  readonly specialAttack?: string;
  readonly defend?: string;
  readonly poisonCast?: string;
  readonly hit: string;
  readonly death: string;
  readonly highHp?: string;
  readonly energy?: string;
  readonly lowHp?: string;
  readonly poisoned?: string;
  readonly shield?: string;
  readonly heal?: string;
  readonly antiHeal?: string;
  readonly dodge?: string;
  readonly stunned?: string;
  readonly projectile?: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly displayWidth: number;
  readonly displayHeight: number;
  readonly originY: number;
}
const MONSTER_SPRITE_KEYS: Readonly<Record<string, MonsterSpriteKeys>> = {
  mist_blob: MIST_DUST_SPRITE_KEYS,
  lantern_cat: LANTERN_CAT_SPRITE_KEYS,
  cloud_fox_boss: CLOUD_FOX_SPRITE_KEYS,
  bamboo_mantis: BAMBOO_MANTIS_SPRITE_KEYS,
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
  castCircle: 'fx-cloudbreaker-cast-circle',
  chargeAura: 'fx-cloudbreaker-charge-aura',
  swordGlow: 'fx-cloudbreaker-sword-glow',
  projectile: 'fx-cloudbreaker-projectile',
  cloudSplit: 'fx-cloudbreaker-cloud-split',
  impact: 'fx-cloudbreaker-impact',
  finishFlash: 'fx-cloudbreaker-finish-flash',
  spark: 'fx-cloudbreaker-spark',
} as const;
const SFX_KEYS = {
  skillCast: 'sfx-cloudbreaker-cast',
  skillRelease: 'sfx-cloudbreaker-release',
  skillImpact: 'sfx-cloudbreaker-impact',
} as const;

export class BattleScene extends Phaser.Scene implements BattleEventPlayer {
  private controller!: BattleController;
  private readonly gemSprites = new Map<string, Phaser.GameObjects.Container>();
  private readonly vfxSprites = new Set<Phaser.GameObjects.Sprite>();
  private readonly transientEffects = new Set<Phaser.GameObjects.GameObject>();
  private gemPool?: GemVisualPool;
  private battleVfxPool?: BattleVfxPool;
  private selection?: Phaser.GameObjects.Rectangle;
  private selectionRing?: Phaser.GameObjects.Sprite;
  private selectedCell?: Coord;
  private pointerStart?: Coord;
  private monsterVisual?: Phaser.GameObjects.Container;
  private monsterBody?: Phaser.GameObjects.Arc;
  private monsterArt?: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
  private monsterSprite?: Phaser.GameObjects.Sprite;
  private lanternCatVfx?: LanternCatVfx;
  private lastMonsterActionVisualId?: string;
  private lastLongMieuVisualId?: string;
  private heroVisual?: Phaser.GameObjects.Container;
  private heroSprite?: Phaser.GameObjects.Sprite;
  private heroSpriteKeys: HeroSpriteKeys = HERO_SPRITE_KEYS.male;
  private heroGender: HeroGender = 'male';
  private heroElement: HeroElement = 'metal';
  private heroSkillAnimationKey?: string;
  private heroSkillAnimationToken = 0;
  private heroTransientAnimation?: HeroTransientAnimation;
  private heroPersistentStatus: HeroPersistentStatus = 'idle';
  private heroIntroIdle = true;
  private heroHpBand?: HeroHpBand;
  private heroCurrentAnimationKey?: string;
  private monsterTransientAnimation?: 'attack' | 'heavyAttack' | 'specialAttack' | 'defend' | 'poisonCast' | 'hit' | 'death' | 'heal' | 'antiHeal' | 'dodge' | 'stunned';
  private monsterAnimationToken = 0;
  private monsterPersistentStatus: HeroPersistentStatus = 'idle';
  private monsterHpBand?: HeroHpBand;
  private monsterCurrentAnimationKey?: string;
  private statusUi?: StatusUiVfx;
  private battleBackground?: Phaser.GameObjects.Image;
  private parallaxBackgroundLayers?: {
    readonly sky: Phaser.GameObjects.Image;
    readonly mid: Phaser.GameObjects.Image;
    readonly fx: Phaser.GameObjects.Image;
    readonly ground: Phaser.GameObjects.Image;
  };
  private parallaxStarted = false;
  private battleBackgroundOverlay?: Phaser.GameObjects.Rectangle;
  private playerStunIcon?: Phaser.GameObjects.Image;
  private turnLabel?: Phaser.GameObjects.Text;
  private countdownLabel?: Phaser.GameObjects.Text;
  private comboLabel?: Phaser.GameObjects.Text;
  private playerTurnPrompt?: Phaser.GameObjects.Text;
  private fpsDebugLabel?: Phaser.GameObjects.Text;
  private telegraphLabel?: Phaser.GameObjects.Text;
  private statusLabel?: Phaser.GameObjects.Text;
  private skillButtons: Phaser.GameObjects.Rectangle[] = [];
  private skillIcons: Phaser.GameObjects.Image[] = [];
  private skillLockLabels: Phaser.GameObjects.Text[] = [];
  private skillTooltip?: Phaser.GameObjects.Container;
  private skillTooltipLabel?: Phaser.GameObjects.Text;
  private skillLongPressTimer?: Phaser.Time.TimerEvent;
  private skillLongPressTriggered = false;
  private skillPressSlot?: ElementActiveSkillSlot;
  private skillTooltipHideTimer?: Phaser.Time.TimerEvent;
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
  private performanceLowFrames = 0;
  private performanceStableFrames = 0;
  private performanceTier: VfxQualityTier = 'full';
  private performanceSampleElapsed = 0;
  private poolMissesAtSample = 0;
  private debugMode = false;
  private particleBudget = 0;
  private lastBoard?: Board;
  private sfxEnabled = true;
  private reducedMotion = false;
  private renderQuality = 1;
  private logicalWidth = LOGICAL_GAME_WIDTH;
  private logicalHeight = DEFAULT_LOGICAL_GAME_HEIGHT;
  private layout!: BattleLayout;

  constructor() {
    super({ key: 'BattleScene' });
  }

  private get boardLeft(): number { return this.layout.boardLeft; }
  private get boardTop(): number { return this.layout.boardTop; }
  private get boardWidth(): number { return this.layout.boardWidth; }
  private get cellSize(): number { return this.layout.cellSize; }
  private get heroPosition(): { readonly x: number; readonly y: number } { return this.layout.hero; }
  private get monsterPosition(): { readonly x: number; readonly y: number } { return this.layout.monster; }

  preload(): void {
    this.load.image(BATTLE_BACKGROUND_KEY, 'assets/pk-background-parallax/full-background.webp');
    this.load.image(PARALLAX_BACKGROUND_KEYS.sky, 'assets/pk-background-parallax/layer-sky-moon.webp');
    this.load.image(PARALLAX_BACKGROUND_KEYS.mid, 'assets/pk-background-parallax/layer-mid-city.webp');
    this.load.image(PARALLAX_BACKGROUND_KEYS.fx, 'assets/pk-background-parallax/layer-fx-mist-petals.webp');
    this.load.image(PARALLAX_BACKGROUND_KEYS.ground, 'assets/pk-background-parallax/layer-ground-path.webp');
    const rawHeroElement = this.registry.get('heroElement') as ElementId | undefined;
    const heroElement: HeroElement = rawHeroElement && HERO_ELEMENTS_AVAILABLE[rawHeroElement] ? rawHeroElement : 'metal';
    this.registry.set('heroElement', heroElement);
    const heroGender = this.getHeroGender();
    this.heroGender = heroGender;
    this.heroElement = heroElement;
    this.heroSpriteKeys = heroGender === 'male' ? HERO_ELEMENT_SPRITE_KEYS[heroElement] : HERO_FEMALE_ELEMENT_SPRITE_KEYS[heroElement];
    preloadHeroAssets(this, heroGender, heroElement);
    preloadBasicAttackEffects(this, heroElement);
    preloadElementSkillAssets(this, heroElement);
    preloadHeroSkillEffects(this, 'metal');
    preloadHeroSkillEffects(this, 'wood');
    preloadHeroSkillEffects(this, 'water');
    preloadHeroSkillEffects(this, 'fire');
    preloadHeroSkillEffects(this, 'earth');
    this.load.spritesheet(GEM_ATLAS_KEY, 'assets/gems/pho-linh/pho-linh-gems-sheet.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.image('gem-attack', 'assets/gems/attack.webp');
    this.load.image('gem-heal', 'assets/gems/heal.webp');
    this.load.image('gem-poison-pure', 'assets/gems/pho-linh/gem-p-pure.png');
    this.load.image('gem-shield', 'assets/gems/shield.webp');
    this.load.image('gem-energy', 'assets/gems/energy.webp');
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
    // Both hero packs and the Mist Dust pack contain their own status treatment.
    // Keep the shared bars, but do not load the legacy monster aura overlays
    // when Mist Dust is using its inline status sheets.
    const battleController = this.registry.get('battleController') as BattleController | undefined;
    const preloadMonsterStatusOverlays = !['mist_blob', 'lantern_cat', 'cloud_fox_boss', 'bamboo_mantis'].includes(
      battleController?.currentState.monster.id ?? 'mist_blob',
    );
    preloadStatusUiAssets(this, false, preloadMonsterStatusOverlays);
    const sfxPath = 'assets/audio/combat';
    const sfxFiles: Readonly<Record<string, string>> = {
      [SFX_KEYS.skillCast]: 'cloudbreaker-cast.mp3',
      [SFX_KEYS.skillRelease]: 'cloudbreaker-release.mp3',
      [SFX_KEYS.skillImpact]: 'cloudbreaker-impact.mp3',
    };
    for (const [key, file] of Object.entries(sfxFiles)) {
      this.load.audio(key, `${sfxPath}/${file}`);
    }
    const controller = battleController;
    const monsterId = controller?.currentState.monster.id ?? 'mist_blob';
    const monsterAssets = MONSTER_SPRITE_KEYS[monsterId] ?? MONSTER_SPRITE_KEYS['mist_blob'];
    if (monsterId === 'mist_blob') {
      preloadMistDustSprites(this);
    } else if (monsterId === 'lantern_cat') {
      preloadLanternCatSprites(this);
    } else if (monsterId === 'cloud_fox_boss') {
      preloadCloudFoxSprites(this);
    } else if (monsterId === 'bamboo_mantis') {
      preloadBambooMantisSprites(this);
    }
    preloadMonsterBasicAttack(this, monsterId as TestMonsterId);
    preloadMonsterSkillEffects(this, monsterId as ActorFrameId);
  }

  create(): void {
    this.controller = this.registry.get('battleController') as BattleController;
    this.sfxEnabled = this.registry.get('sfxEnabled') !== false;
    this.reducedMotion = this.registry.get('reducedMotion') === true;
    this.renderQuality = this.safeNumber(Number(this.registry.get('renderQuality')), 2);
    this.debugMode = this.registry.get('debug') === true;
    this.logicalWidth = this.safeNumber(Number(this.registry.get('logicalWidth')), LOGICAL_GAME_WIDTH);
    this.logicalHeight = this.safeNumber(Number(this.registry.get('logicalHeight')), DEFAULT_LOGICAL_GAME_HEIGHT);
    this.layout = createBattleLayout(this.logicalWidth, this.logicalHeight);
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
    ensureStatusUiAnimations(this);
    const monsterId = this.controller.currentState.monster.id;
    if (monsterId === 'mist_blob') {
      ensureMistDustAnimations(this);
    } else if (monsterId === 'lantern_cat') {
      ensureLanternCatAnimations(this);
    } else if (monsterId === 'cloud_fox_boss') {
      ensureCloudFoxAnimations(this);
    } else if (monsterId === 'bamboo_mantis') {
      ensureBambooMantisAnimations(this);
    }
    ensureMonsterBasicAttackAnimation(this, monsterId as TestMonsterId);
    ensureMonsterSkillEffectAnimations(this, monsterId as ActorFrameId);
    ensureHeroAnimations(this, this.heroGender, this.heroElement);
    ensureBasicAttackEffectAnimations(this, this.heroElement);
    ensureElementSkillAnimations(this, this.heroElement);
    ensureHeroSkillEffectAnimations(this, 'metal');
    ensureHeroSkillEffectAnimations(this, 'wood');
    ensureHeroSkillEffectAnimations(this, 'water');
    ensureHeroSkillEffectAnimations(this, 'fire');
    ensureHeroSkillEffectAnimations(this, 'earth');
    this.createHeroVisual();
    this.createHud();
    this.createMonsterVisual();
    this.gemPool = new GemVisualPool(this, this.renderQuality, BOARD_SIZE * BOARD_SIZE + 6);
    this.battleVfxPool = new BattleVfxPool(this);
    // Apply the same idle-calibrated scale before the first visible frame.
    this.normalizeHeroSprite();
    this.statusUi = new StatusUiVfx({
      scene: this,
      heroPosition: {
        x: this.heroPosition.x,
        y: this.heroPosition.y + this.layout.heroCombatY,
      },
      monsterPosition: {
        x: this.monsterPosition.x,
        y: this.monsterPosition.y - 4,
      },
      playerStatusBounds: this.layout.playerStatusBounds,
      monsterStatusBounds: this.layout.monsterStatusBounds,
      statusBarY: this.layout.statusBarY,
      statusBadgeY: this.layout.statusBadgeY,
      energyBarY: this.layout.energyBarY,
      monsterStatusBarY: this.layout.monsterStatusBarY,
      monsterStatusBadgeY: this.layout.monsterStatusBadgeY,
      monsterEnergyBarY: this.layout.monsterEnergyBarY,
      heroUsesInlineStatus: true,
      monsterUsesInlineStatus: ['mist_blob', 'lantern_cat', 'cloud_fox_boss', 'bamboo_mantis'].includes(this.controller.currentState.monster.id),
      renderQuality: this.renderQuality,
    });
    this.createBoardFrame();
    this.createControls();
    this.input.on('pointerdown', this.onSceneSkillPointerDown, this);
    this.input.on('pointerup', this.onSceneSkillPointerUp, this);
    this.input.on('pointercancel', this.onSceneSkillPointerCancel, this);
    this.lanternCatVfx = new LanternCatVfx({
      scene: this,
      reducedMotion: this.reducedMotion,
      combatPoint: this.combatPoint.bind(this),
      spawnCombatImpact: this.spawnCombatImpact.bind(this),
      flashHero: this.flashHero.bind(this),
      playHeroAnimation: this.playHeroAnimation.bind(this),
      shakeHero: this.shakeHero.bind(this),
      shakePlayerBar: this.shakePlayerBar.bind(this),
      playMonsterSkillEffect: (onComplete) => this.playMonsterSkillEffect('lantern_long_mieu_lien_kich', {
        target: this.combatPoint('player'),
        onComplete,
      }),
    });

    this.selection = this.add
      .rectangle(0, 0, this.cellSize - 4, this.cellSize - 4)
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
    this.monsterMoveFrom = this.add.rectangle(0, 0, this.cellSize - 8, this.cellSize - 8)
      .setStrokeStyle(3, 0x8fd3ff).setFillStyle(0x8fd3ff, 0.12).setDepth(10).setVisible(false);
    this.monsterMoveTo = this.add.rectangle(0, 0, this.cellSize - 8, this.cellSize - 8)
      .setStrokeStyle(3, 0xa889ff).setFillStyle(0xa889ff, 0.12).setDepth(10).setVisible(false);
    this.hintMoveFrom = this.add.rectangle(0, 0, this.cellSize - 6, this.cellSize - 6)
      .setStrokeStyle(2, 0xffd45e, 0.95).setFillStyle(0xffd45e, 0.1).setDepth(9).setVisible(false);
    this.hintMoveTo = this.add.rectangle(0, 0, this.cellSize - 6, this.cellSize - 6)
      .setStrokeStyle(2, 0xfff0a6, 0.95).setFillStyle(0xfff0a6, 0.1).setDepth(9).setVisible(false);

    this.unsubscribe = this.controller.subscribe((state) => this.renderState(state));
    // Always present the character's idle row first. Full HP would otherwise
    // replace it with high_hp in the same create tick before the player sees it.
    this.time.delayedCall(this.reducedMotion ? 80 : 360, () => {
      this.heroIntroIdle = false;
      this.refreshDisplayedBars();
    });
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
    this.updatePerformanceTier(delta);
  }

  private updateFpsDebug(delta: number): void {
    if (!this.fpsDebugLabel) return;
    this.fpsDebugElapsed += delta;
    if (this.fpsDebugElapsed < 250) return;
    this.fpsDebugElapsed = 0;

    const fps = Math.max(0, Math.round(this.game.loop.actualFps));
    const color = fps >= 50 ? '#49a8ff' : fps >= 30 ? '#f3c64f' : '#ff5d6c';
    this.fpsDebugLabel
      .setText(`FPS ${fps} · ${this.performanceTier} · T${this.tweens.getTweens().length} V${this.battleVfxPool?.activeCount ?? 0} M${this.poolMissesAtSample}`)
      .setColor(color);
  }

  private updatePerformanceTier(delta: number): void {
    this.performanceSampleElapsed += delta;
    if (this.performanceSampleElapsed < 250) return;
    this.performanceSampleElapsed = 0;
    const fps = Math.max(0, this.game.loop.actualFps);
    if (fps < 55) {
      this.performanceLowFrames += 1;
      this.performanceStableFrames = 0;
    } else if (fps >= 58) {
      this.performanceStableFrames += 1;
      this.performanceLowFrames = 0;
    } else {
      this.performanceLowFrames = 0;
      this.performanceStableFrames = 0;
    }
    if (this.performanceLowFrames >= 2 && this.performanceTier !== 'reduced') this.setPerformanceTier('reduced');
    if (this.performanceStableFrames >= 4 && this.performanceTier !== 'full') this.setPerformanceTier('full');
    this.poolMissesAtSample = (this.battleVfxPool?.missCount ?? 0);
  }

  private setPerformanceTier(tier: VfxQualityTier): void {
    this.performanceTier = tier;
    this.battleVfxPool?.setQualityTier(tier);
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
      this.statusLabel?.setText('Đổi 2 ô kề nhau');
    }
  }

  private createHud(): void {
    if (this.debugMode) {
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
    }
    this.turnLabel = this.add
      .text(this.logicalWidth / 2, 88, '0/24', { color: '#ffffff', fontFamily: 'sans-serif', fontSize: '15px', fontStyle: 'bold' })
      .setResolution(this.renderQuality)
      .setOrigin(0.5, 0.5)
      .setDepth(111);
    this.countdownLabel = this.add
      .text(this.logicalWidth / 2, 106, '', { color: '#ffe98a', fontFamily: 'sans-serif', fontSize: '13px', fontStyle: 'bold' })
      .setResolution(this.renderQuality)
      .setOrigin(0.5, 0.5)
      .setDepth(111);

    this.add
      .rectangle(this.layout.playerStatusBounds.left, 14, this.layout.statusBarWidth, 16, 0x211a34, 0.94)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x66567f, 0.9)
      .setDepth(8);
    this.add
      .text(this.layout.playerStatusBounds.left + 7, 14, 'Nhân vật', { color: '#eee5ff', fontSize: '9px', fontStyle: 'bold' })
      .setResolution(this.renderQuality)
      .setOrigin(0, 0.5)
      .setDepth(9);
    this.add
      .rectangle(this.layout.monsterStatusBounds.left, 14, this.layout.statusBarWidth, 16, 0x211a34, 0.94)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x66567f, 0.9)
      .setDepth(8);
    this.add
      .text(this.layout.monsterStatusBounds.right - 7, 14, this.controller.currentState.monster.name, { color: '#eee5ff', fontSize: '9px', fontStyle: 'bold' })
      .setResolution(this.renderQuality)
      .setOrigin(1, 0.5)
      .setDepth(9);
    const statusRight = this.layout.skillButtons[1].x + this.layout.skillButtonSize / 2;
    const statusWidth = this.layout.skillButtonSize * 2 + this.layout.skillButtonGap;
    const statusLeft = statusRight - statusWidth;
    this.telegraphLabel = this.add
      .text(statusLeft, this.layout.telegraphY, '', {
        color: '#f3c64f',
        fontFamily: 'sans-serif',
        fontSize: '8px',
        fontStyle: 'bold',
      })
      .setResolution(this.renderQuality)
      .setOrigin(0, 0.5)
      .setDepth(110);
    this.statusLabel = this.add
      .text(statusLeft, this.layout.statusY, 'Đổi 2 ô kề nhau', {
        color: '#fff8e8',
        fontFamily: 'sans-serif',
        fontSize: '8px',
      })
      .setResolution(this.renderQuality)
      .setOrigin(0, 0.5)
      .setDepth(110);
    this.comboLabel = this.add
      .text(statusRight - 4, this.layout.statusY, '', {
        color: '#ff5b67',
        fontFamily: 'sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        stroke: '#321725',
        strokeThickness: 3,
      })
      .setResolution(this.renderQuality)
      .setOrigin(1, 0.5)
      .setDepth(112)
      .setVisible(false);
    this.playerTurnPrompt = this.add
      .text(this.logicalWidth / 2, this.logicalHeight * 0.48, 'TỚI LƯỢT BẠN', {
        color: '#fff7c2',
        fontFamily: 'sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        stroke: '#171426',
        strokeThickness: 9,
        shadow: { color: '#000000', blur: 10, fill: true, offsetX: 0, offsetY: 3 },
      })
      .setResolution(this.renderQuality)
      .setOrigin(0.5, 0.5)
      .setDepth(120)
      .setAlpha(0)
      .setVisible(false);
  }

  private createMonsterVisual(): void {
    const monsterY = this.monsterPosition.y;
    const monster = this.add.container(this.monsterPosition.x, monsterY);
    monster.setDepth(6);
    const spriteKeys = this.monsterSpriteKeys();
    const monsterId = this.controller.currentState.monster.id as ActorFrameId;
    const idleTexture = ['mist_blob', 'lantern_cat', 'cloud_fox_boss', 'bamboo_mantis'].includes(monsterId)
      ? actorFrameKey(monsterId, 'idle', 0)
      : '';
    if (spriteKeys && this.textures.exists(idleTexture)) {
      this.ensureMonsterAnimations(spriteKeys);
      const sprite = this.add.sprite(0, 0, idleTexture)
        .setOrigin(0.5, spriteKeys.originY)
        .setAlpha(1)
        // Keep the combatants facing the player from the right side of the
        // arena. The supplied Bọ Lá Tre frames face right, so mirror them.
        .setFlipX(monsterId === 'mist_blob' || monsterId === 'bamboo_mantis')
        .play(spriteKeys.idle);
      sprite.on('animationupdate', () => this.normalizeMonsterSprite(sprite));
      this.normalizeMonsterSprite(sprite);
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

  private monsterSpriteKeys(): MonsterSpriteKeys | undefined {
    return MONSTER_SPRITE_KEYS[this.controller.currentState.monster.id];
  }

  private usesMonsterStatusSheets(): boolean {
    return ['mist_blob', 'lantern_cat', 'cloud_fox_boss', 'bamboo_mantis'].includes(this.controller.currentState.monster.id);
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

  private createHeroVisual(): void {
    const idleTextureKey = heroAnimationTextureKey(this.heroGender, 'idle', 0, this.heroElement);
    if (!HERO_ASSETS_AVAILABLE[this.heroGender] || !idleTextureKey || !this.textures.exists(idleTextureKey)) return;
    const hero = this.add.container(this.heroPosition.x, this.heroPosition.y).setDepth(6);
    const sprite = this.add.sprite(0, 0, idleTextureKey)
      .setOrigin(0.5, HERO_DISPLAY_ORIGIN_Y)
      .play(this.heroSpriteKeys.idle);
    // Phaser 4 updates frame dimensions before this event. Re-assert the
    // bottom pivot and display transform after every frame swap so animation
    // rows with different native canvases never inherit a stale transform.
    sprite.on('animationupdate', () => this.normalizeHeroSprite(sprite));
    this.heroSprite = sprite;
    this.heroVisual = hero;
    hero.add(sprite);
    this.normalizeHeroSprite();
    this.heroPersistentStatus = 'idle';
    this.heroCurrentAnimationKey = this.heroSpriteKeys.idle;
  }

  private normalizeHeroSprite(sprite = this.heroSprite): void {
    if (!sprite) return;
    sprite.setOrigin(0.5, HERO_DISPLAY_ORIGIN_Y);
    if (sprite === this.heroSprite) {
      normalizeActorSprite(
        sprite,
        heroActorForAnimation(
          this.heroGender,
          this.heroElement,
          this.heroTransientAnimation === 'attack' ? 'normal_attack' : 'idle',
        ),
        this.monsterSpriteKeys()?.displayWidth ?? HERO_DISPLAY_WIDTH,
      );
      return;
    }
    sprite.setDisplaySize(HERO_DISPLAY_WIDTH, HERO_DISPLAY_HEIGHT);
  }

  private normalizeMonsterSprite(sprite = this.monsterSprite): void {
    const keys = this.monsterSpriteKeys();
    const id = this.controller.currentState.monster.id;
    if (!sprite || !keys || !['mist_blob', 'lantern_cat', 'cloud_fox_boss', 'bamboo_mantis'].includes(id)) return;
    normalizeActorSprite(sprite, id as ActorFrameId, keys.displayWidth);
    if (id === 'bamboo_mantis') {
      // The source frames are relatively small and are displayed at a
      // non-native size; nearest filtering keeps the leaf edges crisp.
      sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      sprite.setDisplaySize(keys.displayWidth, keys.displayHeight);
      return;
    }
    // The new Sương Hồn skill frames use a wider effect canvas than the idle
    // row. Keep that canvas from scaling the whole monster up during a heavy
    // attack; the animation may still use its natural aspect ratio.
    if (id === 'mist_blob' && sprite.displayWidth > keys.displayWidth) {
      const widthRatio = keys.displayWidth / sprite.displayWidth;
      sprite.setDisplaySize(keys.displayWidth, Math.max(1, Math.round(sprite.displayHeight * widthRatio)));
    }
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
    const fx = this.battleVfxPool?.acquireSpriteVfx(key);
    if (!fx) return;
    fx.setPosition(x, y).setOrigin(0.5).setDisplaySize(displayWidth, displayHeight).setDepth(depth).play(key);
    this.vfxSprites.add(fx);
    fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.vfxSprites.delete(fx);
      this.battleVfxPool?.release(fx);
    });
  }

  private playMonsterBasicAttackEffect(onComplete: () => void): void {
    const monsterId = this.controller.currentState.monster.id as TestMonsterId;
    const effect = monsterBasicAttackForMonster(monsterId);
    if (!this.battleVfxPool || !this.anims.exists(effect.animationKey)) {
      onComplete();
      return;
    }
    const start = this.combatPoint('monster');
    const target = this.combatPoint('player');
    const sprite = this.battleVfxPool.acquireSpriteVfx(effect.textureKeys[0]);
    if (!sprite) {
      onComplete();
      return;
    }
    const displayHeight = effect.displayWidth * effect.frameHeight / effect.frameWidth;
    let released = false;
    let animationDone = false;
    let travelDone = false;
    const finish = (): void => {
      if (released || !animationDone || !travelDone) return;
      released = true;
      this.vfxSprites.delete(sprite);
      this.battleVfxPool?.release(sprite);
      onComplete();
    };
    sprite
      .setPosition(start.x, start.y - 20)
      .setOrigin(0.5)
      .setDisplaySize(effect.displayWidth, displayHeight)
      .setDepth(14)
      .setAlpha(1)
      .setVisible(true)
      .setBlendMode(Phaser.BlendModes.ADD)
      .play(effect.animationKey);
    sprite.anims.timeScale = this.reducedMotion ? 1.8 : 1;
    this.vfxSprites.add(sprite);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      animationDone = true;
      finish();
    });
    this.tweens.add({
      targets: sprite,
      x: target.x,
      y: target.y - 20,
      duration: this.reducedMotion ? 360 : 700,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        travelDone = true;
        finish();
      },
    });
  }

  private playMonsterSkillEffect(
    effectId: MonsterSkillEffectId,
    options: {
      readonly from?: { readonly x: number; readonly y: number };
      readonly target: { readonly x: number; readonly y: number };
      readonly travel?: boolean;
      readonly onComplete?: () => void;
    },
  ): void {
    const effect = MONSTER_SKILL_EFFECTS[effectId];
    if (!this.battleVfxPool || !this.anims.exists(effect.animationKey)) {
      options.onComplete?.();
      return;
    }
    const from = options.from ?? {
      x: this.monsterVisual?.x ?? this.monsterPosition.x,
      y: this.monsterVisual?.y ?? this.monsterPosition.y,
    };
    const sprite = this.battleVfxPool.acquireSpriteVfx(effect.textureKeys[0]);
    if (!sprite) {
      options.onComplete?.();
      return;
    }
    const displayHeight = effect.displayWidth * effect.frameHeight / effect.frameWidth;
    const travel = options.travel === true;
    let released = false;
    const finish = (): void => {
      if (released) return;
      released = true;
      this.vfxSprites.delete(sprite);
      this.battleVfxPool?.release(sprite);
      options.onComplete?.();
    };
    sprite
      .setPosition(from.x, from.y)
      .setOrigin(0.5)
      .setDisplaySize(effect.displayWidth, displayHeight)
      .setDepth(14)
      .setAlpha(1)
      .setVisible(true)
      .setBlendMode(Phaser.BlendModes.ADD)
      .play(effect.animationKey);
    sprite.anims.timeScale = this.reducedMotion ? 1.8 : 1;
    this.vfxSprites.add(sprite);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (!travel) finish();
    });
    if (travel) {
      this.tweens.add({
        targets: sprite,
        x: options.target.x,
        y: options.target.y,
        duration: this.reducedMotion ? 360 : 400,
        ease: 'Cubic.In',
        onComplete: finish,
      });
    }
  }

  private animateGemsCleared(coords: readonly Coord[]): void {
    this.particleBudget = 16;
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
            onComplete: () => {
              const key = `${coord.row}:${coord.col}`;
              if (this.gemSprites.get(key) === gem) this.gemSprites.delete(key);
              this.gemPool?.release(gem);
            },
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
    const flash = this.battleVfxPool?.acquireFlash();
    if (!flash) return;
    flash.setPosition(x, y).setFillStyle(color, 0.82).setDepth(14);
    this.tweens.add({
      targets: flash,
      scale: 1.2,
      alpha: 0,
      duration: 120,
      ease: 'Quad.Out',
      onComplete: () => this.battleVfxPool?.release(flash),
    });
  }

  private spawnGemParticles(x: number, y: number, color: number): void {
    const particleCount = this.performanceTier === 'full' ? Math.min(2, this.particleBudget) : 0;
    this.particleBudget -= particleCount;
    for (let index = 0; index < particleCount; index += 1) {
      const angle = (Math.PI * 2 * index) / particleCount + Phaser.Math.FloatBetween(-0.18, 0.18);
      const distance = Phaser.Math.Between(16, 30);
      const particle = this.battleVfxPool?.acquireParticle();
      if (!particle) continue;
      particle.setPosition(x, y).setRadius(Phaser.Math.FloatBetween(1.5, 2.5)).setFillStyle(color, 0.95).setDepth(14);
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        scale: 0.15,
        alpha: 0,
        duration: Phaser.Math.Between(220, 300),
        ease: 'Cubic.Out',
        onComplete: () => this.battleVfxPool?.release(particle),
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
    frame.fillRoundedRect(this.boardLeft - 10, this.boardTop - 10, this.boardWidth + 20, this.boardWidth + 20, 16);
    frame.lineStyle(2, 0x594b78, 1);
    frame.strokeRoundedRect(this.boardLeft - 10, this.boardTop - 10, this.boardWidth + 20, this.boardWidth + 20, 16);
  }

  private createControls(): void {
    const skillSlots: readonly ElementActiveSkillSlot[] = ['primarySkill', 'secondarySkill'];
    skillSlots.forEach((slot, index) => {
      const point = this.layout.skillButtons[index];
      const button = this.add
        // Invisible hit target: the skill artwork should not sit inside a
        // square overlay or add another panel below the board.
        .rectangle(point.x, point.y, this.layout.skillButtonSize, this.layout.skillButtonSize, 0x000000, 0)
        .setDepth(1)
        .setInteractive({ useHandCursor: true });
      const iconFrames = elementSkillIconFrameKeys(this.heroElement, slot);
      const icon = this.add
        .image(point.x, point.y - 2, iconFrames[0])
        .setDepth(2)
        .setInteractive({ useHandCursor: true });
      const iconSize = fitSkillIconDisplaySize(icon.frame.realWidth, icon.frame.realHeight);
      icon.setDisplaySize(iconSize.width, iconSize.height);
      const lockLabel = this.add
        .text(point.x, point.y + 2, '', {
          color: '#e5d9ff', fontFamily: 'sans-serif', fontSize: '7px', fontStyle: 'bold',
          stroke: '#171426', strokeThickness: 2,
        })
        .setResolution(this.renderQuality)
        .setOrigin(0.5)
        .setDepth(4)
        .setVisible(false);
      this.skillButtons.push(button);
      this.skillIcons.push(icon);
      this.skillLockLabels.push(lockLabel);
    });
    this.skillTooltip = this.add
      .container(Math.max(79, Math.min(this.logicalWidth - 79, this.layout.skillButtons[0].x)), this.layout.skillButtons[0].y - 58)
      .setDepth(120)
      .setVisible(false);
    const tooltipBackground = this.add
      .rectangle(0, 0, 158, 70, 0x171426, 0.98)
      .setStrokeStyle(1, 0xd8c2ff, 0.85);
    this.skillTooltipLabel = this.add
      .text(-73, -28, '', {
        color: '#fff8e8',
        fontFamily: 'sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        lineSpacing: 2,
      })
      .setResolution(this.renderQuality)
      .setOrigin(0, 0);
    this.skillTooltip.add([tooltipBackground, this.skillTooltipLabel]);


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
    this.telegraphLabel?.setText(this.formatMonsterPreparationText(state.telegraph));
    this.turnLabel?.setText(`${state.turn}/${state.maxTurns}`);
    this.updateSkillButtons(state);
    if (state.phase !== 'PLAYER_READY') {
      this.stopTurnTimer();
      this.setPlayerTurnHighlight(false);
    }
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
    this.statusUi?.setPositions(
      { x: this.heroVisual?.x ?? this.heroPosition.x, y: (this.heroVisual?.y ?? this.heroPosition.y) + this.layout.heroCombatY },
      { x: this.monsterVisual?.x ?? this.monsterPosition.x, y: (this.monsterVisual?.y ?? this.monsterPosition.y) - 4 },
    );
    this.statusUi?.syncStatus(
      {
        currentHp: playerHp,
        maxHp: playerMaxHp,
        shield,
        poisonPotency: Math.max(0, this.displayedPlayerPoisonPotency ?? state.player.poisonPotency),
        poisonTurns: playerPoisonTurns,
        energy,
      },
      {
        currentHp: monsterHp,
        maxHp: monsterMaxHp,
        shield: monsterShield,
        poisonPotency: Math.max(0, this.displayedMonsterPoisonPotency ?? state.monster.poisonPotency),
        poisonTurns: monsterPoisonTurns,
        energy: monsterEnergy,
      },
    );
    this.syncHeroPersistentVisual({
      currentHp: playerHp,
      maxHp: playerMaxHp,
      shield,
      poisonTurns: playerPoisonTurns,
      energy,
    });
    if (this.usesMonsterStatusSheets()) {
      this.syncMonsterPersistentVisual({
        currentHp: monsterHp,
        maxHp: monsterMaxHp,
        shield: monsterShield,
        poisonTurns: monsterPoisonTurns,
        energy: monsterEnergy,
      });
    }
  }

  private refreshDisplayedBars(): void {
    this.renderBars(this.controller.currentState);
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

  private playHeroSfx(name: HeroSfxName, volume: number): void {
    this.playSfx(heroSfxKey(this.heroGender, name), volume);
  }

  private playHeroAttackSfx(): void {
    this.playHeroSfx('normal_attack', 0.5);
  }

  private playHeroHitSfx(volume = 0.52): void {
    this.playHeroSfx('hit', volume);
  }

  private playHeroDeathSfx(): void {
    this.playHeroSfx('death', 0.58);
  }

  private playHeroStatusSfx(status: 'energy' | 'highHp' | 'lowHp' | 'poisoned' | 'shield' | 'stunned'): void {
    const names: Readonly<Record<typeof status, HeroSfxName>> = {
      energy: 'energy',
      highHp: 'high_hp',
      lowHp: 'low_hp',
      poisoned: 'poisoned',
      shield: 'shield',
      stunned: 'stunned',
    };
    this.playHeroSfx(names[status], 0.5);
  }

  private syncHeroPersistentVisual(snapshot: HeroStatusSnapshot): void {
    if (this.heroIntroIdle) return;
    const hpBand = getHeroHpBand(snapshot.currentHp, snapshot.maxHp);
    if (this.heroHpBand && hpBand !== this.heroHpBand) {
      if (hpBand === 'low') this.playHeroStatusSfx('lowHp');
      if (hpBand === 'high') this.playHeroStatusSfx('highHp');
    }
    this.heroHpBand = hpBand;
    if (this.heroTransientAnimation) return;

    const nextStatus = getHeroPersistentStatus(snapshot);
    this.heroPersistentStatus = nextStatus;
    this.playHeroPersistentAnimation(nextStatus);
  }

  private playHeroPersistentAnimation(status: HeroPersistentStatus): void {
    const sprite = this.heroSprite;
    const animationKey = this.heroPersistentAnimationKey(status);
    if (!sprite || !animationKey || !this.anims.exists(animationKey)) return;
    sprite.setVisible(true);
    if (this.heroCurrentAnimationKey === animationKey && sprite.anims.isPlaying) return;
    sprite.stop();
    sprite.play(animationKey);
    this.normalizeHeroSprite(sprite);
    this.heroCurrentAnimationKey = animationKey;
  }

  private syncMonsterPersistentVisual(snapshot: HeroStatusSnapshot): void {
    if (!this.usesMonsterStatusSheets() || this.heroIntroIdle) return;
    const hpBand = getHeroHpBand(snapshot.currentHp, snapshot.maxHp);
    if (this.monsterHpBand && hpBand !== this.monsterHpBand) {
      // Monster V2 has no dedicated audio; the visual status animation remains.
    }
    this.monsterHpBand = hpBand;
    const nextStatus = getHeroPersistentStatus(snapshot);
    this.monsterPersistentStatus = nextStatus;
    if (this.monsterTransientAnimation) return;
    this.playMonsterPersistentAnimation(nextStatus);
  }

  private playMonsterPersistentAnimation(status: HeroPersistentStatus): void {
    const sprite = this.monsterSprite;
    const keys = this.monsterSpriteKeys();
    if (!sprite || !keys || !this.usesMonsterStatusSheets()) return;
    const animationKey = status === 'highHp'
      ? keys.highHp
      : status === 'energy'
        ? keys.energy
        : status === 'lowHp'
          ? keys.lowHp
          : status === 'poisoned'
            ? keys.poisoned
            : status === 'shield'
              ? keys.shield
              : keys.idle;
    if (!animationKey || !this.anims.exists(animationKey)) return;
    if (this.monsterCurrentAnimationKey === animationKey && sprite.anims.isPlaying) return;
    sprite.stop();
    sprite.setAlpha(1);
    sprite.play(animationKey);
    this.normalizeMonsterSprite(sprite);
    this.monsterCurrentAnimationKey = animationKey;
  }

  private heroPersistentAnimationKey(status: HeroPersistentStatus): string | undefined {
    if (status === 'highHp') return this.heroSpriteKeys.highHp;
    if (status === 'energy') return this.heroSpriteKeys.energy;
    if (status === 'lowHp') return this.heroSpriteKeys.lowHp;
    if (status === 'poisoned') return this.heroSpriteKeys.poisoned;
    if (status === 'shield') return this.heroSpriteKeys.shield;
    return this.heroSpriteKeys.idle;
  }

  private clampDisplay(value: number | undefined, min: number, max: number): number {
    return Math.max(min, Math.min(max, this.safeNumber(value, min)));
  }

  private updateSkillButtons(state: BattleState): void {
    const canAct = state.phase === 'PLAYER_READY';
    const elementSkills = CHARACTER_DATA.elementSkills[this.heroElement];
    const primaryConfig = elementSkills.primarySkill;
    const secondaryConfig = elementSkills.secondarySkill;
    const primaryState = getElementSkillVisualState(
      'primarySkill', canAct, state.player.energy, primaryConfig.energyCost,
    );
    const secondaryState = getElementSkillVisualState(
      'secondarySkill', canAct, state.player.energy, secondaryConfig.energyCost,
    );
    const primaryButton = this.skillButtons[0];
    const primaryIcon = this.skillIcons[0];
    if (primaryButton && primaryIcon) {
      // Keep the transparent rectangle in the input hit-test tree. Its fill
      // is already transparent; alpha 0 makes Phaser skip pointer hits on
      // some mobile render/input paths.
      primaryButton.setAlpha(1);
      primaryIcon.setAlpha(primaryState.active ? 1 : 0.55);
      this.setSkillIconMotion(primaryIcon, 'primarySkill', primaryState.animate);
    }
    const secondaryButton = this.skillButtons[1];
    const secondaryIcon = this.skillIcons[1];
    if (secondaryButton && secondaryIcon) {
      secondaryButton.setAlpha(1);
      secondaryIcon.setAlpha(secondaryState.locked ? 0.42 : 1);
      this.setSkillIconMotion(secondaryIcon, 'secondarySkill', secondaryState.animate);
    }
    const secondaryLockLabel = this.skillLockLabels[1];
    secondaryLockLabel?.setVisible(secondaryState.locked);
    this.setPlayerControlsEnabled(canAct);
  }


  private setSkillIconMotion(icon: Phaser.GameObjects.Image, slot: ElementActiveSkillSlot, active: boolean): void {
    // Keep the icon itself static. The source artwork has decorative padding
    // that shifts between animation frames; the unlocked feedback belongs to
    // the button state, not to a changing icon texture.
    void active;
    icon.setTexture(elementSkillIconFrameKeys(this.heroElement, slot)[0]);
    const iconSize = fitSkillIconDisplaySize(icon.frame.realWidth, icon.frame.realHeight);
    icon.setDisplaySize(iconSize.width, iconSize.height).clearTint();
  }

  private showSkillTooltip(slot: ElementActiveSkillSlot = 'primarySkill'): void {
    const state = this.controller.currentState;
    const skillPower = state.player.stats.skillPower;
    const elementSkill = CHARACTER_DATA.elementSkills[this.heroElement];
    const skillConfig = slot === 'primarySkill' ? elementSkill.primarySkill : elementSkill.secondarySkill;
    const skillLabel = slot === 'primarySkill' ? elementSkill.primarySkillLabel : elementSkill.secondarySkillLabel;
    const skillDamage = skillConfig.attackMultiplier !== undefined
      ? Math.max(1, Math.round(state.player.stats.atk * skillConfig.attackMultiplier))
      : Math.max(
        1,
        Math.round(skillConfig.baseDamage + skillPower * skillConfig.skillPowerMultiplier)
          - Math.floor(state.monster.defense * skillConfig.defenseMultiplier),
      );
    const skillEnergyCost = skillConfig.energyCost;
    const effects: string[] = [];
    if (skillConfig.fixedDamage !== undefined) effects.push(`Trừ ${skillConfig.fixedDamage} khiên/HP`);
    if (skillConfig.energySteal) effects.push(`Hút ${skillConfig.energySteal} năng lượng`);
    if (skillConfig.poisonAtkFactor) effects.push(`Độc ${skillConfig.poisonAtkFactor * 100}% ATK · ${skillConfig.poisonTurns} lượt`);
    if (skillConfig.hitCount) effects.push(`${skillConfig.hitCount} đòn × ${skillConfig.attackMultiplier! * 100}% ATK`);
    if (skillConfig.controlEffect) effects.push(`${skillConfig.controlEffect === 'freeze' ? 'Đóng băng' : 'Choáng'} · ${skillConfig.controlChance! * 100}%`);
    if (skillConfig.damageTakenBonus) effects.push(`Mục tiêu nhận thêm ${skillConfig.damageTakenBonus * 100}% sát thương · ${skillConfig.damageTakenBonusTurns} lượt`);
    if (skillConfig.defenseReduction) effects.push(`Giảm DEF ${skillConfig.defenseReduction * 100}% · ${skillConfig.defenseReductionTurns} lượt`);
    if (skillConfig.selfShieldDefenseMultiplier) effects.push(`Khiên ${skillConfig.selfShieldDefenseMultiplier * 100}% DEF · giảm nhận ${skillConfig.selfDamageReduction! * 100}% · phản ${skillConfig.reflectDamageRatio! * 100}%`);
    this.skillTooltipLabel?.setText(
      `${skillLabel}\n⚡${state.player.energy}/${DEFAULT_BATTLE_CONFIG.energyCap} · Cần ${skillEnergyCost}\nSát thương: ${skillDamage}${skillConfig.bypassShield ? ' · Xuyên khiên' : ''}\n${skillConfig.attackMultiplier !== undefined ? `ATK ×${skillConfig.attackMultiplier}` : `SP ×${skillConfig.skillPowerMultiplier} · DEF ×${skillConfig.defenseMultiplier}`}${effects.length ? `\n${effects.join('\n')}` : ''}`,
    );
    this.skillTooltip?.setVisible(true).setAlpha(1);
    this.skillTooltipHideTimer?.remove(false);
    this.skillTooltipHideTimer = this.time.delayedCall(2800, () => {
      this.skillTooltip?.setVisible(false);
      this.skillTooltipHideTimer = undefined;
    });
  }

  private onSkillPointerDown(pointer?: Phaser.Input.Pointer): void {
    this.skillLongPressTriggered = false;
    this.skillLongPressTimer?.remove(false);
    void pointer;
    this.skillLongPressTimer = this.time.delayedCall(2000, () => {
      this.skillLongPressTriggered = true;
      this.showSkillTooltip('primarySkill');
      this.skillLongPressTimer = undefined;
    });
  }

  private skillSlotAtPointer(pointer: Phaser.Input.Pointer): ElementActiveSkillSlot | undefined {
    const size = this.layout.skillButtonSize / 2;
    const coordinates = [[pointer.worldX, pointer.worldY], [pointer.x, pointer.y]] as const;
    for (const [x, y] of coordinates) {
      for (const [index, slot] of (['primarySkill', 'secondarySkill'] as const).entries()) {
        const point = this.layout.skillButtons[index];
        if (Math.abs(x - point.x) <= size && Math.abs(y - point.y) <= size) return slot;
      }
    }
    return undefined;
  }

  private onSceneSkillPointerDown(pointer: Phaser.Input.Pointer): void {
    const slot = this.skillSlotAtPointer(pointer);
    if (!slot) return;
    this.skillPressSlot = slot;
    if (slot === 'primarySkill') this.onSkillPointerDown(pointer);
    else this.onSecondarySkillPointerDown(pointer);
  }

  private onSceneSkillPointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.skillPressSlot) return;
    const slot = this.skillPressSlot;
    this.skillPressSlot = undefined;
    // A pointer-up outside the icon still completes the mobile long-press;
    // dispatchSkill itself remains guarded by the current phase/cost.
    void pointer;
    if (slot === 'primarySkill') this.onSkillPointerUp();
    else this.onSecondarySkillPointerUp();
  }

  private onSceneSkillPointerCancel(): void {
    this.skillPressSlot = undefined;
    this.onSkillPointerCancel();
  }

  private onSkillPointerUp(): void {
    this.skillLongPressTimer?.remove(false);
    this.skillLongPressTimer = undefined;
    if (!this.skillLongPressTriggered) void this.dispatchSkill('primarySkill');
    this.skillLongPressTriggered = false;
  }

  private onSecondarySkillPointerDown(pointer?: Phaser.Input.Pointer): void {
    this.skillLongPressTriggered = false;
    this.skillLongPressTimer?.remove(false);
    void pointer;
    this.skillLongPressTimer = this.time.delayedCall(2000, () => {
      this.skillLongPressTriggered = true;
      this.showSkillTooltip('secondarySkill');
      this.skillLongPressTimer = undefined;
    });
  }

  private onSecondarySkillPointerUp(): void {
    this.skillLongPressTimer?.remove(false);
    this.skillLongPressTimer = undefined;
    if (!this.skillLongPressTriggered) void this.dispatchSkill('secondarySkill');
    this.skillLongPressTriggered = false;
  }

  private onSkillPointerCancel(): void {
    this.skillLongPressTimer?.remove(false);
    this.skillLongPressTimer = undefined;
    this.skillLongPressTriggered = false;
  }

  private renderBoard(board: Board): void {
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const key = `${row}:${col}`;
        const x = this.boardLeft + col * this.cellSize + this.cellSize / 2;
        const y = this.boardTop + row * this.cellSize + this.cellSize / 2;
        const current = this.gemSprites.get(key);
        // Board snapshots are emitted several times during one resolve. Keep
        // the existing visual by identity whenever the gem type at this cell
        // is unchanged. Do not use visible/alpha as a cache key: a gem can be
        // mid-clear/fall animation while the logical board is already stable,
        // and re-acquiring it would make unrelated cells flicker and churn the
        // pool.
        if (current && current.active && current.getData('gemType') === board[row][col]) {
          continue;
        }
        if (!current || current.getData('gemType') !== board[row][col]) {
          if (current) this.gemPool?.release(current);
          this.gemSprites.set(key, this.gemPool?.acquire(board[row][col], x, y) ?? this.createGem(x, y, board[row][col]));
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
    const candidatesBySource = new Map<string, Phaser.GameObjects.Container[]>();
    // Preserve exact cell ownership first. This matters for columns that did
    // not participate in the clear: they must not be removed from the pool or
    // have their animation restarted just because a new fall snapshot arrived.
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const key = `${row}:${col}`;
        const current = this.gemSprites.get(key);
        if (!current || !board[row][col] || current.getData('gemType') !== board[row][col]
          || !current.visible || current.alpha <= 0.05 || current.scale <= 0.05) continue;
        nextSprites.set(key, current);
        claimed.add(current);
      }
    }
    for (const gem of this.gemSprites.values()) {
      if (claimed.has(gem) || !gem.active || !gem.visible || gem.alpha <= 0.05 || gem.scale <= 0.05) continue;
      const sourceCol = Math.round((gem.x - this.boardLeft - this.cellSize / 2) / this.cellSize);
      const bucketKey = `${sourceCol}:${String(gem.getData('gemType'))}`;
      const bucket = candidatesBySource.get(bucketKey);
      if (bucket) bucket.push(gem);
      else candidatesBySource.set(bucketKey, [gem]);
    }

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const gemType = board[row][col];
        if (!gemType) continue;
        const key = `${row}:${col}`;
        const exact = nextSprites.get(key);
        if (exact) continue;
        const target = this.boardPoint({ row, col });
        const candidate = candidatesBySource.get(`${col}:${gemType}`)?.pop();
        const visual = candidate
          ?? this.gemPool?.acquire(gemType, target.x, target.y - this.cellSize)
          ?? this.createGem(target.x, target.y - this.cellSize, gemType);
        claimed.add(visual);
        this.tweens.killTweensOf(visual);
        visual.setVisible(true).setAlpha(1).setScale(1);
        nextSprites.set(`${row}:${col}`, visual);
        if (Math.abs(visual.x - target.x) > 1 || Math.abs(visual.y - target.y) > 1) {
          this.tweens.add({
            targets: visual,
            x: target.x,
            y: target.y,
            duration: GEM_FALL_DURATION,
            ease: 'Cubic.Out',
          });
        } else {
          visual.setPosition(target.x, target.y);
        }
      }
    }

    for (const visual of this.gemSprites.values()) {
      if (!claimed.has(visual)) this.gemPool?.release(visual);
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
          if (current) this.gemPool?.release(current);
          visual = this.gemPool?.acquire(
            board[row][col],
            target.x,
            this.boardTop - (BOARD_SIZE - row + 1) * this.cellSize,
          ) ?? this.createGem(target.x, this.boardTop - (BOARD_SIZE - row + 1) * this.cellSize, board[row][col]);
          landingPoints.push({ row, col });
        }
        const isNewLanding = !current || current.getData('gemType') !== board[row][col];
        if (isNewLanding) {
          this.tweens.killTweensOf(visual);
          visual.setVisible(true).setAlpha(1).setScale(1);
        }
        nextSprites.set(key, visual);
        if (isNewLanding) {
          this.tweens.add({
            targets: visual,
            x: target.x,
            y: target.y,
            duration: GEM_REFILL_DURATION,
            ease: 'Cubic.Out',
          });
        }
      }
    }
    for (const [key, visual] of this.gemSprites) {
      if (!nextSprites.has(key)) this.gemPool?.release(visual);
    }
    this.gemSprites.clear();
    for (const [key, visual] of nextSprites) this.gemSprites.set(key, visual);
    this.lastBoard = board.map((row) => [...row]) as Board;
    this.renderSelection();
    this.scheduleLandingImpacts(landingPoints);
  }

  private scheduleLandingImpacts(coords: readonly Coord[]): void {
    const impactLimit = this.performanceTier === 'full' ? 6 : 3;
    for (const coord of coords.slice(0, impactLimit)) {
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

    if (
      start.row === end.row
      && start.col === end.col
      && this.selectedCell
      && areAdjacent(this.selectedCell, end)
    ) {
      void this.dispatchSwap(this.selectedCell, end);
      return;
    }

    if (areAdjacent(start, end)) {
      void this.dispatchSwap(start, end);
      return;
    }
    if (start.row === end.row && start.col === end.col) {
      if (this.selectedCell && this.selectedCell.row === end.row && this.selectedCell.col === end.col) {
        this.selectedCell = undefined;
        this.renderSelection();
        this.statusLabel?.setText('Đã bỏ chọn ngọc');
      } else {
        this.selectedCell = end;
        this.renderSelection();
        this.statusLabel?.setText(`Đã chọn ${this.gemAt(end)} · chọn ô kề hoặc vuốt để đổi`);
      }
    } else {
      this.statusLabel?.setText('Chỉ vuốt sang ô kề nhau');
    }
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

  private async dispatchSkill(slot: ElementActiveSkillSlot = 'primarySkill'): Promise<void> {
    const elementSkill = CHARACTER_DATA.elementSkills[this.heroElement];
    const skillConfig = slot === 'primarySkill' ? elementSkill.primarySkill : elementSkill.secondarySkill;
    if (!this.canPlayerAct() || this.controller.currentState.player.energy < skillConfig.energyCost) return;
    this.stopTurnTimer();
    this.setPlayerControlsEnabled(false);
    await this.controller.dispatch({
      kind: 'skill',
      skillId: slot === 'primarySkill' ? elementSkill.primarySkillId : elementSkill.secondarySkillId,
      actionId: `skill-${this.controller.currentState.turn + 1}`,
    });
    this.syncTurnTimer(true);
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
        this.statusLabel?.setText('Đang đổi...');
        break;
      }
      case 'MATCH_FOUND':
        this.statusLabel?.setText(event.payload['actor'] === 'monster' ? 'Quái ghép 3' : 'Bạn ghép 3');
        break;
      case 'GEMS_CLEARED': {
        const counts = event.payload['gemCounts'];
        const clearedCoords = this.coordsFromPayload(event.payload['coordinates']);
        this.animateGemsCleared(clearedCoords);
        this.spawnMatchBurst(clearedCoords);
        if (typeof counts === 'object' && counts !== null) {
          const gemCounts = counts as Record<string, unknown>;
          const [gem, count] = Object.entries(gemCounts)[0] ?? [];
          const actor = event.payload['actor'] === 'monster' ? 'Quái' : 'Bạn';
          this.statusLabel?.setText(`${actor} ${this.gemName(String(gem))} × ${String(count ?? 0)}`);
        }
        break;
      }
      case 'MONSTER_MOVE_SELECTED': {
        this.stopMonsterCountdown();
        this.countdownLabel?.setColor('#f3c64f').setText('Quái chọn ngọc');
        const from = this.coordFromPayload(event.payload['from']);
        const to = this.coordFromPayload(event.payload['to']);
        if (from && to) this.showMonsterMove(from, to);
        this.statusLabel?.setText('Quái chọn ngọc');
        break;
      }
      case 'MONSTER_SWAP_STARTED':
        {
          const from = this.coordFromPayload(event.payload['from']);
          const to = this.coordFromPayload(event.payload['to']);
          if (from && to) this.animateGemSwap(from, to);
        }
        this.countdownLabel?.setColor('#f3c64f').setText('Quái đổi ngọc');
        this.statusLabel?.setText('Quái đổi ngọc');
        break;
      case 'MONSTER_SWAP_RESOLVED':
        this.countdownLabel?.setColor('#f3c64f').setText('Quái xong');
        this.statusLabel?.setText('Tới lượt bạn');
        break;
      case 'TURN_TIMED_OUT':
        this.statusLabel?.setText('Hết giờ');
        break;
      case 'MONSTER_THINKING':
        this.startMonsterCountdown(this.safeNumber(Number(event.payload['seconds'] ?? 1.2), 1.2));
        this.statusLabel?.setText('Quái đang chuẩn bị...');
        break;
      case 'DAMAGE_APPLIED':
        if (event.payload['target'] === 'player') {
          this.displayedPlayerHp = Math.max(0, (this.displayedPlayerHp ?? this.controller.currentState.player.currentHp) - amount);
          this.statusLabel?.setText(`-${amount} HP`);
          this.floatNumber(`-${amount} HP`, 80, 59, '#ff9aa4');
          this.shakePlayerBar();
        } else if (event.payload['target'] === 'monster') {
          const elementSkills = CHARACTER_DATA.elementSkills[this.heroElement];
          const isSkillAttack = event.payload['source'] === elementSkills.primarySkillId
            || event.payload['source'] === elementSkills.secondarySkillId
            || event.payload['source'] === 'cloud_break_lantern';
          const monsterShieldAbsorbed = this.safeNumber(Number(event.payload['shieldAbsorbed'] ?? 0));
          const monsterShieldBroken = Boolean(event.payload['shieldBroken'])
            || (monsterShieldAbsorbed > 0 && this.safeNumber(Number(event.payload['shieldRemaining'] ?? 0)) === 0);
          const matchCount = this.safeNumber(Number(event.payload['matchCount'] ?? 0));
          const matchLabel = matchCount >= 3 ? `X${matchCount} · ` : '';
          const onHeroImpact = () => {
            const target = this.combatPoint('monster');
            this.spawnCombatImpact(target.x, target.y, 0x9ed8ff, 48);
            if (!isSkillAttack) this.playHeroSfx('attack_impact', 0.5);
            this.playMonsterAnimation('hit');
            this.flashMonster(0xffe7a6);
            this.shakeMonster();
          };
          if (isSkillAttack) {
            const primarySkillKey = heroSkillAnimationKey(this.heroElement, 'primarySkill');
            if (this.heroSkillAnimationKey === primarySkillKey) onHeroImpact();
            else this.playHeroCastImpact(onHeroImpact);
          } else {
            this.playBasicAttackEffect();
            const playedElementAttack = this.playElementSkillAnimation('basicAttack', onHeroImpact, 375);
            if (!playedElementAttack) {
              this.playHeroAnimation('attack');
              this.playHeroAttackSfx();
              this.spawnHeroSwordProjectile(onHeroImpact);
            }
          }
          this.displayedMonsterShield = Math.max(
            0,
            (this.displayedMonsterShield ?? this.controller.currentState.monster.shield) - monsterShieldAbsorbed,
          );
          this.displayedMonsterHp = Math.max(0, (this.displayedMonsterHp ?? this.controller.currentState.monster.currentHp) - amount);
          this.showComboLabel(matchCount);
          this.statusLabel?.setText(
            amount > 0
              ? `Bạn tấn công quái${event.payload['critical'] === true ? ' · CHÍ MẠNG' : ''} · -${amount} HP${monsterShieldAbsorbed > 0 ? ` · khiên -${monsterShieldAbsorbed}` : ''}`
              : `Đòn đánh bị khiên quái hấp thụ -${monsterShieldAbsorbed}`,
          );
          const critical = event.payload['critical'] === true;
          this.floatNumber(
            amount > 0 ? `${critical ? '✦ CRIT · ' : ''}${matchLabel}-${amount} HP` : `${matchLabel}-${monsterShieldAbsorbed} khiên`,
            this.monsterPosition.x,
            104,
            amount > 0 ? (critical ? '#ffd54f' : '#ff9aa4') : '#9dceff',
          );
          if (monsterShieldBroken) this.playShieldBreakEffect('monster');
        }
        this.refreshDisplayedBars();
        break;
      case 'BURNING_APPLIED':
        if (event.payload['target'] !== 'monster') break;
        this.statusLabel?.setText(`🔥 ${this.controller.currentState.monster.name} bị Thiêu đốt · ${Number(event.payload['turns'] ?? 0)} lượt`);
        this.floatNumber(`🔥 THIÊU ĐỐT`, this.monsterPosition.x, 104, '#ff9a4d', 700);
        this.flashMonster(0xff7a45);
        break;
      case 'BURNING_TICKED':
        if (event.payload['target'] !== 'monster') break;
        this.displayedMonsterHp = Math.max(0, (this.displayedMonsterHp ?? this.controller.currentState.monster.currentHp) - amount);
        this.statusLabel?.setText(`🔥 Thiêu đốt gây ${amount} sát thương lên quái`);
        this.floatNumber(`🔥 -${amount} HP`, this.monsterPosition.x, 104, '#ff9a4d');
        this.flashMonster(0xff7a45);
        this.refreshDisplayedBars();
        break;
      case 'DEFENSE_REDUCED':
        if (event.payload['target'] !== 'monster') break;
        this.statusLabel?.setText(`🛡 Giảm phòng thủ quái ${Math.round(Number(event.payload['amount'] ?? 0) * 100)}% · ${Number(event.payload['turns'] ?? 0)} lượt`);
        this.floatNumber(`🛡 DEF -${Math.round(Number(event.payload['amount'] ?? 0) * 100)}%`, this.monsterPosition.x, 104, '#b9a7ff');
        this.flashMonster(0x9c7cff);
        break;
      case 'MONSTER_DODGED': {
        const matchCount = this.safeNumber(Number(event.payload['matchCount'] ?? 0));
        const matchLabel = matchCount >= 3 ? `X${matchCount} · ` : '';
        this.playHeroAttackSfx();
        const playDodge = () => {
          this.playMonsterEffectAnimation('dodge');
        };
        this.playBasicAttackEffect();
        if (!this.playElementSkillAnimation('basicAttack', playDodge, 375)) {
          this.playHeroAnimation('attack');
          this.spawnHeroSwordProjectile(playDodge);
        }
        this.showComboLabel(matchCount);
        this.statusLabel?.setText('Sương Hồn né đòn');
        this.floatNumber(`${matchLabel}NÉ!`, this.monsterPosition.x, 104, '#d8f4ff');
        break;
      }
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
          if (healTarget === 'player') {
            this.playHeroEffectAnimation('heal');
            this.playHeroSfx('heal', 0.5);
          }
          this.playHealEffect(healTarget);
          if (healTarget === 'monster') this.playMonsterEffectAnimation('heal');
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
        if (amount > 0) {
          this.playShieldGainEffect(shieldTarget);
          if (shieldTarget === 'player') this.playHeroSfx('shield', 0.5);
          if (shieldTarget === 'monster' && this.usesMonsterStatusSheets()) {
            this.playMonsterAnimation('defend');
          }
        }
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
        if (amount > 0) {
          this.playEnergyGainEffect(energyTarget);
        }
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
        this.countdownLabel?.setColor('#ff7a80').setText('Tuyệt kỹ');
        this.telegraphLabel?.setText('⚡ Long Miêu Liên Kích');
        this.statusLabel?.setText('Miêu Đèn ra skill');
        this.playMonsterAnimation('specialAttack');
        this.flashMonster(0xd8c2ff);
        this.lanternCatVfx?.playLongMieuLienKich();
        this.refreshDisplayedBars();
        break;
      }
      case 'PLAYER_TURN_SKIPPED':
        this.setPlayerControlsEnabled(false);
        this.countdownLabel?.setColor('#d5aaff').setText('Choáng · mất lượt');
        this.statusLabel?.setText('Nhân vật bị choáng');
        this.playHeroAnimation('stunned');
        this.playHeroStatusSfx('stunned');
        this.playerStunIcon
          ?.setPosition(this.heroVisual?.x ?? this.heroPosition.x, (this.heroVisual?.y ?? this.heroPosition.y) + this.layout.heroStunY)
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
          this.countdownLabel?.setColor('#ff7a80').setText('Quái báo đòn');
          this.telegraphLabel?.setText(`⚠ ${this.monsterActionText('heavy')}`);
          this.statusLabel?.setText('Đòn mạnh tiếp theo');
          this.tweenMonsterTelegraph();
        } else {
          this.statusLabel?.setText('Quái không gây sát thương');
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
          this.playHeroSfx('poisoned', 0.5);
          const monsterActionId = String(event.payload['actionId'] ?? '');
          if (event.payload['actor'] === 'monster') {
            const isNewMonsterAction = monsterActionId !== this.lastMonsterActionVisualId;
            if (isNewMonsterAction) {
              this.lastMonsterActionVisualId = monsterActionId;
              this.playMonsterAnimation('poisonCast');
            }
            this.time.delayedCall(260, () => {
              if (this.controller.currentState.monster.id === 'mist_blob' && isNewMonsterAction) {
                this.playMonsterSkillEffect('mist_suong_mu_xam_thuc', {
                  from: {
                    x: this.monsterVisual?.x ?? this.monsterPosition.x,
                    y: this.monsterVisual?.y ?? this.monsterPosition.y,
                  },
                  target: {
                    x: this.heroVisual?.x ?? this.heroPosition.x,
                    y: (this.heroVisual?.y ?? this.heroPosition.y) + this.layout.heroCombatY,
                  },
                  travel: true,
                  onComplete: () => {
                    this.playPoisonEffect();
                    this.playHeroAnimation('hit');
                    this.flashHero(0xd5aaff);
                    if (!this.reducedMotion) {
                      this.shakeHero();
                      this.shakePlayerBar();
                    }
                  },
                });
              } else if (this.controller.currentState.monster.id !== 'mist_blob') {
                this.spawnMonsterProjectile(() => {
                  this.playPoisonEffect();
                  this.playHeroAnimation('hit');
                  this.flashHero(0xd5aaff);
                  this.shakeHero();
                  this.shakePlayerBar();
                }, true);
              }
            });
          } else {
            this.playHeroEffectAnimation('poisonCast');
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
          this.statusLabel?.setText(`NHIỄM ĐỘC! ${this.controller.currentState.monster.name} · ${turns} lượt`);
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
          this.floatNumber(`☠ -${amount}`, this.monsterPosition.x, 104, '#d5aaff');
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
        this.countdownLabel?.setColor('#ff7a80').setText('Quái tấn công');
        this.showComboLabel(attackMatchCount);
        this.statusLabel?.setText(
          hpDamage > 0
            ? `${this.controller.currentState.monster.name} gây ${hpDamage} sát thương${shieldAbsorbed > 0 ? ` · khiên -${shieldAbsorbed}` : ''}`
            : `${this.controller.currentState.monster.name} đánh vào khiên -${shieldAbsorbed}`,
        );
        const playerImpact = this.combatPoint('player');
        const impactText = shieldAbsorbed > 0
          ? `${attackMatchLabel}-${shieldAbsorbed} khiên${hpDamage > 0 ? ` · -${hpDamage} HP` : ''}`
          : `${attackMatchLabel}-${hpDamage} HP`;
        this.floatNumber(
          impactText,
          playerImpact.x,
          playerImpact.y - 56,
          shieldAbsorbed > 0 ? '#9dceff' : '#ff9aa4',
        );
        if (shieldBroken) this.playShieldBreakEffect();
        const monsterAction = String(event.payload['action'] ?? 'basic');
        const isPoisonAction = monsterAction === 'poison';
        this.lastMonsterActionVisualId = String(event.payload['actionId'] ?? '');
        this.playMonsterAnimation(isPoisonAction ? 'poisonCast' : monsterAction === 'heavy' ? 'heavyAttack' : 'attack');
        // Let the attack pose read first; the projectile launches from the
        // monster's extended strike instead of appearing at the same moment.
        if (!isPoisonAction) this.time.delayedCall(260, () => {
          this.playMonsterBasicAttackEffect(() => {
            this.playHeroHitSfx();
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
        this.countdownLabel?.setColor('#f3c64f').setText(shieldGained > 0 ? 'Quái tạo khiên' : 'Quái phòng thủ');
        this.telegraphLabel?.setText(`◈ ${this.monsterActionText('guard')}`);
        this.statusLabel?.setText(shieldGained > 0 ? `Khiên +${shieldGained}` : 'Phòng thủ +1 lượt');
        this.playMonsterAnimation('defend');
        this.showMonsterGuardEffect();
        this.tweenMonsterTelegraph();
        break;
      case 'MONSTER_TELEGRAPH':
        this.telegraphLabel?.setText(this.formatMonsterPreparationText(String(event.payload['text'] ?? 'Quái chuẩn bị tấn công')));
        this.tweenMonsterTelegraph();
        break;
      case 'SKILL_USED':
        {
        const skillId = String(event.payload['skillId'] ?? '');
        const elementSkills = CHARACTER_DATA.elementSkills[this.heroElement];
        const isSecondary = skillId === elementSkills.secondarySkillId;
        const skillLabel = isSecondary ? elementSkills.secondarySkillLabel : elementSkills.primarySkillLabel;
        const skillSlot: ElementSkillSlot = isSecondary ? 'secondarySkill' : 'primarySkill';
        this.statusLabel?.setText(`${skillLabel}!`);
        this.playSfx(SFX_KEYS.skillCast, 0.48);
        this.playHeroSfx('cast_charge', 0.52);
        this.flashMonster(0xcda8ff);
        if (!this.playElementSkillAnimation(skillSlot)) this.playHeroAnimation('cast');
        if (!this.playHeroSkillEffect(skillId)) {
          this.playCloudbreakerEffect();
        }
        break;
        }
      case 'BATTLE_WON':
        this.statusLabel?.setText('Chiến thắng!');
        this.setPlayerControlsEnabled(false);
        this.playerStunIcon?.setVisible(false);
        this.hideMonsterGuardEffect();
        this.playMonsterAnimation('death');
        this.flashMonster(0xffe7a6);
        break;
      case 'BATTLE_LOST':
        this.statusLabel?.setText('Bạn đã bị đánh bại');
        this.setPlayerControlsEnabled(false);
        this.playerStunIcon?.setVisible(false);
        this.playHeroDeathSfx();
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
    // The status module owns the HUD layers. Feedback remains presentation
    // only and deliberately does not alter battle state.
    this.cameras.main.shake(80, 0.002);
  }

  private tweenMonsterTelegraph(): void {
    if (!this.monsterVisual) return;
    if (this.usesMonsterStatusSheets()) {
      // Mist Dust's supplied sheets already contain their own telegraph
      // treatment. Scaling the whole sprite makes the cloud jump in size.
      this.monsterVisual.setScale(1);
      this.monsterArt?.setAlpha(1);
      this.flashMonster(0xf3c64f);
      return;
    }
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

  private playMonsterAnimation(action: 'attack' | 'heavyAttack' | 'specialAttack' | 'defend' | 'poisonCast' | 'hit' | 'death'): void {
    const sprite = this.monsterSprite;
    const keys = this.monsterSpriteKeys();
    const animationKey = keys?.[action];
    if (!sprite || !animationKey || !this.anims.exists(animationKey)) return;
    const animationToken = ++this.monsterAnimationToken;

    if (this.usesMonsterStatusSheets()) {
      this.monsterTransientAnimation = action;
      this.monsterCurrentAnimationKey = animationKey;
    }
    sprite.stop();
    sprite.setAlpha(1);
    sprite.play(animationKey);
    this.normalizeMonsterSprite(sprite);
    if (action === 'death') return;

    sprite.once(`animationcomplete-${animationKey}`, () => {
      if (this.monsterSprite !== sprite || this.monsterAnimationToken !== animationToken) return;
      if (this.usesMonsterStatusSheets()) {
        this.monsterTransientAnimation = undefined;
        this.playMonsterPersistentAnimation(this.monsterPersistentStatus);
      } else if (keys && this.anims.exists(keys.idle)) {
        sprite.play(keys.idle);
        this.normalizeMonsterSprite(sprite);
      }
    });
  }

  private playMonsterEffectAnimation(
    action: 'heal' | 'antiHeal' | 'dodge' | 'stunned',
  ): void {
    if (!this.usesMonsterStatusSheets()) return;
    const sprite = this.monsterSprite;
    const keys = this.monsterSpriteKeys();
    const animationKey = keys?.[action];
    if (!sprite || !animationKey || !this.anims.exists(animationKey)) return;
    const animationToken = ++this.monsterAnimationToken;
    this.monsterTransientAnimation = action;
    this.monsterCurrentAnimationKey = animationKey;
    sprite.stop();
    sprite.setAlpha(1);
    sprite.play(animationKey);
    this.normalizeMonsterSprite(sprite);
    sprite.once(`animationcomplete-${animationKey}`, () => {
      if (this.monsterSprite !== sprite || this.monsterAnimationToken !== animationToken) return;
      this.monsterTransientAnimation = undefined;
      this.playMonsterPersistentAnimation(this.monsterPersistentStatus);
    });
  }

  private playElementSkillAnimation(
    slot: ElementSkillSlot,
    onImpact?: () => void,
    impactDelay = 500,
  ): boolean {
    const sprite = this.heroSprite;
    const animationKey = heroSkillAnimationKey(this.heroElement, slot);
    if (!sprite || !this.anims.exists(animationKey)) return false;
    this.heroTransientAnimation = slot === 'basicAttack' ? 'attack' : 'cast';
    this.heroSkillAnimationKey = animationKey;
    const animationToken = ++this.heroSkillAnimationToken;
    sprite.setVisible(true).stop().play(animationKey);
    this.normalizeHeroSprite(sprite);
    let animationDone = false;
    let impactPlayed = false;
    const finish = () => {
      if (!animationDone || !impactPlayed || this.heroSprite !== sprite || this.heroSkillAnimationToken !== animationToken) return;
      this.heroSkillAnimationKey = undefined;
      this.heroTransientAnimation = undefined;
      this.heroCurrentAnimationKey = undefined;
      this.playHeroPersistentAnimation(this.heroPersistentStatus);
    };
    const playImpact = () => {
      if (impactPlayed || this.heroSkillAnimationKey !== animationKey || this.heroSkillAnimationToken !== animationToken) return;
      impactPlayed = true;
      onImpact?.();
      finish();
    };
    if (onImpact) this.time.delayedCall(this.reducedMotion ? 80 : impactDelay, playImpact);
    sprite.once(`animationcomplete-${animationKey}`, () => {
      if (this.heroSprite !== sprite || this.heroSkillAnimationToken !== animationToken) return;
      animationDone = true;
      if (!onImpact) playImpact();
      finish();
    });
    return true;
  }

  private playHeroAnimation(key: 'attack' | 'cast' | 'hit' | 'death' | 'stunned'): void {
    const sprite = this.heroSprite;
    const animationKey = this.heroSpriteKeys[key];
    if (!sprite || !animationKey || !this.anims.exists(animationKey)) return;

    this.heroSkillAnimationToken += 1;
    this.heroSkillAnimationKey = undefined;
    sprite.setVisible(true);
    this.heroTransientAnimation = key;
    sprite.stop();
    sprite.play(animationKey);
    this.normalizeHeroSprite(sprite);
    this.heroCurrentAnimationKey = animationKey;
    if (key === 'death') return;

    sprite.once(`animationcomplete-${animationKey}`, () => {
      if (this.heroSprite !== sprite) return;
      this.heroTransientAnimation = undefined;
      this.heroCurrentAnimationKey = undefined;
      this.playHeroPersistentAnimation(this.heroPersistentStatus);
    });
  }

  private playHeroEffectAnimation(key: 'heal' | 'antiHeal' | 'dodge' | 'poisonCast'): void {
    const sprite = this.heroSprite;
    const animationKey = key === 'antiHeal'
      ? this.heroSpriteKeys.antiHeal
      : key === 'poisonCast'
        ? this.heroSpriteKeys.poisonCast
        : this.heroSpriteKeys[key];
    if (!sprite || !animationKey || !this.anims.exists(animationKey)) return;

    this.heroSkillAnimationToken += 1;
    this.heroSkillAnimationKey = undefined;
    sprite.setVisible(true);
    this.heroTransientAnimation = key;
    sprite.stop();
    sprite.play(animationKey);
    this.normalizeHeroSprite(sprite);
    this.heroCurrentAnimationKey = animationKey;
    sprite.once(`animationcomplete-${animationKey}`, () => {
      if (this.heroSprite !== sprite) return;
      this.heroTransientAnimation = undefined;
      this.heroCurrentAnimationKey = undefined;
      this.playHeroPersistentAnimation(this.heroPersistentStatus);
    });
  }

  private playHeroCastImpact(onImpact?: () => void): void {
    const target = this.combatPoint('monster');
    const animationKey = this.heroSpriteKeys.castImpact;
    if (!this.textures.exists(animationKey) || !this.anims.exists(animationKey)) {
      onImpact?.();
      return;
    }
    const impact = this.add
      .sprite(target.x, target.y, animationKey, 0)
      .setOrigin(0.5)
      .setDisplaySize(112, 112)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(17)
      .play(animationKey);
    this.playHeroSfx('cast_impact', 0.5);
    this.transientEffects.add(impact);
    onImpact?.();
    impact.once(`animationcomplete-${animationKey}`, () => {
      this.destroyTransientEffect(impact);
    });
  }

  private spawnHeroSwordProjectile(onImpact?: () => void): void {
    const start = this.combatPoint('player');
    const target = this.combatPoint('monster');
    const launch = { x: start.x + 24, y: start.y - 14 };
    const impact = { x: target.x - 18, y: target.y - 8 };
    const angle = Phaser.Math.Angle.Between(launch.x, launch.y, impact.x, impact.y);
    const duration = this.reducedMotion ? 190 : 340;

    const attackFxKey = this.heroSpriteKeys.attackFx;
    if (this.textures.exists(attackFxKey) && this.anims.exists(attackFxKey)) {
      const slash = this.add
        .sprite(start.x, start.y - 8, attackFxKey, 0)
        .setOrigin(0.5)
        .setDisplaySize(108, 108)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(16)
        .play(attackFxKey);
      this.transientEffects.add(slash);
      this.playHeroSfx('normal_attack_fx', 0.46);
      slash.once(`animationcomplete-${attackFxKey}`, () => this.destroyTransientEffect(slash));
    }

    this.time.delayedCall(this.reducedMotion ? 40 : 110, () => {
      const projectileKey = this.heroSpriteKeys.projectile;
      const projectile = this.textures.exists(projectileKey) && this.anims.exists(projectileKey)
        ? this.add
          .sprite(launch.x, launch.y, projectileKey, 0)
          .setOrigin(0.5)
          .setDisplaySize(88, 88)
          .setRotation(angle)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(16)
          .play(projectileKey)
        : undefined;
      if (projectile) {
        this.transientEffects.add(projectile);
        this.playHeroSfx('attack_projectile', 0.46);
        this.spawnTravelTrail(launch, impact, 0x9ed8ff, duration);
        this.tweens.add({
          targets: projectile,
          x: impact.x,
          y: impact.y,
          scale: 1.08,
          duration,
          ease: 'Cubic.In',
          onComplete: () => {
            this.destroyTransientEffect(projectile);
            onImpact?.();
          },
        });
        return;
      }

      const sword = this.add.container(launch.x, launch.y).setRotation(angle).setDepth(16);
      const glow = this.add.graphics();
      glow.lineStyle(14, 0x8fdcff, 0.24);
      glow.beginPath();
      glow.moveTo(-42, 0);
      glow.lineTo(28, 0);
      glow.strokePath();
      const blade = this.add
        .polygon(0, 0, [-34, -5, 18, -5, 32, 0, 18, 5, -34, 5], 0xdff8ff, 1)
        .setStrokeStyle(2, 0xffffff, 1);
      const guard = this.add.rectangle(-28, 0, 4, 18, 0xffd45e, 1).setStrokeStyle(1, 0xfff0ad, 1);
      const handle = this.add.rectangle(-38, 0, 16, 6, 0x6c4334, 1);
      sword.add([glow, blade, guard, handle]);
      this.transientEffects.add(sword);
      this.playHeroSfx('attack_projectile', 0.46);
      this.spawnTravelTrail(launch, impact, 0x9ed8ff, duration);
      this.tweens.add({
        targets: sword,
        x: impact.x,
        y: impact.y,
        scale: 1.08,
        duration,
        ease: 'Cubic.In',
        onComplete: () => {
          this.destroyTransientEffect(sword);
          onImpact?.();
        },
      });
    });
  }

  private spawnMonsterProjectile(onImpact?: () => void, poison = false): void {
    const start = {
      x: (this.monsterVisual?.x ?? this.monsterPosition.x) - 22,
      y: (this.monsterVisual?.y ?? this.monsterPosition.y) + 6,
    };
    const target = {
      x: this.heroVisual?.x ?? this.heroPosition.x,
      y: (this.heroVisual?.y ?? this.heroPosition.y) + this.layout.heroCombatY,
    };
    const color = poison ? 0xd5aaff : this.controller.currentState.monster.id === 'lantern_cat' ? 0xffd45e : 0x8ff3ff;
    const monsterId = this.controller.currentState.monster.id;
    const textureKey = this.monsterSpriteKeys()?.projectile;
    const projectileFrameKey = monsterId === 'mist_blob'
      || monsterId === 'lantern_cat'
      || monsterId === 'cloud_fox_boss'
      ? actorFrameKey(monsterId, 'element_projectile', 0)
      : undefined;
    const hasProjectileAnimation = Boolean(
      textureKey
      && projectileFrameKey
      && this.textures.exists(projectileFrameKey)
      && this.anims.exists(textureKey),
    );
    this.spawnTravelTrail(start, target, color, poison ? 360 : 420);
    const projectile = hasProjectileAnimation && textureKey && projectileFrameKey
      ? this.add
        .sprite(start.x, start.y, projectileFrameKey, 0)
        .setOrigin(0.5)
        .setDisplaySize(62, 62)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(14)
        .setRotation(Phaser.Math.Angle.Between(start.x, start.y, target.x, target.y))
        .play(textureKey)
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
      rotation: hasProjectileAnimation ? projectile.rotation + Math.PI * 0.7 : 0,
      duration: poison ? 360 : 420,
      ease: 'Cubic.In',
      onComplete: () => {
        this.destroyTransientEffect(projectile);
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
      ? { x: this.monsterVisual?.x ?? this.monsterPosition.x, y: (this.monsterVisual?.y ?? this.monsterPosition.y) + this.layout.monsterCombatY }
      : { x: this.heroVisual?.x ?? this.heroPosition.x, y: (this.heroVisual?.y ?? this.heroPosition.y) + this.layout.heroCombatY };
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
    if (target === 'player') this.playHeroStatusSfx('energy');
    this.spawnCombatImpact(x, y, 0xffd45e, target === 'monster' ? 62 : 72);
    this.flashCombatant(target, 0xffd45e);
  }

  private playHeroSkillEffect(skillId: string): boolean {
    const effect = heroSkillEffectForSkill(skillId);
    const target = this.combatPoint('monster');
    if (!effect || !this.battleVfxPool || !this.anims.exists(effect.animationKey)) return false;
    const sprite = this.battleVfxPool.acquireSpriteVfx(effect.textureKeys[0]);
    if (!sprite) return false;
    const displaySize = fitHeroSkillEffectDisplaySize(effect);
    let released = false;
    const finish = (): void => {
      if (released) return;
      released = true;
      this.vfxSprites.delete(sprite);
      this.battleVfxPool?.release(sprite);
    };
    sprite
      .setPosition(target.x, target.y)
      .setOrigin(0.5)
      .setDisplaySize(displaySize.width, displaySize.height)
      .setDepth(16)
      .setAlpha(1)
      .setVisible(true)
      .setBlendMode(Phaser.BlendModes.ADD)
      .play(effect.animationKey);
    sprite.anims.timeScale = this.reducedMotion ? 1.8 : 1;
    this.vfxSprites.add(sprite);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, finish);
    return true;
  }

  private playBasicAttackEffect(): void {
    const effect = basicAttackEffectForElement(this.heroElement);
    if (!this.battleVfxPool || !this.anims.exists(effect.animationKey)) return;
    const sprite = this.battleVfxPool.acquireSpriteVfx(effect.textureKeys[0]);
    if (!sprite) return;
    const start = this.combatPoint('player');
    const target = this.combatPoint('monster');
    const launch = { x: start.x + 18, y: start.y - 16 };
    const impact = { x: target.x - 18, y: target.y - 8 };
    const displaySize = fitBasicAttackEffectDisplaySize(effect);
    const travelDuration = this.reducedMotion ? 220 : 360;
    let released = false;
    let animationDone = false;
    let travelDone = false;
    const finish = (): void => {
      if (released || !animationDone || !travelDone) return;
      released = true;
      this.vfxSprites.delete(sprite);
      this.battleVfxPool?.release(sprite);
    };
    sprite
      .setPosition(launch.x, launch.y)
      .setOrigin(0.5)
      .setDisplaySize(displaySize.width, displaySize.height)
      .setRotation(Phaser.Math.Angle.Between(launch.x, launch.y, impact.x, impact.y))
      .setDepth(16)
      .setAlpha(1)
      .setVisible(true)
      .setBlendMode(Phaser.BlendModes.ADD)
      .play(effect.animationKey);
    sprite.anims.timeScale = this.reducedMotion ? 1.8 : 1;
    this.vfxSprites.add(sprite);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      animationDone = true;
      finish();
    });
    this.tweens.add({
      targets: sprite,
      x: impact.x,
      y: impact.y,
      duration: travelDuration,
      ease: 'Cubic.Out',
      onComplete: () => {
        travelDone = true;
        finish();
      },
    });
  }

  private playCloudbreakerEffect(): void {
    const start = this.combatPoint('player');
    const target = this.combatPoint('monster');
    this.spawnVfx(SKILL_VFX_KEYS.castCircle, start.x, start.y, 112, 12);
    this.spawnVfx(SKILL_VFX_KEYS.chargeAura, start.x, start.y, 100, 13);
    this.spawnVfx(SKILL_VFX_KEYS.swordGlow, start.x + 12, start.y - 8, 96, 14);

    this.time.delayedCall(180, () => {
      this.playHeroSfx('cast_release', 0.5);
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

  private playShieldGainEffect(target: 'player' | 'monster' = 'player'): void {
    const { x, y } = this.combatPoint(target);
    if (target === 'player') this.playHeroStatusSfx('shield');
    this.statusUi?.setShieldVisible(target, true);
    this.spawnCombatImpact(x, y, 0x9dceff, 58);
    this.flashCombatant(target, 0x9dceff);
  }

  private playShieldBreakEffect(target: 'player' | 'monster' = 'player'): void {
    const { x, y } = this.combatPoint(target);
    this.statusUi?.setShieldVisible(target, false);

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
    const x = this.heroVisual?.x ?? this.heroPosition.x;
    const y = (this.heroVisual?.y ?? this.heroPosition.y) + this.layout.heroCombatY;
    this.playHeroStatusSfx('poisoned');
    this.statusUi?.setPoisonVisible('player', true);
    this.spawnCombatImpact(x, y, 0xd5aaff, 54);
    this.flashHero(0xd5aaff);
    this.spawnPoisonSmoke(x, y);
  }

  private playPoisonProjectile(): void {
    const start = {
      x: this.boardLeft + this.boardWidth / 2,
      y: this.boardTop + this.boardWidth / 2,
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
        this.statusUi?.setPoisonVisible('monster', true);
        this.floatNumber(`☠ NHIỄM ĐỘC!`, target.x, target.y - 48, '#d5aaff', 700);
        this.spawnPoisonSmoke(target.x, target.y);
      },
    });
  }

  private playPoisonTickEffect(target: 'player' | 'monster'): void {
    const point = this.combatPoint(target);
    this.statusUi?.setPoisonVisible(target, true);
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
    this.statusUi?.setShieldVisible('monster', true);
    this.playShieldGainEffect('monster');
  }

  private hideMonsterGuardEffect(): void {
    this.statusUi?.setShieldVisible('monster', false);
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

  private formatMonsterPreparationText(text: string): string {
    const monsterName = this.controller.currentState.monster.name;
    const withoutName = text.replace(`${monsterName} `, '').trim();
    if (withoutName.startsWith('chuẩn bị ')) return `Quái ${withoutName}`;
    if (withoutName.startsWith('đang chuẩn bị')) return `Quái ${withoutName}`;
    return `Quái chuẩn bị ${withoutName}`;
  }

  private syncTurnTimer(preserveStatus = false): void {
    if (this.controller.currentState.phase !== 'PLAYER_READY' || this.controller.isLocked) {
      this.stopTurnTimer();
      this.setPlayerTurnHighlight(false);
      this.setPlayerControlsEnabled(false);
      return;
    }
    this.stopMonsterCountdown();
    this.stopTurnTimer();
    this.stopMoveHint();
    this.remainingSeconds = DEFAULT_BATTLE_CONFIG.playerTurnSeconds;
    this.updateCountdownLabel();
    this.setPlayerTurnHighlight(true);
    if (!preserveStatus) this.statusLabel?.setText('TỚI LƯỢT BẠN · Đổi 2 ô kề nhau');
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
    this.statusLabel?.setText('Đổi 2 ô đang nhấp nháy');
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
          this.countdownLabel?.setColor('#f3c64f').setText('Quái ra đòn');
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
    this.countdownLabel?.setColor(color).setText(`⚔ ${seconds.toFixed(1)}s`);
  }

  private updateCountdownLabel(): void {
    const color = this.remainingSeconds <= 3 ? '#ff7a80' : '#f3c64f';
    this.countdownLabel?.setColor(color).setText(`⏱ ${Math.max(0, this.remainingSeconds)}s`);
  }

  private setPlayerTurnHighlight(active: boolean): void {
    this.countdownLabel?.setColor(active ? '#86f7b0' : '#f3c64f');
    if (active) this.showPlayerTurnPrompt();
  }

  private showPlayerTurnPrompt(): void {
    const prompt = this.playerTurnPrompt;
    if (!prompt) return;
    this.tweens.killTweensOf(prompt);
    prompt
      .setPosition(this.logicalWidth / 2, this.logicalHeight * 0.48)
      .setScale(0.82)
      .setAlpha(1)
      .setVisible(true);
    this.tweens.add({
      targets: prompt,
      scale: { from: 0.82, to: 1.06 },
      alpha: { from: 1, to: 0 },
      duration: 1050,
      ease: 'Cubic.Out',
      onComplete: () => prompt.setVisible(false),
    });
  }

  private showComboLabel(matchCount: number): void {
    if (!this.comboLabel) return;
    if (matchCount < 3) {
      this.comboLabel.setVisible(false);
      return;
    }
    this.comboLabel.setText(`X${matchCount}`).setVisible(true);
    this.time.delayedCall(1000, () => this.comboLabel?.setVisible(false));
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
      this.boardLeft + coord.col * this.cellSize + this.cellSize / 2,
      this.boardTop + coord.row * this.cellSize + this.cellSize / 2,
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

  private setPlayerControlsEnabled(enabled: boolean): void {
    for (const [index, skillButton] of this.skillButtons.entries()) {
      // Skill inputs stay enabled even when the skill is energy-locked or the
      // turn is processing, so a 2s hold can always open its tooltip. A short
      // press is still guarded by dispatchSkill/canPlayerAct.
      if (skillButton.input) skillButton.input.enabled = true;
      const skillIcon = this.skillIcons[index];
      if (skillIcon?.input) skillIcon.input.enabled = true;
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
    const col = Math.floor((x - this.boardLeft) / this.cellSize);
    const row = Math.floor((y - this.boardTop) / this.cellSize);
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return undefined;
    return { row, col };
  }

  private renderSelection(): void {
    if (!this.selectedCell) {
      this.selection?.setVisible(false);
      this.selectionRing?.setVisible(false);
      return;
    }
    const x = this.boardLeft + this.selectedCell.col * this.cellSize + this.cellSize / 2;
    const y = this.boardTop + this.selectedCell.row * this.cellSize + this.cellSize / 2;
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
        this.boardLeft + (center.col / coords.length + 0.5) * this.cellSize,
        this.boardTop + (center.row / coords.length + 0.5) * this.cellSize,
        84,
      );
      return;
    }
    for (const coord of coords) {
      this.spawnVfx(
        key,
        this.boardLeft + coord.col * this.cellSize + this.cellSize / 2,
        this.boardTop + coord.row * this.cellSize + this.cellSize / 2,
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
      x: this.boardLeft + coord.col * this.cellSize + this.cellSize / 2,
      y: this.boardTop + coord.row * this.cellSize + this.cellSize / 2,
    };
  }

  private durationForEvent(event: GameEvent): number {
    switch (event.type) {
      case 'SWAP_STARTED': return 160;
      case 'MATCH_FOUND': return 180;
      case 'GEMS_CLEARED': return 520;
      case 'DAMAGE_APPLIED':
        return event.payload['target'] === 'monster' ? 560 : 360;
      case 'MONSTER_DODGED': return 560;
      case 'HEAL_APPLIED': return 360;
      case 'POISON_APPLIED': return event.payload['target'] === 'monster' ? 720 : 420;
      case 'POISON_TICKED': return 520;
      case 'GEMS_FALLING': return GEM_FALL_DURATION;
      case 'GEMS_REFILLED': return GEM_REFILL_DURATION;
      case 'MONSTER_ATTACKED': return event.payload['lethal'] === true ? 1400 : 1000;
      case 'MONSTER_ACTION_SKIPPED': return 260;
      case 'MONSTER_GUARDED': return 260;
      case 'SKILL_USED': return this.reducedMotion ? 120 : 800;
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
    this.skillLongPressTimer?.remove(false);
    this.skillLongPressTimer = undefined;
    this.skillTooltipHideTimer?.remove(false);
    this.skillTooltipHideTimer = undefined;
    this.stopTurnTimer();
    this.stopMonsterCountdown();
    this.statusUi?.destroy();
    this.statusUi = undefined;
    this.lanternCatVfx?.cleanup();
    this.lanternCatVfx = undefined;
    this.hideMonsterMove();
    this.selectionRing?.destroy();
    this.selectionRing = undefined;
    for (const fx of this.vfxSprites) this.battleVfxPool?.release(fx);
    this.vfxSprites.clear();
    for (const effect of this.transientEffects) effect.destroy();
    this.transientEffects.clear();
    this.gemSprites.clear();
    this.battleVfxPool?.destroy();
    this.battleVfxPool = undefined;
    this.gemPool?.destroy();
    this.gemPool = undefined;
  }
}
