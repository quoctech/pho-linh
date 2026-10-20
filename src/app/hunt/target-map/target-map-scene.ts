import Phaser from 'phaser';
import {
  preloadTargetMapAssets,
  targetMapDataFromCache,
  TARGET_MAP_MONSTER_PLACEMENTS,
  targetMapMonsterDisplaySize,
  targetMapMonsterIdleFrameKey,
  targetMapMonsterImageKey,
  targetMapMonsterInfo,
  targetMapThemeColor,
  type TargetMapData,
  type TargetMapMonsterPlacement,
  type TargetMapNode,
  type TargetMapSceneConfig,
} from './target-map-assets';

const MAP_WIDTH = 941;
const MAP_HEIGHT = 1672;
const TEXT_COLOR = '#fff8e8';
const MUTED_COLOR = '#c7bedc';
const LONG_PRESS_MS = 600;
const MOVE_CANCEL_DISTANCE = 12;
const GLOW_NODE_IDS = new Set(['stage_02', 'stage_03', 'stage_04', 'stage_05']);
const MONSTER_VISUAL_OFFSETS: Readonly<Record<string, { readonly x: number; readonly y: number }>> = {
  // These two frames have taller, lower-weighted silhouettes; move their
  // visual center down so the artwork sits on the painted platform.
  mist_blob: { x: -4, y: -11 },
  lantern_cat: { x: -4, y: -6 },
  bamboo_mantis: { x: -4, y: -6 },
  cloud_fox_boss: { x: -4, y: 4 },
};

export class TargetMapScene extends Phaser.Scene {
  private config?: TargetMapSceneConfig;
  private mapData?: TargetMapData;
  private readonly nodeObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly panelObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly longPressTimers = new Set<Phaser.Time.TimerEvent>();

  constructor() { super({ key: 'TargetMapScene' }); }

  preload(): void {
    this.config = this.registry.get('targetMapConfig') as TargetMapSceneConfig | undefined;
    preloadTargetMapAssets(this);
  }

  create(): void {
    this.mapData = targetMapDataFromCache(this);
    this.cameras.main.setOrigin(0, 0).setScroll(0, 0).setRoundPixels(true);
    const background = this.add.image(0, 0, 'pho-linh-target-map').setOrigin(0, 0).setDepth(0);
    background.setDisplaySize(MAP_WIDTH, MAP_HEIGHT);
    const mistOverlay = this.add.rectangle(0, 0, MAP_WIDTH, MAP_HEIGHT, 0xb5c3df, 0.16)
      .setOrigin(0).setDepth(1);
    this.nodeObjects.push(mistOverlay);
    this.add.text(48, 42, 'CHỌN BOSS', {
      color: TEXT_COLOR, fontFamily: 'sans-serif', fontSize: '30px', fontStyle: 'bold', stroke: '#171426', strokeThickness: 8,
    }).setDepth(20);
    this.add.text(48, 80, 'Chạm nhanh để bắt đầu · Ấn giữ để xem thông tin', {
      color: MUTED_COLOR, fontFamily: 'sans-serif', fontSize: '18px', stroke: '#171426', strokeThickness: 5,
    }).setDepth(20);

    const placementsByNode = new Map<string, TargetMapMonsterPlacement[]>();
    for (const placement of TARGET_MAP_MONSTER_PLACEMENTS) {
      const list = placementsByNode.get(placement.nodeId) ?? [];
      list.push(placement);
      placementsByNode.set(placement.nodeId, list);
    }
    for (const node of this.mapData.nodes) this.renderNode(node, placementsByNode.get(node.id) ?? []);
    this.config?.onReady?.();
  }

  shutdown(): void {
    this.longPressTimers.forEach((timer) => timer.remove(false));
    this.longPressTimers.clear();
    this.closeMonsterInfo();
    this.nodeObjects.splice(0).forEach((object) => object.destroy());
  }

