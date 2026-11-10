import { describe, expect, it } from 'vitest';
import { handleGradeAppointment, parseGradingOutput, parseGradingRequest } from '../server/handlers/grade-appointment';
import { SCORING_CONFIG, parseScoringConfig, scoreAppointment } from '../game/scoring';
import type { ScoreInput } from '../game/scoring';
import { ENGLISH_KEYS, SKILL_KEYS } from '../game/types';
import type { EnglishScores, SkillScores } from '../game/types';

/** Pure scoring formula, config validation and the strict grading parsers. Story: story-002. No network, time or randomness. */

const skillsOf = (score: number): SkillScores => Object.fromEntries(SKILL_KEYS.map((key) => [key, score])) as SkillScores;
const englishOf = (score: number): EnglishScores => Object.fromEntries(ENGLISH_KEYS.map((key) => [key, score])) as EnglishScores;

const input = (overrides: Partial<ScoreInput> = {}): ScoreInput => ({
  finalMood: 90,
  outcome: 'completed',
  skills: skillsOf(90),
  english: englishOf(90),
  level: 'some',
  rebooked: true,
  redoDemanded: false,
  ...overrides,
});

const { fiveStar } = SCORING_CONFIG.stars;

describe('walk-out', () => {
  it('is always 1 star with no tip, whatever the scorecard says', () => {
    const result = scoreAppointment(input({ outcome: 'walked_out', finalMood: 100, skills: skillsOf(100), english: englishOf(100) }));
    expect(result.stars).toBe(1);
    expect(result.tip).toBe(0);
    expect(result.goalMet).toBe(false);
    expect(result.failed).toBe(true);
    expect(result.failReasons).toEqual(['walked_out']);
  });
});

describe('5 stars', () => {
  it('is reached with high mood and every skill above the floor', () => {
    expect(scoreAppointment(input({ finalMood: 100, skills: skillsOf(100), english: englishOf(100) })).stars).toBe(5);
  });

  it('needs a high final mood', () => {
    const result = scoreAppointment(input({ finalMood: fiveStar.minMood - 1, skills: skillsOf(100), english: englishOf(100) }));
    expect(result.stars).toBeLessThan(5);
  });

  it('is blocked by any skill below the floor', () => {
    for (const key of SKILL_KEYS) {
      const skills = { ...skillsOf(100), [key]: fiveStar.skillFloor - 1 };
      const result = scoreAppointment(input({ finalMood: 100, skills, english: englishOf(100) }));
      expect(result.stars, key).toBeLessThan(5);
    }
  });

  it('allows a skill exactly at the floor', () => {
    const skills = { ...skillsOf(100), upsell: fiveStar.skillFloor };
    expect(scoreAppointment(input({ finalMood: 100, skills, english: englishOf(100) })).stars).toBe(5);
  });

  it('is blocked by a low counted English part but not by an uncounted one', () => {
    const low = fiveStar.skillFloor - 1;
    const clarityLow = { ...englishOf(100), clarity: low };
    const grammarLow = { ...englishOf(100), grammarVocabulary: low };
    const base = { finalMood: 100, skills: skillsOf(100) };
    expect(scoreAppointment(input({ ...base, level: 'beginner', english: clarityLow })).stars).toBeLessThan(5);
    expect(scoreAppointment(input({ ...base, level: 'beginner', english: grammarLow })).stars).toBe(5);
    expect(scoreAppointment(input({ ...base, level: 'some', english: grammarLow })).stars).toBe(5);
    expect(scoreAppointment(input({ ...base, level: 'comfortable', english: grammarLow })).stars).toBeLessThan(5);
  });
});

describe('determinism', () => {
  it('gives the same result for the same inputs and does not touch them', () => {
    const original = input({ finalMood: 63, skills: { ...skillsOf(70), upsell: 41 }, english: { clarity: 55, politeness: 80, grammarVocabulary: 12 } });
    const snapshot = structuredClone(original);
    const first = scoreAppointment(original);
    const second = scoreAppointment(original);
    expect(second).toEqual(first);
    expect(original).toEqual(snapshot);
  });
});

