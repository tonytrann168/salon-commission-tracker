import { describe, expect, it } from 'vitest';
import { handleBestie, parseBestieOutput, parseBestieRequest } from '../server/handlers/bestie';
import { BESTIE_CONFIG, parseBestieConfig } from '../game/bestie';
import type { BestieConfig, DebriefRequest } from '../game/bestie';
import { EMPTY_MEMORY, afterAnswer, afterDebrief, bestieLevel, greetingKind, parseStoredMemory, shouldAskQuestion } from '../game/bestie-memory';
import { NEW_SAVE, applyAppointment, liveStreak } from '../game/progression';
import { cleanPlayerName } from '../game/settings';

/** Story 003: bestie config, memory, level, the question rule and the server function. No network, time or randomness. */

const config: BestieConfig = {
  ...BESTIE_CONFIG,
  levelXp: [0, 30, 80],
  xp: { completed: 10, walkedOut: 5, questionAnswered: 5, dailyHello: 3, phrasePractised: 2 },
  question: { chance: 0.4, firstAfterSessions: 1, minSessionsBetween: 2 },
  memory: { maxSummaryChars: 100 },
};

const toolReply = (name: string, input: unknown): Response =>
  new Response(JSON.stringify({ content: [{ type: 'tool_use', name, input }] }), { status: 200 });

