import { FEEDBACK_MAX_TEXT_CLIENT } from './feedback-limits';
import { feedbackPost, sendFeedback } from '../feedback';
import type { FeedbackDetails } from '../feedback';
import { t } from '../i18n';
import type { StringKey } from '../i18n';
import type { Message } from '../types';
import { bilingual, el } from './dom';
import './feedback.css';

/**
 * The feedback sheet (story 016): a 1-5 smiley rating, an optional note, "Add game details" (on by default) and, on
 * the results screen only, "Include my conversation" (off by default). Opened from Settings and the results screen.
 */

const FACES = ['😣', '🙁', '😐', '🙂', '😍'];

/** The "Góp ý / Feedback" button that opens the sheet. */
export function feedbackButton(host: HTMLElement, options: { details?: FeedbackDetails; chat?: readonly Message[] } = {}): HTMLButtonElement {
  const button = el('button', 'chat-button secondary feedback-open');
  button.type = 'button';
  button.append('💬 ', bilingual('feedback.title'));
  button.addEventListener('click', () => openFeedbackSheet(host, options));
  return button;
}

export function openFeedbackSheet(host: HTMLElement, options: { details?: FeedbackDetails; chat?: readonly Message[] } = {}): HTMLElement {
  const overlay = el('div', 'feedback-overlay');
  const sheet = el('section', 'feedback-sheet');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-labelledby', 'feedback-title');
  const title = el('h2', '');
  title.id = 'feedback-title';
  title.append(bilingual('feedback.title'));
  let rating = 0;
  const faces = el('div', 'feedback-faces');
  faces.setAttribute('role', 'radiogroup');
  faces.setAttribute('aria-label', t('feedback.ratingLabel'));
  const faceButtons = FACES.map((face, index) => {
    const b = el('button', 'feedback-face', face);
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', 'false');
    b.setAttribute('aria-label', t(`feedback.rating${index + 1}` as StringKey));
    b.addEventListener('click', () => {
      rating = index + 1;
      faceButtons.forEach((other, i) => other.setAttribute('aria-checked', String(i === index)));
      send.disabled = false;
    });
    return b;
  });
  faces.append(...faceButtons);
  const textLabel = el('label', 'help-label', t('feedback.textLabel'));
  textLabel.htmlFor = 'feedback-text';
  const text = el('textarea', 'help-input');
  text.id = 'feedback-text';
  text.rows = 3;
  text.maxLength = FEEDBACK_MAX_TEXT_CLIENT;
  text.placeholder = t('feedback.textPlaceholder');
  const counter = el('span', 'setting-note feedback-count', `0/${FEEDBACK_MAX_TEXT_CLIENT}`);
  text.addEventListener('input', () => {
    counter.textContent = `${text.value.length}/${FEEDBACK_MAX_TEXT_CLIENT}`;
  });
  const check = (label: string, checked: boolean): { row: HTMLElement; box: HTMLInputElement } => {
    const row = el('label', 'feedback-check');
    const box = el('input');
    box.type = 'checkbox';
    box.checked = checked;
    row.append(box, el('span', '', label));
    return { row, box };
  };
  const detailsCheck = options.details ? check(t('feedback.addDetails'), true) : null;
  const chatCheck = options.chat && options.chat.length > 0 ? check(t('feedback.addChat'), false) : null;
  const status = el('p', 'setting-note feedback-status');
  status.setAttribute('aria-live', 'polite');
  const send = el('button', 'chat-button', t('feedback.send'));
  send.type = 'button';
  send.disabled = true;
  const close = el('button', 'chat-button secondary', t('common.back'));
  close.type = 'button';
  const done = (): void => overlay.remove();
  close.addEventListener('click', done);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) done();
  });
  send.addEventListener('click', async () => {
    if (rating === 0) return;
    send.disabled = true;
    status.textContent = t('feedback.sending');
    const result = await sendFeedback(
      feedbackPost(rating, text.value, {
        ...(options.details ? { details: options.details } : {}),
        includeDetails: detailsCheck?.box.checked ?? false,
        ...(options.chat ? { chat: options.chat } : {}),
        includeChat: chatCheck?.box.checked ?? false,
      }),
    );
    if (result === 'sent') {
      status.textContent = t('feedback.thanks');
      close.textContent = t('feedback.close');
      faces.remove();
      textLabel.remove();
      text.remove();
      counter.remove();
      detailsCheck?.row.remove();
      chatCheck?.row.remove();
      send.remove();
    } else {
      status.textContent = t(result === 'busy' ? 'feedback.busy' : 'feedback.failed');
      send.disabled = false;
    }
  });
  const actions = el('div', 'feedback-actions');
  actions.append(close, send);
  sheet.append(title, el('p', 'setting-note', t('feedback.note')), faces, textLabel, text, counter, ...(detailsCheck ? [detailsCheck.row] : []), ...(chatCheck ? [chatCheck.row] : []), status, actions);
  overlay.append(sheet);
  host.append(overlay);
  faceButtons[3]?.focus();
  return overlay;
}
