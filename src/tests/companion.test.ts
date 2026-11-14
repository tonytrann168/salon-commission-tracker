import { describe, expect, it } from 'vitest';
import { EMPTY_MEMORY, afterHello, afterPractice, bestSkill } from '../game/bestie-memory';
import { isUnlocked, parseCompanion, wear, withGender, withName } from '../game/companion';
import { BESTIE_CONFIG } from '../game/bestie';
import { checkCompanionName, companionFrom, companionGrammar, personaFor, vietnameseAddress, vietnameseSelfRule } from '../game/companion-core';
import vi from '../game/i18n/vi.json';
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
    const older = { relation: 'older', playerTitle: 'chi' };
    expect(companionFrom(null)).toEqual({ name: 'Mai', gender: 'female', ...older });
    expect(companionFrom({ gender: 'male' })).toEqual({ name: 'Minh', gender: 'male', ...older });
    expect(companionFrom({ gender: 'robot', name: '<script>', relation: 'boss', playerTitle: 'sir' })).toEqual({ name: 'Mai', gender: 'female', ...older });
    expect(companionFrom({ relation: 'younger', playerTitle: 'anh' })).toMatchObject({ relation: 'younger', playerTitle: 'anh' });
  });
});

describe('gender and grammar', () => {
  it('the male companion is "anh" and he/his; the female one "chị" and she/her', () => {
    expect(companionGrammar('male')).toMatchObject({ she: 'he', her: 'his' });
    expect(companionGrammar('female')).toMatchObject({ she: 'she', her: 'her' });
    expect(vietnameseAddress({ gender: 'male' }).self).toBe('anh');
    expect(vietnameseAddress({ gender: 'female' }).self).toBe('chị');
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
    // The corrections handler retries once on an empty answer, so its prompt can appear twice: check each distinct one.
    const distinct = [...new Set(systems)];
    expect(distinct).toHaveLength(2);
    for (const system of distinct) {
      expect(system).toMatch(/You are Minh/);
      expect(system).toMatch(/call yourself "anh"/i);
      expect(system).toMatch(/refer to yourself as "anh" at least once/);
      expect(system).toMatch(/anh thấy/);
      // The male rule may say 'Never call yourself "chị"', but never tells him to.
      expect(system).not.toMatch(/Call yourself "chị"/);
      expect(system).toMatch(/Never call yourself "chị"/);
      expect(system).not.toMatch(/You are Mai/);
    }
    const { systems: female, fetchImpl: f2 } = capture();
    await handleBestie({ kind: 'hint', level: 'some', language: 'vi', memory: '', phase: 'service', mood: 50, transcript: [{ role: 'client', content: 'Hi' }] }, { ANTHROPIC_API_KEY: 'k' }, f2);
    expect(female[0]).toMatch(/You are Mai/);
    expect(female[0]).toMatch(/call yourself "chị"/i);
  });

  it('interface strings follow the saved companion: name, "Anh"/"Chị", his/her', () => {
    writeStored('salon.companion.v1', JSON.stringify({ chosen: true, gender: 'male', name: 'Minh', equipped: {} }));
    expect(companionParams()).toMatchObject({ mai: 'Minh', Self: 'Anh', self: 'anh', you: 'em' });
    expect(t('bestie.greetingFirst', { name: 'Minh' }, 'vi')).toMatch(/^Chào em! Anh là Minh/);
    expect(t('voice.noSpeech', {}, 'vi')).toMatch(/^Anh chưa nghe/);
    expect(t('bestie.debriefFailed', { name: 'Minh' }, 'en')).toBe("Minh couldn't finish his debrief. Your results are safe.");
    expect(t('guard.rest', {}, 'vi')).toMatch(/^Minh cần nghỉ/);
    writeStored('salon.companion.v1', JSON.stringify({ chosen: true, gender: 'female', name: 'Mai', equipped: {} }));
    expect(t('bestie.greetingFirst', { name: 'Mai' }, 'vi')).toMatch(/^Chào em! Chị là Mai/);
    expect(t('bestie.debriefFailed', { name: 'Mai' }, 'en')).toMatch(/her debrief/);
  });
});

