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
  readonly agiBonus: number;
  readonly power: number;
}

export type EquipmentSlot = 'weapon' | 'armor' | 'charm';
export type ItemRarity = 'common' | 'rare';

export interface EquipmentBonuses {
  readonly maxHp?: number;
  readonly atk?: number;
  readonly defense?: number;
  readonly skillPower?: number;
  readonly agiBonus?: number;
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
  readonly attributes: Attributes;
  readonly stats: DerivedStats;
  readonly currentHp: number;
  readonly shield: number;
  readonly energy: number;
}

export interface MonsterDefinition {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly maxHp: number;
  readonly attack: number;
  readonly defense: number;
  readonly behaviorId: 'basic' | 'guard' | 'heavy' | 'boss';
  readonly behaviors: readonly ('basic' | 'guard' | 'heavy')[];
  readonly unlockRequirement?: { readonly monsterId: string; readonly wins: number };
  readonly expReward: number;
  readonly goldReward: number;
}

export interface MonsterBattleState extends MonsterDefinition {
  readonly baseDefense: number;
  readonly currentHp: number;
  readonly poisonPotency: number;
  readonly poisonTurns: number;
  readonly nextAction: 'basic' | 'guard' | 'heavy';
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
  readonly skillId: 'cloud_break_lantern';
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
    | 'HEAL_APPLIED'
    | 'SHIELD_GAINED'
    | 'ENERGY_GAINED'
    | 'POISON_APPLIED'
    | 'POISON_TICKED'
    | 'MONSTER_TELEGRAPH'
    | 'MONSTER_ATTACKED'
    | 'MONSTER_GUARDED'
    | 'SKILL_USED'
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
