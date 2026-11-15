import { prefersReducedMotion } from '../comfort';
import { JUICE_CONFIG } from '../juice';
import { coinIcon } from './coin-icon';
import { el } from './dom';
import './juice.css';

/**
 * Story 057b: a short burst of coins or confetti from a point on screen. A few CSS-animated elements in one fixed,
 * click-through layer, removed when they finish; nothing at all with Reduce motion.
 */
export function burst(at: { x: number; y: number }, kind: 'coins' | 'confetti', host: HTMLElement = document.body): void {
  if (prefersReducedMotion()) return;
  const count = kind === 'coins' ? JUICE_CONFIG.bursts.coins : JUICE_CONFIG.bursts.confetti;
  if (count === 0) return;
  const layer = el('div', `burst burst-${kind}`);
  layer.setAttribute('aria-hidden', 'true');
  layer.style.left = `${Math.round(at.x)}px`;
  layer.style.top = `${Math.round(at.y)}px`;
  layer.style.setProperty('--burst-ms', `${JUICE_CONFIG.bursts.ms}ms`);
  for (let i = 0; i < count; i++) {
    const piece = el('span', 'burst-piece');
    if (kind === 'coins') piece.innerHTML = coinIcon(20);
    else piece.style.setProperty('--hue', String((i * 53) % 360));
    // Spread evenly around, with a little variety in distance.
    piece.style.setProperty('--angle', `${(360 / count) * i + (i % 2) * 11}deg`);
    piece.style.setProperty('--dist', `${70 + ((i * 37) % 50)}px`);
    piece.style.animationDelay = `${(i % 4) * 25}ms`;
    layer.append(piece);
  }
  host.append(layer);
  window.setTimeout(() => layer.remove(), JUICE_CONFIG.bursts.ms + 200);
}

/** The centre of an element on screen (for a burst from it). */
export function centreOf(element: Element): { x: number; y: number } {
  const r = element.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
