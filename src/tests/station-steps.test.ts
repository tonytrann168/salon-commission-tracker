import { describe, expect, it } from 'vitest';
import { NAIL_COUNT, decorate, emptyDesign, paint, paintableCells } from '../game/nail-art/design';
import type { NailDesign, NailRequest } from '../game/nail-art/design';
import { STATION_STEPS, stepChecks, wantsArt } from '../game/nail-art/steps';

/** Story 049: the station's numbered steps and their ✓. */

const request: NailRequest = { shapes: ['oval'], colors: ['red'], gradient: 'no', gems: 'none', stickers: 'none' };
const full = (design: NailDesign): NailDesign => {
  let next = design;
  for (let nail = 0; nail < NAIL_COUNT; nail++) next = paint(next, nail, paintableCells(design.shape));
  return next;
};

describe('station steps', () => {
  it('are in order: shape, colour, art', () => {
    expect(STATION_STEPS).toEqual(['shape', 'colour', 'art']);
  });

  it('tick shape for her shape, colour only for her colour fully painted', () => {
    expect(stepChecks(emptyDesign('round'), request)).toEqual({ shape: false, colour: false, art: true });
    expect(stepChecks(emptyDesign('oval'), request).shape).toBe(true);
    expect(stepChecks({ ...emptyDesign('oval'), base: 'red' }, request).colour).toBe(false);
    expect(stepChecks(full({ ...emptyDesign('oval'), base: 'red' }), request).colour).toBe(true);
    expect(stepChecks(full({ ...emptyDesign('oval'), base: 'coral' }), request).colour).toBe(false);
  });

  it('tick art when the extras match; art is optional only when she asked for none', () => {
    const gems: NailRequest = { ...request, gems: 'few' };
    expect(wantsArt(request)).toBe(false);
    expect(wantsArt(gems)).toBe(true);
    expect(stepChecks(emptyDesign('oval'), gems).art).toBe(false);
    let design = emptyDesign('oval');
    for (const nail of [0, 1]) design = decorate(design, { nail, x: 0.5, y: 0.5, kind: 'gem' });
    expect(stepChecks(design, gems).art).toBe(true);
  });
});
