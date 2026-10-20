import Phaser from 'phaser';
import { MONSTER_DATA, type ElementId } from '../../game-core';
import { actorAnimationKey, normalizeActorSprite, type ActorFrameId } from '../battle/actor-frame-assets';
import { BattleVfxPool } from '../battle/battle-visual-pools';
import { basicAttackEffectForElement, ensureBasicAttackEffectAnimations, preloadBasicAttackEffects } from '../battle/basic-attack-effect-assets';
import { ensureHeroAnimations, heroAnimationTextureKey, heroSkillAnimationKey, preloadHeroAssets, HERO_ELEMENT_ANIMATION_METADATA, HERO_FEMALE_ELEMENT_ANIMATION_METADATA, type HeroGender, type HeroElement } from '../battle/hero-assets';
import { ensureHeroSkillEffectAnimations, heroSkillEffectForSkill, preloadHeroSkillEffects } from '../battle/hero-skill-effect-assets';
import { ensureMistDustAnimations, MIST_DUST_SPRITE_KEYS, preloadMistDustSprites } from '../battle/monsters/mist-dust/mist-dust-assets';
import { ensureLanternCatAnimations, LANTERN_CAT_SPRITE_KEYS, preloadLanternCatSprites } from '../battle/monsters/lantern-cat/lantern-cat-assets';
import { ensureCloudFoxAnimations, CLOUD_FOX_SPRITE_KEYS, preloadCloudFoxSprites } from '../battle/monsters/cloud-fox/cloud-fox-assets';
import { ensureBambooMantisAnimations, BAMBOO_MANTIS_SPRITE_KEYS, preloadBambooMantisSprites } from '../battle/monsters/bamboo-mantis/bamboo-mantis-assets';
import { ensureMonsterSkillEffectAnimations, monsterSkillEffectsForMonster, preloadMonsterSkillEffects } from '../battle/monster-skill-effect-assets';
import { ensureMonsterBasicAttackAnimation, monsterBasicAttackForMonster, preloadMonsterBasicAttack, type TestMonsterId } from '../battle/monster-basic-attack-assets';
import { ELEMENT_SKILL_CONFIG } from '../battle/element-skill-assets';

export type SkillTestAction = 'basicAttack' | 'primarySkill' | 'secondarySkill' | 'monsterBasicAttack' | 'monsterSkill';
export interface SkillTestConfig { readonly gender: HeroGender; readonly element: ElementId; readonly monsterId: TestMonsterId; }

const DEFAULT_CONFIG: SkillTestConfig = { gender: 'male', element: 'metal', monsterId: 'mist_blob' };
const HERO_X = 82;
const HERO_Y = 528;
const MONSTER_X = 274;
const MONSTER_Y = 208;
const BG_KEYS = { full: 'skill-test-bg', sky: 'skill-test-sky', mid: 'skill-test-mid', fx: 'skill-test-fx', ground: 'skill-test-ground' } as const;

export class SkillTestScene extends Phaser.Scene {
  private config: SkillTestConfig = DEFAULT_CONFIG;
  private monsterId: TestMonsterId = DEFAULT_CONFIG.monsterId;
  private hero?: Phaser.GameObjects.Sprite;
  private monster?: Phaser.GameObjects.Sprite;
  private vfxPool?: BattleVfxPool;
  private activeVfx = new Set<Phaser.GameObjects.Sprite>();
  private status?: Phaser.GameObjects.Text;
  private actionListener?: (action: SkillTestAction) => void;

  constructor() { super({ key: 'SkillTestScene' }); }

