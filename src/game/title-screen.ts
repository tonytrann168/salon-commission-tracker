import { Container, Graphics, Text } from 'pixi.js';
import { createPortrait } from './portraits/definitions';
import { t } from './i18n';
import { createBestieGreeting } from './ui/bestie-panel';
import './ui/chat-panel.css';
import './ui/level-picker.css';

export const GAME_TITLE = 'Salon Besties';

/** Placeholder title screen: the bestie's portrait, title and tagline. */
export function createTitleScreen(width: number, height: number): Container {
  const screen = new Container();
  screen.label = 'title-screen';

  const bg = new Graphics().rect(0, 0, width, height).fill(0xfff4f8);
  // Bestie above the title: sized to the space over the title text so nothing overlaps on small phones.
  const bestieSize = Math.min(width * 0.6, height * 0.3);
  const bestie = createPortrait('bestie', bestieSize, 'delighted');
  bestie.view.position.set((width - bestieSize) / 2, height * 0.27 - bestieSize / 2);

  const title = new Text({
    text: GAME_TITLE,
    style: { fontFamily: 'system-ui, sans-serif', fontSize: 40, fontWeight: '800', fill: 0x3b2a33 },
  });
  title.anchor.set(0.5);
  title.position.set(width / 2, height * 0.52);

  const tagline = new Text({
    text: t('title.tagline'),
    style: { fontFamily: 'system-ui, sans-serif', fontSize: 18, fill: 0x8a6575 },
  });
  tagline.anchor.set(0.5);
  tagline.position.set(width / 2, height * 0.52 + 44);

  screen.addChild(bg, bestie.view, title, tagline);
  return screen;
}

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
