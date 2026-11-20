import menuJson from './config/menu.json';
import type { NailRequest } from './nail-art/design';

/**
 * Story 044: the salon menu, numbered. A price set (Basic / Mid / Fancy) or the player's own menu, saved with the game.
 * The client orders by number (her order follows her nail request), the AI client sees the menu, and checkout rings up
 * the ordered items. Pretend money only: the wallet still gets the tip. Shared by the game and the server. Pure.
 */

/** Story 063 adds the real menu's services; the older tags (fullSet, ombre, gems, extensions) still work on an own menu. */
export const MENU_TAGS = ['manicure', 'gel', 'spa', 'fullSet', 'pedicure', 'spaPedicure', 'jellyPedicure', 'acrylic', 'fill', 'dip', 'gelX', 'extensions', 'french', 'chrome', 'art', 'gems', 'ombre', 'removal', 'paraffin', 'polishChange', 'other', 'comboClassic', 'comboGel'] as const;
export type MenuTag = (typeof MENU_TAGS)[number];

/** Story 063: the menu's groups, in order. */
export const MENU_CATEGORIES = ['manicure', 'pedicure', 'enhancements', 'addons', 'combos'] as const;
export type MenuCategory = (typeof MENU_CATEGORIES)[number];
const CATEGORY_OF: Record<MenuTag, MenuCategory> = {
  manicure: 'manicure', gel: 'manicure', spa: 'manicure', fullSet: 'manicure',
  pedicure: 'pedicure', spaPedicure: 'pedicure', jellyPedicure: 'pedicure',
  acrylic: 'enhancements', fill: 'enhancements', dip: 'enhancements', gelX: 'enhancements', extensions: 'enhancements',
  french: 'addons', chrome: 'addons', art: 'addons', gems: 'addons', ombre: 'addons', removal: 'addons', paraffin: 'addons', polishChange: 'addons', other: 'addons',
  comboClassic: 'combos', comboGel: 'combos',
};
export const categoryOf = (tag: MenuTag): MenuCategory => CATEGORY_OF[tag];

/** Story 063: the menu in its groups (each item keeps its number on the one list). */
export function menuGroups(items: readonly MenuItem[]): { category: MenuCategory; lines: OrderLine[] }[] {
  return MENU_CATEGORIES.map((category) => ({ category, lines: items.map((item, i) => ({ number: i + 1, item })).filter((line) => categoryOf(line.item.tag) === category) })).filter((group) => group.lines.length > 0);
}
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

/** A stable number for a client id (her usual service). */
const seedOf = (text: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h;
};

/**
 * Her order on this menu, from her nail request: the base service (pedicure; both hands → the full set when the menu
 * has one; else a manicure), then ombre, gems, nail art and long nails when she wants them. Items the menu lacks are
 * left off; a menu with no base service rings up its first item.
 */
export function orderFor(request: NailRequest | undefined, items: readonly MenuItem[], who = ''): OrderLine[] {
  const find = (tag: MenuTag): OrderLine | null => {
    const index = items.findIndex((item) => item.tag === tag);
    return index < 0 ? null : { number: index + 1, item: items[index] as MenuItem };
  };
  const pedicure = request?.service === 'pedicure';
  // Story 063: long nails are an acrylic full set (the service itself) on the real menu; an older own menu adds "extensions".
  const long = !pedicure && !!request?.lengths?.length && request.lengths.every((l) => l === 'long' || l === 'xlong');
  // Story 063: on the real menu each client has her usual (classic, gel or spa) by a stable hash of who she is.
  const usual = (tags: MenuTag[]): OrderLine | null => {
    const open = tags.map(find).filter((line): line is OrderLine => line !== null);
    return who && open.length > 0 ? (open[seedOf(who) % open.length] as OrderLine) : (open[0] ?? null);
  };
  const hands = request?.hands === 2 ? (find('fullSet') ?? usual(['manicure', 'gel', 'spa'])) : usual(['manicure', 'gel', 'spa']);
  const base = (pedicure ? usual(['pedicure', 'spaPedicure', 'jellyPedicure']) : long ? (find('acrylic') ?? hands) : hands) ?? (items[0] ? { number: 1, item: items[0] } : null);
  const extras: (OrderLine | null)[] = request
    ? [
        request.gradient === 'yes' ? (find('ombre') ?? find('art')) : null,
        request.gems !== 'none' ? (find('gems') ?? find('art')) : null,
        request.stickers !== 'none' ? find('art') : null,
        long && base?.item.tag !== 'acrylic' ? find('extensions') : null,
        // Some clients like a French tip with it.
        who && !pedicure && seedOf(`${who}:french`) % 4 === 0 ? find('french') : null,
      ]
    : [];
  const lines = [base, ...extras].filter((line): line is OrderLine => line !== null);
  return lines.filter((line, i) => lines.findIndex((other) => other.number === line.number) === i);
}

export const orderTotal = (order: readonly OrderLine[]): number => order.reduce((sum, line) => sum + line.item.price, 0);

const CATEGORY_TITLES: Record<MenuCategory, string> = { manicure: 'Manicure', pedicure: 'Pedicure', enhancements: 'Nail enhancements', addons: 'Add-ons', combos: 'Combos (hands and feet)' };

/** What the AI client is told about the menu and her order (English; the names are cleaned). */
export function menuPrompt(items: readonly MenuItem[], order: readonly OrderLine[], priceSensitive = false, config: MenuConfig = MENU_CONFIG): string {
  // Story 063: the menu in its groups; add-ons are asked for with a service ("number 2 with French tip").
  const list = menuGroups(items)
    .map((group) => `${CATEGORY_TITLES[group.category]}:\n${group.lines.map((line) => `${line.number}. ${line.item.name.en}: ${group.category === 'addons' ? '+' : ''}$${line.item.price}`).join('\n')}`)
    .join('\n');
  const mine = order.map((line) => `number ${line.number} (${line.item.name.en})`).join(' with ');
  return `THE SALON MENU (on the wall; prices in dollars)\n${list}\n- Order by number, the way regulars do (for example "Number ${order[0]?.number ?? 1}, please."), and an add-on by name with it (for example "number ${order[0]?.number ?? 1} with French tip"). Your order today: ${mine}. At checkout the total is $${orderTotal(order)} plus any tip. If the stylist rings up a different price, politely ask about it.${priceSensitive && orderTotal(order) > config.pricey.over ? `\n- You watch your money and $${orderTotal(order)} feels a bit high. At checkout you may say so once, kindly and in your own words (for example "Hmm, that's a bit pricey."). It does not change your mood: report moodDelta for how the stylist treats you, as usual.` : ''}`;
}

/** Story 069: what a combo is made of (its tags), to show the saving against buying the two separately. */
export const COMBO_PARTS: Partial<Record<MenuTag, [MenuTag, MenuTag]>> = { comboClassic: ['manicure', 'pedicure'], comboGel: ['gel', 'spaPedicure'] };

/** Story 069: a combo's saving on this menu (the two parts' prices minus the combo's), or null. */
export function comboSaving(item: MenuItem, items: readonly MenuItem[]): number | null {
  const parts = COMBO_PARTS[item.tag];
  if (!parts) return null;
  const [a, b] = parts.map((tag) => items.find((i) => i.tag === tag)?.price);
  return a !== undefined && b !== undefined ? a + b - item.price : null;
}
