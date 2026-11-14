import { describe, expect, it } from 'vitest';
import { GAME_TITLE, createTitleScreen } from '../game/title-screen';

describe('title screen', () => {
  it('names the game', () => {
    expect(GAME_TITLE).toBe('Salon Besties');
  });

  it('builds a screen container with background, bestie and title (the tagline is HTML since story 042)', () => {
    const screen = createTitleScreen(390, 844);
    expect(screen.label).toBe('title-screen');
    expect(screen.children).toHaveLength(3);
  });
});
