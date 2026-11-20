import { describe, expect, it } from 'vitest';
import stuckJson from '../game/config/stuck.json';
import { NOT_STUCK, STUCK_CONFIG, asksToRepeat, onClientLine, onTryGrade, parseStuckConfig, questionOf } from '../game/stuck';
import { PAUSE_CONFIG, afterLeaving, parsePauseConfig } from '../game/pause';
import { NEW_SAVE } from '../game/progression';
import { DEFAULT_CLIENT } from '../game/clients/default-client';
import { buildSystemPrompt, parseClientTurnRequest, toApiMessages } from '../server/handlers/client-turn';

/** Story 068 (owner playtest 5): never stuck in a loop; no picture she doesn't have; leaving a visit. */

describe('feeling stuck (the owner\'s real transcript)', () => {
  const question = 'Short or medium nails, please?';
  const sayAgain = 'Sorry, dear, can you say that again? Slowly, please.';

  it('her question waits in a line; "say that again" is a miss; one miss brings help, two and she picks', () => {
    let step = onClientLine(NOT_STUCK, question);
    expect(step.state).toEqual({ question, misses: 0 });
    expect(step.help).toBe(false);
    // "Got it." → graded Try this: a miss, and the companion helps.
    step = onTryGrade(step.state);
    expect(step.state.misses).toBe(STUCK_CONFIG.missesForHelp);
    expect(step.help).toBe(true);
    // "I'll get you" → "say that again": the second miss: she picks for the player.
    step = onClientLine(step.state, sayAgain);
    expect(step.state.misses).toBe(STUCK_CONFIG.missesBeforeDefault);
    expect(step.pickForPlayer).toBe(true);
    expect(step.help).toBe(false);
    // Her answer ("Let's do short, then.") closes the question.
    expect(onClientLine(step.state, "Let's do short, then.").state).toEqual(NOT_STUCK);
  });

  it('hears "say that again" in her words, and keeps the question short', () => {
    for (const line of [sayAgain, 'Pardon?', "Sorry, I didn't catch that.", 'Could you repeat that, please?']) expect(asksToRepeat(line)).toBe(true);
    for (const line of [question, 'That looks lovely!', 'How much is it?']) expect(asksToRepeat(line)).toBe(false);
    expect(questionOf('Hi! I want gel today. Short or medium nails, please?')).toBe('Short or medium nails, please?');
    expect(questionOf('Thank you.')).toBeNull();
    expect(questionOf(`${'a'.repeat(200)}?`)!.length).toBeLessThanOrEqual(STUCK_CONFIG.questionMaxChars);
  });

  it('reads stuck.json and refuses bad values', () => {
    expect(parseStuckConfig(stuckJson).missesBeforeDefault).toBe(STUCK_CONFIG.missesBeforeDefault);
    expect(() => parseStuckConfig({ ...stuckJson, missesBeforeDefault: 0 })).toThrow('stuck.json');
  });
});

describe('the client turn knows the picture and the stuck player', () => {
  const body = { transcript: [{ role: 'client', content: 'Hi!' }, { role: 'player', content: 'Can I see a picture?' }], phase: 'consultation', mood: 50, level: 'some' };
  it('says picture=no unless she brought one, and stylist_is_stuck only when asked', () => {
    const plain = parseClientTurnRequest(body);
    expect(plain.ok).toBe(true);
    if (!plain.ok) return;
    expect(toApiMessages(plain.value).at(-1)!.content).toContain('picture=no');
    expect(toApiMessages(plain.value).at(-1)!.content).not.toContain('stylist_is_stuck');
    const both = parseClientTurnRequest({ ...body, picture: true, stuck: true });
    if (!both.ok) throw new Error('parse');
    expect(toApiMessages(both.value).at(-1)!.content).toContain('picture=yes');
    expect(toApiMessages(both.value).at(-1)!.content).toContain('stylist_is_stuck=yes');
  });

  it('the system prompt forbids claiming a picture without one, and says how to move on when stuck', () => {
    const prompt = buildSystemPrompt(DEFAULT_CLIENT, 'some');
    expect(prompt).toContain('never say you have a picture');
    expect(prompt).toContain('stylist_is_stuck=yes');
  });
});

describe('leaving a visit (owner default: no penalty)', () => {
  it('changes nothing by default; a configured penalty never goes below zero', () => {
    const save = { ...NEW_SAVE, xp: 30, coins: 5 };
    expect(PAUSE_CONFIG.leave).toEqual({ xpPenalty: 0, coinsPenalty: 0 });
    expect(afterLeaving(save)).toBe(save);
    expect(afterLeaving(save, parsePauseConfig({ leave: { xpPenalty: 50, coinsPenalty: 2 } }))).toMatchObject({ xp: 0, coins: 3 });
  });
});
