export const GEM_TYPES = [
  'attack',
  'heal',
  'shield',
  'energy',
  'poison',
] as const;

export type GemType = (typeof GEM_TYPES)[number];
export type Board = ReadonlyArray<ReadonlyArray<GemType>>;

export interface Coord {
  readonly row: number;
  readonly col: number;
}

export interface SwapAction {
  readonly kind: 'swap';
  readonly from: Coord;
  readonly to: Coord;
  readonly actionId: string;
}

export type Match3Phase = 'ready' | 'resolving' | 'ended';

export type BattlePhase =
  | 'INIT'
  | 'PLAYER_READY'
  | 'SWAPPING'
  | 'RESOLVING'
  | 'MONSTER_TURN'
  | 'VICTORY'
  | 'DEFEAT'
  | 'ABANDON';

export interface Match3State {
  readonly battleId: string;
  readonly seed: number;
  readonly rngState: number;
  readonly board: Board;
  readonly turn: number;
  readonly phase: Match3Phase;
  readonly actionLog: readonly SwapAction[];
}

export interface Match3Config {
  readonly rows: number;
  readonly cols: number;
  readonly gemTypes: readonly GemType[];
  /** Optional integer weights used when creating/refilling gems. */
  readonly gemWeights?: Partial<Readonly<Record<GemType, number>>>;
  readonly maxCascade: number;
  readonly maxGenerationAttempts: number;
  readonly balanceVersion: number;
}

export interface Attributes {
  readonly str: number;
  readonly vit: number;
  readonly agi: number;
  readonly int: number;
}

export interface DerivedStats {
  readonly maxHp: number;
  readonly atk: number;
  readonly defense: number;
  readonly skillPower: number;
  /** Linh hoạt; tỉ lệ né = AGI / (AGI + agiOffset). */
  readonly agi: number;
  readonly dodgeChance: number;
  readonly power: number;
}

export type EquipmentSlot = 'weapon' | 'armor' | 'charm';
export type ItemRarity = 'common' | 'rare';

export interface EquipmentBonuses {
  readonly maxHp?: number;
  readonly atk?: number;
  readonly defense?: number;
  readonly skillPower?: number;
  readonly agi?: number;
}

export interface ItemTemplate {
  readonly id: string;
  readonly name: string;
  readonly slot: EquipmentSlot;
  readonly rarity: ItemRarity;
  readonly price: number;
  readonly bonuses: EquipmentBonuses;
  readonly description: string;
}

export interface ItemInstance {
  readonly instanceId: string;
  readonly templateId: string;
  readonly obtainedAt: number;
}

export interface EquipmentSlots {
  readonly weapon?: string;
  readonly armor?: string;
  readonly charm?: string;
}

export interface PlayerBattleState {
  readonly level: number;
  /** Hệ Ngũ Hành của nhân vật; quyết định tương khắc và nội tại nghề (Balance V3). */
  readonly element: ElementId;
  readonly attributes: Attributes;
  readonly stats: DerivedStats;
  readonly currentHp: number;
  readonly shield: number;
  readonly energy: number;
  readonly poisonPotency: number;
  readonly poisonTurns: number;
  /** Số tầng độc đang chịu (mô hình độc theo tầng V2, tối đa poisonMaxStacks). */
  readonly poisonStacks: number;
  readonly damageReductionTurns: number;
  readonly damageReductionPercent: number;
  readonly controlImmunityTurns: number;
  readonly reflectDamageRatio: number;
  /** Thiêu đốt do quái gây (Long Miêu Liên Kích): mất HP mỗi đầu lượt quái. */
  readonly burningPotency: number;
  readonly burningTurns: number;
  /** Giảm hồi máu (Vụ Lưu Thuẫn), đếm theo hành động của người chơi. */
  readonly healReduction: number;
  readonly healReductionTurns: number;
  /** Direct attack streak used by the Metal passive. */
  readonly attackStreakTargetId?: string;
  readonly attackStreak: number;
}