describe('level weighting of grammar/vocabulary', () => {
  const withGrammar = (grammarVocabulary: number): EnglishScores => ({ clarity: 70, politeness: 70, grammarVocabulary });
  const base = { finalMood: 60, skills: skillsOf(70) };

  it.each(['beginner', 'some'] as const)('at %s a terrible grammar score cannot change stars or tip', (level) => {
    const good = scoreAppointment(input({ ...base, level, english: withGrammar(70) }));
    const terrible = scoreAppointment(input({ ...base, level, english: withGrammar(0) }));
    expect(terrible.stars).toBe(good.stars);
    expect(terrible.tip).toBe(good.tip);
    expect(terrible.goalMet).toBe(good.goalMet);
    expect(terrible.failReasons).toEqual(good.failReasons);
  });

  it('still counts toward the English score itself at Beginner', () => {
    const good = scoreAppointment(input({ level: 'beginner', english: withGrammar(70) }));
    const terrible = scoreAppointment(input({ level: 'beginner', english: withGrammar(0) }));
    expect(terrible.englishScore).toBeLessThan(good.englishScore);
  });

  it.each(['comfortable', 'fluent'] as const)('at %s a terrible grammar score lowers stars or tip', (level) => {
    const good = scoreAppointment(input({ ...base, level, english: withGrammar(70) }));
    const terrible = scoreAppointment(input({ ...base, level, english: withGrammar(0) }));
    expect(terrible.stars <= good.stars && terrible.tip < good.tip).toBe(true);
  });
});

describe('stars and tip', () => {
  it('gives 1 star for a poor visit that is not a walk-out, with no tip', () => {
    const result = scoreAppointment(input({ finalMood: 10, skills: skillsOf(10), english: englishOf(10) }));
    expect(result.stars).toBe(1);
    expect(result.tip).toBe(0);
  });

  it('never tips below the configured minimum stars, and keeps tips inside the configured range', () => {
    for (const mood of [0, 10, 30, 50, 70, 90, 100]) {
      for (const skill of [0, 25, 50, 75, 100]) {
        const result = scoreAppointment(input({ finalMood: mood, skills: skillsOf(skill), english: englishOf(skill) }));
        if (result.stars < SCORING_CONFIG.tip.minStars) expect(result.tip).toBe(0);
        else {
          expect(result.tip).toBeGreaterThanOrEqual(SCORING_CONFIG.tip.min);
          expect(result.tip).toBeLessThanOrEqual(SCORING_CONFIG.tip.max);
        }
      }
    }
  });

  it('does not lower stars or tip when mood and every score go up', () => {
    let previous = scoreAppointment(input({ finalMood: 1, skills: skillsOf(0), english: englishOf(0) }));
    for (let step = 5; step <= 100; step += 5) {
      const next = scoreAppointment(input({ finalMood: step, skills: skillsOf(step), english: englishOf(step) }));
      expect(next.stars).toBeGreaterThanOrEqual(previous.stars);
      expect(next.tip).toBeGreaterThanOrEqual(previous.tip);
      previous = next;
    }
  });

  it('reports the English score as the mean of its three parts', () => {
    expect(scoreAppointment(input({ english: { clarity: 90, politeness: 60, grammarVocabulary: 30 } })).englishScore).toBe(60);
  });
});

