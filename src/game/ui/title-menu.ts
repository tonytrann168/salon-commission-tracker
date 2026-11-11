import { t } from '../i18n';
import { createBestieGreeting } from './bestie-panel';
import './chat-panel.css';
import './level-picker.css';

/**
 * Story 018: the title menu is plain HTML, kept apart from the PixiJS title scene so it shows before PixiJS loads.
 */
/** DOM menu over the title scene: Start and Settings (story 008: in the interface language). Returns the element so the caller can remove it. */
export function createTitleMenu(host: HTMLElement, onStart: () => void, onSettings: () => void, onPhrasebook: () => void, onShop?: () => void, onProfile?: () => void): HTMLElement {
  const menu = document.createElement('div');
  menu.className = 'title-menu';
  const start = document.createElement('button');
  start.type = 'button';
  start.className = 'chat-button';
  start.textContent = t('title.start');
  start.addEventListener('click', onStart);
  const settings = document.createElement('button');
  settings.type = 'button';
  settings.className = 'chat-button secondary';
  settings.textContent = t('title.settings');
  settings.addEventListener('click', onSettings);
  const phrasebook = document.createElement('button');
  phrasebook.type = 'button';
  phrasebook.className = 'chat-button secondary';
  phrasebook.textContent = t('title.phrasebook');
  phrasebook.addEventListener('click', onPhrasebook);
  // Settings and Phrasebook share a row so the menu still fits small phones (story 011).
  const row = document.createElement('div');
  row.className = 'title-menu-row';
  row.append(settings, phrasebook);
  // Story 007: the shop and the profile share a second row.
  const extra = document.createElement('div');
  extra.className = 'title-menu-row';
  for (const [label, onClick] of [[t('title.shop'), onShop], [t('title.profile'), onProfile]] as const) {
    if (!onClick) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chat-button secondary';
    button.textContent = label;
    button.addEventListener('click', onClick);
    extra.append(button);
  }
  menu.append(createBestieGreeting(), start, row, ...(extra.childElementCount > 0 ? [extra] : []));
  host.appendChild(menu);
  return menu;
}
