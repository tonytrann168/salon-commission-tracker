import { companionLook, companionName } from '../companion';
import { t } from '../i18n';
import { renderMascot } from '../mascot';
import { el } from './dom';
import './welcome-screen.css';

/**
 * 057a part 2 (owner request): the front page on a first open while not signed in, like other apps: the logo and the
 * companion, a big "Create account", a second "Sign in", and a small "Play without an account". Guests play as
 * before; their progress goes up to an account made later (the existing sign-up sync).
 */
export interface WelcomeOptions {
  onCreate: () => void;
  onSignIn: () => void;
  onGuest: () => void;
}

export function createWelcomeScreen(host: HTMLElement, options: WelcomeOptions): HTMLElement {
  const screen = el('section', 'screen welcome-screen');
  screen.setAttribute('aria-labelledby', 'welcome-title');
  // 057b (overseer nit): one companion only: the title is the logo, in words; the big face below.
  const title = el('h1', 'welcome-title');
  title.id = 'welcome-title';
  title.append(el('span', 'welcome-hello', t('welcome.hello')), el('span', 'welcome-brand', 'Salon Besties'));
  const companion = el('div', 'welcome-companion');
  companion.append(renderMascot('happy', 120, { crop: 'bust', ...companionLook() }));
  const line = el('p', 'welcome-line', t('welcome.line', { name: companionName() }));
  const create = el('button', 'chat-button welcome-create', t('welcome.create'));
  create.type = 'button';
  create.addEventListener('click', options.onCreate);
  const signIn = el('button', 'chat-button secondary welcome-signin', t('welcome.signIn'));
  signIn.type = 'button';
  signIn.addEventListener('click', options.onSignIn);
  const guest = el('button', 'welcome-guest', t('welcome.guest'));
  guest.type = 'button';
  guest.addEventListener('click', options.onGuest);
  const note = el('p', 'welcome-note', t('welcome.guestNote'));
  const actions = el('div', 'welcome-actions');
  actions.append(create, signIn, guest, note);
  screen.append(title, companion, line, actions);
  host.append(screen);
  return screen;
}
