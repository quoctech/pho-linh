import { describe, expect, it } from 'vitest';
import { createBattleState, resolveBattleAction } from '../battle';
import { MONSTER_DATA } from '../game-data';
import { monsterDodgeChance, resolveMonsterSkill, selectMonsterSkill } from './monster-skills';
import type { BattleState, GameEvent, GemType, MonsterSkillData } from '../types';

// Cùng bàn nền với battle-v2.spec: swap (0,0)↔(0,1) tạo đúng một match ở hàng 0.
const BASE_ROWS: readonly (readonly GemType[])[] = [
  ['attack', 'heal', 'attack', 'attack', 'shield', 'energy'],
  ['heal', 'shield', 'energy', 'poison', 'heal', 'shield'],
  ['energy', 'poison', 'heal', 'shield', 'energy', 'poison'],
  ['shield', 'energy', 'poison', 'heal', 'shield', 'energy'],
  ['poison', 'heal', 'shield', 'energy', 'poison', 'heal'],
  ['heal', 'attack', 'energy', 'poison', 'shield', 'attack'],
];

function setup(
  monsterId: string,
  monster: Partial<BattleState['monster']> = {},
  player: Partial<BattleState['player']> = {},
  topRow?: readonly GemType[],
  seed = 41,
): BattleState {
  const initial = createBattleState(seed, monsterId, `skill-${monsterId}-${seed}`);
  const board: GemType[][] = BASE_ROWS.map((row) => [...row]);
  if (topRow) board[0] = [...topRow];
  return {
    ...initial,
    board: topRow ? board : initial.board,
    monster: { ...initial.monster, ...monster },
    player: { ...initial.player, ...player },
  };
}

function skill(monsterId: string, skillId: string): MonsterSkillData {
  return MONSTER_DATA.definitions[monsterId].skills!.find((entry) => entry.id === skillId)!;
}

function cast(state: BattleState, monsterSkill: MonsterSkillData) {
  return resolveMonsterSkill({
    state,
    skill: monsterSkill,
    actionId: 'cast',
    startSequence: 0,
    shieldCap: state.monster.shieldCap ?? Math.round(state.monster.maxHp * 0.5),
    createEvent: (sequence, type, payload = {}): GameEvent => ({
      eventId: `cast:${sequence}`, actionId: 'cast', battleId: state.battleId, turn: state.turn, type, payload,
    }),
  });
}

function hpAt(monsterId: string, ratio: number): number {
  return Math.round(MONSTER_DATA.definitions[monsterId].maxHp * ratio);
}

describe('Chọn skill quái theo nộ và ngưỡng HP', () => {
  it('Sương Hồn dùng Sương Mù Xâm Thực khi đủ 100 nộ', () => {
    expect(selectMonsterSkill(setup('mist_blob', { energy: 99 }).monster)).toBeUndefined();
    expect(selectMonsterSkill(setup('mist_blob', { energy: 100 }).monster)?.id).toBe('mist_suong_mu_xam_thuc');
  });

  it('Miêu Đèn dùng Long Miêu Liên Kích từ 100 nộ', () => {
    expect(selectMonsterSkill(setup('lantern_cat', { energy: 99 }).monster)).toBeUndefined();
    expect(selectMonsterSkill(setup('lantern_cat', { energy: 100 }).monster)?.id).toBe('lantern_cat_long_mieu_lien_kich');
  });

  it('Bọ Lá Tre: Trúc Diệp khi HP > 50%, Lục Diệp ưu tiên khi HP < 50%', () => {
    const pick = (ratio: number, energy: number) =>
      selectMonsterSkill(setup('bamboo_mantis', { currentHp: hpAt('bamboo_mantis', ratio), energy }).monster)?.id;
    expect(pick(0.8, 60)).toBe('bamboo_truc_diep_doc_cham');
    expect(pick(0.8, 100)).toBe('bamboo_truc_diep_doc_cham');
    expect(pick(0.4, 100)).toBe('bamboo_luc_diep_an_tung');
    expect(pick(0.4, 60)).toBeUndefined();
  });

  it('Cáo Mây: Bích Vân khi HP > 60%, Vân Sương khi HP < 60%, Vụ Lưu ưu tiên khi HP < 30%', () => {
    const pick = (ratio: number, energy: number) =>
      selectMonsterSkill(setup('cloud_fox_boss', { currentHp: hpAt('cloud_fox_boss', ratio), energy }).monster)?.id;
    expect(pick(0.7, 100)).toBe('cloud_fox_bich_van_bang_bang');
    expect(pick(0.7, 60)).toBeUndefined();
    expect(pick(0.5, 50)).toBe('cloud_fox_van_suong_ao_ao');
    expect(pick(0.25, 60)).toBe('cloud_fox_vu_luu_thuan');
    expect(pick(0.25, 50)).toBe('cloud_fox_van_suong_ao_ao');
  });
});

