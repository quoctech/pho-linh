import {
  BASIC_ATTACK_EFFECTS,
  basicAttackEffectForElement,
  ensureBasicAttackEffectAnimations,
  fitBasicAttackEffectDisplaySize,
  preloadBasicAttackEffects,
} from './basic-attack-effect-assets';

describe('basic attack effect assets', () => {
  it('registers six transparent WebP frames for every element', () => {
    const elements = ['metal', 'wood', 'water', 'fire', 'earth'] as const;
    expect(Object.keys(BASIC_ATTACK_EFFECTS)).toEqual(elements);
    expect(Object.values(BASIC_ATTACK_EFFECTS).map(({ frameWidth, frameHeight }) => [frameWidth, frameHeight])).toEqual([
      [395, 483], [387, 534], [368, 524], [515, 389], [387, 441],
    ]);
    for (const element of elements) {
      const effect = basicAttackEffectForElement(element);
      expect(effect.textureKeys).toHaveLength(6);
      expect(effect.frameRate).toBe(12);
      expect(effect.textureKeys.every((key) => key.startsWith(`hero-basic-attack-effect-${element}`))).toBe(true);
    }
    expect(BASIC_ATTACK_EFFECTS.water.rotationDegrees).toBe(-40);
  });

  it('preloads and creates one-shot animation only for the selected element', () => {
    const loaded: string[] = [];
    const loadedKeys = new Set<string>();
    const animations: unknown[] = [];
    const scene = {
      textures: { exists: (key: string) => loadedKeys.has(key) },
      load: { image: (key: string, path: string) => { loadedKeys.add(key); loaded.push(path); } },
      anims: { exists: () => false, create: (config: unknown) => animations.push(config) },
    } as never;
    preloadBasicAttackEffects(scene, 'fire');
    ensureBasicAttackEffectAnimations(scene, 'fire');
    expect(loaded).toHaveLength(6);
    expect(loaded.every((path) => path.includes('/basic_attack_hoa_cung_v2/frames_webp/') && path.endsWith('.webp'))).toBe(true);
    expect(animations).toHaveLength(1);
    expect((animations[0] as { repeat: number; frameRate: number }).repeat).toBe(0);
    expect((animations[0] as { repeat: number; frameRate: number }).frameRate).toBe(12);
  });

  it('preserves each frame aspect ratio', () => {
    expect(fitBasicAttackEffectDisplaySize(BASIC_ATTACK_EFFECTS.metal)).toEqual({ width: 132, height: 161 });
    expect(fitBasicAttackEffectDisplaySize(BASIC_ATTACK_EFFECTS.fire)).toEqual({ width: 132, height: 100 });
  });
});
