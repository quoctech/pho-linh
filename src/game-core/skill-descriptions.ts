import type { PlayerSkillData } from './game-data';

const percent = (ratio: number) => Math.round(ratio * 100);

/**
 * Mô tả hiệu ứng kỹ năng nhân vật sinh trực tiếp từ config trong character.json,
 * dùng chung cho tooltip màn PK và màn Thông số để chữ luôn khớp số liệu thật.
 * `defense` (DEF nhân vật) chỉ cần khi muốn hiện lượng khiên cụ thể.
 */
export function describePlayerSkillEffects(
  config: PlayerSkillData,
  defense?: number,
  options: { readonly includeDamage?: boolean } = {},
): string[] {
  const effects: string[] = [];
  if (options.includeDamage === false) {
    // Caller tự hiện dòng sát thương (vd tooltip có số thật theo trạng thái trận).
  } else if (config.fixedDamage !== undefined) {
    effects.push(`Trừ thẳng ${config.fixedDamage.toLocaleString('vi-VN')} Khiên (hết Khiên → trừ HP)`);
  } else if (config.attackMultiplier !== undefined) {
    const hits = config.hitCount ?? 1;
    effects.push(hits > 1
      ? `${hits} đòn × ${percent(config.attackMultiplier)}% ATK (tổng ${percent(config.attackMultiplier * hits)}% ATK)`
      : `Gây ${percent(config.attackMultiplier)}% ATK${config.bypassShield ? ' · xuyên Khiên' : ' · bị Khiên chặn trước'}`);
  }
  if (config.energySteal) effects.push(`Hút ${config.energySteal} Năng lượng của mục tiêu`);
  if (config.poisonAtkFactor) effects.push(`Độc ${percent(config.poisonAtkFactor)}% ATK/lượt · ${config.poisonTurns ?? 3} lượt`);
  if (config.controlEffect) {
    const label = config.controlEffect === 'freeze' ? 'Đóng băng' : 'Choáng';
    const chance = config.controlChance ?? 0;
    effects.push(`${chance < 1 ? `${percent(chance)}% ` : ''}${label} ${config.controlTurns ?? 1} lượt (bỏ lượt hành động)`);
  }
  if (config.damageTakenBonus) {
    effects.push(`Thiêu đốt: mục tiêu nhận thêm ${percent(config.damageTakenBonus)}% sát thương · ${config.damageTakenBonusTurns ?? 2} lượt`);
  }
  if (config.defenseReduction) effects.push(`Giảm ${percent(config.defenseReduction)}% DEF đối thủ · ${config.defenseReductionTurns ?? 2} lượt`);
  if (config.selfShieldDefenseMultiplier) {
    const shield = defense !== undefined ? ` (${Math.round(defense * config.selfShieldDefenseMultiplier).toLocaleString('vi-VN')})` : '';
    effects.push(`Tạo Khiên ${percent(config.selfShieldDefenseMultiplier)}% DEF${shield}`);
  }
  if (config.selfDamageReduction) effects.push(`Giảm ${percent(config.selfDamageReduction)}% sát thương nhận · ${config.selfDamageReductionTurns ?? 2} lượt`);
  if (config.controlImmunityTurns) effects.push('Miễn khống chế');
  if (config.reflectDamageRatio) effects.push(`Phản ${percent(config.reflectDamageRatio)}% sát thương kẻ địch gây ra`);
  return effects;
}
