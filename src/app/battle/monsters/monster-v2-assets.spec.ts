import {
  actorAnimationKey,
  actorRow,
  actorRows,
} from '../actor-frame-assets';
import { LANTERN_CAT_SPRITE_KEYS } from './lantern-cat/lantern-cat-assets';
import { MIST_DUST_SPRITE_KEYS } from './mist-dust/mist-dust-assets';
import { BAMBOO_MANTIS_SPRITE_KEYS } from './bamboo-mantis/bamboo-mantis-assets';
import { CLOUD_FOX_SPRITE_KEYS } from './cloud-fox/cloud-fox-assets';

describe('monster V2 frame mapping', () => {
  it('uses the new skill and projectile rows for Sương Hồn', () => {
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

  it('maps Cáo Mây normal attack and skills to the v3 rows', () => {
    expect(actorRows('cloud_fox_boss')).toHaveLength(24);
    expect(CLOUD_FOX_SPRITE_KEYS.attack).toBe(actorAnimationKey('cloud_fox_boss', 'normal_attack_a'));
    expect(CLOUD_FOX_SPRITE_KEYS.heavyAttack).toBe(actorAnimationKey('cloud_fox_boss', 'van_khi_ho_ly'));
    expect(CLOUD_FOX_SPRITE_KEYS.defend).toBe(actorAnimationKey('cloud_fox_boss', 'ao_anh_hoan_vu'));
    expect(CLOUD_FOX_SPRITE_KEYS.projectile).toBe(actorAnimationKey('cloud_fox_boss', 'element_projectile'));
    expect(actorRow('cloud_fox_boss', 'van_khi_ho_ly')?.frames).toHaveLength(6);
    expect(actorRow('cloud_fox_boss', 'ao_anh_hoan_vu')?.frames).toHaveLength(6);
  });

  it('maps Bọ Lá Tre to its available v3 rows without requesting a missing skill', () => {
    expect(actorRows('bamboo_mantis')).toHaveLength(12);
    expect(BAMBOO_MANTIS_SPRITE_KEYS.attack).toBe(actorAnimationKey('bamboo_mantis', 'normal_attack_a'));
    expect(BAMBOO_MANTIS_SPRITE_KEYS.heavyAttack).toBe(actorAnimationKey('bamboo_mantis', 'normal_attack_a'));
    expect(BAMBOO_MANTIS_SPRITE_KEYS.poisonCast).toBe(actorAnimationKey('bamboo_mantis', 'normal_attack_a'));
    expect(actorRow('bamboo_mantis', 'normal_attack_a')?.frames).toHaveLength(6);
    expect(actorRow('bamboo_mantis', 'skill_1')).toBeUndefined();
  });
});
