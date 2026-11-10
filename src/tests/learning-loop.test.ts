import { describe, expect, it } from 'vitest';
import { handleCorrections, parseCorrectionsOutput, parseCorrectionsRequest } from '../server/handlers/corrections';
import { ENGLISH_LEVELS_CONFIG, parseEnglishLevelsConfig } from '../game/english-level';
import en from '../game/i18n/en.json';
import { LEARNING_CONFIG, TOPICS, parseLearningConfig, shouldCheckLine } from '../game/learning/corrections';
import type { LearningConfig, LineCheckRequest, ReviewRequest } from '../game/learning/corrections';
import { decideLevel, freshHistory, parseStoredHistory, recordScore } from '../game/learning/level-adjust';
import { addPhrases, groupByTopic, parseStoredPhrasebook } from '../game/learning/phrasebook';
import type { PhrasebookEntry } from '../game/learning/phrasebook';

/** Story 011: whisper budget, phrasebook, level auto-adjust, config and the corrections server. No network, time or randomness. */

const config: LearningConfig = { whispers: { maxPerAppointment: 3, minPlayerWords: 2 }, review: { maxLines: 4, tryLines: 3, maxUsedWell: 3 }, phrasebook: { maxEntries: 3 } };
const rules = { window: 3, upAtAverage: 80, downBelowAverage: 45 };

const entry = (en: string, topic: PhrasebookEntry['topic'] = 'consultation', session = 1): PhrasebookEntry => ({ en, vi: 'nghĩa', topic, source: 'recap', session });

const toolReply = (name: string, input: unknown): Response => new Response(JSON.stringify({ content: [{ type: 'tool_use', name, input }] }), { status: 200 });

