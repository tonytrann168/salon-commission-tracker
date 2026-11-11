import onboardingJson from './config/onboarding.json';
import { readStored, writeStored } from './safe-storage';

/**
 * The first-appointment tour (story 015), pure: which step comes next, once only, skippable, replayable. The UI
 * (ui/tour.ts) watches the page for each step's target. Steps: config/onboarding.json.
 */

export interface TourStep {
  id: string;
  target: string;
}

export interface TourState {
  /** Finished or skipped: the tour does not show again until replayed. */
  done: boolean;
  /** Steps already shown. */
  seen: string[];
}

export function parseOnboardingConfig(raw: unknown): TourStep[] {
  const fail = (problem: string): never => {
    throw new Error(`onboarding.json: ${problem}`);
  };
  const steps = typeof raw === 'object' && raw !== null && Array.isArray((raw as { steps?: unknown }).steps) ? (raw as { steps: unknown[] }).steps : fail('"steps" must be a list');
  const parsed = steps.map((step, i) => {
    const s = step as Record<string, unknown>;
    return typeof s?.id === 'string' && typeof s.target === 'string' && s.target.trim() !== '' ? { id: s.id, target: s.target } : fail(`"steps[${i}]" needs an id and a target selector`);
  });
  if (parsed.length === 0) fail('"steps" is empty');
  if (new Set(parsed.map((s) => s.id)).size !== parsed.length) fail('step ids must be unique');
  return parsed;
}

export const TOUR_STEPS: TourStep[] = parseOnboardingConfig(onboardingJson);

export const FRESH_TOUR: TourState = { done: false, seen: [] };

/** The next step to show, or null when the tour is done or every step was seen. */
export function nextStep(state: TourState, steps: readonly TourStep[] = TOUR_STEPS): TourStep | null {
  if (state.done) return null;
  return steps.find((step) => !state.seen.includes(step.id)) ?? null;
}

/** After a step is dismissed: it is seen, and the tour is done after the last one. */
export function afterStep(state: TourState, id: string, steps: readonly TourStep[] = TOUR_STEPS): TourState {
  const seen = state.seen.includes(id) ? state.seen : [...state.seen, id];
  return { done: steps.every((step) => seen.includes(step.id)), seen };
}

export const skipTour = (state: TourState): TourState => ({ ...state, done: true });

const KEY = 'salon.tour.v1';

export function parseTour(raw: string | null): TourState {
  try {
    const data = JSON.parse(raw ?? 'null') as Partial<TourState> | null;
    if (!data || typeof data !== 'object') return { ...FRESH_TOUR };
    return { done: data.done === true, seen: Array.isArray(data.seen) ? data.seen.filter((id): id is string => typeof id === 'string') : [] };
  } catch {
    return { ...FRESH_TOUR };
  }
}

export const loadTour = (): TourState => parseTour(readStored(KEY));
export const saveTour = (state: TourState): void => writeStored(KEY, JSON.stringify(state));
/** Settings → Replay the tour: shows again from the start on the next appointment. */
export const replayTour = (): void => saveTour({ ...FRESH_TOUR });
