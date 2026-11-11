import { describe, expect, it } from 'vitest';
import { EMPTY_MEMORY, afterHello, afterPractice, bestSkill } from '../game/bestie-memory';
import { isUnlocked, parseCompanion, wear, withGender, withName } from '../game/companion';
import { BESTIE_CONFIG } from '../game/bestie';
import { checkCompanionName, companionFrom, companionGrammar, personaFor } from '../game/companion-core';
import { companionParams, t } from '../game/i18n';
import { MASCOT_CONFIG } from '../game/mascot/mascot';
import { writeStored } from '../game/safe-storage';
import { handleBestie } from '../server/handlers/bestie';
import { handleCorrections } from '../server/handlers/corrections';

/** Story 013: the companion's gender, name, grammar, accessories and friendship. */

const capture = () => {
  const systems: string[] = [];
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    systems.push(JSON.parse(String(init.body)).system[0].text);
    return new Response(JSON.stringify({ content: [] }), { status: 200 });
  }) as unknown as typeof fetch;
  return { systems, fetchImpl };
};

describe('companion names', () => {
  it('accepts letters, spaces and Vietnamese diacritics, tidied', () => {
    expect(checkCompanionName('  Hồng   Nhung ')).toEqual({ ok: true, name: 'Hồng Nhung' });
    expect(checkCompanionName('Long')).toEqual({ ok: true, name: 'Long' });
    expect(checkCompanionName('Điền')).toEqual({ ok: true, name: 'Điền' });
    expect(checkCompanionName('Edith')).toEqual({ ok: true, name: 'Edith' });
  });

  it('refuses empty, too long, digits or symbols, and offensive names (with or without accents)', () => {
    expect(checkCompanionName('   ')).toEqual({ ok: false, problem: 'empty' });
    expect(checkCompanionName('Abcdefghijklm')).toEqual({ ok: false, problem: 'long' });
    expect(checkCompanionName('Mai2')).toEqual({ ok: false, problem: 'letters' });
    expect(checkCompanionName('Mai 💅')).toEqual({ ok: false, problem: 'letters' });
    expect(checkCompanionName('Bitchy')).toEqual({ ok: false, problem: 'blocked' });
    expect(checkCompanionName('Đù Má')).toEqual({ ok: false, problem: 'blocked' });
    expect(checkCompanionName('Lồn')).toEqual({ ok: false, problem: 'blocked' });
  });

  it('falls back to Mai for bad input; a male companion with no name is Minh', () => {
    expect(companionFrom(null)).toEqual({ name: 'Mai', gender: 'female' });
    expect(companionFrom({ gender: 'male' })).toEqual({ name: 'Minh', gender: 'male' });
    expect(companionFrom({ gender: 'robot', name: '<script>' })).toEqual({ name: 'Mai', gender: 'female' });
  });
});

describe('gender and grammar', () => {
  it('the male companion is "anh" and he/his; the female one "chị" and she/her', () => {
    expect(companionGrammar('male')).toMatchObject({ selfLower: 'anh', she: 'he', her: 'his' });
    expect(companionGrammar('female')).toMatchObject({ selfLower: 'chị', she: 'she', her: 'her' });
    const persona = personaFor(BESTIE_CONFIG.persona, { name: 'Minh', gender: 'male' });
    expect(persona).toMatch(/^Minh is/);
    expect(persona).toMatch(/He is proud/);
    expect(persona).not.toMatch(/\b(She|she|her|Mai)\b/);
  });

  it('every bestie and corrections prompt uses the name and, in Vietnamese, "anh" for a male companion (never "chị")', async () => {
    const companion = { name: 'Minh', gender: 'male' };
    const { systems, fetchImpl } = capture();
    await handleBestie({ kind: 'hint', level: 'some', language: 'vi', memory: '', phase: 'service', mood: 50, transcript: [{ role: 'client', content: 'Hi' }], companion }, { ANTHROPIC_API_KEY: 'k' }, fetchImpl);
    await handleCorrections({ kind: 'line', level: 'some', language: 'vi', phase: 'service', line: 'I fix you nail now', clientLine: 'Hi', companion }, { ANTHROPIC_API_KEY: 'k' }, fetchImpl);
    expect(systems).toHaveLength(2);
    for (const system of systems) {
      expect(system).toMatch(/You are Minh/);
      expect(system).toMatch(/call yourself "anh"/i);
      expect(system).not.toMatch(/call yourself "chị"/i);
      expect(system).not.toMatch(/You are Mai/);
    }
    const { systems: female, fetchImpl: f2 } = capture();
    await handleBestie({ kind: 'hint', level: 'some', language: 'vi', memory: '', phase: 'service', mood: 50, transcript: [{ role: 'client', content: 'Hi' }] }, { ANTHROPIC_API_KEY: 'k' }, f2);
    expect(female[0]).toMatch(/You are Mai/);
    expect(female[0]).toMatch(/call yourself "chị"/i);
  });

  it('interface strings follow the saved companion: name, "Anh"/"Chị", his/her', () => {
    writeStored('salon.companion.v1', JSON.stringify({ chosen: true, gender: 'male', name: 'Minh', equipped: {} }));
    expect(companionParams()).toMatchObject({ mai: 'Minh', self: 'Anh' });
    expect(t('bestie.greetingFirst', { name: 'Minh' }, 'vi')).toMatch(/^Chào em! Anh là Minh/);
    expect(t('voice.noSpeech', {}, 'vi')).toMatch(/^Anh chưa nghe/);
    expect(t('bestie.debriefFailed', { name: 'Minh' }, 'en')).toBe("Minh couldn't finish his debrief. Your results are safe.");
    expect(t('guard.rest', {}, 'vi')).toMatch(/^Minh cần nghỉ/);
    writeStored('salon.companion.v1', JSON.stringify({ chosen: true, gender: 'female', name: 'Mai', equipped: {} }));
    expect(t('bestie.greetingFirst', { name: 'Mai' }, 'vi')).toMatch(/^Chào em! Chị là Mai/);
    expect(t('bestie.debriefFailed', { name: 'Mai' }, 'en')).toMatch(/her debrief/);
  });
});

