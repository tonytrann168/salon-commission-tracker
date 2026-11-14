import { describe, expect, it, vi } from 'vitest';
import { VOICE_SEND, createSendCountdown } from '../game/voice-send';

/** Story 046: spoken words wait a moment so a mis-heard line can be fixed. */

const fakeTimers = () => {
  const queue = new Map<number, () => void>();
  let n = 0;
  return { queue, set: (fn: () => void) => (queue.set(++n, fn), n), clear: (id: unknown) => void queue.delete(id as number), fire: () => [...queue.entries()].forEach(([id, fn]) => (queue.delete(id), fn())) };
};

describe('send countdown after speaking', () => {
  it('sends once when the time runs out (about 3 seconds)', () => {
    expect(VOICE_SEND.countdownMs).toBe(3000);
    const timers = fakeTimers();
    const send = vi.fn();
    const states: boolean[] = [];
    const c = createSendCountdown(send, (r) => states.push(r), 3000, timers);
    c.start();
    expect(c.running).toBe(true);
    timers.fire();
    expect(send).toHaveBeenCalledTimes(1);
    expect(c.running).toBe(false);
    expect(states).toEqual([true, false]);
  });

  it('tapping the box (cancel) never sends', () => {
    const timers = fakeTimers();
    const send = vi.fn();
    const c = createSendCountdown(send, () => undefined, 3000, timers);
    c.start();
    c.cancel();
    timers.fire();
    expect(send).not.toHaveBeenCalled();
    expect(c.running).toBe(false);
  });

  it('Send sends at once and only once; speaking again restarts the wait', () => {
    const timers = fakeTimers();
    const send = vi.fn();
    const c = createSendCountdown(send, () => undefined, 3000, timers);
    c.start();
    c.sendNow();
    timers.fire();
    expect(send).toHaveBeenCalledTimes(1);
    c.start();
    c.start();
    expect(timers.queue.size).toBe(1);
  });
});
