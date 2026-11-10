/**
 * Sound events (story 012): game and UI code announce what happened; the audio engine (audio.ts) listens and plays
 * the matching sound. Nothing else holds a reference to the audio engine, and with no engine listening (tests, a
 * phone without Web Audio) an event is simply ignored.
 */

export const SOUND_EVENTS = ['send', 'moodUp', 'moodDown', 'stars', 'tip', 'levelUp', 'whisper', 'phraseSaved'] as const;
export type SoundEvent = (typeof SOUND_EVENTS)[number];

export const SOUND_EVENT_NAME = 'salon:sound';

/** Announce a game event that has a sound. Safe anywhere: does nothing outside a browser. */
export function emitSound(event: SoundEvent): void {
  if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') return;
  window.dispatchEvent(new CustomEvent<SoundEvent>(SOUND_EVENT_NAME, { detail: event }));
}
