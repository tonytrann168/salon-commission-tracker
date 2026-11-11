import { describe, expect, it } from 'vitest';
import { ROSTER } from '../game/clients/roster';
import { NAIL_ART_CONFIG } from '../game/nail-art/design';
import { NEW_SAVE, PROGRESSION_CONFIG, applyAppointment, buy, dailyChallenge, hashDay, liveStreak, parseProgressionConfig, rankFor, stationPalette, unlockedDifficulties, upgradeEffects } from '../game/progression';
import type { AppointmentOutcome, ProgressSave } from '../game/progression';
import { parseSave } from '../game/save';

/** Story 007: wallet, shop, ranks and unlocks, badges, daily challenge and streak. Pure, no storage, no clock. */

const skills = (n: number) => ({ greeting: n, consultation: n, upsell: n, rebooking: n, problemHandling: n });
const outcome = (over: Partial<AppointmentOutcome> = {}): AppointmentOutcome => ({ stars: 3, tip: 8, goalMet: false, walkedOut: false, skills: skills(60), englishScore: 60, difficulty: 'easy', daily: false, today: '2026-11-10', ...over });
const save = (over: Partial<ProgressSave> = {}): ProgressSave => ({ ...NEW_SAVE, ...over });

describe('wallet and XP', () => {
  it('adds the tip to the wallet and XP by stars, goal and difficulty (config)', () => {
    const { xp } = PROGRESSION_CONFIG;
    const easy = applyAppointment(NEW_SAVE, outcome({ stars: 4, tip: 12 }));
    expect(easy.save.wallet).toBe(12);
    expect(easy.save.tipsEarned).toBe(12);
    expect(easy.xpGained).toBe(xp.byStars[3]);
    const hardGoal = applyAppointment(NEW_SAVE, outcome({ stars: 5, goalMet: true, difficulty: 'hard' }));
    expect(hardGoal.xpGained).toBe(Math.round(((xp.byStars[4] as number) + xp.goalBonus) * xp.difficulty.hard));
    expect(applyAppointment(easy.save, outcome()).save.appointments).toBe(2);
  });

  it('ranks up from Junior to Master Tech and unlocks harder clients', () => {
    expect(rankFor(0).rank.id).toBe('junior');
    expect(unlockedDifficulties(0)).toEqual(['easy']);
    const [, tech, senior, master] = PROGRESSION_CONFIG.ranks;
    const before = save({ xp: (tech?.xp ?? 0) - 1 });
    const update = applyAppointment(before, outcome({ stars: 1 }));
    expect(update.rankUp?.id).toBe('nail-tech');
    expect(update.unlocked).toEqual(['medium']);
    expect(unlockedDifficulties(senior?.xp ?? 0)).toEqual(['easy', 'medium', 'hard']);
    expect(rankFor(master?.xp ?? 0)).toMatchObject({ rank: { id: 'master', icon: '👑', name: { en: 'Nail Boss', vi: 'Trùm Nail Đỉnh Nóc Kịch Trần' } }, next: null });
    expect(applyAppointment(save({ xp: 5 }), outcome()).rankUp).toBeNull();
  });
});

describe('badges', () => {
  it('awards each badge once, from the scorecard', () => {
    const first = applyAppointment(NEW_SAVE, outcome({ stars: 5, skills: { ...skills(60), upsell: 92 }, englishScore: 91, nailMatch: 97 }));
    expect(first.badges.map((b) => b.id).sort()).toEqual(['clear-english', 'first-client', 'five-stars', 'perfect-nails', 'upsell-pro']);
    expect(applyAppointment(first.save, outcome({ stars: 5 })).badges).toEqual([]);
  });

  it('respects a badge that needs a hard client, and gives nothing for a walk-out', () => {
    const calm = { ...skills(60), problemHandling: 90 };
    expect(applyAppointment(NEW_SAVE, outcome({ skills: calm, difficulty: 'medium' })).badges.map((b) => b.id)).not.toContain('calm-pro');
    expect(applyAppointment(NEW_SAVE, outcome({ skills: calm, difficulty: 'hard' })).badges.map((b) => b.id)).toContain('calm-pro');
    expect(applyAppointment(save({ appointments: 3, badges: ['first-client'] }), outcome({ stars: 5, walkedOut: true })).badges).toEqual([]);
  });
});