function fakeFetch(respond: () => Response): { fetchImpl: typeof fetch; calls: { url: string; init: RequestInit }[] } {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return respond();
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

const transcript = [
  { role: 'client' as const, content: 'Hi, I booked a manicure.' },
  { role: 'player' as const, content: 'Hello! Sit here please.' },
];

const debriefBody = (overrides: Partial<DebriefRequest> = {}): DebriefRequest => ({
  kind: 'debrief', level: 'beginner', language: 'vi', outcome: 'completed', stars: 4, tip: 11, englishScore: 72,
  skills: { greeting: 90, consultation: 80, upsell: 40, rebooking: 85, problemHandling: 70 },
  english: { clarity: 70, politeness: 90, grammarVocabulary: 60 },
  review: 'Friendly and quick.', transcript, memory: 'Shy about upselling.', sessionNumber: 3, askQuestion: false,
  ...overrides,
});

describe('bestie.json', () => {
  it('loads the shipped file', () => {
    expect(BESTIE_CONFIG.name.length).toBeGreaterThan(0);
    expect(BESTIE_CONFIG.levelXp[0]).toBe(0);
    expect(BESTIE_CONFIG.question.minSessionsBetween).toBeGreaterThanOrEqual(2);
  });

  it('names the problem for a bad file', () => {
    expect(() => parseBestieConfig(null)).toThrow(/^bestie\.json: /);
    expect(() => parseBestieConfig({ ...structuredClone(BESTIE_CONFIG), levelXp: [5, 10] })).toThrow(/start at 0/);
    expect(() => parseBestieConfig({ ...structuredClone(BESTIE_CONFIG), levelXp: [0, 10, 10] })).toThrow(/go up/);
    expect(() => parseBestieConfig({ ...structuredClone(BESTIE_CONFIG), question: { chance: 2, firstAfterSessions: 1, minSessionsBetween: 2 } })).toThrow(/question\.chance/);
  });
});

describe('bestie memory', () => {
  it('reads saved memory and falls back field by field', () => {
    expect(parseStoredMemory(null, config)).toEqual(EMPTY_MEMORY);
    expect(parseStoredMemory('not json', config)).toEqual(EMPTY_MEMORY);
    expect(parseStoredMemory(JSON.stringify({ summary: 'Likes pink.', sessions: 3, xp: 40, lastQuestionAt: 1 }), config))
      .toEqual({ ...EMPTY_MEMORY, summary: 'Likes pink.', sessions: 3, xp: 40, lastQuestionAt: 1 });
    expect(parseStoredMemory(JSON.stringify({ summary: 7, sessions: -2, xp: 1.5 }), config)).toEqual(EMPTY_MEMORY);
    expect(parseStoredMemory(JSON.stringify({ summary: 'x'.repeat(500) }), config).summary).toHaveLength(100);
  });

  it('counts a session and XP after a debrief, and marks a question', () => {
    const after = afterDebrief({ ...EMPTY_MEMORY, sessions: 2, xp: 20 }, { summary: '  New notes. ', outcome: 'completed', asked: true, today: '2026-11-10' }, config);
    expect(after).toEqual({ summary: 'New notes.', sessions: 3, xp: 30, lastQuestionAt: 2, lastTough: false, lastHelloDay: '', lastWin: '' });
    const walked = afterDebrief(EMPTY_MEMORY, { summary: '', outcome: 'walked_out', asked: false }, config);
    expect(walked.xp).toBe(5);
    expect(walked.lastQuestionAt).toBe(-1);
  });

  it('adds XP for answering a question', () => {
    expect(afterAnswer({ ...EMPTY_MEMORY, xp: 25 }, 'Has a daughter.', config)).toMatchObject({ xp: 30, summary: 'Has a daughter.' });
  });

  it('works out the bestie level from XP', () => {
    expect([0, 29, 30, 79, 80, 999].map((xp) => bestieLevel(xp, config))).toEqual([1, 1, 2, 2, 3, 3]);
  });
});

describe('when the bestie asks a question', () => {
  it('never on the first appointment', () => {
    expect(shouldAskQuestion(EMPTY_MEMORY, 0, config)).toBe(false);
  });

  it('sometimes after that, by chance', () => {
    const memory = { ...EMPTY_MEMORY, sessions: 1 };
    expect(shouldAskQuestion(memory, 0.39, config)).toBe(true);
    expect(shouldAskQuestion(memory, 0.4, config)).toBe(false);
  });

  it('never two appointments in a row', () => {
    expect(shouldAskQuestion({ ...EMPTY_MEMORY, sessions: 4, lastQuestionAt: 3 }, 0, config)).toBe(false);
    expect(shouldAskQuestion({ ...EMPTY_MEMORY, sessions: 5, lastQuestionAt: 3 }, 0, config)).toBe(true);
  });
});

describe('bestie server: request and output', () => {
  it('accepts each kind and rejects bad bodies', () => {
    expect(parseBestieRequest({ kind: 'hint', level: 'some', language: 'en', memory: '', phase: 'consultation', mood: 50, transcript }).ok).toBe(true);
    expect(parseBestieRequest(debriefBody()).ok).toBe(true);
    expect(parseBestieRequest({ kind: 'answer', level: 'some', language: 'vi', memory: '', question: 'What if...?', answer: 'I say sorry.' }).ok).toBe(true);
    expect(parseBestieRequest({ kind: 'gossip', level: 'some', language: 'en', memory: '' })).toMatchObject({ ok: false });
    expect(parseBestieRequest({ ...debriefBody(), stars: 9 })).toMatchObject({ ok: false });
    expect(parseBestieRequest({ ...debriefBody(), language: 'fr' })).toMatchObject({ ok: false });
    expect(parseBestieRequest({ ...debriefBody(), memory: 'x'.repeat(5000) })).toMatchObject({ ok: false });
    expect(parseBestieRequest({ kind: 'hint', level: 'some', language: 'en', memory: '', phase: 'nap', mood: 50, transcript })).toMatchObject({ ok: false });
  });

  it('requires the question only when one was asked for', () => {
    const output = (input: unknown) => ({ content: [{ type: 'tool_use', name: 'give_debrief', input }] });
    const base = { praise: 'Great hello.', tryNext: 'Offer gel: "Would you like gel?"', memory: 'Notes.' };
    expect(parseBestieOutput(debriefBody(), output({ ...base, question: 'ignored' }))).toEqual({ ok: true, value: { ...base, question: null } });
    expect(parseBestieOutput(debriefBody({ askQuestion: true }), output({ ...base, question: '' }))).toMatchObject({ ok: false });
    expect(parseBestieOutput(debriefBody({ askQuestion: true }), output({ ...base, question: 'What if she is late?' })))
      .toMatchObject({ ok: true, value: { question: 'What if she is late?' } });
    expect(parseBestieOutput(debriefBody(), output({ ...base, praise: '' }))).toMatchObject({ ok: false });
  });
});

describe('bestie server: handler', () => {
  it('needs the API key and never calls out without it', async () => {
    const { fetchImpl, calls } = fakeFetch(() => toolReply('give_debrief', {}));
    const result = await handleBestie(debriefBody(), {}, fetchImpl);
    expect(result).toMatchObject({ status: 503, body: { error: { code: 'missing_api_key' } } });
    expect(calls).toHaveLength(0);
  });

  it('sends memory, scorecard and the question flag, forces the tool, and keeps the key out of the reply', async () => {
    const { fetchImpl, calls } = fakeFetch(() =>
      toolReply('give_debrief', { praise: 'Em chào khách rất dễ thương.', tryNext: 'Lần sau mời khách làm gel: "Would you like gel?"', question: '', memory: 'Shy about upselling. Great greeter.' }),
    );
    const result = await handleBestie(debriefBody(), { ANTHROPIC_API_KEY: 'secret-key' }, fetchImpl);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ question: null, memory: 'Shy about upselling. Great greeter.' });
    const sent = JSON.parse(String(calls[0]?.init.body));
    expect(sent.tool_choice).toEqual({ type: 'tool', name: 'give_debrief' });
    expect(sent.system[0].text).toContain(BESTIE_CONFIG.name);
    expect(sent.system[0].text).toContain('Vietnamese');
    expect(sent.messages[0].content).toContain('Shy about upselling.');
    expect(sent.messages[0].content).toContain('upsell 40');
    expect(sent.messages[0].content).toContain('Do not ask a question this time.');
    expect(JSON.stringify(result)).not.toContain('secret-key');
  });

  it('whispers a hint from the conversation', async () => {
    const { fetchImpl, calls } = fakeFetch(() => toolReply('whisper_hint', { hint: 'Ask her color: "What color would you like?"' }));
    const result = await handleBestie({ kind: 'hint', level: 'beginner', language: 'en', memory: '', phase: 'consultation', mood: 45, transcript }, { ANTHROPIC_API_KEY: 'k' }, fetchImpl);
    expect(result).toEqual({ status: 200, body: { hint: 'Ask her color: "What color would you like?"' } });
    const sent = JSON.parse(String(calls[0]?.init.body));
    expect(sent.messages[0].content).toContain('Player (nail tech): Hello! Sit here please.');
    expect(sent.system[0].text).toContain('The client cannot hear you');
  });

  it('reports a bad model answer as invalid_model_output', async () => {
    const { fetchImpl } = fakeFetch(() => toolReply('whisper_hint', { hint: '' }));
    const result = await handleBestie({ kind: 'hint', level: 'some', language: 'en', memory: '', phase: 'service', mood: 50, transcript }, { ANTHROPIC_API_KEY: 'k' }, fetchImpl);
    expect(result).toMatchObject({ status: 502, body: { error: { code: 'invalid_model_output' } } });
  });
});

