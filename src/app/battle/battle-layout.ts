export interface BattlePoint {
  readonly x: number;
  readonly y: number;
}

export interface BattleBounds {
  readonly left: number;
  readonly right: number;
  readonly width: number;
}

export interface BattleLayout {
  readonly width: number;
  readonly height: number;
  readonly cellSize: number;
  readonly boardLeft: number;
  readonly boardTop: number;
  readonly boardWidth: number;
  readonly monster: BattlePoint;
  readonly hero: BattlePoint;
  readonly heroCombatY: number;
  readonly monsterCombatY: number;
  readonly heroStunY: number;
  readonly statusBarY: number;
  readonly statusBadgeY: number;
  readonly energyBarY: number;
  readonly monsterStatusBarY: number;
  readonly monsterStatusBadgeY: number;
  readonly monsterEnergyBarY: number;
  readonly hudLeft: number;
  readonly hudRight: number;
  readonly statusBarWidth: number;
  readonly playerStatusBounds: BattleBounds;
  readonly monsterStatusBounds: BattleBounds;
  readonly telegraphY: number;
  readonly statusY: number;
  readonly skillButtons: readonly BattlePoint[];
  readonly heroSkillButtons: readonly BattlePoint[];
  readonly skillButtonSize: number;
  readonly skillButtonGap: number;
}

const MIN_CELL_SIZE = 38;
const MAX_CELL_SIZE = 48;
const BOARD_SIZE = 6;
const HUD_EDGE_PADDING = 8;
const STATUS_GAP = 4;
const STATUS_BAR_MAX_WIDTH = 150;
const STATUS_BAR_MIN_WIDTH = 112;

/**
 * Single source of truth for the battle composition. The board shrinks on
 * short viewports before the character/control area is allowed to overlap it.
 */
export function createBattleLayout(width: number, height: number): BattleLayout {
  const safeWidth = Math.max(320, width);
  const safeHeight = Math.max(520, height);
  const cellSize = Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, (safeHeight - 308) / BOARD_SIZE));
  const boardWidth = cellSize * BOARD_SIZE;
  const boardLeft = (safeWidth - boardWidth) / 2;
  const boardTop = Math.max(200, Math.min(240, safeHeight - boardWidth - 92));
  const boardBottom = boardTop + boardWidth;
  const heroY = Math.min(safeHeight - 8, boardBottom + 112);
  const skillButtonSize = 54;
  const skillButtonGap = 8;
  // Keep the hero skills directly below the board with a six-pixel gap.
  const skillY = boardBottom + 6 + skillButtonSize / 2;
  const statusY = skillY + skillButtonSize / 2 + 22;
  const skillRowWidth = skillButtonSize * 2 + skillButtonGap;
  // The hero skill row follows the board's right edge so its right padding
  // matches the board's right padding at every viewport width.
  const skillRowLeft = boardLeft + boardWidth - skillRowWidth;
  const sidePadding = Math.max(4, (safeWidth - 360) / 2);
  const hudLeft = Math.round(HUD_EDGE_PADDING);
  const hudRight = Math.round(safeWidth - HUD_EDGE_PADDING);
  const statusBarWidth = Math.round(Math.max(
    STATUS_BAR_MIN_WIDTH,
    Math.min(STATUS_BAR_MAX_WIDTH, (hudRight - hudLeft - STATUS_GAP) / 2),
  ));
  const playerStatusLeft = hudLeft;
  const playerStatusRight = playerStatusLeft + statusBarWidth;
  const monsterStatusRight = hudRight;
  const monsterStatusLeft = monsterStatusRight - statusBarWidth;

  return {
    width: safeWidth,
    height: safeHeight,
    cellSize,
    boardLeft,
    boardTop,
    boardWidth,
    // Monster visual placement adds its sheet-specific transparent-padding
    // correction in BattleScene before rendering the sprite.
    monster: { x: safeWidth - 66, y: Math.max(156, boardTop - 26) },
    hero: { x: 72 + sidePadding, y: heroY },
    heroCombatY: -40,
    monsterCombatY: -32,
    heroStunY: -92,
    // Keep the character/monster status HUD in the former FPS area.
    statusBarY: 33,
    statusBadgeY: 76,
    energyBarY: 54,
    monsterStatusBarY: 33,
    monsterStatusBadgeY: 76,
    monsterEnergyBarY: 54,
    hudLeft,
    hudRight,
    statusBarWidth,
    playerStatusBounds: {
      left: playerStatusLeft,
      right: playerStatusRight,
      width: statusBarWidth,
    },
    monsterStatusBounds: {
      left: monsterStatusLeft,
      right: monsterStatusRight,
      width: statusBarWidth,
    },
    // Keep combat status copy under the hero skill row, away from the monster.
    telegraphY: skillY + skillButtonSize / 2 + 6,
    statusY,
    skillButtons: [
      { x: skillRowLeft + skillButtonSize / 2, y: skillY },
      { x: skillRowLeft + skillButtonSize + skillButtonGap + skillButtonSize / 2, y: skillY },
    ],
    heroSkillButtons: [
      { x: skillRowLeft + skillButtonSize / 2, y: skillY },
      { x: skillRowLeft + skillButtonSize + skillButtonGap + skillButtonSize / 2, y: skillY },
    ],
    skillButtonSize,
    skillButtonGap,
  };
}
