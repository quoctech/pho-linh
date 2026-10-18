import Phaser from 'phaser';
import type { BattleBounds, BattlePoint } from '../battle-layout';
import {
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
  const tokens = [`${formatStatusNumber(status.currentHp)}/${formatStatusNumber(status.maxHp)}`];
  if (status.shield > 0) tokens.push(`🛡${formatStatusNumber(status.shield)}`);
  if (status.poisonTurns > 0) tokens.push(`☠${formatStatusNumber(status.poisonPotency)}`);
  return tokens.join(' ');
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
  readonly energyBarY: number;
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

interface OverlayView {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly position: 'hero' | 'monster';
}

const STATUS_BAR_HEIGHT = 34;
const BAR_INNER_LEFT = 39;
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
    this.healthMonster = this.createBar(options.monsterStatusBounds, options.statusBarY, 0xe75b62, true);
    this.energyPlayer = this.createBar(options.playerStatusBounds, options.energyBarY, 0xf3c64f, false, STATUS_UI_KEYS.energyBars, '#f3c64f');
    this.energyMonster = this.createBar(options.monsterStatusBounds, options.energyBarY, 0xf3c64f, true, STATUS_UI_KEYS.energyBars, '#f3c64f');

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
    const textX = reverse
      ? bounds.right - BAR_INNER_LEFT - innerWidth + 4
      : bounds.left + BAR_INNER_LEFT + 4;
    const fill = this.scene.add.graphics().setDepth(100);
    const frame = this.scene.add
      .image(Math.round((bounds.left + bounds.right) / 2), barY, textureKey, 0)
      .setDisplaySize(bounds.width, STATUS_BAR_HEIGHT)
      .setFlipX(reverse)
      .setDepth(101);
    const text = this.scene.add.text(Math.round(textX), barY, '', { ...STATUS_TEXT_STYLE, color: textColor })
      .setResolution(this.renderQuality)
      .setOrigin(0, 0.5)
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
