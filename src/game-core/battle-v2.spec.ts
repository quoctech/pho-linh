import {
  CHARACTER_DATA,
  createBattleState,
  createPlayerBattleState,
  equipmentBonuses,
  resolveBattleAction,
  type BattleState,
  type ElementId,
  type GemType,
  type GameEvent,
} from './index';

// Bàn nền không có match sẵn; chỉ hàng 0 được ghi đè để tạo match mong muốn khi
// đổi ô (0,0) ↔ (0,1). Cùng kiểu dựng với battle.spec để kết quả ổn định.
const BASE_ROWS: readonly (readonly GemType[])[] = [
  ['attack', 'heal', 'attack', 'attack', 'shield', 'energy'],
  ['heal', 'shield', 'energy', 'poison', 'heal', 'shield'],
  ['energy', 'poison', 'heal', 'shield', 'energy', 'poison'],
  ['shield', 'energy', 'poison', 'heal', 'shield', 'energy'],
  ['poison', 'heal', 'shield', 'energy', 'poison', 'heal'],
  ['heal', 'attack', 'energy', 'poison', 'shield', 'attack'],
];

interface SetupOptions {
  readonly topRow: readonly GemType[];
  readonly playerElement?: ElementId;
  readonly monsterId?: string;
  readonly monster?: Partial<BattleState['monster']>;
  readonly player?: Partial<BattleState['player']>;
  readonly battle?: Partial<BattleState>;
  readonly seed?: number;
}

function setup(options: SetupOptions): BattleState {
  const seed = options.seed ?? 99;
  const initial = createBattleState(
    seed,
    options.monsterId ?? 'mist_blob',
    `v2-${seed}`,
    undefined,
    createPlayerBattleState({ str: 5, vit: 5, agi: 5, int: 5 }, equipmentBonuses([], {}), options.playerElement ?? 'metal'),
  );
  const board: GemType[][] = BASE_ROWS.map((row) => [...row]);
  board[0] = [...options.topRow];
  return {
    ...initial,
    board,
    monster: { ...initial.monster, currentHp: 999, ...options.monster },
    player: { ...initial.player, ...options.player },
    ...options.battle,
  };
}

function swap(state: BattleState, actionId: string) {
  return resolveBattleAction(state, { kind: 'swap', from: { row: 0, col: 0 }, to: { row: 0, col: 1 }, actionId });
}

function firstEvent(events: readonly GameEvent[], predicate: (event: GameEvent) => boolean): GameEvent | undefined {
  return events.find(predicate);
}

