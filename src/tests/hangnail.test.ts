import { describe, expect, it } from 'vitest';
import hangnailJson from '../game/config/hangnail.json';
import { HANGNAIL_CONFIG, parseHangnailConfig, planHangnail, saysSorry, trimOutcome } from '../game/hangnail';

/** Story 064: a hangnail on hard clients, the Nipper, a small slip and first aid. */

describe('who has a hangnail', () => {
  it('only hard clients, about the configured share, on a finger (never the thumb), the same for the same visit', () => {
    expect(planHangnail('easy', 'v1', 5)).toBeNull();
    expect(planHangnail('medium', 'v1', 5)).toBeNull();
    const visits = Array.from({ length: 400 }, (_, i) => planHangnail('hard', `visit-${i}`, 5));
    const share = visits.filter((v) => v !== null).length / visits.length;
    expect(share).toBeGreaterThan(HANGNAIL_CONFIG.chance - 0.1);
    expect(share).toBeLessThan(HANGNAIL_CONFIG.chance + 0.1);
    expect(visits.every((v) => v === null || (v >= 1 && v <= 4))).toBe(true);
    expect(planHangnail('hard', 'visit-7', 5)).toBe(planHangnail('hard', 'visit-7', 5));
  });
});

describe('trimming', () => {
  it('a steady hold is clean; a quick snip or a hard press slips; in between, hold a little longer', () => {
    expect(trimOutcome(HANGNAIL_CONFIG.trimMs, 0.5)).toBe('clean');
    expect(trimOutcome(HANGNAIL_CONFIG.slipMs - 1, 0.5)).toBe('slip');
    expect(trimOutcome(HANGNAIL_CONFIG.trimMs, 1)).toBe('slip');
    expect(trimOutcome((HANGNAIL_CONFIG.slipMs + HANGNAIL_CONFIG.trimMs) / 2, 0.5)).toBe('short');
  });

  it('hears sorry in English and Vietnamese', () => {
    for (const line of ["I'm so sorry!", 'My apologies, are you okay?', 'Em xin lỗi chị nha.']) expect(saysSorry(line)).toBe(true);
    for (const line of ['Hold still, please.', 'All done!']) expect(saysSorry(line)).toBe(false);
  });

  it('reads hangnail.json and refuses bad values', () => {
    expect(parseHangnailConfig(hangnailJson).trimMs).toBe(HANGNAIL_CONFIG.trimMs);
    expect(() => parseHangnailConfig({ ...hangnailJson, slipMs: 5000 })).toThrow('hangnail.json');
    expect(() => parseHangnailConfig({ ...hangnailJson, slipMood: 5 })).toThrow('"slipMood"');
  });
});
