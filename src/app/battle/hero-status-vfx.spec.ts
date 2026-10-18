import { getHeroHpBand, getHeroPersistentStatus } from './hero-status-vfx';

describe('hero status presentation mapping', () => {
  const base = {
    currentHp: 100,
    maxHp: 100,
    shield: 0,
    poisonTurns: 0,
    energy: 0,
  };

  it('prioritizes shield over poison, then energy and HP glow states', () => {
    expect(getHeroPersistentStatus({ ...base, poisonTurns: 2, shield: 10, energy: 80 })).toBe('shield');
    expect(getHeroPersistentStatus({ ...base, poisonTurns: 2, energy: 80 })).toBe('poisoned');
    expect(getHeroPersistentStatus({ ...base, shield: 10, energy: 80 })).toBe('shield');
    expect(getHeroPersistentStatus({ ...base, energy: 80 })).toBe('energy');
  });

  it('uses explicit high and low HP bands', () => {
    expect(getHeroPersistentStatus({ ...base, currentHp: 70 })).toBe('highHp');
    expect(getHeroPersistentStatus({ ...base, currentHp: 30 })).toBe('lowHp');
    expect(getHeroPersistentStatus({ ...base, currentHp: 50 })).toBe('idle');
    expect(getHeroHpBand(70, 100)).toBe('high');
    expect(getHeroHpBand(30, 100)).toBe('low');
    expect(getHeroHpBand(50, 100)).toBe('normal');
  });
});
