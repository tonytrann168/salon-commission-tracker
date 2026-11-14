import paymentJson from './config/payment.json';

/**
 * Story 039: the payment moment. Pure: what the client pays (pretend money, display only), the tip itemised into
 * parts that always add up to the tip the scoring gave, and the timeline of the sequence. Data: config/payment.json.
 */
export interface PaymentConfig {
  prices: { manicure: number; pedicure: number; bothExtra: number };
  tipShares: { match: number; mood: number; scenario: number };
  timing: { priceMs: number; firstPartMs: number; partGapMs: number; starGapMs: number; cheerMs: number; holdMs: number; maxTotalMs: number };
}

export function parsePaymentConfig(raw: unknown): PaymentConfig {
  const c = raw as PaymentConfig;
  const fail = (what: string): never => {
    throw new Error(`payment.json: ${what}`);
  };
  const positive = (n: unknown): boolean => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  if (!c?.prices || !['manicure', 'pedicure', 'bothExtra'].every((k) => positive((c.prices as Record<string, unknown>)[k]))) fail('"prices" needs manicure, pedicure and bothExtra');
  const shares = c.tipShares;
  if (!shares || !['match', 'mood', 'scenario'].every((k) => positive((shares as Record<string, unknown>)[k])) || shares.match + shares.mood + shares.scenario > 0.9) fail('"tipShares" must be 0 or more and leave at least 10% for the service');
  if (!c.timing || !Object.values(c.timing).every(positive)) fail('"timing" needs numbers');
  // The longest sequence (4 parts, 5 stars) must fit.
  if (sequenceMs(4, 5, c) > c.timing.maxTotalMs) fail('the sequence is longer than timing.maxTotalMs');
  return c;
}

export type TipPartKind = 'service' | 'match' | 'mood' | 'scenario';
export interface TipPart {
  kind: TipPartKind;
  dollars: number;
}

/** What the client pays the salon for the service (pretend money). */
export function servicePrice(service: 'manicure' | 'pedicure', hands: 1 | 2, config: PaymentConfig = PAYMENT_CONFIG): number {
  return config.prices[service] + (hands === 2 ? config.prices.bothExtra : 0);
}

/**
 * The tip in parts: how much came from matching her request, from her mood, from handling the situation, and the rest
 * for the service. Whole dollars; the parts always add up to `tip`; a part worth nothing is left out.
 */
export function tipParts(input: { tip: number; nailMatch?: number; finalMood: number; scenario: boolean }, config: PaymentConfig = PAYMENT_CONFIG): TipPart[] {
  const tip = Math.max(0, Math.round(input.tip));
  if (tip === 0) return [];
  const unit = (n: number): number => Math.min(1, Math.max(0, n / 100));
  const raw: [TipPartKind, number][] = [
    ['match', input.nailMatch === undefined ? 0 : tip * config.tipShares.match * unit(input.nailMatch)],
    ['mood', tip * config.tipShares.mood * unit(input.finalMood)],
    ['scenario', input.scenario ? tip * config.tipShares.scenario : 0],
  ];
  const whole = raw.map(([kind, value]) => ({ kind, dollars: Math.floor(value) }));
  const service = tip - whole.reduce((sum, part) => sum + part.dollars, 0);
  return [{ kind: 'service' as const, dollars: service }, ...whole].filter((part) => part.dollars > 0);
}

/** When the sequence ends, in ms, for this many tip parts and stars. */
export function sequenceMs(parts: number, stars: number, config: PaymentConfig = PAYMENT_CONFIG): number {
  const t = config.timing;
  return t.firstPartMs + Math.max(0, parts) * t.partGapMs + Math.max(0, stars) * t.starGapMs + t.cheerMs + t.holdMs;
}

export const PAYMENT_CONFIG: PaymentConfig = parsePaymentConfig(paymentJson);

/** Which cheer the companion gives. */
export const cheerFor = (stars: number, walkedOut: boolean): 'top' | 'good' | 'okay' | 'tough' => (walkedOut || stars <= 2 ? 'tough' : stars === 3 ? 'okay' : stars === 4 ? 'good' : 'top');
