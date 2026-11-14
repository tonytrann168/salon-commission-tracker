import { companionParams, fillTemplate, getLanguage, t } from '../i18n';
import type { ReleaseNotes } from '../whats-new';
import { el } from './dom';
import './feedback.css';

/** Story 034: the "What's new" sheet. */
export function openWhatsNew(host: HTMLElement, notes: ReleaseNotes): HTMLElement {
  const lang = getLanguage();
  const overlay = el('div', 'feedback-overlay');
  const sheet = el('section', 'feedback-sheet whats-new');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-labelledby', 'whats-new-title');
  const title = el('h2', '', t('whatsNew.title', { version: notes.version }));
  title.id = 'whats-new-title';
  const list = el('ul', 'whats-new-list');
  for (const item of notes.items) list.append(el('li', '', fillTemplate(item[lang], companionParams())));
  const ok = el('button', 'chat-button', t('whatsNew.ok'));
  ok.type = 'button';
  ok.addEventListener('click', () => overlay.remove());
  sheet.append(title, list, ok);
  overlay.append(sheet);
  host.append(overlay);
  ok.focus();
  return overlay;
}