describe('Balance V3 combat core', () => {
  it('resolves every element primary skill through the common player skill flow', () => {
    for (const element of ['metal', 'wood', 'water', 'fire', 'earth'] as const) {
      const state = setup({
        topRow: ['attack', 'heal', 'attack', 'attack', 'shield', 'energy'],
        playerElement: element,
        player: { energy: 100 },
        monster: { currentHp: 999 },
      });
      const elementSkills = CHARACTER_DATA.elementSkills[element];
      for (const [slot, skillId] of [
        ['primary', elementSkills.primarySkillId],
        ['secondary', elementSkills.secondarySkillId],
      ] as const) {
        const result = resolveBattleAction({ ...state, player: { ...state.player, energy: 100 } }, {
          kind: 'skill', skillId, actionId: `${slot}-${element}`,
        });

        const config = slot === 'primary' ? elementSkills.primarySkill : elementSkills.secondarySkill;
        const dealsDamage = config.attackMultiplier !== undefined || config.fixedDamage !== undefined;
        expect(result.accepted, `${element}-${slot}`).toBe(true);
        expect(result.events.some((event) => event.type === 'SKILL_USED' && event.payload['skillId'] === skillId)).toBe(true);
        expect(result.events.some((event) => event.type === 'DAMAGE_APPLIED' && event.payload['source'] === skillId)).toBe(dealsDamage);
      }
    }
  });

  it('KIM — Vạn Kiếm Quy Tông tiêu 60 nộ và bị khiên hấp thụ trước HP', () => {
    const state = setup({
      topRow: ['attack', 'heal', 'attack', 'attack', 'shield', 'energy'],
      playerElement: 'metal',
      player: { energy: 60 },
      monster: { currentHp: 999, shield: 50, defense: 10, baseDefense: 10 },
    });
    const result = resolveBattleAction(state, {
      kind: 'skill', skillId: CHARACTER_DATA.elementSkills['metal'].secondarySkillId, actionId: 'metal-secondary-cost',
    });
    const damage = firstEvent(result.events, (event) => event.type === 'DAMAGE_APPLIED' && event.payload['source'] === 'van_kiem_quy_tong');

    expect(result.accepted).toBe(true);
    expect(damage?.payload['requested']).toBe(20); // 25 ATK × 120% − 10 DEF
    expect(damage?.payload['shieldAbsorbed']).toBe(20);
    expect(damage?.payload['amount']).toBe(0);
    expect(result.events.find((event) => event.type === 'SKILL_USED')?.payload['energySpent']).toBe(60);
  });

  it('KIM — Kim Quang Phá Giáp xuyên khiên và giảm 30% DEF trong 2 lượt', () => {
    const state = setup({
      topRow: ['attack', 'heal', 'attack', 'attack', 'shield', 'energy'],
      playerElement: 'metal',
      player: { energy: 100 },
      monster: { currentHp: 999, shield: 50, defense: 10, baseDefense: 10 },
    });
    const result = resolveBattleAction(state, {
      kind: 'skill', skillId: CHARACTER_DATA.elementSkills['metal'].primarySkillId, actionId: 'metal-primary-effect',
    });
    const damage = firstEvent(result.events, (event) => event.type === 'DAMAGE_APPLIED' && event.payload['source'] === 'kim_quang_pha_giap');

    expect(result.accepted).toBe(true);
    expect(damage?.payload['requested']).toBe(35); // 25 ATK × 180% − 10 DEF
    expect(damage?.payload['shieldAbsorbed']).toBe(0);
    expect(damage?.payload['amount']).toBe(35);
    expect(result.events.some((event) => event.type === 'DEFENSE_REDUCED' && event.payload['turns'] === 2)).toBe(true);
    expect(result.nextState.monster.defense).toBe(7);
    expect(result.nextState.monster.defenseReductionTurns).toBe(2);
  });

  it('tính sát thương ngọc đỏ theo ATK × số ô × 0.4 (quan hệ hòa)', () => {
    // metal vs earth = hòa; dùng bamboo_mantis (không có cơ chế né) với DEF 0.
    const result = swap(
      setup({
        topRow: ['attack', 'heal', 'attack', 'attack', 'shield', 'energy'],
        playerElement: 'metal',
        monsterId: 'bamboo_mantis',
        monster: { element: 'earth', defense: 0, baseDefense: 0 },
      }),
      'v2-dmg-neutral',
    );
    const damage = firstEvent(result.events, (e) => e.type === 'DAMAGE_APPLIED' && e.payload['source'] === 'attack_gems');
    expect(damage?.payload['matchCount']).toBe(3);
    expect(damage?.payload['amount']).toBe(30); // 25 × 3 × 0.4 × 1.0
  });

  it('áp modifier 130% khi khắc và 80% khi bị khắc cho ngọc đỏ', () => {
    const counter = swap(
      setup({
        topRow: ['attack', 'heal', 'attack', 'attack', 'shield', 'energy'],
        playerElement: 'metal',
        monsterId: 'bamboo_mantis',
        monster: { element: 'wood', defense: 0, baseDefense: 0 },
      }),
      'v2-dmg-counter',
    );
    expect(firstEvent(counter.events, (e) => e.type === 'DAMAGE_APPLIED' && e.payload['source'] === 'attack_gems')?.payload['amount']).toBe(39); // 30 × 1.3

    const countered = swap(
      setup({
        topRow: ['attack', 'heal', 'attack', 'attack', 'shield', 'energy'],
        playerElement: 'earth',
        monsterId: 'bamboo_mantis',
        monster: { element: 'wood', defense: 0, baseDefense: 0 },
      }),
      'v2-dmg-countered',
    );
    expect(firstEvent(countered.events, (e) => e.type === 'DAMAGE_APPLIED' && e.payload['source'] === 'attack_gems')?.payload['amount']).toBe(24); // 30 × 0.8
  });

  it('hồi máu = maxHP × 5% × số ô và khiên = DEF × 1.5 × số ô (quan hệ hòa)', () => {
    const heal = swap(
      setup({
        topRow: ['heal', 'attack', 'heal', 'heal', 'shield', 'energy'],
        playerElement: 'metal',
        player: { currentHp: 100 },
      }),
      'v2-heal',
    );
    // metal vs water (Sương Hồn) = hòa. 300 × 0.05 × 3 = 45.
    expect(firstEvent(heal.events, (e) => e.type === 'HEAL_APPLIED' && e.payload['target'] === 'player')?.payload['amount']).toBe(45);

    const shield = swap(
      setup({ topRow: ['shield', 'attack', 'shield', 'shield', 'heal', 'energy'], playerElement: 'metal' }),
      'v2-shield',
    );
    // DEF 10 × 1.5 × 3 = 45.
    expect(firstEvent(shield.events, (e) => e.type === 'SHIELD_GAINED' && e.payload['target'] === 'player')?.payload['amount']).toBe(45);
  });

  it('nạp nộ theo độ dài match (3→15) và áp modifier năng lượng', () => {
    // metal vs water = hòa → 15.
    const neutral = swap(
      setup({ topRow: ['energy', 'attack', 'energy', 'energy', 'heal', 'shield'], playerElement: 'metal' }),
      'v2-energy-neutral',
    );
    expect(firstEvent(neutral.events, (e) => e.type === 'ENERGY_GAINED' && e.payload['target'] === 'player')?.payload['requested']).toBe(15);

    // earth vs water = khắc → 15 × 1.2 = 18.
    const counter = swap(
      setup({ topRow: ['energy', 'attack', 'energy', 'energy', 'heal', 'shield'], playerElement: 'earth' }),
      'v2-energy-counter',
    );
    expect(firstEvent(counter.events, (e) => e.type === 'ENERGY_GAINED' && e.payload['target'] === 'player')?.payload['requested']).toBe(18);
  });

  it('độc theo tầng: mỗi match +1 tầng, mỗi tầng ATK × 0.25, duration 3', () => {
    const result = swap(
      setup({ topRow: ['poison', 'attack', 'poison', 'poison', 'heal', 'shield'], playerElement: 'metal' }),
      'v2-poison',
    );
    const poison = firstEvent(result.events, (e) => e.type === 'POISON_APPLIED' && e.payload['target'] === 'monster');
    expect(poison?.payload['perStack']).toBe(6); // round(25 × 0.25)
    expect(poison?.payload['stacks']).toBe(1);
    expect(poison?.payload['amount']).toBe(6);
    expect(poison?.payload['turns']).toBe(3);
  });

  it('tạo cùng event log cho cùng seed và cùng action (balanceVersion 4)', () => {
    const base = setup({ topRow: ['attack', 'heal', 'attack', 'attack', 'shield', 'energy'], seed: 321 });
    expect(base.balanceVersion).toBe(4);
    const a = swap(base, 'replay');
    const b = swap(base, 'replay');
    expect(a.events).toEqual(b.events);
    expect(a.nextState).toEqual(b.nextState);
  });
});