function fakeFetch(respond: () => Response): { fetchImpl: typeof fetch; calls: { init: RequestInit }[] } {
  const calls: { init: RequestInit }[] = [];
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    calls.push({ init });
    return respond();
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

const lineRequest: LineCheckRequest = { kind: 'line', level: 'beginner', language: 'vi', phase: 'consultation', line: 'What color you like?', clientLine: 'Hi, I booked a manicure.' };
const reviewRequest: ReviewRequest = {
  kind: 'review', level: 'some', language: 'vi', outcome: 'completed',
  transcript: [
    { role: 'client', content: 'Hi, I booked a manicure.' },
    { role: 'player', content: 'Hello! Sit here please.' },
    { role: 'player', content: 'Would you like gel today?', helped: true },
  ],
};
const goodPhrase = { en: 'What color would you like?', vi: 'Chị muốn màu gì?', topic: 'consultation' };

describe('whisper budget', () => {
  it('checks real player lines until the cap', () => {
    expect(shouldCheckLine('What color you like?', false, 0, config)).toBe(true);
    expect(shouldCheckLine('What color you like?', false, 3, config)).toBe(false);
  });

  it('never checks Help me say it lines or one-word lines', () => {
    expect(shouldCheckLine('What color would you like?', true, 0, config)).toBe(false);
    expect(shouldCheckLine('  okay  ', false, 0, config)).toBe(false);
  });

  it('loads the shipped learning.json and names the problem in a bad one', () => {
    expect(LEARNING_CONFIG.whispers.maxPerAppointment).toBeGreaterThan(0);
    expect(() => parseLearningConfig({ ...structuredClone(LEARNING_CONFIG), whispers: { maxPerAppointment: 1.5, minPlayerWords: 2 } })).toThrow(/whispers\.maxPerAppointment/);
  });
});

describe('phrasebook', () => {
  it('adds without duplicates, ignoring case and punctuation', () => {
    const { book, added } = addPhrases([entry('What color would you like?')], [entry('what color would you like'), entry('Pick a shape.'), entry('Pick a shape!')], config);
    expect(added).toBe(1);
    expect(book.map((item) => item.en)).toEqual(['What color would you like?', 'Pick a shape.']);
  });

  it('drops the oldest past the cap', () => {
    const { book } = addPhrases([entry('One two'), entry('Three four')], [entry('Five six'), entry('Seven eight')], config);
    expect(book.map((item) => item.en)).toEqual(['Three four', 'Five six', 'Seven eight']);
  });

  it('groups by topic in topic order, newest first, leaving empty topics out', () => {
    const groups = groupByTopic([entry('Hello there', 'greeting'), entry('That is $35', 'price'), entry('Hi, welcome in', 'greeting')]);
    expect(groups.map((group) => group.topic)).toEqual(['greeting', 'price']);
    expect(groups[0]?.entries.map((item) => item.en)).toEqual(['Hi, welcome in', 'Hello there']);
  });

  it('reads a saved book, keeping only valid entries', () => {
    expect(parseStoredPhrasebook(null)).toEqual([]);
    expect(parseStoredPhrasebook('{oops')).toEqual([]);
    expect(parseStoredPhrasebook(JSON.stringify([entry('Hello there'), { en: 'x', vi: 'y', topic: 'gossip', source: 'recap', session: 1 }]))).toEqual([entry('Hello there')]);
  });

  it('has a Vietnamese and English name for every topic', () => {
    for (const topic of TOPICS) expect(Object.keys(en)).toContain(`phrasebook.topic.${topic}`);
  });
});

describe('level auto-adjust', () => {
  it('waits for a full window', () => {
    expect(decideLevel({ level: 'some', scores: [95, 95] }, rules)).toEqual({ kind: 'none' });
  });

  it('goes up automatically on a high average', () => {
    expect(decideLevel({ level: 'some', scores: [78, 85, 82] }, rules)).toEqual({ kind: 'up', to: 'comfortable', average: 82 });
  });

  it('only suggests going down on a low average', () => {
    expect(decideLevel({ level: 'comfortable', scores: [40, 50, 30] }, rules)).toEqual({ kind: 'suggest-down', to: 'some', average: 40 });
  });

  it('never goes above Fluent or below Beginner, and holds in the middle band', () => {
    expect(decideLevel({ level: 'fluent', scores: [99, 99, 99] }, rules)).toEqual({ kind: 'none' });
    expect(decideLevel({ level: 'beginner', scores: [10, 10, 10] }, rules)).toEqual({ kind: 'none' });
    expect(decideLevel({ level: 'some', scores: [60, 70, 65] }, rules)).toEqual({ kind: 'none' });
  });

  it('keeps only the last window of scores', () => {
    expect(recordScore({ level: 'some', scores: [10, 20, 30] }, 90, rules).scores).toEqual([20, 30, 90]);
  });

  it('starts fresh for another level or a bad save', () => {
    expect(parseStoredHistory(JSON.stringify({ level: 'some', scores: [80, 'x', 120, 70] }), 'some')).toEqual({ level: 'some', scores: [80, 70] });
    expect(parseStoredHistory(JSON.stringify({ level: 'some', scores: [80] }), 'fluent')).toEqual(freshHistory('fluent'));
    expect(parseStoredHistory('nope', 'beginner')).toEqual(freshHistory('beginner'));
  });

  it('reads the rules from english-levels.json and rejects a bad band', () => {
    expect(ENGLISH_LEVELS_CONFIG.autoAdjust.window).toBe(3);
    const bad = structuredClone(ENGLISH_LEVELS_CONFIG) as Record<string, any>;
    bad.autoAdjust.upAtAverage = 40;
    expect(() => parseEnglishLevelsConfig(bad)).toThrow(/autoAdjust\.upAtAverage/);
  });
});

describe('corrections server: request and output', () => {
  it('accepts a line check and a review, rejects bad bodies', () => {
    expect(parseCorrectionsRequest(lineRequest).ok).toBe(true);
    expect(parseCorrectionsRequest(reviewRequest)).toMatchObject({ ok: true, value: { transcript: reviewRequest.transcript } });
    expect(parseCorrectionsRequest({ ...lineRequest, line: '' })).toMatchObject({ ok: false });
    expect(parseCorrectionsRequest({ ...lineRequest, kind: 'quiz' })).toMatchObject({ ok: false });
    expect(parseCorrectionsRequest({ ...reviewRequest, transcript: [] })).toMatchObject({ ok: false });
  });

  it('turns "no correction needed" into an empty whisper', () => {
    expect(parseCorrectionsOutput(lineRequest, { content: [{ type: 'tool_use', name: 'check_line', input: { needsCorrection: false } }] }))
      .toEqual({ ok: true, value: { needsCorrection: false, praise: '', better: null, reason: '' } });
  });

  it('needs praise, a better phrase and a reason for a correction', () => {
    const output = (input: unknown) => ({ content: [{ type: 'tool_use', name: 'check_line', input }] });
    expect(parseCorrectionsOutput(lineRequest, output({ needsCorrection: true, praise: 'Hỏi màu là đúng rồi!', better: goodPhrase, reason: 'Thêm "would" cho lịch sự.' })))
      .toMatchObject({ ok: true, value: { needsCorrection: true, better: goodPhrase } });
    expect(parseCorrectionsOutput(lineRequest, output({ needsCorrection: true, praise: 'Good', better: { ...goodPhrase, topic: 'gossip' }, reason: 'x' }))).toMatchObject({ ok: false });
  });

  it('keeps good review items, drops bad ones, and needs a recap and lines to try', () => {
    const output = (input: unknown) => ({ content: [{ type: 'tool_use', name: 'english_review', input }] });
    const base = { lines: [{ said: 'Sit here please.', better: goodPhrase, reason: 'Lịch sự hơn.' }, { said: '', better: goodPhrase, reason: 'x' }], recap: 'Em làm tốt lắm.', tryLines: [goodPhrase, { en: 'x' }], usedWell: [] };
    const result = parseCorrectionsOutput(reviewRequest, output(base));
    expect(result).toMatchObject({ ok: true });
    if (result.ok && 'lines' in result.value) {
      expect(result.value.lines).toHaveLength(1);
      expect(result.value.tryLines).toEqual([goodPhrase]);
    }
    expect(parseCorrectionsOutput(reviewRequest, output({ ...base, recap: '' }))).toMatchObject({ ok: false });
    expect(parseCorrectionsOutput(reviewRequest, output({ ...base, tryLines: [] }))).toMatchObject({ ok: false });
  });
});

describe('corrections server: handler', () => {
  it('needs the API key and never calls out without it', async () => {
    const { fetchImpl, calls } = fakeFetch(() => toolReply('check_line', { needsCorrection: false }));
    expect(await handleCorrections(lineRequest, {}, fetchImpl)).toMatchObject({ status: 503, body: { error: { code: 'missing_api_key' } } });
    expect(calls).toHaveLength(0);
  });

  it('asks for kind, level-fair corrections, forces the tool and keeps the key out', async () => {
    const { fetchImpl, calls } = fakeFetch(() => toolReply('check_line', { needsCorrection: true, praise: 'Hỏi màu là đúng rồi!', better: goodPhrase, reason: 'Thêm "would".' }));
    const result = await handleCorrections(lineRequest, { ANTHROPIC_API_KEY: 'secret-key' }, fetchImpl);
    expect(result.status).toBe(200);
    const sent = JSON.parse(String(calls[0]?.init.body));
    expect(sent.tool_choice).toEqual({ type: 'tool', name: 'check_line' });
    expect(sent.system[0].text).toContain('Praise what worked before you correct');
    expect(sent.system[0].text).toContain('never comment on accent');
    expect(sent.system[0].text).toContain('Beginner');
    expect(sent.messages[0].content).toContain('Player said: What color you like?');
    expect(JSON.stringify(result)).not.toContain('secret-key');
  });

  it('marks Help me say it lines so the review skips them, and asks for the recap in Vietnamese', async () => {
    const { fetchImpl, calls } = fakeFetch(() => toolReply('english_review', { lines: [], recap: 'Em làm tốt lắm.', tryLines: [goodPhrase], usedWell: [] }));
    const result = await handleCorrections({ ...reviewRequest, language: 'en' }, { ANTHROPIC_API_KEY: 'k' }, fetchImpl);
    expect(result.status).toBe(200);
    const sent = JSON.parse(String(calls[0]?.init.body));
    expect(sent.messages[0].content).toContain('Player [helped]: Would you like gel today?');
    expect(sent.system[0].text).toContain('IN VIETNAMESE');
  });
});
