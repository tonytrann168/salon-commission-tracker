import progressionJson from './config/progression.json';
import { NAIL_ART_CONFIG } from './nail-art/design';
import type { NailArtConfig } from './nail-art/design';
import { DIFFICULTIES, SKILL_KEYS } from './types';
import type { Difficulty, SkillKey, SkillScores } from './types';

/**
 * Progression (story 007, design/game-brief.md MVP feature 7): tips into a wallet, a shop for polishes and station
 * upgrades, XP and ranks (Junior → Master Tech) that unlock harder clients, skill badges, and the daily challenge
 * streak. Pure functions over a plain save object; loading and saving are in save.ts. Tuning: config/progression.json.
 */

export interface Text {
  en: string;
  vi: string;
}

export interface RankConfig {
  id: string;
  xp: number;
  icon: string;
  name: Text;
  unlocks: Difficulty[];
}

export type BadgeRule =
  | { type: 'appointments'; min: number }
  | { type: 'stars'; min: number }
  | { type: 'skill'; skill: SkillKey; min: number; difficulty?: Difficulty }
  | { type: 'english'; min: number }
  | { type: 'nailMatch'; min: number }
  | { type: 'streak'; min: number };

export interface BadgeConfig {
  id: string;
  icon: string;
  rule: BadgeRule;
  name: Text;
  goal: Text;
}

export interface UpgradeEffect {
  /** Multiplies the nail brush radius. */
  brushScale?: number;
  /** Multiplies the Clean up radius. */
  cleanupScale?: number;
  /** Added to every client's starting mood. */
  startMood?: number;
}

export interface UpgradeConfig {
  id: string;
  icon: string;
  price: number;
  effect: UpgradeEffect;
  name: Text;
  about: Text;
}

