import { getEnglishLevel, getHelpLanguage, setEnglishLevel, setHelpLanguage } from '../settings';
import { bilingual, el } from './dom';
import { createLevelPicker } from './level-picker';
import { STRINGS } from './strings';
import './level-picker.css';

/**
 * Settings: change the English level and turn full Vietnamese mode on or off. Both save at once.
 * Bilingual until story 008 moves UI text to string tables. Story: story-010.
 */
export function createSettingsScreen(host: HTMLElement, onBack: () => void): HTMLElement {
  const screen = el('section', 'screen');
  screen.setAttribute('aria-labelledby', 'settings-title');

  const title = el('h1');
  title.id = 'settings-title';
  title.append(bilingual(STRINGS.settings));

  const levelTitle = el('h2');
  levelTitle.append(bilingual(STRINGS.levelSectionTitle));
  const picker = createLevelPicker({ current: getEnglishLevel(), onPick: setEnglishLevel });

  const row = el('label', 'setting-row');
  const toggle = el('input');
  toggle.type = 'checkbox';
  toggle.checked = getHelpLanguage() === 'full';
  toggle.addEventListener('change', () => setHelpLanguage(toggle.checked ? 'full' : 'tap'));
  const note = el('span', 'setting-text');
  note.append(bilingual(STRINGS.fullVietnameseLabel), bilingual(STRINGS.fullVietnameseNote));
  row.append(note, toggle);

  const back = el('button', 'chat-button secondary');
  back.type = 'button';
  back.append(bilingual(STRINGS.back));
  back.addEventListener('click', onBack);

  screen.append(title, levelTitle, picker, row, back);
  host.appendChild(screen);
  return screen;
}
