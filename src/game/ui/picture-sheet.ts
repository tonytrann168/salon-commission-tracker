import { t } from '../i18n';
import { el } from './dom';
import './picture-sheet.css';

/**
 * Story 065: her picture, shown as a polaroid in a sheet ("Make her nails look like this"). The image is drawn by the
 * game's nail renderer from a target design (no real photos, no image generation).
 */
export function openPictureSheet(src: string | null, clientName: string): HTMLElement {
  document.querySelector('.picture-sheet')?.remove();
  const sheet = el('div', 'picture-sheet');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', t('picture.title', { name: clientName }));
  const card = el('div', 'picture-card');
  const frame = el('figure', 'picture-polaroid');
  if (src) {
    const img = el('img', 'picture-photo');
    img.src = src;
    img.alt = t('picture.alt', { name: clientName });
    frame.append(img);
  } else frame.append(el('p', 'picture-missing', t('picture.missing')));
  frame.append(el('figcaption', '', `📷 ${t('picture.title', { name: clientName })}`));
  const close = el('button', 'chat-button picture-close', t('picture.close'));
  close.type = 'button';
  const shut = (): void => sheet.remove();
  close.addEventListener('click', shut);
  sheet.addEventListener('click', (event) => event.target === sheet && shut());
  card.append(frame, el('p', 'picture-line', t('picture.line')), close);
  sheet.append(card);
  document.body.append(sheet);
  close.focus({ preventScroll: true });
  return sheet;
}

/** Story 065: her picture next to the finished set on the results, with how close it is. */
export function pictureCompare(reference: string, work: string, match: number, clientName: string): HTMLElement {
  const box = el('section', 'results-section picture-compare');
  box.append(el('h2', '', t('picture.compareTitle')));
  const row = el('div', 'picture-compare-row');
  for (const [src, label] of [[reference, t('picture.title', { name: clientName })], [work, t('picture.yourWork')]] as const) {
    const fig = el('figure', 'picture-polaroid small');
    const img = el('img', 'picture-photo');
    img.src = src;
    img.alt = label;
    fig.append(img, el('figcaption', '', label));
    row.append(fig);
  }
  const score = el('p', `picture-match ${match >= 80 ? 'good' : match >= 55 ? 'okay' : 'low'}`, t('picture.match', { n: match }));
  box.append(row, score);
  return box;
}
