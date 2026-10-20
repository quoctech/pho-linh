import {
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
  };
}

function swap(state: BattleState, actionId: string) {
  return resolveBattleAction(state, { kind: 'swap', from: { row: 0, col: 0 }, to: { row: 0, col: 1 }, actionId });
}

function firstEvent(events: readonly GameEvent[], predicate: (event: GameEvent) => boolean): GameEvent | undefined {
  return events.find(predicate);
}

describe('Balance V2 combat core', () => {
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

  it('tạo cùng event log cho cùng seed và cùng action (balanceVersion 2)', () => {
    const base = setup({ topRow: ['attack', 'heal', 'attack', 'attack', 'shield', 'energy'], seed: 321 });
    expect(base.balanceVersion).toBe(2);
    const a = swap(base, 'replay');
    const b = swap(base, 'replay');
    expect(a.events).toEqual(b.events);
    expect(a.nextState).toEqual(b.nextState);
  });
});

describe('Balance V2 nội tại nghề', () => {
  it('KIM — Kiếm Tâm Bất Diệt: ăn ngọc đỏ đôi khi tích thêm nộ', () => {
    const triggered = Array.from({ length: 80 }, (_, index) =>
      swap(
        setup({
          topRow: ['attack', 'heal', 'attack', 'attack', 'shield', 'energy'],
          playerElement: 'metal',
          monsterId: 'bamboo_mantis',
          monster: { element: 'earth', defense: 0, baseDefense: 0 },
          seed: index + 1,
        }),
        `kim-${index}`,
      ),
    ).filter((result) => result.events.some((e) => e.type === 'PASSIVE_TRIGGERED' && e.payload['passiveId'] === 'metal_bonus_energy'));
    expect(triggered.length).toBeGreaterThan(0);
  });

  it('MỘC — Sinh Cơ Bất Tận: độc kéo dài thêm 1 lượt và máu dư hóa khiên', () => {
    const poison = swap(
      setup({ topRow: ['poison', 'attack', 'poison', 'poison', 'heal', 'shield'], playerElement: 'wood' }),
      'moc-poison',
    );
    expect(firstEvent(poison.events, (e) => e.type === 'POISON_APPLIED' && e.payload['target'] === 'monster')?.payload['turns']).toBe(4);

    const overflow = swap(
      setup({ topRow: ['heal', 'attack', 'heal', 'heal', 'shield', 'energy'], playerElement: 'wood' }),
      'moc-overflow',
    );
    // Người chơi đầy máu sẵn (currentHp = maxHp) nên toàn bộ phần hồi tràn sang khiên.
    const shieldPassive = firstEvent(overflow.events, (e) => e.type === 'PASSIVE_TRIGGERED' && e.payload['passiveId'] === 'wood_overflow_shield');
    expect(shieldPassive?.payload['amount']).toBe(45);
  });

  it('THỦY — Hàn Tức Ngưng Kết: khiên match-4 làm quái hoãn lượt đánh', () => {
    const result = swap(
      setup({ topRow: ['shield', 'attack', 'shield', 'shield', 'shield', 'energy'], playerElement: 'water' }),
      'thuy-delay',
    );
    expect(result.events.some((e) => e.type === 'PASSIVE_TRIGGERED' && e.payload['passiveId'] === 'water_delay_monster')).toBe(true);
    expect(result.events.some((e) => e.type === 'MONSTER_ACTION_DELAYED')).toBe(true);
    expect(result.events.some((e) => e.type === 'MONSTER_ATTACKED')).toBe(false);
  });

  it('HỎA — Liệt Diễm Chi Tâm: thiêu rụi khiên quái khi đánh thường', () => {
    const result = swap(
      setup({
        topRow: ['attack', 'heal', 'attack', 'attack', 'shield', 'energy'],
        playerElement: 'fire',
        monsterId: 'bamboo_mantis',
        monster: { element: 'earth', defense: 0, baseDefense: 0, shield: 20 },
      }),
      'hoa-burn',
    );
    const burn = firstEvent(result.events, (e) => e.type === 'PASSIVE_TRIGGERED' && e.payload['passiveId'] === 'fire_burn_shield');
    expect(burn?.payload['amount']).toBe(20);
    // +20% sát thương: 25 × 3 × 0.4 × 1.0(hòa) × 1.2 = 36.
    expect(firstEvent(result.events, (e) => e.type === 'DAMAGE_APPLIED' && e.payload['source'] === 'attack_gems')?.payload['amount']).toBe(36);
  });

  it('THỔ — Bất Động Như Sơn: nộ chuyển hóa một phần thành khiên', () => {
    const result = swap(
      setup({ topRow: ['energy', 'attack', 'energy', 'energy', 'heal', 'shield'], playerElement: 'earth' }),
      'tho-shield',
    );
    // earth vs water = khắc → nộ 18; khiên thưởng = round(18 × 0.5) = 9.
    const shieldPassive = firstEvent(result.events, (e) => e.type === 'PASSIVE_TRIGGERED' && e.payload['passiveId'] === 'earth_energy_shield');
    expect(shieldPassive?.payload['amount']).toBe(9);
  });
});
