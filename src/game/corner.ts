import cornerJson from './config/corner.json';
import { MASCOT_CONFIG } from './mascot/mascot';
import { NAIL_ART_CONFIG } from './nail-art/design';
import type { ProgressSave } from './progression';

/**
 * The companion corner (story 021), pure: the daily friendship bonus, milestone gifts, and which line to say. The
 * gifts are free (a polish colour goes into the save's owned list, like a shop polish; an accessory is shown in
 * dress-up). Never sold for money. Config: config/corner.json.
 */

export type CornerAction = 'chat' | 'pat' | 'high';
export interface Gift {
  level: number;
  kind: 'polish' | 'accessory';
  id: string;
}

export interface CornerConfig {
  dailyXp: number;
  gifts: Gift[];
  lines: Record<CornerAction, number>;
}

export function parseCornerConfig(raw: unknown): CornerConfig {
  const fail = (problem: string): never => {
    throw new Error(`corner.json: ${problem}`);
  };
  const r = (typeof raw === 'object' && raw !== null ? raw : fail('root must be an object')) as Record<string, unknown>;
  const dailyXp = typeof r.dailyXp === 'number' && r.dailyXp >= 0 && r.dailyXp <= 100 ? r.dailyXp : fail('"dailyXp" must be 0-100');
  const gifts = (Array.isArray(r.gifts) ? r.gifts : fail('"gifts" must be a list')).map((g, i): Gift => {
    const gift = g as Record<string, unknown>;
    if (typeof gift.level !== 'number' || !Number.isInteger(gift.level) || gift.level < 1) return fail(`"gifts[${i}].level" must be a whole number`);
    if (gift.kind === 'polish' && NAIL_ART_CONFIG.palette.some((c) => c.id === gift.id)) return { level: gift.level, kind: 'polish', id: gift.id as string };
    if (gift.kind === 'accessory' && MASCOT_CONFIG.accessories.some((a) => a.id === gift.id)) return { level: gift.level, kind: 'accessory', id: gift.id as string };
    return fail(`"gifts[${i}]" must be a known polish or accessory`);
  });
  if (new Set(gifts.map((g) => g.level)).size !== gifts.length) fail('one gift per level');
  const lines = (typeof r.lines === 'object' && r.lines !== null ? r.lines : fail('"lines" must be an object')) as Record<string, unknown>;
  const count = (k: CornerAction): number => (typeof lines[k] === 'number' && Number.isInteger(lines[k]) && (lines[k] as number) >= 1 ? (lines[k] as number) : fail(`"lines.${k}" must be 1 or more`));
  return { dailyXp, gifts, lines: { chat: count('chat'), pat: count('pat'), high: count('high') } };
}

export const CORNER_CONFIG: CornerConfig = parseCornerConfig(cornerJson);

/** The friendship bonus for this tap: dailyXp the first pat or high-five of a day, else 0. */
export function dailyBonus(action: CornerAction, lastDay: string, today: string, config: CornerConfig = CORNER_CONFIG): number {
  return action !== 'chat' && lastDay !== today ? config.dailyXp : 0;
}

/** Gifts the player has earned (friendship level reached) but not claimed yet, lowest first. */
export function giftsDue(level: number, claimed: readonly number[], config: CornerConfig = CORNER_CONFIG): Gift[] {
  return config.gifts.filter((g) => g.level <= level && !claimed.includes(g.level)).sort((a, b) => a.level - b.level);
}

/** Claim a gift: a polish colour joins the owned list (as if bought, but free). Returns the new save. */
export function claimGift(save: ProgressSave, gift: Gift): ProgressSave {
  return gift.kind === 'polish' && !save.owned.includes(gift.id) ? { ...save, owned: [...save.owned, gift.id] } : save;
}

/** Which numbered line to say (1-based), never the same twice in a row. `roll` in [0, 1). */
export function pickLine(action: CornerAction, previous: number, roll: number, config: CornerConfig = CORNER_CONFIG): number {
  const n = config.lines[action];
  if (n === 1) return 1;
  let pick = 1 + Math.floor(roll * n);
  if (pick === previous) pick = (pick % n) + 1;
  return pick;
}
