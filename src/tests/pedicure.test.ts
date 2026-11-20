import { describe, expect, it } from 'vitest';
import { NAIL_ART_CONFIG, PEDICURE_LENGTHS, PEDICURE_SHAPES, decorate, emptyDesign, parseNailArtConfig, pedicureRequest } from '../game/nail-art/design';
import type { NailDesign, NailRequest } from '../game/nail-art/design';
import { describeRequest, matchDesign } from '../game/nail-art/match';
import { referenceTarget } from '../game/reference';
import { MENU_CONFIG, comboSaving, orderFor } from '../game/menu';
import { COMBO_CONFIG, comboScore, comboStages, parseComboConfig } from '../game/combo';
import comboJson from '../game/config/combo.json';
import { getScenario } from '../game/scenarios';
import nailArtJson from '../game/config/nail-art.json';

/** Story 069 (owner playtest 5): a real foot, toe rules, big-toe accent, combos on the menu. */
const footConfig = { ...NAIL_ART_CONFIG, hand: NAIL_ART_CONFIG.foot };
const pedi: NailRequest = { service: 'pedicure', shapes: ['almond', 'stiletto'], lengths: ['long'], colors: ['red'], gems: 'few', stickers: 'none', gradient: 'no', accent: 'bigToe' };

describe('the foot', () => {
  it('is a foot: the big toe is clearly the largest; toenails are shorter and wider than fingernails', () => {
    const foot = parseNailArtConfig(nailArtJson).foot;
    expect(foot.kind).toBe('foot');
    const [big, ...small] = foot.fingers;
    for (const toe of small) expect(big!.nail.w * big!.nail.h).toBeGreaterThan(toe.nail.w * toe.nail.h * 2);
    for (const toe of foot.fingers) expect(toe.nail.w).toBeGreaterThan(toe.nail.h);
    const hand = parseNailArtConfig(nailArtJson).hand;
    expect(hand.kind ?? 'hand').toBe('hand');
  });
});

describe('toe rules', () => {
  it('a pedicure only takes short nails, square or round; a manicure is unchanged', () => {
    const toes = pedicureRequest(pedi);
    expect(toes.lengths).toEqual(PEDICURE_LENGTHS);
    expect(toes.shapes.every((s) => PEDICURE_SHAPES.includes(s))).toBe(true);
    expect(toes.shapes).toEqual(['round', 'square']);
    const mani: NailRequest = { ...pedi, service: 'manicure' };
    expect(pedicureRequest(mani)).toBe(mani);
  });
});

describe('big-toe accent', () => {
  const request = pedicureRequest(pedi);
  const nails = 10;
  const base: NailDesign = { ...emptyDesign('round', nails, 'short'), base: 'red' };
  it('art on the big toes matches; the same art on small toes does not', () => {
    const onBig = [0, 5, 0].reduce((d, nail, i) => decorate(d, { nail, x: 0.3 + i * 0.2, y: 0.6, kind: 'gem' }, footConfig), base);
    const onSmall = [1, 6, 2].reduce((d, nail, i) => decorate(d, { nail, x: 0.3 + i * 0.2, y: 0.6, kind: 'gem' }, footConfig), base);
    expect(matchDesign(onBig, request, footConfig).parts.extras).toBeGreaterThan(matchDesign(onSmall, request, footConfig).parts.extras);
    expect(describeRequest(request)).toContain('big toes only');
  });
  it('her picture puts the art on the big toes only', () => {
    const { design } = referenceTarget(request, footConfig);
    expect(design.decorations.length).toBeGreaterThan(0);
    expect(design.decorations.every((d) => d.nail % 5 === 0)).toBe(true);
  });
});

describe('combos', () => {
  it('every preset has both combos, each a little cheaper than its two services', () => {
    for (const items of Object.values(MENU_CONFIG.presets)) {
      for (const tag of ['comboClassic', 'comboGel'] as const) {
        const item = items.find((i) => i.tag === tag)!;
        const saving = comboSaving(item, items)!;
        expect(saving).toBeGreaterThan(0);
        expect(saving / (saving + item.price)).toBeGreaterThanOrEqual(0.08);
        expect(saving / (saving + item.price)).toBeLessThanOrEqual(0.25);
      }
    }
  });
});

describe('the combo visit (story 069b)', () => {
  const combo: NailRequest = { shapes: ['almond', 'round'], lengths: ['medium'], colors: ['coral'], gems: 'few', stickers: 'none', gradient: 'no', combo: true };
  it('is the hands (as asked), then both feet (short, square or round, no art by default)', () => {
    const stages = comboStages(combo)!;
    expect(stages.hands).toMatchObject({ service: 'manicure', shapes: ['almond', 'round'], lengths: ['medium'], gems: 'few' });
    expect(stages.hands.combo).toBeUndefined();
    expect(stages.feet).toMatchObject({ service: 'pedicure', hands: 2, shapes: ['round'], lengths: ['short'], colors: ['coral'], gems: 'none' });
    expect(comboStages({ ...combo, combo: false })).toBeNull();
    expect(comboScore(80, 91)).toBe(86);
  });
  it('rings up ONE combo line (gel combo when her usual is gel), never two services', () => {
    const items = MENU_CONFIG.presets.mid;
    const lines = orderFor(combo, items, 'lily');
    expect(lines.filter((l) => l.item.tag.startsWith('combo'))).toHaveLength(1);
    expect(lines.some((l) => ['manicure', 'gel', 'spa', 'pedicure', 'spaPedicure'].includes(l.item.tag))).toBe(false);
  });
  it('reads combo.json and refuses bad values', () => {
    expect(parseComboConfig(comboJson)).toEqual(COMBO_CONFIG);
    expect(() => parseComboConfig({ ...comboJson, moodShare: 0 })).toThrow('combo.json');
  });
  it('the combo-day scenario is a combo', () => {
    expect(getScenario('combo-day')?.nailRequest?.combo).toBe(true);
  });
});