  preload(): void {
    this.config = { ...DEFAULT_CONFIG, ...(this.registry.get('skillTestConfig') as Partial<SkillTestConfig> | undefined) };
    this.monsterId = this.config.monsterId;
    this.load.image(BG_KEYS.full, 'assets/pk-background-parallax/full-background.webp');
    this.load.image(BG_KEYS.sky, 'assets/pk-background-parallax/layer-sky-moon.webp');
    this.load.image(BG_KEYS.mid, 'assets/pk-background-parallax/layer-mid-city.webp');
    this.load.image(BG_KEYS.fx, 'assets/pk-background-parallax/layer-fx-mist-petals.webp');
    this.load.image(BG_KEYS.ground, 'assets/pk-background-parallax/layer-ground-path.webp');
    // The actor registry resolves every animation to individual frame images;
    // do not replace this with a spritesheet/atlas load. Clear animation
    // definitions left by the previous gender before rebuilding them.
    this.clearHeroAnimations();
    preloadHeroAssets(this, this.config.gender, this.config.element as HeroElement);
    preloadBasicAttackEffects(this, this.config.element);
    preloadHeroSkillEffects(this, this.config.element);
    this.preloadMonsterActor();
    preloadMonsterBasicAttack(this, this.monsterId);
    preloadMonsterSkillEffects(this, this.monsterId);
  }

  create(): void {
    this.cameras.main.setOrigin(0, 0);
    this.createBackground();
    ensureHeroAnimations(this, this.config.gender, this.config.element as HeroElement);
    ensureBasicAttackEffectAnimations(this, this.config.element);
    ensureHeroSkillEffectAnimations(this, this.config.element);
    this.ensureMonsterActor();
    ensureMonsterBasicAttackAnimation(this, this.monsterId);
    ensureMonsterSkillEffectAnimations(this, this.monsterId);
    const heroIdleTexture = heroAnimationTextureKey(this.config.gender, 'idle', 0, this.config.element as HeroElement);
    this.hero = this.add.sprite(HERO_X, HERO_Y, heroIdleTexture);
    this.monster = this.add.sprite(MONSTER_X, MONSTER_Y, actorAnimationKey(this.monsterId, 'idle'));
    this.monster.play(this.monsterIdleKey());
    this.monster.setFlipX(this.monsterId === 'mist_blob' || this.monsterId === 'bamboo_mantis');
    this.monster.on(Phaser.Animations.Events.ANIMATION_UPDATE, () => this.normalizeMonsterSprite());
    this.normalizeMonsterSprite();
    this.hero.play(this.heroAnimationKey('idle'), true);
    this.hero.setOrigin(0.5, 1).setDisplaySize(92, 160).setDepth(5);
    this.vfxPool = new BattleVfxPool(this, { flashCount: 12, particleCount: 0 });
    this.createHud();
    this.actionListener = (action) => this.playAction(action);
    this.events.on('skill-test-action', this.actionListener);
    this.events.emit('skill-test-ready');
  }

  shutdown(): void {
    this.resetVisuals();
    this.vfxPool?.destroy();
    this.vfxPool = undefined;
    if (this.actionListener) this.events.off('skill-test-action', this.actionListener);
  }

  private createBackground(): void {
    this.add.image(180, 320, BG_KEYS.full).setDisplaySize(360, 640).setDepth(-10);
    this.add.image(180, 300, BG_KEYS.sky).setDisplaySize(360, 640).setAlpha(.7).setDepth(-9);
    this.add.image(180, 330, BG_KEYS.mid).setDisplaySize(360, 640).setAlpha(.8).setDepth(-8);
    this.add.image(180, 300, BG_KEYS.fx).setDisplaySize(360, 640).setAlpha(.42).setDepth(-7);
    this.add.image(180, 520, BG_KEYS.ground).setDisplaySize(360, 250).setDepth(-6);
    this.add.rectangle(180, 320, 360, 640, 0x120f24, .18).setDepth(-5);
  }

  private preloadMonsterActor(): void {
    switch (this.monsterId) {
      case 'mist_blob': preloadMistDustSprites(this); break;
      case 'lantern_cat': preloadLanternCatSprites(this); break;
      case 'cloud_fox_boss': preloadCloudFoxSprites(this); break;
      case 'bamboo_mantis': preloadBambooMantisSprites(this); break;
    }
  }

  private ensureMonsterActor(): void {
    switch (this.monsterId) {
      case 'mist_blob': ensureMistDustAnimations(this); break;
      case 'lantern_cat': ensureLanternCatAnimations(this); break;
      case 'cloud_fox_boss': ensureCloudFoxAnimations(this); break;
      case 'bamboo_mantis': ensureBambooMantisAnimations(this); break;
    }
  }

