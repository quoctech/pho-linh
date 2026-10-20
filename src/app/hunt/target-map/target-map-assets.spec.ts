import coords from '../../../assets/map/target-select/pho_linh_target_map_coords.json';
import {
  TARGET_MAP_MONSTER_PLACEMENTS,
  TARGET_MAP_THEME_COLORS,
  targetMapMonsterDisplaySize,
  targetMapMonsterInfo,
  targetMapNode,
  targetMapThemeColor,
} from './target-map-assets';

describe('target map assets', () => {
  it('keeps the package node and route contract', () => {
    expect(coords.image.width).toBe(941);
    expect(coords.image.height).toBe(1672);
    expect(coords.nodes).toHaveLength(6);
    expect(coords.routes).toHaveLength(7);
    expect(coords.nodes.every((node) => node.normalizedX >= 0 && node.normalizedX <= 1)).toBe(true);
    expect(coords.nodes.every((node) => node.normalizedY >= 0 && node.normalizedY <= 1)).toBe(true);
  });

  it('maps monsters to their current element themes', () => {
    expect(TARGET_MAP_MONSTER_PLACEMENTS).toEqual([
      { monsterId: 'mist_blob', nodeId: 'stage_02', element: 'water', theme: 'u_vu' },
      { monsterId: 'lantern_cat', nodeId: 'stage_03', element: 'fire', theme: 'hoa' },
      { monsterId: 'bamboo_mantis', nodeId: 'stage_04', element: 'wood', theme: 'moc' },
      { monsterId: 'cloud_fox_boss', nodeId: 'stage_05', element: 'water', theme: 'thuy' },
    ]);
    expect(new Set(TARGET_MAP_MONSTER_PLACEMENTS.map((placement) => placement.nodeId)).size).toBe(4);
  });

  it('exposes theme colors and node lookup for Phaser rendering', () => {
    expect(targetMapThemeColor('hoa')).toBe(TARGET_MAP_THEME_COLORS.hoa);
    expect(targetMapNode('stage_04')?.theme).toBe('moc');
    expect(targetMapNode('missing')).toBeUndefined();
  });

  it('keeps monster presentation metadata separate from combat definitions', () => {
    expect(targetMapMonsterInfo('mist_blob')?.skills).toHaveLength(1);
    expect(targetMapMonsterInfo('lantern_cat')?.skills[0].name).toBe('Long Miêu Liên Kích');
    expect(targetMapMonsterInfo('bamboo_mantis')?.skills).toHaveLength(2);
    expect(targetMapMonsterInfo('cloud_fox_boss')?.skills).toHaveLength(3);
    expect(targetMapMonsterInfo('missing')).toBeUndefined();
  });

  it('scales idle textures without changing their aspect ratio', () => {
    expect(targetMapMonsterDisplaySize(200, 100, 100, 104)).toEqual({ width: 100, height: 50 });
    expect(targetMapMonsterDisplaySize(100, 200, 100, 104)).toEqual({ width: 52, height: 104 });
  });
});
