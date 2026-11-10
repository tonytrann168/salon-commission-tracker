import { describe, expect, it } from 'vitest';
import { NAIL_ART_CONFIG, NAIL_COUNT, brushCells, coverage, decorate, emptyDesign, insidePolygon, nailOutline, paint, paintableCells, parseNailArtConfig } from '../game/nail-art/design';
import type { NailDesign, NailRequest } from '../game/nail-art/design';
import { describeDesign, describeRequest, matchDesign } from '../game/nail-art/match';

/** Story 005: the nail design as data, compared to the client's request. No drawing, no randomness. */

const DANA: NailRequest = { shapes: ['square'], colors: ['nude', 'pale-pink'], gradient: 'no', gems: 'none', stickers: 'none' };

const fullyPainted = (design: NailDesign): NailDesign => {
  let next = design;
  for (let nail = 0; nail < NAIL_COUNT; nail++) next = paint(next, nail, paintableCells(design.shape));
  return next;
};

describe('nail outline and coverage', () => {
  it('draws each shape as a closed outline with the tip at the top', () => {
    for (const shape of NAIL_ART_CONFIG.shapes) {
      const outline = nailOutline(shape, 6, 10);
      expect(insidePolygon(outline, 3, 8)).toBe(true);
      expect(insidePolygon(outline, -1, 5)).toBe(false);
    }
    // A stiletto is narrower near the tip than a square.
    expect(insidePolygon(nailOutline('stiletto', 6, 10), 0.6, 2)).toBe(false);
    expect(insidePolygon(nailOutline('square', 6, 10), 0.6, 2)).toBe(true);
  });

  it('counts paintable cells and coverage; pointier shapes have fewer cells', () => {
    expect(paintableCells('square').length).toBeGreaterThan(paintableCells('stiletto').length);
    const design = paint(emptyDesign('square'), 0, paintableCells('square'));
    expect(coverage(design)[0]).toBe(1);
    expect(coverage(design)[1]).toBe(0);
  });

  it('paints with a round brush, without duplicates', () => {
    const cells = brushCells('square', 3, 5);
    expect(cells.length).toBeGreaterThan(3);
    const once = paint(emptyDesign('square'), 2, cells);
    expect(paint(once, 2, cells)).toBe(once);
  });

  it('limits decorations per nail', () => {
    let design = emptyDesign();
    for (let i = 0; i < 5; i++) design = decorate(design, { nail: 1, x: 0.5, y: 0.5, kind: 'gem' });
    expect(design.decorations).toHaveLength(NAIL_ART_CONFIG.maxDecorationsPerNail);
  });
});

describe('matching the client request', () => {
  it('scores a perfect match 100 and raises the mood', () => {
    const result = matchDesign(fullyPainted({ ...emptyDesign('square'), base: 'pale-pink' }), DANA);
    expect(result.score).toBe(100);
    expect(result.moodDelta).toBe(10);
  });

  it('marks down the wrong shape, a far colour, bare nails and unwanted extras', () => {
    const good = fullyPainted({ ...emptyDesign('square'), base: 'nude' });
    expect(matchDesign({ ...good, shape: 'stiletto' }, DANA).parts.shape).toBe(30);
    expect(matchDesign({ ...good, base: 'navy' }, DANA).parts.color).toBe(0);
    expect(matchDesign({ ...good, base: 'hot-pink' }, DANA).parts.color).toBeGreaterThan(0);
    expect(matchDesign(emptyDesign('square'), DANA).parts.coverage).toBe(0);
    const blinged = { ...good, gradient: 'white', decorations: [0, 1, 2].map((nail) => ({ nail, x: 0.5, y: 0.5, kind: 'gem' as const })) };
    expect(matchDesign(blinged, DANA).parts.extras).toBeLessThan(40);
  });

  it('rewards the right amount of art when the client wants some', () => {
    const wantsArt: NailRequest = { shapes: ['almond'], colors: ['lavender'], gradient: 'yes', gems: 'few', stickers: 'none' };
    const design = fullyPainted({ ...emptyDesign('almond'), base: 'lavender', gradient: 'white', decorations: [{ nail: 0, x: 0.5, y: 0.4, kind: 'gem' }, { nail: 4, x: 0.5, y: 0.4, kind: 'gem' }] });
    expect(matchDesign(design, wantsArt).parts.extras).toBe(100);
  });

  it('turns a poor match into a mood drop (bands from config)', () => {
    expect(matchDesign({ ...emptyDesign('stiletto'), base: 'black' }, DANA).moodDelta).toBe(-10);
  });

  it('describes the design and the request in plain English for the AI', () => {
    const design = decorate(fullyPainted({ ...emptyDesign('square'), base: 'pale-pink', gradient: 'white' }), { nail: 1, x: 0.5, y: 0.5, kind: 'heart' });
    expect(describeDesign(design)).toBe('square shape, pale pink fading to white at the tips, 1 heart; 100% painted');
    expect(describeRequest(DANA)).toBe('square shape, nude or pale pink, no gems, no stickers, no gradient');
  });

  it('refuses a bad config', () => {
    expect(() => parseNailArtConfig({ ...structuredClone(NAIL_ART_CONFIG), palette: [{ id: 'x', hex: 'pink', name: { en: 'x', vi: 'x' } }] })).toThrow(/palette\[0\]/);
    expect(() => parseNailArtConfig({ ...structuredClone(NAIL_ART_CONFIG), moodByMatch: [{ min: 50, delta: 1 }] })).toThrow(/min 0/);
  });
});

describe('the nails affect mood and stars', async () => {
  const { createAppointment } = await import('../game/appointment');
  const { scoreAppointment, SCORING_CONFIG } = await import('../game/scoring');
  const { DEFAULT_CLIENT } = await import('../game/clients/default-client');

  it('nudges the mood outside a turn, never down to a walk-out', () => {
    const appointment = createAppointment({ client: DEFAULT_CLIENT, takeTurn: async () => ({ reply: '', moodDelta: 0, phase: 'service', unclearEnglish: false, rude: false }), level: 'some', onFinished: () => undefined });
    const start = appointment.getSnapshot().mood;
    appointment.adjustMood(10);
    expect(appointment.getSnapshot().mood).toBe(start + 10);
    // Each change is capped like any mood change; even many big drops stop at 1, never a walk-out.
    for (let i = 0; i < 6; i++) appointment.adjustMood(-200);
    expect(appointment.getSnapshot().mood).toBe(1);
    expect(appointment.getSnapshot().status).toBe('awaiting_player');
  });

  it('a better nail match earns more (it counts like a skill)', () => {
    const base = { finalMood: 75, outcome: 'completed' as const, skills: { greeting: 80, consultation: 80, upsell: 80, rebooking: 80, problemHandling: 80 }, english: { clarity: 80, politeness: 80, grammarVocabulary: 80 }, level: 'some' as const, rebooked: true, redoDemanded: false };
    const good = scoreAppointment({ ...base, nailMatch: 100 }, SCORING_CONFIG);
    const poor = scoreAppointment({ ...base, nailMatch: 10 }, SCORING_CONFIG);
    expect(good.tip).toBeGreaterThan(poor.tip);
    expect(good.stars).toBeGreaterThanOrEqual(poor.stars);
    expect(DEFAULT_CLIENT.nailRequest?.shapes).toEqual(['square']);
  });
});
