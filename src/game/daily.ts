import dailyJson from './config/daily.json';

/**
 * Story 056: come back every day. Owner decision: the gift, milestones, the goal ring and level-ups give COINS; tips
 * come only from clients. A play streak (a local day with at least one finished appointment), one free streak
 * freeze a week (earned by playing that week, never bought), and a daily free gift of in-game tips with bigger gifts at
 * streak milestones. Pretend money only; nothing is for sale. Pure; the save keeps `PlayState`. Config:
 * config/daily.json.
 */

export interface DailyConfig {
  freeze: { perWeek: number; maxHeld: number };
  gift: { min: number; max: number; bonusChance: number; bonus: number };
  milestones: { days: number; gift: number }[];
  /** Owner decision (two currencies): coins for the welcome, the daily goal ring and each level up. */
  coins: { welcome: number; goal: number; levelUp: number };
}

export function parseDailyConfig(raw: unknown): DailyConfig {
  const c = raw as Partial<DailyConfig>;
  const fail = (what: string): never => {
    throw new Error(`daily.json: ${what}`);
  };
  const whole = (n: unknown, name: string, max = 1000): number => (typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max ? n : fail(`"${name}" must be a whole number 0-${max}`));
  const freeze = { perWeek: whole(c.freeze?.perWeek, 'freeze.perWeek', 7), maxHeld: whole(c.freeze?.maxHeld, 'freeze.maxHeld', 7) };
  const gift = { min: whole(c.gift?.min, 'gift.min'), max: whole(c.gift?.max, 'gift.max'), bonusChance: typeof c.gift?.bonusChance === 'number' && c.gift.bonusChance >= 0 && c.gift.bonusChance <= 1 ? c.gift.bonusChance : fail('"gift.bonusChance" must be 0-1'), bonus: whole(c.gift?.bonus, 'gift.bonus') };
  if (gift.min > gift.max) fail('"gift.min" must not be above gift.max');
  const milestones = (Array.isArray(c.milestones) ? c.milestones : fail('"milestones" must be a list')).map((m, i) => ({ days: whole(m?.days, `milestones[${i}].days`, 3650), gift: whole(m?.gift, `milestones[${i}].gift`) }));
  if (!milestones.every((m, i) => m.days >= 2 && (i === 0 || m.days > (milestones[i - 1] as { days: number }).days))) fail('"milestones" must rise, from 2 days');
  const coins = { welcome: whole(c.coins?.welcome, 'coins.welcome'), goal: whole(c.coins?.goal, 'coins.goal'), levelUp: whole(c.coins?.levelUp, 'coins.levelUp') };
  return { freeze, gift, milestones, coins };
}

export const DAILY_CONFIG: DailyConfig = parseDailyConfig(dailyJson);

/** What the save keeps. Days are local YYYY-MM-DD. */
export interface PlayState {
  streak: number;
  best: number;
  /** The last day with a finished appointment ('' before the first). */
  lastDay: string;
  freezes: number;
  /** The week (its Monday) whose freeze was earned. */
  freezeWeek: string;
  /** The last day the daily gift was opened. */
  giftDay: string;
  /** Milestones (days) already rewarded in this streak run. */
  milestones: number[];
  /** Story 057a: appointments finished on `lastDay` (the daily goal ring). */
  dayCount: number;
}

