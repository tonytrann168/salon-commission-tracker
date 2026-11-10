import { applyDocumentLanguage, t } from '../i18n';
import { getEnglishLevel, getHelpLanguage, setEnglishLevel, setHelpLanguage } from '../settings';
import { bilingual, el } from './dom';
import { createLevelPicker } from './level-picker';
import './level-picker.css';

/**
 * Settings: change the English level and turn full Vietnamese mode on or off. Both save at once.
 * Full Vietnamese mode is also the interface language: turning it on or off redraws this screen in the new language
 * at once. Its own label is always shown in both languages, so a player can always find the way back. Story: story-010, story-008.
 */
export function createSettingsScreen(host: HTMLElement, onBack: () => void): HTMLElement {
  const screen = el('section', 'screen');
  screen.setAttribute('aria-labelledby', 'settings-title');

  const render = (): void => {
    const title = el('h1', '', t('settings.title'));
    title.id = 'settings-title';

    const levelTitle = el('h2', '', t('settings.levelSection'));
    const picker = createLevelPicker({ current: getEnglishLevel(), onPick: setEnglishLevel });

    const row = el('label', 'setting-row');
    const toggle = el('input');
    toggle.type = 'checkbox';
    toggle.checked = getHelpLanguage() === 'full';
    toggle.addEventListener('change', () => {
      setHelpLanguage(toggle.checked ? 'full' : 'tap');
      applyDocumentLanguage();
      render();
      screen.querySelector<HTMLInputElement>('.setting-row input')?.focus();
    });
    const note = el('span', 'setting-text');
    note.append(bilingual('settings.fullVietnamese'), el('span', 'setting-note', t('settings.fullVietnameseNote')));
    row.append(note, toggle);

    const back = el('button', 'chat-button secondary', t('common.back'));
    back.type = 'button';
    back.addEventListener('click', onBack);

    screen.replaceChildren(title, levelTitle, picker, row, back);
  };

  render();
  host.appendChild(screen);
  return screen;
}
