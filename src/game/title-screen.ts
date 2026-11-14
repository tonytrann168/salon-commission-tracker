import { Container, Graphics, Text } from 'pixi.js';
import { companionPortraitId, createPortrait } from './portraits/definitions';
import { loadCompanion } from './companion';
import { t } from './i18n';

export const GAME_TITLE = 'Salon Besties';

/** Placeholder title screen: the bestie's portrait, title and tagline. */
export function createTitleScreen(width: number, height: number): Container {
  const screen = new Container();
  screen.label = 'title-screen';

  const bg = new Graphics().rect(0, 0, width, height).fill(0xfff4f8);
  // Bestie above the title: sized to the space over the title text so nothing overlaps on small phones.
  const bestieSize = Math.min(width * 0.6, height * 0.3);
  const bestie = createPortrait(companionPortraitId(loadCompanion().gender), bestieSize, 'delighted');
  bestie.view.position.set((width - bestieSize) / 2, height * 0.27 - bestieSize / 2);

  const title = new Text({
    text: GAME_TITLE,
    style: { fontFamily: 'system-ui, sans-serif', fontSize: 40, fontWeight: '800', fill: 0x3b2a33 },
  });
  title.anchor.set(0.5);
  title.position.set(width / 2, height * 0.52);

  // Story 042: the tagline is plain HTML in the title menu now (it rotates, and follows the language switch).
  screen.addChild(bg, bestie.view, title);
  return screen;
}
