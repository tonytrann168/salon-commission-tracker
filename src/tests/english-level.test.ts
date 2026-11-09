import { describe, expect, it } from 'vitest';
import { handleClientTurn, parseClientTurnRequest, parseModelOutput } from '../api/client-turn';
import { handleTranslate, parseTranslateOutput, parseTranslateRequest } from '../api/translate';
import {
  ENGLISH_LEVELS_CONFIG,
  buildWordTiles,
  matchesTarget,
  moodDeltaAfterEnglishRule,
  parseEnglishLevelsConfig,
  parseStoredHelpLanguage,
  parseStoredLevel,
  seededShuffle,
  shuffledWordTiles,
} from '../game/english-level';
import { ENGLISH_LEVELS } from '../game/types';

/** Level persistence parsing, mood override, Help me say it matching, word tiles, config and the translate server. Story: story-010. No network, time or randomness. */

const rawConfig = (): Record<string, any> => structuredClone(ENGLISH_LEVELS_CONFIG) as Record<string, any>;

const toolReply = (name: string, input: unknown): Response =>
  new Response(JSON.stringify({ content: [{ type: 'tool_use', name, input }] }), { status: 200 });

/** Hand-written fake fetch: records what it was called with and returns a canned response. */
function fakeFetch(respond: () => Response | Promise<Response>): { fetchImpl: typeof fetch; calls: { url: string; init: RequestInit }[] } {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return respond();
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

describe('stored settings parsing', () => {
  it('accepts every known level', () => {
    for (const level of ENGLISH_LEVELS) expect(parseStoredLevel(level)).toBe(level);
  });

  it('falls back to no level for missing or bad values', () => {
    for (const bad of [null, undefined, '', 'Beginner', 'expert', 3, {}]) expect(parseStoredLevel(bad)).toBeNull();
  });

  it('falls back to tap-to-translate for missing or bad help language values', () => {
    expect(parseStoredHelpLanguage('full')).toBe('full');
    for (const bad of [null, undefined, '', 'vi', 1]) expect(parseStoredHelpLanguage(bad)).toBe('tap');
  });
});

describe('mood override rule', () => {
  const unclear = { moodDelta: -10, unclearEnglish: true, rude: false };

  it('zeroes a drop for unclear English at Beginner and Some', () => {
    expect(moodDeltaAfterEnglishRule(unclear, 'beginner', false)).toBe(0);
    expect(moodDeltaAfterEnglishRule(unclear, 'some', false)).toBe(0);
  });

  it('leaves unhelped lines alone at Comfortable and Fluent', () => {
    expect(moodDeltaAfterEnglishRule(unclear, 'comfortable', false)).toBe(-10);
    expect(moodDeltaAfterEnglishRule(unclear, 'fluent', false)).toBe(-10);
  });

  it('zeroes the drop for a helped line at any level', () => {
    for (const level of ENGLISH_LEVELS) expect(moodDeltaAfterEnglishRule(unclear, level, true)).toBe(0);
  });

  it('keeps the drop when the player was rude', () => {
    expect(moodDeltaAfterEnglishRule({ ...unclear, rude: true }, 'beginner', true)).toBe(-10);
  });

  it('keeps the drop when the English was not the reason', () => {
    expect(moodDeltaAfterEnglishRule({ ...unclear, unclearEnglish: false }, 'beginner', false)).toBe(-10);
  });

  it('never touches a rise or a zero', () => {
    expect(moodDeltaAfterEnglishRule({ ...unclear, moodDelta: 8 }, 'beginner', false)).toBe(8);
    expect(moodDeltaAfterEnglishRule({ ...unclear, moodDelta: 0 }, 'beginner', false)).toBe(0);
  });
});

describe('Help me say it matching', () => {
  const target = "Hi! I'd like a gel manicure, please.";

  it('ignores case and punctuation', () => {
    expect(matchesTarget("hi i'd like a gel manicure please", target)).toBe(true);
    expect(matchesTarget('HI, ID LIKE A GEL MANICURE PLEASE!!', target)).toBe(true);
    expect(matchesTarget('  Hi!  I’d like a gel manicure,   please. ', target)).toBe(true);
  });

  it('allows a small typo', () => {
    expect(matchesTarget("Hi! I'd like a gel manicur, please.", target)).toBe(true);
    expect(matchesTarget("Hi! I'd lke a gel manicure, pleese.", target)).toBe(true);
  });

  it('rejects clear mismatches', () => {
    expect(matchesTarget('', target)).toBe(false);
    expect(matchesTarget('Hello, how are you today?', target)).toBe(false);
    expect(matchesTarget('Hi', target)).toBe(false);
    expect(matchesTarget("Hi! I'd like a pedicure and a haircut, thanks.", target)).toBe(false);
  });

  it('uses the tolerance it is given', () => {
    const strict = { maxEditShare: 0, minAllowedEdits: 0, maxAllowedEdits: 0 };
    expect(matchesTarget("Hi! I'd like a gel manicur, please.", target, strict)).toBe(false);
    expect(matchesTarget("hi id like a gel manicure please", target, strict)).toBe(true);
  });
});

describe('word tiles', () => {
  it('keeps punctuation on its word', () => {
    expect(buildWordTiles("Hi, I'd like a gel manicure, please.")).toEqual(['Hi,', "I'd", 'like', 'a', 'gel', 'manicure,', 'please.']);
  });

  it('joins a lone punctuation token to the word before it', () => {
    expect(buildWordTiles('Nails - gel   please ...')).toEqual(['Nails -', 'gel', 'please ...']);
  });

  it('shuffles the same way every time for the same seed', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    expect(seededShuffle(items, 7)).toEqual(seededShuffle(items, 7));
    expect([...seededShuffle(items, 7)].sort()).toEqual(items);
    expect(seededShuffle(items, 7)).not.toEqual(seededShuffle(items, 8));
    expect(items).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  });

  it('gives repeatable, complete, unsolved tiles for a line', () => {
    const line = 'Would you like a gel manicure today?';
    const tiles = shuffledWordTiles(line);
    expect(tiles).toEqual(shuffledWordTiles(line));
    expect([...tiles].sort()).toEqual([...buildWordTiles(line)].sort());
    expect(tiles).not.toEqual(buildWordTiles(line));
  });

  it('does not loop on a line of one repeated word', () => {
    expect(shuffledWordTiles('no no no')).toEqual(['no', 'no', 'no']);
  });
});

