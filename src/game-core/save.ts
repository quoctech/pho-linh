import { MONSTER_DEFINITIONS } from './monsters/monster-definitions';
import { createDefaultProfile } from './progression';
import type { BattleState, GameSettings, LocalSaveV1 } from './types';

export const SAVE_VERSION = 1;
export const DEFAULT_SETTINGS: GameSettings = { music: true, sfx: true, reducedMotion: false };

export function createDefaultSave(): LocalSaveV1 {
  return {
    schemaVersion: SAVE_VERSION,
    profile: createDefaultProfile(),
    inventory: [],
    equipment: {},
    monsterProgress: Object.fromEntries(Object.values(MONSTER_DEFINITIONS).map((monster) => [monster.id, { wins: 0, unlocked: monster.id === 'mist_blob' }])),
    pendingRewards: [],
    rewardJournal: [],
    settings: DEFAULT_SETTINGS,
  };
}

export function migrateSave(raw: unknown, legacyBattle?: BattleState): LocalSaveV1 {
  const fallback = createDefaultSave();
  if (!isRecord(raw)) return legacyBattle && isResumableBattle(legacyBattle) ? { ...fallback, activeBattle: legacyBattle } : fallback;
  const version = raw['schemaVersion'];
  if (version === 1 && isLocalSave(raw)) return { ...fallback, ...raw, settings: { ...DEFAULT_SETTINGS, ...raw.settings } };
  const oldBattle = isRecord(raw['state']) && isBattleState(raw['state']) ? raw['state'] : legacyBattle;
  return oldBattle && isResumableBattle(oldBattle) ? { ...fallback, activeBattle: oldBattle } : fallback;
}

export function isLocalSave(value: unknown): value is LocalSaveV1 {
  if (!isRecord(value) || value['schemaVersion'] !== SAVE_VERSION) return false;
  const profile = value['profile'];
  const attributes = isRecord(profile) ? profile['attributes'] : undefined;
  const settings = value['settings'];
  const validNumber = (entry: unknown) => typeof entry === 'number' && Number.isFinite(entry) && entry >= 0;
  const validAttributes = isRecord(attributes) && ['str', 'vit', 'agi', 'int'].every((key) => validNumber(attributes[key]));
  const validSettings = isRecord(settings) && typeof settings['music'] === 'boolean' && typeof settings['sfx'] === 'boolean' && typeof settings['reducedMotion'] === 'boolean';
  return isRecord(profile) && validAttributes && validNumber(profile['level']) && profile['level'] >= 1 && validNumber(profile['exp']) && validNumber(profile['gold']) && validNumber(profile['unspentPoints']) && Array.isArray(value['inventory']) && value['inventory'].length <= 60 && Array.isArray(value['pendingRewards']) && Array.isArray(value['rewardJournal']) && isRecord(value['equipment']) && isRecord(value['monsterProgress']) && validSettings;
}

export function isBattleState(value: unknown): value is BattleState {
  if (!isRecord(value)) return false;
  const board = value['board'];
  return typeof value['battleId'] === 'string' && Array.isArray(board) && board.length === 6 && board.every((row) => Array.isArray(row) && row.length === 6) && isRecord(value['player']) && isRecord(value['monster']) && typeof value['phase'] === 'string';
}

export function isResumableBattle(value: BattleState): boolean {
  return !['VICTORY', 'DEFEAT', 'ABANDON'].includes(value.phase);
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
