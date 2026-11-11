import { companionLook, companionName } from '../companion';
import { getLanguage, t } from '../i18n';
import type { StringKey } from '../i18n';
import { renderMascot } from '../mascot';
import { TOUR_STEPS, afterStep, loadTour, nextStep, saveTour, skipTour } from '../onboarding';
import type { TourStep } from '../onboarding';
import { getEnglishLevel } from '../settings';
import { el } from './dom';
import './tour.css';

/**
 * The tour's coach marks (story 015): the companion points at one control at a time. It watches the page and shows a
 * step when that step's control is on screen; it never blocks play (only its small card takes taps) and makes no AI
 * calls. Started once per app session; does nothing when the tour is done.
 */

const FACE_PX = 40;
const GAP = 10;
let running = false;

/** The visible, on-screen element for a selector, or null. */
function findTarget(selector: string): HTMLElement | null {
  for (const node of document.querySelectorAll<HTMLElement>(selector)) {
    const r = node.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight) return node;
  }
  return null;
}

/** Step text: Beginner gets the extra-simple line (in English; Vietnamese is already plain). */
function stepText(step: TourStep): string {
  const simple = getEnglishLevel() === 'beginner' && getLanguage() === 'en';
  return t(`tour.${step.id}${simple ? 'Simple' : ''}` as StringKey);
}

export function startTour(host: HTMLElement = document.body): void {
  if (running || loadTour().done) return;
  running = true;
  const ring = el('div', 'tour-ring');
  ring.setAttribute('aria-hidden', 'true');
  const card = el('div', 'tour-card');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-live', 'polite');
  let shown: { step: TourStep; target: HTMLElement } | null = null;

  const stop = (): void => {
    running = false;
    observer.disconnect();
    window.removeEventListener('resize', place);
    ring.remove();
    card.remove();
  };

  function place(): void {
    if (!shown) return;
    if (!shown.target.isConnected) {
      // The control went away (screen changed): hide the card; the step shows again when its control is back.
      shown = null;
      ring.remove();
      card.remove();
      return;
    }
    const r = shown.target.getBoundingClientRect();
    Object.assign(ring.style, { left: `${r.left - 4}px`, top: `${r.top - 4}px`, width: `${r.width + 8}px`, height: `${r.height + 8}px` });
    const width = Math.min(300, window.innerWidth - 16);
    card.style.width = `${width}px`;
    card.style.left = `${Math.max(8, Math.min(window.innerWidth - width - 8, r.left + r.width / 2 - width / 2))}px`;
    const height = card.offsetHeight;
    // Below the control when it fits, else above: the card never covers what it points at.
    const below = r.bottom + GAP + height <= window.innerHeight - 8;
    card.style.top = `${below ? r.bottom + GAP : Math.max(8, r.top - GAP - height)}px`;
    card.dataset.side = below ? 'below' : 'above';
  }

  function show(step: TourStep, target: HTMLElement): void {
    shown = { step, target };
    const index = TOUR_STEPS.findIndex((s) => s.id === step.id);
    const last = index === TOUR_STEPS.length - 1;
    const next = el('button', 'chat-button tour-next', last ? t('tour.gotIt') : t('tour.next'));
    next.type = 'button';
    next.addEventListener('click', () => {
      saveTour(afterStep(loadTour(), step.id));
      shown = null;
      ring.remove();
      card.remove();
      if (loadTour().done) stop();
      else check();
    });
    const skip = el('button', 'tour-skip', t('tour.skip'));
    skip.type = 'button';
    skip.addEventListener('click', () => {
      saveTour(skipTour(loadTour()));
      stop();
    });
    const words = el('div', 'tour-words');
    words.append(el('strong', '', companionName()), el('p', '', stepText(step)));
    const head = el('div', 'tour-head');
    head.append(renderMascot('talking', FACE_PX, { crop: 'bust', ...companionLook() }), words);
    const foot = el('div', 'tour-foot');
    foot.append(el('span', 'tour-count', t('tour.count', { n: index + 1, total: TOUR_STEPS.length })), skip, next);
    card.setAttribute('aria-label', t('tour.label', { name: companionName() }));
    card.replaceChildren(head, foot);
    host.append(ring, card);
    place();
  }

  function check(): void {
    // A celebration card (rank-up, badge) comes first: step aside and come back when it is dismissed.
    if (document.querySelector('.celebration')) {
      if (shown) {
        shown = null;
        ring.remove();
        card.remove();
      }
      return;
    }
    if (shown) return place();
    const step = nextStep(loadTour());
    if (!step) return stop();
    const target = findTarget(step.target);
    if (target) show(step, target);
  }

  const observer = new MutationObserver(() => check());
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', place);
  check();
}
