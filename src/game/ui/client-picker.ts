import { clientsByDifficulty } from '../clients/roster';
import { getLanguage, t } from '../i18n';
import { DIFFICULTIES } from '../types';
import type { ClientPersona, Difficulty } from '../types';
import { el } from './dom';
import './client-picker.css';

/**
 * Choose who is in the chair (story 006): a difficulty, then a client, a random client, or a shift of several clients
 * back to back. Cards come from the roster files, so a new client file shows up here by itself.
 */
export interface ClientPickerOptions {
  /** Clients in a shift. */
  shiftSize: number;
  onPick: (client: ClientPersona) => void;
  onRandom: (difficulty: Difficulty) => void;
  onShift: (difficulty: Difficulty) => void;
  onBack: () => void;
}

const DIFFICULTY_KEY = 'salon.pickerDifficulty';

/** A small placeholder face from the client's look colours. */
function avatar(client: ClientPersona): HTMLElement {
  const face = el('span', client.look.hairStyle === 'short' ? 'picker-avatar short' : 'picker-avatar');
  face.style.setProperty('--hair', client.look.hair);
  face.style.setProperty('--skin', client.look.skin);
  face.style.setProperty('--accent', client.look.accent);
  face.setAttribute('aria-hidden', 'true');
  return face;
}

export function createClientPicker(host: HTMLElement, options: ClientPickerOptions): HTMLElement {
  const screen = el('section', 'screen client-picker');
  screen.setAttribute('aria-labelledby', 'picker-title');
  const lang = getLanguage();
  let difficulty: Difficulty = (() => {
    try {
      const saved = localStorage.getItem(DIFFICULTY_KEY);
      return DIFFICULTIES.find((d) => d === saved) ?? 'easy';
    } catch {
      return 'easy';
    }
  })();

  const title = el('h1', '', t('picker.title'));
  title.id = 'picker-title';
  const tabs = el('div', 'picker-tabs');
  tabs.setAttribute('role', 'tablist');
  const list = el('div', 'picker-list');
  const actions = el('div', 'picker-actions');
  const random = el('button', 'chat-button secondary', t('picker.random'));
  random.type = 'button';
  random.addEventListener('click', () => options.onRandom(difficulty));
  const shift = el('button', 'chat-button', t('picker.shift', { count: options.shiftSize }));
  shift.type = 'button';
  shift.addEventListener('click', () => options.onShift(difficulty));
  const back = el('button', 'chat-button secondary', t('common.back'));
  back.type = 'button';
  back.addEventListener('click', options.onBack);
  actions.append(random, shift);

  const tabButtons = DIFFICULTIES.map((d) => {
    const tab = el('button', `picker-tab ${d}`, t(`picker.${d}`));
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    tab.addEventListener('click', () => {
      difficulty = d;
      try {
        localStorage.setItem(DIFFICULTY_KEY, d);
      } catch {
        // Not saved: fine.
      }
      draw();
    });
    return tab;
  });
  tabs.append(...tabButtons);

  function draw(): void {
    tabButtons.forEach((tab, index) => tab.setAttribute('aria-selected', String(DIFFICULTIES[index] === difficulty)));
    list.replaceChildren(
      ...clientsByDifficulty(difficulty).map((client) => {
        const card = el('button', 'picker-card');
        card.type = 'button';
        card.setAttribute('aria-label', t('picker.choose', { name: client.name }));
        const words = el('span', 'picker-words');
        words.append(el('strong', '', client.name), el('span', 'picker-line', client.description[lang]));
        card.append(avatar(client), words);
        card.addEventListener('click', () => options.onPick(client));
        return card;
      }),
    );
  }
  draw();

  screen.append(title, tabs, list, actions, back);
  host.appendChild(screen);
  return screen;
}
