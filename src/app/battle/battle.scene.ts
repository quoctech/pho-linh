import Phaser from 'phaser';
import {
  areAdjacent,
  DEFAULT_BATTLE_CONFIG,
  type Board,
  type BattleState,
  type Coord,
  type GameEvent,
  type GemType,
} from '../../game-core';
import { BattleController, type BattleEventPlayer } from './battle.controller';

const GEM_TYPES: readonly GemType[] = ['attack', 'heal', 'shield', 'energy', 'poison'];
const BOARD_SIZE = 6;
const CELL_SIZE = 48;
const BOARD_LEFT = 36;
const BOARD_TOP = 184;
const BOARD_WIDTH = BOARD_SIZE * CELL_SIZE;
const GEM_ATLAS_KEY = 'pho-linh-gems';
const GEM_ATLAS_FRAMES: Partial<Record<GemType, number>> = {
  attack: 0,
  shield: 1,
  heal: 2,
  energy: 3,
};
const GEM_TEXTURE_KEYS: Partial<Record<GemType, string>> = {
  attack: 'gem-attack',
  heal: 'gem-heal',
  poison: 'gem-poison-pure',
  shield: 'gem-shield',
  energy: 'gem-energy',
};
const VFX_SHEET_KEYS = {
  selectRing: 'fx-select-ring',
  match3: 'fx-match3-burst',
  match4: 'fx-match4-burst',
  match5: 'fx-match5-burst',
  impact: 'fx-gem-impact',
} as const;

export class BattleScene extends Phaser.Scene implements BattleEventPlayer {
  private controller!: BattleController;
  private readonly gemSprites = new Map<string, Phaser.GameObjects.Container>();
  private readonly vfxSprites = new Set<Phaser.GameObjects.Sprite>();
  private selection?: Phaser.GameObjects.Rectangle;
  private selectionRing?: Phaser.GameObjects.Sprite;
  private selectedCell?: Coord;
  private pointerStart?: Coord;
  private monsterVisual?: Phaser.GameObjects.Container;
  private monsterBody?: Phaser.GameObjects.Arc;
  private monsterArt?: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
  private monsterSprite?: Phaser.GameObjects.Sprite;
  private playerBar?: Phaser.GameObjects.Graphics;
  private monsterBar?: Phaser.GameObjects.Graphics;
  private playerHpLabel?: Phaser.GameObjects.Text;
  private monsterHpLabel?: Phaser.GameObjects.Text;
  private energyLabel?: Phaser.GameObjects.Text;
  private energyBar?: Phaser.GameObjects.Graphics;
  private turnLabel?: Phaser.GameObjects.Text;
  private countdownLabel?: Phaser.GameObjects.Text;
  private telegraphLabel?: Phaser.GameObjects.Text;
  private statusLabel?: Phaser.GameObjects.Text;
  private skillButton?: Phaser.GameObjects.Rectangle;
  private skillButtonText?: Phaser.GameObjects.Text;
  private abandonButton?: Phaser.GameObjects.Text;
  private unsubscribe?: () => void;
  private turnTimer?: Phaser.Time.TimerEvent;
  private remainingSeconds = DEFAULT_BATTLE_CONFIG.playerTurnSeconds;
  private monsterMoveFrom?: Phaser.GameObjects.Rectangle;
  private monsterMoveTo?: Phaser.GameObjects.Rectangle;
  private displayedPlayerHp?: number;
  private displayedMonsterHp?: number;
  private displayedShield?: number;
  private displayedEnergy?: number;
  private lastBoard?: Board;

  constructor() {
    super({ key: 'BattleScene' });
  }

