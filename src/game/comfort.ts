import { readStored, writeStored } from './safe-storage';

/**
 * Comfort & accessibility settings (story 023): text size, reduced motion, vibration and high contrast. Saved on the
 * device and applied as attributes on <html> (data-text, data-motion, data-contrast), which the CSS reads.
 * Reduced motion also follows the phone's own setting.
 */

export const TEXT_SIZES = ['small', 'normal', 'large'] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

export interface ComfortSettings {
  textSize: TextSize;
  /** Reduce motion even if the phone doesn't ask for it. */
  reduceMotion: boolean;
  vibration: boolean;
  highContrast: boolean;
}

export const DEFAULT_COMFORT: ComfortSettings = { textSize: 'normal', reduceMotion: false, vibration: true, highContrast: false };
const KEY = 'salon.comfort.v1';

export function parseComfort(raw: string | null): ComfortSettings {
  try {
    const d = JSON.parse(raw ?? 'null') as Partial<Record<keyof ComfortSettings, unknown>> | null;
    if (!d || typeof d !== 'object') return { ...DEFAULT_COMFORT };
    return {
      textSize: TEXT_SIZES.find((s) => s === d.textSize) ?? DEFAULT_COMFORT.textSize,
      reduceMotion: d.reduceMotion === true,
      vibration: d.vibration !== false,
      highContrast: d.highContrast === true,
    };
  } catch {
    return { ...DEFAULT_COMFORT };
  }
}

export const loadComfort = (): ComfortSettings => parseComfort(readStored(KEY));

/** The attributes for <html>. */
export function comfortAttributes(settings: ComfortSettings, systemReduce: boolean): Record<'data-text' | 'data-motion' | 'data-contrast', string> {
  return { 'data-text': settings.textSize, 'data-motion': settings.reduceMotion || systemReduce ? 'reduce' : 'full', 'data-contrast': settings.highContrast ? 'high' : 'normal' };
}

const systemReduce = (): boolean => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function applyComfort(settings: ComfortSettings = loadComfort(), root: { setAttribute(name: string, value: string): void } | null = typeof document !== 'undefined' ? document.documentElement : null): void {
  if (!root) return;
  for (const [name, value] of Object.entries(comfortAttributes(settings, systemReduce()))) root.setAttribute(name, value);
}

export function saveComfort(settings: ComfortSettings): void {
  writeStored(KEY, JSON.stringify(settings));
  applyComfort(settings);
}

/** Should motion be reduced (the phone's setting or ours)? For code that animates (text reveal, portraits). */
export const prefersReducedMotion = (): boolean => loadComfort().reduceMotion || systemReduce();

/** A short buzz (Done, celebrations), where supported and switched on. */
export function haptic(pattern: number | number[] = 30): void {
  if (!loadComfort().vibration || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Not allowed here: nothing to do.
  }
}
