import type { BilingualText } from '../english-level';

/** Small DOM helpers shared by the UI modules. */

/** Create an element with an optional class and text. */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Vietnamese first, English under it. Each part carries its own `lang` so screen readers and fonts pick the right voice. */
export function bilingual(text: BilingualText, className = 'bilingual'): HTMLSpanElement {
  const node = el('span', className);
  const vi = el('span', 'bi-vi', text.vi);
  vi.lang = 'vi';
  const en = el('span', 'bi-en', text.en);
  en.lang = 'en';
  node.append(vi, en);
  return node;
}
