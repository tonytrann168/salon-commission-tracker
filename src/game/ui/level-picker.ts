import { ENGLISH_LEVELS_CONFIG } from '../english-level';
import { ENGLISH_LEVELS } from '../types';
import type { EnglishLevel } from '../types';
import { bilingual, el } from './dom';
import { STRINGS } from './strings';
import './level-picker.css';

/**
 * Four large cards, one per English level, each with a one-line explanation in Vietnamese and English (text from
 * config/english-levels.json). Used before the first appointment and in Settings. Story: story-010.
 */
export interface LevelPickerOptions {
  /** The level to show as selected, or `null` when none is chosen yet. */
  current: EnglishLevel | null;
  /** Called when a card is tapped (after the card is marked selected). */
  onPick: (level: EnglishLevel) => void;
}

/** Build the picker's card list. The caller mounts it. */
export function createLevelPicker(options: LevelPickerOptions): HTMLElement {
  const list = el('div', 'level-cards');
  list.setAttribute('role', 'group');
  list.setAttribute('aria-label', `${STRINGS.levelPickerTitle.vi} ${STRINGS.levelPickerTitle.en}`);

  const cards = ENGLISH_LEVELS.map((level) => {
    const rules = ENGLISH_LEVELS_CONFIG.levels[level];
    const card = el('button', 'level-card');
    card.type = 'button';
    card.setAttribute('aria-pressed', String(level === options.current));
    card.append(
      bilingual(rules.name, 'level-card-name bilingual'),
      bilingual(rules.pickerLine, 'level-card-line bilingual'),
    );
    card.addEventListener('click', () => {
      cards.forEach((other, index) => other.setAttribute('aria-pressed', String(ENGLISH_LEVELS[index] === level)));
      options.onPick(level);
    });
    return card;
  });
  list.append(...cards);
  return list;
}
