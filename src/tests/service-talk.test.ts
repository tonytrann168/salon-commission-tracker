import { describe, expect, it } from 'vitest';
import { createAppointment } from '../game/appointment';
import { SERVICE_TALK, checkoutBand, checkoutLine, expectsAnswer, parseServiceTalk, planServiceTalk } from '../game/service-talk';
import type { ClientPersona, ClientTurn, Phase } from '../game/types';

/** Story 035: the service is the game; the client talks mid-service; Done leads to checkout. */

const client = { id: 'lily', name: 'Lily', openingLine: 'Hi!', startingMood: 60, moodSensitivity: { up: 1, down: 1 }, difficulty: 'medium' } as unknown as ClientPersona;
const turns = (phases: Phase[]) => {
  let i = 0;
  return async (): Promise<ClientTurn> => ({ reply: `reply ${i}`, moodDelta: 0, phase: phases[Math.min(i++, phases.length - 1)]!, unclearEnglish: false, rude: false });
};

describe('mid-service talk', () => {
  it('plans 1–3 distinct lines, timed from the data', () => {
    for (let seed = 0; seed < 50; seed++) {
      let x = seed / 50;
      const rand = () => (x = (x * 9301 + 0.4927) % 1);
      const plan = planServiceTalk('hard', rand);
      expect(plan.length).toBeGreaterThanOrEqual(SERVICE_TALK.count.min);
      expect(plan.length).toBeLessThanOrEqual(SERVICE_TALK.count.max);
      expect(new Set(plan.map((p) => p.text)).size).toBe(plan.length);
      expect(plan[0]!.at).toBe(SERVICE_TALK.firstAfterSeconds);
      for (let i = 1; i < plan.length; i++) {
        const gap = plan[i]!.at - plan[i - 1]!.at;
        expect(gap).toBeGreaterThanOrEqual(SERVICE_TALK.gapSeconds.min);
        expect(gap).toBeLessThanOrEqual(SERVICE_TALK.gapSeconds.max);
      }
      expect(plan.every((p) => SERVICE_TALK.lines.hard.includes(p.text))).toBe(true);
    }
  });

  it('only questions wait for an answer; the data is checked', () => {
    expect(expectsAnswer('Are you almost done?')).toBe(true);
    expect(expectsAnswer('Are you almost done? I have to pick up my kids soon.')).toBe(true);
    expect(expectsAnswer('Ooh, that colour looks so pretty!')).toBe(false);
    expect(() => parseServiceTalk({ ...SERVICE_TALK, ignoreMoodDip: 2 })).toThrow(/ignoreMoodDip/);
    expect(() => parseServiceTalk({ ...SERVICE_TALK, count: { min: 3, max: 1 } })).toThrow(/count/);
  });
});

describe('her checkout line fits the result', () => {
  it('needs both a good match and a good mood to be happy; a poor result is polite but not delighted', () => {
    const { happy, okay } = SERVICE_TALK.checkout;
    expect(checkoutBand(happy.minMatch, happy.minMood)).toBe('happy');
    expect(checkoutBand(happy.minMatch - 1, 100)).toBe('okay');
    expect(checkoutBand(100, happy.minMood - 1)).toBe('okay');
    expect(checkoutBand(okay.minMatch - 1, 100)).toBe('unhappy');
    expect(checkoutBand(100, okay.minMood - 1)).toBe('unhappy');
    // The overseer's case: 28% match, mood 49 must not get "I love them!".
    expect(checkoutBand(28, 49)).toBe('unhappy');
    expect(SERVICE_TALK.checkout.unhappy.lines).toContain(checkoutLine(28, 49, () => 0.5));
    expect(SERVICE_TALK.checkout.unhappy.lines.join(' ')).not.toMatch(/love|great|perfect/i);
    expect(SERVICE_TALK.checkout.happy.lines).toContain(checkoutLine(90, 80, () => 0));
    for (const band of ['happy', 'okay', 'unhappy'] as const) expect(SERVICE_TALK.checkout[band].lines).toHaveLength(3);
    expect(() => parseServiceTalk({ ...SERVICE_TALK, checkout: { ...SERVICE_TALK.checkout, okay: { ...okay, minMatch: 99 } } })).toThrow(/okay/);
  });
});

describe('the appointment during service', () => {
  it('stays in service while held, whatever the model says; Done advances to checkout', async () => {
    const appointment = createAppointment({ client, takeTurn: turns(['service', 'checkout', 'done']), level: 'some', onFinished: () => undefined });
    await appointment.send('Hello, welcome!');
    expect(appointment.getSnapshot().phase).toBe('service');
    appointment.holdPhase('service');
    await appointment.send('Do you like this colour?');
    expect(appointment.getSnapshot().phase).toBe('service');
    appointment.advance('checkout');
    expect(appointment.getSnapshot().phase).toBe('checkout');
    appointment.advance('service');
    expect(appointment.getSnapshot().phase).toBe('checkout');
    appointment.advance('done');
    expect(appointment.getSnapshot().phase).toBe('checkout');
    await appointment.send('That is 25 dollars.');
    expect(appointment.getSnapshot().status).toBe('finished');
  });

  it('client lines of her own go into the transcript (for grading), never while a turn is in flight', async () => {
    let release: (turn: ClientTurn) => void = () => undefined;
    const appointment = createAppointment({ client, takeTurn: () => new Promise((r) => (release = r)), level: 'some', onFinished: () => undefined });
    appointment.clientSays('Is it okay if I check my phone?');
    expect(appointment.getSnapshot().transcript.at(-1)).toEqual({ role: 'client', content: 'Is it okay if I check my phone?' });
    const sending = appointment.send('Of course!');
    appointment.clientSays('Ignored while waiting');
    release({ reply: 'Thanks!', moodDelta: 0, phase: 'service', unclearEnglish: false, rude: false });
    await sending;
    const contents = appointment.getSnapshot().transcript.map((m) => m.content);
    expect(contents).toEqual(['Hi!', 'Is it okay if I check my phone?', 'Of course!', 'Thanks!']);
  });
});
