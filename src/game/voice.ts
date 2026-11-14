import { readStored, writeStored } from './safe-storage';
import { browserProsody, pinVoice } from './voice-cast';
import type { Emotion, VoiceGender } from './voice-cast';
import voiceJson from './config/voice.json';
import { editDistance, normalizeForMatch } from './english-level';
import { ENGLISH_LEVELS } from './types';
import type { EnglishLevel } from './types';

/**
 * Voice in and out (story 004, design/game-brief.md MVP feature 1): the phone's own speech recognition and speech
 * synthesis (Web Speech API), so there is no voice key and no cost. Everything that touches the browser sits behind
 * `VoiceIO`, so a paid server provider can replace it later without the UI changing.
 * Pure parts (config, voice choice, the pronunciation word check) are exported for tests.
 */

export interface ClientVoice {
  pitch: number;
  /** Voice names to look for, best first. The first one the phone has wins. */
  preferredVoices: string[];
}

export interface VoiceConfig {
  lang: string;
  /** Speaking rate per English level: slower and clearer at Beginner, natural at Fluent. */
  rateByLevel: Record<EnglishLevel, number>;
  clients: Record<string, ClientVoice>;
  defaultClient: ClientVoice;
  /** Stop listening after this long with no result. */
  listenTimeoutMs: number;
  /** Words of at least `longWordLetters` letters still count as heard with up to `longWordTypos` letters off. */
  pronunciation: { longWordLetters: number; longWordTypos: number };
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Validate the raw voice file. Throws a clear `voice.json: ...` error when it is malformed. */
export function parseVoiceConfig(raw: unknown): VoiceConfig {
  const fail = (problem: string): never => {
    throw new Error(`voice.json: ${problem}`);
  };
  const object = (value: unknown, path: string): Record<string, unknown> => (isRecord(value) ? value : fail(`"${path}" must be an object`));
  const number = (value: unknown, path: string, min: number, max: number): number =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : fail(`"${path}" must be a number from ${min} to ${max}`);
  const clientVoice = (value: unknown, path: string): ClientVoice => {
    const entry = object(value, path);
    const names = Array.isArray(entry.preferredVoices) ? entry.preferredVoices : fail(`"${path}.preferredVoices" must be a list`);
    if (!names.every((name) => typeof name === 'string')) fail(`"${path}.preferredVoices" must be names`);
    return { pitch: number(entry.pitch, `${path}.pitch`, 0.5, 2), preferredVoices: names as string[] };
  };
  const root = object(raw, 'root');
  if (typeof root.lang !== 'string' || root.lang === '') fail('"lang" must be a language tag');
  const rates = object(root.rateByLevel, 'rateByLevel');
  const clients = object(root.clients, 'clients');
  const pronunciation = object(root.pronunciation, 'pronunciation');
  return {
    lang: root.lang as string,
    rateByLevel: Object.fromEntries(ENGLISH_LEVELS.map((level) => [level, number(rates[level], `rateByLevel.${level}`, 0.5, 2)])) as Record<EnglishLevel, number>,
    clients: Object.fromEntries(Object.entries(clients).map(([id, value]) => [id, clientVoice(value, `clients.${id}`)])),
    defaultClient: clientVoice(root.defaultClient, 'defaultClient'),
    listenTimeoutMs: number(root.listenTimeoutMs, 'listenTimeoutMs', 2000, 60000),
    pronunciation: {
      longWordLetters: number(pronunciation.longWordLetters, 'pronunciation.longWordLetters', 2, 20),
      longWordTypos: number(pronunciation.longWordTypos, 'pronunciation.longWordTypos', 0, 3),
    },
  };
}

export const VOICE_CONFIG: VoiceConfig = parseVoiceConfig(voiceJson);

/** The client's voice settings, or the default for a client with none. */
export const clientVoiceFor = (clientId: string, config: VoiceConfig = VOICE_CONFIG): ClientVoice => config.clients[clientId] ?? config.defaultClient;

const PINNED_KEY = 'salon.voices.v1';
/** Story 037: the browser voice each character keeps on this device ({ characterId: voice name }). */
export function loadPinnedVoices(): Record<string, string> {
  try {
    const d = JSON.parse(readStored(PINNED_KEY) ?? '{}') as Record<string, unknown>;
    return Object.fromEntries(Object.entries(d).filter(([, v]) => typeof v === 'string')) as Record<string, string>;
  } catch {
    return {};
  }
}
export const savePinnedVoices = (pinned: Record<string, string>): void => writeStored(PINNED_KEY, JSON.stringify(pinned));

/** A voice the phone offers (the parts of SpeechSynthesisVoice we use). */
export interface AvailableVoice {
  name: string;
  lang: string;
}

/**
 * Pick the client's voice: the first preferred name the phone has (matched by start of name, so "Samantha" finds
 * "Samantha (Enhanced)"), else the first voice in the right language, else the first English voice, else none.
 */
export function pickVoice<V extends AvailableVoice>(voices: readonly V[], preferred: readonly string[], lang: string): V | null {
  for (const name of preferred) {
    const found = voices.find((voice) => voice.name.toLowerCase().startsWith(name.toLowerCase()) && voice.lang.toLowerCase().startsWith('en'));
    if (found) return found;
  }
  const want = lang.toLowerCase().replace('_', '-');
  return voices.find((voice) => voice.lang.toLowerCase().replace('_', '-') === want) ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ?? null;
}

/** One word of the target line and whether the recogniser heard it. */
export interface WordCheck {
  /** The word as written in the target line (with its punctuation). */
  word: string;
  heard: boolean;
}

/**
 * The free word-level pronunciation check: which words of `target` the speech recogniser heard, in order. Uses the
 * longest in-order match, so a skipped or misheard word does not knock out the words after it. Case and punctuation
 * are ignored; long words may be a letter off (config). This says what was recognised, not how each sound was made.
 */
export function checkPronunciation(target: string, heard: string, config: VoiceConfig = VOICE_CONFIG): WordCheck[] {
  const shown = target.trim().split(/\s+/).filter((word) => word !== '');
  const want = shown.map((word) => normalizeForMatch(word));
  const got = normalizeForMatch(heard).split(' ').filter((word) => word !== '');
  const same = (a: string, b: string): boolean =>
    a === b || (a.length >= config.pronunciation.longWordLetters && editDistance(a, b) <= config.pronunciation.longWordTypos);
  // Longest common subsequence table, then walk back to mark which target words were matched.
  const table = Array.from({ length: want.length + 1 }, () => new Array<number>(got.length + 1).fill(0));
  for (let i = want.length - 1; i >= 0; i--) {
    for (let j = got.length - 1; j >= 0; j--) {
      const row = table[i] as number[];
      row[j] = same(want[i] as string, got[j] as string) ? ((table[i + 1] as number[])[j + 1] as number) + 1 : Math.max((table[i + 1] as number[])[j] as number, row[j + 1] as number);
    }
  }
  const heardFlags = new Array<boolean>(want.length).fill(false);
  let i = 0;
  let j = 0;
  while (i < want.length && j < got.length) {
    if (same(want[i] as string, got[j] as string)) {
      heardFlags[i] = true;
      i++;
      j++;
    } else if (((table[i + 1] as number[])[j] as number) >= ((table[i] as number[])[j + 1] as number)) i++;
    else j++;
  }
  // A word with no letters or digits (a lone dash) is never asked for.
  return shown.map((word, index) => ({ word, heard: want[index] === '' || (heardFlags[index] as boolean) }));
}

/** Why listening stopped without a result. */
export type ListenFailure = 'unsupported' | 'blocked' | 'no-speech' | 'failed';

export class VoiceError extends Error {
  readonly reason: ListenFailure;
  constructor(reason: ListenFailure) {
    super(`Voice: ${reason}`);
    this.name = 'VoiceError';
    this.reason = reason;
  }
}

/** Everything the game asks of a voice service. */
export interface SpeakOptions {
  clientId?: string;
  level: EnglishLevel;
  /** Story 037: the character's gender, for a fitting voice (default female). */
  gender?: VoiceGender;
  /** Story 038: how the line should sound (from the client turn or the mood). */
  emotion?: Emotion;
}

export interface VoiceIO {
  canListen: boolean;
  canSpeak: boolean;
  /**
   * Listen once. `onPartial` gets the words heard so far. Resolves with the final text; rejects with VoiceError.
   * `stop()` ends listening early and resolves with what was heard (or rejects with no-speech).
   */
  listen(onPartial?: (text: string) => void): { result: Promise<string>; stop: () => void };
  /** Speak a line. Resolves when it is done (or cancelled). Never rejects. */
  speak(text: string, options: SpeakOptions): Promise<void>;
  /** Stop speaking at once. */
  cancelSpeech(): void;
  /**
   * Call inside the player's first tap (Start appointment, the mic). iPhone Safari only lets speech start from a user
   * gesture; one silent, empty line there lets the client's later lines play. Safe to call again: it runs once.
   * (The iPhone's silent switch still mutes the client's voice.)
   */
  unlock(): void;
}

/** The parts of the browser this needs, so tests can pass fakes. */
export interface SpeechHost {
  SpeechRecognition?: new () => BrowserRecognition;
  webkitSpeechRecognition?: new () => BrowserRecognition;
  speechSynthesis?: {
    getVoices(): AvailableVoice[];
    speak(utterance: unknown): void;
    cancel(): void;
  };
  SpeechSynthesisUtterance?: new (text: string) => BrowserUtterance;
  setTimeout: (handler: () => void, ms: number) => unknown;
  clearTimeout: (id: never) => void;
}

interface BrowserRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface BrowserUtterance {
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
  voice: unknown;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

/** The Web Speech adapter. Mic permission is asked by the browser on the first listen (a user tap). */
export function createBrowserVoice(host: SpeechHost, config: VoiceConfig = VOICE_CONFIG): VoiceIO {
  const Recognition = host.SpeechRecognition ?? host.webkitSpeechRecognition;
  const synth = host.speechSynthesis;
  const Utterance = host.SpeechSynthesisUtterance;
  let unlocked = false;

  return {
    canListen: Recognition !== undefined,
    canSpeak: synth !== undefined && Utterance !== undefined,

    listen(onPartial) {
      if (!Recognition) return { result: Promise.reject(new VoiceError('unsupported')), stop: () => undefined };
      const recognition = new Recognition();
      recognition.lang = config.lang;
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;
      let finalText = '';
      let partialText = '';
      let failure: ListenFailure | null = null;
      let settle: ((text: string) => void) | null = null;
      let fail: ((error: VoiceError) => void) | null = null;
      const result = new Promise<string>((resolve, reject) => {
        settle = resolve;
        fail = reject;
      });
      const timer = host.setTimeout(() => recognition.stop(), config.listenTimeoutMs);
      recognition.onresult = (event) => {
        let interim = '';
        for (let index = event.resultIndex; index < event.results.length; index++) {
          const item = event.results[index];
          const text = item?.[0]?.transcript ?? '';
          if (item?.isFinal) finalText += text;
          else interim += text;
        }
        partialText = `${finalText}${interim}`.trim();
        onPartial?.(partialText);
      };
      recognition.onerror = (event) => {
        failure = event.error === 'not-allowed' || event.error === 'service-not-allowed' ? 'blocked' : event.error === 'no-speech' || event.error === 'aborted' ? 'no-speech' : 'failed';
      };
      recognition.onend = () => {
        host.clearTimeout(timer as never);
        const text = (finalText.trim() || partialText).trim();
        if (text !== '') settle?.(text);
        else fail?.(new VoiceError(failure ?? 'no-speech'));
      };
      try {
        recognition.start();
      } catch {
        host.clearTimeout(timer as never);
        return { result: Promise.reject(new VoiceError('failed')), stop: () => undefined };
      }
      return { result, stop: () => recognition.stop() };
    },

    speak(text, options) {
      if (!synth || !Utterance) return Promise.resolve();
      const voice = clientVoiceFor(options.clientId ?? '', config);
      return new Promise<void>((resolve) => {
        const utterance = new Utterance(text);
        utterance.lang = config.lang;
        // Story 038: the mood shapes the voice (rate and pitch), within the level's pace.
        const prosody = browserProsody(config.rateByLevel[options.level], voice.pitch, options.emotion ?? 'neutral');
        utterance.rate = prosody.rate;
        utterance.pitch = prosody.pitch;
        // Story 037: one voice per character, kept for the appointment and across sessions.
        const key = options.clientId ?? 'default';
        const pinned = loadPinnedVoices();
        const picked = pinVoice(synth.getVoices(), key, options.gender ?? 'female', pinned, voice.preferredVoices);
        if (picked) {
          utterance.voice = picked;
          if (pinned[key] !== picked.name) savePinnedVoices({ ...pinned, [key]: picked.name });
        }
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        synth.cancel();
        synth.speak(utterance);
      });
    },

    cancelSpeech() {
      synth?.cancel();
    },

    unlock() {
      if (unlocked || !synth || !Utterance) return;
      unlocked = true;
      const silent = new Utterance('');
      silent.volume = 0;
      synth.speak(silent);
    },
  };
}

/**
 * Wrap a VoiceIO so `onSpeaking(true)` fires while anything is being spoken and `onSpeaking(false)` once all speech
 * has ended (story 012: the music ducks under the client). Counts overlapping lines, so a line cut off by the next
 * one never brings the music back mid-sentence.
 */
export function withSpeakingSignal(io: VoiceIO, onSpeaking: (speaking: boolean) => void): VoiceIO {
  let active = 0;
  return {
    get canListen() {
      return io.canListen;
    },
    get canSpeak() {
      return io.canSpeak;
    },
    listen: (onPartial) => io.listen(onPartial),
    speak(text, options) {
      active++;
      onSpeaking(true);
      return io.speak(text, options).finally(() => {
        active = Math.max(0, active - 1);
        if (active === 0) onSpeaking(false);
      });
    },
    cancelSpeech: () => io.cancelSpeech(),
    unlock: () => io.unlock(),
  };
}
