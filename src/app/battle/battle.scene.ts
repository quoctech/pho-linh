import Phaser from 'phaser';
import {
  areAdjacent,
  type Board,
  type Coord,
  type GameEvent,
  type GemType,
} from '../../game-core';
import { BattleController, type BattleEventPlayer } from './battle.controller';

const GEM_TYPES: readonly GemType[] = [
  'attack',
  'heal',
  'shield',
  'energy',
  'poison',
];

const BOARD_SIZE = 6;
const CELL_SIZE = 48;
const BOARD_LEFT = 36;
const BOARD_TOP = 158;

export class BattleScene extends Phaser.Scene implements BattleEventPlayer {
  private readonly controller: BattleController;
  private readonly gemSprites = new Map<string, Phaser.GameObjects.Container>();
  private selection?: Phaser.GameObjects.Rectangle;
  private selectedCell?: Coord;
  private pointerStart?: Coord;
  private turnLabel?: Phaser.GameObjects.Text;
  private statusLabel?: Phaser.GameObjects.Text;
  private unsubscribe?: () => void;

  constructor() {
    super({ key: 'BattleScene' });
    this.controller = new BattleController(0x50484f, this);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#171426');
    this.createHud();
    this.createBoardFrame();
    this.selection = this.add
      .rectangle(0, 0, CELL_SIZE - 4, CELL_SIZE - 4)
      .setStrokeStyle(3, 0xffe7a6)
      .setFillStyle(0xffffff, 0)
      .setVisible(false);

    this.unsubscribe = this.controller.subscribe((state) => {
      this.renderBoard(state.board);
      if (this.turnLabel) {
        this.turnLabel.setText(`Lượt ${state.turn}`);
      }
    });

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.events.once('shutdown', this.cleanup, this);
  }

  async play(events: readonly GameEvent[]): Promise<void> {
    for (const event of events) {
      const board = event.payload['board'];
      if (this.isBoard(board)) {
        this.renderBoard(board);
      }

      if (this.statusLabel) {
        this.statusLabel.setText(this.statusForEvent(event));
      }
      await this.wait(this.durationForEvent(event));
    }

    if (this.statusLabel) {
      this.statusLabel.setText('Chọn hai viên ngọc kề nhau');
    }
  }

  private createHud(): void {
    this.add
      .text(24, 30, 'PHỐ LINH', {
        color: '#ffe7a6',
        fontFamily: 'sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    this.add
      .text(24, 70, 'Match-3 prototype', {
        color: '#a9a2c5',
        fontFamily: 'sans-serif',
        fontSize: '14px',
      })
      .setOrigin(0, 0.5);
    this.turnLabel = this.add
      .text(336, 36, 'Lượt 0', {
        color: '#fff8e8',
        fontFamily: 'sans-serif',
        fontSize: '16px',
      })
      .setOrigin(1, 0.5);
    this.statusLabel = this.add
      .text(180, 112, 'Chọn hai viên ngọc kề nhau', {
        color: '#fff8e8',
        fontFamily: 'sans-serif',
        fontSize: '14px',
      })
      .setOrigin(0.5);
  }

  private createBoardFrame(): void {
    const frame = this.add.graphics();
    frame.fillStyle(0x28213d, 1);
    frame.fillRoundedRect(
      BOARD_LEFT - 10,
      BOARD_TOP - 10,
      BOARD_SIZE * CELL_SIZE + 20,
      BOARD_SIZE * CELL_SIZE + 20,
      16,
    );
    frame.lineStyle(2, 0x594b78, 1);
    frame.strokeRoundedRect(
      BOARD_LEFT - 10,
      BOARD_TOP - 10,
      BOARD_SIZE * CELL_SIZE + 20,
      BOARD_SIZE * CELL_SIZE + 20,
      16,
    );
  }

  private renderBoard(board: Board): void {
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const key = `${row}:${col}`;
        const x = BOARD_LEFT + col * CELL_SIZE + CELL_SIZE / 2;
        const y = BOARD_TOP + row * CELL_SIZE + CELL_SIZE / 2;
        const current = this.gemSprites.get(key);
        if (!current || current.getData('gemType') !== board[row][col]) {
          current?.destroy(true);
          this.gemSprites.set(key, this.createGem(x, y, board[row][col]));
        } else {
          current.setPosition(x, y);
        }
      }
    }
    this.renderSelection();
  }

