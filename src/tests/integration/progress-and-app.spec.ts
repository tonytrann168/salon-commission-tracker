import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { LANGS, fakeSupabase, mockApi, seed } from './fixtures';

/** Story 029: keeping progress (backup, accounts) and the app shell (offline, a new build), in English and Vietnamese. */

const openSettings = (page: Page) => page.locator('.title-menu-row').first().locator('button').first().click();

for (const lang of LANGS) {
  test.describe(`progress and app (${lang})`, () => {
    test('backup on one phone, restore on another (a separate browser)', async ({ browser }) => {
      const a = await browser.newContext();
      await seed(a, lang, { save: { wallet: 77, xp: 300, appointments: 12, owned: ['rose-gold'] } });
      await mockApi(a);
      const pa = await a.newPage();
      await pa.goto('/');
      await openSettings(pa);
      await pa.locator('.backup-section .chat-button').first().click();
      await expect(pa.locator('.backup-section .backup-code')).toHaveValue(/^SB1-/);
      await expect(pa.locator('.backup-qr svg')).toBeVisible();
      const code = await pa.locator('.backup-section .backup-code').inputValue();
      await a.close();

      const b = await browser.newContext();
      await seed(b, lang, { companion: false });
      await mockApi(b);
      const pb = await b.newPage();
      await pb.goto('/');
      await pb.locator('.title-menu > .chat-button').first().click();
      await pb.locator('.meet-restore').click();
      await pb.locator('.feedback-sheet .backup-code').fill(code.slice(0, -4));
      await pb.locator('.feedback-actions .chat-button').last().click();
      await expect(pb.locator('.feedback-status')).not.toBeEmpty();
      await pb.locator('.feedback-sheet .backup-code').fill(code);
      await pb.locator('.feedback-actions .chat-button').last().click();
      await expect(pb.locator('.backup-confirm')).toBeVisible();
      await Promise.all([pb.waitForEvent('load'), pb.locator('.backup-confirm .chat-button').click()]);
      await expect(pb.locator('.title-menu')).toBeVisible();
      const save = await pb.evaluate(() => JSON.parse(localStorage.getItem('salon.save') ?? '{}'));
      expect(save).toMatchObject({ wallet: 77, appointments: 12 });
      await b.close();
    });

    test('sign up, confirm with the code, sync; sign in on another phone and choose which progress to keep', async ({ browser }) => {
      const supabase = fakeSupabase();
      const email = `lan.${lang}@example.com`;
      // Phone A: 12 appointments, makes an account.
      const a = await browser.newContext();
      await supabase.route(a);
      await seed(a, lang, { save: { wallet: 77, xp: 300, appointments: 12 } });
      await mockApi(a);
      const pa = await a.newPage();
      await pa.goto('/');
      await openSettings(pa);
      await pa.locator('.account-section .chat-button').first().click();
      await pa.locator('.account-link').first().click();
      await pa.locator('.account-email').fill(email);
      await pa.locator('.account-password-input').fill('polish123');
      await pa.locator('.feedback-actions .chat-button').last().click();
      await expect(pa.locator('.account-code')).toBeVisible();
      await expect(pa.locator('.account-resend')).toBeDisabled();
      await pa.locator('.account-code').fill('000000');
      await pa.locator('.feedback-actions .chat-button').last().click();
      await expect(pa.locator('.feedback-status')).not.toBeEmpty();
      await pa.locator('.account-code').fill(supabase.code(email)!);
      await pa.locator('.feedback-actions .chat-button').last().click();
      await expect(pa.locator('.account-section')).toContainText(email);
      await expect.poll(() => supabase.saves.size).toBe(1);
      await a.close();

      // Phone B: its own progress (3 appointments). Wrong password first: the one answer that never says whether the email exists.
      const b = await browser.newContext();
      await supabase.route(b);
      await seed(b, lang, { save: { wallet: 5, xp: 40, appointments: 3 } });
      await mockApi(b);
      const pb = await b.newPage();
      await pb.goto('/');
      await openSettings(pb);
      await pb.locator('.account-section .chat-button').first().click();
      await pb.locator('.account-email').fill(email);
      await pb.locator('.account-password-input').fill('wrongpass1');
      await pb.locator('.feedback-actions .chat-button').last().click();
      await expect(pb.locator('.feedback-status')).not.toBeEmpty();
      const wrong = await pb.locator('.feedback-status').textContent();
      expect(wrong).toBeTruthy();
      await pb.locator('.account-email').fill('nobody@example.com');
      await pb.locator('.feedback-actions .chat-button').last().click();
      await expect(pb.locator('.feedback-status')).toHaveText(wrong!);
      await pb.locator('.account-email').fill(email);
      await pb.locator('.account-password-input').fill('polish123');
      await pb.locator('.feedback-actions .chat-button').last().click();
      await expect(pb.locator('.account-keep-sheet')).toBeVisible();
      await expect(pb.locator('.account-keep .chat-button').first()).toContainText('3');
      await expect(pb.locator('.account-keep .chat-button').last()).toContainText('12');
      await Promise.all([pb.waitForEvent('load'), pb.locator('.account-keep .chat-button').last().click()]);
      await expect(pb.locator('.title-menu')).toBeVisible();
      const save = await pb.evaluate(() => JSON.parse(localStorage.getItem('salon.save') ?? '{}'));
      expect(save).toMatchObject({ wallet: 77, appointments: 12 });
      await b.close();
    });

    test('offline after one visit: the title still opens and Start explains a connection is needed', async ({ browser }) => {
      const context = await browser.newContext({ serviceWorkers: 'allow' });
      await seed(context, lang);
      const page = await context.newPage();
      await page.goto('/');
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });
      await page.reload();
      await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
      await context.setOffline(true);
      await page.reload();
      await expect(page.locator('.title-menu')).toBeVisible();
      await page.locator('.title-menu > .chat-button').first().click();
      await expect(page.locator('.app-note')).toBeVisible();
      await context.close();
    });

    test('privacy and terms open from Settings in the player\'s language', async ({ page, context }) => {
      await seed(page, lang);
      await mockApi(page);
      await page.goto('/');
      await openSettings(page);
      const links = page.locator('.screen > .legal-links a');
      await expect(links).toHaveCount(2);
      const [privacy] = await Promise.all([context.waitForEvent('page'), links.first().click()]);
      await privacy.waitForLoadState();
      expect(privacy.url()).toContain(`/privacy.html#${lang}`);
      await expect(privacy.locator(`section#${lang} h1`)).toBeVisible();
      expect(await privacy.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    });

    test('an uncaught error shows the friendly screen and sends a report without chat or email', async ({ page }) => {
      await seed(page, lang);
      const seen = await mockApi(page);
      await page.goto('/');
      await expect(page.locator('.title-menu')).toBeVisible();
      await page.evaluate(() => setTimeout(() => { throw new Error('Test failure for lan@example.com'); }, 0));
      await expect(page.locator('.error-screen')).toBeVisible();
      await expect(page.locator('.error-card h2')).toHaveText(lang === 'vi' ? 'Ối, có lỗi rồi' : 'Oops, something went wrong');
      await expect.poll(() => seen['client-error']?.length ?? 0).toBe(1);
      const report = seen['client-error']![0] as Record<string, unknown>;
      expect(Object.keys(report).sort()).toEqual(['message', 'path', 'stack', 'version']);
      expect(JSON.stringify(report)).not.toMatch(/example\.com/);
      // The game was usable: "Keep playing" closes it.
      await page.locator('.error-card .chat-button.secondary').click();
      await expect(page.locator('.error-screen')).toHaveCount(0);
      await expect(page.locator('.title-menu')).toBeVisible();
    });

    test('a new build while open: one reload with a note, never a loop', async ({ page }) => {
      await seed(page, lang);
      await mockApi(page);
      let loads = 0;
      page.on('load', () => (loads += 1));
      await page.route('**/assets/stage-*.js', (route) => route.fulfill({ status: 404, body: 'gone' }));
      await page.goto('/');
      await expect(page.locator('.app-note').first()).toBeVisible();
      await page.waitForTimeout(2500);
      expect(loads).toBe(2);
      await page.unroute('**/assets/stage-*.js');
      await page.reload();
      await expect(page.locator('canvas')).toBeVisible();
      await expect.poll(() => page.evaluate(() => sessionStorage.getItem('salon.reloadedForUpdate'))).toBeNull();
    });
  });
}
