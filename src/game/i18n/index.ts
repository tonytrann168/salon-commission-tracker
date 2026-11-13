import { companionFrom, companionGrammar, vietnameseAddress } from '../companion-core';
import { readStored } from '../safe-storage';
import { getHelpLanguage } from '../settings';
import { clientGrammar } from '../types';
import en from './en.json';
import vi from './vi.json';

/**
 * The game's own interface text in English and Vietnamese (string tables `en.json` and `vi.json`). Client and bestie
 * conversation is not here: that stays English with Vietnamese help (story 010). Story: story-008 (design/game-brief.md,
 * MVP feature 3). Translations are written once and reviewed by a Vietnamese speaker, never generated at run time.
 *
 * The interface language follows story 010's language setting: full Vietnamese mode gives Vietnamese menus.
 */

export type Language = 'en' | 'vi';
export type StringKey = keyof typeof en;
export type StringParams = Record<string, string | number>;
export type StringTable = Record<StringKey, string>;

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Companion grammar (story 013), filled by `t` from the saved companion: {self}/{Self} (how the companion says "I"), {you}/{You} (the player), {pair} ("chị em"; Vietnamese, story 025b) —
 * and {maiShe}/{maiHer} (English she/her or he/his). Grammar exists in one language only, so these may appear
 * in just one table. {mai}, the companion's name, is filled too but must appear in both, like any placeholder.
 */
export const GRAMMAR_PLACEHOLDERS: readonly string[] = ['self', 'Self', 'you', 'You', 'pair', 'maiShe', 'maiHer', 'cShe', 'CShe', 'cHer'];

/** The companion params for `t`, from the device's saved companion (Mai, female by default). */
export function companionParams(): StringParams {
  let raw: unknown = null;
  try {
    raw = JSON.parse(readStored('salon.companion.v1') ?? 'null');
  } catch {
    raw = null;
  }
  const companion = companionFrom(raw);
  const g = companionGrammar(companion.gender);
  const a = vietnameseAddress(companion);
  return { mai: companion.name, self: a.self, Self: a.Self, you: a.you, You: a.You, pair: a.pair, maiShe: g.she, maiHer: g.her };
}

/** The `{name}` placeholders in a template, sorted, for comparing the two tables. */
export function placeholdersOf(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER)].map((match) => match[1] as string).sort();
}

/**
 * Check that both tables have exactly the same keys, every value is non-empty text, and each key uses the same
 * placeholders in both languages. Throws a clear `i18n: ...` error otherwise, so a bad table fails at startup.
 */
export function parseStringTables(rawEn: unknown, rawVi: unknown): Record<Language, StringTable> {
  const asTable = (raw: unknown, name: string): Record<string, string> => {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error(`i18n: ${name}.json must be an object`);
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value !== 'string' || value.trim() === '') throw new Error(`i18n: ${name}.json "${key}" must be non-empty text`);
    }
    return raw as Record<string, string>;
  };
  const tables = { en: asTable(rawEn, 'en'), vi: asTable(rawVi, 'vi') };
  for (const [from, to] of [['en', 'vi'], ['vi', 'en']] as const) {
    for (const key of Object.keys(tables[from])) {
      if (!(key in tables[to])) throw new Error(`i18n: "${key}" is in ${from}.json but missing from ${to}.json`);
    }
  }
  for (const key of Object.keys(tables.en)) {
    const shared = (template: string): string => placeholdersOf(template).filter((p) => !GRAMMAR_PLACEHOLDERS.includes(p)).join(',');
    const wanted = shared(tables.en[key] as string);
    const got = shared(tables.vi[key] as string);
    if (wanted !== got) throw new Error(`i18n: "${key}" placeholders differ: en {${wanted}} vs vi {${got}}`);
  }
  return tables as Record<Language, StringTable>;
}

/** Fill `{name}` placeholders. A placeholder with no value is left as written, so a missing value is easy to spot. */
export function fillTemplate(template: string, params: StringParams = {}): string {
  return template.replace(PLACEHOLDER, (whole, name: string) => (name in params ? String(params[name]) : whole));
}

const TABLES = parseStringTables(en, vi);

/** The interface language from the saved setting: full Vietnamese mode gives Vietnamese. */
export function getLanguage(): Language {
  return getHelpLanguage() === 'full' ? 'vi' : 'en';
}

/** Interface text for `key` in `language` (the saved language by default). */
export function t(key: StringKey, params?: StringParams, language: Language = getLanguage()): string {
  const template = TABLES[language][key];
  // Client grammar ({cShe}/{CShe}/{cHer}) defaults to "they" when the caller doesn't say who the client is.
  const companion = /\{(mai|self|Self|you|You|pair|maiShe|maiHer)\}/.test(template) ? companionParams() : {};
  const client = /\{(cShe|CShe|cHer)\}/.test(template) ? clientGrammar() : {};
  return fillTemplate(template, { ...client, ...companion, ...params });
}

/** Keep `<html lang>` in step with the interface language, so screen readers and fonts use the right voice and shaping. */
export function applyDocumentLanguage(language: Language = getLanguage()): void {
  document.documentElement.lang = language;
}
