import { Container, Graphics, Text } from 'pixi.js';
import { createPortrait } from './portraits/definitions';
import { bilingual } from './ui/dom';
import { STRINGS } from './ui/strings';
import './ui/chat-panel.css';
import './ui/level-picker.css';

export const GAME_TITLE = 'Salon Besties';
export const TAGLINE = 'Work the chair for real.';

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
    text: TAGLINE,
    style: { fontFamily: 'system-ui, sans-serif', fontSize: 18, fill: 0x8a6575 },
  });
  tagline.anchor.set(0.5);
  tagline.position.set(width / 2, height * 0.52 + 44);

  screen.addChild(bg, bestie.view, title, tagline);
  return screen;
}

/** DOM menu over the title scene: Start and Settings (bilingual until story 008). Returns the element so the caller can remove it. */
export function createTitleMenu(host: HTMLElement, onStart: () => void, onSettings: () => void): HTMLElement {
  const menu = document.createElement('div');
  menu.className = 'title-menu';
  const start = document.createElement('button');
  start.type = 'button';
  start.className = 'chat-button';
  start.textContent = STRINGS.startAppointment;
  start.addEventListener('click', onStart);
  const settings = document.createElement('button');
  settings.type = 'button';
  settings.className = 'chat-button secondary';
  settings.append(bilingual(STRINGS.settings));
  settings.addEventListener('click', onSettings);
  menu.append(start, settings);
  host.appendChild(menu);
  return menu;
}
