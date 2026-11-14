/**
 * Story 046: after the player speaks, the words wait a moment in the reply box so a mis-heard line can be fixed. A
 * countdown sends them unless the player taps the box, types, or speaks again. Pure (timers injected) for tests.
 */
export const VOICE_SEND = { countdownMs: 3000 } as const;

export interface SendCountdown {
  /** Start (or restart) the countdown; `onSend` runs once when it ends. */
  start(): void;
  /** Stop it: nothing is sent. */
  cancel(): void;
  /** Send now (the Send button): stops the countdown, runs `onSend` once. */
  sendNow(): void;
  readonly running: boolean;
}

export function createSendCountdown(
  onSend: () => void,
  onChange: (running: boolean) => void = () => undefined,
  ms: number = VOICE_SEND.countdownMs,
  timers: { set: (fn: () => void, ms: number) => unknown; clear: (id: unknown) => void } = { set: (fn, t) => setTimeout(fn, t), clear: (id) => clearTimeout(id as ReturnType<typeof setTimeout>) },
): SendCountdown {
  let id: unknown = null;
  const stop = (): boolean => {
    if (id === null) return false;
    timers.clear(id);
    id = null;
    onChange(false);
    return true;
  };
  return {
    start() {
      stop();
      id = timers.set(() => {
        id = null;
        onChange(false);
        onSend();
      }, ms);
      onChange(true);
    },
    cancel() {
      stop();
    },
    sendNow() {
      stop();
      onSend();
    },
    get running() {
      return id !== null;
    },
  };
}
