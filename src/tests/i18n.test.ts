import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '../game/i18n/en.json';
import vi from '../game/i18n/vi.json';
import { fillTemplate, parseStringTables, placeholdersOf, t } from '../game/i18n';
import { ENGLISH_LEVELS, ENGLISH_KEYS, PHASES, SKILL_KEYS } from '../game/types';

/** Story 008: the interface string tables. */

describe('string tables', () => {
  it('have the same keys and placeholders in English and Vietnamese', () => {
    expect(() => parseStringTables(en, vi)).not.toThrow();
    expect(Object.keys(vi).sort()).toEqual(Object.keys(en).sort());
  });

  it('cover every level, phase, skill and English mark the game shows', () => {
    const keys = new Set(Object.keys(en));
    for (const level of ENGLISH_LEVELS) expect(keys.has(`level.${level}.name`) && keys.has(`level.${level}.line`)).toBe(true);
    for (const phase of PHASES.filter((p) => p !== 'done')) expect(keys.has(`chat.phase.${phase}`)).toBe(true);
    for (const skill of SKILL_KEYS) expect(keys.has(`results.skill.${skill}`)).toBe(true);
    for (const mark of ENGLISH_KEYS) expect(keys.has(`results.english.${mark}`)).toBe(true);
  });

  it('keep Vietnamese diacritics as precomposed (NFC) text', () => {
    for (const value of Object.values(vi)) expect(value).toBe(value.normalize('NFC'));
    expect(vi['settings.title']).toBe('Cài đặt');
  });

  it('name the key and the problem for a bad table', () => {
    expect(() => parseStringTables(en, { ...vi, 'extra.key': 'x' })).toThrow(/"extra\.key" is in vi\.json but missing from en\.json/);
    const { 'common.back': _dropped, ...missing } = vi;
    expect(() => parseStringTables(en, missing)).toThrow(/"common\.back" is in en\.json but missing from vi\.json/);
    expect(() => parseStringTables(en, { ...vi, 'common.back': ' ' })).toThrow(/vi\.json "common\.back" must be non-empty/);
    expect(() => parseStringTables(en, { ...vi, 'chat.typing': 'đang nhập' })).toThrow(/"chat\.typing" placeholders differ/);
  });
});

describe('t and fillTemplate', () => {
  it('fills placeholders in the chosen language', () => {
    expect(t('chat.typing', { name: 'Dana' }, 'en')).toBe('Dana is typing');
    expect(t('chat.typing', { name: 'Dana' }, 'vi')).toBe('Dana đang nhập');
    expect(t('results.tipAmount', { dollars: 12 }, 'en')).toBe('$12');
  });

  it('defaults to English when full Vietnamese mode is off', () => {
    expect(t('settings.title')).toBe('Settings');
  });

  it('leaves a placeholder with no value visible', () => {
    expect(fillTemplate('{name} is {mood}', { name: 'Dana' })).toBe('Dana is {mood}');
    expect(placeholdersOf('{b} and {a}')).toEqual(['a', 'b']);
  });
});

describe('no hard-coded UI strings', () => {
  it('UI modules no longer import the old strings file', () => {
    const uiDir = join(__dirname, '../game/ui');
    for (const file of readdirSync(uiDir).filter((name) => name.endsWith('.ts'))) {
      expect(readFileSync(join(uiDir, file), 'utf8')).not.toMatch(/from '\.\/strings'/);
    }
  });
});