export const NEW_PLAY: PlayState = { streak: 0, best: 0, lastDay: '', freezes: 0, freezeWeek: '', giftDay: '', milestones: [], dayCount: 0 };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const toUtc = (day: string): number => Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
/** Whole days from `a` to `b` (b - a). */
export const daysBetween = (a: string, b: string): number => Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
/** The Monday of the day's week. */
export function weekOf(day: string): string {
  const d = new Date(toUtc(day));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** The saved play state, read safely. */
export function parsePlay(raw: unknown): PlayState {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const whole = (n: unknown): number => (typeof n === 'number' && Number.isInteger(n) && n >= 0 ? n : 0);
  const day = (d: unknown): string => (typeof d === 'string' && DAY.test(d) ? d : '');
  return {
    streak: whole(r.streak),
    best: whole(r.best),
    lastDay: day(r.lastDay),
    freezes: whole(r.freezes),
    freezeWeek: day(r.freezeWeek),
    giftDay: day(r.giftDay),
    milestones: Array.isArray(r.milestones) ? r.milestones.filter((n): n is number => typeof n === 'number' && Number.isInteger(n)).slice(0, 20) : [],
    dayCount: whole(r.dayCount),
  };
}

/** The streak as it stands today: alive if played today or yesterday, or two days ago with a freeze to cover the gap. */
export function liveStreak(play: PlayState, today: string): number {
  if (!play.lastDay) return 0;
  const gap = daysBetween(play.lastDay, today);
  return gap <= 1 || (gap === 2 && play.freezes > 0) ? play.streak : 0;
}

/** A finished appointment today: the streak moves on (once a day); a missed single day uses a freeze if there is one. */
export function recordPlayDay(play: PlayState, today: string, config: DailyConfig = DAILY_CONFIG): { play: PlayState; newDay: boolean; freezeUsed: boolean } {
  if (play.lastDay === today) return { play: { ...play, dayCount: play.dayCount + 1 }, newDay: false, freezeUsed: false };
  // Playing in a new week earns that week's freeze.
  const week = weekOf(today);
  const freezes = week !== play.freezeWeek ? Math.min(config.freeze.maxHeld, play.freezes + config.freeze.perWeek) : play.freezes;
  const gap = play.lastDay ? daysBetween(play.lastDay, today) : Infinity;
  let next: PlayState;
  let freezeUsed = false;
  if (gap === 1) next = { ...play, streak: play.streak + 1 };
  else if (gap === 2 && freezes > 0) {
    next = { ...play, streak: play.streak + 1 };
    freezeUsed = true;
  } else next = { ...play, streak: 1, milestones: [] };
  next = { ...next, lastDay: today, freezeWeek: week, freezes: freezeUsed ? freezes - 1 : freezes, dayCount: 1 };
  return { play: { ...next, best: Math.max(next.best, next.streak) }, newDay: true, freezeUsed };
}

export interface GiftResult {
  play: PlayState;
  /** The day's gift, its bonus (0 when none), and a milestone reached (null when none). */
  coins: number;
  bonus: number;
  milestone: { days: number; gift: number } | null;
  total: number;
}

/** Open today's gift (once a day). `rand` gives [0, 1). Milestones reached in this streak are rewarded once each. */
export function openDailyGift(play: PlayState, today: string, rand: () => number = Math.random, config: DailyConfig = DAILY_CONFIG): GiftResult | null {
  if (play.giftDay === today) return null;
  const coins = config.gift.min + Math.floor(rand() * (config.gift.max - config.gift.min + 1));
  const bonus = rand() < config.gift.bonusChance ? config.gift.bonus : 0;
  const streak = liveStreak(play, today);
  const reached = config.milestones.filter((m) => streak >= m.days && !play.milestones.includes(m.days));
  const milestone = reached.at(-1) ?? null;
  const milestoneGift = reached.reduce((sum, m) => sum + m.gift, 0);
  return {
    play: { ...play, giftDay: today, milestones: [...play.milestones, ...reached.map((m) => m.days)] },
    coins,
    bonus,
    milestone,
    total: coins + bonus + milestoneGift,
  };
}

export const giftReady = (play: PlayState, today: string): boolean => play.giftDay !== today;

/** Story 057a: appointments finished today (the daily goal ring). */
export const doneToday = (play: PlayState, today: string): number => (play.lastDay === today ? play.dayCount : 0);

/** Owner decision: the one-time welcome coins (for new saves and for saves from before coins). */
export function welcomeCoins<S extends { coins?: number; coinsWelcomed?: boolean }>(save: S, config: DailyConfig = DAILY_CONFIG): S {
  return save.coinsWelcomed ? save : { ...save, coins: (save.coins ?? 0) + config.coins.welcome, coinsWelcomed: true };
}

/** Coins an appointment earns: reaching today's goal ring (once a day) and a level up. */
export function appointmentCoins(goalReachedNow: boolean, levelUp: boolean, config: DailyConfig = DAILY_CONFIG): number {
  return (goalReachedNow ? config.coins.goal : 0) + (levelUp ? config.coins.levelUp : 0);
}

/** 057a part 2: which line today's challenge shows: start a streak (0 days), keep it (going, not yet played today), or cheer it (played today). */
export function dailyLineKey(streak: number, playedToday: boolean): { key: 'daily.start' | 'daily.keep' | 'daily.streak'; params: { days: number } } {
  if (streak <= 0) return { key: 'daily.start', params: { days: 0 } };
  return { key: playedToday ? 'daily.streak' : 'daily.keep', params: { days: streak } };
}