describe('older or younger (story 025b)', () => {
  it('resolves the Vietnamese address for all six combinations', () => {
    const cases = [
      [{ gender: 'female', relation: 'older' }, { self: 'chị', Self: 'Chị', you: 'em', You: 'Em', pair: 'chị em' }],
      [{ gender: 'male', relation: 'older' }, { self: 'anh', Self: 'Anh', you: 'em', You: 'Em', pair: 'anh em' }],
      [{ gender: 'female', relation: 'younger', playerTitle: 'chi' }, { self: 'em', Self: 'Em', you: 'chị', You: 'Chị', pair: 'chị em' }],
      [{ gender: 'female', relation: 'younger', playerTitle: 'anh' }, { self: 'em', Self: 'Em', you: 'anh', You: 'Anh', pair: 'anh em' }],
      [{ gender: 'male', relation: 'younger', playerTitle: 'chi' }, { self: 'em', Self: 'Em', you: 'chị', You: 'Chị', pair: 'chị em' }],
      [{ gender: 'male', relation: 'younger', playerTitle: 'anh' }, { self: 'em', Self: 'Em', you: 'anh', You: 'Anh', pair: 'anh em' }],
    ] as const;
    for (const [companion, address] of cases) expect(vietnameseAddress(companion)).toEqual(address);
  });

  it('old saves are older; the choice is kept with the companion', () => {
    expect(parseCompanion(JSON.stringify({ chosen: true, gender: 'female', name: 'Mai' }))).toMatchObject({ relation: 'older', playerTitle: 'chi' });
    expect(parseCompanion(JSON.stringify({ chosen: true, gender: 'male', name: 'Minh', relation: 'younger', playerTitle: 'anh' }))).toMatchObject({ relation: 'younger', playerTitle: 'anh' });
  });

  it('interface strings follow a younger companion: "Em" for herself, "anh" for the player', () => {
    writeStored('salon.companion.v1', JSON.stringify({ chosen: true, gender: 'female', name: 'Mai', equipped: {}, relation: 'younger', playerTitle: 'anh' }));
    expect(t('bestie.greetingFirst', { name: 'Mai' }, 'vi')).toBe('Chào anh! Em là Mai, bạn thân của anh ở tiệm.');
    expect(t('bestie.levelUp', { name: 'Mai', level: 3 }, 'vi')).toMatch(/Hai anh em mình/);
    expect(t('account.codeSent', { email: 'a@b.co' }, 'vi')).toBe('Em gửi mã 6 số vào a@b.co rồi nè, anh nhập vô đây nha!');
    expect(t('bestie.greetingFirst', { name: 'Mai' }, 'en')).toMatch(/^Hi! I'm Mai|Mai/);
    writeStored('salon.companion.v1', JSON.stringify({ chosen: true, gender: 'female', name: 'Mai', equipped: {} }));
    expect(t('account.codeSent', { email: 'a@b.co' }, 'vi')).toBe('Chị gửi mã 6 số vào a@b.co rồi nè, em nhập vô đây nha!');
  });

  it('no Vietnamese string hardcodes em / chị / anh outside the tokens', () => {
    // Allowed: "tiếng Anh" (English), quoted pronouns explaining the choice, and the chị/anh question itself.
    const allowed = new Set(['companion.titleQuestion', 'companion.titleChi', 'companion.titleAnh']);
    const hard = Object.entries(vi as Record<string, string>)
      .filter(([key]) => !allowed.has(key))
      .map(([key, text]) => [key, text.replace(/tiếng Anh/gi, '').replace(/“[^”]*”/g, '')] as const)
      .filter(([, text]) => /(^|[^\p{L}])(em|chị|anh)([^\p{L}]|$)/iu.test(text))
      .map(([key]) => key);
    expect(hard).toEqual([]);
  });

  it('a younger companion\'s prompts say "em" for herself and the chosen title for the player, never "em" for the player', async () => {
    const rule = vietnameseSelfRule({ gender: 'female', relation: 'younger', playerTitle: 'anh' });
    expect(rule).toMatch(/Call yourself "em" and the player "anh"/);
    expect(rule).toMatch(/Never call the player "em"/);
    expect(rule).not.toMatch(/the player "chị"/);
    const { systems, fetchImpl } = capture();
    const companion = { name: 'Mai', gender: 'female', relation: 'younger', playerTitle: 'anh' };
    await handleBestie({ kind: 'hint', level: 'some', language: 'vi', memory: '', phase: 'service', mood: 50, transcript: [{ role: 'client', content: 'Hi' }], companion }, { ANTHROPIC_API_KEY: 'k' }, fetchImpl);
    await handleCorrections({ kind: 'line', level: 'some', language: 'vi', phase: 'service', line: 'I fix you nail now', clientLine: 'Hi', companion }, { ANTHROPIC_API_KEY: 'k' }, fetchImpl);
    for (const system of new Set(systems)) {
      expect(system).toMatch(/Call yourself "em" and the player "anh"/);
      expect(system).not.toMatch(/Call yourself "chị"/);
    }
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
    const fresh = { friendshipLevel: 1, phrases: 0, fiveStars: false, streak: 0, owned: [] as string[] };
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
