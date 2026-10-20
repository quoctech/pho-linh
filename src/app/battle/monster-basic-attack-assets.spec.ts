import {
  MONSTER_BASIC_ATTACKS,
  ensureMonsterBasicAttackAnimation,
  preloadMonsterBasicAttack,
} from './monster-basic-attack-assets';

describe('monster basic attack assets', () => {
  it('registers six frame images for every test monster', () => {
    const monsters = ['mist_blob', 'lantern_cat', 'cloud_fox_boss', 'bamboo_mantis'] as const;
    expect(Object.keys(MONSTER_BASIC_ATTACKS)).toEqual(monsters);
    for (const monsterId of monsters) {
      const effect = MONSTER_BASIC_ATTACKS[monsterId];
      expect(effect.textureKeys).toHaveLength(6);
      expect(effect.frameRate).toBe(12);
      expect(effect.displayWidth).toBe(118);
    }
  });

  it('preloads and creates only the selected monster attack animation', () => {
    const loaded: string[] = [];
    const loadedKeys = new Set<string>();
    const animations: unknown[] = [];
    const scene = {
      textures: { exists: (key: string) => loadedKeys.has(key) },
      load: { image: (key: string, path: string) => { loadedKeys.add(key); loaded.push(path); } },
      anims: { exists: () => false, create: (config: unknown) => animations.push(config) },
    } as never;

    preloadMonsterBasicAttack(scene, 'bamboo_mantis');
    ensureMonsterBasicAttackAnimation(scene, 'bamboo_mantis');

    expect(loaded).toHaveLength(6);
    expect(loaded.every((path) => path.includes('/monster-basic-attacks-v1/bo_la_tre/'))).toBe(true);
    expect(loaded.every((path) => path.endsWith('.webp'))).toBe(true);
    expect(animations).toHaveLength(1);
    expect((animations[0] as { repeat: number; frameRate: number }).repeat).toBe(0);
    expect((animations[0] as { repeat: number; frameRate: number }).frameRate).toBe(12);
  });
});
