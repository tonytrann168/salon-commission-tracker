import { describe, expect, it } from 'vitest';
import { ROSTER, getClient } from '../game/clients/roster';
import { NEW_SAVE, applyAppointment, dailyChallenge } from '../game/progression';
import { parseSave } from '../game/save';
import { SCENARIOS, applyScenario, eligibleScenarios, getScenario, parseScenario, parseScenarioFields, pickScenario, scenarioPrompt } from '../game/scenarios';
import { buildSystemPrompt, parseClientTurnRequest } from '../server/handlers/client-turn';
import { handleGradeAppointment } from '../server/handlers/grade-appointment';

/** Story 019: scenarios layered over clients. */

const ALL = ['easy', 'medium', 'hard'] as const;
const ids = (list: { id: string }[]) => list.map((s) => s.id).sort();

describe('scenario data', () => {
  it('has the six scenarios, each with a tag and an opening line in place', () => {
    expect(ids(SCENARIOS)).toEqual(['bridal-trial', 'elderly-regular', 'gift-card', 'party-tonight', 'returning-client', 'walk-in-rush']);
    for (const s of SCENARIOS) {
      expect(s.tag.en.length, s.id).toBeGreaterThan(5);
      expect(s.tag.vi.length, s.id).toBeGreaterThan(5);
    }
    expect(getScenario('bridal-trial')?.nailRequest).toMatchObject({ hands: 2, gradient: 'yes' });
  });

  it('refuses a bad scenario file with its name and the problem', () => {
    const good = structuredClone(getScenario('walk-in-rush')) as unknown as Record<string, unknown>;
    const clientIds = ROSTER.map((c) => c.id);
    expect(() => parseScenario({ ...good, id: 'other' }, 'walk-in-rush.json', clientIds)).toThrow(/scenarios\/walk-in-rush\.json: "id" must match/);
    expect(() => parseScenario({ ...good, eligible: { clients: ['nobody'] } }, 'walk-in-rush.json', clientIds)).toThrow(/known client ids/);
    expect(() => parseScenario({ ...good, nailRequest: { colors: ['rose-gold'] } }, 'walk-in-rush.json', clientIds)).toThrow(/free palette colour/);
  });
});

describe('eligibility', () => {
  it('fits the client, needs the difficulty unlocked, and "returning" only after a real visit', () => {
    const grace = getClient('grace')!;
    const tom = getClient('tom')!;
    expect(ids(eligibleScenarios(grace, SCENARIOS, { unlocked: ['easy'] }))).toEqual(['elderly-regular', 'gift-card', 'walk-in-rush']);
    expect(ids(eligibleScenarios(grace, SCENARIOS, { unlocked: [...ALL], visits: { visits: 2, lastStars: 4, lastDay: '2026-11-09' } }))).toContain('returning-client');
    expect(ids(eligibleScenarios(tom, SCENARIOS, { unlocked: [...ALL] }))).not.toContain('bridal-trial');
    expect(ids(eligibleScenarios(tom, SCENARIOS, { unlocked: [...ALL] }))).not.toContain('returning-client');
    expect(ids(eligibleScenarios(getClient('victoria')!, SCENARIOS, { unlocked: [...ALL] }))).toContain('party-tonight');
  });

  it('picks the same scenario for the same seed, and none when the chance says so', () => {
    const list = SCENARIOS.slice(0, 3);
    expect(pickScenario(123_456, list, 0.6)?.id).toBe(pickScenario(123_456, list, 0.6)?.id);
    expect(pickScenario(123_999, list, 0.6)).toBeNull();
    expect(pickScenario(5, [], 1)).toBeNull();
  });

  it('the daily client keeps its scenario all day (saved), and older saves without it still read', () => {
    let calls = 0;
    const offered = dailyChallenge(NEW_SAVE, '2026-11-10', ROSTER, undefined, () => (calls++, 'walk-in-rush'));
    expect(offered?.scenarioId).toBe('walk-in-rush');
    expect(dailyChallenge(offered!.save, '2026-11-10', ROSTER, undefined, () => (calls++, 'gift-card'))?.scenarioId).toBe('walk-in-rush');
    expect(calls).toBe(1);
    expect(parseSave(JSON.stringify({ version: 1, daily: { day: '2026-11-10', clientId: 'grace' } })).history).toEqual({});
  });
});

describe('the scenario over a client', () => {
  it('replaces the opening line and merges the nail request', () => {
    const dana = getClient('dana')!;
    const bridal = applyScenario(dana, getScenario('bridal-trial'));
    expect(bridal.openingLine).toMatch(/getting married/);
    expect(bridal.nailRequest).toMatchObject({ shapes: ['oval', 'almond'], hands: 2, gradient: 'yes' });
    expect(applyScenario(dana, undefined)).toBe(dana);
  });

  it('flows into the client prompt (situation, opening line, merged nails), and past visits for a returning client', () => {
    const grace = getClient('grace')!;
    const prompt = buildSystemPrompt(grace, 'some', getScenario('walk-in-rush'));
    expect(prompt).toContain("Today's situation: You walked in without a booking");
    expect(prompt).toMatch(/how long the wait is/);
    expect(buildSystemPrompt(grace, 'some')).not.toContain("Today's situation");
    const visits = { visits: 3, lastStars: 2, lastDay: '2026-11-01' };
    expect(scenarioPrompt(getScenario('returning-client')!, visits)).toContain('You have visited 3 times before; last time (2026-11-01) the visit earned 2 of 5 stars.');
    expect(buildSystemPrompt(getClient('dana')!, 'some', getScenario('bridal-trial'))).toContain('Your nails: you want both hands: oval or almond shape');
  });

  it('requests: scenarioId optional, unknown refused, bad visit facts dropped; grading gets the situation', async () => {
    const body = { transcript: [{ role: 'client', content: 'Hi' }, { role: 'player', content: 'Hello!' }], phase: 'consultation', mood: 50, level: 'some' };
    expect(parseClientTurnRequest(body)).toMatchObject({ ok: true });
    expect(parseClientTurnRequest({ ...body, scenarioId: 'moon-trip' })).toMatchObject({ ok: false });
    expect(parseScenarioFields({ scenarioId: 'returning-client', visits: { visits: 0, lastStars: 9 } })).toEqual({ ok: true, value: { scenarioId: 'returning-client' } });
    let sent = '';
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      sent = String(init.body);
      return new Response(JSON.stringify({ content: [] }), { status: 200 });
    }) as unknown as typeof fetch;
    await handleGradeAppointment({ transcript: body.transcript, outcome: 'completed', finalMood: 60, level: 'some', clientId: 'grace', scenarioId: 'walk-in-rush' }, { ANTHROPIC_API_KEY: 'k' }, fetchImpl);
    expect(sent).toContain('Situation: You walked in without a booking');
  });
});

describe('per-client history', () => {
  it('counts visits per client with the last stars and day', () => {
    const outcome = { stars: 4, tip: 8, goalMet: false, walkedOut: false, skills: { greeting: 60, consultation: 60, upsell: 60, rebooking: 60, problemHandling: 60 }, englishScore: 60, difficulty: 'easy' as const, daily: false, today: '2026-11-10', clientId: 'grace' };
    const once = applyAppointment(NEW_SAVE, outcome).save;
    const twice = applyAppointment(once, { ...outcome, stars: 2, today: '2026-11-11' }).save;
    expect(twice.history.grace).toEqual({ visits: 2, lastStars: 2, lastDay: '2026-11-11' });
    expect(parseSave(JSON.stringify(twice)).history.grace).toEqual({ visits: 2, lastStars: 2, lastDay: '2026-11-11' });
  });
});
