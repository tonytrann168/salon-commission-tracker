import { describe, expect, it } from 'vitest';
import { createAppointment } from '../game/appointment';
import { ROSTER, clientsByDifficulty, getClient, parseClient, parseRoster, pickShift } from '../game/clients/roster';
import { CLIENT_TYPES, DIFFICULTIES } from '../game/types';
import { buildSystemPrompt, handleClientTurn, parseClientTurnRequest } from '../server/handlers/client-turn';
import { parseGradingRequest } from '../server/handlers/grade-appointment';

/** Story 006: the client roster as data files, difficulty, the picker's shift, and the server picking the client. */

describe('roster files', () => {
  it('has about nine clients, three per difficulty, unique ids', () => {
    expect(ROSTER.length).toBeGreaterThanOrEqual(9);
    for (const difficulty of DIFFICULTIES) expect(clientsByDifficulty(difficulty).length).toBeGreaterThanOrEqual(3);
    expect(new Set(ROSTER.map((c) => c.id)).size).toBe(ROSTER.length);
  });

  it("covers every hard-client type from the brief", () => {
    const covered = new Set(ROSTER.flatMap((client) => client.types));
    for (const type of CLIENT_TYPES) expect(covered.has(type)).toBe(true);
  });

  it('gives every client a nail request, a picker line in en and vi, and keeps Dana as the default', () => {
    for (const client of ROSTER) {
      expect(client.nailRequest).toBeDefined();
      expect(client.description.vi.length).toBeGreaterThan(0);
    }
    expect(getClient('dana')?.nailRequest?.shapes).toEqual(['square']);
    // The art tools get real use from story 006's clients.
    expect(ROSTER.some((c) => c.nailRequest?.gradient === 'yes')).toBe(true);
    expect(ROSTER.some((c) => c.nailRequest?.gems === 'lots')).toBe(true);
    expect(ROSTER.some((c) => c.nailRequest?.stickers !== 'none')).toBe(true);
  });

  it('refuses a bad client file with the file name and the problem', () => {
    const good = structuredClone(getClient('grace')) as Record<string, any>;
    expect(() => parseClient({ ...good, difficulty: 'nightmare' }, 'x.json')).toThrow(/^clients\/x\.json: "difficulty"/);
    expect(() => parseClient({ ...good, types: ['mean'] }, 'x.json')).toThrow(/types\[0\]/);
    expect(() => parseClient({ ...good, nailRequest: { ...good.nailRequest, colors: ['glow'] } }, 'x.json')).toThrow(/unknown colour/);
    expect(() => parseClient({ ...good, moodSensitivity: { up: 1, down: 5 } }, 'x.json')).toThrow(/moodSensitivity\.down/);
    expect(() => parseRoster({ 'a.json': good, 'b.json': good })).toThrow(/duplicate id "grace"/);
    expect(() => parseClient({ ...good, look: { ...good.look, hairStyle: 'mohawk' } }, 'x.json')).toThrow(/look\.hairStyle/);
    expect(getClient('tom')?.look.hairStyle).toBe('short');
  });
});

describe('shifts', () => {
  it('draws clients without repeats, in a repeatable order for a given random source', () => {
    let seed = 0.42;
    const random = () => (seed = (seed * 9301 + 0.49297) % 1);
    const shift = pickShift(clientsByDifficulty('hard'), 3, random);
    expect(shift).toHaveLength(3);
    expect(new Set(shift.map((c) => c.id)).size).toBe(3);
    expect(pickShift(clientsByDifficulty('easy'), 10)).toHaveLength(clientsByDifficulty('easy').length);
  });
});

describe('difficulty in play', () => {
  it('a sensitive client drops faster and rises slower (moodSensitivity)', async () => {
    const victoria = getClient('victoria')!;
    const turn = (delta: number) => async () => ({ reply: 'Hmm.', moodDelta: delta, phase: 'consultation' as const, unclearEnglish: false, rude: false });
    const down = createAppointment({ client: victoria, takeTurn: turn(-10), level: 'fluent', onFinished: () => undefined });
    await down.send('Hello.');
    expect(down.getSnapshot().mood).toBe(victoria.startingMood - 14);
    const up = createAppointment({ client: victoria, takeTurn: turn(10), level: 'fluent', onFinished: () => undefined });
    await up.send('Hello.');
    expect(up.getSnapshot().mood).toBe(victoria.startingMood + 8);
  });

  it("the server uses the chosen client's persona, difficulty and nail request, and refuses unknown clients", async () => {
    const tom = getClient('tom')!;
    const prompt = buildSystemPrompt(tom, 'some');
    expect(prompt).toContain('roleplaying Tom');
    expect(prompt).toContain('You are a hard client');
    expect(prompt).toContain('Your nails: you want square shape, nude');
    const body = { transcript: [{ role: 'client', content: tom.openingLine }, { role: 'player', content: 'Hello!' }], phase: 'consultation', mood: 40, level: 'some' };
    expect(parseClientTurnRequest({ ...body, clientId: 'nobody' })).toMatchObject({ ok: false });
    expect(parseClientTurnRequest({ ...body, clientId: 'tom' })).toMatchObject({ ok: true, value: { clientId: 'tom' } });
    expect(parseGradingRequest({ transcript: body.transcript, outcome: 'completed', finalMood: 50, level: 'some', clientId: 'ghost' })).toMatchObject({ ok: false });
    let sent = '';
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      sent = String(init.body);
      return new Response(JSON.stringify({ content: [{ type: 'tool_use', name: 'client_turn', input: { reply: 'Fine.', moodDelta: 0, phase: 'consultation', unclearEnglish: false, rude: false } }] }));
    }) as unknown as typeof fetch;
    await handleClientTurn({ ...body, clientId: 'tom' }, { ANTHROPIC_API_KEY: 'k' }, fetchImpl);
    expect(JSON.parse(sent).system[0].text).toContain('roleplaying Tom');
  });
});

describe('client pronouns (follow-up)', () => {
  it('every client has a pronoun; English results text follows it, "they" when unknown', async () => {
    const { t } = await import('../game/i18n');
    const { clientGrammar } = await import('../game/types');
    expect(getClient('tom')?.pronoun).toBe('he');
    expect(getClient('dana')?.pronoun).toBe('she');
    expect(t('results.fail.walked_out', clientGrammar(getClient('tom')?.pronoun), 'en')).toBe('He walked out. You can try again!');
    expect(t('results.fail.walked_out', clientGrammar(getClient('dana')?.pronoun), 'en')).toBe('She walked out. You can try again!');
    expect(t('results.fail.low_stars', {}, 'en')).toBe('Not their best visit. Try again!');
    expect(t('station.doneMessage', { ...clientGrammar('he'), score: 90 }, 'en')).toBe('Nails done! They match his request: 90%.');
    const good = { ...structuredClone(ROSTER[0]) } as Record<string, unknown>;
    expect(() => parseClient({ ...good, pronoun: 'it' }, 'x.json')).toThrow(/"pronoun"/);
  });
});
