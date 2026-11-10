import { t } from '../i18n';
import { el } from './dom';

/**
 * The chat follows the conversation (owner playtest 2026-11-10): new client and player lines, translations, the typing
 * indicator and the letter-by-letter reveal all keep the newest line in view. If the player scrolls up to reread,
 * following pauses and a "New message ↓" pill appears; tapping it (or scrolling back to the bottom) resumes.
 * The decisions are pure (`followReducer`) so they are unit-tested; `createScrollFollower` wires them to the DOM.
 */

/** How close to the bottom (px) still counts as "at the bottom". */
export const NEAR_BOTTOM_PX = 24;

export interface FollowState {
  /** Keep scrolling to the newest line. */
  following: boolean;
  /** New content arrived while paused: show the pill. */
  unseen: boolean;
}

export type FollowEvent =
  /** Something in the list changed (a line, a translation, the reveal, typing) or the list was resized. */
  | { type: 'content' }
  /** The list scrolled. `byUser` is true only for the player's own scrolling (wheel, touch, keys, scrollbar). */
  | { type: 'scroll'; nearBottom: boolean; movedUp: boolean; byUser: boolean }
  /** The player tapped the pill. */
  | { type: 'jump' };

export interface FollowResult {
  state: FollowState;
  /** Scroll to the bottom now. */
  scrollToBottom: boolean;
}

export const INITIAL_FOLLOW: FollowState = { following: true, unseen: false };

export function followReducer(state: FollowState, event: FollowEvent): FollowResult {
  switch (event.type) {
    case 'content':
      return state.following ? { state, scrollToBottom: true } : { state: { following: false, unseen: true }, scrollToBottom: false };
    case 'jump':
      return { state: { following: true, unseen: false }, scrollToBottom: true };
    case 'scroll':
      // Back at the bottom (by any means): follow again and drop the pill.
      if (event.nearBottom) return { state: { following: true, unseen: false }, scrollToBottom: false };
      // Only the player's own upward scroll pauses following; the game's own scrolling never does.
      if (event.byUser && event.movedUp) return { state: { following: false, unseen: state.unseen }, scrollToBottom: false };
      return { state, scrollToBottom: false };
  }
}

/** How long after a wheel, touch, key or pointer press a scroll still counts as the player's. */
const USER_INPUT_MS = 600;

/**
 * Wire the follower to a scrolling list. `pill` is mounted by the caller next to the list (positioned over its
 * bottom). Returns `destroy`.
 */
export function createScrollFollower(list: HTMLElement, options: { reducedMotion: () => boolean }): { pill: HTMLButtonElement; destroy: () => void } {
  let state = INITIAL_FOLLOW;
  let lastTop = list.scrollTop;
  let lastUserInput = -Infinity;
  const pill = el('button', 'new-message-pill hidden', t('chat.newMessage'));
  pill.type = 'button';

  const nearBottom = (): boolean => list.scrollHeight - list.scrollTop - list.clientHeight <= NEAR_BOTTOM_PX;
  const toBottom = (smooth: boolean): void => {
    list.scrollTo({ top: list.scrollHeight, behavior: smooth && !options.reducedMotion() ? 'smooth' : 'auto' });
  };
  const apply = (event: FollowEvent, smooth = true): void => {
    const result = followReducer(state, event);
    state = result.state;
    if (result.scrollToBottom) toBottom(smooth);
    pill.classList.toggle('hidden', !state.unseen);
  };

  const markUserInput = (): void => {
    lastUserInput = performance.now();
  };
  const onKey = (event: KeyboardEvent): void => {
    if (['ArrowUp', 'PageUp', 'Home', 'ArrowDown', 'PageDown', 'End', ' '].includes(event.key)) markUserInput();
  };
  const onScroll = (): void => {
    const top = list.scrollTop;
    apply({ type: 'scroll', nearBottom: nearBottom(), movedUp: top < lastTop - 1, byUser: performance.now() - lastUserInput < USER_INPUT_MS }, false);
    lastTop = top;
  };
  // Every change inside the list: new bubbles (the log is rebuilt), the reveal's text, translations, typing dots.
  const mutations = new MutationObserver(() => apply({ type: 'content' }));
  mutations.observe(list, { childList: true, subtree: true, characterData: true });
  // The list itself changing size: phone keyboard, rotation, the whisper or results opening.
  const resize = new ResizeObserver(() => apply({ type: 'content' }, false));
  resize.observe(list);

  pill.addEventListener('click', () => apply({ type: 'jump' }));
  list.addEventListener('scroll', onScroll, { passive: true });
  list.addEventListener('wheel', markUserInput, { passive: true });
  list.addEventListener('touchmove', markUserInput, { passive: true });
  list.addEventListener('pointerdown', markUserInput);
  list.addEventListener('keydown', onKey);

  return {
    pill,
    destroy() {
      mutations.disconnect();
      resize.disconnect();
      list.removeEventListener('scroll', onScroll);
      list.removeEventListener('wheel', markUserInput);
      list.removeEventListener('touchmove', markUserInput);
      list.removeEventListener('pointerdown', markUserInput);
      list.removeEventListener('keydown', onKey);
    },
  };
}

/**
 * Keep a full-screen panel the size of the visible area when a phone keyboard opens (iOS keeps the layout viewport,
 * so a fixed panel would hide its reply box behind the keyboard). Returns `destroy`.
 */
/** Below this visible height the chat folds its portrait strip away (see `.chat-panel.compact`). */
export const COMPACT_BELOW_PX = 420;

export function fitToVisualViewport(panel: HTMLElement): () => void {
  const viewport = window.visualViewport;
  if (!viewport) return () => undefined;
  const fit = (): void => {
    panel.style.height = `${viewport.height}px`;
    // A short visible area (keyboard open on a small phone): fold the portraits away so the reply box still fits.
    panel.classList.toggle('compact', viewport.height < COMPACT_BELOW_PX);
    panel.style.transform = viewport.offsetTop > 0 ? `translateY(${viewport.offsetTop}px)` : '';
  };
  fit();
  viewport.addEventListener('resize', fit);
  viewport.addEventListener('scroll', fit);
  return () => {
    viewport.removeEventListener('resize', fit);
    viewport.removeEventListener('scroll', fit);
    panel.style.height = '';
    panel.style.transform = '';
    panel.classList.remove('compact');
  };
}
