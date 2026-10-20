import Phaser from 'phaser';
import type { GemType } from '../../game-core';

const GEM_ATLAS_KEY = 'pho-linh-gems';
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
const GEM_COLORS: Record<GemType, number> = {
  attack: 0xe75b62,
  heal: 0x57c982,
  shield: 0x5a9de8,
  energy: 0xf3c64f,
  poison: 0xa778df,
};

export class GemVisualPool {
  private readonly free: Phaser.GameObjects.Container[] = [];
  private readonly all: Phaser.GameObjects.Container[] = [];
  private readonly icons = new Map<Phaser.GameObjects.Container, Phaser.GameObjects.Image>();

  constructor(private readonly scene: Phaser.Scene, private readonly renderQuality: number, size = 42) {
    for (let index = 0; index < size; index += 1) this.free.push(this.createGem());
  }

  acquire(type: GemType, x: number, y: number): Phaser.GameObjects.Container {
    const gem = this.free.pop() ?? this.createGem();
    this.syncType(gem, type);
    this.scene.tweens.killTweensOf(gem);
    gem.setPosition(x, y).setScale(1).setAlpha(1).setVisible(true).setRotation(0);
    gem.setData('gemType', type);
    return gem;
  }

  release(gem: Phaser.GameObjects.Container): void {
    if (!gem.active || this.free.includes(gem)) return;
    this.scene.tweens.killTweensOf(gem);
    gem.setVisible(false).setAlpha(0).setScale(1).setRotation(0).setPosition(-100, -100);
    this.free.push(gem);
  }

  syncType(gem: Phaser.GameObjects.Container, type: GemType): void {
    const icon = this.icons.get(gem);
    if (icon) {
      const frame = GEM_ATLAS_FRAMES[type];
      const texture = frame === undefined ? GEM_TEXTURE_KEYS[type] : GEM_ATLAS_KEY;
      if (texture && this.scene.textures.exists(texture)) icon.setTexture(texture, frame);
      icon.setDisplaySize(40, 40).setVisible(true);
    }
    gem.setData('gemType', type);
  }

  get activeCount(): number { return this.all.length - this.free.length; }
  get capacity(): number { return this.all.length; }
  get freeCount(): number { return this.free.length; }

  destroy(): void {
    for (const gem of this.all) gem.destroy(true);
    this.free.length = 0;
    this.all.length = 0;
    this.icons.clear();
  }

  private createGem(): Phaser.GameObjects.Container {
    // The pool is warmed before the board frame is created. Keep gems above
    // that frame even when the display-list insertion order changes.
    const container = this.scene.add.container(-100, -100).setDepth(2).setVisible(false).setAlpha(0);
    const initialType: GemType = 'attack';
    const frame = GEM_ATLAS_FRAMES[initialType];
    const icon = this.scene.add.image(0, 0, GEM_ATLAS_KEY, frame);
    if (!this.scene.textures.exists(GEM_ATLAS_KEY)) {
      icon.setTexture(GEM_TEXTURE_KEYS[initialType] ?? GEM_ATLAS_KEY);
    }
    icon.setDisplaySize(40, 40);
    container.add(icon);
    this.icons.set(container, icon);
    this.all.push(container);
    // Keep the fallback metadata available for builds where an asset is absent.
    container.setData('fallbackColor', GEM_COLORS[initialType]);
    container.setData('renderQuality', this.renderQuality);
    return container;
  }
}

export type VfxQualityTier = 'full' | 'reduced';

export class BattleVfxPool {
  private readonly flashes: Phaser.GameObjects.Arc[] = [];
  private readonly particles: Phaser.GameObjects.Arc[] = [];
  private readonly sprites = new Map<string, Phaser.GameObjects.Sprite[]>();
  private readonly active = new Set<Phaser.GameObjects.GameObject>();
  private qualityTier: VfxQualityTier = 'full';
  private poolMisses = 0;

  constructor(private readonly scene: Phaser.Scene, options: { readonly flashCount?: number; readonly particleCount?: number } = {}) {
    for (let index = 0; index < (options.flashCount ?? 36); index += 1) {
      this.flashes.push(this.scene.add.circle(-100, -100, 20, 0xffffff, 0).setVisible(false));
    }
    for (let index = 0; index < (options.particleCount ?? 32); index += 1) {
      this.particles.push(this.scene.add.circle(-100, -100, 2, 0xffffff, 0).setVisible(false));
    }
  }

  setQualityTier(tier: VfxQualityTier): void { this.qualityTier = tier; }
  get activeCount(): number { return this.active.size; }
  get missCount(): number { return this.poolMisses; }
  get tier(): VfxQualityTier { return this.qualityTier; }

  acquireFlash(): Phaser.GameObjects.Arc | undefined {
    const flash = this.take(this.flashes);
    if (!flash) return undefined;
    flash.setRadius(20).setAlpha(0.82).setScale(1).setVisible(true).setBlendMode(Phaser.BlendModes.ADD);
    return flash;
  }

  acquireParticle(): Phaser.GameObjects.Arc | undefined {
    if (this.qualityTier === 'reduced') return undefined;
    const particle = this.take(this.particles);
    if (!particle) return undefined;
    particle.setRadius(2).setAlpha(0.95).setScale(1).setVisible(true).setBlendMode(Phaser.BlendModes.ADD);
    return particle;
  }

  acquireSpriteVfx(key: string): Phaser.GameObjects.Sprite | undefined {
    let pool = this.sprites.get(key);
    if (!pool) {
      pool = [];
      for (let index = 0; index < 8; index += 1) {
        if (!this.scene.textures.exists(key)) break;
        pool.push(this.scene.add.sprite(-100, -100, key).setVisible(false));
      }
      this.sprites.set(key, pool);
    }
    const sprite = this.take(pool);
    if (!sprite) return undefined;
    sprite.setAlpha(1).setScale(1).setRotation(0).setVisible(true).setBlendMode(Phaser.BlendModes.ADD);
    return sprite;
  }

  release(effect: Phaser.GameObjects.GameObject): void {
    if (!this.active.delete(effect)) return;
    this.scene.tweens.killTweensOf(effect);
    const display = effect as Phaser.GameObjects.GameObject & { setVisible?: (visible: boolean) => unknown; setAlpha?: (alpha: number) => unknown };
    display.setVisible?.(false);
    display.setAlpha?.(0);
    const sprite = effect as Phaser.GameObjects.Sprite;
    sprite.setPosition(-100, -100).setScale(1).setRotation(0).setBlendMode(Phaser.BlendModes.NORMAL);
    sprite.anims?.stop();
    effect.setActive(false);
  }

  destroy(): void {
    for (const effect of [...this.flashes, ...this.particles, ...[...this.sprites.values()].flat()]) effect.destroy();
    this.flashes.length = 0;
    this.particles.length = 0;
    this.sprites.clear();
    this.active.clear();
  }

  private take<T extends Phaser.GameObjects.GameObject>(pool: T[]): T | undefined {
    const item = pool.find((candidate) => !this.active.has(candidate));
    if (!item) {
      this.poolMisses += 1;
      return undefined;
    }
    item.setActive(true);
    this.active.add(item);
    return item;
  }
}