export interface ProgressionConfig {
  ranks: RankConfig[];
  xp: { byStars: number[]; goalBonus: number; dailyBonus: number; difficulty: Record<Difficulty, number> };
  badges: BadgeConfig[];
  streakMilestones: number[];
  shop: { polishes: { id: string; price: number }[]; upgrades: UpgradeConfig[] };
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Validate the raw progression file (and its shop polishes against the nail palette). Throws `progression.json: ...`. */
export function parseProgressionConfig(raw: unknown, nails: NailArtConfig = NAIL_ART_CONFIG): ProgressionConfig {
  const fail = (problem: string): never => {
    throw new Error(`progression.json: ${problem}`);
  };
  const num = (value: unknown, path: string, min: number, max: number): number =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : fail(`"${path}" must be a number from ${min} to ${max}`);
  const text = (value: unknown, path: string): Text => (isRecord(value) && typeof value.en === 'string' && typeof value.vi === 'string' ? { en: value.en, vi: value.vi } : fail(`"${path}" needs en and vi`));
  const list = (value: unknown, path: string): unknown[] => (Array.isArray(value) ? value : fail(`"${path}" must be a list`));
  const difficulty = (value: unknown, path: string): Difficulty => DIFFICULTIES.find((d) => d === value) ?? fail(`"${path}" must be easy, medium or hard`);
  if (!isRecord(raw)) return fail('root must be an object');

  const ranks = list(raw.ranks, 'ranks').map((rank, i): RankConfig => {
    if (!isRecord(rank) || typeof rank.id !== 'string') return fail(`"ranks[${i}]" needs an id`);
    if (typeof rank.icon !== 'string' || rank.icon === '') fail(`"ranks[${i}].icon" must be an emoji`);
    return { id: rank.id, xp: num(rank.xp, `ranks[${i}].xp`, 0, 1e6), icon: rank.icon as string, name: text(rank.name, `ranks[${i}].name`), unlocks: list(rank.unlocks, `ranks[${i}].unlocks`).map((d, j) => difficulty(d, `ranks[${i}].unlocks[${j}]`)) };
  });
  if (ranks.length === 0 || ranks[0]?.xp !== 0) fail('"ranks" must start with a rank at 0 XP');
  ranks.forEach((rank, i) => i > 0 && rank.xp <= (ranks[i - 1] as RankConfig).xp && fail(`"ranks[${i}].xp" must be higher than the rank before`));
  for (const d of DIFFICULTIES) if (!ranks.some((rank) => rank.unlocks.includes(d))) fail(`no rank unlocks "${d}" clients`);

  const xp = isRecord(raw.xp) ? raw.xp : fail('"xp" must be an object');
  const byStars = list(xp.byStars, 'xp.byStars').map((n, i) => num(n, `xp.byStars[${i}]`, 0, 1000));
  if (byStars.length !== 5) fail('"xp.byStars" needs 5 values (1 to 5 stars)');
  const multipliers = isRecord(xp.difficulty) ? xp.difficulty : fail('"xp.difficulty" must be an object');

  const badges = list(raw.badges, 'badges').map((badge, i): BadgeConfig => {
    const at = `badges[${i}]`;
    if (!isRecord(badge) || typeof badge.id !== 'string' || typeof badge.icon !== 'string' || !isRecord(badge.rule)) return fail(`"${at}" needs an id, an icon and a rule`);
    const r = badge.rule;
    const min = num(r.min, `${at}.rule.min`, 0, 1e6);
    let rule: BadgeRule;
    if (r.type === 'skill') {
      const skill = SKILL_KEYS.find((k) => k === r.skill) ?? fail(`"${at}.rule.skill" is not a scorecard skill`);
      rule = { type: 'skill', skill, min, ...(r.difficulty !== undefined ? { difficulty: difficulty(r.difficulty, `${at}.rule.difficulty`) } : {}) };
    } else if (r.type === 'appointments' || r.type === 'stars' || r.type === 'english' || r.type === 'nailMatch' || r.type === 'streak') rule = { type: r.type, min };
    else return fail(`"${at}.rule.type" is not a badge rule`);
    return { id: badge.id, icon: badge.icon, rule, name: text(badge.name, `${at}.name`), goal: text(badge.goal, `${at}.goal`) };
  });

  const shop = isRecord(raw.shop) ? raw.shop : fail('"shop" must be an object');
  const polishes = list(shop.polishes, 'shop.polishes').map((item, i) => {
    if (!isRecord(item) || typeof item.id !== 'string') return fail(`"shop.polishes[${i}]" needs an id`);
    const colour = nails.palette.find((c) => c.id === item.id);
    if (!colour?.shop) fail(`"shop.polishes[${i}]" ("${item.id}") must be a palette colour marked "shop" in nail-art.json`);
    return { id: item.id, price: num(item.price, `shop.polishes[${i}].price`, 1, 1e6) };
  });
  for (const colour of nails.palette) if (colour.shop && !polishes.some((p) => p.id === colour.id)) fail(`shop colour "${colour.id}" has no price`);
  const upgrades = list(shop.upgrades, 'shop.upgrades').map((item, i): UpgradeConfig => {
    const at = `shop.upgrades[${i}]`;
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.icon !== 'string' || !isRecord(item.effect)) return fail(`"${at}" needs an id, an icon and an effect`);
    const e = item.effect;
    const effect: UpgradeEffect = {
      ...(e.brushScale !== undefined ? { brushScale: num(e.brushScale, `${at}.effect.brushScale`, 0.5, 1.5) } : {}),
      ...(e.cleanupScale !== undefined ? { cleanupScale: num(e.cleanupScale, `${at}.effect.cleanupScale`, 0.5, 3) } : {}),
      ...(e.startMood !== undefined ? { startMood: num(e.startMood, `${at}.effect.startMood`, 0, 20) } : {}),
    };
    if (Object.keys(effect).length === 0) fail(`"${at}.effect" does nothing`);
    return { id: item.id, icon: item.icon, price: num(item.price, `${at}.price`, 1, 1e6), effect, name: text(item.name, `${at}.name`), about: text(item.about, `${at}.about`) };
  });
  const ids = [...polishes.map((p) => p.id), ...upgrades.map((u) => u.id)];
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dup) fail(`duplicate shop id "${dup}"`);

  return {
    ranks,
    xp: {
      byStars,
      goalBonus: num(xp.goalBonus, 'xp.goalBonus', 0, 1000),
      dailyBonus: num(xp.dailyBonus, 'xp.dailyBonus', 0, 1000),
      difficulty: { easy: num(multipliers.easy, 'xp.difficulty.easy', 0, 10), medium: num(multipliers.medium, 'xp.difficulty.medium', 0, 10), hard: num(multipliers.hard, 'xp.difficulty.hard', 0, 10) },
    },
    badges,
    streakMilestones: list(raw.streakMilestones, 'streakMilestones').map((n, i) => num(n, `streakMilestones[${i}]`, 1, 1e4)),
    shop: { polishes, upgrades },
  };
}

export const PROGRESSION_CONFIG: ProgressionConfig = parseProgressionConfig(progressionJson);

// ---- The save (shape; loading/saving and versioning are in save.ts) ----

export interface ProgressSave {
  version: 1;
  /** Whole dollars of tips not yet spent. */
  wallet: number;
  /** All tips ever earned (for the profile). */
  tipsEarned: number;
  xp: number;
  appointments: number;
  owned: string[];
  badges: string[];
  /** Today's challenge, fixed once offered so it stays the same all day. */
  daily: { day: string; clientId: string; scenarioId?: string } | null;
  /** The last day the daily challenge was finished, and the streak of days up to it. */
  dailyDoneDay: string;
  streak: number;
  /** Story 019: past visits per client (for the "returning client" scenario). */
  history: Record<string, { visits: number; lastStars: number; lastDay: string }>;
}

