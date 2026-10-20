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

        expect(result.accepted, `${element}-${slot}`).toBe(true);
        expect(result.events.some((event) => event.type === 'SKILL_USED' && event.payload['skillId'] === skillId)).toBe(true);
        expect(result.events.some((event) => event.type === 'DAMAGE_APPLIED' && event.payload['source'] === skillId)).toBe(true);
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
    expect(damage?.payload['requested']).toBe(30); // 25 ATK × 120%
    expect(damage?.payload['shieldAbsorbed']).toBe(30);
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
    expect(damage?.payload['requested']).toBe(45); // 25 ATK × 180%
    expect(damage?.payload['shieldAbsorbed']).toBe(0);
    expect(damage?.payload['amount']).toBe(45);
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

  it('tạo cùng event log cho cùng seed và cùng action (balanceVersion 3)', () => {
    const base = setup({ topRow: ['attack', 'heal', 'attack', 'attack', 'shield', 'energy'], seed: 321 });
    expect(base.balanceVersion).toBe(3);
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

  it('THỔ — khi đang có khiên, incoming damage giảm 10%', () => {
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