  private monsterIdleKey(): string { return actorAnimationKey(this.monsterId, 'idle'); }
  private monsterAttackKey(): string {
    if (this.monsterId === 'lantern_cat') return LANTERN_CAT_SPRITE_KEYS.attack;
    if (this.monsterId === 'cloud_fox_boss') return CLOUD_FOX_SPRITE_KEYS.attack;
    if (this.monsterId === 'bamboo_mantis') return BAMBOO_MANTIS_SPRITE_KEYS.attack;
    return MIST_DUST_SPRITE_KEYS.attack;
  }
  private monsterSkillKey(): string {
    if (this.monsterId === 'lantern_cat') return LANTERN_CAT_SPRITE_KEYS.specialAttack;
    if (this.monsterId === 'cloud_fox_boss') return CLOUD_FOX_SPRITE_KEYS.specialAttack;
    if (this.monsterId === 'bamboo_mantis') return BAMBOO_MANTIS_SPRITE_KEYS.attack;
    return MIST_DUST_SPRITE_KEYS.poisonCast;
  }
  private normalizeMonsterSprite(): void {
    if (!this.monster) return;
    normalizeActorSprite(this.monster, this.monsterId, this.monsterDisplayWidth());
  }
  private monsterDisplayWidth(): number {
    if (this.monsterId === 'mist_blob') return MIST_DUST_SPRITE_KEYS.displayWidth;
    if (this.monsterId === 'lantern_cat') return LANTERN_CAT_SPRITE_KEYS.displayWidth;
    if (this.monsterId === 'cloud_fox_boss') return CLOUD_FOX_SPRITE_KEYS.displayWidth;
    return BAMBOO_MANTIS_SPRITE_KEYS.displayWidth;
  }

  private heroAnimationKey(name: 'idle' | 'basicAttack'): string {
    if (name === 'basicAttack') return heroSkillAnimationKey(this.config.element, 'basicAttack');
    const metadata = this.config.gender === 'male'
      ? HERO_ELEMENT_ANIMATION_METADATA[this.config.element]
      : HERO_FEMALE_ELEMENT_ANIMATION_METADATA[this.config.element];
    return metadata.idle.key;
  }

  private clearHeroAnimations(): void {
    const metadata = this.config.gender === 'male'
      ? HERO_ELEMENT_ANIMATION_METADATA[this.config.element]
      : HERO_FEMALE_ELEMENT_ANIMATION_METADATA[this.config.element];
    for (const animation of Object.values(metadata)) {
      if (this.anims.exists(animation.key)) this.anims.remove(animation.key);
    }
    for (const slot of ['basicAttack', 'primarySkill', 'secondarySkill'] as const) {
      const key = heroSkillAnimationKey(this.config.element, slot);
      if (this.anims.exists(key)) this.anims.remove(key);
    }
  }

  private createHud(): void {
    this.add.rectangle(180, 42, 344, 62, 0x171426, .82).setStrokeStyle(1, 0xe9d6a8, .35).setDepth(20);
    this.add.text(14, 18, `${this.monsterLabel()}  ·  BẤT TỬ`, { fontFamily: 'sans-serif', fontSize: '14px', color: '#fff8e8', fontStyle: 'bold' }).setDepth(21);
    this.add.rectangle(14, 42, 332, 10, 0x281f38).setOrigin(0).setDepth(21);
    this.add.rectangle(14, 42, 332, 10, 0x51d18c).setOrigin(0).setDepth(22);
    this.status = this.add.text(180, 592, 'Sẵn sàng trình diễn · không gây damage', { fontFamily: 'sans-serif', fontSize: '12px', color: '#f3c64f', align: 'center' }).setOrigin(.5).setDepth(30);
  }

  private monsterLabel(): string {
    if (this.monsterId === 'lantern_cat') return 'MIÊU ĐÈN';
    if (this.monsterId === 'cloud_fox_boss') return 'CÁO MÂY';
    if (this.monsterId === 'bamboo_mantis') return 'BỌ LÁ TRE';
    return 'SƯƠNG HỒN';
  }

