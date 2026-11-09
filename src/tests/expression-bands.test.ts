import { describe, expect, it } from 'vitest';
import { EXPRESSION_CONFIG, EXPRESSIONS, WALKOUT_POSE, expressionForMood, poseFor } from '../game/portraits/portrait';

/** Mood band lookup against the real config/expressions.json. Story: story-009. */

describe('expressionForMood', () => {
  it.each([
    [0, 'furious'],
    [19, 'furious'],
    [20, 'annoyed'],
    [39, 'annoyed'],
    [40, 'neutral'],
    [59, 'neutral'],
    [60, 'pleased'],
    [79, 'pleased'],
    [80, 'delighted'],
    [100, 'delighted'],
  ] as const)('mood %i is %s', (mood, expression) => {
    expect(expressionForMood(mood)).toBe(expression);
  });

  it('matches the configured band edges', () => {
    for (const band of EXPRESSION_CONFIG.bands) {
      expect(expressionForMood(band.min)).toBe(band.expression);
      expect(expressionForMood(band.max)).toBe(band.expression);
    }
  });
});

describe('poseFor', () => {
  it('shows the walkout pose only for a walked_out outcome', () => {
    for (const mood of [0, 50, 100]) {
      expect(poseFor(mood, 'walked_out')).toBe(WALKOUT_POSE);
      expect(poseFor(mood, 'completed')).toBe(expressionForMood(mood));
      expect(poseFor(mood, null)).toBe(expressionForMood(mood));
    }
  });

  it('never picks walkout from a mood band', () => {
    for (let mood = 0; mood <= 100; mood++) {
      expect(EXPRESSIONS).toContain(expressionForMood(mood));
    }
  });
});
