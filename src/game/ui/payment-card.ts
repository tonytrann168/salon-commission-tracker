import { prefersReducedMotion } from '../comfort';
import { t } from '../i18n';
import type { StringKey } from '../i18n';
import { PAYMENT_CONFIG, cheerFor } from '../payment';
import type { TipPart } from '../payment';
import { emitSound } from '../sound-events';
import { el } from './dom';
import './payment-card.css';

/**
 * Story 039: the payment moment at the top of the results. The client pays (the register rings up the service
 * price), the tip counts up part by part while coins and bills fly to the wallet, the stars appear one by one, and the
 * companion cheers. A tap skips to the totals; reduced motion shows the totals at once. `onDone` fires when the rest of
 * the results may show.
 */
export interface PaymentCardOptions {
  serviceLabel: string;
  price: number;
  parts: readonly TipPart[];
  tip: number;
  stars: number;
  walkedOut: boolean;
  onDone: () => void;
}

export function createPaymentCard(options: PaymentCardOptions): HTMLElement {
  const timing = PAYMENT_CONFIG.timing;
  const card = el('section', 'payment-card');
  card.setAttribute('aria-live', 'polite');

  const priceRow = el('p', 'payment-price pay-wait');
  priceRow.append(el('span', '', `🧾 ${options.serviceLabel}`), el('strong', '', t('results.tipAmount', { dollars: options.price })));
  const partsList = el('ul', 'payment-parts');
  const partNodes = options.parts.map((part) => {
    const item = el('li', 'pay-wait');
    item.append(el('span', '', t(`payment.part.${part.kind}` as StringKey)), el('strong', '', `+${t('results.tipAmount', { dollars: part.dollars })}`));
    partsList.append(item);
    return item;
  });
  const tipRow = el('p', 'payment-tip results-tip');
  const tipAmount = el('strong', 'payment-tip-amount', t('results.tipAmount', { dollars: 0 }));
  const wallet = el('span', 'payment-wallet', '👛');
  wallet.setAttribute('aria-hidden', 'true');
  tipRow.append(wallet, el('span', '', `${t('results.tip')}: `), tipAmount);
  const stars = el('div', 'results-stars payment-stars');
  stars.setAttribute('role', 'img');
  stars.setAttribute('aria-label', t(options.stars === 1 ? 'results.starsOne' : 'results.starsMany', { count: options.stars }));
  const starNodes = Array.from({ length: 5 }, (_, i) => {
    const star = el('span', i < options.stars ? 'pay-wait' : 'payment-star-empty', i < options.stars ? '★' : '☆');
    stars.append(star);
    return star;
  });
  const cheer = el('p', 'payment-cheer bestie-bubble pay-wait', t(`payment.cheer.${cheerFor(options.stars, options.walkedOut)}` as StringKey));
  const skip = el('p', 'payment-skip', t('payment.skip'));
  card.append(...(options.walkedOut ? [] : [priceRow]), stars, partsList, tipRow, cheer, skip);

  const timers: number[] = [];
  let finished = false;
  const reveal = (node: HTMLElement): void => node.classList.remove('pay-wait');
  const setTip = (dollars: number): void => {
    tipAmount.textContent = t('results.tipAmount', { dollars });
  };
  const fly = (): void => {
    if (prefersReducedMotion()) return;
    for (let i = 0; i < 3; i++) {
      const coin = el('span', 'payment-coin', i % 2 === 0 ? '🪙' : '💵');
      coin.setAttribute('aria-hidden', 'true');
      coin.style.setProperty('--from-x', `${40 + i * 60}px`);
      coin.style.animationDelay = `${i * 70}ms`;
      card.append(coin);
      timers.push(window.setTimeout(() => coin.remove(), 900 + i * 70));
    }
  };
  const finish = (): void => {
    if (finished) return;
    finished = true;
    timers.forEach((id) => window.clearTimeout(id));
    card.querySelectorAll('.payment-coin').forEach((coin) => coin.remove());
    [priceRow, cheer, ...partNodes, ...starNodes].forEach(reveal);
    setTip(options.tip);
    skip.remove();
    card.classList.add('done');
    card.removeEventListener('click', finish);
    options.onDone();
  };

  if (prefersReducedMotion()) {
    // The totals at once; one sound each, as before.
    emitSound('stars');
    if (options.tip > 0) emitSound('tip');
    finish();
    return card;
  }
  card.addEventListener('click', finish);
  const at = (ms: number, run: () => void): void => void timers.push(window.setTimeout(() => !finished && run(), ms));
  if (!options.walkedOut) {
    at(timing.priceMs, () => {
      reveal(priceRow);
      emitSound('tip');
    });
  }
  let when = timing.firstPartMs;
  starNodes.slice(0, options.stars).forEach((star, i) => {
    at(when, () => {
      reveal(star);
      emitSound(i === options.stars - 1 ? 'stars' : 'moodUp');
    });
    when += timing.starGapMs;
  });
  let running = 0;
  options.parts.forEach((part, i) => {
    at(when, () => {
      reveal(partNodes[i] as HTMLElement);
      running += part.dollars;
      setTip(running);
      fly();
      emitSound('phraseSaved');
    });
    when += timing.partGapMs;
  });
  at(when + timing.cheerMs, () => reveal(cheer));
  at(when + timing.cheerMs + timing.holdMs, finish);
  return card;
}
