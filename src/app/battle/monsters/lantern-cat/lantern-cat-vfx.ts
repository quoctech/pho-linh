import Phaser from 'phaser';

type CombatTarget = 'player' | 'monster';

interface Point {
  readonly x: number;
  readonly y: number;
}

export interface LanternCatVfxHost {
  readonly scene: Phaser.Scene;
  readonly reducedMotion: boolean;
  readonly combatPoint: (target: CombatTarget) => Point;
  readonly spawnCombatImpact: (x: number, y: number, color: number, size: number) => void;
  readonly flashHero: (color: number) => void;
  readonly playHeroAnimation: (key: 'hit') => void;
  readonly shakeHero: () => void;
  readonly shakePlayerBar: () => void;
}

/** Presentation-only timing for Miêu Đèn's V2 actor skill animation. */
export class LanternCatVfx {
  private readonly timers = new Set<Phaser.Time.TimerEvent>();

  constructor(private readonly host: LanternCatVfxHost) {}

  playLongMieuLienKich(): void {
    const target = this.host.combatPoint('player');
    const offsets = [
      { x: -8, y: -8 },
      { x: 8, y: 0 },
      { x: 0, y: 8 },
    ];
    offsets.forEach((offset, index) => {
      this.schedule(index * 150, () => {
        this.host.spawnCombatImpact(target.x + offset.x, target.y + offset.y, 0xd5aaff, 38);
      });
    });
    this.schedule(this.host.reducedMotion ? 120 : 480, () => {
      this.host.spawnCombatImpact(target.x, target.y, 0xd5aaff, 70);
      this.host.flashHero(0xd5aaff);
      this.host.playHeroAnimation('hit');
      if (!this.host.reducedMotion) {
        this.host.shakeHero();
        this.host.shakePlayerBar();
      }
    });
  }

  cleanup(): void {
    for (const timer of this.timers) timer.remove(false);
    this.timers.clear();
  }

  private schedule(delay: number, callback: () => void): void {
    let timer: Phaser.Time.TimerEvent;
    timer = this.host.scene.time.delayedCall(delay, () => {
      this.timers.delete(timer);
      callback();
    });
    this.timers.add(timer);
  }
}
