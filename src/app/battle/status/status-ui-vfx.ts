import Phaser from 'phaser';
import type { BattleBounds, BattlePoint } from '../battle-layout';
import {
  HUD_BAR_CROPS,
  STATUS_UI_KEYS,
  ensureStatusUiAnimations,
} from './status-ui-assets';

export interface StatusOverlayState {
  readonly shield: boolean;
  readonly poison: boolean;
  readonly energy: boolean;
}

export interface StatusModel {
  readonly currentHp: number;
  readonly maxHp: number;
  readonly shield: number;
  readonly poisonPotency: number;
  readonly poisonTurns: number;
  readonly energy: number;
}

export function getStatusOverlayState(shield: number, poisonTurns: number, energy: number): StatusOverlayState {
  const hasShield = Number.isFinite(shield) && shield > 0;
  return {
    shield: hasShield,
    // Shield is the higher-priority visual state when both effects are active.
    poison: !hasShield && Number.isFinite(poisonTurns) && poisonTurns > 0,
    // Keep the current gameplay threshold. The asset name is energy70plus,
    // but battle rules intentionally activate the aura above 50.
    energy: Number.isFinite(energy) && energy > 50,
  };
}

export function formatStatusText(status: StatusModel): string {
  return `${formatStatusNumber(status.currentHp)}/${formatStatusNumber(status.maxHp)}`;
}

function formatStatusNumber(value: number): string {
  return Number.isFinite(value) ? String(value === 0 ? 0 : value) : '0';
}

interface StatusUiVfxOptions {
  readonly scene: Phaser.Scene;
  readonly heroPosition: BattlePoint;
  readonly monsterPosition: BattlePoint;
  readonly playerStatusBounds: BattleBounds;
  readonly monsterStatusBounds: BattleBounds;
  readonly statusBarY: number;
  readonly statusBadgeY: number;
  readonly energyBarY: number;
  readonly monsterStatusBarY: number;
  readonly monsterStatusBadgeY: number;
  readonly monsterEnergyBarY: number;
  readonly heroUsesInlineStatus: boolean;
  readonly monsterUsesInlineStatus: boolean;
  readonly renderQuality: number;
}

interface BarView {
  readonly frame: Phaser.GameObjects.Image;
  readonly fill: Phaser.GameObjects.Graphics;
  readonly text: Phaser.GameObjects.Text;
  readonly bounds: BattleBounds;
  readonly y: number;
  readonly fillColor: number;
  readonly reverse: boolean;
  readonly innerLeft: number;
  readonly innerWidth: number;
}

interface BadgeView {
  readonly background: Phaser.GameObjects.Rectangle;
  readonly icon: Phaser.GameObjects.Image;
  readonly text: Phaser.GameObjects.Text;
}

interface OverlayView {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly position: 'hero' | 'monster';
}

const STATUS_BAR_HEIGHT = 22;
const BAR_INNER_LEFT = 29;
const BAR_INNER_TOP = -6;
const BAR_INNER_WIDTH = 100;
const BAR_INNER_HEIGHT = 12;
const BAR_INNER_MIN_WIDTH = 62;
const HERO_OVERLAY_SIZE = 92;
const MONSTER_OVERLAY_SIZE = 84;
const STATUS_TEXT_STYLE = {
  color: '#fff8e8',
  fontFamily: 'sans-serif',
  fontSize: '8px',
  fontStyle: 'bold',
  stroke: '#171426',
  strokeThickness: 2,
} as const;

export interface StatusFillGeometry {
  readonly left: number;
  readonly width: number;
}

export function getStatusFillGeometry(
  bounds: BattleBounds,
  reverse: boolean,
  ratio: number,
): StatusFillGeometry {
  const innerWidth = getStatusInnerWidth(bounds.width);
  const fillWidth = innerWidth * Math.max(0, Math.min(1, ratio));
  return {
    left: reverse
      ? bounds.right - BAR_INNER_LEFT - fillWidth
      : bounds.left + BAR_INNER_LEFT,
    width: fillWidth,
  };
}

