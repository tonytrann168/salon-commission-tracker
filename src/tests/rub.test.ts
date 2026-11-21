import { describe, expect, it } from 'vitest';
import nailArtJson from '../game/config/nail-art.json';
import { NAIL_ART_CONFIG, dab, addSpill, dirtyNails, emptyDesign, paint, paintableCells, parseNailArtConfig, rubRadius, rubSpill } from '../game/nail-art/design';
import type { NailArtConfig, NailDesign } from '../game/nail-art/design';

/** Story 073 (owner: "still have difficulty erasing the polish"): Rub clears a spill in a few strokes, never the paint. */
const nail = NAIL_ART_CONFIG.hand.fingers[2]!.nail;
/** A 320 px phone shows the hand at about this many pixels per hand unit. */
const PX_PER_UNIT = 3;

/** Nail 0 fully painted, with a blob of polish on the skin past its tip-right corner. */
function messy(): NailDesign {
  let design: NailDesign = { ...emptyDesign('round', 5, 'short'), base: 'red' };
  design = paint(design, 0, paintableCells('round'));
  for (const [x, y] of [[nail.w + 1.5, -1.5], [nail.w + 2.5, -0.5], [nail.w + 0.5, -2.5], [nail.w + 2, 1]]) design = addSpill(design, 0, dab('round', nail, x as number, y as number, NAIL_ART_CONFIG.brushRadius).spill);
  return design;
}

/** One stroke across the nail tip, `offset` units from the blob (points every half unit, as the station fills gaps). */
function stroke(design: NailDesign, offset: number, config: NailArtConfig): NailDesign {
  const radius = rubRadius(config.cleanupRadius, PX_PER_UNIT, config);
  let next = design;
  for (let x = -3; x <= nail.w + 4; x += 0.5) next = rubSpill(next, [{ nail: 0, size: nail, x, y: -1 + offset }], radius, config);
  return next;
}

describe('Rub (story 073)', () => {
  it('a stroke passing near a spill clears it within 3 strokes, and never touches the paint on the nail', () => {
    const start = messy();
    expect(start.spill[0]!.length).toBeGreaterThan(5);
    let design = start;
    let strokes = 0;
    while (design.spill[0]!.length > 0 && strokes < 10) {
      design = stroke(design, 9, NAIL_ART_CONFIG);
      strokes++;
    }
    expect(design.spill[0]).toEqual([]);
    expect(strokes).toBeLessThanOrEqual(3);
    expect(design.painted).toEqual(start.painted);
  });

  it('reaches at least minPx on screen whatever the zoom, and twice the old clean-up radius', () => {
    expect(rubRadius(6.5, 1)).toBe(Math.max(6.5 * NAIL_ART_CONFIG.rub.scale, NAIL_ART_CONFIG.rub.minPx));
    for (const zoom of [1, 2, 3, 5, 8]) expect(rubRadius(NAIL_ART_CONFIG.cleanupRadius, zoom) * zoom).toBeGreaterThanOrEqual(NAIL_ART_CONFIG.rub.minPx);
    expect(rubRadius(NAIL_ART_CONFIG.cleanupRadius, 100)).toBe(NAIL_ART_CONFIG.cleanupRadius * NAIL_ART_CONFIG.rub.scale);
  });

  it('one rub point clears the skin of every nail in reach (not just the stroke\'s first nail)', () => {
    let design = messy();
    design = addSpill(design, 1, dab('round', nail, -1.5, -1.5, NAIL_ART_CONFIG.brushRadius).spill);
    expect(dirtyNails(design)).toEqual([0, 1]);
    const radius = rubRadius(NAIL_ART_CONFIG.cleanupRadius, PX_PER_UNIT);
    // The point is near nail 0's corner and (in its own units) near nail 1's corner too.
    const cleaned = rubSpill(design, [{ nail: 0, size: nail, x: nail.w + 1.5, y: -1 }, { nail: 1, size: nail, x: -1.5, y: -1 }], radius);
    expect(dirtyNails(cleaned)).toEqual([]);
  });

  it('reads rub from nail-art.json and refuses bad values', () => {
    expect(parseNailArtConfig(nailArtJson).rub).toEqual(NAIL_ART_CONFIG.rub);
    expect(() => parseNailArtConfig({ ...nailArtJson, rub: { ...nailArtJson.rub, scale: 0 } })).toThrow('nail-art.json');
  });
});