describe('Hiệu ứng skill quái', () => {
  it('Sương Mù Xâm Thực: không sát thương, né AGI (7.3%) + 35% cho 2 lần kế tiếp', () => {
    const result = cast(setup('mist_blob', { energy: 100 }), skill('mist_blob', 'mist_suong_mu_xam_thuc'));
    expect(result.events.some((e) => e.type === 'DAMAGE_APPLIED')).toBe(false);
    expect(result.state.monster.energy).toBe(0);
    expect(result.state.monster.dodgeBonusCharges).toBe(2);
    expect(monsterDodgeChance(result.state.monster)).toBeCloseTo(150 / 2050 + 0.35);
  });

  it('Sương Mù Xâm Thực: mỗi lần roll né của đòn ngọc đỏ tiêu 1 lần buff', () => {
    const state = setup(
      'mist_blob',
      { dodgeBonus: 0.35, dodgeBonusCharges: 2, currentHp: 999 },
      {},
      ['attack', 'heal', 'attack', 'attack', 'shield', 'energy'],
    );
    const result = resolveBattleAction(state, { kind: 'swap', from: { row: 0, col: 0 }, to: { row: 0, col: 1 }, actionId: 'mist-dodge' });
    const rolls = result.events.filter((e) => (e.type === 'DAMAGE_APPLIED' && e.payload['source'] === 'attack_gems') || e.type === 'MONSTER_DODGED').length;
    const dodged = result.events.find((e) => e.type === 'MONSTER_DODGED');
    if (dodged) expect(dodged.payload['chance']).toBeCloseTo(150 / 2050 + 0.35);
    expect(result.nextState.monster.dodgeBonusCharges).toBe(Math.max(0, 2 - rolls));
  });

  it('Trúc Diệp Độc Châm: 300 + 80% ATK và độc 20% ATK trong 1 lượt', () => {
    const result = cast(setup('bamboo_mantis', { energy: 60 }), skill('bamboo_mantis', 'bamboo_truc_diep_doc_cham'));
    const hit = result.events.find((e) => e.type === 'DAMAGE_APPLIED' && e.payload['target'] === 'player');
    expect(hit?.payload['requested']).toBe(1245); // (300 + 1550 × 0.8) × (1 − 450 / 2350)
    const poison = result.events.find((e) => e.type === 'POISON_APPLIED' && e.payload['target'] === 'player');
    expect(poison?.payload['requested']).toBe(310); // 1550 × 20%
    expect(result.state.player.poisonTurns).toBe(1);
  });

  it('Lục Diệp Ẩn Tung: hồi 5% maxHP ngay + 1 lượt sau, né +35% trong 2 lượt', () => {
    const state = setup('bamboo_mantis', { energy: 100, currentHp: 150 });
    const result = cast(state, skill('bamboo_mantis', 'bamboo_luc_diep_an_tung'));
    expect(result.events.some((e) => e.type === 'DAMAGE_APPLIED')).toBe(false);
    expect(result.state.monster.currentHp).toBe(850); // +700 (5% của 14.000)
    expect(result.state.monster.healTurns).toBe(1);
    expect(result.state.monster.dodgeBonusTurns).toBe(2);
    expect(monsterDodgeChance(result.state.monster)).toBeCloseTo(250 / 2150 + 0.35);

    const next = resolveBattleAction({ ...result.state, monster: { ...result.state.monster, energy: 0 } }, { kind: 'timeout', actionId: 'heal-tick' });
    const tick = next.events.find((e) => e.type === 'HEAL_APPLIED' && e.payload['source'] === 'monster_heal_over_time');
    expect(tick?.payload['amount']).toBe(700);
    expect(next.nextState.monster.healTurns).toBe(0);
    expect(next.nextState.monster.dodgeBonusTurns).toBe(1); // hết giờ vẫn tính là 1 hành động
  });

  it('Bích Vân Băng Băng: 100% ATK, 40% đóng băng nhân vật 1 lượt (deterministic theo RNG)', () => {
    const outcomes = Array.from({ length: 40 }, (_, index) => cast(
      setup('cloud_fox_boss', { energy: 100 }, {}, undefined, index + 1),
      skill('cloud_fox_boss', 'cloud_fox_bich_van_bang_bang'),
    ));
    for (const result of outcomes) {
      expect(result.events.find((e) => e.type === 'DAMAGE_APPLIED')?.payload['requested']).toBe(1698); // 2100 × (1 − 450 / 2350)
      const control = result.events.find((e) => e.type === 'CONTROL_APPLIED')!;
      expect(control.payload['applied']).toBe(Number(control.payload['roll']) < 40);
      expect(result.state.playerSkipTurns).toBe(control.payload['applied'] ? 1 : 0);
      expect(result.state.playerSkipEffect).toBe(control.payload['applied'] ? 'freeze' : undefined);
    }
    expect(outcomes.some((result) => result.state.playerSkipEffect === 'freeze')).toBe(true);
    expect(outcomes.some((result) => result.state.playerSkipEffect === undefined)).toBe(true);
  });

  it('Bích Vân Băng Băng: nhân vật bị đóng băng mất lượt với effect freeze', () => {
    const frozen = Array.from({ length: 40 }, (_, index) => resolveBattleAction(
      setup('cloud_fox_boss', { energy: 100, currentHp: hpAt('cloud_fox_boss', 1) }, {}, undefined, index + 1),
      { kind: 'timeout', actionId: `fox-freeze-${index}` },
    )).find((result) => result.events.some((e) => e.type === 'CONTROL_APPLIED' && e.payload['applied'] === true));
    expect(frozen).toBeDefined();
    const skipped = frozen!.events.find((e) => e.type === 'PLAYER_TURN_SKIPPED');
    expect(skipped?.payload['effect']).toBe('freeze');
    expect(frozen!.nextState.playerSkipTurns).toBe(0);
    expect(frozen!.nextState.playerSkipEffect).toBeUndefined();
  });

  it('Thổ miễn khống chế: Bích Vân trúng nhưng không đóng băng', () => {
    const result = Array.from({ length: 40 }, (_, index) => cast(
      setup('cloud_fox_boss', { energy: 100 }, { controlImmunityTurns: 2 }, undefined, index + 1),
      skill('cloud_fox_boss', 'cloud_fox_bich_van_bang_bang'),
    )).find((candidate) => candidate.events.some((e) => e.type === 'CONTROL_APPLIED' && e.payload['resisted'] === true));
    expect(result?.state.playerSkipTurns).toBe(0);
  });

  it('Vân Sương Ảo Ảo: +30% né trong 2 lượt, không sát thương', () => {
    const result = cast(setup('cloud_fox_boss', { energy: 50 }), skill('cloud_fox_boss', 'cloud_fox_van_suong_ao_ao'));
    expect(result.events.some((e) => e.type === 'DAMAGE_APPLIED')).toBe(false);
    expect(result.state.monster.dodgeBonusTurns).toBe(2);
    expect(monsterDodgeChance(result.state.monster)).toBeCloseTo(380 / 2280 + 0.3);
  });

  it('Vụ Lưu Thuẫn: khiên sương 1.800 và giảm 40% hồi máu của nhân vật đúng 1 hành động', () => {
    const result = cast(setup('cloud_fox_boss', { energy: 60 }), skill('cloud_fox_boss', 'cloud_fox_vu_luu_thuan'));
    expect(result.state.monster.shield).toBe(1800);
    expect(result.state.player.healReduction).toBe(0.4);
    expect(result.state.player.healReductionTurns).toBe(1);

    const healRow: GemType[] = ['heal', 'attack', 'heal', 'heal', 'shield', 'energy'];
    const healState = setup('cloud_fox_boss', { currentHp: 999, maxHp: 999 }, { currentHp: 100, healReduction: 0.4, healReductionTurns: 1 }, healRow);
    const healed = resolveBattleAction(healState, { kind: 'swap', from: { row: 0, col: 0 }, to: { row: 0, col: 1 }, actionId: 'anti-heal' });
    const heal = healed.events.find((e) => e.type === 'HEAL_APPLIED' && e.payload['target'] === 'player');
    expect(heal?.payload['requested']).toBe(567); // 10.500 × 3% × 3 × (1 − 40%)
    expect(healed.nextState.player.healReductionTurns).toBe(0);
    expect(healed.nextState.player.healReduction).toBe(0);
  });

  it('Thiêu đốt của quái có thể hạ gục nhân vật ở đầu lượt quái', () => {
    const result = resolveBattleAction(
      setup('lantern_cat', { energy: 0 }, { currentHp: 10, burningPotency: 30, burningTurns: 1 }),
      { kind: 'timeout', actionId: 'burn-ko' },
    );
    expect(result.nextState.phase).toBe('DEFEAT');
    expect(result.nextState.terminalReason).toBe('player_defeated_by_burning');
  });

  it('báo trước skill khi quái đủ nộ và cùng seed cho cùng event log', () => {
    const state = setup('mist_blob', { energy: 100, nextAction: 'basic' });
    const a = resolveBattleAction(state, { kind: 'timeout', actionId: 'replay' });
    const b = resolveBattleAction(state, { kind: 'timeout', actionId: 'replay' });
    expect(a.events).toEqual(b.events);
    expect(a.events.some((e) => e.type === 'MONSTER_SKILL_USED' && e.payload['skillId'] === 'mist_suong_mu_xam_thuc')).toBe(true);

    const ready = resolveBattleAction(setup('lantern_cat', { energy: 95, currentHp: 999 }, {}, undefined, 7), { kind: 'timeout', actionId: 'ready' });
    const telegraph = [...ready.events].reverse().find((e) => e.type === 'MONSTER_TELEGRAPH');
    if (ready.nextState.monster.energy >= 80) {
      expect(telegraph?.payload['action']).toBe('skill');
      expect(String(telegraph?.payload['label'])).toContain('Long Miêu Liên Kích');
    }
  });
});