describe('Balance V3 nội tại nghề', () => {
  it('KIM — streak attack kích hoạt crit +40% damage', () => {
    const result = Array.from({ length: 100 }, (_, index) => swap(setup({
      topRow: ['attack', 'heal', 'attack', 'attack', 'shield', 'energy'],
      playerElement: 'metal', monsterId: 'bamboo_mantis',
      monster: { element: 'earth', defense: 0, baseDefense: 0 },
      player: { attackStreakTargetId: 'bamboo_mantis', attackStreak: 1 }, seed: index + 1,
    }), `kim-crit-${index}`)).find((candidate) => candidate.events.some((event) => event.type === 'DAMAGE_APPLIED' && event.payload['critical'] === true))!;
    const damage = firstEvent(result.events, (e) => e.type === 'DAMAGE_APPLIED' && e.payload['source'] === 'attack_gems');
    expect(damage?.payload['critical']).toBe(true);
    expect(damage?.payload['amount']).toBe(42);
    expect(result.events.some((e) => e.type === 'PASSIVE_TRIGGERED' && e.payload['passiveId'] === 'metal_critical')).toBe(true);
  });

  it('MỘC — hồi HP tăng 40% khi quái đang dính độc', () => {
    const result = swap(setup({
      topRow: ['heal', 'attack', 'heal', 'heal', 'shield', 'energy'],
      playerElement: 'wood', player: { currentHp: 100 },
      monster: { poisonPotency: 6, poisonTurns: 2 },
    }), 'moc-heal');
    expect(firstEvent(result.events, (e) => e.type === 'HEAL_APPLIED' && e.payload['target'] === 'player')?.payload['amount']).toBe(63);
    expect(result.events.some((e) => e.type === 'PASSIVE_TRIGGERED' && e.payload['passiveId'] === 'wood_healing')).toBe(true);
  });

  it('THỦY — từ lần nhận damage thứ ba liên tiếp giảm 25%', () => {
    const result = swap(setup({
      topRow: ['attack', 'heal', 'attack', 'attack', 'shield', 'energy'],
      playerElement: 'water', monsterId: 'mist_blob',
      monster: { nextAction: 'basic' },
      player: { shield: 100 },
      battle: { damageTakenStreak: 2 },
    }), 'thuy-reduction');
    expect(result.events.some((e) => e.type === 'PASSIVE_TRIGGERED' && e.payload['passiveId'] === 'water_damage_reduction')).toBe(true);
    expect(result.events.find((e) => e.type === 'MONSTER_ATTACKED')?.payload['amount']).toBe(37);
  });

  it('HỎA — target đang burning nhận +20 damage và burning được reset', () => {
    const result = swap(setup({
      topRow: ['attack', 'heal', 'attack', 'attack', 'shield', 'energy'],
      playerElement: 'fire', monsterId: 'bamboo_mantis',
      monster: { element: 'earth', defense: 0, baseDefense: 0, burningPotency: 1, burningTurns: 2 },
    }), 'hoa-burning');
    const damage = firstEvent(result.events, (e) => e.type === 'DAMAGE_APPLIED' && e.payload['source'] === 'attack_gems');
    expect(damage?.payload['burningBonus']).toBe(20);
    expect(damage?.payload['amount']).toBe(50);
    expect(result.events.some((e) => e.type === 'BURNING_APPLIED')).toBe(true);
  });

  it('THỔ — khi đang có khiên, incoming damage giảm 10% (giữ nguyên)', () => {
    const result = swap(setup({
      topRow: ['attack', 'heal', 'attack', 'attack', 'shield', 'energy'],
      playerElement: 'earth', monsterId: 'mist_blob',
      monster: { nextAction: 'basic' },
      player: { shield: 100 },
    }), 'tho-resist');
    expect(result.events.some((e) => e.type === 'PASSIVE_TRIGGERED' && e.payload['passiveId'] === 'earth_shield_resistance')).toBe(true);
    expect(result.events.find((e) => e.type === 'MONSTER_ATTACKED')?.payload['amount']).toBe(44);
  });
});