  private createGem(x: number, y: number, gem: GemType): Phaser.GameObjects.Container {
    const visual = this.gemVisual(gem);
    const container = this.add.container(x, y);
    const circle = this.add.circle(0, 0, 19, visual.color, 1);
    circle.setStrokeStyle(2, 0xfff8e8, 0.85);
    const label = this.add
      .text(0, 1, visual.symbol, {
        color: '#fff8e8',
        fontFamily: 'sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    container.add([circle, label]);
    container.setData('gemType', gem);
    return container;
  }

  private gemVisual(gem: GemType): { readonly color: number; readonly symbol: string } {
    switch (gem) {
      case 'attack':
        return { color: 0xe75b62, symbol: 'A' };
      case 'heal':
        return { color: 0x57c982, symbol: 'H' };
      case 'shield':
        return { color: 0x5a9de8, symbol: 'S' };
      case 'energy':
        return { color: 0xf3c64f, symbol: 'E' };
      case 'poison':
        return { color: 0xa778df, symbol: 'P' };
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.controller.isLocked) {
      return;
    }
    this.pointerStart = this.cellFromPoint(pointer.x, pointer.y);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.controller.isLocked || !this.pointerStart) {
      return;
    }

    const start = this.pointerStart;
    const end = this.cellFromPoint(pointer.x, pointer.y);
    this.pointerStart = undefined;
    if (!end) {
      return;
    }

    if (start.row === end.row && start.col === end.col) {
      if (this.selectedCell && areAdjacent(this.selectedCell, end)) {
        void this.dispatchSwap(this.selectedCell, end);
      } else {
        this.selectedCell = end;
        this.renderSelection();
      }
      return;
    }

    if (areAdjacent(start, end)) {
      void this.dispatchSwap(start, end);
      return;
    }

    this.selectedCell = end;
    this.renderSelection();
  }

  private async dispatchSwap(from: Coord, to: Coord): Promise<void> {
    this.selectedCell = undefined;
    this.renderSelection();
    await this.controller.dispatch({
      kind: 'swap',
      from,
      to,
      actionId: `turn-${this.controller.currentState.turn + 1}`,
    });
  }

  private cellFromPoint(x: number, y: number): Coord | undefined {
    const col = Math.floor((x - BOARD_LEFT) / CELL_SIZE);
    const row = Math.floor((y - BOARD_TOP) / CELL_SIZE);
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
      return undefined;
    }
    return { row, col };
  }

  private renderSelection(): void {
    if (!this.selection) {
      return;
    }
    if (!this.selectedCell) {
      this.selection.setVisible(false);
      return;
    }
    this.selection
      .setPosition(
        BOARD_LEFT + this.selectedCell.col * CELL_SIZE + CELL_SIZE / 2,
        BOARD_TOP + this.selectedCell.row * CELL_SIZE + CELL_SIZE / 2,
      )
      .setVisible(true);
  }

  private statusForEvent(event: GameEvent): string {
    switch (event.type) {
      case 'SWAP_REJECTED':
        return 'Nước đi chưa tạo được nhóm 3';
      case 'MATCH_FOUND':
        return 'Đang ghép ngọc…';
      case 'GEMS_CLEARED':
        return 'Ngọc biến mất';
      case 'GEMS_FALLING':
        return 'Ngọc đang rơi';
      case 'BOARD_RESHUFFLED':
        return 'Bàn được xáo lại';
      case 'BOARD_FORCED_STABILIZE':
        return 'Ổn định lại bàn';
      default:
        return 'Đang xử lý…';
    }
  }

  private durationForEvent(event: GameEvent): number {
    switch (event.type) {
      case 'SWAP_STARTED':
        return 160;
      case 'GEMS_CLEARED':
        return 180;
      case 'GEMS_FALLING':
        return 220;
      case 'GEMS_REFILLED':
        return 100;
      default:
        return 80;
    }
  }

  private wait(duration: number): Promise<void> {
    return new Promise((resolve) => {
      this.time.delayedCall(duration, () => resolve());
    });
  }

  private isBoard(value: unknown): value is Board {
    return (
      Array.isArray(value) &&
      value.length === BOARD_SIZE &&
      value.every(
        (row) => Array.isArray(row) && row.length === BOARD_SIZE && row.every((gem) => GEM_TYPES.includes(gem)),
      )
    );
  }

  private cleanup(): void {
    this.input.off('pointerdown', this.onPointerDown, this);
    this.input.off('pointerup', this.onPointerUp, this);
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.gemSprites.clear();
  }
}