  private playAction(action: SkillTestAction): void {
    if (!this.hero || !this.monster || !this.vfxPool) return;
    this.resetVisuals();
    if (action === 'monsterBasicAttack' || action === 'monsterSkill') {
      this.playMonsterAction(action);
      return;
    }
    const slot = action === 'basicAttack' ? 'basicAttack' : action;
    const animationKey = heroSkillAnimationKey(this.config.element, slot);
    this.hero.play(animationKey, true);
    this.hero.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.hero?.play(this.heroAnimationKey('idle'), true));
    if (action === 'basicAttack') {
      const effect = basicAttackEffectForElement(this.config.element);
      const sprite = this.vfxPool.acquireSpriteVfx(effect.textureKeys[0]);
      if (!sprite) return;
      const size = { width: effect.displayWidth, height: Math.round(effect.displayWidth * effect.frameHeight / effect.frameWidth) };
      sprite.setPosition(HERO_X, HERO_Y - 82).setDisplaySize(size.width, size.height).setDepth(12).play(effect.animationKey);
      this.activeVfx.add(sprite);
      this.status?.setText('Đánh thường · VFX bay tới mục tiêu');
      this.tweens.add({ targets: sprite, x: MONSTER_X, y: MONSTER_Y, duration: 650, ease: 'Sine.easeInOut', onComplete: () => this.release(sprite) });
      return;
    }
    const skillId = action === 'primarySkill' ? ELEMENT_SKILL_CONFIG[this.config.element].primarySkillId : ELEMENT_SKILL_CONFIG[this.config.element].secondarySkillId;
    const effect = heroSkillEffectForSkill(skillId);
    if (!effect) return;
    const sprite = this.vfxPool.acquireSpriteVfx(effect.textureKeys[0]);
    if (!sprite) return;
    const height = Math.round(effect.displayWidth * effect.frameHeight / effect.frameWidth);
    sprite.setPosition(MONSTER_X, MONSTER_Y - 2).setDisplaySize(effect.displayWidth, height).setDepth(11).play(effect.animationKey);
    this.activeVfx.add(sprite);
    this.status?.setText(`${effect.label} · trình diễn presentation-only`);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.release(sprite));
  }

  private playMonsterAction(action: 'monsterBasicAttack' | 'monsterSkill'): void {
    if (!this.monster || !this.vfxPool) return;
    const isBasicAttack = action === 'monsterBasicAttack';
    this.monster.play(isBasicAttack ? this.monsterAttackKey() : this.monsterSkillKey(), true);
    this.monster.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.monster?.play(this.monsterIdleKey(), true));
    if (isBasicAttack) {
      const effect = monsterBasicAttackForMonster(this.monsterId);
      const sprite = this.vfxPool.acquireSpriteVfx(effect.textureKeys[0]);
      if (!sprite) return;
      sprite.setPosition(MONSTER_X, MONSTER_Y - 24)
        .setDisplaySize(effect.displayWidth, Math.round(effect.displayWidth * effect.frameHeight / effect.frameWidth))
        .setDepth(12)
        .play(effect.animationKey);
      this.activeVfx.add(sprite);
      this.status?.setText('Sương Hồn · đòn đánh thường');
      this.tweens.add({ targets: sprite, x: HERO_X, y: HERO_Y - 80, duration: 700, ease: 'Sine.easeInOut', onComplete: () => this.release(sprite) });
      return;
    }
    const effect = monsterSkillEffectsForMonster(this.monsterId)[0];
    if (!effect) return;
    const sprite = this.vfxPool.acquireSpriteVfx(effect.textureKeys[0]);
    if (!sprite) return;
    sprite.setPosition(HERO_X, HERO_Y - 82)
      .setDisplaySize(effect.displayWidth, Math.round(effect.displayWidth * effect.frameHeight / effect.frameWidth))
      .setDepth(11)
      .play(effect.animationKey);
    this.activeVfx.add(sprite);
    this.status?.setText(`${MONSTER_DATA.definitions[this.monsterId]?.skills?.[0]?.name ?? 'Skill'} · skill quái`);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.release(sprite));
  }

  private release(sprite: Phaser.GameObjects.Sprite): void { this.activeVfx.delete(sprite); this.vfxPool?.release(sprite); }
  private resetVisuals(): void { for (const sprite of [...this.activeVfx]) this.release(sprite); this.tweens.killAll(); }
}
