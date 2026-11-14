import prepJson from '../config/pedicure-prep.json';
import type { Difficulty } from '../types';
import { pickFresh } from '../fresh-lines';

/**
 * Story 026: the pedicure prep step (soak, then scrub) before painting. A small state machine, timed with delta
 * time; every value comes from config/pedicure-prep.json. Presentation is in ui/pedicure-prep.ts.
 *
 * States and transitions (anything else is ignored):
 *   ready   --start-->  soaking
 *   ready   --skip-->   skipped   (only for difficulties in skipFor)
 *   soaking --tick (soakSeconds reached)--> scrubbing
 *   soaking --skip-->   skipped   (same rule)
 *   scrubbing --scrub (scrubWidths reached)--> done
 *   scrubbing --skip--> skipped   (same rule)
 *   done, skipped: final
 */

export interface PrepLine {
  en: string;
  vi: string;
}

export interface PrepConfig {
  soakSeconds: number;
  /** How far to swipe, in widths of the foot area. */
  scrubWidths: number;
  /** One tap on the Scrub button counts as this many widths. */
  scrubTapWidths: number;
  moodBonus: number;
  skipFor: Difficulty[];
  reactions: { done: PrepLine[]; skipped: PrepLine[] };
}

export function parsePrepConfig(raw: unknown): PrepConfig {
  const c = raw as Partial<PrepConfig>;
  const positive = (n: unknown, name: string): number => {
    if (typeof n !== 'number' || !(n > 0)) throw new Error(`pedicure-prep: ${name} must be a positive number`);
    return n;
  };
  const lines = (list: unknown, name: string): PrepLine[] => {
    if (!Array.isArray(list) || list.length === 0 || !list.every((l) => typeof l?.en === 'string' && typeof l?.vi === 'string')) throw new Error(`pedicure-prep: reactions.${name} needs en/vi lines`);
    return list as PrepLine[];
  };
  return {
    soakSeconds: positive(c.soakSeconds, 'soakSeconds'),
    scrubWidths: positive(c.scrubWidths, 'scrubWidths'),
    scrubTapWidths: positive(c.scrubTapWidths, 'scrubTapWidths'),
    moodBonus: typeof c.moodBonus === 'number' ? c.moodBonus : 0,
    skipFor: Array.isArray(c.skipFor) ? c.skipFor : [],
    reactions: { done: lines(c.reactions?.done, 'done'), skipped: lines(c.reactions?.skipped, 'skipped') },
  };
}

export const PREP_CONFIG: PrepConfig = parsePrepConfig(prepJson);

export type PrepState = 'ready' | 'soaking' | 'scrubbing' | 'done' | 'skipped';
export type PrepEvent = { type: 'start' } | { type: 'skip' } | { type: 'tick'; seconds: number } | { type: 'scrub'; widths: number };

export interface Prep {
  state: PrepState;
  /** 0..1 within the current step (soak or scrub). */
  progress: number;
  canSkip: boolean;
}

export const startPrep = (difficulty: Difficulty, config: PrepConfig = PREP_CONFIG): Prep => ({ state: 'ready', progress: 0, canSkip: config.skipFor.includes(difficulty) });

export const isFinished = (prep: Prep): boolean => prep.state === 'done' || prep.state === 'skipped';

export function stepPrep(prep: Prep, event: PrepEvent, config: PrepConfig = PREP_CONFIG): Prep {
  if (event.type === 'skip') return prep.canSkip && !isFinished(prep) ? { ...prep, state: 'skipped', progress: 0 } : prep;
  switch (prep.state) {
    case 'ready':
      return event.type === 'start' ? { ...prep, state: 'soaking', progress: 0 } : prep;
    case 'soaking': {
      if (event.type !== 'tick' || !(event.seconds > 0)) return prep;
      const progress = Math.min(1, prep.progress + event.seconds / config.soakSeconds);
      return progress >= 1 ? { ...prep, state: 'scrubbing', progress: 0 } : { ...prep, progress };
    }
    case 'scrubbing': {
      if (event.type !== 'scrub' || !(event.widths > 0)) return prep;
      const progress = Math.min(1, prep.progress + event.widths / config.scrubWidths);
      return progress >= 1 ? { ...prep, state: 'done', progress: 1 } : { ...prep, progress };
    }
    default:
      return prep;
  }
}

/** The mood change and the client's line once the prep is over. `roll` in [0, 1) picks the line. */
/** Story 033: `recent` (1-based picks) avoids repeating the last reaction lines. */
export function prepOutcome(prep: Prep, roll: number, config: PrepConfig = PREP_CONFIG, recent: readonly number[] = []): { moodDelta: number; line: PrepLine; pick: number } | null {
  if (!isFinished(prep)) return null;
  const list = prep.state === 'done' ? config.reactions.done : config.reactions.skipped;
  const pick = pickFresh(list.length, recent, list.length - 1, roll);
  return { moodDelta: prep.state === 'done' ? config.moodBonus : 0, line: list[pick - 1] as PrepLine, pick };
}
