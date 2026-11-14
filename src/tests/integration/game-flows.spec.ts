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

    test('colour redo: after Done the client may ask once for a redo; the station takes exactly one more Done', async ({ page }) => {
      await seed(page, lang, { save: { xp: 300, appointments: 10, badges: ['first-client'], ...dailyWith('kim', 'colour-redo') } });
      await mockApi(page);
      await page.goto('/');
      await page.locator('.title-menu > .chat-button').first().click();
      await page.locator('.picker-daily').click();
      await page.locator('.chat-input').fill('Hello! Red is lovely on you. Let me start.');
      await page.locator('.chat-form button[type=submit]').click();
      const done = page.locator('.station-done');
      await expect(done).toBeVisible();
      await done.click();
      // Story 035: she asks for the redo herself (from her face), and the station stays on screen.
      await expect(page.locator('.service-say')).toContainText('different one');
      await expect(done).toHaveText(/↺/);
      await expect(done).toBeEnabled();
      await done.click();
      await expect(done).toHaveText('✓');
      await done.click();
      // The second Done ends the service: back to the chat for checkout.
      await expect(page.locator('.chat-panel.service-mode')).toHaveCount(0, { timeout: 5_000 });
      await expect(page.locator('.chat-input')).toBeVisible();
    });

    test('the service is full screen: her own line, the Reply sheet, an ignored question costs a little, Done → checkout', async ({ page }) => {
      await seed(page, lang, { save: { xp: 300, appointments: 10, badges: ['first-client'], ...dailyWith('lily', 'party-tonight') } });
      test.setTimeout(80_000);
      await mockApi(page, { replies: ['Hi!', 'Red, please. Is that okay?', 'Great, thank you!'] });
      await page.goto('/');
      await page.locator('.title-menu > .chat-button').first().click();
      await page.locator('.picker-daily').click();
      await page.locator('.chat-input').fill('Hello! What colour would you like?');
      await page.locator('.chat-form button[type=submit]').click();
      // The station takes the screen; the chat and the reply box are out of sight.
      await expect(page.locator('.chat-panel.service-mode')).toHaveCount(1);
      await expect(page.locator('.chat-input')).toBeHidden();
      await expect(page.locator('.service-say')).toHaveText('Red, please. Is that okay?');
      await expect(page.locator('.reply-chip')).toBeVisible();
      // 035 fixes: the colours are in plain sight (5+ swatches inside the screen, the next one cut off at the edge),
      // tappable at once, and the chosen one is marked; the order reminder shows; nothing covers the hint line.
      const inView = await page.locator('.station-swatch').evaluateAll((nodes) => nodes.filter((n) => { const r = n.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; }).length);
      expect(inView).toBeGreaterThanOrEqual(5);
      expect(await page.locator('.station-row').evaluate((row) => row.scrollWidth > row.clientWidth)).toBe(true);
      await page.locator('.station-swatch').nth(3).click();
      await expect(page.locator('.station-swatch').nth(3)).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.service-order')).toContainText('🎨');
      const overlap = await page.evaluate(() => {
        const box = (sel: string) => document.querySelector(sel)?.getBoundingClientRect();
        const hit = (a?: DOMRect, b?: DOMRect) => !!a && !!b && a.width > 0 && b.width > 0 && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        return { chipHint: hit(box('.reply-chip'), box('.station-status')), chipOrder: hit(box('.reply-chip'), box('.service-order')), sayOrder: hit(box('.service-say'), box('.service-order')) };
      });
      expect(overlap).toEqual({ chipHint: false, chipOrder: false, sayOrder: false });
      // Reply from the sheet; sending closes it and the service goes on (the AI can't end it).
      await page.locator('.reply-chip').click();
      await expect(page.locator('.reply-sheet .chat-input')).toBeVisible();
      await page.locator('.reply-sheet .chat-input').fill('Yes, red is perfect!');
      await page.locator('.reply-sheet button[type=submit]').click();
      await expect(page.locator('.reply-sheet')).toHaveCount(0);
      await expect(page.locator('.chat-panel.service-mode')).toHaveCount(1);
      // Her own line comes ~10 s into the service (all of Lily's are questions); left unanswered for 20 s it costs a
      // little mood, once, with a nudge.
      await expect(page.locator('.service-say')).toHaveText('Great, thank you!');
      await expect(page.locator('.service-say')).not.toHaveText('Great, thank you!', { timeout: 15_000 });
      const before = Number(await page.locator('.mood-value').textContent());
      await expect(page.locator('.service-nudge')).toBeVisible({ timeout: 25_000 });
      expect(Number(await page.locator('.mood-value').textContent())).toBe(before - 3);
      // Done → a short transition → checkout in the chat, opened by her line.
      await page.locator('.station-done').click();
      await expect(page.locator('.chat-panel.service-mode')).toHaveCount(0, { timeout: 5_000 });
      await expect(page.locator('.chat-bubble.client').last()).toContainText(/owe|total|How much/i);
      // At checkout the job is finished: no tools, no pill over the hand.
      await expect(page.locator('.station-tools')).toBeHidden();
      await expect(page.locator('.station-status')).toBeHidden();
    });

    test('the phrasebook has useful phrases by topic, even before any are earned', async ({ page }) => {
      await seed(page, lang);
      await mockApi(page);
      await page.goto('/');
      await page.locator('.title-menu-row').first().locator('button').nth(1).click();
      await expect(page.locator('.phrasebook-fold')).toHaveCount(5);
      await page.locator('.phrasebook-fold summary').first().click();
      await expect(page.locator('.phrasebook-fold').first().locator('.learning-phrase')).toHaveCount(10);
      expect(await noOverflow(page)).toBe(true);
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
