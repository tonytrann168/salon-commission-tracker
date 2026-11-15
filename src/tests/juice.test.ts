import { describe, expect, it } from 'vitest';
import juiceJson from '../game/config/juice.json';
import { JUICE_CONFIG, appointmentProgress, countUpValue, fixSize, lineGrade, parseJuiceConfig } from '../game/juice';
import { MASCOT_EXPRESSIONS } from '../game/mascot/mascot';
import { eyes, mouth, moodExtras } from '../game/mascot/shared';
import { AUDIO_CONFIG } from '../game/audio';

/** Story 057b: the appointment bar, "Perfect line!", the new sounds and the sad face. */

describe('the appointment progress bar', () => {
  it('starts empty, gives each phase an equal share, and is full only at the end', () => {
    expect(appointmentProgress(0, 3, 0, false)).toBe(0);
    expect(appointmentProgress(1, 3, 0, false)).toBeCloseTo(1 / 3);
    expect(appointmentProgress(2, 3, 0, false)).toBeCloseTo(2 / 3);
    expect(appointmentProgress(2, 3, 0, true)).toBe(1);
  });

  it('fills inside a phase with her lines, but never completes a phase that has not moved on', () => {
    const one = appointmentProgress(0, 3, 1, false);
    expect(one).toBeGreaterThan(0);
    expect(one).toBeLessThan(1 / 3);
    const many = appointmentProgress(0, 3, 50, false);
    expect(many).toBeLessThan(1 / 3);
    expect(appointmentProgress(1, 3, 1, false)).toBeGreaterThan(many);
  });
});

describe('every line graded (story 061)', () => {
  const ok = { needsCorrection: false, better: null };
  it('a long line with nothing to fix is Perfect; a shorter one is Great', () => {
    expect(lineGrade('Which colour would you like for your nails today?', ok, false)).toBe('perfect');
    expect(lineGrade('Which colour do you like?', ok, false)).toBe('great');
  });

  it('a real fix is Try this; a small fix is still Good', () => {
    const big = { needsCorrection: true, better: { en: 'Would you like me to file them a little shorter?' } };
    expect(lineGrade('You want short?', big, false)).toBe('try');
    const small = { needsCorrection: true, better: { en: 'Which colour would you like today?' } };
    expect(lineGrade('Which colour you would like today?', small, false)).toBe('good');
  });

  it('a helped line, or one too short to check, is Good (never more)', () => {
    expect(lineGrade('Which colour would you like for your nails today?', ok, true)).toBe('good');
    expect(lineGrade('Okay!', null, false)).toBe('good');
  });

  it('measures a fix by the share of new words in the better line', () => {
    expect(fixSize('Which colour you would like today?', 'Which colour would you like today?')).toBe(0);
    expect(fixSize('You want short?', 'Would you like me to file them a little shorter?')).toBeGreaterThan(JUICE_CONFIG.grades.smallFixShare);
  });
});

describe('config', () => {
  it('reads juice.json and refuses bad values', () => {
    expect(parseJuiceConfig(juiceJson)).toEqual(JUICE_CONFIG);
    expect(() => parseJuiceConfig({ ...juiceJson, progress: { linesPerPhase: 0 } })).toThrow('juice.json: "progress.linesPerPhase"');
    expect(() => parseJuiceConfig({ ...juiceJson, bursts: { ...juiceJson.bursts, confetti: 500 } })).toThrow('"bursts.confetti"');
    expect(() => parseJuiceConfig({ ...juiceJson, grades: { ...juiceJson.grades, smallFixShare: 2 } })).toThrow('"grades.smallFixShare"');
  });

  it('has a short sound for tap, correct, coin and streak', () => {
    for (const event of ['tap', 'correct', 'coin', 'streak'] as const) {
      expect(AUDIO_CONFIG.sfx[event].notes.length).toBeGreaterThan(0);
      expect(AUDIO_CONFIG.sfx[event].durationSeconds).toBeLessThanOrEqual(0.25);
    }
  });
});

describe('the companion faces', () => {
  it('has a sad face of its own (a gentle walk-out face), different from idle and thinking', () => {
    expect(MASCOT_EXPRESSIONS).toContain('sad');
    const face = (e: (typeof MASCOT_EXPRESSIONS)[number]) => eyes(e, 50, 56, 11, 4.2) + mouth(e, 50, 72, 7) + moodExtras(e);
    expect(face('sad')).not.toBe(face('idle'));
    expect(face('sad')).not.toBe(face('thinking'));
  });
});

describe('the results count-up (057c)', () => {
  it('starts at 0, eases up in whole numbers, never passes the target, and is exact at the end', () => {
    const d = JUICE_CONFIG.results.countMs;
    expect(countUpValue(25, 0, d)).toBe(0);
    const values = [0.1, 0.3, 0.5, 0.7, 0.9].map((f) => countUpValue(25, d * f, d));
    expect(values.every((v) => Number.isInteger(v) && v >= 0 && v <= 25)).toBe(true);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
    // Eased out: more than half way by half time.
    expect(countUpValue(100, d / 2, d)).toBeGreaterThan(50);
    expect(countUpValue(25, d, d)).toBe(25);
    expect(countUpValue(0, d / 2, d)).toBe(0);
  });
});
