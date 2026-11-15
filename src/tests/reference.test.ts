import { describe, expect, it } from 'vitest';
import referenceJson from '../game/config/reference.json';
import { NAIL_ART_CONFIG, coverage } from '../game/nail-art/design';
import type { NailRequest } from '../game/nail-art/design';
import { matchDesign } from '../game/nail-art/match';
import { REFERENCE_CONFIG, bringsPicture, parseReferenceConfig, referenceTarget } from '../game/reference';

/** Story 065: a hard client's reference picture (a target design drawn by the nail renderer) and the match. */

const request: NailRequest = { shapes: ['oval', 'almond'], lengths: ['long', 'medium'], colors: ['red', 'coral'], gradient: 'yes', gems: 'few', stickers: 'none' };

describe('who brings a picture', () => {
  it('only hard clients, about the configured share, the same for the same visit', () => {
    expect(bringsPicture('easy', 'v')).toBe(false);
    const visits = Array.from({ length: 400 }, (_, i) => bringsPicture('hard', `visit-${i}`));
    const share = visits.filter(Boolean).length / visits.length;
    expect(share).toBeGreaterThan(REFERENCE_CONFIG.chance - 0.1);
    expect(share).toBeLessThan(REFERENCE_CONFIG.chance + 0.1);
    expect(bringsPicture('hard', 'visit-3')).toBe(bringsPicture('hard', 'visit-3'));
  });
});

describe('the picture', () => {
  it('is one concrete look from her request: one shape, length and colour, her gradient and art, fully painted', () => {
    const { design, request: narrowed } = referenceTarget(request);
    expect(design).toMatchObject({ shape: 'oval', length: 'long', base: 'red' });
    expect(design.gradient).toBe('coral');
    expect(coverage(design).every((c) => c >= NAIL_ART_CONFIG.fullCoverage)).toBe(true);
    const gems = design.decorations.filter((d) => d.kind === 'gem').length;
    expect(gems).toBeGreaterThanOrEqual(NAIL_ART_CONFIG.decorationLevels.few[0]);
    expect(narrowed).toMatchObject({ shapes: ['oval'], lengths: ['long'], colors: ['red'], gradient: 'yes', gems: 'few', stickers: 'none' });
  });

  it('matches itself near 100%, and a different look much lower (the match % on the results)', () => {
    const { design, request: narrowed } = referenceTarget(request);
    expect(matchDesign(design, narrowed).score).toBeGreaterThanOrEqual(95);
    const other = { ...design, shape: 'square' as const, length: 'short' as const, base: 'black', gradient: null, decorations: [] };
    expect(matchDesign(other, narrowed).score).toBeLessThan(60);
  });

  it('reads reference.json and refuses bad values', () => {
    expect(parseReferenceConfig(referenceJson)).toEqual(REFERENCE_CONFIG);
    expect(() => parseReferenceConfig({ ...referenceJson, moodScale: 9 })).toThrow('"moodScale"');
  });
});
