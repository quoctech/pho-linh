import {
  CHARACTER_DATA,
  createBattleState,
  createPlayerBattleState,
  dodgeChanceFromAgi,
  equipmentBonuses,
  monsterDodgeChance,
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

const ATTACK_ROW: readonly GemType[] = ['attack', 'heal', 'attack', 'attack', 'shield', 'energy'];
const POISON_ROW: readonly GemType[] = ['poison', 'attack', 'poison', 'poison', 'heal', 'shield'];
const HEAL_ROW: readonly GemType[] = ['heal', 'attack', 'heal', 'heal', 'shield', 'energy'];
const SHIELD_ROW: readonly GemType[] = ['shield', 'attack', 'shield', 'shield', 'heal', 'energy'];
const SHIELD_FOUR_ROW: readonly GemType[] = ['shield', 'attack', 'shield', 'shield', 'shield', 'energy'];
const ENERGY_ROW: readonly GemType[] = ['energy', 'attack', 'energy', 'energy', 'heal', 'shield'];
const ENERGY_FIVE_ROW: readonly GemType[] = ['energy', 'attack', 'energy', 'energy', 'energy', 'energy'];

interface SetupOptions {
  readonly topRow: readonly GemType[];
  readonly playerElement?: ElementId;
  readonly monsterId?: string;
  readonly monster?: Partial<BattleState['monster']>;
  readonly player?: Partial<BattleState['player']>;
  readonly battle?: Partial<BattleState>;
  readonly seed?: number;
  /** Mặc định tắt né theo AGI cả hai phía để số liệu không phụ thuộc RNG né. */
  readonly keepDodge?: boolean;
}

function setup(options: SetupOptions): BattleState {
  const seed = options.seed ?? 99;
  const initial = createBattleState(
    seed,
    options.monsterId ?? 'mist_blob',
    `v6-${seed}`,
    undefined,
    createPlayerBattleState({ str: 5, vit: 5, agi: 5, int: 5 }, equipmentBonuses([], {}), options.playerElement ?? 'metal'),
  );
  const board: GemType[][] = BASE_ROWS.map((row) => [...row]);
  board[0] = [...options.topRow];
  const player = options.keepDodge ? initial.player : { ...initial.player, stats: { ...initial.player.stats, agi: 0, dodgeChance: 0 } };
  return {
    ...initial,
    board,
    monster: { ...initial.monster, ...(options.keepDodge ? {} : { agi: 0 }), ...options.monster },
    player: { ...player, ...options.player },
    ...options.battle,
  };
}

function swap(state: BattleState, actionId: string) {
  return resolveBattleAction(state, { kind: 'swap', from: { row: 0, col: 0 }, to: { row: 0, col: 1 }, actionId });
}

function firstEvent(events: readonly GameEvent[], predicate: (event: GameEvent) => boolean): GameEvent | undefined {
  return events.find(predicate);
}

function gemDamage(events: readonly GameEvent[]): GameEvent | undefined {
  return firstEvent(events, (e) => e.type === 'DAMAGE_APPLIED' && e.payload['source'] === 'attack_gems');
}

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

describe('Balance V6 — công thức combat', () => {
  it('resolves every element skill through the common player skill flow', () => {
    for (const element of ['metal', 'wood', 'water', 'fire', 'earth'] as const) {
      const state = setup({ topRow: ATTACK_ROW, playerElement: element, player: { energy: 100 } });
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

  it('né theo AGI: AGI / (AGI + 1900) cho nhân vật và quái', () => {
    expect(dodgeChanceFromAgi(180)).toBeCloseTo(0.0865, 4);
    expect(dodgeChanceFromAgi(380)).toBeCloseTo(0.1667, 4);
    const fox = setup({ topRow: ATTACK_ROW, monsterId: 'cloud_fox_boss', keepDodge: true });
    expect(monsterDodgeChance(fox.monster)).toBeCloseTo(380 / 2280);
    expect(fox.player.stats.dodgeChance).toBeCloseTo(180 / 2080);
  });

  it('ngọc đỏ: ATK × ô × 0.4 × modifier, DEF giảm % = DEF / (DEF + 1900)', () => {
    // metal vs earth = hòa; DEF 0 → không giảm.
    const neutral = swap(setup({ topRow: ATTACK_ROW, monsterId: 'bamboo_mantis', monster: { element: 'earth', defense: 0, baseDefense: 0 } }), 'v6-dmg');
    expect(gemDamage(neutral.events)?.payload['matchCount']).toBe(3);
    expect(gemDamage(neutral.events)?.payload['amount']).toBe(1500); // 1250 × 3 × 0.4

    // Sương Hồn DEF 600 → giảm 24%.
    const armored = swap(setup({ topRow: ATTACK_ROW, monster: { shield: 0 } }), 'v6-dmg-def');
    expect(gemDamage(armored.events)?.payload['requested']).toBe(1140); // 1500 × 0.76
  });

  it('áp modifier 130% khi khắc và 80% khi bị khắc cho ngọc đỏ', () => {
    const counter = swap(setup({ topRow: ATTACK_ROW, monsterId: 'bamboo_mantis', monster: { element: 'wood', defense: 0, baseDefense: 0 } }), 'v6-counter');
    expect(gemDamage(counter.events)?.payload['amount']).toBe(1950); // 1500 × 1.3

    const countered = swap(setup({
      topRow: ATTACK_ROW, playerElement: 'earth', monsterId: 'bamboo_mantis', monster: { element: 'wood', defense: 0, baseDefense: 0 },
    }), 'v6-countered');
    expect(gemDamage(countered.events)?.payload['amount']).toBe(720); // 750 × 3 × 0.4 × 0.8
  });

  it('hồi máu = maxHP × 5% × số ô và khiên = DEF × 1.5 × số ô (quan hệ hòa)', () => {
    const heal = swap(setup({ topRow: HEAL_ROW, player: { currentHp: 1000 } }), 'v6-heal');
    expect(firstEvent(heal.events, (e) => e.type === 'HEAL_APPLIED' && e.payload['target'] === 'player')?.payload['amount']).toBe(1350);

    const shield = swap(setup({ topRow: SHIELD_ROW }), 'v6-shield');
    expect(firstEvent(shield.events, (e) => e.type === 'SHIELD_GAINED' && e.payload['target'] === 'player')?.payload['amount']).toBe(1800);
  });

  it('nạp nộ theo độ dài match (3→15, ≥5→40) và áp modifier năng lượng', () => {
    const neutral = swap(setup({ topRow: ENERGY_ROW }), 'v6-energy');
    expect(firstEvent(neutral.events, (e) => e.type === 'ENERGY_GAINED' && e.payload['target'] === 'player')?.payload['requested']).toBe(15);

    const five = swap(setup({ topRow: ENERGY_FIVE_ROW }), 'v6-energy-five');
    expect(firstEvent(five.events, (e) => e.type === 'ENERGY_GAINED' && e.payload['target'] === 'player')?.payload['requested']).toBe(40);

    // earth vs water = khắc → 15 × 1.2 = 18.
    const counter = swap(setup({ topRow: ENERGY_ROW, playerElement: 'earth' }), 'v6-energy-counter');
    expect(firstEvent(counter.events, (e) => e.type === 'ENERGY_GAINED' && e.payload['target'] === 'player')?.payload['requested']).toBe(18);
  });

  it('độc theo tầng: mỗi match +1 tầng, mỗi tầng ATK × 0.25, duration 3', () => {
    const result = swap(setup({ topRow: POISON_ROW }), 'v6-poison');
    const poison = firstEvent(result.events, (e) => e.type === 'POISON_APPLIED' && e.payload['target'] === 'monster');
    expect(poison?.payload['perStack']).toBe(313); // round(1250 × 0.25)
    expect(poison?.payload['stacks']).toBe(1);
    expect(poison?.payload['turns']).toBe(3);
  });

  it('nhân vật né đòn thường của quái theo AGI: không sát thương', () => {
    const dodged = Array.from({ length: 60 }, (_, index) => resolveBattleAction(
      setup({
        topRow: ATTACK_ROW, seed: index + 1,
        player: { stats: { ...setup({ topRow: ATTACK_ROW }).player.stats, agi: 100000, dodgeChance: 0.9 } },
        monster: { nextAction: 'basic' },
      }),
      { kind: 'timeout', actionId: `player-dodge-${index}` },
    )).find((result) => result.events.some((e) => e.type === 'PLAYER_DODGED'));
    expect(dodged).toBeDefined();
    expect(firstEvent(dodged!.events, (e) => e.type === 'PLAYER_DODGED')?.payload['chance']).toBeCloseTo(0.9);
    expect(dodged!.events.some((e) => e.type === 'MONSTER_ATTACKED')).toBe(false);
  });

  it('tạo cùng event log cho cùng seed và cùng action (balanceVersion 6)', () => {
    const base = setup({ topRow: ATTACK_ROW, seed: 321, keepDodge: true });
    expect(base.balanceVersion).toBe(6);
    const a = swap(base, 'replay');
    const b = swap(base, 'replay');
    expect(a.events).toEqual(b.events);
    expect(a.nextState).toEqual(b.nextState);
  });
});

describe('Balance V6 — nội tại bàn cờ (2.2)', () => {
  it('KIM — ăn ngọc đỏ có 25% phá thêm 1 ngọc vàng kề, +15 nộ', () => {
    const outcomes = Array.from({ length: 40 }, (_, index) => swap(setup({ topRow: ATTACK_ROW, seed: index + 1 }), `kim-break-${index}`));
    const broke = outcomes.filter((result) => result.events.some((e) => e.type === 'PASSIVE_TRIGGERED' && e.payload['passiveId'] === 'metal_yellow_break'));
    expect(broke.length).toBeGreaterThan(0);
    expect(broke.length).toBeLessThan(outcomes.length);
    const first = broke[0];
    const cleared = firstEvent(first.events, (e) => e.type === 'GEMS_CLEARED' && (e.payload['bonusCoordinates'] as unknown[]).length > 0);
    expect(cleared?.payload['bonusCoordinates']).toEqual([{ row: 1, col: 2 }]);
    expect(firstEvent(first.events, (e) => e.type === 'ENERGY_GAINED' && e.payload['source'] === 'metal_passive')?.payload['requested']).toBe(15);
  });

  it('MỘC — ngọc tím độc thêm +1 lượt; hồi dư khi đầy HP hóa Khiên', () => {
    const poison = swap(setup({ topRow: POISON_ROW, playerElement: 'wood' }), 'moc-poison');
    expect(firstEvent(poison.events, (e) => e.type === 'POISON_APPLIED' && e.payload['target'] === 'monster')?.payload['turns']).toBe(4);

    const overheal = swap(setup({ topRow: HEAL_ROW, playerElement: 'wood', player: { currentHp: 10500 } }), 'moc-overheal');
    // 11.000 × 5% × 3 = 1.650 → hồi 500, dư 1.150 thành khiên.
    expect(firstEvent(overheal.events, (e) => e.type === 'SHIELD_GAINED' && e.payload['source'] === 'wood_overheal')?.payload['amount']).toBe(1150);
  });

  it('THỦY — Match-4 khiên: khiên ×1.5 và quái mất đòn đánh lượt kế, bị Làm chậm', () => {
    const result = swap(setup({ topRow: SHIELD_FOUR_ROW, playerElement: 'water', monster: { nextAction: 'basic' } }), 'thuy-shield4');
    const shield = firstEvent(result.events, (e) => e.type === 'SHIELD_GAINED' && e.payload['target'] === 'player');
    expect(shield?.payload['requested']).toBe(4950); // 550 × 1.5 × 4 × 1.5
    expect(result.events.some((e) => e.type === 'PASSIVE_TRIGGERED' && e.payload['passiveId'] === 'water_shield_delay')).toBe(true);
    expect(result.events.some((e) => e.type === 'MONSTER_ACTION_DELAYED')).toBe(true);
    expect(result.events.some((e) => e.type === 'MONSTER_ATTACKED')).toBe(false);
    expect(result.nextState.monster.slowedTurns).toBe(2);
  });

  it('THỦY nghề — Băng Phong Thiên Lý đóng băng thêm +1 lượt khi quái đang bị Làm chậm', () => {
    const result = castSkill(setup({ topRow: ATTACK_ROW, playerElement: 'water', player: { energy: 100 }, monster: { slowedTurns: 2 } }), 'water', 'secondary', 'thuy-slow-freeze');
    expect(firstEvent(result.events, (e) => e.type === 'CONTROL_APPLIED')?.payload['turns']).toBe(2);
    expect(result.nextState.monster.controlTurns).toBe(1);
  });

  it('HỎA — ngọc đỏ +20%, xuyên khiên; mục tiêu đang Thiêu đốt nhận thêm +20%', () => {
    const result = swap(setup({
      topRow: ATTACK_ROW, playerElement: 'fire', monsterId: 'bamboo_mantis',
      monster: { element: 'earth', defense: 0, baseDefense: 0, shield: 500, burningPotency: 1, burningTurns: 2 },
    }), 'hoa-pierce');
    const damage = gemDamage(result.events);
    expect(damage?.payload['amount']).toBe(2246); // 1300 × 3 × 0.4 × 1.2 × 1.2
    expect(damage?.payload['shieldAbsorbed']).toBe(0);
    expect(damage?.payload['pierceShield']).toBe(true);
    expect(result.events.some((e) => e.type === 'BURNING_APPLIED')).toBe(true);
  });

  it('THỔ — ngọc vàng: Khiên = 50% nộ × 30; đang có khiên giảm 10% sát thương nhận', () => {
    const energy = swap(setup({ topRow: ENERGY_ROW, playerElement: 'earth' }), 'tho-energy');
    // earth khắc water: 15 × 1.2 = 18 nộ → 18 × 0.5 × 30 = 270 khiên.
    expect(firstEvent(energy.events, (e) => e.type === 'SHIELD_GAINED' && e.payload['source'] === 'earth_energy_shield')?.payload['amount']).toBe(270);

    const resist = swap(setup({ topRow: ATTACK_ROW, playerElement: 'earth', monster: { nextAction: 'basic' }, player: { shield: 5000 } }), 'tho-resist');
    expect(resist.events.some((e) => e.type === 'PASSIVE_TRIGGERED' && e.payload['passiveId'] === 'earth_shield_resistance')).toBe(true);
    // 950 × (1 − 800 / 2700) = 669 → × 0.9 = 602.
    expect(firstEvent(resist.events, (e) => e.type === 'MONSTER_ATTACKED')?.payload['amount']).toBe(602);
  });
});

describe('Balance V6 — nội tại nghề (3.x)', () => {
  it('KIM — streak attack kích hoạt crit +40% damage', () => {
    const result = Array.from({ length: 100 }, (_, index) => swap(setup({
      topRow: ATTACK_ROW, monsterId: 'bamboo_mantis',
      monster: { element: 'earth', defense: 0, baseDefense: 0 },
      player: { attackStreakTargetId: 'bamboo_mantis', attackStreak: 1 }, seed: index + 1,
    }), `kim-crit-${index}`)).find((candidate) => candidate.events.some((event) => event.type === 'DAMAGE_APPLIED' && event.payload['critical'] === true))!;
    expect(gemDamage(result.events)?.payload['critical']).toBe(true);
    expect(gemDamage(result.events)?.payload['amount']).toBe(2100); // 1500 × 1.4
    expect(result.events.some((e) => e.type === 'PASSIVE_TRIGGERED' && e.payload['passiveId'] === 'metal_critical')).toBe(true);
  });

  it('MỘC — hồi HP tăng 40% khi quái đang dính độc', () => {
    const result = swap(setup({
      topRow: HEAL_ROW, playerElement: 'wood', player: { currentHp: 1000 },
      monster: { poisonPotency: 300, poisonTurns: 2 },
    }), 'moc-heal');
    expect(firstEvent(result.events, (e) => e.type === 'HEAL_APPLIED' && e.payload['target'] === 'player')?.payload['amount']).toBe(2310); // 1650 × 1.4
    expect(result.events.some((e) => e.type === 'PASSIVE_TRIGGERED' && e.payload['passiveId'] === 'wood_healing')).toBe(true);
  });
});

describe('Cân bằng skill hệ (balanceVersion 6)', () => {
  it('KIM — Vạn Kiếm Quy Tông tiêu 60 nộ và bị khiên hấp thụ trước HP', () => {
    const result = castSkill(setup({ topRow: ATTACK_ROW, player: { energy: 60 }, monster: { shield: 1500 } }), 'metal', 'secondary', 'kim-1');
    const damage = skillDamage(result.events, 'van_kiem_quy_tong')[0];
    expect(damage?.payload['requested']).toBe(1140); // 1250 × 1.2 × 0.76
    expect(damage?.payload['shieldAbsorbed']).toBe(1140);
    expect(damage?.payload['amount']).toBe(0);
    expect(firstEvent(result.events, (e) => e.type === 'SKILL_USED')?.payload['energySpent']).toBe(60);
  });

  it('KIM — Kim Quang Phá Giáp xuyên khiên, DEF -30% đúng 2 hành động kế tiếp rồi hồi', () => {
    const state = setup({ topRow: ATTACK_ROW, player: { energy: 100 }, monster: { shield: 1500 } });
    const cast = castSkill(state, 'metal', 'primary', 'kim-2');
    const damage = skillDamage(cast.events, 'kim_quang_pha_giap')[0];
    expect(damage?.payload['requested']).toBe(1710); // 1250 × 1.8 × 0.76
    expect(damage?.payload['shieldAbsorbed']).toBe(0);
    expect(cast.nextState.monster.defense).toBe(420);
    expect(cast.nextState.monster.defenseReductionTurns).toBe(2);

    const bamboo = setup({ topRow: ATTACK_ROW, monsterId: 'bamboo_mantis', player: { energy: 100 }, monster: { element: 'earth' } });
    const bambooCast = castSkill(bamboo, 'metal', 'primary', 'kim-def-cast');
    expect(bambooCast.nextState.monster.defense).toBe(315);
    const first = swap(nextTurn(bambooCast.nextState, bamboo), 'kim-def-1');
    expect(gemDamage(first.events)?.payload['requested']).toBe(1287); // 1500 × (1 − 315 / 2215)
    expect(first.nextState.monster.defenseReductionTurns).toBe(1);
    const second = swap(nextTurn(first.nextState, bamboo), 'kim-def-2');
    expect(second.nextState.monster.defenseReductionTurns).toBe(0);
    expect(second.nextState.monster.defense).toBe(450);
  });

  it('MỘC — Thanh Đằng Trói Hồn: 80% ATK và hút 15 năng lượng quái', () => {
    const result = castSkill(setup({ topRow: ATTACK_ROW, playerElement: 'wood', player: { energy: 50 }, monster: { energy: 40 } }), 'wood', 'primary', 'moc-1');
    expect(skillDamage(result.events, 'thanh_dang_troi_hon')[0]?.payload['requested']).toBe(578); // 760 × 0.76
    expect(firstEvent(result.events, (e) => e.type === 'ENERGY_STOLEN')?.payload['amount']).toBe(15);
  });

  it('MỘC — Vạn Diệp Độc Chú cộng dồn với độc tầng ngọc tím', () => {
    const state = setup({
      topRow: POISON_ROW, playerElement: 'wood', player: { energy: 90 },
      monster: { poisonStacks: 2, poisonPotency: 600, poisonTurns: 2 },
    });
    const cast = castSkill(state, 'wood', 'secondary', 'moc-2');
    expect(skillDamage(cast.events, 'thanh_moc_hoi_xuan')[0]?.payload['requested']).toBe(650); // 855 × 0.76
    const applied = firstEvent(cast.events, (e) => e.type === 'POISON_APPLIED' && e.payload['target'] === 'monster');
    expect(applied?.payload['amount']).toBe(790); // 600 tầng + 190 (20% ATK)
    expect(firstEvent(cast.events, (e) => e.type === 'POISON_TICKED' && e.payload['target'] === 'monster')?.payload['amount']).toBe(790);

    const gem = swap(nextTurn(cast.nextState, state, POISON_ROW), 'moc-2-gem');
    const gemPoison = firstEvent(gem.events, (e) => e.type === 'POISON_APPLIED' && e.payload['target'] === 'monster');
    expect(gemPoison?.payload['stacks']).toBe(3);
    expect(gemPoison?.payload['amount']).toBe(904); // 3 tầng × 238 + 190 từ skill
  });

  it('THỦY — Hàn Triều Phá Không trừ thẳng 660 khiên; hết khiên thì trừ thẳng HP', () => {
    const shielded = castSkill(setup({ topRow: ATTACK_ROW, playerElement: 'water', player: { energy: 50 }, monster: { shield: 1000 } }), 'water', 'primary', 'thuy-1-shield');
    const shieldHit = skillDamage(shielded.events, 'han_trieu_pha_khong')[0];
    expect(shieldHit?.payload['shieldAbsorbed']).toBe(660);
    expect(shieldHit?.payload['shieldRemaining']).toBe(340);
    expect(shieldHit?.payload['amount']).toBe(0);

    const bare = castSkill(setup({ topRow: ATTACK_ROW, playerElement: 'water', player: { energy: 50 }, monster: { shield: 0 } }), 'water', 'primary', 'thuy-1-hp');
    expect(skillDamage(bare.events, 'han_trieu_pha_khong')[0]?.payload['amount']).toBe(660); // không trừ DEF
  });

  it('THỦY — Băng Phong Thiên Lý đóng băng: quái bỏ trọn lượt (không swap ngọc), độc vẫn tick', () => {
    for (const monsterId of ['mist_blob', 'lantern_cat', 'bamboo_mantis', 'cloud_fox_boss']) {
      const result = castSkill(
        setup({
          topRow: ATTACK_ROW, playerElement: 'water', monsterId, player: { energy: 100 },
          monster: { defense: 0, baseDefense: 0, poisonPotency: 300, poisonTurns: 2, poisonStacks: 1 },
        }),
        'water', 'secondary', `thuy-2-${monsterId}`,
      );
      expect(skillDamage(result.events, 'thuy_linh_ho_the')[0]?.payload['requested'], monsterId).toBe(1100);
      expect(result.events.some((e) => e.type === 'CONTROL_APPLIED' && e.payload['effect'] === 'freeze'), monsterId).toBe(true);
      expect(result.events.some((e) => e.type === 'MONSTER_ACTION_SKIPPED' && e.payload['reason'] === 'freeze'), monsterId).toBe(true);
      expect(result.events.some((e) => e.type === 'MONSTER_THINKING' || e.type === 'MONSTER_MOVE_SELECTED'), monsterId).toBe(false);
      expect(result.events.some((e) => e.type === 'MONSTER_ATTACKED' || e.type === 'MONSTER_SKILL_USED'), monsterId).toBe(false);
      expect(result.events.some((e) => e.type === 'POISON_TICKED' && e.payload['target'] === 'monster'), monsterId).toBe(true);
      expect(result.nextState.monster.controlTurns, monsterId).toBe(0);
      expect(result.nextState.phase, monsterId).toBe('PLAYER_READY');
    }
  });

  it('HỎA — Hỏa Vũ Liên Châu: 3 đòn × 40% ATK, bonus Thiêu đốt chỉ đòn đầu', () => {
    const result = castSkill(
      setup({ topRow: ATTACK_ROW, playerElement: 'fire', player: { energy: 60 }, monster: { burningPotency: 1, burningTurns: 2 } }),
      'fire', 'primary', 'hoa-1',
    );
    const hits = skillDamage(result.events, 'hoa_vu_lien_chau');
    expect(hits.map((e) => e.payload['requested'])).toEqual([474, 395, 395]); // 520 × 1.2 × 0.76; 520 × 0.76
    expect(hits.map((e) => e.payload['burningMultiplier'])).toEqual([1.2, 1, 1]);
  });

  it('HỎA — Phần Thiên Xạ Nhật: +15% sát thương nhận vào áp cho ngọc đỏ, đúng 2 hành động rồi hết', () => {
    const state = setup({
      topRow: ATTACK_ROW, playerElement: 'fire', monsterId: 'bamboo_mantis',
      player: { energy: 100 }, monster: { element: 'earth', defense: 0, baseDefense: 0 },
    });
    const cast = castSkill(state, 'fire', 'secondary', 'hoa-2');
    expect(skillDamage(cast.events, 'phan_thien_hoa_vu')[0]?.payload['requested']).toBe(1950);
    expect(cast.nextState.monster.damageTakenBonusTurns).toBe(2);

    const first = swap(nextTurn(cast.nextState, state), 'hoa-2-gem-1');
    expect(gemDamage(first.events)?.payload['requested']).toBe(2583); // 2246.4 → 2246 × 1.15
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
      expect(firstEvent(events, (e) => e.type === 'SHIELD_GAINED' && e.payload['source'] === 'dia_sat_phan_chan')?.payload['amount'], monsterId).toBe(1600);
      const hit = firstEvent(events, (e) => e.type === 'MONSTER_ATTACKED')!;
      const raw = Number(hit.payload['rawIncoming']);
      const expected = Math.max(1, Math.round(raw * 0.9 * 0.75)); // Sơn giáp × Huyền Nham
      expect(hit.payload['amount'], monsterId).toBe(expected);
      expect(hit.payload['shieldAbsorbed'], monsterId).toBe(Math.min(1600, expected));
      const reflected = firstEvent(events, (e) => e.type === 'DAMAGE_REFLECTED');
      expect(Number(reflected?.payload['amount']) + Number(reflected?.payload['shieldAbsorbed']), monsterId)
        .toBe(Math.max(1, Math.round(expected * 0.35)));
    }
  });

  it('THỔ — Long Miêu Liên Kích bị giảm, khiên chặn và không gây choáng khi miễn khống chế', () => {
    const result = castSkill(
      setup({ topRow: ATTACK_ROW, playerElement: 'earth', monsterId: 'lantern_cat', player: { energy: 80 }, monster: { energy: 100, nextAction: 'skill' } }),
      'earth', 'secondary', 'tho-2-long-mieu',
    );
    const skillHit = firstEvent(result.events, (e) => e.type === 'DAMAGE_APPLIED' && e.payload['source'] === 'lantern_cat_long_mieu_lien_kich');
    expect(skillHit?.payload['requested']).toBe(834); // 1755 × (1 − 800 / 2700) × 0.9 × 0.75
    expect(skillHit?.payload['shieldAbsorbed']).toBe(834);
    expect(skillHit?.payload['amount']).toBe(0);
    expect(result.events.some((e) => e.type === 'DAMAGE_REFLECTED')).toBe(true);
    expect(result.nextState.playerSkipTurns).toBe(0);
  });

  it('Guard của Cáo Mây cộng +20% DEF cho 1 hành động kế tiếp', () => {
    const state = setup({ topRow: ATTACK_ROW, monsterId: 'cloud_fox_boss', monster: { nextAction: 'guard' } });
    const guarded = resolveBattleAction(state, { kind: 'timeout', actionId: 'fox-guard' });
    expect(guarded.events.some((e) => e.type === 'MONSTER_GUARDED')).toBe(true);
    expect(guarded.nextState.monster.defense).toBe(480);
    expect(guarded.nextState.monster.guardTurns).toBe(1);

    const after = resolveBattleAction(
      { ...guarded.nextState, monster: { ...guarded.nextState.monster, nextAction: 'basic' } },
      { kind: 'timeout', actionId: 'fox-guard-expire' },
    );
    expect(after.nextState.monster.guardTurns).toBe(0);
    expect(after.nextState.monster.defense).toBe(400);
  });
});
