import { bestieLevel, loadMemory, saveMemory } from '../bestie-memory';
import type { BestieMemory } from '../bestie-memory';
import { t } from '../i18n';
import { celebrate } from './celebration';

/**
 * Friendship (story 013): one number with the bestie level (story 003), raised by appointments, answered questions,
 * the daily hello and practice. A new level gets Mai's celebration card.
 */

/** The card for reaching a friendship level. */
export function celebrateFriendship(level: number, host: HTMLElement = document.body): void {
  celebrate(host, [{ icon: '💞', title: t('celebrate.friendship', { level }), line: t('celebrate.friendshipLine') }]);
}

/** Apply a change to the bestie memory (null = no change), save it, and celebrate a new friendship level. */
export function gainFriendship(change: (memory: BestieMemory) => BestieMemory | null): BestieMemory {
  const before = loadMemory();
  const after = change(before);
  if (!after) return before;
  saveMemory(after);
  const was = bestieLevel(before.xp);
  const now = bestieLevel(after.xp);
  if (now > was) celebrateFriendship(now);
  return after;
}
