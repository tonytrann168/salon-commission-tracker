import { CHARGE_CONFIG, clampCharge, expectedPrice } from '../charge';
import { t } from '../i18n';
import { el } from './dom';
import './payment-card.css';

/**
 * Story 059: the Total step at checkout, before the payment. The menu price (her order), pre-filled with the price
 * agreed in the chat if there was one; − / +, quick chips (−$5, −10%, Menu price) or type a number. A total under the
 * menu price shows "Discount −$5". Charge confirms it.
 */
export interface TotalStepOptions {
  menuPrice: number;
  agreed?: number;
  bill?: { number: number; label: string; price: number }[];
  onCharge: (charged: number) => void;
}

export function createTotalStep(options: TotalStepOptions): HTMLElement {
  const { menuPrice } = options;
  const card = el('section', 'total-step');
  card.setAttribute('aria-labelledby', 'total-title');
  const title = el('h2', 'total-title', `🧾 ${t('total.title')}`);
  title.id = 'total-title';
  card.append(title);
  for (const line of options.bill ?? []) {
    const row = el('p', 'payment-bill-line');
    row.append(el('span', '', `#${line.number} ${line.label}`), el('span', '', t('results.tipAmount', { dollars: line.price })));
    card.append(row);
  }
  const menuRow = el('p', 'payment-bill-line total-menu');
  menuRow.append(el('span', '', t('total.menuPrice')), el('span', '', t('results.tipAmount', { dollars: menuPrice })));
  card.append(menuRow);
  if (options.agreed !== undefined) card.append(el('p', 'total-agreed', t('total.agreed', { dollars: options.agreed })));

  let value = clampCharge(expectedPrice(menuPrice, options.agreed), menuPrice);
  const amount = el('input', 'total-amount');
  amount.type = 'number';
  amount.inputMode = 'numeric';
  amount.min = String(clampCharge(0, menuPrice));
  amount.max = String(menuPrice * 2);
  amount.setAttribute('aria-label', t('total.amountLabel'));
  const discount = el('p', 'total-discount');
  const charge = el('button', 'chat-button total-charge');
  charge.type = 'button';
  const draw = (): void => {
    amount.value = String(value);
    const off = menuPrice - value;
    discount.textContent = off > 0 ? t('total.discount', { dollars: off }) : off < 0 ? t('total.extra', { dollars: -off }) : '';
    discount.dataset.kind = off > 0 ? 'discount' : off < 0 ? 'extra' : '';
    charge.textContent = t('total.charge', { dollars: value });
  };
  const set = (next: number): void => {
    value = clampCharge(next, menuPrice);
    draw();
  };
  const stepper = el('div', 'total-stepper');
  const minus = el('button', 'chat-button secondary total-minus', '−');
  minus.type = 'button';
  minus.setAttribute('aria-label', t('total.less'));
  minus.addEventListener('click', () => set(value - 1));
  const plus = el('button', 'chat-button secondary total-plus', '+');
  plus.type = 'button';
  plus.setAttribute('aria-label', t('total.more'));
  plus.addEventListener('click', () => set(value + 1));
  const dollar = el('span', 'total-dollar', '$');
  stepper.append(minus, dollar, amount, plus);
  amount.addEventListener('change', () => set(Number(amount.value)));
  const chips = el('div', 'total-chips');
  const chip = (label: string, cls: string, next: () => number): void => {
    const b = el('button', `total-chip ${cls}`, label);
    b.type = 'button';
    b.addEventListener('click', () => set(next()));
    chips.append(b);
  };
  chip(`−$${CHARGE_CONFIG.chips.dollars}`, 'total-chip-dollars', () => value - CHARGE_CONFIG.chips.dollars);
  chip(`−${CHARGE_CONFIG.chips.percent}%`, 'total-chip-percent', () => Math.round(menuPrice * (1 - CHARGE_CONFIG.chips.percent / 100)));
  chip(t('total.reset'), 'total-chip-menu', () => menuPrice);
  charge.addEventListener('click', () => {
    set(Number(amount.value));
    charge.disabled = true;
    options.onCharge(value);
  });
  card.append(stepper, discount, chips, charge);
  draw();
  return card;
}