function getStatusInnerWidth(width: number): number {
  return Math.max(BAR_INNER_MIN_WIDTH, Math.min(BAR_INNER_WIDTH, width - BAR_INNER_LEFT - 11));
}

/** Presentation-only status HUD and persistent combat overlays. */
export class StatusUiVfx {
  private readonly scene: Phaser.Scene;
  private heroPosition: BattlePoint;
  private monsterPosition: BattlePoint;
  private readonly healthPlayer: BarView;
  private readonly healthMonster: BarView;
  private readonly energyPlayer: BarView;
  private readonly energyMonster: BarView;
  private readonly heroShieldBadge: BadgeView;
  private readonly heroPoisonBadge: BadgeView;
  private readonly monsterShieldBadge: BadgeView;
  private readonly monsterPoisonBadge: BadgeView;
  private readonly renderQuality: number;
  private readonly overlays: Record<keyof typeof STATUS_UI_KEYS, OverlayView | undefined> = {
    heroShield: undefined,
    heroPoison: undefined,
    heroEnergy: undefined,
    monsterShield: undefined,
    monsterPoison: undefined,
    monsterEnergy: undefined,
    healthBars: undefined,
    energyBars: undefined,
  };

  constructor(options: StatusUiVfxOptions) {
    this.scene = options.scene;
    this.heroPosition = options.heroPosition;
    this.monsterPosition = options.monsterPosition;
    this.renderQuality = options.renderQuality;
    ensureStatusUiAnimations(this.scene);

    this.healthPlayer = this.createBar(options.playerStatusBounds, options.statusBarY, 0x57c982, false);
    this.healthMonster = this.createBar(options.monsterStatusBounds, options.monsterStatusBarY, 0xe75b62, true, 'status-monster-health-bars');
    this.energyPlayer = this.createBar(options.playerStatusBounds, options.energyBarY, 0xf3c64f, false, STATUS_UI_KEYS.energyBars, '#f3c64f');
    this.energyMonster = this.createBar(options.monsterStatusBounds, options.monsterEnergyBarY, 0xf3c64f, true, 'status-monster-energy-bars', '#f3c64f');

    const heroBadgeLeft = options.playerStatusBounds.left + 4;
    const monsterBadgeRight = options.monsterStatusBounds.right - 4;
    this.heroShieldBadge = this.createBadge(heroBadgeLeft, options.statusBadgeY, 'gem-shield', 'shield');
    this.heroPoisonBadge = this.createBadge(heroBadgeLeft + 53, options.statusBadgeY, 'gem-poison-pure', 'poison');
    this.monsterPoisonBadge = this.createBadge(monsterBadgeRight - 50, options.monsterStatusBadgeY, 'gem-poison-pure', 'poison');
    this.monsterShieldBadge = this.createBadge(monsterBadgeRight - 103, options.monsterStatusBadgeY, 'gem-shield', 'shield');

    if (!options.heroUsesInlineStatus) {
      this.createOverlay('heroShield', STATUS_UI_KEYS.heroShield, 'hero', HERO_OVERLAY_SIZE);
      this.createOverlay('heroPoison', STATUS_UI_KEYS.heroPoison, 'hero', HERO_OVERLAY_SIZE);
      this.createOverlay('heroEnergy', STATUS_UI_KEYS.heroEnergy, 'hero', HERO_OVERLAY_SIZE);
    }
    if (!options.monsterUsesInlineStatus) {
      this.createOverlay('monsterShield', STATUS_UI_KEYS.monsterShield, 'monster', MONSTER_OVERLAY_SIZE);
      this.createOverlay('monsterPoison', STATUS_UI_KEYS.monsterPoison, 'monster', MONSTER_OVERLAY_SIZE);
      this.createOverlay('monsterEnergy', STATUS_UI_KEYS.monsterEnergy, 'monster', MONSTER_OVERLAY_SIZE);
    }
  }

