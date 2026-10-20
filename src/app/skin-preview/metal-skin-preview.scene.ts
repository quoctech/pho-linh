import Phaser from 'phaser';
import { ACTOR_FRAME_RATE, actorAnimationKey, actorFrameKey, actorRows, normalizeActorSprite, preloadActorFrames, ensureActorAnimation, type ActorFrameId } from '../battle/actor-frame-assets';
import {
  HERO_METAL_DISPLAY_WIDTH,
} from '../battle/hero-assets';

export class MetalSkinPreviewScene extends Phaser.Scene {
  private hero?: Phaser.GameObjects.Sprite;
  private actor: ActorFrameId = 'metal';

  constructor() { super({ key: 'MetalSkinPreviewScene' }); }

  init(data?: { actor?: ActorFrameId }): void { this.actor = data?.actor ?? 'metal'; }

  preload(): void { preloadActorFrames(this, this.actor); }

  create(): void {
    // The preview canvas is rendered at 2x; keep scene coordinates in the
    // original 360x340 logical space so the actor gets the same crispness as
    // the battle renderer.
    this.cameras.main
      .setOrigin(0, 0)
      .setScroll(0, 0)
      .setZoom(2)
      .setRoundPixels(true);
    const actorName: Record<ActorFrameId, string> = {
      metal: 'Nam hệ Kim', wood: 'Nam hệ Mộc', water: 'Nam hệ Thủy',
      fire: 'Nam hệ Hỏa', earth: 'Nam hệ Thổ', mist_blob: 'Bụi Sương', lantern_cat: 'Miêu Đèn',
      female_metal: 'Nữ hệ Kim', female_wood: 'Nữ hệ Mộc', female_water: 'Nữ hệ Thủy',
      female_fire: 'Nữ hệ Hỏa', female_earth: 'Nữ hệ Thổ',
    };
    this.add.rectangle(180, 170, 360, 340, 0x171426, 1);
    this.add.circle(180, 162, 110, 0x4a3c71, 0.28);
    this.add.text(180, 24, `Preview · ${actorName[this.actor]}`, {
      color: '#fff8e8', fontFamily: 'sans-serif', fontSize: '16px', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(180, 47, `24 hiệu ứng · 6 frame · ${ACTOR_FRAME_RATE} FPS`, {
      color: '#c7bedc', fontFamily: 'sans-serif', fontSize: '12px',
    }).setOrigin(0.5);

    for (const row of actorRows(this.actor)) ensureActorAnimation(this, this.actor, row.id, undefined, -1);
    this.hero = this.add.sprite(180, 300, actorFrameKey(this.actor, 'idle', 0))
      .setOrigin(0.5, 1)
      .setDepth(2);
    this.hero.on('animationupdate', () => this.normalizeHero());
    this.playAction('idle');
    this.game.events.on('skin-preview:play', this.playAction, this);
    this.events.once('shutdown', () => this.game.events.off('skin-preview:play', this.playAction, this));
  }

  playAction(id: string): void {
    if (!this.hero || !actorRows(this.actor).some((action) => action.id === id)) return;
    this.hero.stop().play({ key: actorAnimationKey(this.actor, id), repeat: -1 });
    this.normalizeHero();
  }

  private normalizeHero(): void {
    if (this.hero) normalizeActorSprite(this.hero, this.actor, HERO_METAL_DISPLAY_WIDTH * 1.32);
  }
}
