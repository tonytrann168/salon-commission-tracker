import { prefersReducedMotion } from '../comfort';
import { el } from './dom';
import './polaroid.css';

/**
 * Story 050: the finished set as a big polaroid, the first thing on the results, with a celebration that fits how it
 * went: confetti for five stars, sparkles for four, a few hearts for three, and no fuss for a tough one (a kind
 * caption instead). Reduced motion: the photo and its caption, no effect.
 */

export type CelebrationBand = 'top' | 'good' | 'okay' | 'tough';

export interface PolaroidOptions {
  photo: string;
  caption: string;
  band: CelebrationBand;
  /** Text under the caption for a tough one ("Every set is practice"). */
  note?: string;
}

const CONFETTI = ['#ff5c9a', '#ffd23f', '#7ad3a8', '#b38cf2', '#ff8a5b'];

export function createPolaroid(options: PolaroidOptions): HTMLElement {
  const wrap = el('figure', `polaroid polaroid-${options.band}`);
  const frame = el('div', 'polaroid-frame');
  const img = el('img', 'polaroid-photo');
  img.src = options.photo;
  img.alt = options.caption;
  frame.append(img);
  const caption = el('figcaption', 'polaroid-caption', options.caption);
  wrap.append(frame, caption);
  if (options.note) wrap.append(el('p', 'polaroid-note', options.note));
  if (prefersReducedMotion() || options.band === 'tough') return wrap;
  const effect = el('div', 'polaroid-effect');
  effect.setAttribute('aria-hidden', 'true');
  const count = options.band === 'top' ? 26 : options.band === 'good' ? 10 : 5;
  for (let i = 0; i < count; i++) {
    const bit = el('span', options.band === 'top' ? 'confetti' : options.band === 'good' ? 'sparkle' : 'heart', options.band === 'good' ? '✨' : options.band === 'okay' ? '💖' : '');
    bit.style.left = `${4 + ((i * 37) % 92)}%`;
    bit.style.animationDelay = `${(i % 7) * 90}ms`;
    if (options.band === 'top') {
      bit.style.background = CONFETTI[i % CONFETTI.length] as string;
      bit.style.setProperty('--spin', `${(i % 2 === 0 ? 1 : -1) * (180 + i * 23)}deg`);
    } else bit.style.top = `${10 + ((i * 29) % 70)}%`;
    effect.append(bit);
  }
  wrap.append(effect);
  window.setTimeout(() => effect.remove(), 2600);
  return wrap;
}