describe('goal and fail flags', () => {
  const great = { finalMood: 100, skills: skillsOf(100), english: englishOf(100) };

  it('marks the goal for 5 stars, a good tip and a rebooking', () => {
    const result = scoreAppointment(input(great));
    expect(result.stars).toBe(5);
    expect(result.tip).toBeGreaterThanOrEqual(SCORING_CONFIG.tip.goodTipMin);
    expect(result).toMatchObject({ goalMet: true, failed: false, failReasons: [] });
  });

  it('misses the goal without a rebooking', () => {
    expect(scoreAppointment(input({ ...great, rebooked: false })).goalMet).toBe(false);
  });

  it('misses the goal when the tip is not good', () => {
    const picky = { ...SCORING_CONFIG, tip: { ...SCORING_CONFIG.tip, goodTipMin: SCORING_CONFIG.tip.max } };
    const result = scoreAppointment(input({ finalMood: 90, skills: skillsOf(90), english: englishOf(90) }), picky);
    expect(result.stars).toBe(5);
    expect(result.tip).toBeLessThan(picky.tip.goodTipMin);
    expect(result.goalMet).toBe(false);
  });

  it('fails on 1 and 2 stars but not on 3', () => {
    const at = (score: number) => scoreAppointment(input({ finalMood: score, skills: skillsOf(score), english: englishOf(score) }));
    const { minComposite } = SCORING_CONFIG.stars;
    const two = at(minComposite[2]);
    const three = at(minComposite[3]);
    expect([two.stars, three.stars]).toEqual([2, 3]);
    expect(two.failReasons).toEqual(['low_stars']);
    expect(three.failed).toBe(false);
    expect(at(0).failReasons).toEqual(['low_stars']);
  });

  it('fails on a redo demand whatever the stars', () => {
    const result = scoreAppointment(input({ ...great, redoDemanded: true }));
    expect(result.stars).toBe(5);
    expect(result.failed).toBe(true);
    expect(result.failReasons).toEqual(['redo_demanded']);
  });
});

describe('parseScoringConfig', () => {
  const valid = () => structuredClone(SCORING_CONFIG) as unknown as Record<string, unknown>;

  it('accepts the shipped config, which defaults to Some', () => {
    expect(SCORING_CONFIG.defaultEnglishLevel).toBe('some');
    expect(SCORING_CONFIG.englishWeights.beginner.grammarVocabulary).toBe(0);
    expect(SCORING_CONFIG.englishWeights.some.grammarVocabulary).toBe(0);
    expect(SCORING_CONFIG.englishWeights.comfortable.grammarVocabulary).toBeGreaterThan(0);
    expect(SCORING_CONFIG.englishWeights.fluent.grammarVocabulary).toBeGreaterThan(0);
  });

  it('rejects non-objects with a scoring.json message', () => {
    expect(() => parseScoringConfig(null)).toThrow(/^scoring\.json: /);
  });

  it('rejects an unknown default level', () => {
    expect(() => parseScoringConfig({ ...valid(), defaultEnglishLevel: 'expert' })).toThrow(/scoring\.json: "defaultEnglishLevel"/);
  });

  it('rejects grammar/vocabulary weight above 0 at Beginner or Some', () => {
    for (const level of ['beginner', 'some']) {
      const config = valid() as { englishWeights: Record<string, Record<string, number>> };
      config.englishWeights[level]!.grammarVocabulary = 1;
      expect(() => parseScoringConfig(config)).toThrow(new RegExp(`englishWeights.${level}.grammarVocabulary`));
    }
  });

  it('rejects star thresholds that do not increase', () => {
    const config = valid() as { stars: { minComposite: Record<string, number> } };
    config.stars.minComposite['4'] = 40;
    expect(() => parseScoringConfig(config)).toThrow(/minComposite/);
  });

  it('rejects a missing skill weight and a tip range that is upside down', () => {
    const noWeight = valid() as { stars: { skillWeights: Record<string, number> } };
    delete noWeight.stars.skillWeights.upsell;
    expect(() => parseScoringConfig(noWeight)).toThrow(/skillWeights.upsell/);
    const badTip = valid() as { tip: { min: number; max: number } };
    badTip.tip.max = badTip.tip.min - 1;
    expect(() => parseScoringConfig(badTip)).toThrow(/tip.max/);
  });
});

