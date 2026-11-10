import { normalizeForMatch } from '../english-level';
import { readStored, writeStored } from '../safe-storage';
import { LEARNING_CONFIG, TOPICS } from './corrections';
import type { LearningConfig, Phrase, Topic } from './corrections';

/**
 * The phrasebook: salon phrases the player used well or was shown in corrections and the recap, with their Vietnamese
 * meaning and topic. No duplicates (matched ignoring case and punctuation); saved on the device. Story: story-011.
 */

export interface PhrasebookEntry extends Phrase {
  /** Where it came from. */
  source: 'used' | 'correction' | 'recap';
  /** Appointment number it was added after (1 = first). */
  session: number;
}

const STORAGE_KEY = 'salon.phrasebook.v1';
const SOURCES = ['used', 'correction', 'recap'] as const;

const isTopic = (value: unknown): value is Topic => TOPICS.some((topic) => topic === value);

/** Read the saved phrasebook, keeping only valid entries. */
export function parseStoredPhrasebook(raw: string | null): PhrasebookEntry[] {
  if (raw === null) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data.filter(
    (item): item is PhrasebookEntry =>
      typeof item === 'object' && item !== null &&
      typeof item.en === 'string' && item.en.trim() !== '' && typeof item.vi === 'string' &&
      isTopic(item.topic) && SOURCES.includes(item.source) && Number.isInteger(item.session),
  );
}

export function loadPhrasebook(): PhrasebookEntry[] {
  return parseStoredPhrasebook(readStored(STORAGE_KEY));
}

export function savePhrasebook(entries: readonly PhrasebookEntry[]): void {
  writeStored(STORAGE_KEY, JSON.stringify(entries));
}

/**
 * Add phrases, skipping any already in the book (or repeated in `additions`). Oldest entries drop off past the cap.
 * Returns the new book and how many were actually added.
 */
export function addPhrases(
  book: readonly PhrasebookEntry[],
  additions: readonly PhrasebookEntry[],
  config: LearningConfig = LEARNING_CONFIG,
): { book: PhrasebookEntry[]; added: number } {
  const seen = new Set(book.map((entry) => normalizeForMatch(entry.en)));
  const fresh: PhrasebookEntry[] = [];
  for (const entry of additions) {
    const key = normalizeForMatch(entry.en);
    if (key === '' || seen.has(key)) continue;
    seen.add(key);
    fresh.push({ ...entry, en: entry.en.trim(), vi: entry.vi.trim() });
  }
  const all = [...book, ...fresh];
  return { book: all.slice(Math.max(0, all.length - config.phrasebook.maxEntries)), added: fresh.length };
}

/** Entries grouped by topic, in topic order, newest first within a topic. Empty topics are left out. */
export function groupByTopic(book: readonly PhrasebookEntry[]): { topic: Topic; entries: PhrasebookEntry[] }[] {
  return TOPICS.map((topic) => ({ topic, entries: book.filter((entry) => entry.topic === topic).reverse() })).filter((group) => group.entries.length > 0);
}