export interface MonsterDefinition {
  readonly id: string;
  readonly name: string;
  /** Hệ Ngũ Hành của quái (Balance V3); thiếu field => coi như hòa/neutral. */
  readonly element?: ElementId;
  readonly level: number;
  readonly maxHp: number;
  readonly attack: number;
  readonly defense: number;
  /** Linh hoạt (Balance V6); tỉ lệ né đòn ngọc đỏ = AGI / (AGI + agiOffset). */
  readonly agi?: number;
  /** Optional absolute shield cap; otherwise the battle config ratio is used. */
  readonly shieldCap?: number;
  readonly behaviorId: 'basic' | 'guard' | 'heavy' | 'boss';
  readonly behaviors: readonly ('basic' | 'guard' | 'heavy' | 'energy' | 'poison')[];
  readonly tactics: MonsterTactics;
  readonly unlockRequirement?: { readonly monsterId: string; readonly wins: number };
  readonly dropPool?: readonly string[];
  readonly expReward: number;
  readonly goldReward: number;
  /** Skill tự động của quái (Balance V5), dữ liệu trong monsters.json. */
  readonly skills?: readonly MonsterSkillData[];
  /** V7: HP dưới ngưỡng này thì đòn thường/nặng vẫn ra đòn dù quái không match ngọc đỏ. */
  readonly gemlessAttackBelowHp?: number;
}

/**
 * Skill quái. Quái tự dùng khi đủ `energyCost` và thỏa điều kiện HP (`hpAbove`: HP > ngưỡng,
 * `hpBelow`: HP < ngưỡng); nhiều skill hợp lệ thì chọn `priority` cao nhất. Skill thay hành động lượt đó.
 */
export interface MonsterSkillData {
  readonly id: string;
  readonly name: string;
  /** Id thư mục VFX/asset của skill. */
  readonly vfxId: string;
  readonly description: string;
  readonly energyCost: number;
  readonly priority: number;
  /** V7: số lần tối đa mỗi trận; thiếu = không giới hạn. */
  readonly maxUses?: number;
  readonly hpAbove?: number;
  readonly hpBelow?: number;
  /** Sát thương = baseDamage + ATK × attackMultiplier, rồi đi pipeline giảm sát thương/khiên của nhân vật. */
  readonly baseDamage?: number;
  readonly attackMultiplier?: number;
  /** Né tránh cộng thêm; hết theo số lần bị roll né (charges) hoặc số hành động của người chơi (turns). */
  readonly dodgeBonus?: number;
  readonly dodgeCharges?: number;
  readonly dodgeTurns?: number;
  /** Hồi HP theo % maxHP: hồi ngay khi dùng và mỗi đầu lượt quái cho tới hết healTurns. */
  readonly healMaxHpRatio?: number;
  readonly healTurns?: number;
  readonly selfShield?: number;
  readonly playerBurnMaxHpRatio?: number;
  readonly playerBurnTurns?: number;
  readonly playerPoisonAtkRatio?: number;
  readonly playerPoisonTurns?: number;
  readonly playerControl?: 'stun' | 'freeze';
  readonly playerControlChance?: number;
  readonly playerControlTurns?: number;
  readonly playerHealReduction?: number;
  readonly playerHealReductionTurns?: number;
}

export interface MonsterTactics {
  /** Weight for attack gems and direct damage decisions. */
  readonly attack: number;
  /** Weight for guard/defensive decisions. */
  readonly defense: number;
  /** Reserved weight for future monster healing actions. */
  readonly heal: number;
  /** Weight for shield gems and future shield actions. */
  readonly shield: number;
  /** Weight for energy gems when the monster is below its energy cap. */
  readonly energy: number;
  /** Reserved weight for future poison actions. */
  readonly poison: number;
}

