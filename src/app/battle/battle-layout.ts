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
  readonly energyBarY: number;
  readonly hudLeft: number;
  readonly hudRight: number;
  readonly statusBarWidth: number;
  readonly playerStatusBounds: BattleBounds;
  readonly monsterStatusBounds: BattleBounds;
  readonly telegraphY: number;
  readonly statusY: number;
  readonly skillButton: BattlePoint;
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
  const boardTop = Math.max(196, Math.min(240, safeHeight - boardWidth - 92));
  const boardBottom = boardTop + boardWidth;
  const heroY = Math.min(safeHeight - 8, boardBottom + 112);
  const skillY = Math.min(safeHeight - 48, boardBottom + 52);
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
    boardLeft: (safeWidth - boardWidth) / 2,
    boardTop,
    boardWidth,
    // Monster visual placement adds its sheet-specific transparent-padding
    // correction in BattleScene before rendering the sprite.
    monster: { x: safeWidth - 66, y: Math.max(156, boardTop - 26) },
    hero: { x: 72 + sidePadding, y: heroY },
    heroCombatY: -40,
    monsterCombatY: -32,
    heroStunY: -92,
    statusBarY: 69,
    energyBarY: 105,
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
    telegraphY: boardTop - 46,
    statusY: boardTop - 26,
    skillButton: { x: safeWidth - 86 - sidePadding, y: skillY },
  };
}