  setPositions(heroPosition: BattlePoint, monsterPosition: BattlePoint): void {
    this.heroPosition = heroPosition;
    this.monsterPosition = monsterPosition;
    this.syncOverlayPositions();
  }

  syncStatus(player: StatusModel, monster: StatusModel): void {
    this.updateStatusBar(this.healthPlayer, player);
    this.updateStatusBar(this.healthMonster, monster);
    this.updateEnergyBar(this.energyPlayer, player.energy);
    this.updateEnergyBar(this.energyMonster, monster.energy);
    this.syncStatusOverlays('hero', player);
    this.syncStatusOverlays('monster', monster);
    this.updateBadges('hero', player);
    this.updateBadges('monster', monster);
  }

  setShieldVisible(target: 'player' | 'monster', visible: boolean): void {
    this.setOverlayVisible(target === 'player' ? 'heroShield' : 'monsterShield', visible);
  }

  setPoisonVisible(target: 'player' | 'monster', visible: boolean): void {
    this.setOverlayVisible(target === 'player' ? 'heroPoison' : 'monsterPoison', visible);
  }

  destroy(): void {
    for (const bar of [this.healthPlayer, this.healthMonster, this.energyPlayer, this.energyMonster]) {
      bar.fill.destroy();
      bar.frame.destroy();
      bar.text.destroy();
    }
    for (const badge of [this.heroShieldBadge, this.heroPoisonBadge, this.monsterShieldBadge, this.monsterPoisonBadge]) {
      badge.background.destroy();
      badge.icon.destroy();
      badge.text.destroy();
    }
    for (const overlay of Object.values(this.overlays)) overlay?.sprite.destroy();
  }

  private createBar(
    bounds: BattleBounds,
    y: number,
    fillColor: number,
    reverse: boolean,
    textureKey: string = STATUS_UI_KEYS.healthBars,
    textColor = '#fff8e8',
  ): BarView {
    const innerWidth = getStatusInnerWidth(bounds.width);
    const barY = Math.round(y);
    const textX = Math.round((bounds.left + bounds.right) / 2);
    const fill = this.scene.add.graphics().setDepth(100);
    const crop = this.cropFor(textureKey);
    const frame = this.scene.add
      .image(Math.round((bounds.left + bounds.right) / 2), barY, textureKey, 0)
      .setCrop(crop.x, crop.y, crop.width, crop.height)
      .setDisplaySize(bounds.width, STATUS_BAR_HEIGHT)
      .setFlipX(reverse)
      .setDepth(101);
    const text = this.scene.add.text(Math.round(textX), barY, '', { ...STATUS_TEXT_STYLE, color: textColor })
      .setResolution(this.renderQuality)
      .setOrigin(0.5, 0.5)
      .setDepth(103);
    return { frame, fill, text, bounds, y: barY, fillColor, reverse, innerLeft: BAR_INNER_LEFT, innerWidth };
  }

  private updateStatusBar(bar: BarView, status: StatusModel): void {
    this.updateBar(bar, status.currentHp, status.maxHp);
    bar.text.setText(formatStatusText(status));
  }

  private updateEnergyBar(bar: BarView, energy: number): void {
    this.updateBar(bar, energy, 100);
    bar.text.setText(`⚡${formatStatusNumber(energy)}/100`);
  }

  private updateBadges(prefix: 'hero' | 'monster', status: StatusModel): void {
    const shield = prefix === 'hero' ? this.heroShieldBadge : this.monsterShieldBadge;
    const poison = prefix === 'hero' ? this.heroPoisonBadge : this.monsterPoisonBadge;
    this.setBadge(shield, status.shield > 0, formatStatusNumber(status.shield));
    this.setBadge(poison, status.poisonTurns > 0, `${formatStatusNumber(status.poisonPotency)} ·${formatStatusNumber(status.poisonTurns)}`);
  }

  private setBadge(badge: BadgeView, visible: boolean, value: string): void {
    badge.background.setVisible(visible);
    badge.icon.setVisible(visible);
    badge.text.setVisible(visible).setText(value);
  }