const ATTACK_ROW: readonly GemType[] = ['attack', 'heal', 'attack', 'attack', 'shield', 'energy'];
const POISON_ROW: readonly GemType[] = ['poison', 'attack', 'poison', 'poison', 'heal', 'shield'];

function castSkill(state: BattleState, element: ElementId, slot: 'primary' | 'secondary', actionId: string) {
  const skills = CHARACTER_DATA.elementSkills[element];
  const skillId = slot === 'primary' ? skills.primarySkillId : skills.secondarySkillId;
  return resolveBattleAction(state, { kind: 'skill', skillId, actionId });
}

/** Lượt kế tiếp với cùng bàn cờ dựng sẵn để swap (0,0)↔(0,1) luôn tạo match mong muốn. */
function nextTurn(previous: BattleState, setupState: BattleState, topRow: readonly GemType[] = ATTACK_ROW): BattleState {
  const board = setupState.board.map((row) => [...row]);
  board[0] = [...topRow];
  // Reset chuỗi đánh để nội tại chí mạng Kim không làm số liệu phụ thuộc RNG.
  return { ...previous, board, player: { ...previous.player, attackStreak: 0 } };
}

function skillDamage(events: readonly GameEvent[], skillId: string): GameEvent[] {
  return events.filter((e) => e.type === 'DAMAGE_APPLIED' && e.payload['source'] === skillId);
}

