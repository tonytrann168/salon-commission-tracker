import { t } from '../i18n';
import type { StringKey } from '../i18n';

/** Small DOM helpers shared by the UI modules. */

/** Create an element with an optional class and text. */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * One string-table entry in both languages, Vietnamese first, English under it, whatever the interface language. Only
 * for the few places that must read in both: the level picker (story 010) and the full-Vietnamese-mode switch, so a
 * player can always find their way back. Each part carries its own `lang` for screen readers and fonts.
 */
export function bilingual(key: StringKey, className = 'bilingual'): HTMLSpanElement {
  const node = el('span', className);
  const vi = el('span', 'bi-vi', t(key, undefined, 'vi'));
  vi.lang = 'vi';
  const en = el('span', 'bi-en', t(key, undefined, 'en'));
  en.lang = 'en';
  node.append(vi, en);
  return node;
}
