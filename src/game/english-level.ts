import levelsJson from './config/english-levels.json';
import { ENGLISH_LEVELS, HELP_LANGUAGES } from './types';
import type { ClientTurn, EnglishLevel, HelpLanguage } from './types';

/**
 * Pure English-level logic: stored-value parsing, the mood override, Help me say it matching, word tiles.
 * Story: story-010 (design/game-brief.md, MVP features 2 and 3). Every number and text comes from config/english-levels.json.
 */

/** A text in both languages. Vietnamese is shown first. */
export interface BilingualText {
  vi: string;
  en: string;
}

/** How Help me say it asks the player to produce the English line. */
export type HelpMode = 'tiles' | 'retype';

export interface LevelRules {
  name: BilingualText;
  /** One short line for the level picker. */
  pickerLine: BilingualText;
  /** Goes into the client's system prompt. */
  speakingRules: string;
  /** English mistakes never lower the client's mood at this level (the game enforces it, see `moodDeltaAfterEnglishRule`). */
  englishNeverLowersMood: boolean;
  helpMode: HelpMode;
}

/** How close the player's typing must be to the target line. */
export interface MatchTolerance {
  /** Allowed edits as a share of the target's normalised length. */
  maxEditShare: number;
  /** Allowed edits never drop below this (a floor)... */
  minAllowedEdits: number;
  /** ...or rise above this (a cap). */
  maxAllowedEdits: number;
}

