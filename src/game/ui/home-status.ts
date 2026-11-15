import { prefersReducedMotion } from '../comfort';
import { companionLook, companionName } from '../companion';
import { NEW_PLAY, giftReady, liveStreak, openDailyGift } from '../daily';
import { t } from '../i18n';
import { renderMascot } from '../mascot';
import type { ProgressSave } from '../progression';
import { emitSound } from '../sound-events';
import { burst as burstFrom, centreOf } from './burst';
import { coinIcon } from './coin-icon';
import { el } from './dom';
import './home-status.css';

/**
 * Story 056, 057a part 2: the home screen's ONE top bar: 🔥 streak · coins · $ tips · the account button; today's
 * free gift (a 🎁 that wiggles while it is waiting; opened once a day) floats just below it. Owner decision: two
 * currencies, both pretend money, nothing is sold: coins (gift, milestones, goal ring, level-ups) buy cosmetics, tips
 * (from clients only) buy salon upgrades.
 */
export interface HomeStatusOptions {
  load: () => ProgressSave;
  save: (save: ProgressSave) => void;
  today: string;
  rand?: () => number;
  /** The account button (only when this build has accounts): a guest's opens Sign in / Create account. */
  avatar?: () => { signedIn: boolean; initial: string; onClick: () => void };
}

/** Fired when the account's state changes (a remembered session restored, signed in or out): the bar redraws. */
export const ACCOUNT_EVENT = 'salon:account';

export function createHomeStatus(host: HTMLElement, options: HomeStatusOptions): HTMLElement {
  const wrap = el('div', 'home-top');
  const box = el('div', 'home-status');
  const giftSpot = el('div', 'home-gift-spot');
  wrap.append(box, giftSpot);
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
    const coins = el('div', 'home-chip home-coins');
    coins.setAttribute('role', 'img');
    coins.setAttribute('aria-label', t('daily.coinsLabel', { coins: save.coins ?? 0 }));
    coins.innerHTML = coinIcon(19);
    coins.append(el('strong', '', String(save.coins ?? 0)));
    const wallet = el('div', 'home-chip home-wallet');
    wallet.setAttribute('role', 'img');
    wallet.setAttribute('aria-label', t('daily.walletLabel', { dollars: save.wallet }));
    wallet.append(el('strong', '', `$${save.wallet}`));
    const chips: HTMLElement[] = [streak, coins, wallet];
    if (options.avatar) {
      const { signedIn, initial, onClick } = options.avatar();
      const avatar = el('button', signedIn ? 'home-avatar signed-in' : 'home-avatar');
      avatar.type = 'button';
      avatar.innerHTML = signedIn
        ? `<span class="home-avatar-initial"></span><span class="home-avatar-tick" aria-hidden="true">✓</span>`
        : `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8.5" r="4.2" fill="currentColor"/><path d="M3.8 21c.6-4.4 4-7 8.2-7s7.6 2.6 8.2 7z" fill="currentColor"/></svg>`;
      if (signedIn) (avatar.querySelector('.home-avatar-initial') as HTMLElement).textContent = initial;
      avatar.setAttribute('aria-label', t(signedIn ? 'account.yourAccount' : 'account.guestButton'));
      avatar.addEventListener('click', onClick);
      chips.push(avatar);
    }
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
      // Owner decision: the gift (and a milestone) gives coins; tips come only from clients.
      options.save({ ...now, play: result.play, coins: (now.coins ?? 0) + result.total });
      emitSound('tip');
      openGiftSheet(host, result.coins, result.bonus, result.milestone, result.total, draw);
    });
    box.replaceChildren(...chips);
    giftSpot.replaceChildren(gift);
    // 057a: one row that never spills: tighter chips, then the freeze hides, if the amounts are long.
    box.classList.remove('tight', 'tighter');
    requestAnimationFrame(() => {
      if (box.scrollWidth > box.clientWidth + 1) box.classList.add('tight');
      if (box.scrollWidth > box.clientWidth + 1) box.classList.add('tighter');
    });
  };
  draw();
  const redraw = (): void => {
    if (!wrap.isConnected) window.removeEventListener(ACCOUNT_EVENT, redraw);
    else draw();
  };
  window.addEventListener(ACCOUNT_EVENT, redraw);
  return wrap;
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
      const coin = el('span', 'gift-coin');
      coin.innerHTML = coinIcon(24);
      coin.style.setProperty('--a', `${i * 30}deg`);
      coin.style.animationDelay = `${i * 30}ms`;
      burst.append(coin);
    }
  }
  card.append(renderMascot('talking', 64, { crop: 'bust', ...companionLook() }), el('h2', '', t('daily.giftTitle')), giftAmount(coins));
  if (bonus > 0) card.append(el('p', 'gift-extra', t('daily.giftBonus', { coins: bonus })));
  if (milestone) card.append(el('p', 'gift-extra gift-milestone', t('daily.giftMilestone', { days: milestone.days, coins: milestone.gift })));
  card.append(el('p', 'gift-total', t('daily.giftTotal', { coins: total, name: companionName() })));
  const collect = el('button', 'chat-button gift-collect', t('daily.giftCollect'));
  collect.type = 'button';
  const close = (): void => {
    // Story 057b: the coins burst out as they are collected, with the coin sound.
    burstFrom(centreOf(collect), 'coins');
    emitSound('coin');
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


/** "+15" with the drawn coin (the amount is coins, never $). */
function giftAmount(coins: number): HTMLElement {
  const p = el('p', 'gift-amount');
  p.innerHTML = coinIcon(38);
  p.append(el('span', '', `+${coins}`));
  p.setAttribute('aria-label', t('daily.coinsGained', { coins }));
  return p;
}
