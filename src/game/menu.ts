import menuJson from './config/menu.json';
import type { NailRequest } from './nail-art/design';

/**
 * Story 044: the salon menu, numbered. A price set (Basic / Mid / Fancy) or the player's own menu, saved with the game.
 * The client orders by number (her order follows her nail request), the AI client sees the menu, and checkout rings up
 * the ordered items. Pretend money only: the wallet still gets the tip. Shared by the game and the server. Pure.
 */

export const MENU_TAGS = ['manicure', 'fullSet', 'pedicure', 'ombre', 'gems', 'art', 'extensions', 'other'] as const;
export type MenuTag = (typeof MENU_TAGS)[number];
export const MENU_PRESETS = ['basic', 'mid', 'fancy'] as const;
export type MenuPreset = (typeof MENU_PRESETS)[number];

export interface MenuItem {
  tag: MenuTag;
  price: number;
  name: { en: string; vi: string };
}

export interface MenuConfig {
  default: MenuPreset;
  /** Story 045: a price-sensitive client may remark on a total over this (never a mood or tip change). */
  pricey: { over: number };
  limits: { minItems: number; maxItems: number; minPrice: number; maxPrice: number; maxName: number };
  presets: Record<MenuPreset, MenuItem[]>;
}

/** The saved choice: a preset, or the player's own items. */
export type MenuChoice = { preset: MenuPreset } | { preset: 'custom'; items: MenuItem[] };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A menu item's name: plain words only (it reaches the AI client and other screens). */
export const cleanName = (value: string, max: number): string =>
  value
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{M}\p{N} &'()+.,/-]/gu, '')
    .replace(/ {2,}/g, ' ')
    .trim()
    .slice(0, max);

/** One item, checked against the limits; null when it is not a valid item. */
export function parseItem(raw: unknown, limits: MenuConfig['limits']): MenuItem | null {
  if (!isRecord(raw) || !isRecord(raw.name)) return null;
  const tag = MENU_TAGS.find((t) => t === raw.tag) ?? null;
  const price = typeof raw.price === 'number' && Number.isFinite(raw.price) ? Math.round(raw.price) : NaN;
  const en = typeof raw.name.en === 'string' ? cleanName(raw.name.en, limits.maxName) : '';
  const vi = typeof raw.name.vi === 'string' ? cleanName(raw.name.vi, limits.maxName) : '';
  if (!tag || !(price >= limits.minPrice && price <= limits.maxPrice) || (!en && !vi)) return null;
  return { tag, price, name: { en: en || vi, vi: vi || en } };
}

export function parseMenuConfig(raw: unknown): MenuConfig {
  const fail = (what: string): never => {
    throw new Error(`menu.json: ${what}`);
  };
  if (!isRecord(raw) || !isRecord(raw.limits) || !isRecord(raw.presets)) return fail('needs limits and presets');
  const l = raw.limits;
  const int = (v: unknown, name: string): number => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : fail(`"limits.${name}" must be a whole number`));
  const limits = { minItems: int(l.minItems, 'minItems'), maxItems: int(l.maxItems, 'maxItems'), minPrice: int(l.minPrice, 'minPrice'), maxPrice: int(l.maxPrice, 'maxPrice'), maxName: int(l.maxName, 'maxName') };
  if (limits.minItems < 1 || limits.minItems > limits.maxItems || limits.minPrice > limits.maxPrice) fail('limits are out of order');
  const presets = {} as Record<MenuPreset, MenuItem[]>;
  for (const preset of MENU_PRESETS) {
    const list = raw.presets[preset];
    if (!Array.isArray(list) || list.length < limits.minItems || list.length > limits.maxItems) return fail(`"presets.${preset}" needs ${limits.minItems}-${limits.maxItems} items`);
    presets[preset] = list.map((item, i) => parseItem(item, limits) ?? fail(`"presets.${preset}[${i}]" is not a valid item`));
  }
  const def = MENU_PRESETS.find((p) => p === raw.default) ?? fail('"default" must be a preset');
  const over = isRecord(raw.pricey) && typeof raw.pricey.over === 'number' && raw.pricey.over > 0 ? raw.pricey.over : fail('"pricey.over" must be a positive number');
  return { default: def, pricey: { over }, limits, presets };
}

