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
  HERO_METAL_DISPLAY_WIDTH,
  HERO_MALE_ONLY_ANIMATION_NAMES,
  HERO_METAL_ANIMATION_NAMES,
  HERO_METAL_FRAME_COUNT,
  HERO_METAL_FRAME_RATE,
  HERO_METAL_FRAME_WIDTH,
  HERO_METAL_RUNTIME_MAPPING,
  METAL_PREVIEW_ACTIONS,
  heroDisplaySize,
  HERO_STATUS_ANIMATION_NAMES,
  HERO_SFX_NAMES,
  type HeroStatusAnimationName,
} from './hero-assets';
import { ACTOR_FRAME_RATE, actorDisplaySize, actorRow, actorRows, type ActorFrameId } from './actor-frame-assets';

describe('hero asset metadata', () => {
  it('declares the complete Male Metal pack as 24 sets of six separated WebP frames', () => {
    const animations = HERO_ANIMATION_METADATA.male;

    expect(HERO_ASSETS_AVAILABLE.male).toBe(true);
    expect(Object.keys(animations)).toEqual([...HERO_ANIMATION_NAMES]);
    expect(HERO_METAL_ANIMATION_NAMES).toHaveLength(24);
    for (const animation of HERO_METAL_ANIMATION_NAMES) {
      const metadata = animations[animation];
      expect(metadata.framePaths).toHaveLength(HERO_METAL_FRAME_COUNT);
      expect(metadata.sheet).toBe('');
      expect(metadata.assetId).toBe(HERO_METAL_RUNTIME_MAPPING[animation]);
      expect(metadata.framePaths).toEqual(expect.arrayContaining([
        expect.stringMatching(/^frames_webp\/\d{2}_.+\/\d{2}_.+_01\.webp$/),
      ]));
      const row = actorRow('metal', metadata.assetId ?? '');
      expect(metadata.frameWidth).toBe(row?.equalFrameSize.w);
      expect(metadata.frameHeight).toBe(row?.equalFrameSize.h);
      expect(metadata.frameCount).toBe(HERO_METAL_FRAME_COUNT);
      expect(metadata.frameRate).toBe(HERO_METAL_FRAME_RATE);
      expect(HERO_METAL_RUNTIME_MAPPING[animation]).toBeTruthy();
    }
  });

  it('maps every male runtime action to a six-frame V2 row', () => {
    for (const element of ['metal', 'wood', 'water', 'fire', 'earth'] as const) {
      const animations = HERO_ELEMENT_ANIMATION_METADATA[element];
      const expectedRoot = element === 'metal' ? 'assets/hero-metal' : `assets/hero-${element}`;
      expect(HERO_ELEMENT_ASSET_ROOTS[element]).toBe(expectedRoot);
      expect(Object.keys(animations)).toEqual([...HERO_ANIMATION_NAMES]);
      for (const animation of HERO_METAL_ANIMATION_NAMES) {
        const metadata = animations[animation];
        expect(metadata.framePaths).toHaveLength(HERO_METAL_FRAME_COUNT);
        const row = actorRow(element, metadata.assetId ?? '');
        expect(row).toBeDefined();
        expect(metadata.frameWidth).toBe(row?.equalFrameSize.w);
        expect(metadata.frameHeight).toBe(row?.equalFrameSize.h);
        expect(metadata.frameRate).toBe(ACTOR_FRAME_RATE);
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

  it('keeps one idle-calibrated scale across Metal actions', () => {
    for (const animation of HERO_METAL_ANIMATION_NAMES) {
      const metadata = HERO_ELEMENT_ANIMATION_METADATA.metal[animation];
      const scale = HERO_METAL_DISPLAY_WIDTH / HERO_METAL_FRAME_WIDTH;
      expect(heroDisplaySize('male', animation)).toEqual({
        width: metadata.frameWidth * scale,
        height: metadata.frameHeight * scale,
      });
    }
    for (const animation of HERO_ANIMATION_NAMES) {
      expect(heroDisplaySize('female', animation)).toEqual({
        width: HERO_DISPLAY_WIDTH,
        height: HERO_DISPLAY_HEIGHT,
      });
    }
  });

  it('exposes all 24 physical Kim V2 rows for the skin preview', () => {
    expect(METAL_PREVIEW_ACTIONS).toHaveLength(24);
    expect(new Set(METAL_PREVIEW_ACTIONS.map((action) => action.id)).size).toBe(24);
    expect(METAL_PREVIEW_ACTIONS.map((action) => action.id)).toEqual(expect.arrayContaining([
      'idle', 'poison', 'skill_dodge', 'van_kiem_quy_tong', 'kim_quang_pha_giap',
    ]));
  });

  it('ships 24 independent six-frame rows for all seven V2 actors', () => {
    for (const actor of ['metal', 'wood', 'water', 'fire', 'earth', 'mist_blob', 'lantern_cat'] as const satisfies readonly ActorFrameId[]) {
      const rows = actorRows(actor);
      expect(rows).toHaveLength(24);
      expect(new Set(rows.map((row) => row.id)).size).toBe(24);
      for (const row of rows) {
        const full = actorRow(actor, row.id);
        expect(full?.frames).toHaveLength(6);
        expect(full?.frames.map((frame) => frame.file)).toEqual(expect.arrayContaining([
          expect.stringMatching(/^frames_webp\/\d{2}_.+\/\d{2}_.+_06\.webp$/),
        ]));
      }
      const attack = actorDisplaySize(actor, rows.find((row) => row.id.startsWith('normal_attack'))?.id ?? 'idle', 90);
      expect(attack.width).toBeGreaterThan(0);
      expect(attack.height).toBeGreaterThan(0);
    }
  });
});