describe('the daily challenge and streak', () => {
  it('picks the same client all day from the date, among unlocked clients, and keeps it after a rank-up', () => {
    const a = dailyChallenge(NEW_SAVE, '2026-11-10', ROSTER);
    const again = dailyChallenge(NEW_SAVE, '2026-11-10', ROSTER);
    expect(a?.client.id).toBe(again?.client.id);
    expect(a?.client.difficulty).toBe('easy');
    const ranked = { ...(a?.save as ProgressSave), xp: 10_000 };
    expect(dailyChallenge(ranked, '2026-11-10', ROSTER)?.client.id).toBe(a?.client.id);
    const days = Array.from({ length: 30 }, (_, i) => `2026-12-${String(i + 1).padStart(2, '0')}`);
    expect(new Set(days.map((d) => dailyChallenge(save({ xp: 10_000 }), d, ROSTER)?.client.id)).size).toBeGreaterThan(3);
    expect(hashDay('2026-11-10')).toBe(hashDay('2026-11-10'));
  });

  it('a finished daily extends the streak; a missed day resets it; milestones are flagged; walk-outs do not count', () => {
    let s = NEW_SAVE;
    for (const day of ['2026-11-08', '2026-11-09', '2026-11-10']) {
      const u = applyAppointment(s, outcome({ daily: true, today: day }));
      s = u.save;
      if (day === '2026-11-10') expect(u.streak).toEqual({ days: 3, milestone: true });
    }
    expect(s.badges).toContain('streak-3');
    expect(liveStreak(s, '2026-11-11')).toBe(3);
    expect(liveStreak(s, '2026-11-12')).toBe(0);
    expect(applyAppointment(s, outcome({ daily: true, today: '2026-11-12' })).streak).toEqual({ days: 1, milestone: false });
    expect(applyAppointment(s, outcome({ daily: true, today: '2026-11-10' })).streak).toBeNull();
    expect(applyAppointment(s, outcome({ daily: true, today: '2026-11-11', walkedOut: true })).streak).toBeNull();
    const bonus = applyAppointment(NEW_SAVE, outcome({ daily: true })).xpGained - applyAppointment(NEW_SAVE, outcome()).xpGained;
    expect(bonus).toBe(PROGRESSION_CONFIG.xp.dailyBonus);
  });
});

describe('the shop', () => {
  it('spends tips on polishes and upgrades; refuses owned items and empty wallets', () => {
    const rich = save({ wallet: 100 });
    const bought = buy(rich, 'rose-gold');
    expect(bought).toMatchObject({ ok: true, save: { wallet: 75, owned: ['rose-gold'] } });
    if (!bought.ok) return;
    expect(buy(bought.save, 'rose-gold')).toEqual({ ok: false, reason: 'owned' });
    expect(buy(save({ wallet: 10 }), 'chrome')).toEqual({ ok: false, reason: 'funds' });
    expect(buy(rich, 'nope')).toEqual({ ok: false, reason: 'unknown' });
  });

  it('bought polishes appear in the station; shop colours are hidden until bought', () => {
    const free = stationPalette(NAIL_ART_CONFIG.palette, NEW_SAVE).map((c) => c.id);
    expect(free).not.toContain('rose-gold');
    expect(free).toContain('pale-pink');
    expect(stationPalette(NAIL_ART_CONFIG.palette, save({ owned: ['rose-gold'] })).map((c) => c.id)).toContain('rose-gold');
  });

  it('upgrades change the tools and the starting mood', () => {
    expect(upgradeEffects(NEW_SAVE)).toEqual({ brushScale: 1, cleanupScale: 1, startMood: 0 });
    expect(upgradeEffects(save({ owned: ['fine-brush', 'comfy-chair', 'cleanup-pen'] }))).toEqual({ brushScale: 0.85, cleanupScale: 1.4, startMood: 3 });
  });

  it('no client asks for a colour that has to be bought', () => {
    const shop = new Set(NAIL_ART_CONFIG.palette.filter((c) => c.shop).map((c) => c.id));
    for (const client of ROSTER) for (const colour of client.nailRequest?.colors ?? []) expect(shop.has(colour), `${client.id} wants ${colour}`).toBe(false);
  });
});

describe('config and save', () => {
  it('refuses bad config with a clear message', () => {
    const bad = (patch: (c: Record<string, unknown>) => void) => {
      const raw = structuredClone(PROGRESSION_CONFIG) as unknown as Record<string, unknown>;
      patch(raw);
      return () => parseProgressionConfig(raw);
    };
    expect(bad((c) => ((c.ranks as { xp: number }[])[1]!.xp = 0))).toThrow(/progression\.json: "ranks\[1\]\.xp"/);
    expect(bad((c) => ((c.shop as { polishes: { id: string }[] }).polishes[0]!.id = 'pale-pink'))).toThrow(/marked "shop"/);
    expect(bad((c) => ((c.badges as { rule: { skill?: string } }[])[2]!.rule.skill = 'nails'))).toThrow(/scorecard skill/);
  });

  it('reads a damaged save field by field, and starts fresh on an unknown version', () => {
    expect(parseSave(null)).toEqual(NEW_SAVE);
    expect(parseSave('{oops')).toEqual(NEW_SAVE);
    expect(parseSave(JSON.stringify({ version: 2, wallet: 50 }))).toEqual(NEW_SAVE);
    const mixed = parseSave(JSON.stringify({ version: 1, wallet: 40, xp: -3, owned: ['chrome', 7, 'chrome'], daily: { day: 'today', clientId: 'grace' }, streak: 2 }));
    expect(mixed).toMatchObject({ wallet: 40, xp: 0, owned: ['chrome'], daily: null, streak: 2 });
  });
});
