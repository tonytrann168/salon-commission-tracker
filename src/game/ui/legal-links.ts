import { getLanguage, t } from '../i18n';
import { el } from './dom';

/** Story 031: the privacy and terms pages (static, en + vi), opened at the player's language. */
export function legalLinks(): HTMLElement {
  const row = el('p', 'setting-note legal-links');
  const lang = getLanguage();
  for (const [page, key] of [['privacy', 'legal.privacy'], ['terms', 'legal.terms']] as const) {
    const link = el('a', 'legal-link', t(key));
    link.href = `/${page}.html#${lang}`;
    link.target = '_blank';
    link.rel = 'noopener';
    row.append(link);
  }
  return row;
}
