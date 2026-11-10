import { describe, expect, it } from 'vitest';
import { INITIAL_FOLLOW, followReducer } from '../game/ui/scroll-follow';
import type { FollowEvent, FollowState } from '../game/ui/scroll-follow';

/** Chat auto-scroll (owner playtest 2026-11-10): follow the conversation, pause while the player rereads. */

const run = (events: FollowEvent[], start: FollowState = INITIAL_FOLLOW) =>
  events.reduce(
    (acc, event) => {
      const result = followReducer(acc.state, event);
      return { state: result.state, scrolls: [...acc.scrolls, result.scrollToBottom] };
    },
    { state: start, scrolls: [] as boolean[] },
  );

const userScrollUp: FollowEvent = { type: 'scroll', nearBottom: false, movedUp: true, byUser: true };

describe('chat follows the conversation', () => {
  it('scrolls to the newest line on every change while following', () => {
    const { state, scrolls } = run([{ type: 'content' }, { type: 'content' }, { type: 'content' }]);
    expect(scrolls).toEqual([true, true, true]);
    expect(state).toEqual({ following: true, unseen: false });
  });

  it("never pauses for the game's own scrolling or for downward scrolling", () => {
    const { state } = run([
      { type: 'scroll', nearBottom: false, movedUp: true, byUser: false },
      { type: 'scroll', nearBottom: false, movedUp: false, byUser: true },
    ]);
    expect(state.following).toBe(true);
  });

  it('pauses when the player scrolls up, and shows the pill when something new arrives instead of yanking them down', () => {
    const { state, scrolls } = run([userScrollUp, { type: 'content' }, { type: 'content' }]);
    expect(scrolls).toEqual([false, false, false]);
    expect(state).toEqual({ following: false, unseen: true });
  });

  it('pausing alone shows no pill until something new arrives', () => {
    expect(run([userScrollUp]).state).toEqual({ following: false, unseen: false });
  });

  it('tapping the pill jumps to the bottom and resumes following', () => {
    const { state, scrolls } = run([userScrollUp, { type: 'content' }, { type: 'jump' }, { type: 'content' }]);
    expect(scrolls).toEqual([false, false, true, true]);
    expect(state).toEqual({ following: true, unseen: false });
  });

  it('scrolling back to the bottom by hand also resumes following and hides the pill', () => {
    const { state, scrolls } = run([userScrollUp, { type: 'content' }, { type: 'scroll', nearBottom: true, movedUp: false, byUser: true }, { type: 'content' }]);
    expect(state).toEqual({ following: true, unseen: false });
    expect(scrolls.at(-1)).toBe(true);
  });
});
