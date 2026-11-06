/** Pure mood logic for the client's 0-100 mood meter. */

export const MOOD_MIN = 0;
export const MOOD_MAX = 100;
export const DEFAULT_START_MOOD = 50;
/** Largest drop and gain one exchange may cause. */
export const MIN_MOOD_DELTA = -25;
export const MAX_MOOD_DELTA = 15;

/** Clamp a mood to 0-100. */
export function clampMood(mood: number): number {
  return Math.min(MOOD_MAX, Math.max(MOOD_MIN, mood));
}

/** Clamp the model's proposed delta to the allowed range. */
export function clampMoodDelta(delta: number): number {
  return Math.min(MAX_MOOD_DELTA, Math.max(MIN_MOOD_DELTA, delta));
}

/** Apply a (clamped, rounded) delta to a mood and keep the result in 0-100. */
export function applyMoodDelta(mood: number, delta: number): number {
  return clampMood(mood + Math.round(clampMoodDelta(delta)));
}

/** True when the client has lost all patience and leaves. */
export function isWalkOut(mood: number): boolean {
  return mood <= MOOD_MIN;
}
