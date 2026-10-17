import type { BattleConfig, Match3Config } from './types';

export const DEFAULT_MATCH3_CONFIG: Match3Config = {
  rows: 6,
  cols: 6,
  gemTypes: ['attack', 'heal', 'shield', 'energy', 'poison'],
  // A small nudge towards attack gems keeps combat active without making
  // healing, shielding, energy or poison disappear from the board.
  gemWeights: { attack: 6, heal: 5, shield: 5, energy: 5, poison: 5 },
  maxCascade: 12,
  maxGenerationAttempts: 100,
  balanceVersion: 1,
};

export const DEFAULT_BATTLE_CONFIG: BattleConfig = {
  match3: DEFAULT_MATCH3_CONFIG,
  maxTurns: 24,
  energyCap: 100,
  shieldCapMaxHpRatio: 0.5,
  comboMultipliers: [1, 1.2, 1.4, 1.6],
  playerTurnSeconds: 10,
};
