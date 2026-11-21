import type { MenuTag } from '../menu';

/**
 * Story 063: a small drawn icon for each service on the salon menu (simple shapes in code; the designer's art can
 * replace them later). Built from code, never from player text.
 */
const SKIN = '#f6cfb4';
const LINE = '#8a5a4a';
/** A fingertip with a nail; `len` 1 = short, longer for enhancements. */
const finger = (nail: string, len = 1, extra = ''): string =>
  `<rect x="9" y="${10 - (len - 1) * 4}" width="14" height="${20 + (len - 1) * 4}" rx="7" fill="${SKIN}" stroke="${LINE}" stroke-width="1.2"/>` +
  `<path d="M11 ${17 - (len - 1) * 8} Q11 ${9 - (len - 1) * 8} 16 ${8 - (len - 1) * 8} Q21 ${9 - (len - 1) * 8} 21 ${17 - (len - 1) * 8} L21 19 Q16 21 11 19 Z" fill="${nail}" stroke="${LINE}" stroke-width="1"/>${extra}`;
/** A foot with toes. */
const foot = (nail: string, extra = ''): string =>
  `<path d="M7 28 Q5 16 10 11 Q16 7 22 10 Q27 13 26 21 Q25 28 18 29 Z" fill="${SKIN}" stroke="${LINE}" stroke-width="1.2"/>` +
  [10.5, 15, 19.5, 23.3].map((x, i) => `<circle cx="${x}" cy="${10.5 - (i === 0 ? 1 : 0) + i * 0.6}" r="${i === 0 ? 2.6 : 2}" fill="${nail}" stroke="${LINE}" stroke-width="0.8"/>`).join('') +
  extra;
const sparkle = (x: number, y: number, c = '#ffd23f'): string => `<path d="M${x} ${y - 3.5} L${x + 1} ${y - 1} L${x + 3.5} ${y} L${x + 1} ${y + 1} L${x} ${y + 3.5} L${x - 1} ${y + 1} L${x - 3.5} ${y} L${x - 1} ${y - 1} Z" fill="${c}"/>`;
const drop = (x: number, y: number, c = '#7fc8f8'): string => `<path d="M${x} ${y - 4} Q${x + 3.5} ${y + 0.5} ${x} ${y + 3} Q${x - 3.5} ${y + 0.5} ${x} ${y - 4} Z" fill="${c}"/>`;

const DRAW: Record<MenuTag, () => string> = {
  manicure: () => finger('#ff8ab5'),
  gel: () => finger('#ff5c9a', 1, '<path d="M13 11 Q14 10 15.5 10" stroke="#fff" stroke-width="1.6" stroke-linecap="round" fill="none"/>'),
  spa: () => finger('#ffb3cf', 1, drop(26, 9) + sparkle(6, 8)),
  fullSet: () => finger('#ff8ab5', 1, `<rect x="21" y="12" width="6" height="16" rx="3" fill="${SKIN}" stroke="${LINE}" stroke-width="1"/>`),
  pedicure: () => foot('#ff8ab5'),
  spaPedicure: () => foot('#ffb3cf', drop(27, 6)),
  jellyPedicure: () => foot('#c9a7f5', '<circle cx="26" cy="5" r="2" fill="#c9a7f5" opacity="0.8"/><circle cx="5" cy="7" r="1.5" fill="#c9a7f5" opacity="0.8"/>'),
  acrylic: () => finger('#ff5c9a', 2),
  fill: () => finger('#ffd1e3', 2, '<path d="M11 6 L21 6" stroke="#ff5c9a" stroke-width="2"/>'),
  dip: () => finger('#b48cf0', 1, '<rect x="22" y="20" width="8" height="9" rx="2" fill="#e6d9fb" stroke="#7a43c2" stroke-width="1"/>'),
  gelX: () => finger('#ff8ab5', 2, sparkle(26, 6, '#ff5c9a')),
  extensions: () => finger('#ff8ab5', 2),
  french: () => finger('#ffe4ee', 1, '<path d="M11.4 12.5 Q11 9 16 8 Q21 9 20.6 12.5 Q16 11 11.4 12.5 Z" fill="#fff" stroke="#8a5a4a" stroke-width="0.8"/>'),
  chrome: () => finger('url(#chrome)', 1, sparkle(26, 7, '#cfd8e3')),
  art: () => finger('#ffe0ea', 1, sparkle(16, 13, '#ff5c9a')),
  gems: () => finger('#ffe0ea', 1, '<path d="M16 10 L18 12.5 L16 15 L14 12.5 Z" fill="#7fd4f8" stroke="#3b8fb8" stroke-width="0.6"/>'),
  ombre: () => finger('url(#ombre)'),
  removal: () => finger('#f1dde6', 1, '<path d="M22 22 L29 29 M29 22 L22 29" stroke="#c0395d" stroke-width="2.2" stroke-linecap="round"/>'),
  paraffin: () => finger('#ff8ab5', 1, `<path d="M5 22 Q16 15 27 22 L27 30 L5 30 Z" fill="#fff3c9" stroke="#d9b54a" stroke-width="1" opacity="0.95"/>`),
  polishChange: () => `<rect x="11" y="13" width="10" height="16" rx="3" fill="#ff5c9a" stroke="${LINE}" stroke-width="1"/><rect x="13" y="5" width="6" height="8" rx="1.5" fill="#3b2a33"/><path d="M14 17 L14 25" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>`,
  other: () => sparkle(16, 16, '#ff5c9a'),
  gelToes: () => foot('#ff5c9a', '<path d="M9 9 Q10 8 11.5 8" stroke="#fff" stroke-width="1.2" stroke-linecap="round" fill="none"/>'),
  callus: () => foot('#f6cfb4', '<path d="M8 25 Q12 27 16 26" stroke="#c9a27e" stroke-width="2" stroke-linecap="round" fill="none"/>' + sparkle(25, 26, '#ffd23f')),
  hotStone: () => foot('#ffb3cf', '<ellipse cx="16" cy="21" rx="5" ry="2.6" fill="#5b5560"/><ellipse cx="16" cy="17.5" rx="3.6" ry="2" fill="#7a737f"/>' + '<path d="M24 6 Q25 4 24 2 M27 7 Q28 5 27 3" stroke="#ff8a5c" stroke-width="1.2" fill="none" stroke-linecap="round"/>'),
  comboClassic: () => `<g transform="translate(-4 -2) scale(0.62)">${finger('#ff8ab5')}</g><g transform="translate(12 12) scale(0.6)">${foot('#ff8ab5')}</g>`,
  comboGel: () => `<g transform="translate(-4 -2) scale(0.62)">${finger('#ff5c9a', 1, '<path d="M13 11 Q14 10 15.5 10" stroke="#fff" stroke-width="1.6" stroke-linecap="round" fill="none"/>')}</g><g transform="translate(12 12) scale(0.6)">${foot('#ffb3cf')}</g>`,
};

export function serviceIcon(tag: MenuTag, size = 28): string {
  return `<svg class="service-icon" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true" focusable="false"><defs><linearGradient id="chrome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f7fa"/><stop offset="0.5" stop-color="#aab6c4"/><stop offset="1" stop-color="#e9eef3"/></linearGradient><linearGradient id="ombre" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5c9a"/><stop offset="1" stop-color="#ffe0ea"/></linearGradient></defs>${DRAW[tag]()}</svg>`;
}
