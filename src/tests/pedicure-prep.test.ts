import { describe, expect, it } from 'vitest';
import { PREP_CONFIG, parsePrepConfig, prepOutcome, startPrep, stepPrep } from '../game/nail-art/prep';
import type { Prep, PrepEvent } from '../game/nail-art/prep';

/** Story 026: soak, then scrub, then paint. */

const run = (prep: Prep, ...events: PrepEvent[]): Prep => events.reduce((p, e) => stepPrep(p, e), prep);

describe('pedicure prep', () => {
  it('reads the data file (positive timings, en/vi lines, skip for easy clients)', () => {
    expect(PREP_CONFIG.soakSeconds).toBeGreaterThan(0);
    expect(PREP_CONFIG.skipFor).toEqual(['easy']);
    expect(() => parsePrepConfig({ ...PREP_CONFIG, soakSeconds: 0 })).toThrow(/soakSeconds/);
    expect(() => parsePrepConfig({ ...PREP_CONFIG, reactions: { done: [], skipped: PREP_CONFIG.reactions.skipped } })).toThrow(/done/);
  });

  it('soaks for soakSeconds of delta time, however the frames fall, then scrubs', () => {
    let p = run(startPrep('medium'), { type: 'start' });
    expect(p.state).toBe('soaking');
    // Scrubbing does nothing while soaking.
    p = stepPrep(p, { type: 'scrub', widths: 10 });
    expect(p).toMatchObject({ state: 'soaking', progress: 0 });
    const frames = Math.round(PREP_CONFIG.soakSeconds * 30) - 1;
    for (let i = 0; i < frames; i++) p = stepPrep(p, { type: 'tick', seconds: 1 / 30 });
    expect(p.state).toBe('soaking');
    p = stepPrep(p, { type: 'tick', seconds: 1 / 30 + 0.001 });
    expect(p).toMatchObject({ state: 'scrubbing', progress: 0 });
    // A slow phone (big frames) gets there in the same time.
    expect(run(startPrep('medium'), { type: 'start' }, { type: 'tick', seconds: PREP_CONFIG.soakSeconds }).state).toBe('scrubbing');
  });

  it('scrubs by distance (in widths of the foot area); taps count too; then done', () => {
    let p = run(startPrep('hard'), { type: 'start' }, { type: 'tick', seconds: PREP_CONFIG.soakSeconds });
    p = stepPrep(p, { type: 'scrub', widths: PREP_CONFIG.scrubWidths / 2 });
    expect(p).toMatchObject({ state: 'scrubbing', progress: 0.5 });
    p = stepPrep(p, { type: 'tick', seconds: 100 });
    expect(p.progress).toBe(0.5);
    const taps = Math.ceil(PREP_CONFIG.scrubWidths / 2 / PREP_CONFIG.scrubTapWidths);
    for (let i = 0; i < taps; i++) p = stepPrep(p, { type: 'scrub', widths: PREP_CONFIG.scrubTapWidths });
    expect(p).toMatchObject({ state: 'done', progress: 1 });
    expect(prepOutcome(p, 0)).toMatchObject({ moodDelta: PREP_CONFIG.moodBonus, line: PREP_CONFIG.reactions.done[0] });
  });

  it('only easy clients can skip; skipping gives no bonus and no penalty', () => {
    expect(stepPrep(startPrep('medium'), { type: 'skip' }).state).toBe('ready');
    const skipped = run(startPrep('easy'), { type: 'start' }, { type: 'skip' });
    expect(skipped.state).toBe('skipped');
    expect(prepOutcome(skipped, 0.99)).toMatchObject({ moodDelta: 0, line: PREP_CONFIG.reactions.skipped.at(-1) });
    // Final states ignore everything.
    expect(run(skipped, { type: 'start' }, { type: 'scrub', widths: 99 })).toEqual(skipped);
    expect(prepOutcome(startPrep('easy'), 0)).toBeNull();
  });
});
