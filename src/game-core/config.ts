import type { Match3Config } from './types';

export const DEFAULT_MATCH3_CONFIG: Match3Config = {
  rows: 6,
  cols: 6,
  gemTypes: ['attack', 'heal', 'shield', 'energy', 'poison'],
  maxCascade: 12,
  maxGenerationAttempts: 100,
  balanceVersion: 1,
};
