import { t } from '../i18n';
import { el } from './dom';

/**
 * Story 049: the station's "?" — how to do a set in three pictures (drawn from code, no image files): pick her shape
 * and colour, paint each nail with a finger, clean the skin and tap Done. A sheet over the station; one Close button.
 */

const NAIL = 'M30 92 V48 A20 20 0 0 1 70 48 V92 Z';
const FINGER = 'M22 120 V52 A28 28 0 0 1 78 52 V120 Z';

const PICTURES: [string, string][] = [
  [
    'pick',
    `<svg viewBox="0 0 160 120" aria-hidden="true">
      <path d="${FINGER}" fill="#f3c9a9" stroke="#c98f6d" stroke-width="2"/>
      <path d="${NAIL}" fill="#f7dad4" stroke="#5a2e43" stroke-width="2"/>
      <circle cx="112" cy="34" r="13" fill="#ff4f8b" stroke="#fff" stroke-width="3"/>
      <circle cx="112" cy="34" r="17" fill="none" stroke="#3b2a33" stroke-width="3"/>
      <circle cx="140" cy="34" r="12" fill="#d7263d" stroke="#fff" stroke-width="3"/>
      <circle cx="112" cy="72" r="12" fill="#f5c4d3" stroke="#fff" stroke-width="3"/>
      <circle cx="140" cy="72" r="12" fill="#b38cf2" stroke="#fff" stroke-width="3"/>
    </svg>`,
  ],
  [
    'paint',
    `<svg viewBox="0 0 160 120" aria-hidden="true">
      <path d="${FINGER}" fill="#f3c9a9" stroke="#c98f6d" stroke-width="2"/>
      <path d="${NAIL}" fill="#f7dad4" stroke="#5a2e43" stroke-width="2"/>
      <clipPath id="howto-nail"><path d="${NAIL}"/></clipPath>
      <rect x="28" y="60" width="44" height="34" fill="#ff4f8b" clip-path="url(#howto-nail)"/>
      <path d="M36 66 Q50 56 64 66" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.6"/>
      <path d="M96 96 Q104 60 82 40" fill="none" stroke="#ff4f8b" stroke-width="4" stroke-dasharray="6 6" stroke-linecap="round"/>
      <text x="104" y="112" font-size="34">☝️</text>
    </svg>`,
  ],
  [
    'clean',
    `<svg viewBox="0 0 160 120" aria-hidden="true">
      <path d="${FINGER}" fill="#f3c9a9" stroke="#c98f6d" stroke-width="2"/>
      <path d="${NAIL}" fill="#ff4f8b" stroke="#5a2e43" stroke-width="2"/>
      <circle cx="24" cy="70" r="4" fill="#ff4f8b"/><circle cx="20" cy="82" r="3" fill="#ff4f8b"/><circle cx="76" cy="58" r="3" fill="#ff4f8b" opacity="0.5"/>
      <text x="84" y="64" font-size="30">🧽</text>
      <circle cx="132" cy="92" r="18" fill="#2f9e5b"/>
      <path d="M123 92 L130 99 L142 85" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  ],
];

let open: HTMLElement | null = null;

export function openHowTo(host: HTMLElement = document.body): HTMLElement {
  open?.remove();
  const sheet = el('div', 'station-howto');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', t('station.howTitle'));
  const card = el('div', 'station-howto-card');
  const title = el('h2', '', t('station.howTitle'));
  const list = el('ol', 'station-howto-steps');
  PICTURES.forEach(([id, svg]) => {
    const item = el('li', 'station-howto-step');
    const picture = el('div', 'station-howto-picture');
    picture.innerHTML = svg;
    item.append(picture, el('p', '', t(`station.how.${id}` as 'station.how.pick')));
    list.append(item);
  });
  const close = el('button', 'chat-button station-howto-close', t('station.howClose'));
  close.type = 'button';
  const shut = (): void => {
    sheet.remove();
    if (open === sheet) open = null;
  };
  close.addEventListener('click', shut);
  sheet.addEventListener('click', (event) => {
    if (event.target === sheet) shut();
  });
  sheet.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') shut();
  });
  card.append(title, list, close);
  sheet.append(card);
  host.append(sheet);
  open = sheet;
  close.focus({ preventScroll: true });
  return sheet;
}
