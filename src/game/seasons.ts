import seasonsJson from './config/seasons.json';
import type { StickerKind } from './nail-art/design';
import type { ProgressSave } from './progression';

/**
 * Story 028: seasonal packs (Tết first), from config/seasons.json. Active only inside a date window on the player's
 * own calendar, or with the dev override (dev builds only). Everything in a season is free: polishes and a sticker
 * while it lasts, an outfit given with the first daily gift (kept for good), and a small daily gift of in-game tips.
 * Never sold, never real money.
 */

export interface Season {
  id: string;
  name: { en: string; vi: string };
  windows: { from: string; to: string }[];
  polishes: string[];
  stickers: StickerKind[];
  outfit: string;
  dailyGift: { tips: number };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function parseSeasons(raw: unknown): Season[] {
  const list = (raw as { seasons?: unknown })?.seasons;
  if (!Array.isArray(list)) throw new Error('seasons.json: "seasons" must be a list');
  return list.map((s: Partial<Season>, i) => {
    const fail = (what: string): never => {
      throw new Error(`seasons.json: seasons[${i}] ${what}`);
    };
    if (typeof s.id !== 'string' || !s.id) fail('needs an id');
    if (typeof s.name?.en !== 'string' || typeof s.name?.vi !== 'string') fail('needs en/vi names');
    if (!Array.isArray(s.windows) || s.windows.length === 0 || !s.windows.every((w) => DAY.test(w?.from) && DAY.test(w?.to) && w.from <= w.to)) fail('needs date windows (from ≤ to)');
    if (!(typeof s.dailyGift?.tips === 'number' && s.dailyGift.tips > 0)) fail('needs a positive daily gift');
    return { id: s.id!, name: s.name!, windows: s.windows!, polishes: s.polishes ?? [], stickers: s.stickers ?? [], outfit: s.outfit ?? '', dailyGift: s.dailyGift! };
  });
}

export const SEASONS: Season[] = parseSeasons(seasonsJson);

/** The season running on `today` (YYYY-MM-DD, local), or the one named by the dev override. */
export function activeSeason(today: string, override: string | null = null, seasons: readonly Season[] = SEASONS): Season | null {
  if (override) return seasons.find((s) => s.id === override) ?? null;
  return seasons.find((s) => s.windows.some((w) => w.from <= today && today <= w.to)) ?? null;
}

/** Dev builds only: `?season=tet` shows a season on any day. Production ignores it. */
export function seasonOverride(dev: boolean = import.meta.env.DEV, search: string = typeof location !== 'undefined' ? location.search : ''): string | null {
  return dev ? new URLSearchParams(search).get('season') : null;
}

/** Colour ids that belong to some season (hidden from the station outside it). */
export const seasonalPolishes = (seasons: readonly Season[] = SEASONS): Set<string> => new Set(seasons.flatMap((s) => s.polishes));

/** The station palette for today: seasonal colours only while their season runs. */
export function seasonPalette<C extends { id: string }>(palette: readonly C[], season: Season | null, seasons: readonly Season[] = SEASONS): C[] {
  const seasonal = seasonalPolishes(seasons);
  return palette.filter((c) => !seasonal.has(c.id) || (season?.polishes.includes(c.id) ?? false));
}

/** The sticker cycle for today. */
export const seasonStickers = (base: readonly StickerKind[], season: Season | null): StickerKind[] => [...base, ...(season?.stickers ?? []).filter((s) => !base.includes(s))];

export interface SeasonState {
  /** Day of the last daily gift opened, per season id. */
  giftDay: Record<string, string>;
}

const KEY = 'salon.season.v1';
export const SEASON_KEY = KEY;

export function parseSeasonState(raw: string | null): SeasonState {
  try {
    const d = JSON.parse(raw ?? 'null') as Partial<SeasonState> | null;
    const giftDay: Record<string, string> = {};
    for (const [id, day] of Object.entries(d?.giftDay ?? {})) if (typeof day === 'string' && DAY.test(day)) giftDay[id] = day;
    return { giftDay };
  } catch {
    return { giftDay: {} };
  }
}

export const giftDue = (state: SeasonState, season: Season | null, today: string): boolean => !!season && state.giftDay[season.id] !== today;

/** Open today's gift: tips into the wallet, the season's outfit the first time (kept for good). Once a day. */
export function openGift(save: ProgressSave, state: SeasonState, season: Season, today: string): { save: ProgressSave; state: SeasonState; tips: number; outfit: boolean } | null {
  if (!giftDue(state, season, today)) return null;
  const outfit = !!season.outfit && !save.owned.includes(season.outfit);
  return {
    save: { ...save, wallet: save.wallet + season.dailyGift.tips, owned: outfit ? [...save.owned, season.outfit] : save.owned },
    state: { giftDay: { ...state.giftDay, [season.id]: today } },
    tips: season.dailyGift.tips,
    outfit,
  };
}
