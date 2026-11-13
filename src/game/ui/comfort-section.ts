import { TEXT_SIZES, loadComfort, saveComfort } from '../comfort';
import type { ComfortSettings } from '../comfort';
import { t } from '../i18n';
import { el } from './dom';
import './comfort.css';

/** Settings → Comfort (story 023): text size, reduce motion, vibration, high contrast. Saved and applied at once. */
export function createComfortSection(): HTMLElement {
  const section = el('section', 'comfort-section');
  const draw = (): void => {
    const settings = loadComfort();
    const update = (change: Partial<ComfortSettings>): void => {
      saveComfort({ ...loadComfort(), ...change });
      draw();
    };
    const sizes = el('div', 'comfort-sizes');
    sizes.setAttribute('role', 'group');
    sizes.setAttribute('aria-label', t('comfort.textSize'));
    for (const size of TEXT_SIZES) {
      const b = el('button', 'chat-button secondary', t(`comfort.${size}`));
      b.type = 'button';
      b.setAttribute('aria-pressed', String(settings.textSize === size));
      b.addEventListener('click', () => update({ textSize: size }));
      sizes.append(b);
    }
    const toggle = (key: 'reduceMotion' | 'vibration' | 'highContrast', label: string, note: string): HTMLElement => {
      const row = el('label', 'setting-row');
      const box = el('input');
      box.type = 'checkbox';
      box.checked = settings[key];
      box.addEventListener('change', () => update({ [key]: box.checked }));
      const text = el('span', 'setting-text');
      text.append(el('strong', '', label), el('span', 'setting-note', note));
      row.append(text, box);
      return row;
    };
    section.replaceChildren(
      el('h2', '', t('comfort.title')),
      el('strong', '', t('comfort.textSize')),
      sizes,
      toggle('reduceMotion', t('comfort.motion'), t('comfort.motionNote')),
      toggle('vibration', t('comfort.vibration'), t('comfort.vibrationNote')),
      toggle('highContrast', t('comfort.contrast'), t('comfort.contrastNote')),
    );
  };
  draw();
  return section;
}
