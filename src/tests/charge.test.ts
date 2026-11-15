import { describe, expect, it } from 'vitest';
import paymentJson from '../game/config/payment.json';
import { CHARGE_CONFIG, chargeReaction, clampCharge, expectedPrice, parseChargeConfig, tipForCharge } from '../game/charge';
import { createAppointment } from '../game/appointment';
import { DEFAULT_CLIENT } from '../game/clients/default-client';

/** Story 059: the total she pays matches what was agreed in the chat. */

describe('the expected price and the total', () => {
  it('expects the agreed price when there is one, else the menu price', () => {
    expect(expectedPrice(40, 35)).toBe(35);
    expect(expectedPrice(40, undefined)).toBe(40);
  });

  it('keeps a typed total in whole dollars, between the lowest share and twice the menu price', () => {
    expect(clampCharge(34.6, 40)).toBe(35);
    expect(clampCharge(1, 40)).toBe(Math.ceil(40 * CHARGE_CONFIG.minShare));
    expect(clampCharge(500, 40)).toBe(80);
    expect(clampCharge(Number.NaN, 40)).toBe(40);
  });
});

describe('how she takes the total', () => {
  it('charging the agreed $35 (not the $40 menu price) is neutral', () => {
    expect(chargeReaction(35, 40, 35)).toEqual({ kind: 'agreed', moodDelta: 0, tipFactor: 1 });
    expect(chargeReaction(40, 40, undefined)).toEqual({ kind: 'menu', moodDelta: 0, tipFactor: 1 });
  });

  it('charging more than agreed costs mood (per dollar, capped) and cuts her tip', () => {
    const over = chargeReaction(40, 40, 35);
    expect(over.kind).toBe('over');
    expect(over.moodDelta).toBe(-Math.min(CHARGE_CONFIG.overMaxMood, 5 * CHARGE_CONFIG.overMoodPerDollar));
    expect(over.tipFactor).toBe(CHARGE_CONFIG.overTipFactor);
    expect(chargeReaction(80, 40, 35).moodDelta).toBe(-CHARGE_CONFIG.overMaxMood);
  });

  it('a small discount she did not ask for is a small lift', () => {
    expect(chargeReaction(35, 40, undefined)).toEqual({ kind: 'discount', moodDelta: CHARGE_CONFIG.discountMood, tipFactor: 1 });
  });

  it('her tip follows what she pays', () => {
    expect(tipForCharge(8, 40, 40, chargeReaction(40, 40, undefined))).toBe(8);
    expect(tipForCharge(8, 35, 40, chargeReaction(35, 40, 35))).toBe(7);
    expect(tipForCharge(8, 40, 40, chargeReaction(40, 40, 35))).toBe(Math.round(8 * CHARGE_CONFIG.overTipFactor));
    expect(tipForCharge(0, 40, 40, chargeReaction(40, 40, undefined))).toBe(0);
  });

  it('reads payment.json and refuses bad values', () => {
    expect(parseChargeConfig(paymentJson)).toEqual(CHARGE_CONFIG);
    expect(() => parseChargeConfig({ charge: { ...paymentJson.charge, overTipFactor: 2 } })).toThrow('"charge.overTipFactor"');
  });
});

describe('the appointment remembers the agreed total', () => {
  it('keeps the latest agreedTotal from her turns and hands it to the results', async () => {
    let result: { agreedTotal?: number } | null = null;
    const turns = [
      { reply: 'Okay, thirty-five then!', moodDelta: 2, phase: 'service' as const, unclearEnglish: false, rude: false, agreedTotal: 35 },
      { reply: 'Lovely.', moodDelta: 1, phase: 'checkout' as const, unclearEnglish: false, rude: false },
      { reply: 'Bye!', moodDelta: 1, phase: 'done' as const, unclearEnglish: false, rude: false },
    ];
    let i = 0;
    const appointment = createAppointment({ client: DEFAULT_CLIENT, level: 'some', takeTurn: async () => turns[i++]!, onFinished: (r) => (result = r) });
    for (const line of ['Thirty-five instead of forty, okay?', 'All done.', 'Thank you!']) await appointment.send(line);
    expect(result).toMatchObject({ agreedTotal: 35 });
  });
});
