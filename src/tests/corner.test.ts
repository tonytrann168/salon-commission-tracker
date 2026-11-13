import { describe, expect, it } from 'vitest';
import en from '../game/i18n/en.json';
import vi from '../game/i18n/vi.json';
import { parseCompanion } from '../game/companion';
import { CORNER_CONFIG, claimGift, dailyBonus, giftsDue, parseCornerConfig, pickLine } from '../game/corner';
import { NEW_SAVE } from '../game/progression';

/** Story 021: the companion corner's logic. */

describe('the companion corner', () => {
  it('gives the daily friendship bonus once a day, for a pat or high-five (not chat)', () => {
    expect(dailyBonus('pat', '', '2026-11-13')).toBe(CORNER_CONFIG.dailyXp);
    expect(dailyBonus('high', '2026-11-12', '2026-11-13')).toBe(CORNER_CONFIG.dailyXp);
    expect(dailyBonus('pat', '2026-11-13', '2026-11-13')).toBe(0);
    expect(dailyBonus('chat', '', '2026-11-13')).toBe(0);
  });

  it('offers each milestone gift once, lowest first; a polish gift joins the station for free', () => {
    expect(giftsDue(1, [])).toEqual([]);
    expect(giftsDue(3, []).map((g) => g.level)).toEqual([2, 3]);
    expect(giftsDue(3, [2]).map((g) => g.level)).toEqual([3]);
    const polish = CORNER_CONFIG.gifts.find((g) => g.kind === 'polish')!;
    const after = claimGift({ ...NEW_SAVE, wallet: 5 }, polish);
    expect(after.owned).toContain(polish.id);
    expect(after.wallet).toBe(5);
    expect(claimGift(after, polish)).toBe(after);
  });

  it('never says the same line twice in a row, and every line exists in both languages', () => {
    for (const action of ['chat', 'pat', 'high'] as const) {
      for (let previous = 1; previous <= CORNER_CONFIG.lines[action]; previous++) {
        for (const roll of [0, 0.34, 0.67, 0.99]) expect(pickLine(action, previous, roll)).not.toBe(previous);
      }
      for (let n = 1; n <= CORNER_CONFIG.lines[action]; n++) {
        expect((en as Record<string, string>)[`corner.${action}${n}`], `${action}${n}`).toBeTruthy();
        expect((vi as Record<string, string>)[`corner.${action}${n}`], `${action}${n}`).toBeTruthy();
      }
    }
  });

  it('refuses a gift that is not a real polish or accessory, and keeps corner state in the companion save', () => {
    expect(() => parseCornerConfig({ ...CORNER_CONFIG, gifts: [{ level: 2, kind: 'polish', id: 'rainbow-glitter' }] })).toThrow(/corner\.json: "gifts\[0\]"/);
    const saved = parseCompanion(JSON.stringify({ chosen: true, gender: 'female', name: 'Mai', equipped: {}, cornerDay: '2026-11-13', gifts: [2, 'x'] }));
    expect(saved).toMatchObject({ cornerDay: '2026-11-13', gifts: [2] });
  });
});
