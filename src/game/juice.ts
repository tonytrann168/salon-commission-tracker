import juiceJson from './config/juice.json';

/**
 * Story 057b: the small rewards: the appointment progress bar, "Perfect line!", bursts. Pure rules and config here;
 * the drawing is in ui/burst.ts and the screens.
 */
export interface JuiceConfig {
  progress: { linesPerPhase: number };
  perfect: { minWords: number; showMs: number };
  bursts: { coins: number; confetti: number; ms: number };
  reactMs: number;
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
    perfect: { minWords: whole(c.perfect?.minWords, 'perfect.minWords', 1, 20), showMs: whole(c.perfect?.showMs, 'perfect.showMs', 300, 10_000) },
    bursts: { coins: whole(c.bursts?.coins, 'bursts.coins', 0, 40), confetti: whole(c.bursts?.confetti, 'bursts.confetti', 0, 60), ms: whole(c.bursts?.ms, 'bursts.ms', 200, 3000) },
    reactMs: whole(c.reactMs, 'reactMs', 300, 10_000),
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

/** "Perfect line!": the line check found nothing to fix, and the line is a real sentence (not "ok", not a helped line). */
export function isPerfectLine(line: string, check: { needsCorrection: boolean }, helped: boolean, config: JuiceConfig = JUICE_CONFIG): boolean {
  if (helped || check.needsCorrection) return false;
  return line.trim().split(/\s+/).filter((word) => /[a-z]/i.test(word)).length >= config.perfect.minWords;
}