export interface MonsterBattleState extends MonsterDefinition {
  readonly baseDefense: number;
  readonly currentHp: number;
  readonly energy: number;
  readonly shield: number;
  readonly defenseReductionTurns: number;
  readonly defenseReductionPercent: number;
  readonly poisonPotency: number;
  readonly poisonTurns: number;
  /** Số tầng độc đang chịu (mô hình độc theo tầng V2). */
  readonly poisonStacks: number;
  /** Phần potency trong poisonPotency đến từ skill (Vạn Diệp Độc Chú), cộng dồn với tầng ngọc tím. */
  readonly skillPoisonPotency: number;
  /** Burning state applied by the Fire hero passive. */
  readonly burningPotency: number;
  readonly burningTurns: number;
  readonly controlEffect?: 'stun' | 'freeze';
  readonly controlTurns: number;
  readonly damageTakenBonus: number;
  readonly damageTakenBonusTurns: number;
  /** Số hành động của người chơi mà DEF cộng từ guard còn hiệu lực. */
  readonly guardTurns: number;
  /** Né cộng thêm từ skill quái; còn hiệu lực khi charges > 0 hoặc turns > 0. */
  readonly dodgeBonus: number;
  readonly dodgeBonusCharges: number;
  readonly dodgeBonusTurns: number;
  /** Hồi máu theo lượt (Lục Diệp Ẩn Tung), tick đầu lượt quái. */
  readonly healPerTurn: number;
  readonly healTurns: number;
  /** Quái vừa bị hoãn đòn (Thủy) — "Làm chậm" cho Hàn Tức Ngưng Kết; đếm theo hành động người chơi. */
  readonly slowedTurns: number;
  /** Số tầng Cuồng Nộ của hành động đang resolve (tính lại từ `turn` mỗi hành động). */
  readonly enrageStacks: number;
  /** Số lần đã dùng từng skill quái trong trận (cho `maxUses`). */
  readonly skillUses: Readonly<Record<string, number>>;
  /** Skill dự kiến dùng ở lượt tới khi nextAction = 'skill'. */
  readonly nextSkillId?: string;
  /** 'long_mieu_lien_kich' chỉ còn để đọc snapshot cũ; core coi như 'skill'. */
  readonly nextAction: 'basic' | 'guard' | 'heavy' | 'energy' | 'poison' | 'telegraph' | 'skill' | 'long_mieu_lien_kich';
  readonly phase: 1 | 2;
  readonly actionCount: number;
}

export interface BattleConfig {
  readonly match3: Match3Config;
  readonly maxTurns: number;
  readonly energyCap: number;
  readonly shieldCapMaxHpRatio: number;
  readonly comboMultipliers: readonly number[];
  readonly playerTurnSeconds: number;
}

export interface SkillAction {
  readonly kind: 'skill';
  readonly skillId: string;
  readonly actionId: string;
}

export interface AbandonAction {
  readonly kind: 'abandon';
  readonly actionId: string;
}

export interface TimeoutAction {
  readonly kind: 'timeout';
  readonly actionId: string;
}

export type BattleAction = SwapAction | SkillAction | AbandonAction | TimeoutAction;

export interface BattleState {
  readonly battleId: string;
  readonly seed: number;
  readonly rngState: number;
  readonly balanceVersion: number;
  readonly board: Board;
  readonly turn: number;
  readonly maxTurns: number;
  readonly phase: BattlePhase;
  readonly player: PlayerBattleState;
  readonly playerSkipTurns: number;
  /** Hiệu ứng khiến nhân vật mất lượt, để UI hiện Choáng hay Đóng băng. */
  readonly playerSkipEffect?: 'stun' | 'freeze';
  /** Số lượt hành động tấn công của quái đang bị hoãn (legacy field). */
  readonly monsterActionDelay: number;
  /** Consecutive monster damage events received by the player. */
  readonly damageTakenStreak: number;
  readonly monster: MonsterBattleState;
  readonly telegraph: string;
  readonly terminalReason?: string;
  readonly actionLog: readonly BattleAction[];
}

export interface BattleOutcome {
  readonly result: 'VICTORY' | 'DEFEAT' | 'ABANDON';
  readonly reason: string;
  readonly battleId: string;
  readonly turn: number;
  readonly monsterId?: string;
  readonly seed?: number;
}

export interface BattleResolveResult {
  readonly nextState: BattleState;
  readonly events: readonly GameEvent[];
  readonly accepted: boolean;
}

