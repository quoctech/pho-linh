/**
 * Bot mô phỏng cân bằng PK: chạy trên chính game-core + JSON hiện hành.
 *
 *   npm run balance:sim                       # bot "mixed", 60 seed
 *   MODE=greedy N=30 npm run balance:sim      # greedy | mixed | random
 *   LV=3 MON=bamboo_mantis npm run balance:sim
 *
 * - greedy: chọn nước có giá trị cao nhất theo nhóm ngọc cascade đầu (không nhìn trước RNG).
 * - random: nước hợp lệ ngẫu nhiên (cận dưới).
 * - mixed: 50/50 giữa hai kiểu trên — xấp xỉ người chơi trung bình.
 * Đủ nộ thì dùng skill đắt nhất có thể. Thời gian = animation thật (battle.scene) + THINK ms/lượt.
 */
import {
  CHARACTER_DATA,
  MONSTER_DEFINITIONS,
  createBattleState,
  createPlayerBattleState,
  equipmentBonuses,
  findLegalMoves,
  resolveBattleAction,
  type BattleAction,
  type BattleState,
  type ElementId,
  type GameEvent,
} from '../src/game-core/index';

const ELEMENTS: readonly ElementId[] = ['metal', 'wood', 'water', 'fire', 'earth'];
const MODE = process.env['MODE'] ?? 'mixed';
const N = Number(process.env['N'] ?? 60);
const THINK_MS = Number(process.env['THINK'] ?? 4000);
const TURN_CAP = 200;
const monsterIds = process.env['MON'] ? [process.env['MON']] : Object.keys(MONSTER_DEFINITIONS);

// Khớp `durationForEvent` trong src/app/battle/battle.scene.ts (bỏ qua reduced motion).
function eventMs(event: GameEvent): number {
  const p = event.payload as Record<string, unknown>;
  switch (event.type) {
    case 'SWAP_STARTED': return 160;
    case 'MATCH_FOUND': return 180;
    case 'GEMS_CLEARED': return 520;
    case 'DAMAGE_APPLIED': return p['target'] === 'monster' ? 560 : 360;
    case 'MONSTER_DODGED': return 560;
    case 'HEAL_APPLIED': return 360;
    case 'POISON_APPLIED': return p['target'] === 'monster' ? 720 : 420;
    case 'POISON_TICKED': return 520;
    case 'GEMS_FALLING': return 200;
    case 'GEMS_REFILLED': return 160;
    case 'MONSTER_ATTACKED': return p['lethal'] === true ? 1400 : 700;
    case 'CONTROL_APPLIED': return 600;
    case 'PLAYER_DODGED': return 700;
    case 'MONSTER_BUFF_APPLIED': return 620;
    case 'BURNING_TICKED': return 520;
    case 'SKILL_USED': return 800;
    case 'MONSTER_SKILL_USED': return 1150;
    case 'PLAYER_TURN_SKIPPED': return 700;
    case 'MONSTER_THINKING': return Number(p['seconds'] ?? 0.6) * 1000;
    case 'MONSTER_MOVE_SELECTED': return 350;
    case 'MONSTER_SWAP_STARTED': return 220;
    case 'MONSTER_SWAP_RESOLVED': return 100;
    case 'BATTLE_WON': return 1000;
    case 'BATTLE_LOST': return 1300;
    default: return 80;
  }
}

/**
 * Chấm điểm như người chơi đọc bàn cờ: chỉ nhìn nhóm ngọc của cascade đầu tiên (ngọc rơi xuống
 * và phản đòn của quái là RNG, người thật không đoán được). Giá trị ước theo chỉ số hiện tại.
 */
function score(state: BattleState, events: readonly GameEvent[]): number {
  const first = events.find((event) => event.type === 'GEMS_CLEARED');
  const counts = (first?.payload['gemCounts'] ?? {}) as Record<string, number>;
  const { player, monster } = state;
  const { atk, maxHp, defense } = player.stats;
  const combat = CHARACTER_DATA.combat;
  const attack = (counts['attack'] ?? 0) * atk * combat.attackTileFactor;
  if (attack >= monster.currentHp + monster.shield) return 1e9;
  const poison = monster.poisonStacks < combat.poisonMaxStacks ? (counts['poison'] ?? 0) * atk * combat.poisonAtkFactor * 2 : 0;
  const heal = Math.min(maxHp - player.currentHp, (counts['heal'] ?? 0) * maxHp * combat.heal.maxHpFactor);
  const shieldRoom = player.shield < maxHp * 0.25 ? 1 : 0.3;
  const shield = (counts['shield'] ?? 0) * defense * combat.shield.defFactor * shieldRoom;
  const energy = player.energy < 100 ? (counts['energy'] ?? 0) * atk * 0.15 : 0;
  // Máu thấp thì ưu tiên phòng thủ.
  const danger = player.currentHp < maxHp * 0.4 ? 1.6 : 1;
  return attack + poison + (heal + shield) * danger + energy;
}

