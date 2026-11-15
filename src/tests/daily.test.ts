import { describe, expect, it } from 'vitest';
import dailyJson from '../game/config/daily.json';
import { DAILY_CONFIG, NEW_PLAY, daysBetween, giftReady, liveStreak, openDailyGift, parseDailyConfig, parsePlay, recordPlayDay, weekOf } from '../game/daily';
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
    expect(g.milestone).toEqual({ days: 3, gift: 15 });
    expect(g.total).toBe(DAILY_CONFIG.gift.max + 15);
    const next = openDailyGift({ ...g.play, lastDay: '2026-11-12', streak: 4 }, '2026-11-12', () => 0.999)!;
    expect(next.milestone).toBeNull();
  });

  it('refuses a bad config', () => {
    expect(() => parseDailyConfig({ ...dailyJson, gift: { ...dailyJson.gift, min: 9, max: 3 } })).toThrow('daily.json: "gift.min"');
    expect(() => parseDailyConfig({ ...dailyJson, milestones: [{ days: 7, gift: 1 }, { days: 3, gift: 1 }] })).toThrow('"milestones"');
  });
});
