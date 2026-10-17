export interface RngResult {
  readonly value: number;
  readonly state: number;
}

const FALLBACK_SEED = 0x6d2b79f5;

export function normalizeSeed(seed: number): number {
  const normalized = seed >>> 0;
  return normalized === 0 ? FALLBACK_SEED : normalized;
}

export function nextRandom(state: number): RngResult {
  let next = normalizeSeed(state);
  next += 0x6d2b79f5;
  let result = Math.imul(next ^ (next >>> 15), 1 | next);
  result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);

  return {
    value: ((result ^ (result >>> 14)) >>> 0) / 4294967296,
    state: next >>> 0,
  };
}

export function nextInt(state: number, maxExclusive: number): RngResult {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error('maxExclusive must be a positive integer');
  }

  const random = nextRandom(state);
  return {
    value: Math.floor(random.value * maxExclusive),
    state: random.state,
  };
}
