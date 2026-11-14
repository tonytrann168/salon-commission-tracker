import type { SpeakOptions, VoiceIO } from './voice';
import { VOICE_CAST } from './voice-cast';

/**
 * Story 037: natural voices. Wraps the browser voice: a client's line is asked from /api/tts (Azure neural voices, in
 * the tone of the line) and played; when the server has no voice service, is slow, or fails, the browser's own voice
 * speaks exactly as before. Only client lines go to the server (a line without a clientId, such as the player's own
 * line in practice, always uses the browser voice). Answers are kept in a small cache.
 */

const ENDPOINT = '/api/tts';
const TIMEOUT_MS = 6000;
/** A very short silent WAV: played inside the first tap so iPhone lets later lines play from the same element. */
const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

export interface AudioLike {
  src: string;
  onended: (() => void) | null;
  onerror: (() => void) | null;
  play(): Promise<void>;
  pause(): void;
}

export interface NaturalVoiceHost {
  fetch: typeof fetch;
  createAudio: () => AudioLike;
}

export function withNaturalVoice(io: VoiceIO, host: NaturalVoiceHost, maxCache: number = VOICE_CAST.limits.browserCacheEntries): VoiceIO {
  let enabled = true;
  let failures = 0;
  let turn = 0;
  let audio: AudioLike | null = null;
  let finish: (() => void) | null = null;
  const cache = new Map<string, string>();
  const player = (): AudioLike => (audio ??= host.createAudio());

  const fetchAudio = async (text: string, options: SpeakOptions): Promise<string | null> => {
    const key = `${options.clientId}|${options.emotion ?? 'neutral'}|${options.level}|${text}`;
    const cached = cache.get(key);
    if (cached) return cached;
    let response: Response;
    let body: { audio?: unknown; mime?: unknown; error?: { code?: string } } | null;
    try {
      response = await host.fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, clientId: options.clientId, level: options.level, ...(options.emotion ? { emotion: options.emotion } : {}) }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      body = (await response.json()) as typeof body;
    } catch {
      failures += 1;
      if (failures >= 3) enabled = false;
      return null;
    }
    if (!response.ok || typeof body?.audio !== 'string' || body.audio === '') {
      // Not set up on the server (or no audio in the answer): stop asking for this visit.
      if (body?.error?.code === 'not_configured' || response.ok) enabled = false;
      else if (++failures >= 3) enabled = false;
      return null;
    }
    failures = 0;
    const url = `data:${typeof body.mime === 'string' ? body.mime : 'audio/mpeg'};base64,${body.audio}`;
    cache.set(key, url);
    if (cache.size > maxCache) cache.delete(cache.keys().next().value as string);
    return url;
  };

  const stopAudio = (): void => {
    audio?.pause();
    finish?.();
    finish = null;
  };

  return {
    canListen: io.canListen,
    canSpeak: io.canSpeak,
    listen: (onPartial) => io.listen(onPartial),
    async speak(text, options) {
      if (!enabled || !options.clientId) return io.speak(text, options);
      const mine = ++turn;
      stopAudio();
      io.cancelSpeech();
      const url = await fetchAudio(text, options);
      // A newer line (or a cancel) came while waiting: this one stays silent.
      if (mine !== turn) return;
      if (!url) return io.speak(text, options);
      await new Promise<void>((resolve) => {
        const a = player();
        finish = resolve;
        a.onended = () => resolve();
        a.onerror = () => resolve();
        a.src = url;
        a.play().catch(() => {
          // Blocked or broken audio: the browser voice says the line instead.
          finish = null;
          void io.speak(text, options).then(resolve);
        });
      });
    },
    cancelSpeech() {
      turn += 1;
      stopAudio();
      io.cancelSpeech();
    },
    unlock() {
      io.unlock();
      if (!enabled) return;
      try {
        const a = player();
        a.src = SILENCE;
        void a.play().catch(() => undefined);
      } catch {
        // No audio element here: the browser voice is used.
      }
    },
  };
}