describe('Mai is warm and personal (owner, 2026-11-10)', () => {
  it("Mai's hello reads the one streak: days in a row with a finished daily client (never a missed day)", () => {
    // Arrange: daily clients finished on the 8th and 9th of November.
    let save = NEW_SAVE;
    for (const today of ['2026-11-08', '2026-11-09']) {
      save = applyAppointment(save, { stars: 3, tip: 5, goalMet: false, walkedOut: false, skills: { greeting: 60, consultation: 60, upsell: 60, rebooking: 60, problemHandling: 60 }, englishScore: 60, difficulty: 'easy', daily: true, today }).save;
    }
    const memory = { ...EMPTY_MEMORY, sessions: 4 };
    // Act + assert: the next day she mentions the 2-day streak; after a missed day she just says welcome back.
    expect(liveStreak(save, '2026-11-10')).toBe(2);
    expect(greetingKind(memory, liveStreak(save, '2026-11-10'))).toBe('streak');
    expect(greetingKind(memory, liveStreak(save, '2026-11-12'))).toBe('back');
    // Mai keeps no counter of her own: a debrief doesn't touch the streak.
    expect(Object.keys(afterDebrief(memory, { summary: '', outcome: 'completed', asked: false }))).not.toContain('streak');
  });

  it('greets a new friend first, and is gentle after a tough appointment', () => {
    expect(greetingKind(EMPTY_MEMORY, 0)).toBe('first');
    const tough = afterDebrief({ ...EMPTY_MEMORY, sessions: 1 }, { summary: '', outcome: 'completed', asked: false, today: '2026-11-10', tough: true });
    expect(tough.lastTough).toBe(true);
    expect(greetingKind(tough, 5)).toBe('tough');
    expect(afterDebrief(EMPTY_MEMORY, { summary: '', outcome: 'walked_out', asked: false, today: '2026-11-10' }).lastTough).toBe(true);
  });

  it('keeps a player name to letters and simple punctuation, capped', () => {
    expect(cleanPlayerName('  Lan  ')).toBe('Lan');
    expect(cleanPlayerName('Ngọc Ánh')).toBe('Ngọc Ánh');
    expect(cleanPlayerName('<script>Bo</script>')).toBe('scriptBoscript');
    expect(cleanPlayerName('x'.repeat(50))).toHaveLength(30);
  });

  it('sends the name as data and asks for gentleness after a tough visit', async () => {
    const { fetchImpl, calls } = fakeFetch(() => toolReply('give_debrief', { praise: 'p', tryNext: 't', question: '', memory: 'm' }));
    await handleBestie({ ...debriefBody(), playerName: 'Lan<>' }, { ANTHROPIC_API_KEY: 'k' }, fetchImpl);
    const sent = JSON.parse(String(calls[0]?.init.body));
    expect(sent.messages[0].content).toContain("Player's name: Lan\n");
    expect(sent.system[0].text).toContain('After a tough appointment');
    expect(sent.system[0].text).toContain('supportive coach, not a fixer');
  });
});