  private renderNode(node: TargetMapNode, placements: readonly TargetMapMonsterPlacement[]): void {
    if (GLOW_NODE_IDS.has(node.id)) {
      const nodeGlow = this.add.circle(node.x, node.y, node.platformRadius + 18, targetMapThemeColor(node.theme), 1)
        .setAlpha(0.2).setBlendMode(Phaser.BlendModes.ADD).setDepth(node.zIndex);
      this.tweens.add({
        targets: nodeGlow,
        alpha: { from: 0.14, to: 0.32 },
        scale: { from: 0.96, to: 1.04 },
        duration: 1600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.nodeObjects.push(nodeGlow);
    }
    if (!placements.length) {
      const nodeColor = targetMapThemeColor(node.theme);
      const platform = this.add.circle(node.x, node.y, node.platformRadius - 8, nodeColor, 0.06)
        .setStrokeStyle(5, nodeColor, 0.45).setDepth(node.zIndex + 1);
      this.nodeObjects.push(platform);
    }
    const label = this.add.text(node.x + node.labelOffset.x, node.y + node.labelOffset.y, node.name, {
      color: placements.length ? TEXT_COLOR : MUTED_COLOR, fontFamily: 'sans-serif', fontSize: '22px', fontStyle: 'bold',
      stroke: '#171426', strokeThickness: 6, align: 'center',
    }).setOrigin(0.5).setDepth(node.zIndex + 4);
    this.nodeObjects.push(label);
    if (!placements.length) {
      const emptyLabel = this.add.text(node.x, node.y + 42, 'Đang mở rộng', {
        color: MUTED_COLOR, fontFamily: 'sans-serif', fontSize: '16px', stroke: '#171426', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(node.zIndex + 4);
      this.nodeObjects.push(emptyLabel);
      return;
    }
    const offset = placements.length > 1 ? 38 : 0;
    placements.forEach((placement, index) => this.renderMonster(node, placement, (index - (placements.length - 1) / 2) * offset));
  }

  private renderMonster(node: TargetMapNode, placement: TargetMapMonsterPlacement, xOffset: number): void {
    const unlocked = this.config?.unlockedMonsterIds.has(placement.monsterId) ?? false;
    const x = node.x + xOffset;
    const y = node.y;
    const animationKey = `${targetMapMonsterImageKey(placement.monsterId)}-idle`;
    if (!this.anims.exists(animationKey)) {
      this.anims.create({
        key: animationKey,
        frames: Array.from({ length: 6 }, (_, index) => ({ key: targetMapMonsterIdleFrameKey(placement.monsterId, index + 1) })),
        frameRate: 7,
        repeat: -1,
      });
    }
    const texture = this.textures.get(targetMapMonsterIdleFrameKey(placement.monsterId, 1));
    const source = texture.getSourceImage() as { width?: number; height?: number };
    const size = targetMapMonsterDisplaySize(source.width ?? 1, source.height ?? 1, 142, 148);
    const visualOffset = MONSTER_VISUAL_OFFSETS[placement.monsterId] ?? { x: -4, y: 0 };
    const image = this.add.sprite(x + visualOffset.x, y + visualOffset.y, targetMapMonsterIdleFrameKey(placement.monsterId, 1))
      .setDisplaySize(size.width, size.height)
      .setFlipX(placement.monsterId === 'bamboo_mantis' || placement.monsterId === 'mist_blob')
      .setAlpha(unlocked ? 1 : 0.48).setDepth(node.zIndex + 4);
    image.play(animationKey);
    this.nodeObjects.push(image);
    const monster = this.config?.monsters.find((entry) => entry.id === placement.monsterId);
    const name = this.add.text(x, y + 92, monster?.name ?? placement.monsterId, {
      color: unlocked ? TEXT_COLOR : MUTED_COLOR, fontFamily: 'sans-serif', fontSize: '17px', fontStyle: 'bold',
      stroke: '#171426', strokeThickness: 5, align: 'center',
    }).setOrigin(0.5).setDepth(node.zIndex + 5);
    this.nodeObjects.push(name);
    const hitZone = this.add.zone(x, y, 150, 150).setOrigin(0.5).setDepth(node.zIndex + 8);
    hitZone.setInteractive({ useHandCursor: unlocked });
    this.bindMonsterInput(hitZone, placement.monsterId, unlocked);
    this.nodeObjects.push(hitZone);
  }

  private bindMonsterInput(hitZone: Phaser.GameObjects.Zone, monsterId: string, unlocked: boolean): void {
    let timer: Phaser.Time.TimerEvent | undefined;
    let startX = 0;
    let startY = 0;
    let longPressHandled = false;
    const cancel = (): void => {
      if (timer) {
        timer.remove(false);
        this.longPressTimers.delete(timer);
        timer = undefined;
      }
    };
    hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!unlocked) return;
      startX = pointer.worldX;
      startY = pointer.worldY;
      longPressHandled = false;
      timer = this.time.delayedCall(LONG_PRESS_MS, () => {
        timer = undefined;
        longPressHandled = true;
        this.config?.onMonsterInfoOpened?.(monsterId);
        this.openMonsterInfo(monsterId);
      });
      this.longPressTimers.add(timer);
    });
    hitZone.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!timer) return;
      if (Math.hypot(pointer.worldX - startX, pointer.worldY - startY) > MOVE_CANCEL_DISTANCE) cancel();
    });
    hitZone.on('pointerup', () => {
      const wasLongPress = longPressHandled;
      cancel();
      if (unlocked && !wasLongPress) this.config?.onMonsterSelected(monsterId);
    });
    hitZone.on('pointerupoutside', cancel);
    hitZone.on('pointerout', cancel);
    hitZone.on('pointercancel', cancel);
  }

  private openMonsterInfo(monsterId: string): void {
    this.closeMonsterInfo();
    const monster = this.config?.monsters.find((entry) => entry.id === monsterId);
    const info = targetMapMonsterInfo(monsterId);
    if (!monster || !info) return;
    const width = Math.min(760, MAP_WIDTH - 48);
    const height = Math.min(730, MAP_HEIGHT - 180);
    const left = (MAP_WIDTH - width) / 2;
    const top = Math.max(96, (MAP_HEIGHT - height) / 2);
    const color = targetMapThemeColor(TARGET_MAP_MONSTER_PLACEMENTS.find((p) => p.monsterId === monsterId)?.theme ?? 'am');
    const blocker = this.add.rectangle(0, 0, MAP_WIDTH, MAP_HEIGHT, 0x080713, 0.62).setOrigin(0).setDepth(90).setInteractive();
    blocker.on('pointerdown', () => this.closeMonsterInfo());
    const panel = this.add.rectangle(left, top, width, height, 0x171426, 0.98).setOrigin(0).setStrokeStyle(5, color, 1).setDepth(91).setInteractive();
    panel.on(
      'pointerdown',
      (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: { stopPropagation?: () => void }) => event.stopPropagation?.(),
    );
    this.panelObjects.push(blocker, panel);
    const title = this.add.text(left + 28, top + 22, monster.name, {
      color: TEXT_COLOR, fontFamily: 'sans-serif', fontSize: width < 600 ? '28px' : '34px', fontStyle: 'bold',
    }).setDepth(92);
    const subtitle = this.add.text(left + 30, top + 68, `Hệ ${info.elementLabel}  ·  Cấp ${monster.level}`, {
      color: Phaser.Display.Color.IntegerToColor(color).rgba, fontFamily: 'sans-serif', fontSize: '20px',
    }).setDepth(92);
    this.panelObjects.push(title, subtitle);
    const statY = top + 116;
    const statText = [`HP tối đa: ${monster.maxHp}`, `Công: ${monster.attack}`, `Thủ: ${monster.defense}`, `Khiên tối đa: ${monster.shieldCap ?? '—'}`];
    statText.forEach((text, index) => {
      const stat = this.add.text(left + 30 + (index % 2) * (width / 2), statY + Math.floor(index / 2) * 34, text, {
        color: TEXT_COLOR, fontFamily: 'sans-serif', fontSize: width < 600 ? '18px' : '21px',
      }).setDepth(92);
      this.panelObjects.push(stat);
    });
    const skillTitle = this.add.text(left + 30, statY + 86, 'KỸ NĂNG', {
      color: MUTED_COLOR, fontFamily: 'sans-serif', fontSize: '18px', fontStyle: 'bold',
    }).setDepth(92);
    this.panelObjects.push(skillTitle);
    let skillY = statY + 120;
    for (const skill of info.skills) {
      const skillName = this.add.text(left + 30, skillY, `◆ ${skill.name}`, {
        color: TEXT_COLOR, fontFamily: 'sans-serif', fontSize: width < 600 ? '18px' : '21px', fontStyle: 'bold', wordWrap: { width: width - 60 },
      }).setDepth(92);
      const description = this.add.text(left + 48, skillY + 30, skill.description, {
        color: MUTED_COLOR, fontFamily: 'sans-serif', fontSize: width < 600 ? '15px' : '17px', lineSpacing: 4, wordWrap: { width: width - 78 },
      }).setDepth(92);
      this.panelObjects.push(skillName, description);
      // Mô tả skill lấy từ data nên dài ngắn khác nhau: xếp theo chiều cao thật.
      skillY += Math.max(82, 30 + description.height + 14);
    }
    const close = this.add.text(left + width - 34, top + 18, '×', {
      color: TEXT_COLOR, fontFamily: 'sans-serif', fontSize: '38px', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(93).setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.closeMonsterInfo());
    this.panelObjects.push(close);
  }

  private closeMonsterInfo(): void {
    this.panelObjects.splice(0).forEach((object) => object.destroy());
  }
}
