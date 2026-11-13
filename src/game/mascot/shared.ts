import type { Equipped, MascotExpression } from './mascot';

/** Drawing helpers shared by the mascot skins (SVG markup in a 100x100 box). */

/** Eyes for an expression, centred at (cx ± dx, cy). */
export function eyes(expression: MascotExpression, cx: number, cy: number, dx: number, r: number): string {
  if (expression === 'happy' || expression === 'celebrating') {
    // Smiling eyes: upside-down arcs.
    return [-dx, dx].map((offset) => `<path d="M${cx + offset - r} ${cy + 1} Q${cx + offset} ${cy - r - 1} ${cx + offset + r} ${cy + 1}" fill="none" stroke="#3b2a33" stroke-width="2.6" stroke-linecap="round"/>`).join('');
  }
  const look = expression === 'thinking' ? -1.5 : 0;
  return [-dx, dx]
    .map((offset) => `<ellipse cx="${cx + offset}" cy="${cy}" rx="${r}" ry="${r * 1.15}" fill="#3b2a33"/><circle cx="${cx + offset + r * 0.35 + look}" cy="${cy - r * 0.45 + look}" r="${r * 0.42}" fill="#fff"/><circle cx="${cx + offset - r * 0.3}" cy="${cy + r * 0.4}" r="${r * 0.18}" fill="#fff"/>`)
    .join('');
}

/** Mouth for an expression at (cx, cy). */
export function mouth(expression: MascotExpression, cx: number, cy: number, w: number): string {
  switch (expression) {
    case 'talking':
      return `<ellipse cx="${cx}" cy="${cy + 1}" rx="${w * 0.45}" ry="${w * 0.42}" fill="#b5476a"/>`;
    case 'happy':
    case 'celebrating':
      return `<path d="M${cx - w} ${cy - 1} Q${cx} ${cy + w * 1.4} ${cx + w} ${cy - 1} Z" fill="#b5476a"/>`;
    case 'thinking':
      return `<path d="M${cx - w * 0.6} ${cy + 1} L${cx + w * 0.6} ${cy - 1}" stroke="#3b2a33" stroke-width="2.4" stroke-linecap="round"/>`;
    default:
      return `<path d="M${cx - w * 0.7} ${cy - 1} Q${cx} ${cy + w * 0.8} ${cx + w * 0.7} ${cy - 1}" fill="none" stroke="#3b2a33" stroke-width="2.4" stroke-linecap="round"/>`;
  }
}

export const blush = (cx: number, cy: number, dx: number): string =>
  [-dx, dx].map((offset) => `<ellipse cx="${cx + offset}" cy="${cy}" rx="5" ry="3" fill="#ff8fb1" opacity="0.6"/>`).join('');

/** Little extras that read at bubble size: a thought dot, sparkles, confetti. */
export function moodExtras(expression: MascotExpression): string {
  if (expression === 'thinking') return '<circle cx="86" cy="18" r="4" fill="#fff" stroke="#b98cf0" stroke-width="2"/><circle cx="93" cy="8" r="2.5" fill="#fff" stroke="#b98cf0" stroke-width="1.5"/>';
  if (expression === 'happy') return '<path d="M86 14 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" fill="#ffd54f"/>';
  if (expression === 'celebrating')
    return '<rect x="8" y="10" width="5" height="5" fill="#ff5c9a" transform="rotate(20 10 12)"/><rect x="84" y="8" width="5" height="5" fill="#7ad7c3" transform="rotate(-15 86 10)"/><circle cx="90" cy="30" r="3" fill="#ffd54f"/><circle cx="12" cy="32" r="3" fill="#b98cf0"/>';
  return '';
}

/**
 * Sample accessories every skin can draw at given anchor points. Skins pass their own anchors (where a head, face,
 * neck and hand are) so one accessory fits every mascot.
 */
export interface Anchors {
  head: [number, number];
  face: [number, number];
  neck: [number, number];
  hand: [number, number];
}

export function accessories(equipped: Equipped, anchors: Anchors): string {
  let out = '';
  if (equipped.head === 'bow-pink') {
    const [x, y] = anchors.head;
    out += `<path d="M${x} ${y} l-12 -7 v14 z M${x} ${y} l12 -7 v14 z" fill="#ff5c9a"/><circle cx="${x}" cy="${y}" r="3.5" fill="#ff8fb1"/>`;
  }
  if (equipped.face === 'glasses-round') {
    const [x, y] = anchors.face;
    out += `<circle cx="${x - 10}" cy="${y}" r="7" fill="none" stroke="#5b2d91" stroke-width="2"/><circle cx="${x + 10}" cy="${y}" r="7" fill="none" stroke="#5b2d91" stroke-width="2"/><path d="M${x - 3} ${y} h6" stroke="#5b2d91" stroke-width="2"/>`;
  }
  if (equipped.neck === 'scarf-mint') {
    const [x, y] = anchors.neck;
    out += `<path d="M${x - 16} ${y} Q${x} ${y + 7} ${x + 16} ${y} l0 5 Q${x} ${y + 12} ${x - 16} ${y + 5} z" fill="#7ad7c3"/><path d="M${x + 8} ${y + 6} l4 12 l6 -2 l-3 -11 z" fill="#5fc4ae"/>`;
  }
  // Story 028: áo dài-inspired placeholder (red, gold trim, a high mandarin collar) until the designer's art.
  if (equipped.outfit === 'ao-dai-red') {
    const [x, y] = anchors.neck;
    out += `<path d="M${x - 24} ${y + 16} Q${x - 22} ${y + 2} ${x - 9} ${y} L${x + 9} ${y} Q${x + 22} ${y + 2} ${x + 24} ${y + 16} z" fill="#d1141f"/><rect x="${x - 9}" y="${y - 5}" width="18" height="7" rx="2" fill="#d1141f" stroke="#f2c230" stroke-width="1.4"/><path d="M${x + 1} ${y + 2} Q${x + 10} ${y + 4} ${x + 12} ${y + 14}" stroke="#f2c230" stroke-width="1.4" fill="none"/><circle cx="${x + 6}" cy="${y + 8}" r="1.6" fill="#f2c230"/>`;
  }
  if (equipped.held === 'brush-gold') {
    const [x, y] = anchors.hand;
    out += `<path d="M${x} ${y} l10 -16" stroke="#e0b44a" stroke-width="3" stroke-linecap="round"/><path d="M${x + 9} ${y - 15} l4 -6 l3 2 l-3 6 z" fill="#ff5c9a"/>`;
  }
  return out;
}

/** Mai's nail polish from the `nails` slot: colour and glitter. `fallback` is the skin's own colour. */
export function nailPolish(equipped: Equipped, fallback: string): { color: string; glitter: boolean } {
  switch (equipped.nails) {
    case 'nails-pink':
      return { color: '#ff5c9a', glitter: false };
    case 'nails-mint':
      return { color: '#2ec4a6', glitter: false };
    case 'nails-gold-glitter':
      return { color: '#e0b44a', glitter: true };
    default:
      return { color: fallback, glitter: false };
  }
}

/** Tiny white sparkle dots for glitter polish at (x, y). */
export const glitterDots = (x: number, y: number): string =>
  `<circle cx="${x - 0.8}" cy="${y - 0.6}" r="0.55" fill="#fff"/><circle cx="${x + 0.7}" cy="${y + 0.5}" r="0.45" fill="#fff"/>`;
