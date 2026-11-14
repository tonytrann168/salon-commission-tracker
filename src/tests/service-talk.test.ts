import { describe, expect, it } from 'vitest';
import { createAppointment } from '../game/appointment';
import { SERVICE_TALK, checkoutLine, expectsAnswer, parseServiceTalk, planServiceTalk } from '../game/service-talk';
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
    expect(expectsAnswer('Ooh, that colour looks so pretty!')).toBe(false);
    expect(SERVICE_TALK.checkout).toContain(checkoutLine(() => 0));
    expect(() => parseServiceTalk({ ...SERVICE_TALK, ignoreMoodDip: 2 })).toThrow(/ignoreMoodDip/);
    expect(() => parseServiceTalk({ ...SERVICE_TALK, count: { min: 3, max: 1 } })).toThrow(/count/);
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
