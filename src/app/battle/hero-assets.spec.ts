import {
  HERO_ACTION_FRAME_HEIGHT,
  HERO_ACTION_FRAME_WIDTH,
  HERO_ANIMATION_METADATA,
  HERO_ANIMATION_NAMES,
  HERO_ASSETS_AVAILABLE,
  HERO_DISPLAY_HEIGHT,
  HERO_DISPLAY_WIDTH,
  HERO_MALE_ONLY_ANIMATION_NAMES,
  heroDisplaySize,
  HERO_STATUS_ANIMATION_NAMES,
  HERO_SFX_NAMES,
  type HeroStatusAnimationName,
} from './hero-assets';

describe('hero asset metadata', () => {
  it('keeps the removed male pack unavailable without requesting old files', () => {
    const animations = HERO_ANIMATION_METADATA.male;

    expect(HERO_ASSETS_AVAILABLE.male).toBe(false);
    expect(Object.keys(animations)).toEqual([...HERO_ANIMATION_NAMES]);
    for (const animation of HERO_ANIMATION_NAMES) {
      expect(animations[animation].sheet).toBe('');
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