export const NEW_SAVE: ProgressSave = { version: 1, wallet: 0, tipsEarned: 0, xp: 0, appointments: 0, owned: [], badges: [], daily: null, dailyDoneDay: '', streak: 0, history: {} };

// ---- Ranks ----

/** The rank for this much XP, its index, and the next rank (null at the top). */
export function rankFor(xp: number, config: ProgressionConfig = PROGRESSION_CONFIG): { rank: RankConfig; index: number; next: RankConfig | null } {
  let index = 0;
  config.ranks.forEach((rank, i) => {
    if (xp >= rank.xp) index = i;
  });
  return { rank: config.ranks[index] as RankConfig, index, next: config.ranks[index + 1] ?? null };
}

/** Client difficulties open at this XP. */
export function unlockedDifficulties(xp: number, config: ProgressionConfig = PROGRESSION_CONFIG): Difficulty[] {
  const { index } = rankFor(xp, config);
  const open = new Set(config.ranks.slice(0, index + 1).flatMap((rank) => rank.unlocks));
  return DIFFICULTIES.filter((d) => open.has(d));
}

/** The rank that opens a difficulty. */
export function rankUnlocking(difficulty: Difficulty, config: ProgressionConfig = PROGRESSION_CONFIG): RankConfig {
  return config.ranks.find((rank) => rank.unlocks.includes(difficulty)) ?? (config.ranks[0] as RankConfig);
}

// ---- Days and the daily challenge ----

const dayBefore = (day: string): string => {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d - 1));
  return date.toISOString().slice(0, 10);
};

/** The streak still alive on `today` (the daily was done today or yesterday), else 0. */
export function liveStreak(save: ProgressSave, today: string): number {
  return save.dailyDoneDay === today || (save.dailyDoneDay !== '' && dayBefore(today) === save.dailyDoneDay) ? save.streak : 0;
}

/** A small, stable hash of a string (FNV-1a), for picking the daily client from the date. */
export function hashDay(day: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < day.length; i++) hash = Math.imul(hash ^ day.charCodeAt(i), 0x01000193) >>> 0;
  return hash;
}

/**
 * Today's challenge client: kept if already chosen today, else picked from the date among the clients the player can
 * take (so it is the same all day, even after a rank-up).
 */
export function dailyChallenge<T extends { id: string; difficulty: Difficulty }>(
  save: ProgressSave,
  today: string,
  roster: readonly T[],
  config: ProgressionConfig = PROGRESSION_CONFIG,
  /** Story 019: a scenario for the chosen client (decided once, kept all day), or null. */
  scenarioFor: (client: T) => string | null = () => null,
): { save: ProgressSave; client: T; scenarioId: string | null } | null {
  const kept = save.daily?.day === today ? roster.find((c) => c.id === save.daily?.clientId) : undefined;
  if (kept) return { save, client: kept, scenarioId: save.daily?.scenarioId ?? null };
  const open = unlockedDifficulties(save.xp, config);
  const pool = roster.filter((c) => open.includes(c.difficulty));
  const client = pool[hashDay(today) % Math.max(1, pool.length)];
  if (!client) return null;
  const scenarioId = scenarioFor(client);
  return { save: { ...save, daily: { day: today, clientId: client.id, ...(scenarioId ? { scenarioId } : {}) } }, client, scenarioId };
}

export const dailyDoneToday = (save: ProgressSave, today: string): boolean => save.dailyDoneDay === today;

// ---- After an appointment ----

export interface AppointmentOutcome {
  stars: number;
  tip: number;
  goalMet: boolean;
  walkedOut: boolean;
  skills: SkillScores;
  englishScore: number;
  nailMatch?: number;
  difficulty: Difficulty;
  /** This was today's daily challenge client. */
  daily: boolean;
  /** Story 019: who it was, for the per-client history. */
  clientId?: string;
  today: string;
}

export interface ProgressUpdate {
  save: ProgressSave;
  xpGained: number;
  tipGained: number;
  /** Set when this appointment raised the rank. */
  rankUp: RankConfig | null;
  /** Difficulties opened by the rank-up. */
  unlocked: Difficulty[];
  badges: BadgeConfig[];
  /** The streak after a finished daily (null when this wasn't one), and whether it hit a milestone. */
  streak: { days: number; milestone: boolean } | null;
}

