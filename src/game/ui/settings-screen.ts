import { applyDocumentLanguage, t } from '../i18n';
import { BESTIE_CONFIG } from '../bestie';
import { LEARNING_CONFIG } from '../learning/corrections';
import { getCorrectionsEnabled, getEnglishLevel, getHelpLanguage, getHintsEnabled, setCorrectionsEnabled, setEnglishLevel, setHelpLanguage, setHintsEnabled } from '../settings';
import { bilingual, el } from './dom';
import { createLevelPicker } from './level-picker';
import './level-picker.css';

/**
 * Settings: change the English level, turn full Vietnamese mode on or off, turn bestie hints (story 003) and whispered corrections (story 011) on or off. All save at once.
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

    const hintsRow = el('label', 'setting-row');
    const hintsToggle = el('input');
    hintsToggle.type = 'checkbox';
    hintsToggle.checked = getHintsEnabled();
    hintsToggle.addEventListener('change', () => setHintsEnabled(hintsToggle.checked));
    const hintsText = el('span', 'setting-text');
    hintsText.append(el('strong', '', t('settings.hints')), el('span', 'setting-note', t('settings.hintsNote', { name: BESTIE_CONFIG.name })));
    hintsRow.append(hintsText, hintsToggle);

    const correctionsRow = el('label', 'setting-row');
    const correctionsToggle = el('input');
    correctionsToggle.type = 'checkbox';
    correctionsToggle.checked = getCorrectionsEnabled();
    correctionsToggle.addEventListener('change', () => setCorrectionsEnabled(correctionsToggle.checked));
    const correctionsText = el('span', 'setting-text');
    correctionsText.append(
      el('strong', '', t('settings.corrections')),
      el('span', 'setting-note', t('settings.correctionsNote', { name: BESTIE_CONFIG.name, count: LEARNING_CONFIG.whispers.maxPerAppointment })),
    );
    correctionsRow.append(correctionsText, correctionsToggle);

    const back = el('button', 'chat-button secondary', t('common.back'));
    back.type = 'button';
    back.addEventListener('click', onBack);

    screen.replaceChildren(title, levelTitle, picker, row, hintsRow, correctionsRow, back);
  };

  render();
  host.appendChild(screen);
  return screen;
}