describe('english-levels.json validation', () => {
  it('loads the shipped file', () => {
    for (const level of ENGLISH_LEVELS) {
      const rules = ENGLISH_LEVELS_CONFIG.levels[level];
      expect(rules.speakingRules.length).toBeGreaterThan(0);
      expect(rules.pickerLine.vi.length).toBeGreaterThan(0);
      expect(rules.pickerLine.en.length).toBeGreaterThan(0);
    }
    expect(ENGLISH_LEVELS_CONFIG.levels.beginner.helpMode).toBe('tiles');
    expect(ENGLISH_LEVELS_CONFIG.levels.some.helpMode).toBe('retype');
    expect(ENGLISH_LEVELS_CONFIG.levels.beginner.englishNeverLowersMood).toBe(true);
    expect(ENGLISH_LEVELS_CONFIG.levels.fluent.englishNeverLowersMood).toBe(false);
  });

  it('names the file and the problem for a bad file', () => {
    expect(() => parseEnglishLevelsConfig(null)).toThrow(/^english-levels\.json: /);
    const missingLevel = rawConfig();
    delete missingLevel.levels.some;
    expect(() => parseEnglishLevelsConfig(missingLevel)).toThrow(/levels\.some/);
    const noRules = rawConfig();
    noRules.levels.fluent.speakingRules = '  ';
    expect(() => parseEnglishLevelsConfig(noRules)).toThrow(/levels\.fluent\.speakingRules/);
    const noVietnamese = rawConfig();
    delete noVietnamese.levels.beginner.pickerLine.vi;
    expect(() => parseEnglishLevelsConfig(noVietnamese)).toThrow(/levels\.beginner\.pickerLine\.vi/);
    const badMode = rawConfig();
    badMode.levels.beginner.helpMode = 'speak';
    expect(() => parseEnglishLevelsConfig(badMode)).toThrow(/helpMode/);
    const badTolerance = rawConfig();
    badTolerance.match.maxAllowedEdits = 0;
    badTolerance.match.minAllowedEdits = 2;
    expect(() => parseEnglishLevelsConfig(badTolerance)).toThrow(/match\.maxAllowedEdits/);
    const badSeed = rawConfig();
    badSeed.tileShuffleSeed = 1.5;
    expect(() => parseEnglishLevelsConfig(badSeed)).toThrow(/tileShuffleSeed/);
  });
});