function earns(rule: BadgeRule, outcome: AppointmentOutcome, save: ProgressSave): boolean {
  switch (rule.type) {
    case 'appointments':
      return save.appointments >= rule.min;
    case 'stars':
      return !outcome.walkedOut && outcome.stars >= rule.min;
    case 'skill':
      return !outcome.walkedOut && outcome.skills[rule.skill] >= rule.min && (!rule.difficulty || rule.difficulty === outcome.difficulty);
    case 'english':
      return !outcome.walkedOut && outcome.englishScore >= rule.min;
    case 'nailMatch':
      return outcome.nailMatch !== undefined && outcome.nailMatch >= rule.min;
    case 'streak':
      return save.streak >= rule.min;
  }
}

/** Add an appointment's tip and XP, the daily streak, any rank-up and new badges. */
export function applyAppointment(before: ProgressSave, outcome: AppointmentOutcome, config: ProgressionConfig = PROGRESSION_CONFIG): ProgressUpdate {
  const stars = Math.max(1, Math.min(5, Math.round(outcome.stars)));
  const finishedDaily = outcome.daily && !outcome.walkedOut && before.dailyDoneDay !== outcome.today;
  const base = (config.xp.byStars[stars - 1] ?? 0) + (outcome.goalMet ? config.xp.goalBonus : 0);
  const xpGained = Math.round(base * config.xp.difficulty[outcome.difficulty]) + (finishedDaily ? config.xp.dailyBonus : 0);
  const tipGained = Math.max(0, Math.round(outcome.tip));
  const history = outcome.clientId
    ? { ...before.history, [outcome.clientId]: { visits: (before.history[outcome.clientId]?.visits ?? 0) + 1, lastStars: stars, lastDay: outcome.today } }
    : before.history;
  let save: ProgressSave = { ...before, history, wallet: before.wallet + tipGained, tipsEarned: before.tipsEarned + tipGained, xp: before.xp + xpGained, appointments: before.appointments + 1 };

  let streak: ProgressUpdate['streak'] = null;
  if (finishedDaily) {
    const days = liveStreak(before, outcome.today) + 1;
    save = { ...save, dailyDoneDay: outcome.today, streak: days };
    streak = { days, milestone: config.streakMilestones.includes(days) };
  }

  const was = rankFor(before.xp, config);
  const now = rankFor(save.xp, config);
  const rankUp = now.index > was.index ? now.rank : null;
  const unlocked = rankUp ? unlockedDifficulties(save.xp, config).filter((d) => !unlockedDifficulties(before.xp, config).includes(d)) : [];

  const badges = config.badges.filter((badge) => !save.badges.includes(badge.id) && earns(badge.rule, outcome, save));
  if (badges.length > 0) save = { ...save, badges: [...save.badges, ...badges.map((b) => b.id)] };
  return { save, xpGained, tipGained, rankUp, unlocked, badges, streak };
}

// ---- The shop ----

export type ShopItem = { kind: 'polish'; id: string; price: number } | ({ kind: 'upgrade' } & UpgradeConfig);

export function shopItems(config: ProgressionConfig = PROGRESSION_CONFIG): ShopItem[] {
  return [...config.shop.polishes.map((p) => ({ kind: 'polish' as const, ...p })), ...config.shop.upgrades.map((u) => ({ kind: 'upgrade' as const, ...u }))];
}

/** Buy an item with tips. Returns the new save, or why not. */
export function buy(save: ProgressSave, id: string, config: ProgressionConfig = PROGRESSION_CONFIG): { ok: true; save: ProgressSave } | { ok: false; reason: 'unknown' | 'owned' | 'funds' } {
  const item = shopItems(config).find((i) => i.id === id);
  if (!item) return { ok: false, reason: 'unknown' };
  if (save.owned.includes(id)) return { ok: false, reason: 'owned' };
  if (save.wallet < item.price) return { ok: false, reason: 'funds' };
  return { ok: true, save: { ...save, wallet: save.wallet - item.price, owned: [...save.owned, id] } };
}

/** The palette the station shows: every free colour plus the bought shop colours. */
export function stationPalette<C extends { id: string; shop?: boolean }>(palette: readonly C[], save: ProgressSave): C[] {
  return palette.filter((colour) => !colour.shop || save.owned.includes(colour.id));
}

/** The combined effect of the owned upgrades. */
export function upgradeEffects(save: ProgressSave, config: ProgressionConfig = PROGRESSION_CONFIG): Required<UpgradeEffect> {
  const owned = config.shop.upgrades.filter((u) => save.owned.includes(u.id));
  return {
    brushScale: owned.reduce((scale, u) => scale * (u.effect.brushScale ?? 1), 1),
    cleanupScale: owned.reduce((scale, u) => scale * (u.effect.cleanupScale ?? 1), 1),
    startMood: owned.reduce((sum, u) => sum + (u.effect.startMood ?? 0), 0),
  };
}
