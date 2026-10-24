import { clampPlayerState } from '../player';
import { nextInt } from '../rng';
import { CHARACTER_DATA, MONSTER_COMBAT_BALANCE, MONSTER_DATA } from '../game-data';
import { monsterAttackIncoming, reflectMonsterDamage, resolveIncomingMonsterDamage } from './monster-combat';
import { dodgeChanceFromAgi } from '../combat-formulas';
import { enrageMonsterHealMultiplier } from '../enrage';
import type { BattleState, GameEvent, MonsterBattleState, MonsterSkillData } from '../types';

export interface MonsterSkillContext {
  readonly state: BattleState;
  readonly skill: MonsterSkillData;
  readonly actionId: string;
  readonly startSequence: number;
  /** Trần khiên của quái (theo `shieldCap` hoặc tỉ lệ maxHP của config). */
  readonly shieldCap: number;
  readonly createEvent: (
    sequence: number,
    type: GameEvent['type'],
    payload?: Readonly<Record<string, unknown>>,
  ) => GameEvent;
}

export interface MonsterSkillResult {
  readonly state: BattleState;
  readonly events: readonly GameEvent[];
  readonly nextSequence: number;
}

/** Dữ liệu skill luôn lấy từ monsters.json theo id quái để snapshot cũ cũng dùng số mới nhất. */
export function monsterSkills(monsterId: string): readonly MonsterSkillData[] {
  return MONSTER_DATA.definitions[monsterId]?.skills ?? [];
}

export function monsterSkillById(monsterId: string, skillId: string | undefined): MonsterSkillData | undefined {
  return skillId ? monsterSkills(monsterId).find((skill) => skill.id === skillId) : undefined;
}

/**
 * Skill hợp lệ: đủ nộ, thỏa ngưỡng HP (`hpAbove`: HP > ngưỡng, `hpBelow`: HP < ngưỡng) và chưa dùng
 * hết `maxUses`; ưu tiên `priority` cao nhất.
 */
export function selectMonsterSkill(
  monster: Pick<MonsterBattleState, 'id' | 'energy' | 'currentHp' | 'maxHp'> & { readonly skillUses?: MonsterBattleState['skillUses'] },
): MonsterSkillData | undefined {
  const hpRatio = monster.maxHp > 0 ? monster.currentHp / monster.maxHp : 0;
  return monsterSkills(monster.id)
    .filter((skill) => monster.energy >= skill.energyCost)
    .filter((skill) => skill.maxUses === undefined || (monster.skillUses?.[skill.id] ?? 0) < skill.maxUses)
    .filter((skill) => skill.hpAbove === undefined || hpRatio > skill.hpAbove)
    .filter((skill) => skill.hpBelow === undefined || hpRatio < skill.hpBelow)
    .reduce<MonsterSkillData | undefined>((best, skill) => (!best || skill.priority > best.priority ? skill : best), undefined);
}

/** Né hiệu lực của quái = né theo AGI + buff né đang còn (charges hoặc turns), tối đa `dodge.maxChance`. */
export function monsterDodgeChance(monster: MonsterBattleState): number {
  const bonusActive = monster.dodgeBonusCharges > 0 || monster.dodgeBonusTurns > 0;
  return dodgeChanceFromAgi(monster.agi, bonusActive ? monster.dodgeBonus : 0);
}

