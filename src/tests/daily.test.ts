import { describe, expect, it } from 'vitest';
import dailyJson from '../game/config/daily.json';
import { DAILY_CONFIG, NEW_PLAY, appointmentCoins, dailyLineKey, daysBetween, giftReady, liveStreak, openDailyGift, parseDailyConfig, parsePlay, recordPlayDay, weekOf, welcomeCoins } from '../game/daily';
import { PATH_CONFIG } from '../game/path';
import { PROGRESSION_CONFIG } from '../game/progression';
import type { PlayState } from '../game/daily';
import { NEW_SAVE, applyAppointment } from '../game/progression';
import { parseSave } from '../game/save';

/** Story 056: the play streak, the weekly freeze and the daily gift. */

const play = (days: string[], start: PlayState = NEW_PLAY): PlayState => days.reduce((p, day) => recordPlayDay(p, day).play, start);

describe('dates', () => {
  it('counts days and finds the week (Monday)', () => {
    expect(daysBetween('2026-11-14', '2026-11-16')).toBe(2);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(weekOf('2026-11-15')).toBe('2026-11-09');
    expect(weekOf('2026-11-16')).toBe('2026-11-16');
  });
});

describe('the play streak', () => {
  it('a day counts once; the next day adds one; a gap of two days starts over', () => {
    expect(play(['2026-11-10', '2026-11-10', '2026-11-11', '2026-11-12'])).toMatchObject({ streak: 3, best: 3 });
    const broken = play(['2026-11-10', '2026-11-11', '2026-11-14'], { ...NEW_PLAY, freezeWeek: '2026-11-09' });
    expect(broken.streak).toBe(1);
    expect(broken.best).toBe(2);
  });

  it('one free freeze a week, earned by playing that week, covers exactly one missed day', () => {
    const p = play(['2026-11-09']);
    expect(p.freezes).toBe(1);
    const covered = recordPlayDay(p, '2026-11-11');
    expect(covered).toMatchObject({ freezeUsed: true, play: { streak: 2, freezes: 0 } });
    // No freeze left this week: another missed day starts over.
    expect(recordPlayDay(covered.play, '2026-11-13').play.streak).toBe(1);
    // Never more than maxHeld.
    expect(play(['2026-11-09', '2026-11-16', '2026-11-23']).freezes).toBe(DAILY_CONFIG.freeze.maxHeld);
  });

  it('is alive today if played today or yesterday (or two days ago with a freeze)', () => {
    const p = play(['2026-11-10', '2026-11-11']);
    expect(liveStreak(p, '2026-11-12')).toBe(2);
    expect(liveStreak(p, '2026-11-13')).toBe(2);
    expect(liveStreak({ ...p, freezes: 0 }, '2026-11-13')).toBe(0);
    expect(liveStreak(p, '2026-11-15')).toBe(0);
  });

  it('a finished appointment moves the streak; a walk-out does not; the save keeps it', () => {
    const outcome = { stars: 4, tip: 8, goalMet: false, walkedOut: false, skills: { greeting: 60, consultation: 60, upsell: 60, rebooking: 60, problemHandling: 60 }, englishScore: 60, difficulty: 'easy' as const, daily: false, today: '2026-11-15' };
    const done = applyAppointment(NEW_SAVE, outcome);
    expect(done.played).toEqual({ streak: 1, newDay: true, freezeUsed: false });
    expect(applyAppointment(NEW_SAVE, { ...outcome, walkedOut: true }).played).toBeNull();
    expect(parseSave(JSON.stringify(done.save)).play).toMatchObject({ streak: 1, lastDay: '2026-11-15' });
    expect(parsePlay({ streak: -3, lastDay: 'yesterday', milestones: ['x', 3] })).toMatchObject({ streak: 0, lastDay: '', milestones: [3] });
  });
});

describe('the daily gift', () => {
  it('opens once a day with an amount in range, sometimes a bonus', () => {
    const g = openDailyGift(NEW_PLAY, '2026-11-15', () => 0)!;
    expect(g.coins).toBe(DAILY_CONFIG.gift.min);
    expect(g.bonus).toBe(DAILY_CONFIG.gift.bonus);
    expect(openDailyGift(g.play, '2026-11-15')).toBeNull();
    expect(giftReady(g.play, '2026-11-16')).toBe(true);
    const high = openDailyGift(NEW_PLAY, '2026-11-15', () => 0.999)!;
    expect(high).toMatchObject({ coins: DAILY_CONFIG.gift.max, bonus: 0 });
  });

  it('a streak milestone gives a bigger gift, once per streak', () => {
    const p = play(['2026-11-09', '2026-11-10', '2026-11-11']);
    const g = openDailyGift(p, '2026-11-11', () => 0.999)!;
    const first = DAILY_CONFIG.milestones[0]!;
    expect(g.milestone).toEqual(first);
    expect(g.total).toBe(DAILY_CONFIG.gift.max + first.gift);
    const next = openDailyGift({ ...g.play, lastDay: '2026-11-12', streak: 4 }, '2026-11-12', () => 0.999)!;
    expect(next.milestone).toBeNull();
  });

  it('refuses a bad config', () => {
    expect(() => parseDailyConfig({ ...dailyJson, gift: { ...dailyJson.gift, min: 9, max: 3 } })).toThrow('daily.json: "gift.min"');
    expect(() => parseDailyConfig({ ...dailyJson, milestones: [{ days: 7, gift: 1 }, { days: 3, gift: 1 }] })).toThrow('"milestones"');
  });
});

