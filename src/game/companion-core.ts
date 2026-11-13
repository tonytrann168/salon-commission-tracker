import companionJson from './config/companion.json';

/**
 * The companion's identity, pure and shared by the game and the server (story 013): female or male, a name the player
 * may choose, and the grammar that follows from them. In Vietnamese the female companion calls herself "chị", the male
 * one always "anh" (never "chị"); English uses she/he.
 */

export type CompanionGender = 'female' | 'male';
export const COMPANION_GENDERS: readonly CompanionGender[] = ['female', 'male'];

/** Story 025b: whether the companion is older than the player (default) or younger (Vietnamese kinship pronouns). */
export type CompanionRelation = 'older' | 'younger';
/** How a younger companion addresses the player: chị (older sister) or anh (older brother). */
export type PlayerTitle = 'chi' | 'anh';

export interface CompanionIdentity {
  name: string;
  gender: CompanionGender;
  /** Missing (old saves) means older. */
  relation?: CompanionRelation;
  playerTitle?: PlayerTitle;
}

export interface CompanionConfig {
  defaultName: Record<CompanionGender, string>;
  maxNameLength: number;
  skins: Record<CompanionGender, string>;
  blocklist: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export function parseCompanionConfig(raw: unknown): CompanionConfig {
  const fail = (problem: string): never => {
    throw new Error(`companion.json: ${problem}`);
  };
  if (!isRecord(raw)) return fail('root must be an object');
  const pair = (value: unknown, path: string): Record<CompanionGender, string> =>
    isRecord(value) && typeof value.female === 'string' && typeof value.male === 'string' ? { female: value.female, male: value.male } : fail(`"${path}" needs female and male`);
  const max = typeof raw.maxNameLength === 'number' && Number.isInteger(raw.maxNameLength) && raw.maxNameLength >= 1 ? raw.maxNameLength : fail('"maxNameLength" must be a whole number');
  const blocklist = Array.isArray(raw.blocklist) && raw.blocklist.every((w) => typeof w === 'string') ? (raw.blocklist as string[]) : fail('"blocklist" must be a list of words');
  return { defaultName: pair(raw.defaultName, 'defaultName'), maxNameLength: max, skins: pair(raw.skins, 'skins'), blocklist };
}

export const COMPANION_CONFIG: CompanionConfig = parseCompanionConfig(companionJson);

/** Lower case, accents and đ removed, single spaces: how names are compared with the blocklist. */
export const foldForMatch = (text: string): string =>
  text.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Blocked: a long entry (5+ letters, one word) anywhere in the name, or a short / multi-word entry as whole words.
 * Whole words for short ones, because "lon", "dit" would otherwise block real names like Long or Edith.
 */
export function isBlockedName(name: string, blocklist: readonly string[]): boolean {
  const folded = foldForMatch(name);
  const joined = folded.replace(/ /g, '');
  const padded = ` ${folded} `;
  return blocklist.some((raw) => {
    const word = foldForMatch(raw);
    return !word.includes(' ') && word.length >= 5 ? joined.includes(word) : padded.includes(` ${word} `);
  });
}

export type NameProblem = 'empty' | 'long' | 'letters' | 'blocked';

/** Tidy a typed name (NFC, single spaces, trimmed) and check it. */
export function checkCompanionName(raw: string, config: CompanionConfig = COMPANION_CONFIG): { ok: true; name: string } | { ok: false; problem: NameProblem } {
  const name = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (name === '') return { ok: false, problem: 'empty' };
  if ([...name].length > config.maxNameLength) return { ok: false, problem: 'long' };
  if (!/^[\p{Script=Latin}\p{M} ]+$/u.test(name)) return { ok: false, problem: 'letters' };
  if (isBlockedName(name, config.blocklist)) return { ok: false, problem: 'blocked' };
  return { ok: true, name };
}

/** A companion from untrusted input (the server's requests): bad or missing parts fall back to the default Mai. */
export function companionFrom(value: unknown, config: CompanionConfig = COMPANION_CONFIG): CompanionIdentity {
  const gender: CompanionGender = isRecord(value) && value.gender === 'male' ? 'male' : 'female';
  const checked = isRecord(value) && typeof value.name === 'string' ? checkCompanionName(value.name, config) : null;
  const relation: CompanionRelation = isRecord(value) && value.relation === 'younger' ? 'younger' : 'older';
  const playerTitle: PlayerTitle = isRecord(value) && value.playerTitle === 'anh' ? 'anh' : 'chi';
  return { gender, name: checked?.ok ? checked.name : config.defaultName[gender], relation, playerTitle };
}

/**
 * Story 025b: Vietnamese address, from gender, relation and player title. `self`: how the companion says "I";
 * `you`: how the companion (and the game) addresses the player; `pair`: "chị em" / "anh em", elder first.
 */
export function vietnameseAddress(companion: Pick<CompanionIdentity, 'gender' | 'relation' | 'playerTitle'>): { self: string; Self: string; you: string; You: string; pair: string } {
  const cap = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);
  const elder = companion.gender === 'male' ? 'anh' : 'chị';
  if (companion.relation === 'younger') {
    const you = companion.playerTitle === 'anh' ? 'anh' : 'chị';
    return { self: 'em', Self: 'Em', you, You: cap(you), pair: `${you} em` };
  }
  return { self: elder, Self: cap(elder), you: 'em', You: 'Em', pair: `${elder} em` };
}

/** Grammar for strings and prompts. `self`: how the companion says "I" in Vietnamese. */
export function companionGrammar(gender: CompanionGender): { she: string; She: string; her: string } {
  return gender === 'male' ? { she: 'he', She: 'He', her: 'his' } : { she: 'she', She: 'She', her: 'her' };
}

/**
 * How the companion talks about themself in Vietnamese (overseer, 2026-11-10: the male companion must sound like a
 * friendly "anh", as naturally as Mai says "chị"). Used by every Vietnamese bestie and corrections prompt.
 */
export function vietnameseSelfRule(companion: Pick<CompanionIdentity, 'gender' | 'relation' | 'playerTitle'>): string {
  if (companion.relation === 'younger') {
    const you = companion.playerTitle === 'anh' ? 'anh' : 'chị';
    const who = companion.gender === 'male' ? 'You are a young man' : 'You are a young woman';
    return `${who}, younger than the player. Call yourself "em" and the player "${you}", like a friendly younger ${companion.gender === 'male' ? 'brother' : 'sister'} at the salon (for example "em thấy…", "em tin ${you} làm được", "để em chỉ ${you}"). Never call the player "em", and never call yourself "${companion.gender === 'male' ? 'anh' : 'chị'}", "tôi" or "mình" alone.`;
  }
  return companion.gender === 'male'
    ? 'You are a man. Call yourself "anh" and the player "em", like a friendly older brother at the salon. In every Vietnamese reply, refer to yourself as "anh" at least once (for example "anh thấy…", "anh thích…", "anh tin em làm được", "để anh chỉ em"), without forcing it into every sentence. Never call yourself "chị", "tôi" or "mình" alone.'
    : 'Call yourself "chị" and the player "em", like a friendly older sister at the salon. Refer to yourself as "chị" naturally (for example "chị thấy…", "chị thích…", "chị tin em làm được"). Never call yourself "tôi".';
}

/** Fill a persona template ({name}, {She}, {she}, {her}) for this companion. */
export function personaFor(template: string, companion: CompanionIdentity): string {
  const g = companionGrammar(companion.gender);
  return template.replace(/\{name\}/g, companion.name).replace(/\{She\}/g, g.She).replace(/\{she\}/g, g.she).replace(/\{her\}/g, g.her);
}
