import { COMBAT_DATA, type ElementCategory, type ElementRelationship } from './game-data';
import type { ElementId } from './types';

/**
 * Ngũ Hành (Balance V2) — quan hệ tương khắc giữa hệ nhân vật và hệ quái.
 *
 * Vòng tương khắc nằm trong `combat.json` (`elements.cycle`): mỗi phần tử KHẮC
 * phần tử đứng ngay sau nó, vòng lại đầu danh sách. Hàm thuần, không side-effect;
 * mọi con số modifier đều đọc từ game-data để giữ nguyên tắc config-first.
 */

/** Trả về quan hệ hệ giữa nhân vật và quái để chọn modifier hiệu quả ngọc. */
export function elementRelationship(player: ElementId, monster: ElementId): ElementRelationship {
  const cycle = COMBAT_DATA.elements.cycle;
  const playerIndex = cycle.indexOf(player);
  const monsterIndex = cycle.indexOf(monster);
  // Hệ không nằm trong vòng (dữ liệu lỗi) => coi như hòa để không nhân sai.
  if (playerIndex < 0 || monsterIndex < 0) return 'neutral';
  const playerCounters = cycle[(playerIndex + 1) % cycle.length] === monster;
  const monsterCounters = cycle[(monsterIndex + 1) % cycle.length] === player;
  if (playerCounters) return 'counter';
  if (monsterCounters) return 'countered';
  return 'neutral';
}

/**
 * Hệ số hiệu quả ngọc theo quan hệ hệ và nhóm hiệu ứng.
 * - `damage`: ngọc đỏ/tím (sát thương/độc của nhân vật).
 * - `support`: ngọc xanh lá/xanh dương (hồi máu/khiên của nhân vật).
 * - `energy`: ngọc vàng (nộ của nhân vật).
 */
export function elementalModifier(relationship: ElementRelationship, category: ElementCategory): number {
  return COMBAT_DATA.elements.modifier[category][relationship];
}