export interface CoordPair {
  readonly from: Coord;
  readonly to: Coord;
}

export interface GameEvent {
  readonly eventId: string;
  readonly actionId: string;
  readonly battleId: string;
  readonly turn: number;
  readonly type:
    | 'SWAP_STARTED'
    | 'TURN_TIMED_OUT'
    | 'MONSTER_THINKING'
    | 'MONSTER_MOVE_SELECTED'
    | 'MONSTER_SWAP_STARTED'
    | 'MONSTER_SWAP_RESOLVED'
    | 'SWAP_REJECTED'
    | 'MATCH_FOUND'
    | 'GEMS_CLEARED'
    | 'GEMS_FALLING'
    | 'GEMS_REFILLED'
    | 'CASCADE_STARTED'
    | 'BOARD_RESHUFFLED'
    | 'BOARD_FORCED_STABILIZE'
    | 'GEMS_EFFECT_APPLIED'
    | 'DAMAGE_APPLIED'
    | 'MONSTER_DODGED'
    | 'PLAYER_DODGED'
    | 'HEAL_APPLIED'
    | 'SHIELD_GAINED'
    | 'ENERGY_GAINED'
    | 'MONSTER_ACTION_SKIPPED'
    | 'POISON_APPLIED'
    | 'POISON_TICKED'
    | 'BURNING_APPLIED'
    | 'BURNING_TICKED'
    | 'MONSTER_TELEGRAPH'
    | 'MONSTER_ATTACKED'
    | 'MONSTER_GUARDED'
    | 'MONSTER_SKILL_USED'
    | 'MONSTER_ACTION_DELAYED'
    | 'PASSIVE_TRIGGERED'
    | 'DEFENSE_REDUCED'
    | 'PLAYER_TURN_SKIPPED'
    | 'SKILL_USED'
    | 'ENERGY_STOLEN'
    | 'CONTROL_APPLIED'
    | 'DAMAGE_VULNERABILITY_APPLIED'
    | 'DAMAGE_REFLECTED'
    | 'MONSTER_BUFF_APPLIED'
    | 'HEAL_REDUCTION_APPLIED'
    | 'TURN_STARTED'
    | 'BATTLE_WON'
    | 'BATTLE_LOST'
    | 'BATTLE_ABANDONED';
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface PlayerProfile {
  readonly level: number;
  readonly exp: number;
  readonly gold: number;
  readonly attributes: Attributes;
  readonly unspentPoints: number;
}

export const ELEMENT_IDS = ['metal', 'wood', 'water', 'fire', 'earth'] as const;
export type ElementId = (typeof ELEMENT_IDS)[number];

export interface MonsterProgress {
  readonly wins: number;
  readonly unlocked: boolean;
}

export interface RewardGrant {
  readonly rewardType: 'battle';
  readonly battleId: string;
  readonly exp: number;
  readonly gold: number;
  readonly item?: ItemInstance;
}

export interface PendingReward {
  readonly claimId: string;
  readonly battleId: string;
  readonly item: ItemInstance;
}

export interface RewardJournalEntry {
  readonly claimId: string;
  readonly battleId: string;
  readonly grantedAt: number;
  readonly reward: RewardGrant;
}

export interface GameSettings {
  readonly music: boolean;
  readonly sfx: boolean;
  readonly reducedMotion: boolean;
  readonly devMode: boolean;
  readonly gender: 'male' | 'female';
  readonly element: ElementId;
}

export interface LocalSaveV1 {
  readonly schemaVersion: 1;
  readonly profile: PlayerProfile;
  readonly inventory: readonly ItemInstance[];
  readonly equipment: EquipmentSlots;
  readonly monsterProgress: Readonly<Record<string, MonsterProgress>>;
  readonly pendingRewards: readonly PendingReward[];
  readonly rewardJournal: readonly RewardJournalEntry[];
  readonly settings: GameSettings;
  readonly activeBattle?: BattleState;
}

export interface ResolveResult {
  readonly nextState: Match3State;
  readonly events: readonly GameEvent[];
  readonly accepted: boolean;
}
