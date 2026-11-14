import talkJson from './config/service-talk.json';
import type { Difficulty } from './types';

/**
 * Story 035: the client's own lines while the station is on screen. A plan of 1–3 lines at timed moments (data), no
 * repeats within a service; questions left unanswered for `ignoreSeconds` cost a small mood dip, once. Pure; the chat
 * panel runs the timers.
 */
export interface ServiceTalkConfig {
  count: { min: number; max: number };
  firstAfterSeconds: number;
  gapSeconds: { min: number; max: number };
  ignoreSeconds: number;
  ignoreMoodDip: number;
  lines: Record<Difficulty, string[]>;
  checkout: string[];
  redo: string;
}

export function parseServiceTalk(raw: unknown): ServiceTalkConfig {
  const c = raw as Partial<ServiceTalkConfig>;
  const fail = (what: string): never => {
    throw new Error(`service-talk.json: ${what}`);
  };
  const range = (r: { min?: unknown; max?: unknown } | undefined, name: string) =>
    typeof r?.min === 'number' && typeof r?.max === 'number' && r.min >= 0 && r.min <= r.max ? { min: r.min, max: r.max } : fail(`"${name}" needs min ≤ max`);
  const texts = (list: unknown, name: string): string[] => (Array.isArray(list) && list.length > 0 && list.every((l) => typeof l === 'string' && l.trim()) ? (list as string[]) : fail(`"${name}" needs lines`));
  const count = range(c.count, 'count');
  const lines = { easy: texts(c.lines?.easy, 'lines.easy'), medium: texts(c.lines?.medium, 'lines.medium'), hard: texts(c.lines?.hard, 'lines.hard') };
  if (Object.values(lines).some((l) => l.length < count.max)) fail('each difficulty needs at least count.max lines');
  const positive = (n: unknown, name: string): number => (typeof n === 'number' && n > 0 ? n : fail(`"${name}" must be positive`));
  return {
    count,
    firstAfterSeconds: positive(c.firstAfterSeconds, 'firstAfterSeconds'),
    gapSeconds: range(c.gapSeconds, 'gapSeconds'),
    ignoreSeconds: positive(c.ignoreSeconds, 'ignoreSeconds'),
    ignoreMoodDip: typeof c.ignoreMoodDip === 'number' && c.ignoreMoodDip <= 0 ? c.ignoreMoodDip : fail('"ignoreMoodDip" must be 0 or less'),
    lines,
    checkout: texts(c.checkout, 'checkout'),
    redo: typeof c.redo === 'string' && c.redo.trim() ? c.redo : fail('"redo" needs a line'),
  };
}

export const SERVICE_TALK: ServiceTalkConfig = parseServiceTalk(talkJson);

export interface PlannedLine {
  /** Seconds after the service starts. */
  at: number;
  text: string;
}

/** The service's own lines: how many, when, which (distinct). `rand` returns [0, 1). */
export function planServiceTalk(difficulty: Difficulty, rand: () => number = Math.random, config: ServiceTalkConfig = SERVICE_TALK): PlannedLine[] {
  const n = config.count.min + Math.floor(rand() * (config.count.max - config.count.min + 1));
  const pool = [...config.lines[difficulty]];
  const plan: PlannedLine[] = [];
  let at = config.firstAfterSeconds;
  for (let i = 0; i < n && pool.length > 0; i++) {
    const [text] = pool.splice(Math.floor(rand() * pool.length), 1);
    plan.push({ at, text: text as string });
    at += config.gapSeconds.min + rand() * (config.gapSeconds.max - config.gapSeconds.min);
  }
  return plan;
}

/** Only a question waits for an answer (thanks and remarks don't). */
export const expectsAnswer = (line: string): boolean => /\?\s*["”']?\s*$/.test(line.trim());

export const checkoutLine = (rand: () => number = Math.random, config: ServiceTalkConfig = SERVICE_TALK): string => config.checkout[Math.floor(rand() * config.checkout.length)] as string;
