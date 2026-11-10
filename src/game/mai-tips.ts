import type { BestieLanguage } from './bestie';
import type { Phrase } from './learning/corrections';

/**
 * Mai's waiting tips (owner, 2026-11-10: Mai is an on-demand bubble, not a fixer). Live line corrections are still
 * checked in the background with the same per-appointment cap, but they wait here; the bubble shows a badge until
 * the player opens Mai. Pure, so it is unit-tested.
 */

export interface Tip {
  praise: string;
  said: string;
  better: Phrase;
  reason: string;
  language: BestieLanguage;
}

export interface TipQueue {
  tips: Tip[];
  /** How many of `tips` the player has not opened yet (the badge number). */
  unseen: number;
}

export const EMPTY_TIPS: TipQueue = { tips: [], unseen: 0 };

/** Queue a tip unless the appointment's cap is reached. */
export function addTip(queue: TipQueue, tip: Tip, cap: number): TipQueue {
  if (queue.tips.length >= cap) return queue;
  return { tips: [...queue.tips, tip], unseen: queue.unseen + 1 };
}

/** The player opened Mai: every waiting tip is now seen (the badge goes away). Returns the tips that were new. */
export function openTips(queue: TipQueue): { queue: TipQueue; fresh: Tip[] } {
  return { queue: { tips: queue.tips, unseen: 0 }, fresh: queue.tips.slice(queue.tips.length - queue.unseen) };
}