describe('Cân bằng skill hệ (balanceVersion 4)', () => {
  it('KIM — Kim Quang Phá Giáp: DEF -30% kéo dài đúng 2 hành động kế tiếp rồi hồi', () => {
    const state = setup({
      topRow: ATTACK_ROW, playerElement: 'metal', monsterId: 'bamboo_mantis',
      player: { energy: 100 }, monster: { element: 'earth', defense: 10, baseDefense: 10 },
    });
    const cast = castSkill(state, 'metal', 'primary', 'kim-def-cast');
    expect(cast.nextState.monster.defense).toBe(7);
    expect(cast.nextState.monster.defenseReductionTurns).toBe(2);

    const first = swap(nextTurn(cast.nextState, state), 'kim-def-1');
    const firstGem = firstEvent(first.events, (e) => e.type === 'DAMAGE_APPLIED' && e.payload['source'] === 'attack_gems');
    expect(firstGem?.payload['requested']).toBe(23); // 30 − 7 DEF
    expect(first.nextState.monster.defenseReductionTurns).toBe(1);
    expect(first.nextState.monster.defense).toBe(7);

    const second = swap(nextTurn(first.nextState, state), 'kim-def-2');
    expect(second.nextState.monster.defenseReductionTurns).toBe(0);
    expect(second.nextState.monster.defense).toBe(10);
  });

  it('MỘC — Thanh Đằng Trói Hồn: 80% ATK và hút 15 năng lượng quái', () => {
    const state = setup({ topRow: ATTACK_ROW, playerElement: 'wood', player: { energy: 50 }, monster: { energy: 40 } });
    const result = castSkill(state, 'wood', 'primary', 'moc-1');
    expect(skillDamage(result.events, 'thanh_dang_troi_hon')[0]?.payload['requested']).toBe(20); // 25 × 80% − 0 DEF
    expect(firstEvent(result.events, (e) => e.type === 'ENERGY_STOLEN')?.payload['amount']).toBe(15);
  });

  it('MỘC — Vạn Diệp Độc Chú cộng dồn với độc tầng ngọc tím, ngọc tím sau đó không xóa phần của skill', () => {
    const state = setup({
      topRow: POISON_ROW, playerElement: 'wood', player: { energy: 90 },
      monster: { poisonStacks: 2, poisonPotency: 12, poisonTurns: 2 },
    });
    const cast = castSkill(state, 'wood', 'secondary', 'moc-2');
    expect(skillDamage(cast.events, 'thanh_moc_hoi_xuan')[0]?.payload['requested']).toBe(23); // round(25 × 0.9) − 0
    const applied = firstEvent(cast.events, (e) => e.type === 'POISON_APPLIED' && e.payload['target'] === 'monster');
    expect(applied?.payload['amount']).toBe(17); // 12 tầng + 5 (20% ATK)
    expect(applied?.payload['turns']).toBe(3);
    expect(firstEvent(cast.events, (e) => e.type === 'POISON_TICKED' && e.payload['target'] === 'monster')?.payload['amount']).toBe(17);

    const gem = swap(nextTurn(cast.nextState, state, POISON_ROW), 'moc-2-gem');
    const gemPoison = firstEvent(gem.events, (e) => e.type === 'POISON_APPLIED' && e.payload['target'] === 'monster');
    expect(gemPoison?.payload['stacks']).toBe(3);
    expect(gemPoison?.payload['amount']).toBe(23); // 3 tầng × 6 + 5 từ skill
  });

  it('THỦY — Hàn Triều Phá Không trừ thẳng 22 khiên; hết khiên thì trừ thẳng HP', () => {
    const shielded = castSkill(
      setup({ topRow: ATTACK_ROW, playerElement: 'water', player: { energy: 50 }, monster: { shield: 30 } }),
      'water', 'primary', 'thuy-1-shield',
    );
    const shieldHit = skillDamage(shielded.events, 'han_trieu_pha_khong')[0];
    expect(shieldHit?.payload['shieldAbsorbed']).toBe(22);
    expect(shieldHit?.payload['shieldRemaining']).toBe(8);
    expect(shieldHit?.payload['amount']).toBe(0);

    const bare = castSkill(
      setup({ topRow: ATTACK_ROW, playerElement: 'water', player: { energy: 50 }, monster: { shield: 0, defense: 10, baseDefense: 10 } }),
      'water', 'primary', 'thuy-1-hp',
    );
    expect(skillDamage(bare.events, 'han_trieu_pha_khong')[0]?.payload['amount']).toBe(22); // không trừ DEF
  });

  it('THỦY — Băng Phong Thiên Lý đóng băng: quái bỏ trọn lượt (không swap ngọc), độc vẫn tick', () => {
    for (const monsterId of ['mist_blob', 'lantern_cat', 'bamboo_mantis', 'cloud_fox_boss']) {
      const result = castSkill(
        setup({
          topRow: ATTACK_ROW, playerElement: 'water', monsterId, player: { energy: 100 },
          monster: { defense: 0, baseDefense: 0, poisonPotency: 6, poisonTurns: 2, poisonStacks: 1 },
        }),
        'water', 'secondary', `thuy-2-${monsterId}`,
      );
      expect(skillDamage(result.events, 'thuy_linh_ho_the')[0]?.payload['requested'], monsterId).toBe(28); // round(27.5)
      expect(result.events.some((e) => e.type === 'CONTROL_APPLIED' && e.payload['effect'] === 'freeze'), monsterId).toBe(true);
      expect(result.events.some((e) => e.type === 'MONSTER_ACTION_SKIPPED' && e.payload['reason'] === 'freeze'), monsterId).toBe(true);
      expect(result.events.some((e) => e.type === 'MONSTER_THINKING' || e.type === 'MONSTER_MOVE_SELECTED'), monsterId).toBe(false);
      expect(result.events.some((e) => e.type === 'MONSTER_ATTACKED' || e.type === 'MONSTER_SKILL_USED'), monsterId).toBe(false);
      expect(result.events.some((e) => e.type === 'POISON_TICKED' && e.payload['target'] === 'monster'), monsterId).toBe(true);
      expect(result.nextState.monster.controlTurns, monsterId).toBe(0);
      expect(result.nextState.phase, monsterId).toBe('PLAYER_READY');
    }
  });

  it('HỎA — Hỏa Vũ Liên Châu: 3 đòn × 40% ATK, bonus Thiêu đốt chỉ cộng đòn đầu', () => {
    const result = castSkill(
      setup({ topRow: ATTACK_ROW, playerElement: 'fire', player: { energy: 60 }, monster: { burningPotency: 1, burningTurns: 2 } }),
      'fire', 'primary', 'hoa-1',
    );
    const hits = skillDamage(result.events, 'hoa_vu_lien_chau');
    expect(hits.map((e) => e.payload['requested'])).toEqual([30, 10, 10]);
    expect(hits.map((e) => e.payload['burningBonus'])).toEqual([20, 0, 0]);
  });

  it('HỎA — Phần Thiên Xạ Nhật: +15% sát thương nhận vào áp cho ngọc đỏ, đúng 2 hành động rồi hết', () => {
    const state = setup({
      topRow: ATTACK_ROW, playerElement: 'fire', monsterId: 'bamboo_mantis',
      player: { energy: 100 }, monster: { element: 'earth', defense: 0, baseDefense: 0 },
    });
    const cast = castSkill(state, 'fire', 'secondary', 'hoa-2');
    expect(skillDamage(cast.events, 'phan_thien_hoa_vu')[0]?.payload['requested']).toBe(38); // round(37.5)
    expect(cast.nextState.monster.damageTakenBonusTurns).toBe(2);

    const first = swap(nextTurn(cast.nextState, state), 'hoa-2-gem-1');
    const gem = firstEvent(first.events, (e) => e.type === 'DAMAGE_APPLIED' && e.payload['source'] === 'attack_gems');
    expect(gem?.payload['requested']).toBe(58); // (30 + 20 thiêu đốt) × 1.15 = 57.5
    expect(first.nextState.monster.damageTakenBonusTurns).toBe(1);

    const second = swap(nextTurn(first.nextState, state), 'hoa-2-gem-2');
    expect(second.nextState.monster.damageTakenBonusTurns).toBe(0);
    expect(second.nextState.monster.damageTakenBonus).toBe(0);
  });

  it('THỔ — Huyền Nham Hộ Thể: khiên 200% DEF + giảm 25% chặn mọi đòn của 4 quái, phản 35%', () => {
    for (const monsterId of ['mist_blob', 'lantern_cat', 'bamboo_mantis', 'cloud_fox_boss']) {
      const attacked = Array.from({ length: 60 }, (_, index) => castSkill(
        setup({
          topRow: ATTACK_ROW, playerElement: 'earth', monsterId, seed: index + 1,
          player: { energy: 80 }, monster: { nextAction: 'basic', energy: 0 },
        }),
        'earth', 'secondary', `tho-2-${monsterId}-${index}`,
      )).find((candidate) => candidate.events.some((e) => e.type === 'MONSTER_ATTACKED'));
      expect(attacked, monsterId).toBeDefined();
      const events = attacked!.events;
      expect(skillDamage(events, 'dia_sat_phan_chan'), monsterId).toHaveLength(0);
      expect(firstEvent(events, (e) => e.type === 'SHIELD_GAINED' && e.payload['source'] === 'dia_sat_phan_chan')?.payload['amount'], monsterId).toBe(20);
      const hit = firstEvent(events, (e) => e.type === 'MONSTER_ATTACKED')!;
      const raw = Number(hit.payload['rawIncoming']);
      const expected = Math.max(1, Math.round(raw * 0.9 * 0.75)); // Sơn giáp × Huyền Nham
      expect(hit.payload['amount'], monsterId).toBe(expected);
      expect(hit.payload['shieldAbsorbed'], monsterId).toBe(Math.min(20, expected));
      const reflected = firstEvent(events, (e) => e.type === 'DAMAGE_REFLECTED');
      expect(Number(reflected?.payload['amount']) + Number(reflected?.payload['shieldAbsorbed']), monsterId)
        .toBe(Math.max(1, Math.round(expected * 0.35)));
    }
  });

  it('THỔ — Long Miêu Liên Kích của Miêu Đèn cũng bị giảm, khiên chặn và không gây choáng khi miễn khống chế', () => {
    const result = castSkill(
      setup({ topRow: ATTACK_ROW, playerElement: 'earth', monsterId: 'lantern_cat', player: { energy: 80 }, monster: { energy: 100, nextAction: 'long_mieu_lien_kich' } }),
      'earth', 'secondary', 'tho-2-long-mieu',
    );
    const skillHit = firstEvent(result.events, (e) => e.type === 'DAMAGE_APPLIED' && e.payload['source'] === 'lantern_cat_long_mieu_lien_kich');
    expect(skillHit?.payload['amount']).toBe(20); // ceil(300 × 10%) × 0.675
    expect(skillHit?.payload['shieldAbsorbed']).toBe(20);
    expect(result.events.some((e) => e.type === 'DAMAGE_REFLECTED')).toBe(true);
    expect(result.nextState.playerSkipTurns).toBe(0);
  });

  it('Guard của Cáo Mây chỉ cộng DEF cho 1 hành động kế tiếp', () => {
    const state = setup({ topRow: ATTACK_ROW, monsterId: 'cloud_fox_boss', monster: { nextAction: 'guard' } });
    const guarded = resolveBattleAction(state, { kind: 'timeout', actionId: 'fox-guard' });
    expect(guarded.events.some((e) => e.type === 'MONSTER_GUARDED')).toBe(true);
    expect(guarded.nextState.monster.defense).toBe(26);
    expect(guarded.nextState.monster.guardTurns).toBe(1);

    const after = resolveBattleAction(
      { ...guarded.nextState, monster: { ...guarded.nextState.monster, nextAction: 'basic' } },
      { kind: 'timeout', actionId: 'fox-guard-expire' },
    );
    expect(after.nextState.monster.guardTurns).toBe(0);
    expect(after.nextState.monster.defense).toBe(14);
  });
});
