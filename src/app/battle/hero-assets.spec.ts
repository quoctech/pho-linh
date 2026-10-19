import {
  HERO_ACTION_FRAME_HEIGHT,
  HERO_ACTION_FRAME_WIDTH,
  HERO_ANIMATION_METADATA,
  HERO_ANIMATION_NAMES,
  HERO_ELEMENT_ANIMATION_METADATA,
  HERO_ELEMENT_ASSET_ROOTS,
  HERO_ELEMENT_RUNTIME_MAPPING,
  HERO_ASSETS_AVAILABLE,
  HERO_DISPLAY_HEIGHT,
  HERO_DISPLAY_WIDTH,
  HERO_MALE_ONLY_ANIMATION_NAMES,
  HERO_METAL_ANIMATION_NAMES,
  HERO_METAL_FRAME_COUNT,
  HERO_METAL_FRAME_HEIGHT,
  HERO_METAL_FRAME_RATE,
  HERO_METAL_FRAME_WIDTH,
  HERO_METAL_RUNTIME_MAPPING,
  heroDisplaySize,
  HERO_STATUS_ANIMATION_NAMES,
  HERO_SFX_NAMES,
  type HeroStatusAnimationName,
} from './hero-assets';

describe('hero asset metadata', () => {
  it('declares the complete Male Metal pack as individual 1080x1920 frames', () => {
    const animations = HERO_ANIMATION_METADATA.male;

    expect(HERO_ASSETS_AVAILABLE.male).toBe(true);
    expect(Object.keys(animations)).toEqual([...HERO_ANIMATION_NAMES]);
    expect(HERO_METAL_ANIMATION_NAMES).toHaveLength(24);
    for (const animation of HERO_METAL_ANIMATION_NAMES) {
      const metadata = animations[animation];
      expect(metadata.framePaths).toHaveLength(HERO_METAL_FRAME_COUNT);
      expect(metadata.frameWidth).toBe(HERO_METAL_FRAME_WIDTH);
      expect(metadata.frameHeight).toBe(HERO_METAL_FRAME_HEIGHT);
      expect(metadata.frameRate).toBe(HERO_METAL_FRAME_RATE);
      expect(HERO_METAL_RUNTIME_MAPPING[animation]).toBeTruthy();
    }
  });

  it('declares all five male element packs with the same 24-state runtime contract', () => {
    for (const element of ['metal', 'wood', 'water', 'fire', 'earth'] as const) {
      const animations = HERO_ELEMENT_ANIMATION_METADATA[element];
      const expectedRoot = element === 'metal' ? 'assets/hero-metal' : `assets/hero-${element}`;
      expect(HERO_ELEMENT_ASSET_ROOTS[element]).toBe(expectedRoot);
      expect(Object.keys(animations)).toEqual([...HERO_ANIMATION_NAMES]);
      for (const animation of HERO_METAL_ANIMATION_NAMES) {
        const metadata = animations[animation];
        expect(metadata.framePaths).toHaveLength(HERO_METAL_FRAME_COUNT);
        expect(metadata.frameWidth).toBe(HERO_METAL_FRAME_WIDTH);
        expect(metadata.frameHeight).toBe(HERO_METAL_FRAME_HEIGHT);
        expect(metadata.frameRate).toBe(HERO_METAL_FRAME_RATE);
        expect(HERO_ELEMENT_RUNTIME_MAPPING[animation]).toBeTruthy();
      }
    }
  });

  it('keeps female legacy action sheets and only preloads playable female names', () => {
    const animations = HERO_ANIMATION_METADATA.female;
    for (const animation of HERO_ANIMATION_NAMES) {
      if (HERO_MALE_ONLY_ANIMATION_NAMES.includes(animation)) continue;
      if (HERO_STATUS_ANIMATION_NAMES.includes(animation as HeroStatusAnimationName)) continue;
      expect(animations[animation].frameWidth).toBe(HERO_ACTION_FRAME_WIDTH);
      expect(animations[animation].frameHeight).toBe(HERO_ACTION_FRAME_HEIGHT);
      expect(animations[animation].frameCount).toBeGreaterThan(0);
    }
  });

  it('declares all 19 MP3/OGG SFX events shared by the two genders', () => {
    expect(HERO_SFX_NAMES).toHaveLength(19);
    expect(new Set(HERO_SFX_NAMES).size).toBe(19);
  });

  it('locks every hero animation to exactly one display box', () => {
    for (const animation of HERO_ANIMATION_NAMES) {
      expect(heroDisplaySize('male', animation)).toEqual({
        width: HERO_DISPLAY_WIDTH,
        height: HERO_DISPLAY_HEIGHT,
      });
    }
    for (const animation of HERO_ANIMATION_NAMES) {
      expect(heroDisplaySize('female', animation)).toEqual({
        width: HERO_DISPLAY_WIDTH,
        height: HERO_DISPLAY_HEIGHT,
      });
    }
  });
});