function pickAction(state: BattleState, index: number): BattleAction | undefined {
  const actionId = `sim-${index}`;
  const skills = CHARACTER_DATA.elementSkills[state.player.element];
  const affordable = [
    { id: skills.primarySkillId, cost: skills.primarySkill.energyCost },
    { id: skills.secondarySkillId, cost: skills.secondarySkill.energyCost },
  ].filter((skill) => state.player.energy >= skill.cost).sort((a, b) => b.cost - a.cost);
  if (affordable.length) return { kind: 'skill', skillId: affordable[0].id, actionId };

  const moves = findLegalMoves(state.board);
  if (!moves.length) return undefined;
  const coin = ((index * 2654435761 + state.rngState) >>> 0) % 2 === 0;
  if (MODE === 'random' || (MODE === 'mixed' && coin)) {
    const move = moves[((index * 7919 + state.rngState) >>> 0) % moves.length];
    return { kind: 'swap', from: move.from, to: move.to, actionId };
  }
  let best: BattleAction | undefined;
  let bestScore = -Infinity;
  for (const move of moves) {
    const action: BattleAction = { kind: 'swap', from: move.from, to: move.to, actionId };
    const result = resolveBattleAction(state, action);
    if (!result.accepted) continue;
    const value = result.nextState.phase === 'VICTORY' ? 1e9 : score(state, result.events);
    if (value > bestScore) { bestScore = value; best = action; }
  }
  return best;
}

/** Điểm thuộc tính theo cấp, chia đều STR/VIT (build phổ biến). */
function attributesForLevel(level: number) {
  const points = (level - 1) * CHARACTER_DATA.progression.attributePointsPerLevel;
  const str = Math.ceil(points / 2);
  const base = CHARACTER_DATA.baseAttributes;
  return { ...base, str: base.str + str, vit: base.vit + points - str };
}

const quantile = (values: readonly number[], q: number) => values[Math.floor(q * (values.length - 1))];

console.log(`MODE=${MODE} N=${N} THINK=${THINK_MS}ms`);
console.log('hệ      quái              lv  thắng%  lượt(trung vị)  p25-p75   HP còn%   phút');
for (const element of ELEMENTS) {
  for (const monsterId of monsterIds) {
    const level = Number(process.env['LV'] ?? MONSTER_DEFINITIONS[monsterId].level);
    const turns: number[] = [];
    const minutes: number[] = [];
    const hpLeft: number[] = [];
    let wins = 0;
    for (let seed = 1; seed <= N; seed += 1) {
      const player = createPlayerBattleState(attributesForLevel(level), equipmentBonuses([], {}), element);
      let state = createBattleState(seed * 1013, monsterId, `sim-${seed}`, undefined, player);
      let ms = 0;
      for (let index = 0; index < TURN_CAP * 2 && state.turn < TURN_CAP; index += 1) {
        if (state.phase === 'VICTORY' || state.phase === 'DEFEAT') break;
        const action = pickAction(state, index);
        if (!action) break;
        const result = resolveBattleAction(state, action);
        if (!result.accepted) continue;
        ms += THINK_MS + result.events.reduce((sum, event) => sum + eventMs(event), 0);
        state = result.nextState;
      }
      if (state.phase === 'VICTORY') {
        wins += 1;
        hpLeft.push(state.player.currentHp / state.player.stats.maxHp);
      }
      turns.push(state.turn);
      minutes.push(ms / 60000);
    }
    turns.sort((a, b) => a - b);
    minutes.sort((a, b) => a - b);
    const hp = hpLeft.length ? Math.round((100 * hpLeft.reduce((a, b) => a + b, 0)) / hpLeft.length) : 0;
    console.log(
      `${element.padEnd(7)} ${monsterId.padEnd(16)} ${String(level).padStart(3)}  ${String(Math.round((100 * wins) / N)).padStart(5)}`
      + `  ${String(quantile(turns, 0.5)).padStart(14)}  ${`${quantile(turns, 0.25)}-${quantile(turns, 0.75)}`.padEnd(8)}`
      + `  ${String(hp).padStart(6)}  ${quantile(minutes, 0.5).toFixed(1).padStart(5)}`,
    );
  }
}
