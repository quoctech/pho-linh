import { createBattleLayout } from '../battle-layout';
import {
  clampRatio,
  formatStatusText,
  getStatusFillGeometry,
  getStatusOverlayState,
} from './status-ui-vfx';

describe('status presentation mapping', () => {
  it('keeps the gameplay aura threshold at values above 50', () => {
    expect(getStatusOverlayState(0, 0, 50)).toEqual({ shield: false, poison: false, energy: false });
    expect(getStatusOverlayState(1, 2, 51)).toEqual({ shield: true, poison: false, energy: true });
    expect(getStatusOverlayState(0, 0, 0)).toEqual({ shield: false, poison: false, energy: false });
  });

  it('clamps health and energy fills without changing the source values', () => {
    const values = { hp: 140, maxHp: 100, energy: -4 };
    expect(clampRatio(values.hp, values.maxHp)).toBe(1);
    expect(clampRatio(values.energy, 100)).toBe(0);
    expect(values).toEqual({ hp: 140, maxHp: 100, energy: -4 });
  });

  it('keeps hero and monster HP fills mirrored across the two HUD columns', () => {
    const layout = createBattleLayout(360, 620);
    const heroHalf = getStatusFillGeometry(layout.playerStatusBounds, false, 0.5);
    const heroFull = getStatusFillGeometry(layout.playerStatusBounds, false, 1);
    const monsterHalf = getStatusFillGeometry(layout.monsterStatusBounds, true, 0.5);
    const monsterFull = getStatusFillGeometry(layout.monsterStatusBounds, true, 1);

    expect(heroHalf.left).toBe(heroFull.left);
    expect(heroHalf.width).toBeLessThan(heroFull.width);
    expect(monsterHalf.left).toBeGreaterThan(monsterFull.left);
    expect(monsterHalf.left + monsterHalf.width).toBe(monsterFull.left + monsterFull.width);
  });

  it('formats HP separately so shield and poison can render as non-overlapping badges', () => {
    expect(formatStatusText({
      currentHp: 120,
      maxHp: 180,
      shield: 24,
      poisonPotency: 7,
      poisonTurns: 2,
      energy: 51,
    })).toBe('120/180');

    expect(formatStatusText({
      currentHp: 120,
      maxHp: 180,
      shield: 0,
      poisonPotency: 7,
      poisonTurns: 0,
      energy: 0,
    })).toBe('120/180');
  });
});

describe('battle layout', () => {
  it('anchors hero and monster status bars to the shared HUD edges', () => {
    for (const width of [320, 360, 414]) {
      const layout = createBattleLayout(width, 620);

      expect(layout.playerStatusBounds.left).toBe(layout.hudLeft);
      expect(layout.monsterStatusBounds.right).toBe(layout.hudRight);
      expect(layout.playerStatusBounds.width).toBe(layout.statusBarWidth);
      expect(layout.monsterStatusBounds.width).toBe(layout.statusBarWidth);
      expect(layout.playerStatusBounds.right).toBeLessThanOrEqual(layout.monsterStatusBounds.left);
      expect(layout.playerStatusBounds.left).toBeGreaterThanOrEqual(0);
      expect(layout.monsterStatusBounds.right).toBeLessThanOrEqual(width);
      expect(Number.isInteger(layout.playerStatusBounds.left)).toBe(true);
      expect(Number.isInteger(layout.playerStatusBounds.right)).toBe(true);
      expect(Number.isInteger(layout.monsterStatusBounds.left)).toBe(true);
      expect(Number.isInteger(layout.monsterStatusBounds.right)).toBe(true);
      expect(layout.statusBarY + 15).toBeLessThan(layout.statusBadgeY);
      expect(layout.energyBarY + 15).toBeLessThan(layout.statusBadgeY);
      expect(layout.statusBadgeY + 12).toBeLessThan(layout.telegraphY);
      expect(layout.statusY).toBeGreaterThan(layout.telegraphY);
      expect(layout.telegraphY).toBeGreaterThan(layout.skillButtons[1].y + layout.skillButtonSize / 2);
      expect(layout.statusY).toBeLessThanOrEqual(620 - 10);
      for (const point of layout.heroSkillButtons) {
        expect(point.x - layout.skillButtonSize / 2).toBeGreaterThanOrEqual(0);
        expect(point.x + layout.skillButtonSize / 2).toBeLessThanOrEqual(width);
      }
      const lastHeroSkill = layout.heroSkillButtons[layout.heroSkillButtons.length - 1];
      expect(lastHeroSkill.x + layout.skillButtonSize / 2).toBe(layout.boardLeft + layout.boardWidth);
    }
  });

  it('keeps the board, hero and controls separated on a compact viewport', () => {
    for (const height of [520, 560]) {
      const layout = createBattleLayout(320, height);
      const boardBottom = layout.boardTop + layout.boardWidth;
      const heroTop = layout.hero.y - 77;
      const [firstSkill, secondSkill] = layout.skillButtons;

      expect(boardBottom).toBeLessThanOrEqual(heroTop);
      expect(firstSkill.x).toBeLessThan(secondSkill.x);
      expect(secondSkill.x - firstSkill.x).toBe(layout.skillButtonSize + layout.skillButtonGap);
      expect(firstSkill.x - layout.skillButtonSize / 2).toBeGreaterThan(0);
      expect(secondSkill.x + layout.skillButtonSize / 2).toBeLessThan(320);
      expect(firstSkill.y).toBe(secondSkill.y);
    }
  });
});
