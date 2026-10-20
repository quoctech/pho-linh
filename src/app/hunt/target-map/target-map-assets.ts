import Phaser from 'phaser';
import { MONSTER_DATA, type ElementId, type MonsterDefinition } from '../../../game-core';
import targetMapCoords from '../../../assets/map/target-select/pho_linh_target_map_coords.json';

export const TARGET_MAP_IMAGE_KEY = 'pho-linh-target-map';
export const TARGET_MAP_COORDS_KEY = 'pho-linh-target-map-coords';

export type TargetMapTheme = 'kim' | 'u_vu' | 'hoa' | 'moc' | 'thuy' | 'am';

export interface TargetMapNode {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly normalizedX: number;
  readonly normalizedY: number;
  readonly platformRadius: number;
  readonly labelOffset: { readonly x: number; readonly y: number };
  readonly recommendedIconSize: { readonly w: number; readonly h: number };
  readonly theme: TargetMapTheme;
  readonly zIndex: number;
}

export interface TargetMapData {
  readonly image: { readonly file: string; readonly width: number; readonly height: number; readonly format: string };
  readonly nodes: readonly TargetMapNode[];
  readonly routes: readonly (readonly string[])[];
}

export interface TargetMapMonsterPlacement {
  readonly monsterId: MonsterDefinition['id'];
  readonly nodeId: string;
  readonly element: ElementId;
  readonly theme: TargetMapTheme;
}

export interface TargetMapSceneConfig {
  readonly monsters: readonly MonsterDefinition[];
  readonly unlockedMonsterIds: ReadonlySet<string>;
  readonly onMonsterSelected: (monsterId: string) => void;
  readonly onMonsterInfoOpened?: (monsterId: string) => void;
  readonly onReady?: () => void;
}

export interface TargetMapMonsterSkillInfo {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

export interface TargetMapMonsterInfo {
  readonly monsterId: string;
  readonly elementLabel: string;
  readonly skills: readonly TargetMapMonsterSkillInfo[];
}

export const TARGET_MAP_THEME_COLORS: Readonly<Record<TargetMapTheme, number>> = {
  kim: 0xd8e2f3,
  u_vu: 0x9a72d8,
  hoa: 0xf08a67,
  moc: 0x7ecb8b,
  thuy: 0x72b9ec,
  am: 0x7656a8,
};

export const TARGET_MAP_MONSTER_PLACEMENTS: readonly TargetMapMonsterPlacement[] = [
  { monsterId: 'mist_blob', nodeId: 'stage_02', element: 'water', theme: 'u_vu' },
  { monsterId: 'lantern_cat', nodeId: 'stage_03', element: 'fire', theme: 'hoa' },
  { monsterId: 'bamboo_mantis', nodeId: 'stage_04', element: 'wood', theme: 'moc' },
  { monsterId: 'cloud_fox_boss', nodeId: 'stage_05', element: 'water', theme: 'thuy' },
];

const TARGET_MAP_ELEMENT_LABELS: Readonly<Record<string, string>> = {
  mist_blob: 'Thủy',
  lantern_cat: 'Hỏa',
  bamboo_mantis: 'Mộc',
  cloud_fox_boss: 'Thủy',
};

/** Tên và mô tả skill đọc từ monsters.json (skills[].vfxId là id asset của skill). */
function monsterInfoFromData(monsterId: string): TargetMapMonsterInfo | undefined {
  const elementLabel = TARGET_MAP_ELEMENT_LABELS[monsterId];
  const definition = MONSTER_DATA.definitions[monsterId];
  if (!elementLabel || !definition) return undefined;
  return {
    monsterId,
    elementLabel,
    skills: (definition.skills ?? []).map((skill) => ({ id: skill.vfxId, name: skill.name, description: skill.description })),
  };
}

const MONSTER_IDLE_ASSETS: Readonly<Record<string, string>> = {
  mist_blob: 'assets/monsters/mist-dust/frames_webp/01_idle/01_idle_01.webp',
  lantern_cat: 'assets/monsters/mieu-den/frames_webp/01_idle/01_idle_01.webp',
  cloud_fox_boss: 'assets/monsters/cloud-fox/frames_webp/01_idle/01_idle_01.webp',
  bamboo_mantis: 'assets/monsters/bamboo-mantis/frames_webp/01_idle/01_idle_01.webp',
};

export function targetMapNode(nodeId: string): TargetMapNode | undefined {
  return (targetMapCoords.nodes as readonly TargetMapNode[]).find((node) => node.id === nodeId);
}

export function targetMapMonsterImageKey(monsterId: string): string {
  return `target-map-monster-${monsterId}`;
}

export function targetMapMonsterIdleFrameKey(monsterId: string, frame: number): string {
  return `${targetMapMonsterImageKey(monsterId)}-idle-${frame}`;
}

export function targetMapThemeColor(theme: TargetMapTheme): number {
  return TARGET_MAP_THEME_COLORS[theme];
}

export function targetMapMonsterInfo(monsterId: string): TargetMapMonsterInfo | undefined {
  return monsterInfoFromData(monsterId);
}

export function targetMapMonsterDisplaySize(
  textureWidth: number,
  textureHeight: number,
  maxWidth: number,
  maxHeight: number,
): { readonly width: number; readonly height: number } {
  if (textureWidth <= 0 || textureHeight <= 0 || maxWidth <= 0 || maxHeight <= 0) {
    return { width: 0, height: 0 };
  }
  const scale = Math.min(maxWidth / textureWidth, maxHeight / textureHeight);
  return { width: textureWidth * scale, height: textureHeight * scale };
}

export function preloadTargetMapAssets(scene: Phaser.Scene): void {
  if (!scene.textures.exists(TARGET_MAP_IMAGE_KEY)) {
    scene.load.image(TARGET_MAP_IMAGE_KEY, 'assets/map/target-select/pho_linh_target_map.webp');
  }
  if (!scene.cache.json.exists(TARGET_MAP_COORDS_KEY)) {
    scene.load.json(TARGET_MAP_COORDS_KEY, 'assets/map/target-select/pho_linh_target_map_coords.json');
  }
  for (const [monsterId, path] of Object.entries(MONSTER_IDLE_ASSETS)) {
    for (let frame = 1; frame <= 6; frame += 1) {
      const key = targetMapMonsterIdleFrameKey(monsterId, frame);
      if (!scene.textures.exists(key)) scene.load.image(key, path.replace('_01.webp', `_${String(frame).padStart(2, '0')}.webp`));
    }
  }
}

export function targetMapDataFromCache(scene: Phaser.Scene): TargetMapData {
  return scene.cache.json.get(TARGET_MAP_COORDS_KEY) as TargetMapData;
}
