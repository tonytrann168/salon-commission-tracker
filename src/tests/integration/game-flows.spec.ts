import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import serviceTalk from '../../game/config/service-talk.json' with { type: 'json' };
import { LANGS, dailyWith, finishAppointment, mockApi, noOverflow, playToResults, seed, toResults } from './fixtures';

/** Story 048: paint every nail on the station: rows of strokes across the whole hand area (spill does not matter here). */
async function paintEverything(page: Page): Promise<void> {
  // Pointer events sent in the page (real mouse moves wait for a frame each, too slow on software rendering).
  await page.locator('.station-touch').evaluate((touch) => {
    const box = touch.getBoundingClientRect();
    const fire = (type: string, x: number, y: number) => touch.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, clientX: x, clientY: y, buttons: 1 }));
    for (let y = box.top + 3; y < box.bottom - 3; y += 3) {
      fire('pointerdown', box.left + 2, y);
      for (let x = box.left + 2; x < box.right - 2; x += 3) fire('pointermove', x, y);
      fire('pointerup', box.right - 2, y);
    }
  });
}

/** Story 029: the game's main flows, end to end, at 320 px, in English and Vietnamese. */

for (const lang of LANGS) {
  test.describe(`game flows (${lang})`, () => {
    test('first run: meet the companion, pick a level, the first appointment opens with the tour', async ({ page }) => {
      await seed(page, lang, { companion: false, level: false, tourDone: false });
      await mockApi(page);
      await page.goto('/');
      await page.locator('.title-menu > .chat-button').first().click();
      await expect(page.locator('.companion-meet')).toBeVisible();
      await page.locator('.companion-meet .meet-go').click();
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
      // Story 039: the payment moment: the price, the tip in parts that add up, the stars; then the review.
      const card = page.locator('.payment-card.done');
      await expect(card).toBeVisible({ timeout: 10_000 });
      await expect(card.locator('.payment-price')).toContainText('$25');
      const sum = await card.locator('.payment-parts li strong').evaluateAll((nodes) => nodes.reduce((total, n) => total + Number((n.textContent ?? '').replace(/[^0-9]/g, '')), 0));
      const tip = Number(((await card.locator('.payment-tip-amount').textContent()) ?? '').replace(/[^0-9]/g, ''));
      expect(tip).toBeGreaterThan(0);
      expect(sum).toBe(tip);
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
      await expect(hand).toContainText('✋1');
      await hand.click();
      await expect(hand).toContainText('✋2');
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

    test('colour redo (story 048): after Done she asks for a new colour; Fix it reopens the station; a new colour painted is fixed and she thanks the player', async ({ page }) => {
      test.setTimeout(90_000);
      await seed(page, lang, { save: { xp: 300, appointments: 10, badges: ['first-client'], ...dailyWith('kim', 'colour-redo') } });
      await mockApi(page);
      await page.goto('/');
      await page.locator('.title-menu > .chat-button').first().click();
      await page.locator('.picker-daily').click();
      await page.locator('.chat-input').fill('Hello! Red is lovely on you. Let me start.');
      await page.locator('.chat-form button[type=submit]').click();
      const done = page.locator('.station-done');
      await expect(done).toBeVisible();
      await page.locator('.station-swatch').nth(3).click();
      await done.click();
      // She asks for the redo herself, and the station reopens on the Fix it step (a word under the icon, selected).
      await expect(page.locator('.service-say')).toContainText('different one');
      const fix = page.locator('.station-controls .station-fix');
      await expect(fix).toBeVisible();
      await expect(fix.locator('.tab-text')).toHaveText(lang === 'vi' ? 'Sửa lại' : 'Fix it');
      await expect(fix).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('.station-status')).toContainText('🔧');
      await expect(done).toBeEnabled();
      await expect(done).toContainText('✓');
      // Remove all, a new colour (from the Fix row), and paint every nail.
      await page.locator('.station-remove-all').click();
      await page.locator('.station-row .station-swatch').nth(1).click();
      await paintEverything(page);
      await expect(page.locator('.service-say')).toContainText(/love this one|this colour is perfect/, { timeout: 5_000 });
      await expect(fix).toHaveCount(0);
      await done.click();
      await expect(page.locator('.chat-panel.service-mode')).toHaveCount(0, { timeout: 5_000 });
      await expect(page.locator('.chat-input')).toBeVisible();
    });

    test('clear steps (story 049): 1 Shape › 2 Length › 3 Colour › 4 Art with an instruction; a ✓ when a step matches her order; ? shows a 3-picture how-to', async ({ page }) => {
      await seed(page, lang, { save: { xp: 300, appointments: 10, badges: ['first-client'], ...dailyWith('lily', 'party-tonight') } });
      await mockApi(page);
      await page.goto('/');
      await page.locator('.title-menu > .chat-button').first().click();
      await page.locator('.picker-daily').click();
      await page.locator('.chat-input').fill('Hello! What colour would you like?');
      await page.locator('.chat-form button[type=submit]').click();
      const steps = page.locator('.station-steps .station-step');
      await expect(steps).toHaveCount(4);
      await expect(steps.locator('.step-num')).toHaveText(['1', '2', '3', '4']);
      const words = lang === 'vi' ? ['Dáng', 'Độ dài', 'Màu', 'Trang trí'] : ['Shape', 'Length', 'Colour', 'Art'];
      for (const [i, word] of words.entries()) await expect(steps.nth(i).locator('.tab-text')).toContainText(word);
      // Every step's word is whole at 320 px, and the path stays inside the screen.
      const fits = await steps.evaluateAll((nodes) => nodes.every((n) => { const text = n.querySelector<HTMLElement>('.tab-text')!; const r = n.getBoundingClientRect(); return text.scrollWidth <= text.clientWidth + 1 && r.left >= 0 && r.right <= window.innerWidth; }));
      expect(fits).toBe(true);
      await expect(page.locator('.station-step[data-step=colour]')).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('.station-instruction')).toContainText('3');
      // Step 1: her shape gets a ✓ (she asked for almond).
      await page.locator('.station-step[data-step=shape]').click();
      await expect(page.locator('.station-instruction')).toContainText('1');
      await expect(page.locator('.station-step[data-step=shape]')).not.toHaveClass(/matched/);
      await page.locator('.station-shape').nth(3).click();
      await expect(page.locator('.station-step[data-step=shape]')).toHaveClass(/matched/);
      // The how-to: three pictures with words, closed with one button.
      await page.locator('.station-how').click();
      await expect(page.locator('.station-howto-step')).toHaveCount(3);
      await expect(page.locator('.station-howto-step svg')).toHaveCount(3);
      expect(await noOverflow(page)).toBe(true);
      await page.locator('.station-howto-close').click();
      await expect(page.locator('.station-howto')).toHaveCount(0);
    });

    test('nail length (story 051): a Length step with her length on the order; a ✓ when it matches; "a little shorter" is a length fix', async ({ page }) => {
      await seed(page, lang, { save: { xp: 300, appointments: 10, badges: ['first-client'], ...dailyWith('lily', 'party-tonight') } });
      await mockApi(page, { replies: ['Hi!', 'Long almond nails, please!', 'Hmm, can you make them a little shorter, please?'] });
      await page.goto('/');
      await page.locator('.title-menu > .chat-button').first().click();
      await page.locator('.picker-daily').click();
      await page.locator('.chat-input').fill('Hello! How long would you like them?');
      await page.locator('.chat-form button[type=submit]').click();
      await expect(page.locator('.service-order')).toContainText(lang === 'vi' ? 'Dài' : 'Long');
      await expect(page.locator('.station-steps .station-step .tab-text')).toHaveText(lang === 'vi' ? ['Dáng', 'Độ dài', 'Màu', 'Trang trí'] : ['Shape', 'Length', 'Colour', 'Art']);
      const lengthStep = page.locator('.station-step[data-step=length]');
      await lengthStep.click();
      await expect(page.locator('.station-length')).toHaveCount(4);
      await expect(lengthStep).not.toHaveClass(/matched/);
      await page.locator('.station-length').nth(2).click();
      await expect(lengthStep).toHaveClass(/matched/);
      // She asks for shorter (her reply): Fix it, with the lengths right there; Medium fixes it.
      await page.locator('.reply-chip').click();
      await page.locator('.chat-input').fill('Of course!');
      await page.locator('.chat-form button[type=submit]').click();
      const fix = page.locator('.station-controls .station-fix');
      await expect(fix).toBeVisible();
      await expect(page.locator('.station-row .station-length')).toHaveCount(4);
      await page.locator('.station-row .station-length').nth(1).click();
      await expect(page.locator('.service-say')).toContainText(/length/, { timeout: 5_000 });
      await expect(fix).toHaveCount(0);
    });

    test('brush and clean-up (story 052): a brush under the finger, Undo the last stroke, Clean edges tidies a nail after a short wait', async ({ page }) => {
      await seed(page, lang, { save: { xp: 300, appointments: 10, badges: ['first-client'], ...dailyWith('lily', 'party-tonight') } });
      await mockApi(page);
      await page.goto('/');
      await page.locator('.title-menu > .chat-button').first().click();
      await page.locator('.picker-daily').click();
      await page.locator('.chat-input').fill('Hello! What colour would you like?');
      await page.locator('.chat-form button[type=submit]').click();
      const undo = page.locator('.station-undo');
      await expect(undo).toBeDisabled();
      await page.locator('.station-swatch').nth(3).click();
      // The brush shows while the finger is down, and goes when it lifts.
      const touch = page.locator('.station-touch');
      const at = async (type: string, fx: number, fy: number) => touch.evaluate((node, [t, x, y]) => { const b = node.getBoundingClientRect(); node.dispatchEvent(new PointerEvent(t as string, { bubbles: true, cancelable: true, pointerId: 3, clientX: b.left + b.width * (x as number), clientY: b.top + b.height * (y as number), buttons: 1 })); }, [type, fx, fy] as const);
      await at('pointerdown', 0.5, 0.5);
      await expect(page.locator('.station-brush.show')).toHaveCount(1);
      await at('pointerup', 0.5, 0.5);
      await expect(page.locator('.station-brush.show')).toHaveCount(0);
      // Undo: the swatch tap is a step; Undo takes it back.
      await expect(undo).toBeEnabled();
      await page.locator('.station-step[data-step=shape]').click();
      await page.locator('.station-shape').nth(3).click();
      await expect(page.locator('.station-step[data-step=shape]')).toHaveClass(/matched/);
      await undo.click();
      await expect(page.locator('.station-step[data-step=shape]')).not.toHaveClass(/matched/);
      // Paint everything (spill on the skin), then 🧽 Clean → Clean edges → tap a nail: a short wait, then tidy.
      await page.locator('.station-step[data-step=colour]').click();
      await paintEverything(page);
      await page.locator('.station-controls .station-clean-mode').click();
      await expect(page.locator('.station-controls .station-clean-mode')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.station-row .station-tidy')).toBeVisible();
      await page.locator('.station-row .station-tidy').click();
      const busy = await touch.evaluate((node) => {
        const b = node.getBoundingClientRect();
        for (let y = b.top + 4; y < b.bottom; y += 4) {
          node.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 4, clientX: b.left + b.width / 2, clientY: y, buttons: 1 }));
          node.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 4, clientX: b.left + b.width / 2, clientY: y }));
          if (document.querySelector('.station-tools.busy')) return true;
        }
        return false;
      });
      expect(busy).toBe(true);
      await expect(page.locator('.station-status')).toContainText('✨');
      await expect(page.locator('.station-tools.busy')).toHaveCount(0, { timeout: 4_000 });
      await expect(page.locator('.station-status')).toContainText(lang === 'vi' ? 'Viền sạch' : 'Edges clean');
    });

    test('celebrate the set (story 050): her nails as a polaroid first, then the payment; the photo is kept in My work and can be saved', async ({ page }) => {
      await seed(page, lang, { save: { xp: 100, appointments: 3, badges: ['first-client'], ...dailyWith('ana') } });
      await mockApi(page);
      await page.goto('/');
      await playToResults(page);
      const polaroid = page.locator('.chat-results .polaroid');
      await expect(polaroid).toBeVisible();
      await expect(polaroid.locator('img')).toHaveAttribute('src', /^data:image\/jpeg/);
      expect(await polaroid.evaluate((node) => /polaroid-(top|good|okay|tough)/.test(node.className))).toBe(true);
      await expect(polaroid.locator('figcaption')).toContainText(lang === 'vi' ? 'Móng của' : "'s nails");
      // The photo comes first: it sits above the payment card.
      const order = await page.evaluate(() => document.querySelector('.polaroid')!.getBoundingClientRect().top < document.querySelector('.payment-card')!.getBoundingClientRect().top);
      expect(order).toBe(true);
      expect(await noOverflow(page)).toBe(true);
      // My work on the profile: one photo; tap it for the big view and Save to phone.
      await page.locator('.results-actions .chat-button.secondary').click();
      await page.locator('.title-menu-row').nth(1).locator('button').nth(1).click();
      await expect(page.locator('.my-work-tile')).toHaveCount(1);
      await page.locator('.my-work-tile').click();
      await expect(page.locator('.my-work-viewer .my-work-big')).toHaveAttribute('src', /^data:image\/jpeg/);
      await expect(page.locator('.my-work-save')).toContainText(lang === 'vi' ? 'Lưu vào điện thoại' : 'Save to phone');
      const download = page.waitForEvent('download');
      await page.locator('.my-work-save').click();
      expect((await download).suggestedFilename()).toMatch(/^salon-besties-.*\.jpg$/);
      expect(await noOverflow(page)).toBe(true);
    });

    test('salon menu (story 044): Fancy prices reach the client; 📋 Menu in consultation and at checkout with her order; the bill rings it up; my own menu saves', async ({ page }) => {
      test.setTimeout(90_000);
      await seed(page, lang, { save: { xp: 100, appointments: 3, badges: ['first-client'], ...dailyWith('ana') } });
      const seen = await mockApi(page);
      await page.goto('/');
      // Settings: Fancy prices.
      await page.locator('.title-menu-row').first().locator('button').first().click();
      await page.locator('.menu-presets [data-preset=fancy]').click();
      await expect(page.locator('.menu-presets [data-preset=fancy]')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.menu-settings .menu-item').first()).toContainText('$40');
      await page.reload();
      await page.locator('.title-menu > .chat-button').first().click();
      await page.locator('.picker-daily').click();
      // Consultation: the menu button shows the numbered menu.
      await page.locator('.chat-menu-button').click();
      await expect(page.locator('.menu-sheet .menu-item')).toHaveCount(7);
      await expect(page.locator('.menu-sheet .menu-item').first()).toContainText('Signature manicure');
      await expect(page.locator('.menu-sheet .menu-item.ordered')).toHaveCount(0);
      expect(await noOverflow(page)).toBe(true);
      await page.locator('.menu-close').click();
      await page.locator('.chat-input').fill('Hello! Here is our menu. What would you like?');
      await page.locator('.chat-form button[type=submit]').click();
      await expect.poll(() => seen['client-turn']?.length ?? 0).toBe(1);
      const sent = seen['client-turn']![0] as { menu: { items: { name: { en: string }; price: number }[]; order: number[] } };
      expect(sent.menu.items[0]).toMatchObject({ name: { en: 'Signature manicure' }, price: 40 });
      expect(sent.menu.order).toEqual([1]);
      // Service: no menu button. Done → checkout: her order is marked, with the total.
      await expect(page.locator('.chat-menu-button')).toBeHidden();
      await page.locator('.station-done').click();
      await page.waitForSelector('.chat-panel:not(.service-mode) .chat-input', { timeout: 6_000 });
      await page.locator('.chat-menu-button').click();
      await expect(page.locator('.menu-sheet .menu-item.ordered')).toHaveCount(1);
      await expect(page.locator('.menu-order')).toContainText('$40');
      await page.locator('.menu-close').click();
      for (const line of ['That is forty dollars, please.', 'Thank you! See you next time.']) {
        if (await page.locator('.chat-results:not(.hidden)').count()) break;
        await page.locator('.chat-input').fill(line);
        await page.locator('.chat-form button[type=submit]').click();
        await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>('.chat-form button[type=submit]')?.disabled || document.querySelector('.chat-results:not(.hidden)'));
      }
      await toResults(page);
      await page.waitForSelector('.chat-results:not(.hidden) .payment-card', { timeout: 15_000 });
      await expect(page.locator('.payment-card .payment-bill-line')).toHaveCount(1);
      await expect(page.locator('.payment-card .payment-bill-line')).toContainText('#1');
      await expect(page.locator('.payment-bill-total')).toContainText('$40');
      // My own menu: change the first price, save; the save keeps it.
      await page.locator('.results-actions .chat-button.secondary').click();
      await page.locator('.title-menu-row').first().locator('button').first().click();
      await page.locator('.menu-presets [data-preset=custom]').click();
      const price = page.locator('.menu-edit-row').first().locator('input[type=number]');
      await price.fill('30');
      await page.locator('.menu-save').click();
      await expect(page.locator('.menu-presets [data-preset=custom]')).toHaveAttribute('aria-pressed', 'true');
      const save = await page.evaluate(() => JSON.parse(localStorage.getItem('salon.save') ?? '{}'));
      expect(save.menu.preset).toBe('custom');
      expect(save.menu.items[0].price).toBe(30);
      expect(await noOverflow(page)).toBe(true);
    });

    test('speech speed (story 045): Slow / Normal / Fast in Settings, remembered; her words appear slower on Slow than on Fast', async ({ browser }) => {
      test.setTimeout(90_000);
      const revealMs = async (speed: 'slow' | 'fast'): Promise<number> => {
        const context = await browser.newContext();
        await seed(context, lang, { save: { xp: 100, appointments: 3, badges: ['first-client'], ...dailyWith('ana') }, extra: { 'salon.speechSpeed': speed } });
        await mockApi(context, { phases: ['consultation'], replies: ['Hi!', 'Hello, I would love a classic red manicure today, with short round nails, please. Is that possible?'] });
        const page = await context.newPage();
        await page.goto('/');
        await page.locator('.title-menu > .chat-button').first().click();
        await page.locator('.picker-daily').click();
        await page.locator('.chat-input').fill('Hello! What would you like today?');
        await page.locator('.chat-form button[type=submit]').click();
        await page.waitForSelector('.chat-bubble.client.revealing');
        const ms = await page.evaluate(() => new Promise<number>((resolve) => {
          const t0 = performance.now();
          const check = () => (document.querySelector('.chat-bubble.client.revealing') ? requestAnimationFrame(check) : resolve(performance.now() - t0));
          check();
        }));
        await context.close();
        return ms;
      };
      expect(await revealMs('slow')).toBeGreaterThan(await revealMs('fast'));
      // Settings: the choice, remembered.
      const context = await browser.newContext();
      await seed(context, lang);
      await mockApi(context);
      const page = await context.newPage();
      await page.goto('/');
      await page.locator('.title-menu-row').first().locator('button').first().click();
      await expect(page.locator('.speed-choices [data-speed=normal]')).toHaveAttribute('aria-pressed', 'true');
      await page.locator('.speed-choices [data-speed=slow]').click();
      await page.reload();
      await page.locator('.title-menu-row').first().locator('button').first().click();
      await expect(page.locator('.speed-choices [data-speed=slow]')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.speed-choices button')).toHaveText(lang === 'vi' ? ['Chậm', 'Vừa', 'Nhanh'] : ['Slow', 'Normal', 'Fast']);
      expect(await noOverflow(page)).toBe(true);
      await context.close();
    });

    test('the companion reads her tips aloud (story 043): off by default; when on, opening a tip reads it in her voice', async ({ page }) => {
      // A stand-in speech engine with an English and a Vietnamese voice; it records what is said.
      await page.addInitScript(() => {
        const w = window as unknown as { __spoken: { text: string; lang: string; rate: number }[] };
        w.__spoken = [];
        class Utterance { text: string; lang = ''; rate = 1; pitch = 1; volume = 1; voice: unknown = null; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(text: string) { this.text = text; } }
        const synth = { getVoices: () => [{ name: 'Samantha', lang: 'en-US' }, { name: 'Linh', lang: 'vi-VN' }], speak: (u: Utterance) => { w.__spoken.push({ text: u.text, lang: u.lang, rate: u.rate }); setTimeout(() => u.onend?.(), 10); }, cancel: () => undefined, addEventListener: () => undefined, onvoiceschanged: null };
        Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
        Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true, writable: true });
      });
      await seed(page, lang, { save: { xp: 300, appointments: 10, badges: ['first-client'], ...dailyWith('ana') }, extra: { 'salon.companionVoice': 'on', 'salon.speechSpeed': 'fast' } });
      await mockApi(page, { correct: true, phases: ['consultation'], replies: ['Hi!', 'Hello! Pink, please.'] });
      await page.goto('/');
      await page.locator('.title-menu > .chat-button').first().click();
      await page.locator('.picker-daily').click();
      await page.locator('.chat-input').fill('What color you want today?');
      await page.locator('.chat-form button[type=submit]').click();
      await expect(page.locator('.mai-bubble.has-tip')).toBeVisible();
      const spokenBefore = await page.evaluate(() => (window as unknown as { __spoken: { text: string }[] }).__spoken.length);
      await page.locator('.mai-bubble').click();
      await expect.poll(() => page.evaluate(() => (window as unknown as { __spoken: { text: string }[] }).__spoken.length)).toBeGreaterThan(spokenBefore);
      const said = await page.evaluate(() => (window as unknown as { __spoken: { text: string; lang: string; rate: number }[] }).__spoken.at(-1)!);
      expect(said.text).toContain('Nice and friendly!');
      expect(said.lang).toBe(lang === 'vi' ? 'vi-VN' : 'en-US');
      // Settings: the switch is there and on; turned off, it stays off.
      await page.goto('/');
      await page.locator('.title-menu-row').first().locator('button').first().click();
      await expect(page.locator('.companion-voice-toggle')).toBeChecked();
      await page.locator('.companion-voice-toggle').uncheck();
      expect(await page.evaluate(() => localStorage.getItem('salon.companionVoice'))).toBe('off');
    });

    test('menu first (story 054): the salon menu is set up once before the first client; a price-board button on home; a cotton pad when cleaning', async ({ page }) => {
      await seed(page, lang, { menuConfirmed: false, save: { xp: 100, appointments: 3, badges: ['first-client'], ...dailyWith('ana') } });
      await mockApi(page);
      await page.goto('/');
      await page.locator('.title-menu > .chat-button').first().click();
      // The setup step: the companion's line, the numbered menu, Confirm.
      await expect(page.locator('.menu-setup-title')).toContainText(lang === 'vi' ? 'Làm bảng giá cho tiệm' : 'Set up your salon menu');
      await expect(page.locator('.menu-setup-title svg.price-board-icon')).toHaveCount(1);
      await expect(page.locator('.menu-setup-mai')).toContainText('Number 3');
      await page.locator('.menu-presets [data-preset=basic]').click();
      await expect(page.locator('.menu-setup .menu-item')).toHaveCount(7);
      expect(await noOverflow(page)).toBe(true);
      await page.locator('.menu-confirm').click();
      await expect(page.locator('.picker-daily')).toBeVisible();
      const save = await page.evaluate(() => JSON.parse(localStorage.getItem('salon.save') ?? '{}'));
      expect(save).toMatchObject({ menuConfirmed: true, menu: { preset: 'basic' } });
      // Only once: the next Start goes straight to the clients.
      await page.goto('/');
      await page.locator('.title-menu > .chat-button').first().click();
      await expect(page.locator('.picker-daily')).toBeVisible();
      await expect(page.locator('.menu-setup')).toHaveCount(0);
      // Home: the price-board button views and edits the menu any time.
      await page.goto('/');
      await expect(page.locator('.title-menu-board svg.price-board-icon')).toHaveCount(1);
      await page.locator('.title-menu-board').click();
      await expect(page.locator('.menu-setup .menu-presets [data-preset=basic]')).toHaveAttribute('aria-pressed', 'true');
      await page.locator('.menu-setup > .chat-button.secondary').click();
      // In the appointment: the menu button has the icon; Clean shows a cotton pad under the finger.
      await page.locator('.title-menu > .chat-button').first().click();
      await page.locator('.picker-daily').click();
      await expect(page.locator('.chat-menu-button svg.price-board-icon')).toHaveCount(1);
      await page.locator('.chat-input').fill('Hello! Please sit down.');
      await page.locator('.chat-form button[type=submit]').click();
      await page.locator('.station-controls .station-clean-mode').click();
      await page.locator('.station-touch').evaluate((node) => { const b = node.getBoundingClientRect(); node.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 9, clientX: b.left + b.width / 2, clientY: b.top + b.height / 2, buttons: 1 })); });
      await expect(page.locator('.station-brush.show[data-kind=pad]')).toHaveCount(1);
    });

    test('the companion\'s voice (story 055): Help me say it plays the line in her chosen voice; Settings picks a voice with a sample', async ({ page }) => {
      await seed(page, lang, { save: { xp: 100, appointments: 3, badges: ['first-client'], ...dailyWith('ana'), companionVoice: 'ava' } });
      const seen = await mockApi(page, { phases: ['consultation'] });
      await page.goto('/');
      await page.locator('.title-menu > .chat-button').first().click();
      await page.locator('.picker-daily').click();
      // Help me say it: ▶ Listen says the English line in the companion's chosen voice.
      await page.locator('.help-button').click();
      await page.locator('.help-input').fill('Chị muốn làm móng màu gì?');
      await page.locator('.help-sheet .chat-button').filter({ hasText: lang === 'vi' ? 'Dịch' : 'Translate' }).first().click();
      const listen = page.locator('.help-listen');
      await expect(listen).toHaveText(lang === 'vi' ? '▶ Nghe' : '▶ Listen');
      await listen.click();
      await expect.poll(() => seen['tts']?.length ?? 0).toBeGreaterThan(0);
      expect((seen['tts']![0] as { companion: unknown }).companion).toEqual({ gender: 'female', lang: 'en', voice: 'ava' });
      // Settings: 3 voices for her, the chosen one marked; another is picked and saved; ▶ plays a sample in it.
      await page.goto('/');
      await page.locator('.title-menu-row').first().locator('button').first().click();
      const choices = page.locator('.voice-pick-row .voice-choice-pick');
      await expect(choices).toHaveCount(3);
      await expect(page.locator('.voice-choice-pick[data-voice=ava]')).toHaveAttribute('aria-checked', 'true');
      await page.locator('.voice-choice-pick[data-voice=emma]').click();
      await expect(page.locator('.voice-choice-pick[data-voice=emma]')).toHaveAttribute('aria-checked', 'true');
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('salon.save') ?? '{}').companionVoice)).toBe('emma');
      const before = seen['tts']?.length ?? 0;
      await page.locator('.voice-choice-play[data-voice=emma]').click();
      await expect.poll(() => seen['tts']?.length ?? 0).toBeGreaterThan(before);
      expect((seen['tts']!.at(-1) as { companion: { voice: string; lang: string } }).companion).toMatchObject({ voice: 'emma', lang });
      expect(await noOverflow(page)).toBe(true);
    });

    test('come back every day (story 056, two currencies): the gift opens once into coins, tips stay; a finished appointment lights the streak; the shop shows Coming soon', async ({ page }) => {
      test.setTimeout(90_000);
      await seed(page, lang, { save: { wallet: 10, coins: 20, xp: 100, appointments: 1, badges: ['first-client'], ...dailyWith('ana') } });
      await mockApi(page);
      await page.goto('/');
      // Home: the streak is 0 (not lit), 20 coins, tips $10, the gift waiting.
      await expect(page.locator('.home-streak strong')).toHaveText('0');
      await expect(page.locator('.home-streak')).not.toHaveClass(/lit/);
      await expect(page.locator('.home-wallet')).toContainText('$10');
      await expect(page.locator('.home-coins strong')).toHaveText('20');
      await page.locator('.home-gift.ready').click();
      await expect(page.locator('.gift-sheet .gift-amount')).toHaveText(/^\+\d+$/);
      await expect(page.locator('.gift-sheet .gift-amount svg.coin-icon')).toHaveCount(1);
      await page.locator('.gift-collect').click();
      const after = await page.evaluate(() => JSON.parse(localStorage.getItem('salon.save') ?? '{}'));
      expect(after.wallet).toBe(10);
      expect(after.coins).toBeGreaterThanOrEqual(30);
      await expect(page.locator('.home-coins strong')).toHaveText(String(after.coins));
      await expect(page.locator('.home-wallet')).toContainText('$10');
      await expect(page.locator('.home-gift')).toBeDisabled();
      // Once a day: after a reload it is still opened.
      await page.reload();
      await expect(page.locator('.home-gift')).toBeDisabled();
      expect(await noOverflow(page)).toBe(true);
      // A finished appointment: the streak is 1 and lit.
      await playToResults(page);
      await page.locator('.results-actions .chat-button.secondary').click();
      await expect(page.locator('.home-streak.lit strong')).toHaveText('1');
      // The shop: four locked "Coming soon" tiles.
      await page.locator('.title-menu-row').nth(1).locator('button').first().click();
      await expect(page.locator('.shop-soon-tile')).toHaveCount(4);
      await expect(page.locator('.shop-soon-tile').first()).toContainText(lang === 'vi' ? 'Sắp có' : 'Soon');
    });

    test('results count up (story 057c): the rewards card comes first; a tap shows stars, XP, coins and tips; the streak moves 0 to 1', async ({ page }) => {
      test.setTimeout(120_000);
      await seed(page, lang, { save: { xp: 100, appointments: 3, badges: ['first-client'], ...dailyWith('ana') } });
      await mockApi(page);
      await page.goto('/');
      await page.locator('.title-menu > .chat-button').first().click();
      await page.locator('.path-node.current').click();
      await finishAppointment(page);
      const card = page.locator('.chat-results .results-rewards');
      await expect(card).toBeVisible();
      // First in the results, before the polaroid and the payment.
      expect(await page.locator('.chat-results :is(.results-rewards, .polaroid, .payment-card)').first().evaluate((n) => n.classList.contains('results-rewards'))).toBe(true);
      await card.click();
      await expect(card).toHaveClass(/done/);
      const save = await page.evaluate(() => JSON.parse(localStorage.getItem('salon.save') ?? '{}'));
      await expect(card.locator('.rewards-stars .rewards-value')).toHaveText(/^[1-5]\/5$/);
      await expect(card.locator('.rewards-xp .rewards-value')).toHaveText(`+${save.xp - 100}`);
      await expect(card.locator('.rewards-tips .rewards-value')).toHaveText(`+$${save.wallet}`);
      await expect(card.locator('.rewards-coins .rewards-value')).toHaveText(`+${save.coins ?? 0}`);
      await expect(card.locator('.rewards-streak.shown')).toHaveText(lang === 'vi' ? '🔥 Chuỗi 0 → 1 ngày!' : '🔥 Streak 0 → 1!');
      // The four tiles fit in one row at 320 px.
      const row = await card.locator('.rewards-tile').evaluateAll((tiles) => tiles.map((t) => t.getBoundingClientRect()).map((r) => ({ top: Math.round(r.top), right: r.right })));
      expect(new Set(row.map((r) => r.top)).size).toBe(1);
      expect(Math.max(...row.map((r) => r.right))).toBeLessThanOrEqual(320);
    });

    test('juice (story 057b): a perfect line pops with confetti, the appointment bar fills to the end, the gift bursts coins, the compact language switch leaves a gap', async ({ page }) => {
      test.setTimeout(120_000);
      await seed(page, lang, { save: { xp: 100, appointments: 3, coins: 20, badges: ['first-client'], ...dailyWith('ana') } });
      await mockApi(page);
      await page.goto('/');
      // The account button keeps a clear gap before EN | VI at 320 px.
      const gap = await page.evaluate(() => document.querySelector('.language-toggle')!.getBoundingClientRect().left - document.querySelector('.home-avatar')!.getBoundingClientRect().right);
      expect(gap).toBeGreaterThanOrEqual(6);
      // The gift: coins burst out as they are collected.
      await page.locator('.home-gift.ready').click({ force: true });
      await page.locator('.gift-collect').click();
      await expect(page.locator('.burst-coins .burst-piece').first()).toBeAttached();
      await expect(page.locator('.burst')).toHaveCount(0, { timeout: 3000 });
      // An appointment: the bar starts low; a good line → "Perfect line!" with confetti; full at the end.
      await page.locator('.title-menu > .chat-button').first().click();
      await page.locator('.path-node.current').click();
      await page.waitForSelector('.chat-input');
      expect(Number(await page.locator('.chat-progress').getAttribute('aria-valuenow'))).toBeLessThan(34);
      await page.locator('.chat-input').fill('Hello! Welcome to our salon. Please have a seat.');
      await page.locator('.chat-form button[type=submit]').click();
      await expect(page.locator('.perfect-line')).toBeVisible();
      await expect(page.locator('.perfect-line')).toContainText(lang === 'vi' ? 'Câu chuẩn luôn!' : 'Perfect line!');
      await expect(page.locator('.burst-confetti')).toBeAttached();
      await expect.poll(async () => Number(await page.locator('.chat-progress').getAttribute('aria-valuenow'))).toBeGreaterThan(0);
      // The service moves on at the station; Done brings the chat back.
      await page.waitForSelector('.chat-panel.service-mode');
      await page.locator('.station-done').click();
      await finishAppointment(page, ['Which colour would you like today?', 'Your nails are done. That is twenty-five dollars.', 'Thank you! See you next time.']);
      await expect(page.locator('.chat-progress')).toHaveAttribute('aria-valuenow', '100');
    });

    test('the salon path (story 057a): a top bar with streak, level and the goal ring; the current node seats its client; a lesson node; one home bar', async ({ page }) => {
      test.setTimeout(120_000);
      const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
      const streak = { streak: 3, best: 3, lastDay: yesterday, freezes: 0, freezeWeek: '', giftDay: '', milestones: [3], dayCount: 0 };
      await seed(page, lang, { save: { xp: 100, appointments: 3, badges: ['first-client'], play: streak, ...dailyWith('ana') } });
      await mockApi(page);
      await page.goto('/');
      // Home: streak, coins, tips and the account button in one bar that overlaps nothing.
      const bar = await page.evaluate(() => {
        const b = document.querySelector('.home-status')!.getBoundingClientRect();
        const toggle = document.querySelector('.language-toggle')!.getBoundingClientRect();
        const kids = [...document.querySelectorAll('.home-status > *')].map((n) => n.getBoundingClientRect());
        return { oneRow: kids.every((k) => Math.abs(k.top - kids[0]!.top) < 4), clearOfToggle: b.right <= toggle.left, inside: kids.every((k) => k.right <= b.right + 1) };
      });
      expect(bar).toEqual({ oneRow: true, clearOfToggle: true, inside: true });
      await expect(page.locator('.home-status > *')).toHaveCount(4);
      // Start → the path: the bar, today's challenge, the day's nodes.
      await page.locator('.title-menu > .chat-button').first().click();
      await expect(page.locator('.path-bar .path-level')).toContainText(lang === 'vi' ? 'Cấp' : 'Level');
      await expect(page.locator('.path-goal-count')).toHaveText('0/3');
      await expect(page.locator('.path-screen .picker-daily')).toBeVisible();
      // 057a part 2: with a 3-day streak, today's challenge says keep it (never "start a streak").
      await expect(page.locator('.path-screen .picker-daily .picker-line')).toHaveText(lang === 'vi' ? 'Làm xong khách hôm nay để giữ chuỗi 3 ngày.' : "Finish today's client to keep your 3-day streak.");
      await expect(page.locator('.path-node.current')).toHaveCount(1);
      await expect(page.locator('.path-node.current')).toHaveAttribute('data-index', '0');
      await expect(page.locator('.path-node.locked').first()).toBeDisabled();
      expect(await noOverflow(page)).toBe(true);
      // The current node: an appointment with its client, played to the results; Next client → back on the path.
      await page.locator('.path-node.current').click();
      await finishAppointment(page);
      await page.locator('.results-actions .chat-button').first().click();
      await expect(page.locator('.path-node.done[data-index="0"]')).toHaveCount(1);
      await expect(page.locator('.path-node.current')).toHaveAttribute('data-index', '1');
      await expect(page.locator('.path-goal-count')).toHaveText('1/3');
      // A lesson node: three phrases, Listen, "I've got it" → the node is done and a little XP.
      await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('salon.save') ?? '{}'); s.pathDone = 2; localStorage.setItem('salon.save', JSON.stringify(s)); });
      await page.reload();
      await page.locator('.title-menu > .chat-button').first().click();
      const xpBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('salon.save') ?? '{}').xp);
      await page.locator('.path-node.current.lesson').click();
      await expect(page.locator('.lesson-phrase')).toHaveCount(3);
      await expect(page.locator('.lesson-phrase .lesson-en').first()).not.toBeEmpty();
      await page.locator('.lesson-done').click();
      await expect(page.locator('.path-node.done[data-index="2"]')).toHaveCount(1);
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('salon.save') ?? '{}').xp)).toBe(xpBefore + 5);
      // Other clients: the full picker, and Back returns to the path.
      await page.locator('.path-more').click();
      await expect(page.locator('.client-picker')).toBeVisible();
    });

    test('a fix asked mid-service (story 048): her reply asks to fix the edge; Fix it shows with Clean up ready; one clean-up stroke fixes it', async ({ page }) => {
      await seed(page, lang, { save: { xp: 300, appointments: 10, badges: ['first-client'], ...dailyWith('lily', 'party-tonight') } });
      await mockApi(page, { replies: ['Hi!', 'Red, please. Oh, can you fix that edge? There is polish on my skin.'] });
      await page.goto('/');
      await page.locator('.title-menu > .chat-button').first().click();
      await page.locator('.picker-daily').click();
      await page.locator('.chat-input').fill('Hello! What colour would you like?');
      await page.locator('.chat-form button[type=submit]').click();
      const fix = page.locator('.station-controls .station-fix');
      await expect(fix).toBeVisible();
      await expect(page.locator('.station-row .station-tool[aria-pressed=true] .tab-text')).toHaveText(lang === 'vi' ? 'Chà' : 'Rub');
      await expect(page.locator('.station-remove-all')).toBeVisible();
      await paintEverything(page);
      await expect(page.locator('.service-say')).toContainText(/much better|edge looks clean/, { timeout: 5_000 });
      await expect(fix).toHaveCount(0);
      // Clean up is back in its place in the row.
      await expect(page.locator('.station-controls .station-tool .tab-text')).toHaveText(lang === 'vi' ? 'Lau' : 'Clean');
    });

    test('every line graded (story 061): a line with a real fix is Try this, a short line is Good, a fine long line is Perfect (only Perfect has confetti)', async ({ page }) => {
      test.setTimeout(90_000);
      await seed(page, lang, { save: { xp: 300, appointments: 10, badges: ['first-client'], ...dailyWith('lily') } });
      // The check finds a fix on every line (its better line shares few words with these).
      await mockApi(page, { correct: true, phases: ['consultation', 'consultation', 'consultation', 'service'] });
      await page.goto('/');
      await page.locator('.title-menu > .chat-button').first().click();
      await page.locator('.path-screen .picker-daily').click();
      const send = async (line: string) => {
        await page.locator('.chat-input').fill(line);
        await page.locator('.chat-form button[type=submit]').click();
      };
      await send('Hello! Please have a seat here.');
      await expect(page.locator('.line-grade.grade-try')).toHaveText(lang === 'vi' ? 'Thử câu này 💡' : 'Try this 💡');
      await expect(page.locator('.burst-confetti')).toHaveCount(0);
      await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>('.chat-form button[type=submit]')?.disabled);
      await send('Okay!');
      await expect(page.locator('.line-grade.grade-good')).toHaveText(lang === 'vi' ? 'Được đó 👍' : 'Good 👍');
      await expect(page.locator('.burst-confetti')).toHaveCount(0);
    });

    test('focus mode (story 060): 📋 sits in the mood row, off her face; while painting her line pops and stays until read (✕ or tap to reply); the chat is a slim bar', async ({ page }) => {
      test.setTimeout(90_000);
      await seed(page, lang, { save: { xp: 300, appointments: 10, badges: ['first-client'], ...dailyWith('lily') } });
      await mockApi(page, { replies: ['Hi!', 'Coral, please. Do you have any plans for the weekend?', 'Lovely, thank you!'] });
      await page.goto('/');
      await page.locator('.title-menu > .chat-button').first().click();
      await page.locator('.path-screen .picker-daily').click();
      // Consultation: the menu button is a small icon in the mood row, above the portraits (never over her face).
      const menu = page.locator('.mood .chat-menu-button');
      await expect(menu).toBeVisible();
      const apart = await page.evaluate(() => document.querySelector('.mood .chat-menu-button')!.getBoundingClientRect().bottom <= document.querySelector('.portrait-zone')!.getBoundingClientRect().top + 1);
      expect(apart).toBe(true);
      // The service: her line pops with ✕; the slim bar shows an unread dot.
      await page.locator('.chat-input').fill('Hello! What colour would you like?');
      await page.locator('.chat-form button[type=submit]').click();
      await page.waitForSelector('.chat-panel.service-mode');
      await expect(page.locator('.service-say')).toHaveText('Coral, please. Do you have any plans for the weekend?');
      await expect(page.locator('.service-dismiss')).toBeVisible();
      const bar = page.locator('.focus-bar .reply-chip');
      await expect(bar).toBeVisible();
      await expect(bar).toHaveClass(/unread/);
      await expect(page.locator('.chat-panel.service-mode .chat-form')).toBeHidden();
      // The bar has its own space: clear of the station's buttons (060 review: it sat on the bottom row).
      const clearance = () => page.evaluate(() => document.querySelector('.focus-bar .reply-chip')!.getBoundingClientRect().top - Math.max(...[...document.querySelectorAll('.station-tools button')].map((b) => b.getBoundingClientRect().bottom)));
      expect(await clearance()).toBeGreaterThanOrEqual(10);
      // ✕: the bubble goes, the dot goes; the bar stays.
      await page.locator('.service-dismiss').click();
      await expect(page.locator('.service-say')).toBeHidden();
      await expect(bar).not.toHaveClass(/unread/);
      await expect(bar).toBeVisible();
      // The bar opens the reply sheet; replying brings back the nails.
      await bar.click();
      await expect(page.locator('.chat-panel.reply-open')).toHaveCount(1);
      await page.locator('.reply-sheet .chat-input').fill('I am going to the beach!');
      await page.locator('.reply-sheet .chat-form button[type=submit]').click();
      await expect(page.locator('.chat-panel.reply-open')).toHaveCount(0);
      await expect(page.locator('.service-say')).toHaveText('Lovely, thank you!');
      // Tapping her bubble opens the reply sheet too (and marks it read).
      await page.locator('.service-say').click();
      await expect(page.locator('.chat-panel.reply-open')).toHaveCount(1);
      await expect(bar).not.toHaveClass(/unread/);
    });

    test('the agreed price (story 059): a discount agreed in the chat fills the Total step; the receipt shows the discount; she pays the agreed price', async ({ page }) => {
      test.setTimeout(120_000);
      await seed(page, lang, { save: { xp: 300, appointments: 10, badges: ['first-client'], ...dailyWith('ana') } });
      // She accepts $20 for today in her first reply.
      await mockApi(page, { agreedTotal: { fromTurn: 0, dollars: 20 } });
      await page.goto('/');
      await page.locator('.title-menu > .chat-button').first().click();
      await page.locator('.path-node.current').click();
      await finishAppointment(page, ['Hello! Today I can do it for twenty dollars instead of the menu price. Okay?', 'Which colour would you like today?', 'Your nails are done. That is twenty dollars, as we agreed.', 'Thank you! See you next time.'], { stopAtTotal: true });
      // The Total step: the menu price, the agreed price pre-filled, the discount.
      const step = page.locator('.chat-results .total-step');
      await expect(step.locator('.total-agreed')).toContainText('$20');
      await expect(step.locator('.total-amount')).toHaveValue('20');
      const menu = Number(((await step.locator('.total-menu span').last().textContent()) ?? '').replace(/[^0-9]/g, ''));
      expect(menu).toBeGreaterThan(20);
      await expect(step.locator('.total-discount')).toContainText(`${menu - 20}`);
      // − and + move the total; the menu-price chip resets it; back to the agreed price and charge.
      await step.locator('.total-plus').click();
      await expect(step.locator('.total-amount')).toHaveValue('21');
      await step.locator('.total-chip-menu').click();
      await expect(step.locator('.total-amount')).toHaveValue(String(menu));
      await step.locator('.total-amount').fill('20');
      await step.locator('.total-amount').blur();
      await expect(step.locator('.total-charge')).toContainText('$20');
      await step.locator('.total-charge').click();
      // The receipt: the discount line and the $20 she pays; her reaction.
      const card = page.locator('.payment-card.done');
      await expect(card).toBeVisible({ timeout: 10_000 });
      await expect(card.locator('.payment-discount')).toContainText(`${menu - 20}`);
      await expect(card.locator('.payment-bill-total')).toContainText('$20');
      await expect(page.locator('.results-note.charge-agreed')).toBeVisible();
    });

    test('Fix it after Done (story 058): her checkout complaint shows Fix it; the station reopens on the Fix it step; Done → her thanks → payment', async ({ page }) => {
      test.setTimeout(120_000);
      // The owner's playtest: Grace at checkout, after a normal Done.
      const complaint = 'Oh wait, there is some polish on my skin near one nail… and it is a bit more red than coral.';
      await seed(page, lang, { save: { xp: 300, appointments: 10, badges: ['first-client'], ...dailyWith('lily') } });
      await mockApi(page, { replies: ['Hi!', 'Coral, please.', complaint, 'Thank you so much, see you next time!'] });
      await page.goto('/');
      await page.locator('.title-menu > .chat-button').first().click();
      await page.locator('.path-screen .picker-daily').click();
      await page.locator('.chat-input').fill('Hello! What colour would you like?');
      await page.locator('.chat-form button[type=submit]').click();
      await page.waitForSelector('.chat-panel.service-mode');
      await page.locator('.station-swatch').nth(3).click();
      await paintEverything(page);
      await page.locator('.station-done').click();
      await expect(page.locator('.chat-panel.service-mode')).toHaveCount(0, { timeout: 6_000 });
      // Checkout: she complains after the Done; no Fix it before that.
      await expect(page.locator('.fix-now')).toBeHidden();
      await page.locator('.chat-input').fill('Your nails are done. That is forty dollars.');
      await page.locator('.chat-form button[type=submit]').click();
      await expect(page.locator('.chat-log')).toContainText('polish on my skin');
      const fixNow = page.locator('.fix-now');
      await expect(fixNow).toBeVisible();
      await expect(fixNow).toContainText(lang === 'vi' ? 'Sửa lại' : 'Fix it');
      // Fix it → the station on the Fix it step; clean the skin and change the colour; Done.
      await fixNow.click();
      await expect(page.locator('.chat-panel.service-mode')).toHaveCount(1);
      await expect(page.locator('.station-controls .station-fix')).toBeVisible();
      // 060 review: the reply bar keeps clear of the Fix it step's buttons too.
      expect(await page.evaluate(() => document.querySelector('.focus-bar .reply-chip')!.getBoundingClientRect().top - Math.max(...[...document.querySelectorAll('.station-tools button')].map((b) => b.getBoundingClientRect().bottom)))).toBeGreaterThanOrEqual(10);
      await page.locator('.station-swatch').nth(1).click();
      await paintEverything(page);
      // Then rub the polish off her skin.
      await page.locator('.station-row .station-tool').first().click();
      await paintEverything(page);
      await page.locator('.station-done').click();
      // Back at checkout: her thanks (no Fix it now), then the payment.
      await expect(page.locator('.chat-panel.service-mode')).toHaveCount(0, { timeout: 6_000 });
      await expect(page.locator('.chat-log')).toContainText(/much better|edge looks clean|love this one|colour is perfect/);
      await expect(fixNow).toBeHidden();
      await page.locator('.chat-input').fill('Thank you! See you next time.');
      await page.locator('.chat-form button[type=submit]').click();
      await toResults(page);
      await expect(page.locator('.results-fix.good').first()).toBeVisible();
    });

    test('a fix left open (story 048): Done again without fixing: her reaction, and the results and the companion say so', async ({ page }) => {
      test.setTimeout(90_000);
      await seed(page, lang, { save: { xp: 300, appointments: 10, badges: ['first-client'], ...dailyWith('kim', 'colour-redo') } });
      await mockApi(page);
      await page.goto('/');
      await page.locator('.title-menu > .chat-button').first().click();
      await page.locator('.picker-daily').click();
      await page.locator('.chat-input').fill('Hello! Let me start.');
      await page.locator('.chat-form button[type=submit]').click();
      const done = page.locator('.station-done');
      await page.locator('.station-swatch').nth(3).click();
      await done.click();
      await expect(page.locator('.station-controls .station-fix')).toBeVisible();
      await done.click();
      await expect(page.locator('.chat-panel.service-mode')).toHaveCount(0, { timeout: 5_000 });
      await expect(page.locator('.chat-log')).toContainText(/old colour|different colour/);
      for (const line of ['That is twenty-five dollars, please.', 'Thank you! See you next time.']) {
        if (await page.locator('.chat-results:not(.hidden)').count()) break;
        await page.locator('.chat-input').fill(line);
        await page.locator('.chat-form button[type=submit]').click();
        await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>('.chat-form button[type=submit]')?.disabled || document.querySelector('.chat-results:not(.hidden)'));
      }
      await toResults(page);
      await expect(page.locator('.results-fix.bad')).toHaveCount(1);
      // The companion's cheer and the come-back line say it kindly (overseer, on 048).
      await expect(page.locator('.payment-cheer')).toContainText(lang === 'vi' ? 'sửa trước' : 'fix what the client asks');
      await expect(page.locator('.results-note').filter({ hasText: lang === 'vi' ? 'có thể quay lại' : 'might come back' })).toHaveCount(1);
      await expect(page.locator('.bestie-fix.bad')).toHaveCount(1);
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
      // Story 047: the bottom row: every button shows a word, at least 8 px apart, all inside the screen.
      const row = await page.locator('.station-controls').evaluate((controls) => {
        const buttons = [...controls.querySelectorAll<HTMLElement>('button')].filter((b) => b.offsetParent !== null);
        const boxes = buttons.map((b) => b.getBoundingClientRect()).sort((a, b) => a.left - b.left);
        const gaps = boxes.slice(1).map((b, i) => b.left - boxes[i]!.right);
        return { words: buttons.map((b) => b.querySelector('.tab-text')?.textContent?.trim() ?? ''), minGap: Math.min(...gaps), inside: boxes.every((b) => b.left >= 0 && b.right <= window.innerWidth), minHeight: Math.min(...boxes.map((b) => b.height)) };
      });
      expect(row.words.every((w) => w.length > 0)).toBe(true);
      expect(row.minGap).toBeGreaterThanOrEqual(8);
      expect(row.inside).toBe(true);
      expect(row.minHeight).toBeGreaterThanOrEqual(44);
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

    test('her longest line is readable in full on the service screen, and the order is never cut', async ({ page }) => {
      const longest = Object.values(serviceTalk.lines).flat().sort((a, b) => b.length - a.length)[0]!;
      await seed(page, lang, { save: { xp: 300, appointments: 10, badges: ['first-client'], ...dailyWith('lily', 'party-tonight') } });
      await mockApi(page, { replies: ['Hi!', longest] });
      await page.goto('/');
      await page.locator('.title-menu > .chat-button').first().click();
      await page.locator('.picker-daily').click();
      await page.locator('.chat-input').fill('Hello! What colour would you like?');
      await page.locator('.chat-form button[type=submit]').click();
      await expect(page.locator('.service-say')).toHaveText(longest);
      const fits = (selector: string) => page.locator(selector).evaluate((node) => node.scrollHeight <= node.clientHeight + 1 && node.scrollWidth <= node.clientWidth + 1);
      expect(await fits('.service-say')).toBe(true);
      expect(await fits('.service-order')).toBe(true);
      // The hand is laid out below the block: no nail under her bubble or the order.
      const blockBottom = await page.locator('.service-top').evaluate((node) => node.getBoundingClientRect().bottom);
      const zoneBottom = await page.locator('.portrait-zone').evaluate((node) => node.getBoundingClientRect().bottom);
      expect(zoneBottom - blockBottom).toBeGreaterThan(150);
      expect(await noOverflow(page)).toBe(true);
    });

    test('a waiting tip stands out: a glow ring and a label by the companion, gone once opened', async ({ page }) => {
      await seed(page, lang, { save: { xp: 300, appointments: 10, badges: ['first-client'], ...dailyWith('ana') } });
      // The chat view (consultation): the client's face is large there, the label must stay off it.
      await mockApi(page, { correct: true, phases: ['consultation'], replies: ['Hi!', 'Hello! Pink, please.'] });
      await page.goto('/');
      await page.locator('.title-menu > .chat-button').first().click();
      await page.locator('.picker-daily').click();
      await page.locator('.chat-input').fill('What color you want today?');
      await page.locator('.chat-form button[type=submit]').click();
      await expect(page.locator('.mai-bubble.has-tip')).toBeVisible();
      await expect(page.locator('.mai-cue')).toHaveText(lang === 'vi' ? 'Chị có mẹo nè! 💡' : 'Tip for you! 💡');
      const inside = await page.locator('.mai-cue').evaluate((node) => { const r = node.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; });
      expect(inside).toBe(true);
      // The label never covers the client's face (her expression shows the mood).
      const touchesFace = await page.evaluate(() => {
        const zone = document.querySelector<HTMLElement>('.portrait-zone')!;
        const [x, y, w, h] = (zone.dataset.face ?? '0,0,0,0').split(',').map(Number) as [number, number, number, number];
        const z = zone.getBoundingClientRect();
        const c = document.querySelector('.mai-cue')!.getBoundingClientRect();
        return c.left < z.left + x + w && z.left + x < c.right && c.top < z.top + y + h && z.top + y < c.bottom;
      });
      expect(touchesFace).toBe(false);
      await page.locator('.mai-bubble').click();
      await expect(page.locator('.mai-cue')).toBeHidden();
      await expect(page.locator('.mai-bubble.has-tip')).toHaveCount(0);
    });

    test('speaking: the words wait so they can be fixed; tapping the box never sends; left alone they send', async ({ page }) => {
      // A stand-in microphone: it "hears" a slightly wrong line.
      await page.addInitScript(() => {
        class FakeRecognition {
          lang = ''; interimResults = false; continuous = false; maxAlternatives = 1;
          onresult: ((e: unknown) => void) | null = null; onerror: ((e: unknown) => void) | null = null; onend: (() => void) | null = null;
          start() {
            setTimeout(() => {
              const heard = (window as unknown as { __heard?: string }).__heard ?? 'Hello welcome to are salon';
              const result = Object.assign([{ transcript: heard }], { isFinal: true });
              this.onresult?.({ resultIndex: 0, results: [result] });
              this.onend?.();
            }, 50);
          }
          stop() {}
        }
        for (const name of ['SpeechRecognition', 'webkitSpeechRecognition']) Object.defineProperty(window, name, { value: FakeRecognition, configurable: true, writable: true });
      });
      await seed(page, lang, { save: { xp: 100, appointments: 3, badges: ['first-client'], ...dailyWith('ana') } });
      const seen = await mockApi(page, { phases: ['consultation'] });
      await page.goto('/');
      await page.locator('.title-menu > .chat-button').first().click();
      await page.locator('.picker-daily').click();
      const input = page.locator('.chat-input');
      const turns = () => seen['client-turn']?.length ?? 0;
      // 1. Tap the box during the countdown: nothing is sent, the words can be fixed, Send sends them.
      await page.locator('.mic-button').click();
      await expect(input).toHaveValue('Hello welcome to are salon');
      await expect(page.locator('.chat-form button[type=submit].counting')).toHaveCount(1);
      await expect(page.locator('.mic-button')).toContainText(lang === 'vi' ? 'Nói lại' : 'Again');
      await input.click();
      await expect(page.locator('.chat-form button[type=submit].counting')).toHaveCount(0);
      await page.waitForTimeout(3600);
      expect(turns()).toBe(0);
      await input.fill('Hello, welcome to our salon!');
      await page.locator('.chat-form button[type=submit]').click();
      await expect.poll(turns).toBe(1);
      expect((seen['client-turn']![0] as { transcript: { content: string }[] }).transcript.at(-1)!.content).toBe('Hello, welcome to our salon!');
      // 2. Left alone, the spoken words send by themselves after the countdown. Story 047: a long line shows whole while
      // it waits (the box grows), so it can be checked before it goes.
      const long = 'Hello and welcome to our salon, please sit down and pick a colour today';
      await page.evaluate((line) => ((window as unknown as { __heard?: string }).__heard = line), long);
      await expect(input).toBeEnabled();
      await page.locator('.mic-button').click();
      await expect(input).toHaveValue(long);
      await expect(page.locator('.chat-form button[type=submit].counting')).toHaveCount(1);
      const fit = await input.evaluate((box) => ({ scroll: box.scrollHeight, client: box.clientHeight, scrollW: box.scrollWidth, clientW: box.clientWidth, font: parseFloat(getComputedStyle(box).fontSize) }));
      expect(fit.scroll).toBeLessThanOrEqual(fit.client);
      expect(fit.scrollW).toBeLessThanOrEqual(fit.clientW);
      expect(fit.font).toBeGreaterThanOrEqual(16);
      await expect.poll(turns, { timeout: 6000 }).toBe(2);
      await expect(input).toHaveValue('');
      expect(await input.evaluate((box) => box.getBoundingClientRect().height)).toBeLessThan(60);
      await page.evaluate(() => delete (window as unknown as { __heard?: string }).__heard);
      // 3. With the setting off, the words always wait for Send.
      await page.evaluate(() => localStorage.setItem('salon.voiceAutoSend', 'off'));
      await expect(input).toBeEnabled();
      await page.locator('.mic-button').click();
      await expect(input).toHaveValue('Hello welcome to are salon');
      await expect(page.locator('.chat-form button[type=submit].counting')).toHaveCount(0);
      await page.waitForTimeout(3600);
      expect(turns()).toBe(2);
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
