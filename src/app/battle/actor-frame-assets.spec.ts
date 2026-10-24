import type Phaser from 'phaser';
import { vi } from 'vitest';
import {
  ACTOR_FRAME_RATE,
  actorAnimationKey,
  actorDisplaySize,
  actorFrameKey,
  actorRow,
  actorRows,
  ensureActorAnimation,
  normalizeActorSprite,
  preloadActorFrames,
  type ActorFrameId,
} from './actor-frame-assets';

const ACTORS: readonly ActorFrameId[] = [
  'metal', 'wood', 'water', 'fire', 'earth',
  'female_metal', 'female_wood', 'female_water', 'female_fire', 'female_earth',
  'mist_blob', 'lantern_cat', 'cloud_fox_boss', 'bamboo_mantis',
];

describe('separated V2 actor frames', () => {
  it('preloads only independent images with unique keys for each actor', () => {
    for (const actor of ACTORS) {
      const image = vi.fn();
      const spritesheet = vi.fn();
      const scene = { textures: { exists: () => false }, load: { image, spritesheet } } as unknown as Phaser.Scene;
      preloadActorFrames(scene, actor);
      const expectedFrameCount = actor === 'bamboo_mantis' ? 72 : 144;
      expect(image).toHaveBeenCalledTimes(expectedFrameCount);
      expect(spritesheet).not.toHaveBeenCalled();
      expect(new Set(image.mock.calls.map((call) => call[0])).size).toBe(expectedFrameCount);
      expect(image.mock.calls[0][1]).toMatch(/\/frames_webp\/01_idle\/01_idle_01\.webp$/);
    }
  });

  it('builds six ordered frames at the configured FPS and preserves the idle-calibrated scale', () => {
    expect(ACTOR_FRAME_RATE).toBe(12);
    const create = vi.fn();
    const scene = { anims: { exists: () => false, create } } as unknown as Phaser.Scene;
    for (const actor of ACTORS) {
      const attack = actorRows(actor).find((row) => row.id.startsWith('normal_attack'))?.id;
      expect(attack).toBeDefined();
      ensureActorAnimation(scene, actor, attack!);
      const config = create.mock.lastCall?.[0];
      expect(config.key).toBe(actorAnimationKey(actor, attack!));
      expect(config.frameRate).toBe(ACTOR_FRAME_RATE);
      expect(config.repeat).toBe(0);
      expect(config.frames).toEqual(Array.from({ length: 6 }, (_, index) => ({ key: actorFrameKey(actor, attack!, index) })));

      ensureActorAnimation(scene, actor, 'idle', actorAnimationKey(actor, 'idle'), -1);
      expect(create.mock.lastCall?.[0].repeat).toBe(-1);

      const frame = actorDisplaySize(actor, attack!, 90);
      const sourceSize = actorRow(actor, attack!)?.equalFrameSize;
      const sprite = {
        frame: { realWidth: sourceSize?.w, realHeight: sourceSize?.h },
        setOrigin: vi.fn().mockReturnThis(),
        setDisplaySize: vi.fn().mockReturnThis(),
      } as unknown as Phaser.GameObjects.Sprite;
      normalizeActorSprite(sprite, actor, 90);
      expect(sprite.setOrigin).toHaveBeenCalledWith(0.5, 1);
      const [width, height] = vi.mocked(sprite.setDisplaySize).mock.lastCall ?? [];
      expect(width).toBe(Math.round(frame.width));
      expect(height).toBe(Math.round(frame.height));
    }
  });

  it('uses the new 512px Mộc package with 24 logical rows and aliased frames', () => {
    const rows = actorRows('wood');
    expect(rows).toHaveLength(24);
    expect(new Set(rows.map((row) => row.id)).size).toBe(24);
    expect(new Set(rows.flatMap((row) => actorRow('wood', row.id)?.frames.map((frame) => frame.file) ?? [])).size).toBe(108);
    expect(actorRow('wood', 'idle')?.equalFrameSize).toEqual({ w: 512, h: 512 });
    expect(actorRow('wood', 'idle')?.frames[0]?.file).toBe('frames_webp/01_idle/01_idle_01.webp');
    expect(actorRow('wood', 'skill_1')?.frames[0]?.file).toBe('frames_webp/12_normal_attack/12_normal_attack_01.webp');
    expect(actorRow('wood', 'skill_2')?.frames[0]?.file).toBe('frames_webp/13_poison_cast/13_poison_cast_01.webp');
  });

  it('uses the new 512px Thổ package with heal-reduction and skill aliases', () => {
    const rows = actorRows('earth');
    expect(rows).toHaveLength(24);
    expect(new Set(rows.flatMap((row) => actorRow('earth', row.id)?.frames.map((frame) => frame.file) ?? [])).size).toBe(108);
    expect(actorRow('earth', 'idle')?.equalFrameSize).toEqual({ w: 512, h: 512 });
    expect(actorRow('earth', 'anti_heal')?.frames[0]?.file).toBe('frames_webp/06_heal_reduction/06_heal_reduction_01.webp');
    expect(actorRow('earth', 'skill_1')?.frames[0]?.file).toBe('frames_webp/12_normal_attack/12_normal_attack_01.webp');
    expect(actorRow('earth', 'skill_2')?.frames[0]?.file).toBe('frames_webp/13_poison_cast/13_poison_cast_01.webp');
  });
});
