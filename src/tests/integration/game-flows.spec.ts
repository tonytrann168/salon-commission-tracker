import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import serviceTalk from '../../game/config/service-talk.json' with { type: 'json' };
import { LANGS, dailyWith, mockApi, noOverflow, playToResults, seed } from './fixtures';

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
      await expect(page.locator('.station-row .station-tool[aria-pressed=true] .tab-text')).toHaveText(lang === 'vi' ? 'Lau' : 'Clean');
      await expect(page.locator('.station-remove-all')).toBeVisible();
      await paintEverything(page);
      await expect(page.locator('.service-say')).toContainText(/much better|edge looks clean/, { timeout: 5_000 });
      await expect(fix).toHaveCount(0);
      // Clean up is back in its place in the row.
      await expect(page.locator('.station-controls .station-tool .tab-text')).toHaveText(lang === 'vi' ? 'Lau' : 'Clean');
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
      await page.waitForSelector('.chat-results:not(.hidden) .results-section', { timeout: 15_000 });
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
