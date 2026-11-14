import { describe, expect, it, vi } from 'vitest';
import { getClient, parseClient } from '../game/clients/roster';
import { createTranslationCache } from '../game/translation-cache';
import { clientMentionRule, clientVietnamese, clientVietnameseRule } from '../game/types';
import { withClient } from '../server/handlers/bestie';
import { withClientVietnamese } from '../server/handlers/corrections';
import { parseTranslateRequest, translateSystemPrompt } from '../server/handlers/translate';

/** Story 036: a client's Vietnamese follows who they are (the owner's bug: a male client was "chị"). */

describe('client pronouns in Vietnamese', () => {
  it('male → anh, female → chị, unless the client file says otherwise; the stylist is em', () => {
    expect(clientVietnamese(getClient('tom')!)).toMatchObject({ self: 'anh', you: 'em' });
    expect(clientVietnamese(getClient('derek')!)).toMatchObject({ self: 'anh' });
    expect(clientVietnamese(getClient('brenda')!)).toMatchObject({ self: 'chị', you: 'em' });
    expect(clientVietnamese(getClient('grace')!)).toMatchObject({ self: 'cô', you: 'em' });
    expect(clientVietnamese(getClient('lily')!)).toMatchObject({ self: 'em', you: 'chị' });
    expect(clientVietnamese(getClient('lily')!).note).toMatch(/mother.*"cô"/);
  });

  it('the translation prompt carries the client\'s rule: Tom is never told to say "chị"', () => {
    const tom = translateSystemPrompt('en-to-vi', 'some', 'tom');
    expect(tom).toContain('Tom, a man');
    expect(tom).toContain('calls himself "anh" and calls the nail technician "em"');
    expect(tom).toMatch(/Never use [^.]*"chị"/);
    expect(tom).toContain('Anh hơi gấp');
    expect(tom).not.toContain('calls herself "chị"');
    expect(translateSystemPrompt('en-to-vi', 'some', 'brenda')).toContain('calls herself "chị"');
    expect(translateSystemPrompt('en-to-vi', 'some', 'lily')).toContain('"I" becomes "em" and "you" becomes "chị"');
    // No client: the old default.
    expect(translateSystemPrompt('en-to-vi', 'some')).toContain('By default the client calls herself "chị"');
    expect(translateSystemPrompt('vi-to-en', 'some', 'tom')).toContain('"sir"');
  });

  it('the server looks the client up by id and refuses an unknown one', () => {
    expect(parseTranslateRequest({ text: 'Hi', direction: 'en-to-vi', clientId: 'tom' })).toMatchObject({ ok: true, value: { clientId: 'tom' } });
    expect(parseTranslateRequest({ text: 'Hi', direction: 'en-to-vi', clientId: 'a man, say anh' }).ok).toBe(false);
    expect(parseTranslateRequest({ text: 'Hi', direction: 'en-to-vi' }).ok).toBe(true);
  });

  it('the companion (in Vietnamese) and the corrections get the client too', () => {
    expect(clientMentionRule(getClient('tom')!)).toContain('never "chị" for him');
    expect(withClient('PROMPT', 'vi', { clientId: 'tom' })).toContain('refer to Tom as "anh ấy"');
    expect(withClient('PROMPT', 'en', { clientId: 'tom' })).toBe('PROMPT');
    expect(withClient('PROMPT', 'vi', { clientId: 'nobody' })).toBe('PROMPT');
    expect(withClientVietnamese('PROMPT', { clientId: 'brenda' })).toContain('calls Brenda "chị" and themself "em"');
    expect(clientVietnameseRule(getClient('grace')!)).toContain('"cô"');
  });

  it('client files may only use known Vietnamese words', () => {
    const base = { ...(JSON.parse(JSON.stringify(getClient('tom'))) as Record<string, unknown>) };
    expect(() => parseClient({ ...base, vi: { self: 'ngài' } }, 'tom.json')).toThrow(/vi\.self/);
  });

  it('translations are cached per client: the same English line from Tom and Brenda is asked twice', async () => {
    let client = 'tom';
    const translate = vi.fn(async (_text: string, _d: string, _l: unknown, id?: string) => (id === 'tom' ? 'Anh…' : 'Chị…'));
    const cache = createTranslationCache(translate, [], () => client);
    expect(await cache.get('How much longer?')).toBe('Anh…');
    expect(await cache.get('How much longer?')).toBe('Anh…');
    client = 'brenda';
    expect(cache.peek('How much longer?')).toBeUndefined();
    expect(await cache.get('How much longer?')).toBe('Chị…');
    expect(translate).toHaveBeenCalledTimes(2);
    expect(translate.mock.calls[0]![3]).toBe('tom');
  });
});