describe('the companion on the device', () => {
  it('reads a damaged save safely and keeps only real, slot-matched accessories', () => {
    expect(parseCompanion(null)).toMatchObject({ chosen: false, gender: 'female', name: 'Mai' });
    expect(parseCompanion('{bad')).toMatchObject({ chosen: false, name: 'Mai' });
    const saved = parseCompanion(JSON.stringify({ chosen: true, gender: 'male', name: 'x1', equipped: { head: 'bow-pink', face: 'bow-pink', neck: 'nope' } }));
    expect(saved).toMatchObject({ chosen: true, gender: 'male', name: 'Minh', equipped: { head: 'bow-pink' } });
  });

  it('switching gender keeps a typed name but swaps a default one; renaming validates', () => {
    const start = parseCompanion(null);
    expect(withGender(start, 'male').name).toBe('Minh');
    const named = withName(start, 'Nhung');
    expect(named.ok && withGender(named.settings, 'male').name).toBe('Nhung');
    expect(withName(start, '')).toEqual({ ok: false, problem: 'empty' });
  });

  it('accessories unlock by playing; a locked one cannot be worn', () => {
    const find = (id: string) => MASCOT_CONFIG.accessories.find((a) => a.id === id)!;
    const fresh = { friendshipLevel: 1, phrases: 0, fiveStars: false, streak: 0 };
    expect(isUnlocked(find('bow-pink'), fresh)).toBe(true);
    expect(isUnlocked(find('glasses-round'), fresh)).toBe(false);
    expect(isUnlocked(find('glasses-round'), { ...fresh, friendshipLevel: 2 })).toBe(true);
    expect(isUnlocked(find('scarf-mint'), { ...fresh, fiveStars: true })).toBe(true);
    expect(isUnlocked(find('nails-mint'), { ...fresh, phrases: 10 })).toBe(true);
    expect(isUnlocked(find('color-lavender'), { ...fresh, streak: 3 })).toBe(true);
    const settings = parseCompanion(null);
    expect(wear(settings, find('glasses-round'), true, fresh)).toBe(settings);
    const worn = wear(settings, find('bow-pink'), true, fresh);
    expect(worn.equipped.head).toBe('bow-pink');
    expect(wear(worn, find('bow-pink'), false, fresh).equipped.head).toBeUndefined();
  });
});

describe('friendship and the daily hello', () => {
  it('the daily hello happens once a day and adds friendship after the first appointment', () => {
    const regular = { ...EMPTY_MEMORY, sessions: 2, xp: 10 };
    const hello = afterHello(regular, '2026-11-10');
    expect(hello).toMatchObject({ lastHelloDay: '2026-11-10', xp: 10 + BESTIE_CONFIG.xp.dailyHello });
    expect(afterHello(hello!, '2026-11-10')).toBeNull();
    expect(afterHello(EMPTY_MEMORY, '2026-11-10')?.xp).toBe(0);
    expect(afterPractice(regular).xp).toBe(10 + BESTIE_CONFIG.xp.phrasePractised);
  });

  it('remembers the best skill (80+) to mention next time', () => {
    expect(bestSkill({ greeting: 92, consultation: 70, upsell: 60, rebooking: 85, problemHandling: 50 })).toBe('greeting');
    expect(bestSkill({ greeting: 60, consultation: 70, upsell: 60, rebooking: 75, problemHandling: 50 })).toBe('');
  });
});
