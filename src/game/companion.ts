import { BESTIE_CONFIG } from './bestie';

/**
 * The player's companion (Mai by default). Story 013 lets the player pick her or his look and rename them; until then
 * this returns the configured name. Everything that shows the companion's name asks here.
 */
export function companionName(): string {
  return BESTIE_CONFIG.name;
}

/** How the companion says "I" in Vietnamese, capitalised for the start of a sentence (Chị for Mai; Anh for a male companion, story 013). */
export function companionSelf(): string {
  return 'Chị';
}
