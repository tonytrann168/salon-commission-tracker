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
  checkout: { happy: CheckoutBand; okay: CheckoutBand; unhappy: { lines: string[] } };
  redo: string;
}

export interface CheckoutBand {
  minMatch: number;
  minMood: number;
  lines: string[];
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
    checkout: (() => {
      const k = (c.checkout ?? {}) as Record<string, Partial<CheckoutBand>>;
      const band = (name: 'happy' | 'okay'): CheckoutBand => {
        const b = k[name];
        if (typeof b?.minMatch !== 'number' || typeof b?.minMood !== 'number') return fail(`"checkout.${name}" needs minMatch and minMood`);
        return { minMatch: b.minMatch, minMood: b.minMood, lines: texts(b.lines, `checkout.${name}.lines`) };
      };
      const happy = band('happy');
      const okay = band('okay');
      if (okay.minMatch > happy.minMatch || okay.minMood > happy.minMood) fail('"checkout.okay" thresholds must not be above happy');
      return { happy, okay, unhappy: { lines: texts(k.unhappy?.lines, 'checkout.unhappy.lines') } };
    })(),
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

/** Only a line with a question in it waits for an answer ("Are you almost done? I have to go soon." counts). */
export const expectsAnswer = (line: string): boolean => line.includes('?');

export type CheckoutMood = 'happy' | 'okay' | 'unhappy';

/** Which checkout band the result earns: nail match (0-100) and mood must both reach the band's thresholds. */
export function checkoutBand(match: number, mood: number, config: ServiceTalkConfig = SERVICE_TALK): CheckoutMood {
  const { happy, okay } = config.checkout;
  if (match >= happy.minMatch && mood >= happy.minMood) return 'happy';
  if (match >= okay.minMatch && mood >= okay.minMood) return 'okay';
  return 'unhappy';
}

/** Her line when Done leads to checkout: it fits how the nails and the visit went. */
export function checkoutLine(match: number, mood: number, rand: () => number = Math.random, config: ServiceTalkConfig = SERVICE_TALK): string {
  const lines = config.checkout[checkoutBand(match, mood, config)].lines;
  return lines[Math.floor(rand() * lines.length)] as string;
}
