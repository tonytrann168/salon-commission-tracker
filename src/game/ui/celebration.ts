import { haptic } from '../comfort';
import { companionLook, companionName } from '../companion';
import { t } from '../i18n';
import { renderMascot } from '../mascot';
import { emitSound } from '../sound-events';
import { el } from './dom';
import './progression.css';

/**
 * A celebration moment (story 007): rank-ups, new badges and streak milestones each get a card with a sound and a
 * burst of confetti (none with reduced motion). Several in a row show one after another. Mai brings the news (overseer,
 * 2026-11-10: she is the soul of the game): her celebrating mood, with the badge or rank icon as a sticker by her.
 */

export interface Celebration {
  icon: string;
  title: string;
  line: string;
}

const CONFETTI = 14;
const MAI_PX = 120;
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
  haptic([20, 40, 20]);
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
  const name = companionName();
  const title = el('h2', '', t('celebrate.says', { name, text: item.title }));
  title.id = 'celebration-title';
  const ok = el('button', 'chat-button', t('celebrate.ok'));
  ok.type = 'button';
  ok.addEventListener('click', () => {
    overlay.remove();
    next(host);
  });
  const many = [...new Intl.Segmenter().segment(item.icon)].length > 1;
  const figure = el('div', 'celebration-mai');
  figure.append(renderMascot('celebrating', MAI_PX, { label: name, crop: 'full', ...companionLook() }), el('span', many ? 'celebration-icon many' : 'celebration-icon', item.icon));
  card.append(burst, figure, title, el('p', '', item.line), ok);
  overlay.append(card);
  host.append(overlay);
  ok.focus();
}