export const MENU_CONFIG: MenuConfig = parseMenuConfig(menuJson);

/** The saved choice, read safely (an unknown or broken one is the default preset). */
export function parseMenuChoice(raw: unknown, config: MenuConfig = MENU_CONFIG): MenuChoice {
  if (isRecord(raw) && raw.preset === 'custom' && Array.isArray(raw.items)) {
    const items = raw.items
      .slice(0, config.limits.maxItems)
      .map((item) => parseItem(item, config.limits))
      .filter((item): item is MenuItem => item !== null);
    if (items.length >= config.limits.minItems) return { preset: 'custom', items };
  }
  const preset = isRecord(raw) ? MENU_PRESETS.find((p) => p === raw.preset) : undefined;
  return { preset: preset ?? config.default };
}

export const menuItems = (choice: MenuChoice, config: MenuConfig = MENU_CONFIG): MenuItem[] => (choice.preset === 'custom' ? choice.items : config.presets[choice.preset]);

/** One line on the order: the item's number on the menu (1-based) and the item. */
export interface OrderLine {
  number: number;
  item: MenuItem;
}

/**
 * Her order on this menu, from her nail request: the base service (pedicure; both hands → the full set when the menu
 * has one; else a manicure), then ombre, gems, nail art and long nails when she wants them. Items the menu lacks are
 * left off; a menu with no base service rings up its first item.
 */
export function orderFor(request: NailRequest | undefined, items: readonly MenuItem[]): OrderLine[] {
  const find = (tag: MenuTag): OrderLine | null => {
    const index = items.findIndex((item) => item.tag === tag);
    return index < 0 ? null : { number: index + 1, item: items[index] as MenuItem };
  };
  const pedicure = request?.service === 'pedicure';
  const base = (pedicure ? find('pedicure') : request?.hands === 2 ? (find('fullSet') ?? find('manicure')) : find('manicure')) ?? (items[0] ? { number: 1, item: items[0] } : null);
  const extras: (OrderLine | null)[] = request
    ? [
        request.gradient === 'yes' ? find('ombre') : null,
        request.gems !== 'none' ? find('gems') : null,
        request.stickers !== 'none' ? find('art') : null,
        request.lengths?.length && request.lengths.every((l) => l === 'long' || l === 'xlong') ? find('extensions') : null,
      ]
    : [];
  const lines = [base, ...extras].filter((line): line is OrderLine => line !== null);
  return lines.filter((line, i) => lines.findIndex((other) => other.number === line.number) === i);
}

export const orderTotal = (order: readonly OrderLine[]): number => order.reduce((sum, line) => sum + line.item.price, 0);

/** What the AI client is told about the menu and her order (English; the names are cleaned). */
export function menuPrompt(items: readonly MenuItem[], order: readonly OrderLine[], priceSensitive = false, config: MenuConfig = MENU_CONFIG): string {
  const list = items.map((item, i) => `${i + 1}. ${item.name.en}: $${item.price}`).join('\n');
  const mine = order.map((line) => `number ${line.number} (${line.item.name.en})`).join(' and ');
  return `THE SALON MENU (on the wall; prices in dollars)\n${list}\n- Order by number, the way regulars do (for example "Number ${order[0]?.number ?? 1}, please."). Your order today: ${mine}. At checkout the total is $${orderTotal(order)} plus any tip. If the stylist rings up a different price, politely ask about it.${priceSensitive && orderTotal(order) > config.pricey.over ? `\n- You watch your money and $${orderTotal(order)} feels a bit high. At checkout you may say so once, kindly and in your own words (for example "Hmm, that's a bit pricey."). It does not change your mood: report moodDelta for how the stylist treats you, as usual.` : ''}`;
}
