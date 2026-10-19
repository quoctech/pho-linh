import { CHARACTER_DATA, createBattleConfigFromData, COMBAT_DATA } from './game-data';
import type { BattleConfig, Match3Config } from './types';

export const DEFAULT_MATCH3_CONFIG: Match3Config = {
  ...createBattleConfigFromData().match3,
};

export const DEFAULT_BATTLE_CONFIG: BattleConfig = {
  match3: DEFAULT_MATCH3_CONFIG,
  maxTurns: COMBAT_DATA.battle.maxTurns,
  energyCap: CHARACTER_DATA.limits.maxEnergy,
  shieldCapMaxHpRatio: CHARACTER_DATA.limits.shieldMaxHpRatio,
  comboMultipliers: [...COMBAT_DATA.match3.comboMultipliers],
  playerTurnSeconds: COMBAT_DATA.battle.playerTurnSeconds,
};
