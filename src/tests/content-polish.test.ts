import { describe, expect, it } from 'vitest';
import { pickFresh, remember } from '../game/fresh-lines';
import { STARTERS, parseStarters } from '../game/learning/starters';
import { TOPICS } from '../game/learning/corrections';
import { CORNER_CONFIG, pickLine } from '../game/corner';
import { getScenario, parseScenario } from '../game/scenarios';
import { ROSTER } from '../game/clients/roster';

/** Story 033: no repeated canned lines, starter phrases, and two new situations. */

describe('fresh lines', () => {
  it('never repeats any of the last N picks, over a long run', () => {
    let recent: number[] = [];
    for (let i = 0; i < 500; i++) {
      const pick = pickFresh(6, recent, 3, (i * 0.618) % 1);
      expect(recent.slice(-3)).not.toContain(pick);
      recent = remember(recent, pick, 3);
    }
  });

  it('still uses every line (fair), and always has a choice when there are few lines', () => {
    const seen = new Set<number>();
    let recent: number[] = [];
    for (let i = 0; i < 60; i++) {
      const pick = pickFresh(6, recent, 3, Math.random());
      seen.add(pick);
      recent = remember(recent, pick, 3);
    }
    expect(seen.size).toBe(6);
    expect(pickFresh(2, [1, 2], 5, 0.5)).toBe(1);
    expect(pickFresh(1, [1], 3, 0.9)).toBe(1);
  });

  it('corner lines use the configured window', () => {
    expect(CORNER_CONFIG.noRepeatWithin).toBe(3);
    for (const roll of [0, 0.5, 0.99]) expect([4, 5, 6]).not.toContain(pickLine('chat', [4, 5, 6], roll));
  });
});

describe('starter phrases', () => {
  it('has 10 phrases per topic, each with Vietnamese, no duplicates', () => {
    for (const topic of TOPICS) {
      expect(STARTERS[topic]).toHaveLength(10);
      expect(STARTERS[topic].every((p) => p.en.trim() && p.vi.trim())).toBe(true);
    }
    const all = TOPICS.flatMap((topic) => STARTERS[topic].map((p) => p.en.toLowerCase()));
    expect(new Set(all).size).toBe(all.length);
    expect(() => parseStarters({ topics: { greeting: [{ en: 'Hi' }] } })).toThrow();
  });
});

describe('new scenarios', () => {
  it('rainy day and colour redo load; only the redo scenario allows a redo', () => {
    expect(getScenario('rainy-day')).toMatchObject({ difficulty: 'easy' });
    expect(getScenario('rainy-day')?.redo).toBeUndefined();
    expect(getScenario('colour-redo')).toMatchObject({ redo: true, eligible: { difficulties: ['medium', 'hard'] } });
    const ids = ROSTER.map((c) => c.id);
    const base = { id: 'x', name: { en: 'x', vi: 'x' }, tag: { en: 'x', vi: 'x' }, difficulty: 'easy', eligible: { difficulties: ['easy'] }, occasion: 'o', constraints: 'c', openingLine: 'l' };
    expect(() => parseScenario({ ...base, redo: 'yes' }, 'x.json', ids)).toThrow(/redo/);
  });
});