export function resolveMonsterSkill(context: MonsterSkillContext): MonsterSkillResult {
  const { skill, createEvent, actionId } = context;
  let player = clampPlayerState(context.state.player);
  let monster: MonsterBattleState = {
    ...context.state.monster,
    energy: Math.max(0, context.state.monster.energy - skill.energyCost),
    nextSkillId: undefined,
    skillUses: { ...context.state.monster.skillUses, [skill.id]: (context.state.monster.skillUses?.[skill.id] ?? 0) + 1 },
  };
  let rngState = context.state.rngState;
  let damageTakenStreak = 0;
  let playerSkipTurns = context.state.playerSkipTurns;
  let playerSkipEffect = context.state.playerSkipEffect;
  const events: GameEvent[] = [];
  let sequence = context.startSequence;
  const skillActionId = `${actionId}:monster:${monster.actionCount}:${skill.id}`;

  events.push(createEvent(sequence++, 'MONSTER_SKILL_USED', {
    actor: 'monster',
    actionId: skillActionId,
    skillId: skill.id,
    name: skill.name,
    vfxId: skill.vfxId,
    label: `${monster.name} dùng ${skill.name}`,
    energyBefore: context.state.monster.energy,
    energySpent: skill.energyCost,
    energyAfter: monster.energy,
    target: skill.attackMultiplier !== undefined || skill.baseDamage !== undefined ? 'player' : 'monster',
  }));

  if (skill.attackMultiplier !== undefined || skill.baseDamage !== undefined) {
    const raw = (skill.baseDamage ?? 0) + monster.attack * (skill.attackMultiplier ?? 0);
    const incoming = monsterAttackIncoming(player, raw);
    const damage = resolveIncomingMonsterDamage(player, monster, incoming, context.state.damageTakenStreak, createEvent, sequence);
    events.push(...damage.events);
    sequence = damage.nextSequence;
    damageTakenStreak = damage.damageTakenStreak;
    player = damage.player;
    events.push(createEvent(sequence++, 'DAMAGE_APPLIED', {
      actor: 'monster',
      source: skill.id,
      actionId: skillActionId,
      amount: damage.incoming - damage.absorbed,
      requested: damage.incoming,
      rawIncoming: incoming,
      baseDamage: raw,
      damageMultiplier: damage.damageMultiplier,
      shieldAbsorbed: damage.absorbed,
      shieldRemaining: player.shield,
      shieldBroken: damage.absorbed > 0 && player.shield === 0,
      target: 'player',
      lethal: player.currentHp <= 0,
    }));
    const reflected = reflectMonsterDamage(player, monster, damage.incoming, createEvent, sequence);
    monster = reflected.monster;
    events.push(...reflected.events);
    sequence = reflected.nextSequence;
  }

  if (player.currentHp > 0 && skill.playerBurnMaxHpRatio && skill.playerBurnTurns) {
    const potency = Math.max(1, Math.round(player.stats.maxHp * skill.playerBurnMaxHpRatio));
    player = { ...player, burningPotency: potency, burningTurns: skill.playerBurnTurns };
    events.push(createEvent(sequence++, 'BURNING_APPLIED', {
      actor: 'monster', amount: potency, turns: skill.playerBurnTurns, target: 'player', source: skill.id,
    }));
  }

  if (player.currentHp > 0 && skill.playerPoisonAtkRatio && skill.playerPoisonTurns) {
    const requested = Math.max(1, Math.round(monster.attack * skill.playerPoisonAtkRatio));
    const cap = Math.max(1, Math.round(player.stats.maxHp * CHARACTER_DATA.limits.poisonMaxHpRatio));
    const applied = Math.max(0, Math.min(cap - player.poisonPotency, requested));
    player = clampPlayerState({
      ...player,
      poisonPotency: Math.min(cap, player.poisonPotency + requested),
      poisonTurns: Math.max(player.poisonTurns, skill.playerPoisonTurns),
      poisonStacks: Math.min(CHARACTER_DATA.combat.poisonMaxStacks, player.poisonStacks + 1),
    });
    events.push(createEvent(sequence++, 'POISON_APPLIED', {
      actor: 'monster', actionId: skillActionId, amount: applied, requested,
      turns: player.poisonTurns, target: 'player', source: skill.id,
    }));
  }

  if (player.currentHp > 0 && skill.playerHealReduction && skill.playerHealReductionTurns) {
    player = { ...player, healReduction: skill.playerHealReduction, healReductionTurns: skill.playerHealReductionTurns };
    events.push(createEvent(sequence++, 'HEAL_REDUCTION_APPLIED', {
      actor: 'monster', amount: skill.playerHealReduction, turns: skill.playerHealReductionTurns,
      target: 'player', source: skill.id,
    }));
  }

  if (player.currentHp > 0 && skill.playerControl && (skill.playerControlChance ?? 0) > 0) {
    const roll = nextInt(rngState, 100);
    rngState = roll.state;
    const chance = skill.playerControlChance ?? 0;
    const hit = roll.value < chance * 100;
    const immune = player.controlImmunityTurns > 0;
    if (hit && !immune) {
      playerSkipTurns = Math.max(playerSkipTurns, skill.playerControlTurns ?? 1);
      playerSkipEffect = skill.playerControl;
    }
    events.push(createEvent(sequence++, 'CONTROL_APPLIED', {
      actor: 'monster', effect: skill.playerControl, turns: skill.playerControlTurns ?? 1,
      chance, roll: roll.value, applied: hit && !immune, resisted: hit && immune,
      target: 'player', source: skill.id,
    }));
  }

  if (skill.selfShield) {
    const amount = Math.max(0, Math.min(context.shieldCap - monster.shield, skill.selfShield));
    monster = { ...monster, shield: monster.shield + amount };
    events.push(createEvent(sequence++, 'SHIELD_GAINED', {
      actor: 'monster', amount, requested: skill.selfShield, cap: context.shieldCap, target: 'monster', source: skill.id,
    }));
  }

  if (skill.dodgeBonus) {
    monster = {
      ...monster,
      dodgeBonus: skill.dodgeBonus,
      dodgeBonusCharges: skill.dodgeCharges ?? 0,
      dodgeBonusTurns: skill.dodgeTurns ?? 0,
    };
    events.push(createEvent(sequence++, 'MONSTER_BUFF_APPLIED', {
      actor: 'monster', buff: 'dodge', amount: skill.dodgeBonus, dodgeChance: monsterDodgeChance(monster),
      charges: monster.dodgeBonusCharges, turns: monster.dodgeBonusTurns, target: 'monster', source: skill.id,
    }));
  }

  if (skill.healMaxHpRatio && skill.healTurns) {
    const perTurn = Math.max(1, Math.round(monster.maxHp * skill.healMaxHpRatio));
    const now = Math.max(1, Math.round(perTurn * enrageMonsterHealMultiplier(monster.enrageStacks ?? 0)));
    const healed = Math.min(monster.maxHp - monster.currentHp, now);
    // Hồi ngay lượt dùng skill; các lượt còn lại tick đầu lượt quái (Cuồng Nộ áp lúc tick).
    monster = { ...monster, currentHp: monster.currentHp + healed, healPerTurn: perTurn, healTurns: skill.healTurns - 1 };
    events.push(createEvent(sequence++, 'HEAL_APPLIED', {
      actor: 'monster', amount: healed, requested: now, remainingTurns: monster.healTurns, target: 'monster', source: skill.id,
    }));
  }

  return {
    state: { ...context.state, player, monster, rngState, damageTakenStreak, playerSkipTurns, playerSkipEffect },
    events,
    nextSequence: sequence,
  };
}
