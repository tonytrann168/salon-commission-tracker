import { expect, test } from '@playwright/test';
import { LANGS, dailyWith, mockApi, noOverflow, playToResults, seed } from './fixtures';

/** Story 029: the game's main flows, end to end, at 320 px, in English and Vietnamese. */

for (const lang of LANGS) {
  test.describe(`game flows (${lang})`, () => {
    test('first run: meet the companion, pick a level, the first appointment opens with the tour', async ({ page }) => {
      await seed(page, lang, { companion: false, level: false, tourDone: false });
      await mockApi(page);
      await page.goto('/');
      await page.locator('.title-menu > .chat-button').first().click();
      await expect(page.locator('.companion-meet')).toBeVisible();
      await page.locator('.companion-meet .chat-button').first().click();
      await page.locator('.level-card').nth(1).click();
      await page.locator('.picker-daily').click();
      await expect(page.locator('.chat-input')).toBeVisible();
      await expect(page.locator('.tour-card')).toBeVisible();
      const companion = await page.evaluate(() => JSON.parse(localStorage.getItem('salon.companion.v1') ?? '{}'));
      expect(companion).toMatchObject({ chosen: true, relation: 'older' });
      expect(await noOverflow(page)).toBe(true);
    });

    test('a manicure appointment plays through to the results and is saved', async ({ page }) => {
      await seed(page, lang, { save: { xp: 100, appointments: 3, badges: ['first-client'], ...dailyWith('lily', 'party-tonight') } });
      const seen = await mockApi(page);
      await page.goto('/');
      await playToResults(page);
      await expect(page.locator('.chat-results .results-section').first()).toBeVisible();
      expect(seen['grade-appointment']).toHaveLength(1);
      const save = await page.evaluate(() => JSON.parse(localStorage.getItem('salon.save') ?? '{}'));
      expect(save.appointments).toBe(4);
      expect(await noOverflow(page)).toBe(true);
    });

    test('a hard client asks for both hands: the station switches hands', async ({ page }) => {
      await seed(page, lang, { save: { xp: 700, appointments: 20, badges: ['first-client'], ...dailyWith('brenda') } });
      await mockApi(page);
      await page.goto('/');
      await page.locator('.title-menu > .chat-button').first().click();
      await page.locator('.picker-daily').click();
      await page.locator('.chat-input').fill('Hello! Welcome. Both hands today? Please sit here.');
      await page.locator('.chat-form button[type=submit]').click();
      const hand = page.locator('.station-hand');
      await expect(hand).toBeVisible();
      await expect(hand).toHaveText(/✋1/);
      await hand.click();
      await expect(hand).toHaveText(/✋2/);
    });

    test('a pedicure starts with soak and scrub, then the paint tools', async ({ page }) => {
      await seed(page, lang, { save: { xp: 100, appointments: 4, badges: ['first-client'], ...dailyWith('grace', 'pedicure-day') } });
      await mockApi(page);
      await page.goto('/');
      await page.locator('.title-menu > .chat-button').first().click();
      await page.locator('.picker-daily').click();
      await page.locator('.chat-input').fill('Of course! Please put your feet in the warm water.');
      await page.locator('.chat-form button[type=submit]').click();
      await expect(page.locator('.pedi-prep')).toBeVisible();
      await expect(page.locator('.station-tools')).toBeHidden();
      const mood = Number(await page.locator('.mood-value').textContent());
      await page.locator('.pedi-start').click();
      await expect(page.locator('.pedi-prep[data-step=scrubbing]')).toBeVisible({ timeout: 10_000 });
      while (await page.locator('.pedi-scrub').count()) await page.locator('.pedi-scrub').click();
      await expect(page.locator('.pedi-prep-line')).toBeVisible();
      await expect(page.locator('.pedi-prep')).toHaveCount(0, { timeout: 6_000 });
      await expect(page.locator('.station-tools')).toBeVisible();
      expect(Number(await page.locator('.mood-value').textContent())).toBeGreaterThan(mood);
    });

    test('buying a polish in the shop puts it in the station', async ({ page }) => {
      await seed(page, lang, { save: { wallet: 50, xp: 100, appointments: 4, badges: ['first-client'], ...dailyWith('lily', 'party-tonight') } });
      await mockApi(page);
      await page.goto('/');
      await page.locator('.title-menu-row').nth(1).locator('button').first().click();
      await page.locator('.shop-buy').first().click();
      const save = await page.evaluate(() => JSON.parse(localStorage.getItem('salon.save') ?? '{}'));
      expect(save.wallet).toBe(25);
      expect(save.owned).toContain('rose-gold');
      await page.locator('.screen > .chat-button.secondary').last().click();
      await page.locator('.title-menu > .chat-button').first().click();
      await page.locator('.picker-daily').click();
      await page.locator('.chat-input').fill('Hello! Welcome. What colour would you like?');
      await page.locator('.chat-form button[type=submit]').click();
      await expect(page.locator('.station-tools')).toBeVisible();
      await expect(page.locator(`.station-swatch[aria-label*="${lang === 'vi' ? 'Vàng hồng' : 'Rose gold'}" i]`)).toHaveCount(1);
    });

    test('reaching a new rank shows the celebration', async ({ page }) => {
      await seed(page, lang, { save: { xp: 55, appointments: 2, badges: ['first-client'], ...dailyWith('lily', 'party-tonight') } });
      await mockApi(page);
      await page.goto('/');
      await playToResults(page);
      await expect(page.locator('.celebration .celebration-card')).toBeVisible({ timeout: 8_000 });
      const save = await page.evaluate(() => JSON.parse(localStorage.getItem('salon.save') ?? '{}'));
      expect(save.xp).toBeGreaterThanOrEqual(60);
    });
  });
}
