import paymentJson from './config/payment.json';

/**
 * Story 059: what the player charges at checkout, against the menu price and any price agreed in the chat (a
 * discount she was promised). Charging more than was agreed costs mood and tip; charging what was agreed is neutral;
 * a small discount she did not ask for is a small mood lift. Her tip follows what she actually pays.
 * Pure; config: config/payment.json `charge`.
 */
export interface ChargeConfig {
  /** Mood lost per dollar over the agreed (or menu) price, up to overMaxMood. */
  overMoodPerDollar: number;
  overMaxMood: number;
  /** Her tip is multiplied by this when overcharged. */
  overTipFactor: number;
  /** A discount she did not ask for: this mood lift (once, whatever its size). */
  discountMood: number;
  /** The quick chips on the Total step. */
  chips: { dollars: number; percent: number };
  /** The lowest the total can go, as a share of the menu price. */
  minShare: number;
}

export type ChargeKind = 'agreed' | 'menu' | 'over' | 'discount';

export interface ChargeReaction {
  kind: ChargeKind;
  /** Her mood change (applied to the final mood before scoring). */
  moodDelta: number;
  /** Multiplies her tip (before it follows the price paid). */
  tipFactor: number;
}

const fail = (message: string): never => {
  throw new Error(`payment.json: ${message}`);
};
const num = (value: unknown, name: string, min: number, max: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : fail(`"charge.${name}" must be a number from ${min} to ${max}`);

export function parseChargeConfig(raw: unknown): ChargeConfig {
  const c = ((raw as { charge?: Record<string, unknown> } | null)?.charge ?? {}) as Record<string, unknown> & { chips?: Record<string, unknown> };
  return {
    overMoodPerDollar: num(c.overMoodPerDollar, 'overMoodPerDollar', 0, 10),
    overMaxMood: num(c.overMaxMood, 'overMaxMood', 0, 50),
    overTipFactor: num(c.overTipFactor, 'overTipFactor', 0, 1),
    discountMood: num(c.discountMood, 'discountMood', 0, 20),
    chips: { dollars: num(c.chips?.dollars, 'chips.dollars', 1, 100), percent: num(c.chips?.percent, 'chips.percent', 1, 90) },
    minShare: num(c.minShare, 'minShare', 0, 1),
  };
}

export const CHARGE_CONFIG: ChargeConfig = parseChargeConfig(paymentJson);

/** The price she expects: what was agreed in the chat, else the menu price. */
export const expectedPrice = (menuPrice: number, agreed: number | undefined): number => (agreed !== undefined && agreed > 0 ? agreed : menuPrice);

/** Keep a typed or stepped total sensible: whole dollars, from the lowest allowed to twice the menu price. */
export function clampCharge(value: number, menuPrice: number, config: ChargeConfig = CHARGE_CONFIG): number {
  const low = Math.ceil(menuPrice * config.minShare);
  if (!Number.isFinite(value)) return menuPrice;
  return Math.min(menuPrice * 2, Math.max(low, Math.round(value)));
}

/** How she takes the total. */
export function chargeReaction(charged: number, menuPrice: number, agreed: number | undefined, config: ChargeConfig = CHARGE_CONFIG): ChargeReaction {
  const expected = expectedPrice(menuPrice, agreed);
  if (charged > expected) {
    return { kind: 'over', moodDelta: -Math.min(config.overMaxMood, Math.round((charged - expected) * config.overMoodPerDollar)), tipFactor: config.overTipFactor };
  }
  if (charged < expected) return { kind: 'discount', moodDelta: config.discountMood, tipFactor: 1 };
  return { kind: agreed !== undefined && agreed !== menuPrice ? 'agreed' : 'menu', moodDelta: 0, tipFactor: 1 };
}

/** Her tip follows what she pays (a share of the menu-price tip), then the reaction's factor. Whole dollars. */
export function tipForCharge(tip: number, charged: number, menuPrice: number, reaction: ChargeReaction): number {
  if (tip <= 0 || menuPrice <= 0) return 0;
  return Math.max(0, Math.round(tip * (charged / menuPrice) * reaction.tipFactor));
}
