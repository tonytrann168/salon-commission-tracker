import { describe, expect, it } from 'vitest';
import { isReviewResult } from '../game/learning/corrections';
import { PAYMENT_CONFIG, cheerFor, parsePaymentConfig, sequenceMs, servicePrice, tipParts } from '../game/payment';

/** Story 039: the payment moment. */

describe('payment', () => {
  it('the itemised tip always adds up to the tip, for every tip and any result', () => {
    for (let tip = 0; tip <= 20; tip++) {
      for (const nailMatch of [undefined, 0, 28, 64, 100]) {
        for (const finalMood of [1, 49, 77, 100]) {
          for (const scenario of [false, true]) {
            const parts = tipParts({ tip, finalMood, scenario, ...(nailMatch === undefined ? {} : { nailMatch }) });
            expect(parts.reduce((sum, p) => sum + p.dollars, 0)).toBe(tip);
            expect(parts.every((p) => p.dollars > 0 && Number.isInteger(p.dollars))).toBe(true);
          }
        }
      }
    }
    expect(tipParts({ tip: 0, finalMood: 90, scenario: true })).toEqual([]);
  });

  it('a better match and a happier client show as bigger parts; no scenario, no scenario part', () => {
    const great = tipParts({ tip: 20, nailMatch: 100, finalMood: 100, scenario: true });
    expect(great).toEqual([{ kind: 'service', dollars: 5 }, { kind: 'match', dollars: 7 }, { kind: 'mood', dollars: 5 }, { kind: 'scenario', dollars: 3 }]);
    const poor = tipParts({ tip: 20, nailMatch: 20, finalMood: 40, scenario: false });
    expect(poor.find((p) => p.kind === 'match')!.dollars).toBeLessThan(7);
    expect(poor.some((p) => p.kind === 'scenario')).toBe(false);
  });

  it('the price follows the service (pretend money)', () => {
    expect(servicePrice('manicure', 1)).toBe(PAYMENT_CONFIG.prices.manicure);
    expect(servicePrice('manicure', 2)).toBe(PAYMENT_CONFIG.prices.manicure + PAYMENT_CONFIG.prices.bothExtra);
    expect(servicePrice('pedicure', 1)).toBe(PAYMENT_CONFIG.prices.pedicure);
  });

  it('the longest sequence stays under 6 seconds; the data is checked', () => {
    expect(sequenceMs(4, 5)).toBeLessThanOrEqual(6000);
    expect(() => parsePaymentConfig({ ...PAYMENT_CONFIG, timing: { ...PAYMENT_CONFIG.timing, partGapMs: 2000 } })).toThrow(/longer/);
    expect(() => parsePaymentConfig({ ...PAYMENT_CONFIG, tipShares: { match: 0.5, mood: 0.4, scenario: 0.2 } })).toThrow(/tipShares/);
  });

  it('the cheer fits the result', () => {
    expect([cheerFor(5, false), cheerFor(4, false), cheerFor(3, false), cheerFor(2, false), cheerFor(5, true)]).toEqual(['top', 'good', 'okay', 'tough', 'tough']);
  });

  it('an incomplete English review is refused (it used to crash the results screen)', () => {
    expect(isReviewResult({ ok: true })).toBe(false);
    expect(isReviewResult({ lines: [], tryLines: [], usedWell: [] })).toBe(false);
    expect(isReviewResult({ lines: [], tryLines: [], usedWell: [], recap: 'Tốt lắm' })).toBe(true);
  });
});
