import Phaser from 'phaser';
import { LANTERN_SFX_KEYS, LANTERN_SKILL_VFX_KEYS } from './lantern-cat-assets';

type CombatTarget = 'player' | 'monster';

interface Point {
  readonly x: number;
  readonly y: number;
}

export interface LanternCatVfxHost {
  readonly scene: Phaser.Scene;
  readonly reducedMotion: boolean;
  readonly transientEffects: Set<Phaser.GameObjects.GameObject>;
  readonly playSfx: (key: string, volume: number) => void;
  readonly combatPoint: (target: CombatTarget) => Point;
  readonly getHeroPosition: () => Point;
  readonly getPlayerStunIcon: () => Phaser.GameObjects.Image | undefined;
  readonly spawnVfxSized: (
    key: string,
    x: number,
    y: number,
    displayWidth: number,
    displayHeight: number,
    depth?: number,
  ) => void;
  readonly spawnCombatImpact: (x: number, y: number, color: number, size: number) => void;
  readonly flashHero: (color: number) => void;
  readonly playHeroAnimation: (key: 'hit') => void;
  readonly shakeHero: () => void;
  readonly shakePlayerBar: () => void;
}

/** Presentation-only effects for Miêu Đèn. Core damage remains in game-core. */
export class LanternCatVfx {
  private readonly timers = new Set<Phaser.Time.TimerEvent>();

  constructor(private readonly host: LanternCatVfxHost) {}

  playLongMieuLienKich(): void {
    const start = this.host.combatPoint('monster');
    const target = this.host.combatPoint('player');
    const angle = Phaser.Math.Angle.Between(start.x, start.y, target.x, target.y);

    if (this.host.scene.textures.exists(LANTERN_SKILL_VFX_KEYS.icon)) {
      const skillIcon = this.host.scene.add
        .image(start.x, start.y - 66, LANTERN_SKILL_VFX_KEYS.icon)
        .setDisplaySize(32, 32)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(17);
      this.host.transientEffects.add(skillIcon);
      this.host.scene.tweens.add({
        targets: skillIcon,
        y: start.y - 84,
        alpha: 0,
        scale: 1.25,
        duration: this.host.reducedMotion ? 280 : 520,
        ease: 'Cubic.Out',
        onComplete: () => this.destroyTransientEffect(skillIcon),
      });
    }

    this.host.spawnVfxSized(
      LANTERN_SKILL_VFX_KEYS.castCircle,
      start.x,
      start.y,
      92,
      138,
      12,
    );

    this.schedule(this.host.reducedMotion ? 90 : 180, () => {
      if (!this.host.scene.textures.exists(LANTERN_SKILL_VFX_KEYS.multiStrike)
        || !this.host.scene.anims.exists(LANTERN_SKILL_VFX_KEYS.multiStrike)) {
        this.spawnLongMieuImpact(target.x, target.y);
        return;
      }

      const strike = this.host.scene.add
        .sprite(start.x, start.y, LANTERN_SKILL_VFX_KEYS.multiStrike, 0)
        .setOrigin(0.5)
        .setDisplaySize(78, 117)
        .setRotation(angle)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(14)
        .play(LANTERN_SKILL_VFX_KEYS.multiStrike);
      this.host.transientEffects.add(strike);
      this.host.playSfx(LANTERN_SFX_KEYS.lanternLongDash, 0.56);
      this.host.scene.tweens.add({
        targets: strike,
        x: target.x,
        y: target.y,
        scale: 1.15,
        duration: this.host.reducedMotion ? 300 : 420,
        ease: 'Cubic.In',
        onComplete: () => {
          this.destroyTransientEffect(strike);
          if (this.host.reducedMotion) {
            this.spawnLongMieuImpact(target.x, target.y);
          } else {
            this.playLongMieuStrikes(target.x, target.y, angle);
          }
        },
      });
    });
  }

  cleanup(): void {
    for (const timer of this.timers) timer.remove(false);
    this.timers.clear();
  }

  private playLongMieuStrikes(x: number, y: number, angle: number): void {
    const offsets = [
      { x: -8, y: -8 },
      { x: 8, y: 0 },
      { x: 0, y: 8 },
    ];
    offsets.forEach((offset, index) => {
      this.schedule(index * 150, () => {
        this.spawnLongMieuStrike(x + offset.x, y + offset.y, angle);
        this.host.spawnCombatImpact(x + offset.x, y + offset.y, 0xd5aaff, 38);
      });
    });
    this.schedule(480, () => this.spawnLongMieuImpact(x, y));
  }

  private spawnLongMieuStrike(x: number, y: number, angle: number): void {
    if (!this.host.scene.textures.exists(LANTERN_SKILL_VFX_KEYS.multiStrike)
      || !this.host.scene.anims.exists(LANTERN_SKILL_VFX_KEYS.multiStrike)) return;
    const strike = this.host.scene.add
      .sprite(x, y, LANTERN_SKILL_VFX_KEYS.multiStrike, 0)
      .setOrigin(0.5)
      .setDisplaySize(58, 87)
      .setRotation(angle)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(16)
      .setScale(0.8)
      .play(LANTERN_SKILL_VFX_KEYS.multiStrike);
    this.host.transientEffects.add(strike);
    this.host.scene.tweens.add({
      targets: strike,
      scale: 1.08,
      alpha: 0.2,
      duration: 135,
      ease: 'Cubic.Out',
    });
    this.schedule(150, () => this.destroyTransientEffect(strike));
  }

  private spawnLongMieuImpact(x: number, y: number): void {
    this.host.playSfx(LANTERN_SFX_KEYS.lanternLongImpact, 0.62);
    this.host.playSfx(LANTERN_SFX_KEYS.lanternLongStun, 0.58);
    this.host.spawnVfxSized(LANTERN_SKILL_VFX_KEYS.impactStun, x, y, 94, 141, 16);
    this.host.spawnCombatImpact(x, y, 0xd5aaff, 70);
    this.host.flashHero(0xd5aaff);
    this.host.playHeroAnimation('hit');
    const hero = this.host.getHeroPosition();
    this.host.getPlayerStunIcon()
      ?.setPosition(hero.x, hero.y - 92)
      .setAlpha(0.95)
      .setVisible(true);
    if (!this.host.reducedMotion) {
      this.host.shakeHero();
      this.host.shakePlayerBar();
    }
  }

  private schedule(delay: number, callback: () => void): void {
    let timer: Phaser.Time.TimerEvent;
    timer = this.host.scene.time.delayedCall(delay, () => {
      this.timers.delete(timer);
      callback();
    });
    this.timers.add(timer);
  }

  private destroyTransientEffect(effect: Phaser.GameObjects.GameObject): void {
    this.host.transientEffects.delete(effect);
    effect.destroy();
  }
}
