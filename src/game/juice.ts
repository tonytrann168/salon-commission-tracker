import juiceJson from './config/juice.json';

/**
 * Story 057b: the small rewards: the appointment progress bar, "Perfect line!", bursts. Pure rules and config here;
 * the drawing is in ui/burst.ts and the screens.
 */
export interface JuiceConfig {
  progress: { linesPerPhase: number };
  perfect: { showMs: number };
  bursts: { coins: number; confetti: number; ms: number };
  reactMs: number;
  /** Story 057c: the results count-up. */
  results: { countMs: number; streakDelayMs: number };
  /** Story 061: the four line grades. */
  grades: { perfectWords: number; smallFixShare: number; showMs: number };
}

const fail = (message: string): never => {
  throw new Error(`juice.json: ${message}`);
};
const whole = (value: unknown, name: string, min = 1, max = 100_000): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : fail(`"${name}" must be a whole number from ${min} to ${max}`);

export function parseJuiceConfig(raw: unknown): JuiceConfig {
  const c = (raw ?? {}) as Record<string, Record<string, unknown> | undefined> & { reactMs?: unknown };
  return {
    progress: { linesPerPhase: whole(c.progress?.linesPerPhase, 'progress.linesPerPhase', 1, 20) },
    perfect: { showMs: whole(c.perfect?.showMs, 'perfect.showMs', 300, 10_000) },
    bursts: { coins: whole(c.bursts?.coins, 'bursts.coins', 0, 40), confetti: whole(c.bursts?.confetti, 'bursts.confetti', 0, 60), ms: whole(c.bursts?.ms, 'bursts.ms', 200, 3000) },
    reactMs: whole(c.reactMs, 'reactMs', 300, 10_000),
    grades: {
      perfectWords: whole(c.grades?.perfectWords, 'grades.perfectWords', 1, 30),
      smallFixShare: typeof c.grades?.smallFixShare === 'number' && c.grades.smallFixShare >= 0 && c.grades.smallFixShare <= 1 ? c.grades.smallFixShare : fail('"grades.smallFixShare" must be from 0 to 1'),
      showMs: whole(c.grades?.showMs, 'grades.showMs', 300, 10_000),
    },
    results: { countMs: whole(c.results?.countMs, 'results.countMs', 100, 5000), streakDelayMs: whole(c.results?.streakDelayMs, 'results.streakDelayMs', 0, 10_000) },
  };
}

export const JUICE_CONFIG: JuiceConfig = parseJuiceConfig(juiceJson);

/**
 * How full the appointment bar is (0-1): each visible phase is an equal share; inside the current phase the player's
 * lines fill it toward (never to) its end, so the bar only completes a phase when the phase really moves on.
 */
export function appointmentProgress(phaseIndex: number, phaseCount: number, linesInPhase: number, finished: boolean, config: JuiceConfig = JUICE_CONFIG): number {
  if (finished) return 1;
  if (phaseCount <= 0 || phaseIndex < 0) return 0;
  const inside = Math.min(linesInPhase / config.progress.linesPerPhase, 0.85);
  return Math.min((Math.min(phaseIndex, phaseCount - 1) + inside) / phaseCount, 1);
}


/** Story 057c: a number counting up to `target` over `durationMs` (eased out; whole numbers; exact at the end). */
export function countUpValue(target: number, elapsedMs: number, durationMs: number): number {
  if (elapsedMs >= durationMs || durationMs <= 0) return target;
  if (elapsedMs <= 0) return 0;
  const t = elapsedMs / durationMs;
  return Math.min(target, Math.round(target * (1 - (1 - t) ** 3)));
}

/** Story 061: how good a line is, from the line check. Only 'perfect' gets confetti. */
export type LineGrade = 'try' | 'good' | 'great' | 'perfect';

const englishWords = (line: string): string[] => line.toLowerCase().match(/[a-z']+/g) ?? [];

/** How much of the better line is new: 0 = the same words, 1 = all new. */
export function fixSize(line: string, better: string): number {
  const mine = new Set(englishWords(line));
  const theirs = englishWords(better);
  if (theirs.length === 0) return 0;
  return theirs.filter((word) => !mine.has(word)).length / theirs.length;
}

/**
 * The grade of one line. `check` is the line check's answer, or null when it was not checked (a helped line, a very
 * short line). A helped line is never more than 'good' (the words were given); a small fix is still 'good'.
 */
export function lineGrade(line: string, check: { needsCorrection: boolean; better: { en: string } | null } | null, helped: boolean, config: JuiceConfig = JUICE_CONFIG): LineGrade {
  if (helped || !check) return 'good';
  if (check.needsCorrection && check.better) return fixSize(line, check.better.en) <= config.grades.smallFixShare ? 'good' : 'try';
  return englishWords(line).length >= config.grades.perfectWords ? 'perfect' : 'great';
}
