import { companionName } from '../companion';
import { t } from '../i18n';
import { groupByTopic, loadPhrasebook } from '../learning/phrasebook';
import { el } from './dom';
import { practiceButton } from './practice-sheet';
import './level-picker.css';
import './results-screen.css';
import './recap-screen.css';

/** The phrasebook: every saved phrase, grouped by topic, English with its Vietnamese meaning. Story: story-011; Practise buttons: story-004. */
export function createPhrasebookScreen(host: HTMLElement, onBack: () => void, onPractice?: (line: string) => void): HTMLElement {
  const screen = el('section', 'screen phrasebook');
  screen.setAttribute('aria-labelledby', 'phrasebook-title');
  const title = el('h1', '', t('phrasebook.title'));
  title.id = 'phrasebook-title';
  const book = loadPhrasebook();
  screen.append(title, el('p', 'learning-reason', book.length === 0 ? t('phrasebook.empty', { name: companionName() }) : t('phrasebook.count', { count: book.length })));
  for (const group of groupByTopic(book)) {
    const section = el('section', 'results-section');
    section.append(el('h2', '', t(`phrasebook.topic.${group.topic}`)));
    for (const entry of group.entries) {
      const item = el('div', 'learning-phrase');
      const en = el('span', 'learning-en', entry.en);
      en.lang = 'en';
      const vi = el('span', 'learning-vi', entry.vi);
      vi.lang = 'vi';
      item.append(en, vi);
      if (onPractice) item.append(practiceButton(entry.en, onPractice));
      section.append(item);
    }
    screen.append(section);
  }
  const back = el('button', 'chat-button secondary', t('common.back'));
  back.type = 'button';
  back.addEventListener('click', onBack);
  screen.append(back);
  host.appendChild(screen);
  return screen;
}