export interface EnglishLevelsConfig {
  levels: Record<EnglishLevel, LevelRules>;
  match: MatchTolerance;
  /** Base seed for the word-tile shuffle. */
  tileShuffleSeed: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Validate the raw levels file. Throws a clear `english-levels.json: ...` error when it is malformed. */
export function parseEnglishLevelsConfig(raw: unknown): EnglishLevelsConfig {
  const fail = (problem: string): never => {
    throw new Error(`english-levels.json: ${problem}`);
  };
  const object = (value: unknown, path: string): Record<string, unknown> =>
    isRecord(value) ? value : fail(`"${path}" must be an object`);
  const text = (value: unknown, path: string): string =>
    typeof value === 'string' && value.trim() !== '' ? value : fail(`"${path}" must be a non-empty string`);
  const number = (value: unknown, path: string, min: number, max: number): number =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
      ? value
      : fail(`"${path}" must be a number from ${min} to ${max}`);
  const bilingual = (value: unknown, path: string): BilingualText => {
    const pair = object(value, path);
    return { vi: text(pair.vi, `${path}.vi`), en: text(pair.en, `${path}.en`) };
  };

  const root = object(raw, 'root');
  const levels = object(root.levels, 'levels');
  const parsedLevels = Object.fromEntries(
    ENGLISH_LEVELS.map((level) => {
      const path = `levels.${level}`;
      const entry = object(levels[level], path);
      const { englishNeverLowersMood, helpMode } = entry;
      if (typeof englishNeverLowersMood !== 'boolean') fail(`"${path}.englishNeverLowersMood" must be true or false`);
      if (helpMode !== 'tiles' && helpMode !== 'retype') fail(`"${path}.helpMode" must be "tiles" or "retype"`);
      const rules: LevelRules = {
        name: bilingual(entry.name, `${path}.name`),
        pickerLine: bilingual(entry.pickerLine, `${path}.pickerLine`),
        speakingRules: text(entry.speakingRules, `${path}.speakingRules`),
        englishNeverLowersMood: englishNeverLowersMood as boolean,
        helpMode: helpMode as HelpMode,
      };
      return [level, rules];
    }),
  ) as Record<EnglishLevel, LevelRules>;

  const match = object(root.match, 'match');
  const minAllowedEdits = number(match.minAllowedEdits, 'match.minAllowedEdits', 0, 20);
  const parsedMatch: MatchTolerance = {
    maxEditShare: number(match.maxEditShare, 'match.maxEditShare', 0, 0.5),
    minAllowedEdits,
    maxAllowedEdits: number(match.maxAllowedEdits, 'match.maxAllowedEdits', minAllowedEdits, 20),
  };

  const seed = number(root.tileShuffleSeed, 'tileShuffleSeed', 0, 0xffffffff);
  if (!Number.isInteger(seed)) fail('"tileShuffleSeed" must be a whole number');

  return { levels: parsedLevels, match: parsedMatch, tileShuffleSeed: seed };
}

/** Validated once at load: a bad file fails at startup, not mid-appointment. */
export const ENGLISH_LEVELS_CONFIG: EnglishLevelsConfig = parseEnglishLevelsConfig(levelsJson);

/** Read a saved level. Missing, unknown or non-string values give `null` (no level chosen yet). */
export function parseStoredLevel(raw: unknown): EnglishLevel | null {
  return ENGLISH_LEVELS.find((level) => level === raw) ?? null;
}

/** Read a saved help-language setting. Missing or unknown values fall back to `tap`. */
export function parseStoredHelpLanguage(raw: unknown): HelpLanguage {
  return HELP_LANGUAGES.find((language) => language === raw) ?? 'tap';
}

/**
 * The game-side mood rule for English mistakes. When the level protects the player (Beginner, Some) or the line was
 * written with Help me say it (any level): if the line was unclear, not rude, and the model lowered the mood, the
 * change becomes 0. Anything else, including rudeness, keeps the model's number.
 */
export function moodDeltaAfterEnglishRule(
  turn: Pick<ClientTurn, 'moodDelta' | 'unclearEnglish' | 'rude'>,
  level: EnglishLevel,
  helped: boolean,
  config: EnglishLevelsConfig = ENGLISH_LEVELS_CONFIG,
): number {
  const protectedLine = helped || config.levels[level].englishNeverLowersMood;
  return protectedLine && turn.unclearEnglish && !turn.rude && turn.moodDelta < 0 ? 0 : turn.moodDelta;
}

/** Lowercase, drop apostrophes, turn other punctuation into spaces and collapse spaces, so matching ignores case and punctuation. */
export function normalizeForMatch(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/['’‘`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Levenshtein edit distance (insert, delete, replace) between two strings. */
export function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, (previous[j - 1] ?? 0) + cost);
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}

/** True when `typed` matches `target` ignoring case and punctuation, allowing a few typos (see the config tolerance). */
export function matchesTarget(typed: string, target: string, tolerance: MatchTolerance = ENGLISH_LEVELS_CONFIG.match): boolean {
  const wanted = normalizeForMatch(target);
  const got = normalizeForMatch(typed);
  if (got === '' || wanted === '') return false;
  const allowed = Math.min(
    tolerance.maxAllowedEdits,
    Math.max(tolerance.minAllowedEdits, Math.round(wanted.length * tolerance.maxEditShare)),
  );
  return editDistance(got, wanted) <= allowed;
}

/**
 * Split an English line into word tiles. Punctuation rides on its word: it stays attached to the word it was written
 * with, and a token with no letters or digits (a lone dash, say) joins the word before it.
 */
export function buildWordTiles(line: string): string[] {
  const tiles: string[] = [];
  for (const token of line.trim().split(/\s+/)) {
    if (token === '') continue;
    const last = tiles.length - 1;
    if (last >= 0 && !/[\p{L}\p{N}]/u.test(token)) tiles[last] = `${tiles[last]} ${token}`;
    else tiles.push(token);
  }
  return tiles;
}

/** FNV-1a hash of a string, as an unsigned 32-bit number. */
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Seeded Fisher-Yates shuffle (mulberry32). The same items and seed always give the same order. Returns a new array. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

/**
 * The tiles for a target line in a repeatable shuffled order. The order depends on the config seed and the line, so
 * different lines shuffle differently but the same line always shuffles the same. Never returns the solved order when
 * the tiles are not all the same word.
 */
export function shuffledWordTiles(line: string, seed: number = ENGLISH_LEVELS_CONFIG.tileShuffleSeed): string[] {
  const tiles = buildWordTiles(line);
  const shuffled = seededShuffle(tiles, seed ^ hashString(line));
  const solved = shuffled.every((tile, index) => tile === tiles[index]);
  const varied = tiles.some((tile) => tile !== tiles[0]);
  return solved && varied ? [...shuffled.slice(1), shuffled[0] as string] : shuffled;
}
