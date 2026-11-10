import { describe, expect, it } from 'vitest';
import { NAIL_ART_CONFIG, NAIL_COUNT, addSpill, cleanUp, coverage, dab, decorate, emptyDesign, insidePolygon, nailOutline, neatness, paint, paintableCells, parseNailArtConfig, wipeCells } from '../game/nail-art/design';
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
    const middle = NAIL_ART_CONFIG.hand.fingers[2]!;
    const cells = dab('square', middle.nail, middle.nail.w / 2, middle.nail.h / 2, NAIL_ART_CONFIG.brushRadius).paint;
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
    expect(describeDesign(design)).toBe('square shape, pale pink fading to white at the tips, 1 heart; 100% painted, clean edges');
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

describe('a realistic hand: finger sizes, spill and clean-up (owner, 2026-11-10)', () => {
  const { fingers } = NAIL_ART_CONFIG.hand;
  const finger = (id: string) => fingers.find((f) => f.id === id)!;
  const R = NAIL_ART_CONFIG.brushRadius;
  const share = (paint: number[]) => paint.length / paintableCells('square').length;

  it('has five different fingers: a wide, short, angled thumb set low; the middle nail longest; the pinky smallest', () => {
    expect(fingers.map((f) => f.id)).toEqual(['thumb', 'index', 'middle', 'ring', 'pinky']);
    const thumb = finger('thumb');
    expect(thumb.nail.w).toBeGreaterThan(thumb.nail.h);
    expect(Math.abs(thumb.angle)).toBeGreaterThanOrEqual(25);
    expect(thumb.y).toBeGreaterThan(finger('index').y);
    for (const f of fingers.filter((f) => f.id !== 'middle')) expect(finger('middle').nail.h).toBeGreaterThan(f.nail.h);
    for (const f of fingers.filter((f) => f.id !== 'pinky')) expect(finger('pinky').nail.w * finger('pinky').nail.h).toBeLessThan(f.nail.w * f.nail.h);
    expect(new Set(fingers.map((f) => `${f.nail.w}x${f.nail.h}`)).size).toBe(5);
  });

  it('the same brush covers a bigger share of a small nail', () => {
    const middle = finger('middle').nail;
    const pinky = finger('pinky').nail;
    const onMiddle = dab('square', middle, middle.w / 2, middle.h / 2, R).paint;
    const onPinky = dab('square', pinky, pinky.w / 2, pinky.h / 2, R).paint;
    expect(share(onPinky)).toBeGreaterThan(share(onMiddle));
  });

  it('the same off-centre stroke stays on the middle nail but spills off the pinky (smaller nails are harder to paint cleanly)', () => {
    const offset = 3.5;
    const stroke = (nail: { w: number; h: number }) => {
      let spill = 0;
      for (let y = nail.h * 0.3; y <= nail.h * 0.7; y += 0.5) spill += dab('square', nail, nail.w / 2 + offset, y, R).spill.length;
      return spill;
    };
    expect(stroke(finger('middle').nail)).toBe(0);
    expect(stroke(finger('pinky').nail)).toBeGreaterThan(0);
  });

  it('paint at the cuticle or past the side lands on the skin as spill, a centred dab does not', () => {
    const nail = finger('index').nail;
    expect(dab('square', nail, nail.w / 2, nail.h / 2, R).spill).toEqual([]);
    expect(dab('square', nail, nail.w / 2, nail.h, R).spill.length).toBeGreaterThan(0);
    expect(dab('square', nail, -0.5, nail.h / 2, R).spill.length).toBeGreaterThan(0);
  });

  it('spill lowers neatness, the match and the description; Clean up wipes it back to neat', () => {
    const clean = fullyPainted({ ...emptyDesign('square'), base: 'pale-pink' });
    const pinky = finger('pinky').nail;
    const slip = dab('square', pinky, pinky.w + 1, pinky.h / 2, R).spill;
    const messy = addSpill(clean, 4, slip);
    expect(neatness(messy)[4]).toBeLessThan(1);
    expect(neatness(messy)[0]).toBe(1);
    expect(matchDesign(messy, DANA).parts.neatness).toBeLessThan(100);
    expect(matchDesign(messy, DANA).score).toBeLessThan(matchDesign(clean, DANA).score);
    expect(describeDesign(messy)).toMatch(/polish on the skin around 1 nail$/);
    const wiped = cleanUp(messy, 4, wipeCells(pinky, pinky.w + 1, pinky.h / 2, NAIL_ART_CONFIG.cleanupRadius));
    expect(wiped.spill[4]).toEqual([]);
    expect(matchDesign(wiped, DANA).score).toBe(matchDesign(clean, DANA).score);
    expect(cleanUp(wiped, 4, [0, 1, 2])).toBe(wiped);
  });

  it('the hand is data: a second hand is just more fingers; a bad finger is refused', () => {
    const twoHands = structuredClone(NAIL_ART_CONFIG);
    twoHands.hand.fingers = [...fingers, ...fingers.map((f) => ({ ...f, id: `left-${f.id}`, x: 200 - f.x, angle: -f.angle }))];
    expect(parseNailArtConfig(twoHands).hand.fingers).toHaveLength(10);
    const bad = structuredClone(NAIL_ART_CONFIG);
    (bad.hand.fingers[0] as { nail: unknown }).nail = { w: 0, h: 5 };
    expect(() => parseNailArtConfig(bad)).toThrow(/hand\.fingers\[0\]\.nail\.w/);
  });
});