describe('two currencies (owner decision): coins from gifts, milestones, the goal ring and level-ups; tips only from clients', () => {
  it('the gift amounts are coins in config: 10-20, a +10 bonus, bigger milestones at 3, 7, 14 and 30 days', () => {
    expect(DAILY_CONFIG.gift).toMatchObject({ min: 10, max: 20, bonus: 10 });
    expect(DAILY_CONFIG.milestones.map((m) => m.days)).toEqual([3, 7, 14, 30]);
    expect(DAILY_CONFIG.milestones.every((m) => m.gift > DAILY_CONFIG.gift.max)).toBe(true);
  });

  it('gives the welcome coins once, also to a save from before coins, and keeps its tips', () => {
    const old = { ...NEW_SAVE, wallet: 77 };
    const welcomed = welcomeCoins(old);
    expect(welcomed).toMatchObject({ wallet: 77, coins: DAILY_CONFIG.coins.welcome, coinsWelcomed: true });
    expect(welcomeCoins(welcomed)).toBe(welcomed);
  });

  it('counts coins for the goal ring and a level up', () => {
    expect(appointmentCoins(false, false)).toBe(0);
    expect(appointmentCoins(true, false)).toBe(DAILY_CONFIG.coins.goal);
    expect(appointmentCoins(true, true)).toBe(DAILY_CONFIG.coins.goal + DAILY_CONFIG.coins.levelUp);
  });

  it('an appointment gives tips to the wallet, and coins only when it reaches the goal ring or a level', () => {
    const base = { stars: 3, tip: 8, goalMet: false, walkedOut: false, skills: { greeting: 60, consultation: 60, upsell: 60, rebooking: 60, problemHandling: 60 }, englishScore: 60, difficulty: 'easy' as const, daily: false };
    let save = { ...NEW_SAVE, xp: 0 };
    const coinsAt: number[] = [];
    const expected: number[] = [];
    for (let i = 0; i < PATH_CONFIG.goal + 1; i++) {
      const update = applyAppointment(save, { ...base, today: '2026-11-15' });
      coinsAt.push(update.coinsGained);
      expected.push((i === PATH_CONFIG.goal - 1 ? DAILY_CONFIG.coins.goal : 0) + (update.rankUp ? DAILY_CONFIG.coins.levelUp : 0));
      save = update.save;
    }
    // Only the goal-th appointment of the day pays the goal coins (plus a level's coins whenever one comes).
    expect(coinsAt).toEqual(expected);
    expect(coinsAt[PATH_CONFIG.goal - 1]).toBeGreaterThanOrEqual(DAILY_CONFIG.coins.goal);
    expect(save.coins).toBe(expected.reduce((a, b) => a + b, 0));
    expect(save.wallet).toBe(8 * (PATH_CONFIG.goal + 1));
    // A level up pays its coins.
    const tech = PROGRESSION_CONFIG.ranks[1]!;
    const up = applyAppointment({ ...NEW_SAVE, xp: tech.xp - 1 }, { ...base, today: '2026-11-16' });
    expect(up.rankUp).not.toBeNull();
    expect(up.coinsGained).toBe(DAILY_CONFIG.coins.levelUp);
    expect(up.save.coins).toBe(DAILY_CONFIG.coins.levelUp);
    // A walk-out pays no goal coins.
    expect(applyAppointment(NEW_SAVE, { ...base, walkedOut: true, today: '2026-11-16' }).coinsGained).toBe(0);
  });

  it('keeps coins in the save and drops nonsense', () => {
    expect(parseSave(JSON.stringify({ ...NEW_SAVE, coins: 45, coinsWelcomed: true }))).toMatchObject({ coins: 45, coinsWelcomed: true });
    const bad = parseSave(JSON.stringify({ ...NEW_SAVE, coins: -5, coinsWelcomed: 'yes' }));
    expect(bad.coins).toBeUndefined();
    expect(bad.coinsWelcomed).toBeUndefined();
  });
});

describe("today's challenge line (057a part 2)", () => {
  it('says start at 0 days, keep while the streak is going, and cheers once played', () => {
    expect(dailyLineKey(0, false).key).toBe('daily.start');
    expect(dailyLineKey(3, false)).toEqual({ key: 'daily.keep', params: { days: 3 } });
    expect(dailyLineKey(3, true)).toEqual({ key: 'daily.streak', params: { days: 3 } });
  });
});
