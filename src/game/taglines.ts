import taglinesJson from './config/taglines.json';
import { pickFresh, remember } from './fresh-lines';
import type { Language } from './i18n';

/**
 * Story 042: the title's catchy line. One per visit (page load), never one of the last few; the same pick in both
 * languages' lists, so switching the language (story 041) shows that visit's line in the other language.
 */
export interface Taglines {
  noRepeatWithin: number;
  en: string[];
  vi: string[];
}

export function parseTaglines(raw: unknown): Taglines {
  const c = raw as Partial<Taglines>;
  const fail = (what: string): never => {
    throw new Error(`taglines.json: ${what}`);
  };
  const list = (value: unknown, name: string): string[] => (Array.isArray(value) && value.length > 0 && value.every((l) => typeof l === 'string' && l.trim() !== '' && l.length <= 70) ? (value as string[]) : fail(`"${name}" needs lines of up to 70 characters`));
  const en = list(c.en, 'en');
  const vi = list(c.vi, 'vi');
  if (en.length !== vi.length) fail('"en" and "vi" need the same number of lines');
  if (new Set(en).size !== en.length || new Set(vi).size !== vi.length) fail('lines must not repeat');
  const within = typeof c.noRepeatWithin === 'number' && Number.isInteger(c.noRepeatWithin) && c.noRepeatWithin >= 1 && c.noRepeatWithin < en.length ? c.noRepeatWithin : fail('"noRepeatWithin" must be 1 or more and less than the number of lines');
  return { noRepeatWithin: within, en, vi };
}

export const TAGLINES: Taglines = parseTaglines(taglinesJson);

/** This visit's line number (1-based) and the recent list to save. */
export function nextTagline(recent: readonly number[], roll: number, taglines: Taglines = TAGLINES): { pick: number; recent: number[] } {
  const pick = pickFresh(taglines.en.length, recent, taglines.noRepeatWithin, roll);
  return { pick, recent: remember(recent, pick, taglines.noRepeatWithin) };
}

export const taglineText = (pick: number, language: Language, taglines: Taglines = TAGLINES): string => taglines[language][(pick - 1) % taglines[language].length] as string;
