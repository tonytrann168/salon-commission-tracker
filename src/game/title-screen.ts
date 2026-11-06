import { Container, Graphics, Text } from 'pixi.js';

export const GAME_TITLE = 'Salon Besties';
export const TAGLINE = 'Work the chair for real.';

/** Placeholder title screen until the first story replaces it. */
export function createTitleScreen(width: number, height: number): Container {
  const screen = new Container();
  screen.label = 'title-screen';

  const bg = new Graphics().rect(0, 0, width, height).fill(0xfff4f8);
  const polish = new Graphics()
    .roundRect(width / 2 - 28, height * 0.28, 56, 90, 14)
    .fill(0xff5c9a)
    .roundRect(width / 2 - 16, height * 0.28 - 40, 32, 44, 8)
    .fill(0x3b2a33);

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

  screen.addChild(bg, polish, title, tagline);
  return screen;
}
