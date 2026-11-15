import { companionLook, companionName } from '../companion';
import { t } from '../i18n';
import type { StarterPhrase } from '../learning/starters';
import { renderMascot } from '../mascot';
import { el } from './dom';
import './path-screen.css';

/**
 * Story 057a: a short lesson on the salon path: a few phrases of one topic (English with its Vietnamese), each with
 * ▶ Listen in the companion's voice and, where the phone can listen, 🎤 Say it. "I've got it" finishes the node.
 */
export interface LessonOptions {
  title: string;
  phrases: readonly StarterPhrase[];
  speak?: (english: string) => void;
  practice?: (english: string) => void;
  onDone: () => void;
  onBack: () => void;
}

export function createLessonScreen(host: HTMLElement, options: LessonOptions): HTMLElement {
  const screen = el('section', 'screen lesson-screen');
  screen.setAttribute('aria-labelledby', 'lesson-title');
  const title = el('h1', 'lesson-title', `📖 ${options.title}`);
  title.id = 'lesson-title';
  const mai = el('div', 'bestie-bubble lesson-mai');
  mai.append(renderMascot('talking', 44, { crop: 'bust', ...companionLook() }), el('p', '', t('lesson.intro', { name: companionName() })));
  const list = el('ol', 'lesson-phrases');
  options.phrases.forEach((phrase) => {
    const item = el('li', 'lesson-phrase');
    const en = el('p', 'lesson-en', phrase.en);
    en.lang = 'en';
    const vi = el('p', 'lesson-vi', phrase.vi);
    vi.lang = 'vi';
    const row = el('div', 'lesson-actions');
    if (options.speak) {
      const listen = el('button', 'chat-button secondary lesson-listen', `▶ ${t('help.listen')}`);
      listen.type = 'button';
      listen.addEventListener('click', () => options.speak?.(phrase.en));
      row.append(listen);
    }
    if (options.practice) {
      const say = el('button', 'chat-button secondary lesson-say', `🎤 ${t('lesson.say')}`);
      say.type = 'button';
      say.addEventListener('click', () => options.practice?.(phrase.en));
      row.append(say);
    }
    item.append(en, vi, ...(row.childElementCount > 0 ? [row] : []));
    list.append(item);
  });
  const done = el('button', 'chat-button lesson-done', `✓ ${t('lesson.done')}`);
  done.type = 'button';
  done.addEventListener('click', options.onDone);
  const back = el('button', 'chat-button secondary', t('common.back'));
  back.type = 'button';
  back.addEventListener('click', options.onBack);
  const actions = el('div', 'path-actions');
  actions.append(back, done);
  screen.append(title, mai, list, actions);
  host.append(screen);
  return screen;
}