  preload(): void {
    this.load.spritesheet(GEM_ATLAS_KEY, 'assets/gems/pho-linh/pho-linh-gems-sheet.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.image('gem-attack', 'assets/gems/attack.webp');
    this.load.image('gem-heal', 'assets/gems/heal.webp');
    this.load.image('gem-poison-pure', 'assets/gems/pho-linh/gem-p-pure.png');
    this.load.image('gem-shield', 'assets/gems/shield.webp');
    this.load.image('gem-energy', 'assets/gems/energy.webp');
    this.load.spritesheet(VFX_SHEET_KEYS.selectRing, 'assets/vfx/fx-select-ring/fx-select-ring-sheet.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet(VFX_SHEET_KEYS.match3, 'assets/vfx/fx-match3-burst/fx-match3-burst-sheet.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet(VFX_SHEET_KEYS.match4, 'assets/vfx/fx-match4-burst/fx-match4-burst-sheet.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet(VFX_SHEET_KEYS.match5, 'assets/vfx/fx-match5-burst/fx-match5-burst-sheet.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet(VFX_SHEET_KEYS.impact, 'assets/vfx/fx-gem-impact/fx-gem-impact-sheet.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.image('monster-mist-blob', 'assets/monsters/mist_blob.webp');
    const controller = this.registry.get('battleController') as BattleController | undefined;
    if (!controller || controller.currentState.monster.id === 'mist_blob') {
      this.load.spritesheet('mist-dust-idle', 'assets/monsters/mist-dust/mist-dust-idle-sheet.png', {
        frameWidth: 512,
        frameHeight: 512,
      });
      this.load.spritesheet('mist-dust-attack', 'assets/monsters/mist-dust/combat/attack/mist-dust-attack-sheet.png', {
        frameWidth: 512,
        frameHeight: 512,
      });
      this.load.spritesheet('mist-dust-hit', 'assets/monsters/mist-dust/combat/hit/mist-dust-hit-sheet.png', {
        frameWidth: 512,
        frameHeight: 512,
      });
      this.load.spritesheet('mist-dust-death', 'assets/monsters/mist-dust/combat/death/mist-dust-death-sheet.png', {
        frameWidth: 512,
        frameHeight: 512,
      });
    }
  }

  create(): void {
    this.controller = this.registry.get('battleController') as BattleController;
    if (!this.controller) {
      this.controller = new BattleController(0x50484f, this);
    } else {
      this.controller.attachEventPlayer(this);
    }

    this.cameras.main.setBackgroundColor('#171426');
    this.ensureMatch3VfxAnimations();
    this.createHud();
    this.createMonsterVisual();
    this.createBoardFrame();
    this.createControls();

    this.selection = this.add
      .rectangle(0, 0, CELL_SIZE - 4, CELL_SIZE - 4)
      .setStrokeStyle(3, 0xffe7a6)
      .setFillStyle(0xffffff, 0)
      .setDepth(10)
      .setVisible(false);
    if (this.textures.exists(VFX_SHEET_KEYS.selectRing) && this.anims.exists(VFX_SHEET_KEYS.selectRing)) {
      this.selectionRing = this.add
        .sprite(0, 0, VFX_SHEET_KEYS.selectRing)
        .setOrigin(0.5)
        .setDisplaySize(46, 46)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(11)
        .setVisible(false)
        .play(VFX_SHEET_KEYS.selectRing);
    }
    this.monsterMoveFrom = this.add.rectangle(0, 0, CELL_SIZE - 8, CELL_SIZE - 8)
      .setStrokeStyle(3, 0x8fd3ff).setFillStyle(0x8fd3ff, 0.12).setDepth(10).setVisible(false);
    this.monsterMoveTo = this.add.rectangle(0, 0, CELL_SIZE - 8, CELL_SIZE - 8)
      .setStrokeStyle(3, 0xa889ff).setFillStyle(0xa889ff, 0.12).setDepth(10).setVisible(false);

    this.unsubscribe = this.controller.subscribe((state) => this.renderState(state));
    this.syncTurnTimer();
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.events.once('shutdown', this.cleanup, this);
  }

  async play(events: readonly GameEvent[]): Promise<void> {
    for (const event of events) {
      const board = event.payload['board'];
      if (this.isBoard(board)) {
        const previousBoard = this.lastBoard;
        this.renderBoard(board);
        if (event.type === 'GEMS_REFILLED' && previousBoard) {
          this.spawnRefillImpacts(previousBoard, board);
        }
      }

      this.playEventFeedback(event);
      await this.wait(this.durationForEvent(event));
    }

    const monsterActed = events.some((event) =>
      event.type === 'MONSTER_SWAP_RESOLVED' || event.type === 'MONSTER_ATTACKED' || event.type === 'MONSTER_GUARDED',
    );
    const terminal = events.some((event) =>
      event.type === 'BATTLE_WON' || event.type === 'BATTLE_LOST' || event.type === 'BATTLE_ABANDONED',
    );
    if (monsterActed && !terminal) {
      this.hideMonsterMove();
      this.statusLabel?.setText('Tới lượt bạn · Chọn hai ngọc kề nhau');
    }
  }

  private createHud(): void {
    this.turnLabel = this.add
      .text(336, 20, 'Lượt 0 / 20', { color: '#fff8e8', fontFamily: 'sans-serif', fontSize: '14px' })
      .setOrigin(1, 0.5);
    this.countdownLabel = this.add
      .text(336, 42, '', { color: '#f3c64f', fontFamily: 'sans-serif', fontSize: '14px', fontStyle: 'bold' })
      .setOrigin(1, 0.5);

    this.add.text(24, 45, 'Nhân vật', { color: '#b8b0cf', fontSize: '12px' });
    this.playerBar = this.add.graphics();
    this.playerHpLabel = this.add.text(24, 72, '', { color: '#fff8e8', fontSize: '12px' });

    this.add.text(24, 88, this.controller.currentState.monster.name, { color: '#b8b0cf', fontSize: '12px' });
    this.monsterBar = this.add.graphics();
    this.monsterHpLabel = this.add.text(24, 115, '', { color: '#fff8e8', fontSize: '12px' });

    this.telegraphLabel = this.add
      .text(180, 140, '', {
        color: '#f3c64f',
        fontFamily: 'sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.statusLabel = this.add
      .text(180, 158, 'Chọn hai viên ngọc kề nhau', {
        color: '#fff8e8',
        fontFamily: 'sans-serif',
        fontSize: '12px',
      })
      .setOrigin(0.5);
  }

  private createMonsterVisual(): void {
    const monster = this.add.container(294, 104);
    if (this.controller.currentState.monster.id === 'mist_blob' && this.textures.exists('mist-dust-idle')) {
      this.ensureMistDustAnimations();
      const sprite = this.add.sprite(0, 0, 'mist-dust-idle')
        .setOrigin(0.5, 0.88)
        .setDisplaySize(80, 80)
        .play('mist-dust-idle');
      this.monsterArt = sprite;
      this.monsterSprite = sprite;
      monster.add(sprite);
      this.monsterVisual = monster;
      return;
    }
    if (this.controller.currentState.monster.id === 'mist_blob' && this.textures.exists('monster-mist-blob')) {
      this.monsterArt = this.add.image(0, 0, 'monster-mist-blob')
        .setOrigin(0.5, 0.88)
        .setDisplaySize(80, 80);
      monster.add(this.monsterArt);
      this.monsterVisual = monster;
      return;
    }
    const body = this.add.circle(0, 0, 24, 0x8b9bc7, 1);
    body.setStrokeStyle(2, 0xe9efff, 0.9);
    const leftEye = this.add.circle(-8, -3, 3.5, 0x26203d, 1);
    const rightEye = this.add.circle(8, -3, 3.5, 0x26203d, 1);
    const mouth = this.add.arc(0, 5, 7, 20, 160, false, 0x26203d, 1);
    monster.add([body, leftEye, rightEye, mouth]);
    this.monsterVisual = monster;
    this.monsterBody = body;
  }

  private ensureMistDustAnimations(): void {
    this.createMonsterAnimation('mist-dust-idle', 'mist-dust-idle', 8, -1);
    this.createMonsterAnimation('mist-dust-attack', 'mist-dust-attack', 8, 0);
    this.createMonsterAnimation('mist-dust-hit', 'mist-dust-hit', 8, 0);
    this.createMonsterAnimation('mist-dust-death', 'mist-dust-death', 8, 0);
  }

  private createMonsterAnimation(
    key: string,
    textureKey: string,
    frameRate: number,
    repeat: number,
  ): void {
    if (this.anims.exists(key) || !this.textures.exists(textureKey)) return;
    this.anims.create({
      key,
      frames: this.anims.generateFrameNumbers(textureKey, { start: 0, end: 7 }),
      frameRate,
      repeat,
    });
  }

  private ensureMatch3VfxAnimations(): void {
    this.createVfxAnimation(VFX_SHEET_KEYS.selectRing, VFX_SHEET_KEYS.selectRing, -1);
    this.createVfxAnimation(VFX_SHEET_KEYS.match3, VFX_SHEET_KEYS.match3, 0);
    this.createVfxAnimation(VFX_SHEET_KEYS.match4, VFX_SHEET_KEYS.match4, 0);
    this.createVfxAnimation(VFX_SHEET_KEYS.match5, VFX_SHEET_KEYS.match5, 0);
    this.createVfxAnimation(VFX_SHEET_KEYS.impact, VFX_SHEET_KEYS.impact, 0);
  }

  private createVfxAnimation(key: string, textureKey: string, repeat: number): void {
    if (this.anims.exists(key) || !this.textures.exists(textureKey)) return;
    this.anims.create({
      key,
      frames: this.anims.generateFrameNumbers(textureKey, { start: 0, end: 7 }),
      frameRate: 12,
      repeat,
    });
  }

  private spawnVfx(
    key: string,
    x: number,
    y: number,
    displaySize: number,
    depth = 12,
  ): void {
    if (!this.textures.exists(key) || !this.anims.exists(key)) return;
    const fx = this.add
      .sprite(x, y, key)
      .setOrigin(0.5)
      .setDisplaySize(displaySize, displaySize)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth)
      .play(key);
    this.vfxSprites.add(fx);
    fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.vfxSprites.delete(fx);
      fx.destroy();
    });
  }

  private createBoardFrame(): void {
    const frame = this.add.graphics();
    frame.fillStyle(0x28213d, 1);
    frame.fillRoundedRect(BOARD_LEFT - 10, BOARD_TOP - 10, BOARD_WIDTH + 20, BOARD_WIDTH + 20, 16);
    frame.lineStyle(2, 0x594b78, 1);
    frame.strokeRoundedRect(BOARD_LEFT - 10, BOARD_TOP - 10, BOARD_WIDTH + 20, BOARD_WIDTH + 20, 16);
  }

  private createControls(): void {
    this.energyLabel = this.add.text(24, 495, 'Energy 0 / 100', {
      color: '#f3c64f',
      fontSize: '14px',
      fontStyle: 'bold',
    });
    this.energyBar = this.add.graphics();

    this.skillButton = this.add
      .rectangle(274, 524, 128, 38, 0x6b4fa3, 1)
      .setStrokeStyle(2, 0xd8c2ff, 0.7)
      .setInteractive({ useHandCursor: true });
    this.skillButtonText = this.add
      .text(274, 524, 'Đèn Phá Mây', { color: '#fff8e8', fontSize: '12px', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.skillButton.on('pointerdown', () => void this.dispatchSkill());

    this.abandonButton = this.add
      .text(24, 580, 'Bỏ trận', { color: '#eaa1ad', fontSize: '13px' })
      .setInteractive({ useHandCursor: true });
    this.abandonButton.on('pointerdown', () => void this.dispatchAbandon());
  }

  private renderState(state: BattleState): void {
    this.displayedPlayerHp = state.player.currentHp;
    this.displayedMonsterHp = state.monster.currentHp;
    this.displayedShield = state.player.shield;
    this.displayedEnergy = state.player.energy;
    this.renderBoard(state.board);
    this.renderBars(state);
    this.telegraphLabel?.setText(state.telegraph);
    this.turnLabel?.setText(`Lượt ${state.turn} / ${state.maxTurns}`);
    this.energyLabel?.setText(`Energy ${state.player.energy} / 100`);
    this.updateSkillButton(state);
    if (state.phase !== 'PLAYER_READY') this.stopTurnTimer();
  }

  private renderBars(state: BattleState): void {
    const playerMaxHp = this.safeNumber(state.player.stats?.maxHp, 1);
    const monsterMaxHp = this.safeNumber(state.monster.maxHp, 1);
    const playerHp = this.clampDisplay(this.displayedPlayerHp ?? state.player.currentHp, 0, playerMaxHp);
    const monsterHp = this.clampDisplay(this.displayedMonsterHp ?? state.monster.currentHp, 0, monsterMaxHp);
    const shield = this.safeNumber(this.displayedShield ?? state.player.shield);
    const energy = this.clampDisplay(this.displayedEnergy ?? state.player.energy, 0, DEFAULT_BATTLE_CONFIG.energyCap);
    this.drawBar(this.playerBar, 24, 58, 210, playerHp / playerMaxHp, 0x57c982);
    this.drawBar(this.monsterBar, 24, 101, 210, monsterHp / monsterMaxHp, 0xe75b62);
    this.drawBar(this.energyBar, 24, 512, 210, energy / DEFAULT_BATTLE_CONFIG.energyCap, 0xf3c64f);
    this.playerHpLabel?.setText(`HP ${playerHp} / ${playerMaxHp}  ·  Khiên ${shield}`);
    this.monsterHpLabel?.setText(`HP ${monsterHp} / ${monsterMaxHp}`);
    this.energyLabel?.setText(`Energy ${energy} / 100`);
  }

  private refreshDisplayedBars(): void {
    this.renderBars(this.controller.currentState);
  }

  private drawBar(
    graphics: Phaser.GameObjects.Graphics | undefined,
    x: number,
    y: number,
    width: number,
    ratio: number,
    color: number,
  ): void {
    if (!graphics) return;
    graphics.clear();
    graphics.fillStyle(0x3b3355, 1);
    graphics.fillRoundedRect(x, y, width, 8, 4);
    graphics.fillStyle(color, 1);
    const safeRatio = Number.isFinite(ratio) ? ratio : 0;
    graphics.fillRoundedRect(x, y, width * Math.max(0, Math.min(1, safeRatio)), 8, 4);
  }

  private safeNumber(value: number | undefined, fallback = 0): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  private clampDisplay(value: number | undefined, min: number, max: number): number {
    return Math.max(min, Math.min(max, this.safeNumber(value, min)));
  }

  private updateSkillButton(state: BattleState): void {
    const canAct = state.phase === 'PLAYER_READY';
    const skillReady = canAct && state.player.energy >= DEFAULT_BATTLE_CONFIG.energyCap;
    this.skillButton?.setFillStyle(skillReady ? 0x8c5fd1 : 0x403653, 1).setAlpha(skillReady ? 1 : 0.55);
    this.skillButtonText?.setAlpha(skillReady ? 1 : 0.55);
    this.setPlayerControlsEnabled(canAct, skillReady);
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
    this.lastBoard = board.map((row) => [...row]) as Board;
    this.renderSelection();
  }

  private createGem(x: number, y: number, gem: GemType): Phaser.GameObjects.Container {
    const visual = this.gemVisual(gem);
    const container = this.add.container(x, y);
    const circle = this.add.circle(0, 0, 19, visual.color, 1);
    circle.setStrokeStyle(2, 0xfff8e8, 0.55).setAlpha(0.3);
    const atlasFrame = GEM_ATLAS_FRAMES[gem];
    const textureKey = GEM_TEXTURE_KEYS[gem];
    if (atlasFrame !== undefined && this.textures.exists(GEM_ATLAS_KEY)) {
      const icon = this.add.image(0, 0, GEM_ATLAS_KEY, atlasFrame).setDisplaySize(40, 40);
      container.add([circle, icon]);
    } else if (textureKey && this.textures.exists(textureKey)) {
      const icon = this.add.image(0, 0, textureKey).setDisplaySize(40, 40);
      container.add([circle, icon]);
    } else {
      const label = this.add
        .text(0, 1, visual.symbol, { color: '#fff8e8', fontSize: '18px', fontStyle: 'bold' })
        .setOrigin(0.5);
      container.add([circle, label]);
    }
    container.setData('gemType', gem);
    return container;
  }

  private gemVisual(gem: GemType): { readonly color: number; readonly symbol: string } {
    switch (gem) {
      case 'attack': return { color: 0xe75b62, symbol: 'A' };
      case 'heal': return { color: 0x57c982, symbol: 'H' };
      case 'shield': return { color: 0x5a9de8, symbol: 'S' };
      case 'energy': return { color: 0xf3c64f, symbol: 'E' };
      case 'poison': return { color: 0xa778df, symbol: 'P' };
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.controller.isLocked || this.controller.currentState.phase !== 'PLAYER_READY') return;
    this.pointerStart = this.cellFromPoint(pointer.worldX, pointer.worldY);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.controller.isLocked || !this.pointerStart || this.controller.currentState.phase !== 'PLAYER_READY') {
      this.pointerStart = undefined;
      return;
    }
    const start = this.pointerStart;
    const end = this.cellFromPoint(pointer.worldX, pointer.worldY);
    this.pointerStart = undefined;
    if (!end) return;

    if (start.row === end.row && start.col === end.col) {
      if (this.selectedCell && this.selectedCell.row === end.row && this.selectedCell.col === end.col) {
        this.selectedCell = undefined;
        this.renderSelection();
        this.statusLabel?.setText('Đã bỏ chọn. Chọn một ngọc khác');
      } else if (this.selectedCell && areAdjacent(this.selectedCell, end)) {
        void this.dispatchSwap(this.selectedCell, end);
      } else {
        this.selectedCell = end;
        this.renderSelection();
        this.statusLabel?.setText(`Đã chọn ${this.gemAt(end)} · Chọn ngọc kề bên để đổi`);
      }
      return;
    }
    if (areAdjacent(start, end)) {
      void this.dispatchSwap(start, end);
      return;
    }
    this.selectedCell = end;
    this.renderSelection();
    this.statusLabel?.setText(`Đã chọn ${this.gemAt(end)} · Chọn ngọc kề bên để đổi`);
  }

  private async dispatchSwap(from: Coord, to: Coord): Promise<void> {
    if (!this.canPlayerAct()) return;
    this.stopTurnTimer();
    this.selectedCell = undefined;
    this.renderSelection();
    this.statusLabel?.setText(`Đang đổi ${this.gemAt(from)} và ${this.gemAt(to)}...`);
    this.setPlayerControlsEnabled(false);
    await this.controller.dispatch({
      kind: 'swap',
      from,
      to,
      actionId: `turn-${this.controller.currentState.turn + 1}`,
    });
    this.syncTurnTimer();
  }

  private async dispatchSkill(): Promise<void> {
    if (!this.canPlayerAct() || this.controller.currentState.player.energy < DEFAULT_BATTLE_CONFIG.energyCap) return;
    this.stopTurnTimer();
    this.setPlayerControlsEnabled(false);
    await this.controller.dispatch({
      kind: 'skill',
      skillId: 'cloud_break_lantern',
      actionId: `skill-${this.controller.currentState.turn + 1}`,
    });
    this.syncTurnTimer();
  }

  private async dispatchAbandon(): Promise<void> {
    if (!this.canPlayerAct()) return;
    this.stopTurnTimer();
    this.setPlayerControlsEnabled(false);
    await this.controller.dispatch({
      kind: 'abandon',
      actionId: `abandon-${this.controller.currentState.turn}`,
    });
  }

  private async dispatchTimeout(): Promise<void> {
    if (!this.canPlayerAct()) return;
    this.stopTurnTimer();
    this.setPlayerControlsEnabled(false);
    await this.controller.dispatch({ kind: 'timeout', actionId: `timeout-${this.controller.currentState.turn + 1}` });
    this.syncTurnTimer();
  }

  private playEventFeedback(event: GameEvent): void {
    const rawAmount = event.payload['amount'];
    const amount = typeof rawAmount === 'number' && Number.isFinite(rawAmount) ? rawAmount : 0;
    switch (event.type) {
      case 'MATCH_FOUND':
        this.statusLabel?.setText(event.payload['actor'] === 'monster' ? 'Quái tạo nhóm 3' : 'Bạn tạo nhóm 3');
        break;
      case 'GEMS_CLEARED': {
        const counts = event.payload['gemCounts'];
        this.spawnMatchBurst(this.coordsFromPayload(event.payload['coordinates']));
        if (typeof counts === 'object' && counts !== null) {
          const [gem, count] = Object.entries(counts as Record<string, unknown>)[0] ?? [];
          const actor = event.payload['actor'] === 'monster' ? 'Quái ghép' : 'Bạn ghép';
          this.statusLabel?.setText(`${actor} ${this.gemSymbol(String(gem))} × ${String(count ?? 0)}`);
        }
        break;
      }
      case 'MONSTER_MOVE_SELECTED': {
        const from = this.coordFromPayload(event.payload['from']);
        const to = this.coordFromPayload(event.payload['to']);
        if (from && to) this.showMonsterMove(from, to);
        this.statusLabel?.setText(String(event.payload['label'] ?? 'Quái đang chọn ngọc'));
        break;
      }
      case 'MONSTER_SWAP_STARTED':
        this.statusLabel?.setText('Quái đang đổi ngọc...');
        break;
      case 'MONSTER_SWAP_RESOLVED':
        this.statusLabel?.setText('Quái đã đổi ngọc');
        break;
      case 'TURN_TIMED_OUT':
        this.statusLabel?.setText('Hết thời gian — mất lượt');
        break;
      case 'MONSTER_THINKING':
        this.statusLabel?.setText(String(event.payload['label'] ?? 'Quái đang suy nghĩ...'));
        break;
      case 'DAMAGE_APPLIED':
        if (event.payload['target'] === 'player') {
          this.displayedPlayerHp = Math.max(0, (this.displayedPlayerHp ?? this.controller.currentState.player.currentHp) - amount);
          this.statusLabel?.setText(`-${amount} HP`);
          this.floatNumber(`-${amount} HP`, 80, 59, '#ff9aa4');
          this.shakePlayerBar();
        } else if (event.payload['target'] === 'monster') {
          this.displayedMonsterHp = Math.max(0, (this.displayedMonsterHp ?? this.controller.currentState.monster.currentHp) - amount);
          this.statusLabel?.setText(`-${amount} HP quái`);
          this.floatNumber(`-${amount} HP`, 294, 104, '#ff9aa4');
          this.playMonsterAnimation('mist-dust-hit');
          this.shakeMonster();
        }
        this.refreshDisplayedBars();
        break;
      case 'HEAL_APPLIED':
        this.displayedPlayerHp = Math.min(
          this.controller.currentState.player.stats.maxHp,
          (this.displayedPlayerHp ?? this.controller.currentState.player.currentHp) + amount,
        );
        if (amount > 0) {
          this.statusLabel?.setText(`+${amount} HP`);
          this.floatNumber(`+${amount} HP`, 80, 59, '#8ff0ad');
        } else {
          this.statusLabel?.setText('HP đã đầy');
        }
        this.refreshDisplayedBars();
        break;
      case 'SHIELD_GAINED':
        this.displayedShield = Math.max(0, (this.displayedShield ?? this.controller.currentState.player.shield) + amount);
        this.statusLabel?.setText(`+${amount} khiên`);
        this.floatNumber(`+${amount}`, 125, 59, '#9dceff');
        this.refreshDisplayedBars();
        break;
      case 'ENERGY_GAINED':
        this.displayedEnergy = Math.min(100, (this.displayedEnergy ?? this.controller.currentState.player.energy) + amount);
        this.statusLabel?.setText(`+${amount} energy`);
        this.floatNumber(`+${amount}`, 235, 515, '#ffe28c');
        this.refreshDisplayedBars();
        break;
      case 'POISON_APPLIED':
        this.statusLabel?.setText(`Độc +${amount}`);
        this.floatNumber(`Độc +${amount}`, 294, 104, '#d5aaff');
        break;
      case 'POISON_TICKED':
        this.displayedMonsterHp = Math.max(0, (this.displayedMonsterHp ?? this.controller.currentState.monster.currentHp) - amount);
        this.statusLabel?.setText(`Độc gây ${amount} damage lên quái`);
        this.floatNumber(`-${amount} độc`, 294, 104, '#d5aaff');
        this.shakeMonster();
        this.refreshDisplayedBars();
        break;
      case 'MONSTER_ATTACKED':
        if (event.payload['target'] !== 'player') return;
        const shieldAbsorbed = this.safeNumber(Number(event.payload['shieldAbsorbed'] ?? 0));
        const hpDamage = this.safeNumber(Number(event.payload['hpDamage'] ?? Math.max(0, amount - shieldAbsorbed)));
        this.displayedShield = Math.max(
          0,
          (this.displayedShield ?? this.controller.currentState.player.shield) - shieldAbsorbed,
        );
        this.displayedPlayerHp = Math.max(
          0,
          (this.displayedPlayerHp ?? this.controller.currentState.player.currentHp) - hpDamage,
        );
        this.telegraphLabel?.setText(`⚔ ${this.monsterActionText(String(event.payload['action'] ?? 'basic'))}`);
        this.statusLabel?.setText(
          hpDamage > 0
            ? `${this.controller.currentState.monster.name} gây ${hpDamage} damage${shieldAbsorbed > 0 ? ` · khiên -${shieldAbsorbed}` : ''}`
            : `${this.controller.currentState.monster.name} đánh vào khiên -${shieldAbsorbed}`,
        );
        this.floatNumber(
          hpDamage > 0 ? `-${hpDamage} HP` : `-${shieldAbsorbed} khiên`,
          80,
          59,
          hpDamage > 0 ? '#ff9aa4' : '#9dceff',
        );
        this.playMonsterAnimation('mist-dust-attack');
        this.flashMonster(0xff7a80);
        this.shakePlayerBar();
        this.refreshDisplayedBars();
        break;
      case 'MONSTER_GUARDED':
        this.telegraphLabel?.setText(`◈ ${this.monsterActionText('guard')}`);
        this.statusLabel?.setText('Quái tăng DEF trong 1 lượt');
        this.tweenMonsterTelegraph();
        break;
      case 'MONSTER_TELEGRAPH':
        this.telegraphLabel?.setText(String(event.payload['text'] ?? `${this.controller.currentState.monster.name} chuẩn bị tấn công`));
        this.tweenMonsterTelegraph();
        break;
      case 'SKILL_USED':
        this.statusLabel?.setText('Đèn Phá Mây!');
        this.flashMonster(0xcda8ff);
        break;
      case 'BATTLE_WON':
        this.statusLabel?.setText('Chiến thắng!');
        this.setPlayerControlsEnabled(false);
        this.playMonsterAnimation('mist-dust-death');
        this.flashMonster(0xffe7a6);
        break;
      case 'BATTLE_LOST':
        this.statusLabel?.setText('Bạn đã bị đánh bại');
        this.setPlayerControlsEnabled(false);
        break;
      case 'BATTLE_ABANDONED':
        this.statusLabel?.setText('Đã bỏ trận');
        this.setPlayerControlsEnabled(false);
        break;
      case 'SWAP_REJECTED':
        this.statusLabel?.setText(this.swapRejectedText(String(event.payload['reason'] ?? 'no-match')));
        break;
      default:
        break;
    }
  }

  private shakeMonster(): void {
    if (!this.monsterVisual) return;
    this.tweens.add({ targets: this.monsterVisual, x: this.monsterVisual.x + 4, yoyo: true, repeat: 2, duration: 45 });
    this.cameras.main.shake(80, 0.002);
  }

  private shakePlayerBar(): void {
    if (!this.playerBar) return;
    this.tweens.add({ targets: this.playerBar, x: 30, yoyo: true, repeat: 2, duration: 45 });
    this.cameras.main.shake(80, 0.002);
  }

  private tweenMonsterTelegraph(): void {
    if (!this.monsterVisual) return;
    this.tweens.add({ targets: this.monsterVisual, scale: 1.12, yoyo: true, duration: 180 });
  }

  private flashMonster(color: number): void {
    if (this.monsterArt) {
      this.monsterArt.setTint(color);
      this.time.delayedCall(180, () => this.monsterArt?.clearTint());
      return;
    }
    if (!this.monsterBody) return;
    this.monsterBody.setFillStyle(color, 1);
    this.time.delayedCall(180, () => this.monsterBody?.setFillStyle(0x8b9bc7, 1));
  }

  private playMonsterAnimation(key: 'mist-dust-attack' | 'mist-dust-hit' | 'mist-dust-death'): void {
    const sprite = this.monsterSprite;
    if (!sprite || !this.anims.exists(key)) return;

    sprite.stop();
    sprite.play(key);
    if (key === 'mist-dust-death') return;

    sprite.once(`animationcomplete-${key}`, () => {
      if (this.monsterSprite === sprite && this.anims.exists('mist-dust-idle')) {
        sprite.play('mist-dust-idle');
      }
    });
  }

  private monsterActionText(action: string): string {
    if (action === 'basic') return `${this.controller.currentState.monster.name} · Đánh thường`;
    return `${this.controller.currentState.monster.name} · ${action}`;
  }

  private gemAt(coord: Coord): string {
    return this.gemVisual(this.controller.currentState.board[coord.row][coord.col]).symbol;
  }

  private gemSymbol(gem: string): string {
    return GEM_TYPES.includes(gem as GemType) ? this.gemVisual(gem as GemType).symbol : gem;
  }

  private syncTurnTimer(): void {
    if (this.controller.currentState.phase !== 'PLAYER_READY' || this.controller.isLocked) {
      this.stopTurnTimer();
      this.setPlayerControlsEnabled(false);
      return;
    }
    this.stopTurnTimer();
    this.remainingSeconds = DEFAULT_BATTLE_CONFIG.playerTurnSeconds;
    this.updateCountdownLabel();
    this.setPlayerControlsEnabled(true);
    this.turnTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (!this.canPlayerAct()) return;
        this.remainingSeconds -= 1;
        this.updateCountdownLabel();
        if (this.remainingSeconds <= 0) void this.dispatchTimeout();
      },
    });
  }

  private stopTurnTimer(): void {
    this.turnTimer?.remove(false);
    this.turnTimer = undefined;
  }

  private updateCountdownLabel(): void {
    const color = this.remainingSeconds <= 3 ? '#ff7a80' : '#f3c64f';
    this.countdownLabel?.setColor(color).setText(`Thời gian: ${Math.max(0, this.remainingSeconds)}s`);
  }

  private showMonsterMove(from: Coord, to: Coord): void {
    this.positionMarker(this.monsterMoveFrom, from);
    this.positionMarker(this.monsterMoveTo, to);
  }

  private hideMonsterMove(): void {
    this.monsterMoveFrom?.setVisible(false);
    this.monsterMoveTo?.setVisible(false);
  }

  private positionMarker(marker: Phaser.GameObjects.Rectangle | undefined, coord: Coord): void {
    marker?.setPosition(
      BOARD_LEFT + coord.col * CELL_SIZE + CELL_SIZE / 2,
      BOARD_TOP + coord.row * CELL_SIZE + CELL_SIZE / 2,
    ).setVisible(true);
  }

  private coordFromPayload(value: unknown): Coord | undefined {
    if (typeof value !== 'object' || value === null) return undefined;
    const coord = value as { row?: unknown; col?: unknown };
    return typeof coord.row === 'number' && typeof coord.col === 'number'
      ? { row: coord.row, col: coord.col }
      : undefined;
  }

  private swapRejectedText(reason: string): string {
    if (reason === 'not-adjacent') return 'Chỉ được đổi hai ngọc kề nhau';
    if (reason === 'outside-board') return 'Ngọc đã chọn nằm ngoài bàn';
    if (reason === 'phase-locked') return 'Đang xử lý lượt trước';
    return 'Hai ngọc này chưa tạo nhóm 3 — chưa mất lượt';
  }

  private canPlayerAct(): boolean {
    return !this.controller.isLocked && this.controller.currentState.phase === 'PLAYER_READY';
  }

  private setPlayerControlsEnabled(
    enabled: boolean,
    skillReady = this.controller.currentState.player.energy >= DEFAULT_BATTLE_CONFIG.energyCap,
  ): void {
    if (this.skillButton?.input) {
      this.skillButton.input.enabled = enabled && skillReady;
    }
    if (this.abandonButton?.input) {
      this.abandonButton.input.enabled = enabled;
    }
  }

  private floatNumber(text: string, x: number, y: number, color: string): void {
    const popup = this.add
      .text(x, y, text, { color, fontSize: '16px', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.tweens.add({ targets: popup, y: y - 30, alpha: 0, duration: 550, onComplete: () => popup.destroy() });
  }

  private cellFromPoint(x: number, y: number): Coord | undefined {
    const col = Math.floor((x - BOARD_LEFT) / CELL_SIZE);
    const row = Math.floor((y - BOARD_TOP) / CELL_SIZE);
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return undefined;
    return { row, col };
  }

  private renderSelection(): void {
    if (!this.selectedCell) {
      this.selection?.setVisible(false);
      this.selectionRing?.setVisible(false);
      return;
    }
    const x = BOARD_LEFT + this.selectedCell.col * CELL_SIZE + CELL_SIZE / 2;
    const y = BOARD_TOP + this.selectedCell.row * CELL_SIZE + CELL_SIZE / 2;
    this.selection?.setPosition(x, y).setVisible(!this.selectionRing);
    this.selectionRing?.setPosition(x, y).setVisible(true);
  }

  private spawnMatchBurst(coords: readonly Coord[]): void {
    if (coords.length < 3) return;
    const key = coords.length >= 5
      ? VFX_SHEET_KEYS.match5
      : coords.length === 4
        ? VFX_SHEET_KEYS.match4
        : VFX_SHEET_KEYS.match3;
    if (coords.length >= 5) {
      const center = coords.reduce(
        (result, coord) => ({ row: result.row + coord.row, col: result.col + coord.col }),
        { row: 0, col: 0 },
      );
      this.spawnVfx(
        key,
        BOARD_LEFT + (center.col / coords.length + 0.5) * CELL_SIZE,
        BOARD_TOP + (center.row / coords.length + 0.5) * CELL_SIZE,
        84,
      );
      return;
    }
    for (const coord of coords) {
      this.spawnVfx(
        key,
        BOARD_LEFT + coord.col * CELL_SIZE + CELL_SIZE / 2,
        BOARD_TOP + coord.row * CELL_SIZE + CELL_SIZE / 2,
        62,
      );
    }
  }

  private spawnRefillImpacts(previous: Board, next: Board): void {
    let spawned = 0;
    for (let row = 0; row < BOARD_SIZE && spawned < 12; row += 1) {
      for (let col = 0; col < BOARD_SIZE && spawned < 12; col += 1) {
        if (previous[row][col] === next[row][col]) continue;
        this.spawnVfx(
          VFX_SHEET_KEYS.impact,
          BOARD_LEFT + col * CELL_SIZE + CELL_SIZE / 2,
          BOARD_TOP + row * CELL_SIZE + CELL_SIZE / 2,
          50,
          13,
        );
        spawned += 1;
      }
    }
  }

  private coordsFromPayload(value: unknown): Coord[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((entry) => this.coordFromPayload(entry))
      .filter((coord): coord is Coord => coord !== undefined);
  }

  private durationForEvent(event: GameEvent): number {
    switch (event.type) {
      case 'SWAP_STARTED': return 160;
      case 'MATCH_FOUND': return 180;
      case 'GEMS_CLEARED': return 520;
      case 'DAMAGE_APPLIED':
      case 'HEAL_APPLIED': return 360;
      case 'GEMS_FALLING': return 220;
      case 'GEMS_REFILLED': return 140;
      case 'MONSTER_ATTACKED': return 1000;
      case 'MONSTER_GUARDED': return 260;
      case 'MONSTER_THINKING': return Number(event.payload['seconds'] ?? 1) * 1000;
      case 'MONSTER_MOVE_SELECTED': return 500;
      case 'MONSTER_SWAP_STARTED': return 220;
      case 'MONSTER_SWAP_RESOLVED': return 100;
      case 'TURN_TIMED_OUT': return 500;
      case 'BATTLE_WON':
      case 'BATTLE_LOST':
      case 'BATTLE_ABANDONED': return event.type === 'BATTLE_WON' ? 1000 : 500;
      default: return 80;
    }
  }

  private wait(duration: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(duration, resolve));
  }

  private isBoard(value: unknown): value is Board {
    return (
      Array.isArray(value) &&
      value.length === BOARD_SIZE &&
      value.every((row) => Array.isArray(row) && row.length === BOARD_SIZE && row.every((gem) => GEM_TYPES.includes(gem)))
    );
  }

  private cleanup(): void {
    this.input.off('pointerdown', this.onPointerDown, this);
    this.input.off('pointerup', this.onPointerUp, this);
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.controller?.attachEventPlayer(undefined);
    this.stopTurnTimer();
    this.hideMonsterMove();
    this.selectionRing?.destroy();
    this.selectionRing = undefined;
    for (const fx of this.vfxSprites) fx.destroy();
    this.vfxSprites.clear();
    this.gemSprites.clear();
  }
}