describe('client turn request and output', () => {
  const request = {
    transcript: [
      { role: 'client', content: 'Hi.' },
      { role: 'player', content: 'Hello, what color?', helped: true },
    ],
    phase: 'consultation',
    mood: 50,
    level: 'beginner',
  };

  it('requires a valid level and keeps the helped flag', () => {
    const parsed = parseClientTurnRequest(request);
    expect(parsed.ok && parsed.value.level).toBe('beginner');
    expect(parsed.ok && parsed.value.transcript[1]?.helped).toBe(true);
    expect(parseClientTurnRequest({ ...request, level: undefined }).ok).toBe(false);
    expect(parseClientTurnRequest({ ...request, level: 'expert' }).ok).toBe(false);
    expect(parseClientTurnRequest({ ...request, transcript: [{ role: 'player', content: 'Hi', helped: 'yes' }] }).ok).toBe(false);
  });

  it('requires both booleans from the model', () => {
    const output = { reply: 'Okay.', moodDelta: 0, phase: 'consultation', unclearEnglish: false, rude: false };
    const parse = (input: unknown) => parseModelOutput({ content: [{ type: 'tool_use', name: 'client_turn', input }] });
    expect(parse(output).ok).toBe(true);
    expect(parse({ ...output, unclearEnglish: undefined }).ok).toBe(false);
    expect(parse({ ...output, rude: 'no' }).ok).toBe(false);
  });

  it('puts the level speaking rules and mood rules in the system prompt', async () => {
    const { fetchImpl, calls } = fakeFetch(() =>
      toolReply('client_turn', { reply: 'Okay.', moodDelta: 0, phase: 'consultation', unclearEnglish: false, rude: false }),
    );
    const result = await handleClientTurn(request, { ANTHROPIC_API_KEY: 'test-key' }, fetchImpl);
    expect(result.status).toBe(200);
    const sent = JSON.parse(String(calls[0]?.init.body));
    expect(sent.system[0].text).toContain(ENGLISH_LEVELS_CONFIG.levels.beginner.speakingRules);
    expect(sent.system[0].text).toContain('NEVER change because of grammar');
    expect(sent.messages.at(-1).content).toContain('stylist_used_help_me_say_it=yes');
  });
});

describe('translate request and output parsers', () => {
  it('accepts both directions and trims the text', () => {
    expect(parseTranslateRequest({ text: ' Xin chào ', direction: 'vi-to-en' })).toEqual({
      ok: true,
      value: { text: 'Xin chào', direction: 'vi-to-en' },
    });
    expect(parseTranslateRequest({ text: 'Hello', direction: 'en-to-vi' }).ok).toBe(true);
  });

  it('rejects bad requests', () => {
    expect(parseTranslateRequest(null).ok).toBe(false);
    expect(parseTranslateRequest({ text: 'Hello', direction: 'en-to-fr' }).ok).toBe(false);
    expect(parseTranslateRequest({ text: '   ', direction: 'en-to-vi' }).ok).toBe(false);
    expect(parseTranslateRequest({ text: 'a'.repeat(1001), direction: 'en-to-vi' }).ok).toBe(false);
    expect(parseTranslateRequest({ text: 5, direction: 'en-to-vi' }).ok).toBe(false);
  });

  it('reads the translation from the forced tool call only', () => {
    const wrap = (input: unknown, name = 'translation') => ({ content: [{ type: 'tool_use', name, input }] });
    expect(parseTranslateOutput(wrap({ translation: ' Xin chào ' }))).toEqual({ ok: true, value: { translation: 'Xin chào' } });
    expect(parseTranslateOutput(wrap({ translation: '' })).ok).toBe(false);
    expect(parseTranslateOutput(wrap({ translation: 4 })).ok).toBe(false);
    expect(parseTranslateOutput(wrap({ translation: 'x' }, 'other')).ok).toBe(false);
    expect(parseTranslateOutput({ content: 'text' }).ok).toBe(false);
  });
});

