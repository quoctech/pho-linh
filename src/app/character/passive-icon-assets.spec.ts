import { PASSIVE_ICONS, passiveIconForElement, passiveIconPath } from './passive-icon-assets';

describe('passive icon assets', () => {
  it('registers one 296x352 WebP icon for every element', () => {
    const elements = ['metal', 'wood', 'water', 'fire', 'earth'] as const;
    expect(Object.keys(PASSIVE_ICONS)).toEqual(elements);
    for (const element of elements) {
      const icon = passiveIconForElement(element);
      expect(icon.element).toBe(element);
      expect(icon.file).toMatch(/\.webp$/);
      expect(icon.width).toBe(296);
      expect(icon.height).toBe(352);
      expect(passiveIconPath(element)).toBe(`assets/passive-icons-v1/icons_webp/${icon.file}`);
      expect(icon.label.length).toBeGreaterThan(0);
      expect(icon.description.length).toBeGreaterThan(0);
    }
  });
});