describe('parseGradingOutput', () => {
  const toolInput = () => ({
    skills: { greeting: 80, consultation: 70.4, upsell: 50, rebooking: 90, problemHandling: 60 },
    english: { clarity: 75, politeness: 85, grammarVocabulary: 40 },
    rebooked: true,
    redoDemanded: false,
    review: '  Nice and friendly. I will be back.  ',
  });
  const response = (input: unknown) => ({ content: [{ type: 'tool_use', name: 'grade_appointment', input }] });

  it('accepts a valid grading, rounding scores and trimming the review', () => {
    const parsed = parseGradingOutput(response(toolInput()));
    expect(parsed).toEqual({
      ok: true,
      value: { ...toolInput(), skills: { ...toolInput().skills, consultation: 70 }, review: 'Nice and friendly. I will be back.' },
    });
  });

  it.each([
    ['no content', {}],
    ['no tool call', { content: [{ type: 'text', text: 'hi' }] }],
    ['wrong tool', { content: [{ type: 'tool_use', name: 'other', input: toolInput() }] }],
  ])('rejects %s', (_name, upstream) => {
    expect(parseGradingOutput(upstream).ok).toBe(false);
  });

  it.each([
    ['skill above 100', (i: ReturnType<typeof toolInput>) => ((i.skills.greeting = 101), i)],
    ['skill below 0', (i: ReturnType<typeof toolInput>) => ((i.skills.upsell = -1), i)],
    ['skill not a number', (i: ReturnType<typeof toolInput>) => ({ ...i, skills: { ...i.skills, rebooking: '80' } })],
    ['missing skill', (i: ReturnType<typeof toolInput>) => ({ ...i, skills: { greeting: 1 } })],
    ['english part out of range', (i: ReturnType<typeof toolInput>) => ((i.english.clarity = 200), i)],
    ['english part NaN', (i: ReturnType<typeof toolInput>) => ((i.english.politeness = Number.NaN), i)],
    ['missing english', (i: ReturnType<typeof toolInput>) => ({ ...i, english: undefined })],
    ['rebooked not boolean', (i: ReturnType<typeof toolInput>) => ({ ...i, rebooked: 'yes' })],
    ['redoDemanded missing', (i: ReturnType<typeof toolInput>) => ({ ...i, redoDemanded: undefined })],
    ['blank review', (i: ReturnType<typeof toolInput>) => ({ ...i, review: '   ' })],
    ['review too long', (i: ReturnType<typeof toolInput>) => ({ ...i, review: 'x'.repeat(5000) })],
  ])('rejects %s', (_name, mutate) => {
    expect(parseGradingOutput(response(mutate(toolInput()))).ok).toBe(false);
  });
});

describe('parseGradingRequest', () => {
  const body = () => ({
    transcript: [
      { role: 'client', content: 'Hi.' },
      { role: 'player', content: 'Hello, welcome!' },
      { role: 'client', content: 'Thanks, bye.' },
    ],
    outcome: 'completed',
    finalMood: 80,
    level: 'beginner',
  });

  it('accepts a finished appointment, including one that ends on a client line', () => {
    expect(parseGradingRequest(body())).toMatchObject({ ok: true, value: { outcome: 'completed', finalMood: 80, level: 'beginner' } });
  });

  it.each([
    ['non-object', null],
    ['bad outcome', { ...body(), outcome: 'done' }],
    ['mood out of range', { ...body(), finalMood: 101 }],
    ['mood not a number', { ...body(), finalMood: '50' }],
    ['unknown level', { ...body(), level: 'native' }],
    ['empty transcript', { ...body(), transcript: [] }],
    ['no player line', { ...body(), transcript: [{ role: 'client', content: 'Hi.' }] }],
    ['bad role', { ...body(), transcript: [{ role: 'bestie', content: 'Hi.' }] }],
    ['blank content', { ...body(), transcript: [{ role: 'player', content: ' ' }] }],
  ])('rejects %s', (_name, value) => {
    expect(parseGradingRequest(value).ok).toBe(false);
  });
});