describe('translate handler', () => {
  const body = { text: 'Would you like a gel manicure?', direction: 'en-to-vi' };

  it('returns 503 missing_api_key without calling the AI', async () => {
    const { fetchImpl, calls } = fakeFetch(() => toolReply('translation', { translation: 'x' }));
    const result = await handleTranslate(body, {}, fetchImpl);
    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({ error: { code: 'missing_api_key' } });
    expect(calls).toHaveLength(0);
  });

  it('returns 400 for a bad request', async () => {
    const { fetchImpl } = fakeFetch(() => toolReply('translation', { translation: 'x' }));
    const result = await handleTranslate({ text: '', direction: 'en-to-vi' }, { ANTHROPIC_API_KEY: 'k' }, fetchImpl);
    expect(result.status).toBe(400);
  });

  it('forces the tool, sends the key as a header and returns the translation', async () => {
    const { fetchImpl, calls } = fakeFetch(() => toolReply('translation', { translation: 'Chị muốn làm móng gel không?' }));
    const result = await handleTranslate(body, { ANTHROPIC_API_KEY: 'secret-key' }, fetchImpl);
    expect(result).toEqual({ status: 200, body: { translation: 'Chị muốn làm móng gel không?' } });
    const sent = JSON.parse(String(calls[0]?.init.body));
    expect(sent.tool_choice).toEqual({ type: 'tool', name: 'translation' });
    expect(sent.messages).toEqual([{ role: 'user', content: body.text }]);
    expect((calls[0]?.init.headers as Record<string, string>)['x-api-key']).toBe('secret-key');
    expect(JSON.stringify(result)).not.toContain('secret-key');
  });

  it('uses a different system prompt for each direction', async () => {
    const { fetchImpl, calls } = fakeFetch(() => toolReply('translation', { translation: 'Hello' }));
    await handleTranslate(body, { ANTHROPIC_API_KEY: 'k' }, fetchImpl);
    await handleTranslate({ text: 'Xin chào', direction: 'vi-to-en' }, { ANTHROPIC_API_KEY: 'k' }, fetchImpl);
    const [first, second] = calls.map((call) => JSON.parse(String(call.init.body)).system[0].text as string);
    expect(first).not.toBe(second);
  });

  it('maps upstream failures to 502 codes', async () => {
    const down = fakeFetch(() => {
      throw new Error('offline');
    });
    expect((await handleTranslate(body, { ANTHROPIC_API_KEY: 'k' }, down.fetchImpl)).body).toMatchObject({ error: { code: 'upstream_unreachable' } });
    const bad = fakeFetch(() => new Response('{}', { status: 500 }));
    expect((await handleTranslate(body, { ANTHROPIC_API_KEY: 'k' }, bad.fetchImpl)).body).toMatchObject({ error: { code: 'upstream_error' } });
    const junk = fakeFetch(() => new Response('not json', { status: 200 }));
    expect((await handleTranslate(body, { ANTHROPIC_API_KEY: 'k' }, junk.fetchImpl)).body).toMatchObject({ error: { code: 'invalid_model_output' } });
    const noTool = fakeFetch(() => toolReply('translation', { translation: '' }));
    expect((await handleTranslate(body, { ANTHROPIC_API_KEY: 'k' }, noTool.fetchImpl)).status).toBe(502);
  });
});
