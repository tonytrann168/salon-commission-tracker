import { moodDeltaAfterEnglishRule } from './english-level';
import { applyMoodDelta, clampMood, isWalkOut } from './mood';
import { PHASES } from './types';
import type { AppointmentResult, ClientPersona, EnglishLevel, Message, Outcome, Phase, TakeTurn } from './types';

/** Appointment state machine. Story: story-001 (design/game-brief.md, MVP feature 1). */

export type AppointmentStatus = 'awaiting_player' | 'waiting' | 'error' | 'finished';

/** Immutable view of the appointment for the UI. */
export interface AppointmentSnapshot {
  status: AppointmentStatus;
  phase: Phase;
  mood: number;
  transcript: readonly Message[];
  moodHistory: readonly number[];
  /** Player message sent but not yet answered (shown while waiting or after an error). */
  pendingPlayerMessage: string | null;
  /** Set when status is `error`; `retry()` resends the pending message. */
  error: Error | null;
  /** Set when status is `finished`. */
  result: AppointmentResult | null;
}

export interface AppointmentOptions {
  client: ClientPersona;
  takeTurn: TakeTurn;
  /** The player's English level: at Beginner and Some English mistakes never lower the mood (story 010). */
  level: EnglishLevel;
  /** Called once when the appointment ends (story 002 consumes this). */
  onFinished: (result: AppointmentResult) => void;
}

export interface Appointment {
  getSnapshot(): AppointmentSnapshot;
  /** Listen for state changes. Returns an unsubscribe function. */
  subscribe(listener: (snapshot: AppointmentSnapshot) => void): () => void;
  /** Send the player's message. `helped` marks a line written with Help me say it. Ignored unless the client is waiting for the player. */
  send(text: string, options?: { helped?: boolean }): Promise<void>;
  /** Resend the message whose turn failed. Ignored unless status is `error`. */
  retry(): Promise<void>;
  /**
   * A game-side mood change outside a turn (story 005: the client sees her finished nails). Clamped to 1-100 so the
   * nails alone never make her walk out; ignored once the appointment is over.
   */
  adjustMood(delta: number): void;
}

/**
 * The game, not the model, owns the phase: it never goes backwards and
 * advances at most one step per turn.
 */
export function nextPhase(current: Phase, proposed: Phase): Phase {
  const from = PHASES.indexOf(current);
  const to = PHASES.indexOf(proposed);
  return PHASES[Math.min(Math.max(to, from), from + 1)] ?? current;
}

/** Create an appointment that starts in consultation with the client's opening line. */
export function createAppointment(options: AppointmentOptions): Appointment {
  const { client, takeTurn, level, onFinished } = options;
  const listeners = new Set<(snapshot: AppointmentSnapshot) => void>();

  let status: AppointmentStatus = 'awaiting_player';
  let phase: Phase = 'consultation';
  let mood = clampMood(client.startingMood);
  let transcript: Message[] = [{ role: 'client', content: client.openingLine }];
  let moodHistory: number[] = [mood];
  let pending: string | null = null;
  let pendingHelped = false;
  let error: Error | null = null;
  let result: AppointmentResult | null = null;

  const getSnapshot = (): AppointmentSnapshot => ({
    status,
    phase,
    mood,
    transcript: [...transcript],
    moodHistory: [...moodHistory],
    pendingPlayerMessage: pending,
    error,
    result,
  });

  const notify = (): void => {
    const snapshot = getSnapshot();
    listeners.forEach((listener) => listener(snapshot));
  };

  const runTurn = async (playerText: string, helped: boolean): Promise<void> => {
    pending = playerText;
    pendingHelped = helped;
    error = null;
    status = 'waiting';
    notify();

    const candidate: Message[] = [...transcript, { role: 'player', content: playerText, ...(helped ? { helped: true } : {}) }];
    let turn;
    try {
      turn = await takeTurn(candidate, phase, mood);
    } catch (caught) {
      // State is untouched so the same message can be retried.
      error = caught instanceof Error ? caught : new Error(String(caught));
      status = 'error';
      notify();
      return;
    }

    transcript = [...candidate, { role: 'client', content: turn.reply }];
    // Story 006: each client reacts more or less strongly (moodSensitivity up for raises, down for drops).
    const delta = moodDeltaAfterEnglishRule(turn, level, helped);
    mood = applyMoodDelta(mood, delta * (delta > 0 ? client.moodSensitivity.up : client.moodSensitivity.down));
    moodHistory = [...moodHistory, mood];
    phase = nextPhase(phase, turn.phase);
    pending = null;

    // Walking out takes priority over completing checkout on the same turn.
    const outcome: Outcome | null = isWalkOut(mood) ? 'walked_out' : phase === 'done' ? 'completed' : null;
    if (outcome) {
      status = 'finished';
      result = { outcome, transcript: [...transcript], moodHistory: [...moodHistory] };
      notify();
      onFinished(result);
      return;
    }
    status = 'awaiting_player';
    notify();
  };

  return {
    getSnapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async send(text, sendOptions) {
      const trimmed = text.trim();
      if (status !== 'awaiting_player' || trimmed === '') return;
      await runTurn(trimmed, sendOptions?.helped === true);
    },
    async retry() {
      if (status !== 'error' || pending === null) return;
      await runTurn(pending, pendingHelped);
    },
    adjustMood(delta) {
      if (status === 'finished' || delta === 0) return;
      mood = Math.max(1, applyMoodDelta(mood, delta));
      moodHistory = [...moodHistory, mood];
      notify();
    },
  };
}
