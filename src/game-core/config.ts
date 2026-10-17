import type { BattleConfig, Match3Config } from './types';

export const DEFAULT_MATCH3_CONFIG: Match3Config = {
  rows: 6,
  cols: 6,
  gemTypes: ['attack', 'heal', 'shield', 'energy', 'poison'],
  maxCascade: 12,
  maxGenerationAttempts: 100,
  balanceVersion: 1,
};

export const DEFAULT_BATTLE_CONFIG: BattleConfig = {
  match3: DEFAULT_MATCH3_CONFIG,
  maxTurns: 20,
  energyCap: 100,
  shieldCapMaxHpRatio: 0.5,
  comboMultipliers: [1, 1.2, 1.4, 1.6],
  playerTurnSeconds: 10,
};
