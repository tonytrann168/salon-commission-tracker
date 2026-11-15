import hangnailJson from './config/hangnail.json';
import type { Difficulty } from './types';

/**
 * Story 064 (hard clients only): a hangnail on one finger, the Nipper, a small slip and first aid. Pure rules and
 * config; the station draws it and the chat panel says her lines. Config: config/hangnail.json.
 */
export interface HangnailConfig {
  chance: number;
  trimMs: number;
  slipMs: number;
  roughPressure: number;
  trimmedMood: number;
  leftMood: number;
  slipMood: number;
  aidMood: number;
  sorryMood: number;
  sorryPattern: RegExp;
  lines: { notice: string; thanks: string; ouch: string; afterAid: string; left: string };
}

export function parseHangnailConfig(raw: unknown): HangnailConfig {
  const c = (raw ?? {}) as Record<string, unknown> & { lines?: Record<string, unknown> };
  const fail = (what: string): never => {
    throw new Error(`hangnail.json: ${what}`);
  };
  const num = (name: string, min: number, max: number): number => {
    const v = c[name];
    return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : fail(`"${name}" must be from ${min} to ${max}`);
  };
  const line = (name: string): string => (typeof c.lines?.[name] === 'string' && (c.lines[name] as string).trim() ? (c.lines[name] as string) : fail(`"lines.${name}" is missing`));
  let sorryPattern: RegExp;
  try {
    sorryPattern = new RegExp(typeof c.sorryPattern === 'string' ? c.sorryPattern : fail('"sorryPattern" is missing'), 'iu');
  } catch {
    return fail('"sorryPattern" is not a valid pattern');
  }
  const config = {
    chance: num('chance', 0, 1),
    trimMs: num('trimMs', 200, 5000),
    slipMs: num('slipMs', 50, 2000),
    roughPressure: num('roughPressure', 0, 1),
    trimmedMood: num('trimmedMood', 0, 20),
    leftMood: num('leftMood', -30, 0),
    slipMood: num('slipMood', -40, 0),
    aidMood: num('aidMood', 0, 30),
    sorryMood: num('sorryMood', 0, 20),
    sorryPattern,
    lines: { notice: line('notice'), thanks: line('thanks'), ouch: line('ouch'), afterAid: line('afterAid'), left: line('left') },
  };
  if (config.slipMs >= config.trimMs) fail('"slipMs" must be shorter than trimMs');
  return config;
}

export const HANGNAIL_CONFIG: HangnailConfig = parseHangnailConfig(hangnailJson);

const hash = (text: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h;
};

/** Which nail has a hangnail this visit (hard clients only, by a stable hash of the visit), or null. */
export function planHangnail(difficulty: Difficulty, visit: string, nails: number, config: HangnailConfig = HANGNAIL_CONFIG): number | null {
  if (difficulty !== 'hard' || nails <= 0) return null;
  if ((hash(`hangnail:${visit}`) % 1000) / 1000 >= config.chance) return null;
  // Not the thumb: a finger the player can reach easily (index to pinky).
  return 1 + (hash(`hangnail-nail:${visit}`) % Math.max(1, Math.min(4, nails - 1)));
}

export type TrimOutcome = 'clean' | 'slip' | 'short';

/**
 * How a trim went: held steadily for trimMs is clean; a quick snip (let go before slipMs) or a hard press slips; in
 * between nothing happens yet ("hold a little longer").
 */
export function trimOutcome(heldMs: number, pressure: number, config: HangnailConfig = HANGNAIL_CONFIG): TrimOutcome {
  if (pressure > config.roughPressure || heldMs < config.slipMs) return 'slip';
  return heldMs >= config.trimMs ? 'clean' : 'short';
}

/** The player said sorry (English or Vietnamese). */
export const saysSorry = (line: string, config: HangnailConfig = HANGNAIL_CONFIG): boolean => config.sorryPattern.test(line);
