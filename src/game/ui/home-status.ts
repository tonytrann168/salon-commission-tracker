import { prefersReducedMotion } from '../comfort';
import { companionLook, companionName } from '../companion';
import { NEW_PLAY, giftReady, liveStreak, openDailyGift } from '../daily';
import { t } from '../i18n';
import { renderMascot } from '../mascot';
import type { ProgressSave } from '../progression';
import { emitSound } from '../sound-events';
import { el } from './dom';
import './home-status.css';

/**
 * Story 056: the home screen's top-left corner: the streak flame with its day count, the wallet, and today's free gift
 * (a 🎁 that wiggles while it is waiting; opened once a day). Pretend money only, nothing is sold.
 */
export interface HomeStatusOptions {
  load: () => ProgressSave;
  save: (save: ProgressSave) => void;
  today: string;
  rand?: () => number;
}

export function createHomeStatus(host: HTMLElement, options: HomeStatusOptions): HTMLElement {
  const box = el('div', 'home-status');
  const draw = (): void => {
    const save = options.load();
    const play = save.play ?? NEW_PLAY;
    const days = liveStreak(play, options.today);
    const streak = el('div', days > 0 ? 'home-chip home-streak lit' : 'home-chip home-streak');
    streak.setAttribute('role', 'img');
    streak.setAttribute('aria-label', t('daily.streakLabel', { days }));
    streak.append(el('span', 'home-chip-icon', '🔥'), el('strong', '', String(days)));
    if (play.freezes > 0) {
      const freeze = el('span', 'home-freeze', '❄️');
      freeze.setAttribute('aria-hidden', 'true');
      streak.append(freeze);
    }
    const wallet = el('div', 'home-chip home-wallet');
    wallet.setAttribute('role', 'img');
    wallet.setAttribute('aria-label', t('daily.walletLabel', { dollars: save.wallet }));
    wallet.append(el('span', 'home-chip-icon', '👛'), el('strong', '', `$${save.wallet}`));
    const ready = giftReady(play, options.today);
    const gift = el('button', ready ? 'home-gift ready' : 'home-gift');
    gift.type = 'button';
    gift.innerHTML = `<span class="home-gift-icon" aria-hidden="true">🎁</span><span class="home-gift-word"></span>`;
    (gift.querySelector('.home-gift-word') as HTMLElement).textContent = ready ? t('daily.giftOpen') : t('daily.giftDone');
    gift.disabled = !ready;
    gift.setAttribute('aria-label', ready ? t('daily.giftLabel') : t('daily.giftDoneLabel'));
    gift.addEventListener('click', () => {
      const now = options.load();
      const result = openDailyGift(now.play ?? NEW_PLAY, options.today, options.rand);
      if (!result) return;
      options.save({ ...now, play: result.play, wallet: now.wallet + result.total, tipsEarned: now.tipsEarned });
      emitSound('tip');
      openGiftSheet(host, result.coins, result.bonus, result.milestone, result.total, draw);
    });
    box.replaceChildren(streak, wallet, gift);
    // 057a: one row that never spills: drop the gift's word, then the freeze, if the wallet is long.
    box.classList.remove('tight', 'tighter');
    requestAnimationFrame(() => {
      if (box.scrollWidth > box.clientWidth + 1) box.classList.add('tight');
      if (box.scrollWidth > box.clientWidth + 1) box.classList.add('tighter');
    });
  };
  draw();
  return box;
}

/** The opened gift: the companion, the amount (and bonus or milestone), a Collect button. */
function openGiftSheet(host: HTMLElement, coins: number, bonus: number, milestone: { days: number; gift: number } | null, total: number, onClose: () => void): void {
  const sheet = el('div', 'gift-sheet');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', t('daily.giftTitle'));
  const card = el('div', 'gift-card');
  const burst = el('div', 'gift-burst');
  burst.setAttribute('aria-hidden', 'true');
  if (!prefersReducedMotion()) {
    for (let i = 0; i < 12; i++) {
      const coin = el('span', 'gift-coin', i % 3 === 0 ? '💵' : '🪙');
      coin.style.setProperty('--a', `${i * 30}deg`);
      coin.style.animationDelay = `${i * 30}ms`;
      burst.append(coin);
    }
  }
  card.append(renderMascot('talking', 64, { crop: 'bust', ...companionLook() }), el('h2', '', t('daily.giftTitle')), el('p', 'gift-amount', `+$${coins}`));
  if (bonus > 0) card.append(el('p', 'gift-extra', t('daily.giftBonus', { dollars: bonus })));
  if (milestone) card.append(el('p', 'gift-extra gift-milestone', t('daily.giftMilestone', { days: milestone.days, dollars: milestone.gift })));
  card.append(el('p', 'gift-total', t('daily.giftTotal', { dollars: total, name: companionName() })));
  const collect = el('button', 'chat-button gift-collect', t('daily.giftCollect'));
  collect.type = 'button';
  const close = (): void => {
    sheet.remove();
    onClose();
  };
  collect.addEventListener('click', close);
  card.append(collect);
  // 056 fix: the coins fly out from BEHIND the card (only around its edges), never over its words or Collect.
  sheet.append(burst, card);
  host.append(sheet);
  collect.focus({ preventScroll: true });
}