describe('handleGradeAppointment (fetch mocked)', () => {
  const request = {
    transcript: [
      { role: 'client', content: 'Hi.' },
      { role: 'player', content: 'Hello!' },
    ],
    outcome: 'walked_out',
    finalMood: 0,
    level: 'some',
  };
  const neverCalled = (() => {
    throw new Error('fetch must not be called');
  }) as unknown as typeof fetch;

  it('answers 400 invalid_request before anything else', async () => {
    const { status, body } = await handleGradeAppointment({ ...request, level: 'x' }, { ANTHROPIC_API_KEY: 'k' }, neverCalled);
    expect(status).toBe(400);
    expect(body).toMatchObject({ error: { code: 'invalid_request' } });
  });

  it('answers 503 missing_api_key without calling out', async () => {
    const { status, body } = await handleGradeAppointment(request, {}, neverCalled);
    expect(status).toBe(503);
    expect(body).toMatchObject({ error: { code: 'missing_api_key' } });
  });

  it('forces the tool, labels the player lines and returns the parsed grading', async () => {
    const grading = {
      skills: skillsOf(50),
      english: englishOf(60),
      rebooked: false,
      redoDemanded: true,
      review: 'Not great.',
    };
    let sent: { tool_choice: unknown; tools: { strict?: boolean }[]; system: { text: string }[]; messages: { content: string }[] } | undefined;
    const fakeFetch = (async (_url: string, init: RequestInit) => {
      sent = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ content: [{ type: 'tool_use', name: 'grade_appointment', input: grading }] }));
    }) as unknown as typeof fetch;
    const { status, body } = await handleGradeAppointment(request, { ANTHROPIC_API_KEY: 'secret-key' }, fakeFetch);
    expect(status).toBe(200);
    expect(body).toEqual(grading);
    // The grading model rejects forced tool_choice: auto + a strict tool.
    expect(sent?.tool_choice).toEqual({ type: 'auto' });
    expect(sent?.tools[0]?.strict).toBe(true);
    expect(sent?.messages[0]?.content).toContain('Stylist (player): Hello!');
    expect(sent?.system[0]?.text).toContain('level is some');
    expect(JSON.stringify(body)).not.toContain('secret-key');
  });

  it('retries once, then answers 502 invalid_model_output when the model breaks the schema', async () => {
    let calls = 0;
    const fakeFetch = (async () => {
      calls++;
      return new Response(JSON.stringify({ content: [{ type: 'tool_use', name: 'grade_appointment', input: { review: 'hi' } }] }));
    }) as unknown as typeof fetch;
    const { status, body } = await handleGradeAppointment(request, { ANTHROPIC_API_KEY: 'k' }, fakeFetch);
    expect(status).toBe(502);
    expect(body).toMatchObject({ error: { code: 'invalid_model_output' } });
    expect(calls).toBe(2);
  });

  it('retries once when the model answers in text without the tool, and uses the second answer', async () => {
    const grading = { skills: skillsOf(70), english: englishOf(70), rebooked: true, redoDemanded: false, review: 'Lovely.' };
    const answers = [
      { content: [{ type: 'text', text: 'Here is my grade: great job.' }] },
      { content: [{ type: 'tool_use', name: 'grade_appointment', input: grading }] },
    ];
    let calls = 0;
    const fakeFetch = (async () => new Response(JSON.stringify(answers[calls++]))) as unknown as typeof fetch;
    const { status, body } = await handleGradeAppointment(request, { ANTHROPIC_API_KEY: 'k' }, fakeFetch);
    expect(status).toBe(200);
    expect(body).toEqual(grading);
    expect(calls).toBe(2);
  });

  it('does not retry an HTTP error from the AI service', async () => {
    let calls = 0;
    const fakeFetch = (async () => {
      calls++;
      return new Response('{}', { status: 400 });
    }) as unknown as typeof fetch;
    const { status, body } = await handleGradeAppointment(request, { ANTHROPIC_API_KEY: 'k' }, fakeFetch);
    expect(status).toBe(502);
    expect(body).toMatchObject({ error: { code: 'upstream_error' } });
    expect(calls).toBe(1);
  });

  it('answers 502 upstream_unreachable when fetch throws', async () => {
    const fakeFetch = (async () => {
      throw new Error('down');
    }) as unknown as typeof fetch;
    const { status, body } = await handleGradeAppointment(request, { ANTHROPIC_API_KEY: 'k' }, fakeFetch);
    expect(status).toBe(502);
    expect(body).toMatchObject({ error: { code: 'upstream_unreachable' } });
  });
});
