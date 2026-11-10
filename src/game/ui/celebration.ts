import { t } from '../i18n';
import { emitSound } from '../sound-events';
import { el } from './dom';
import './progression.css';

/**
 * A celebration moment (story 007): rank-ups, new badges and streak milestones each get a card with a sound and a
 * burst of confetti (none with reduced motion). Several in a row show one after another.
 */

export interface Celebration {
  icon: string;
  title: string;
  line: string;
}

const CONFETTI = 14;
let queue: Celebration[] = [];
let showing = false;

export function celebrate(host: HTMLElement, items: Celebration[]): void {
  queue = [...queue, ...items];
  if (!showing) next(host);
}

function next(host: HTMLElement): void {
  const item = queue.shift();
  if (!item) {
    showing = false;
    return;
  }
  showing = true;
  emitSound('levelUp');
  const overlay = el('div', 'celebration');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'celebration-title');
  const card = el('div', 'celebration-card');
  const burst = el('div', 'celebration-burst');
  burst.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < CONFETTI; i++) {
    const piece = el('span', 'confetti');
    piece.style.setProperty('--angle', `${(360 / CONFETTI) * i}deg`);
    piece.style.setProperty('--hue', `${(i * 47) % 360}`);
    burst.append(piece);
  }
  const title = el('h2', '', item.title);
  title.id = 'celebration-title';
  const ok = el('button', 'chat-button', t('celebrate.ok'));
  ok.type = 'button';
  ok.addEventListener('click', () => {
    overlay.remove();
    next(host);
  });
  const many = [...new Intl.Segmenter().segment(item.icon)].length > 1;
  card.append(burst, el('div', many ? 'celebration-icon many' : 'celebration-icon', item.icon), title, el('p', '', item.line), ok);
  overlay.append(card);
  host.append(overlay);
  ok.focus();
}
