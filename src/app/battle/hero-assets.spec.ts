import {
  HERO_ACTION_FRAME_HEIGHT,
  HERO_ACTION_FRAME_WIDTH,
  HERO_ANIMATION_METADATA,
  HERO_ANIMATION_NAMES,
  HERO_ELEMENT_ANIMATION_METADATA,
  HERO_ELEMENT_ASSET_ROOTS,
  HERO_ELEMENT_RUNTIME_MAPPING,
  HERO_FEMALE_ELEMENT_ANIMATION_METADATA,
  HERO_FEMALE_ELEMENT_ASSET_ROOTS,
  HERO_FEMALE_ELEMENT_RUNTIME_MAPPING,
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
  heroActorForAnimation,
  heroBasicAttackRow,
  heroAnimationTextureKey,
  heroSkillAnimationKey,
  heroSkillRow,
  ensureHeroAnimations,
  preloadHeroAssets,
  HERO_STATUS_ANIMATION_NAMES,
  HERO_SFX_NAMES,
  type HeroStatusAnimationName,
} from './hero-assets';
import { ACTOR_FRAME_RATE, actorDisplaySize, actorFrameKey, actorRow, actorRows, type ActorFrameId } from './actor-frame-assets';

describe('hero asset metadata', () => {
  it('maps basic attack to the configured actor and row for every gender and element', () => {
    for (const element of ['metal', 'wood', 'water', 'fire', 'earth'] as const) {
      const maleRow = element === 'metal' ? 'normal_attack' : 'normal_attack_a';
      const femaleRow = HERO_FEMALE_ELEMENT_RUNTIME_MAPPING['normal_attack'];
      expect(heroBasicAttackRow(element)).toBe(maleRow);
      expect(heroSkillRow(element, 'basicAttack')).toBe(maleRow);
      expect(heroSkillAnimationKey(element, 'basicAttack')).toBe(`hero-duo-v21-${element}-basicAttack`);
      expect(heroActorForAnimation('male', element, 'normal_attack')).toBe(element);
      expect(heroActorForAnimation('female', element, 'normal_attack')).toBe(`female_${element}`);
      expect(heroAnimationTextureKey('male', 'normal_attack', 0, element)).toBe(
        actorFrameKey(element, maleRow, 0),
      );
      expect(heroAnimationTextureKey('female', 'normal_attack', 0, element)).toBe(
        actorFrameKey(`female_${element}` as ActorFrameId, femaleRow, 0),
      );
    }
  });

  it('preloads gender-specific basic attack frames', () => {
    for (const element of ['metal', 'wood', 'water', 'fire', 'earth'] as const) {
      const loadedImages: string[] = [];
      const scene = {
        textures: { exists: () => false },
        load: {
          image: (_key: string, path: string) => loadedImages.push(path),
          audio: () => undefined,
        },
      } as unknown as Parameters<typeof preloadHeroAssets>[0];

      preloadHeroAssets(scene, 'female', element);

      const maleRow = actorRow(element, heroBasicAttackRow(element));
      const femaleRow = actorRow(`female_${element}` as ActorFrameId, HERO_FEMALE_ELEMENT_RUNTIME_MAPPING['normal_attack']);
      expect(femaleRow?.frames.every((frame) => loadedImages.includes(`${HERO_FEMALE_ELEMENT_ASSET_ROOTS[element]}/${frame.file}`))).toBe(true);
      expect(maleRow?.frames.some((frame) => loadedImages.includes(`${HERO_ELEMENT_ASSET_ROOTS[element]}/${frame.file}`))).toBe(false);
    }
  });

  it('creates the same basic attack animation from the canonical actor for both genders', () => {
    for (const gender of ['male', 'female'] as const) {
      for (const element of ['metal', 'wood', 'water', 'fire', 'earth'] as const) {
        const created: Array<{ key: string; frames: Array<{ key: string }> }> = [];
        const scene = {
          anims: {
            exists: () => false,
            create: (config: { key: string; frames: Array<{ key: string }> }) => created.push(config),
          },
        } as unknown as Parameters<typeof ensureHeroAnimations>[0];

        ensureHeroAnimations(scene, gender, element);

        const basic = created.find((animation) => animation.key === heroSkillAnimationKey(element, 'basicAttack'));
        const expectedActor = gender === 'male' ? element : `female_${element}` as ActorFrameId;
        const expectedRow = gender === 'male' ? heroBasicAttackRow(element) : HERO_FEMALE_ELEMENT_RUNTIME_MAPPING['normal_attack'];
        expect(basic?.frames.map((frame) => frame.key)).toEqual(
          Array.from({ length: HERO_METAL_FRAME_COUNT }, (_, index) => actorFrameKey(expectedActor, expectedRow, index)),
        );
        const primary = created.find((animation) => animation.key === heroSkillAnimationKey(element, 'primarySkill'));
        const secondary = created.find((animation) => animation.key === heroSkillAnimationKey(element, 'secondarySkill'));
        expect(primary?.frames[0]?.key).toBe(actorFrameKey(element, heroSkillRow(element, 'primarySkill'), 0));
        expect(secondary?.frames[0]?.key).toBe(actorFrameKey(element, heroSkillRow(element, 'secondarySkill'), 0));
      }
    }
  });

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

  it('maps every female element runtime action to a six-frame separated WebP row', () => {
    for (const element of ['metal', 'wood', 'water', 'fire', 'earth'] as const) {
      const animations = HERO_FEMALE_ELEMENT_ANIMATION_METADATA[element];
      expect(HERO_FEMALE_ELEMENT_ASSET_ROOTS[element]).toBe(`assets/hero-female-elements/${element}`);
      expect(Object.keys(animations)).toEqual([...HERO_ANIMATION_NAMES]);
      for (const animation of HERO_ANIMATION_NAMES) {
        const metadata = animations[animation];
        const row = actorRow(`female_${element}` as ActorFrameId, metadata.assetId ?? '');
        expect(metadata.assetId).toBe(HERO_FEMALE_ELEMENT_RUNTIME_MAPPING[animation]);
        expect(row).toBeDefined();
        expect(metadata.framePaths).toHaveLength(HERO_METAL_FRAME_COUNT);
        expect(metadata.frameWidth).toBe(row?.equalFrameSize.w);
        expect(metadata.frameHeight).toBe(row?.equalFrameSize.h);
        expect(metadata.frameRate).toBe(ACTOR_FRAME_RATE);
      }
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
    const femaleIdleWidth = HERO_FEMALE_ELEMENT_ANIMATION_METADATA.metal.idle.frameWidth;
    for (const animation of HERO_ANIMATION_NAMES) {
      const metadata = HERO_FEMALE_ELEMENT_ANIMATION_METADATA.metal[animation];
      expect(heroDisplaySize('female', animation).width).toBeCloseTo(metadata.frameWidth * HERO_METAL_DISPLAY_WIDTH / femaleIdleWidth);
      expect(heroDisplaySize('female', animation).height).toBeCloseTo(metadata.frameHeight * HERO_METAL_DISPLAY_WIDTH / femaleIdleWidth);
    }
  });

  it('exposes all 24 physical Kim V2 rows for the skin preview', () => {
    expect(METAL_PREVIEW_ACTIONS).toHaveLength(24);
    expect(new Set(METAL_PREVIEW_ACTIONS.map((action) => action.id)).size).toBe(24);
    expect(METAL_PREVIEW_ACTIONS.map((action) => action.id)).toEqual(expect.arrayContaining([
      'idle', 'poison', 'skill_dodge', 'van_kiem_quy_tong', 'kim_quang_pha_giap',
    ]));
  });

  it('ships 24 independent six-frame rows for all twelve V2 actors', () => {
    for (const actor of ['metal', 'wood', 'water', 'fire', 'earth', 'female_metal', 'female_wood', 'female_water', 'female_fire', 'female_earth', 'mist_blob', 'lantern_cat'] as const satisfies readonly ActorFrameId[]) {
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
