import { t } from '../i18n';
import { el } from './dom';
import './resume-card.css';

/**
 * Story 072: after a reload or a crash, the visit in progress is offered back: "Continue your visit with Grace?"
 * Continue picks it up exactly; Leave visit ends it with the same no-penalty rules as Pause.
 */
export function createResumeCard(host: HTMLElement, options: { name: string; onContinue: () => void; onLeave: () => void }): HTMLElement {
  const overlay = el('div', 'resume-visit');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  const card = el('section', 'resume-card');
  const title = el('h2', '', t('resume.title', { name: options.name }));
  title.id = 'resume-title';
  overlay.setAttribute('aria-labelledby', 'resume-title');
  const go = el('button', 'chat-button resume-continue', `▶ ${t('resume.continue')}`);
  go.type = 'button';
  go.dataset.sfx = 'primary';
  const leave = el('button', 'chat-button secondary resume-leave', t('pause.leave'));
  leave.type = 'button';
  const close = (): void => overlay.remove();
  go.addEventListener('click', () => {
    close();
    options.onContinue();
  });
  leave.addEventListener('click', () => {
    close();
    options.onLeave();
  });
  card.append(title, el('p', 'resume-note', t('resume.note')), go, leave, el('p', 'resume-leave-note', t('pause.leaveNote')));
  overlay.append(card);
  host.append(overlay);
  go.focus();
  return overlay;
}
