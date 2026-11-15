import { menuList } from './menu-list';
import { getLanguage, t } from '../i18n';
import { orderTotal } from '../menu';
import type { MenuItem, OrderLine } from '../menu';
import { el } from './dom';
import { priceBoardIcon } from './menu-icon';
import './menu-sheet.css';

/**
 * Story 044: the salon menu as a sheet: numbered items with their prices (the English name the client reads, and the
 * Vietnamese name under it). At checkout her order is marked and the total shown, so the player can ring it up.
 */

let open: HTMLElement | null = null;

export function openMenuSheet(menu: { items: MenuItem[]; order: OrderLine[] }, checkout: boolean, grammar: Record<string, string>): HTMLElement {
  open?.remove();
  const sheet = el('div', 'menu-sheet');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', t('menu.title'));
  const card = el('div', 'menu-card');
  const heading = el('h2', 'menu-heading');
  heading.innerHTML = priceBoardIcon(30);
  heading.append(t('menu.title'));
  card.append(heading);
  const ordered = new Set(checkout ? menu.order.map((line) => line.number) : []);
  // Story 063: the menu in its groups, with icons.
  card.append(menuList(menu.items, ordered, true));
  if (checkout && menu.order.length > 0) {
    const bill = el('p', 'menu-order');
    bill.append(el('span', '', t('menu.order', { ...grammar, numbers: menu.order.map((line) => `#${line.number}`).join(' + ') })), el('strong', '', t('menu.orderTotal', { dollars: orderTotal(menu.order) })));
    card.append(bill);
  }
  const close = el('button', 'chat-button menu-close', t('menu.close'));
  close.type = 'button';
  const shut = (): void => {
    sheet.remove();
    if (open === sheet) open = null;
  };
  close.addEventListener('click', shut);
  sheet.addEventListener('click', (event) => event.target === sheet && shut());
  sheet.addEventListener('keydown', (event) => event.key === 'Escape' && shut());
  card.append(close);
  sheet.append(card);
  document.body.append(sheet);
  open = sheet;
  close.focus({ preventScroll: true });
  return sheet;
}
