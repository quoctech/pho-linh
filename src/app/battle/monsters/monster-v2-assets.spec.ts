import {
  actorAnimationKey,
  actorRow,
  actorRows,
} from '../actor-frame-assets';
import { LANTERN_CAT_SPRITE_KEYS } from './lantern-cat/lantern-cat-assets';
import { MIST_DUST_SPRITE_KEYS } from './mist-dust/mist-dust-assets';

describe('monster V2 frame mapping', () => {
  it('uses the new skill and projectile rows for Bụi Sương', () => {
    expect(actorRows('mist_blob')).toHaveLength(24);
    expect(MIST_DUST_SPRITE_KEYS.defend).toBe(actorAnimationKey('mist_blob', 'skill_2'));
    expect(MIST_DUST_SPRITE_KEYS.poisonCast).toBe(actorAnimationKey('mist_blob', 'skill_1'));
    expect(MIST_DUST_SPRITE_KEYS.projectile).toBe(actorAnimationKey('mist_blob', 'element_projectile'));
    expect(actorRow('mist_blob', 'skill_1')?.frames).toHaveLength(6);
    expect(actorRow('mist_blob', 'skill_2')?.frames).toHaveLength(6);
  });

  it('uses the new skill and projectile rows for Miêu Đèn', () => {
    expect(actorRows('lantern_cat')).toHaveLength(24);
    expect(LANTERN_CAT_SPRITE_KEYS.specialAttack).toBe(actorAnimationKey('lantern_cat', 'skill_1'));
    expect(LANTERN_CAT_SPRITE_KEYS.defend).toBe(actorAnimationKey('lantern_cat', 'skill_2'));
    expect(LANTERN_CAT_SPRITE_KEYS.projectile).toBe(actorAnimationKey('lantern_cat', 'element_projectile'));
    expect(actorRow('lantern_cat', 'skill_1')?.frames).toHaveLength(6);
    expect(actorRow('lantern_cat', 'skill_2')?.frames).toHaveLength(6);
  });
});
