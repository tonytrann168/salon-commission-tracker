import { describe, expect, it } from 'vitest';
import { SEASONS, activeSeason, giftDue, openGift, parseSeasonState, parseSeasons, seasonOverride, seasonPalette, seasonStickers } from '../game/seasons';
import { isUnlocked } from '../game/companion';
import { MASCOT_CONFIG } from '../game/mascot/mascot';
import { NAIL_ART_CONFIG } from '../game/nail-art/design';
import { NEW_SAVE } from '../game/progression';

/** Story 028: the Tết pack — dates, the dev override, free seasonal items, the daily lì xì. */

const tet = SEASONS.find((s) => s.id === 'tet')!;

describe('seasons', () => {
  it('Tết runs only inside its windows (around Lunar New Year 2027, 2028, 2029)', () => {
    expect(activeSeason('2026-11-13')).toBeNull();
    expect(activeSeason('2027-01-29')).toBeNull();
    expect(activeSeason('2027-01-30')?.id).toBe('tet');
    expect(activeSeason('2027-02-06')?.id).toBe('tet');
    expect(activeSeason('2027-02-21')).toBeNull();
    expect(activeSeason('2028-01-26')?.id).toBe('tet');
    expect(activeSeason('2029-02-13')?.id).toBe('tet');
  });

  it('the dev override shows a season on any day, in dev builds only', () => {
    expect(seasonOverride(true, '?season=tet')).toBe('tet');
    expect(seasonOverride(false, '?season=tet')).toBeNull();
    expect(activeSeason('2026-11-13', 'tet')?.id).toBe('tet');
    expect(activeSeason('2026-11-13', 'nope')).toBeNull();
  });

  it('rejects broken season data', () => {
    expect(() => parseSeasons({ seasons: [{ ...tet, windows: [{ from: '2027-02-20', to: '2027-01-30' }] }] })).toThrow(/windows/);
    expect(() => parseSeasons({ seasons: [{ ...tet, dailyGift: { tips: 0 } }] })).toThrow(/gift/);
  });

  it('red and gold polish and the hoa mai sticker are offered only during the season', () => {
    const ids = (season: typeof tet | null) => seasonPalette(NAIL_ART_CONFIG.palette, season).map((c) => c.id);
    expect(ids(null)).not.toContain('tet-red');
    expect(ids(tet)).toEqual(expect.arrayContaining(['tet-red', 'tet-gold', 'red']));
    expect(NAIL_ART_CONFIG.palette.filter((c) => tet.polishes.includes(c.id)).every((c) => !c.shop)).toBe(true);
    expect(seasonStickers(NAIL_ART_CONFIG.stickers, null)).not.toContain('hoa-mai');
    expect(seasonStickers(NAIL_ART_CONFIG.stickers, tet)).toEqual([...NAIL_ART_CONFIG.stickers, 'hoa-mai']);
  });

  it('the lì xì opens once a day: tips into the wallet, the áo dài the first time, kept after the season', () => {
    let save = { ...NEW_SAVE, wallet: 10 };
    let state = parseSeasonState('{bad');
    expect(giftDue(state, tet, '2027-02-06')).toBe(true);
    const first = openGift(save, state, tet, '2027-02-06')!;
    expect(first).toMatchObject({ tips: tet.dailyGift.tips, outfit: true });
    expect(first.save.wallet).toBe(10 + tet.dailyGift.tips);
    expect(first.save.owned).toContain('ao-dai-red');
    ({ save, state } = first);
    expect(openGift(save, state, tet, '2027-02-06')).toBeNull();
    expect(giftDue(state, null, '2027-02-07')).toBe(false);
    const second = openGift(save, state, tet, '2027-02-07')!;
    expect(second.outfit).toBe(false);
    expect(second.save.owned.filter((id) => id === 'ao-dai-red')).toHaveLength(1);
    // The outfit can be worn once gifted, whatever the date.
    const aoDai = MASCOT_CONFIG.accessories.find((a) => a.id === 'ao-dai-red')!;
    const facts = { friendshipLevel: 1, phrases: 0, fiveStars: false, streak: 0 };
    expect(isUnlocked(aoDai, { ...facts, owned: [] })).toBe(false);
    expect(isUnlocked(aoDai, { ...facts, owned: second.save.owned })).toBe(true);
    expect(parseSeasonState(JSON.stringify(second.state)).giftDay.tet).toBe('2027-02-07');
  });
});