  private syncStatusOverlays(position: 'hero' | 'monster', status: StatusModel): void {
    const prefix = position === 'hero' ? 'hero' : 'monster';
    const overlayState = getStatusOverlayState(status.shield, status.poisonTurns, status.energy);
    this.setOverlayVisible(`${prefix}Shield` as keyof typeof STATUS_UI_KEYS, overlayState.shield);
    this.setOverlayVisible(`${prefix}Poison` as keyof typeof STATUS_UI_KEYS, overlayState.poison);
    this.setOverlayVisible(`${prefix}Energy` as keyof typeof STATUS_UI_KEYS, overlayState.energy);
  }

  private updateBar(bar: BarView, value: number, max: number): void {
    const ratio = clampRatio(value, max);
    bar.fill.clear();
    bar.fill.fillStyle(bar.fillColor, 0.95);
    const fill = getStatusFillGeometry(bar.bounds, bar.reverse, ratio);
    bar.fill.fillRoundedRect(
      Math.round(fill.left),
      bar.y + BAR_INNER_TOP,
      Math.round(fill.width),
      BAR_INNER_HEIGHT,
      6,
    );
  }

  private createOverlay(
    name: keyof typeof STATUS_UI_KEYS,
    textureKey: string,
    position: 'hero' | 'monster',
    displaySize: number,
  ): void {
    const point = position === 'hero' ? this.heroPosition : this.monsterPosition;
    const animationKey = STATUS_UI_KEYS[name];
    if (!this.scene.textures.exists(textureKey) || !this.scene.anims.exists(animationKey)) return;
    const sprite = this.scene.add
      .sprite(point.x, point.y, textureKey, 0)
      .setDisplaySize(displaySize, displaySize)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(22)
      .setVisible(false)
      .play(animationKey);
    this.overlays[name] = { sprite, position };
  }

  private createBadge(x: number, y: number, iconKey: string, kind: 'shield' | 'poison'): BadgeView {
    const width = kind === 'shield' ? 48 : 50;
    const background = this.scene.add.rectangle(x + width / 2, y, width, 19, kind === 'shield' ? 0x244d78 : 0x553477, 0.96)
      .setStrokeStyle(1, kind === 'shield' ? 0x9dceff : 0xd5aaff, 0.9)
      .setDepth(104)
      .setVisible(false);
    const icon = this.scene.add.image(x + 9, y, iconKey)
      .setDisplaySize(15, 15)
      .setDepth(105)
      .setVisible(false);
    const text = this.scene.add.text(x + 17, y, '', { ...STATUS_TEXT_STYLE, fontSize: '8px' })
      .setResolution(this.renderQuality)
      .setOrigin(0, 0.5)
      .setDepth(105)
      .setVisible(false);
    return { background, icon, text };
  }

  private cropFor(textureKey: string): { x: number; y: number; width: number; height: number } {
    if (textureKey === STATUS_UI_KEYS.healthBars) return HUD_BAR_CROPS.heroHp;
    if (textureKey === STATUS_UI_KEYS.energyBars) return HUD_BAR_CROPS.heroEnergy;
    if (textureKey === 'status-monster-health-bars') return HUD_BAR_CROPS.monsterHp;
    return HUD_BAR_CROPS.monsterEnergy;
  }

  private setOverlayVisible(name: keyof typeof STATUS_UI_KEYS, visible: boolean): void {
    const overlay = this.overlays[name];
    if (!overlay) return;
    overlay.sprite.setVisible(visible).setAlpha(visible ? 0.9 : 0);
    if (!visible) overlay.sprite.stop();
    else if (!overlay.sprite.anims.isPlaying) overlay.sprite.play(STATUS_UI_KEYS[name]);
  }

  private syncOverlayPositions(): void {
    for (const overlay of Object.values(this.overlays)) {
      if (!overlay) continue;
      const point = overlay.position === 'hero' ? this.heroPosition : this.monsterPosition;
      overlay.sprite.setPosition(point.x, point.y);
    }
  }
}

export function clampRatio(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.max(0, Math.min(1, value / max));
}
