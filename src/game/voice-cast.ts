import castJson from './config/voice-cast.json';
import type { AvailableVoice } from './voice';

/**
 * Story 037/038: who sounds like what, and how a mood sounds. Pure and shared by the game and the server:
 * emotions (from the client turn's tag or the mood band), the pinned browser voice per character, the Azure neural
 * voice per client and for the companion. Data: config/voice-cast.json.
 */

export const EMOTIONS = ['excited', 'happy', 'neutral', 'sad', 'annoyed', 'angry'] as const;
export type Emotion = (typeof EMOTIONS)[number];
export const isEmotion = (value: unknown): value is Emotion => EMOTIONS.some((e) => e === value);

export type VoiceGender = 'female' | 'male';

export interface EmotionSound {
  /** Azure express-as style and degree. */
  style: string;
  degree: number;
  /** Browser fallback: rate is multiplied, pitch is added. */
  rate: number;
  pitch: number;
}

export interface VoiceCast {
  emotions: Record<Emotion, EmotionSound>;
  moodBands: { below: number; emotion: Emotion }[];
  browser: Record<VoiceGender, string[]>;
  azure: {
    female: string;
    male: string;
    clients: Record<string, string>;
    companion: Record<VoiceGender, { en: string; vi: string }>;
    outputFormat: string;
  };
  limits: { maxChars: number; serverCacheEntries: number; browserCacheEntries: number };
}

const VOICE_NAME = /^[a-z]{2}-[A-Z]{2}-[A-Za-z]+Neural$/;

export function parseVoiceCast(raw: unknown): VoiceCast {
  const c = raw as Partial<VoiceCast>;
  const fail = (what: string): never => {
    throw new Error(`voice-cast.json: ${what}`);
  };
  const emotions = {} as Record<Emotion, EmotionSound>;
  for (const emotion of EMOTIONS) {
    const e = c.emotions?.[emotion];
    if (!e || typeof e.style !== 'string' || !/^[a-z-]+$/.test(e.style) || !(e.degree >= 0.01 && e.degree <= 2) || !(e.rate >= 0.5 && e.rate <= 1.5) || !(e.pitch >= -0.5 && e.pitch <= 0.5)) fail(`emotions.${emotion} needs a style, a degree (0.01-2), a rate (0.5-1.5) and a pitch (-0.5 to 0.5)`);
    emotions[emotion] = e as EmotionSound;
  }
  const bands = Array.isArray(c.moodBands) ? c.moodBands : fail('"moodBands" must be a list');
  if (bands.length === 0 || !bands.every((b, i) => isEmotion(b?.emotion) && typeof b.below === 'number' && (i === 0 || b.below > (bands[i - 1] as { below: number }).below)) || (bands.at(-1) as { below: number }).below <= 100) fail('"moodBands" must rise and end above 100');
  const names = (list: unknown, name: string): string[] => (Array.isArray(list) && list.length > 0 && list.every((n) => typeof n === 'string' && n) ? (list as string[]) : fail(`"${name}" needs voice names`));
  const azureName = (value: unknown, name: string): string => (typeof value === 'string' && VOICE_NAME.test(value) ? value : fail(`"${name}" must be an Azure neural voice name`));
  const a = c.azure ?? fail('"azure" is missing');
  const companion = (g: VoiceGender) => ({ en: azureName(a.companion?.[g]?.en, `azure.companion.${g}.en`), vi: azureName(a.companion?.[g]?.vi, `azure.companion.${g}.vi`) });
  const limit = (n: unknown, name: string): number => (typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : fail(`"limits.${name}" must be a whole number`));
  return {
    emotions,
    moodBands: bands as VoiceCast['moodBands'],
    browser: { female: names(c.browser?.female, 'browser.female'), male: names(c.browser?.male, 'browser.male') },
    azure: {
      female: azureName(a.female, 'azure.female'),
      male: azureName(a.male, 'azure.male'),
      clients: Object.fromEntries(Object.entries(a.clients ?? {}).map(([id, v]) => [id, azureName(v, `azure.clients.${id}`)])),
      companion: { female: companion('female'), male: companion('male') },
      outputFormat: typeof a.outputFormat === 'string' && /^[a-z0-9-]+$/.test(a.outputFormat) ? a.outputFormat : fail('"azure.outputFormat" is missing'),
    },
    limits: { maxChars: limit(c.limits?.maxChars, 'maxChars'), serverCacheEntries: limit(c.limits?.serverCacheEntries, 'serverCacheEntries'), browserCacheEntries: limit(c.limits?.browserCacheEntries, 'browserCacheEntries') },
  };
}

export const VOICE_CAST: VoiceCast = parseVoiceCast(castJson);

/** How this line should sound: the client turn's own tag when it gave one, else the mood band. */
export function emotionFor(mood: number, tag: Emotion | undefined | null, cast: VoiceCast = VOICE_CAST): Emotion {
  if (tag && isEmotion(tag)) return tag;
  return (cast.moodBands.find((band) => mood < band.below) ?? cast.moodBands.at(-1))!.emotion;
}

/** Browser fallback: the level's rate and the client's pitch, shaped by the emotion (kept in the browser's range). */
export function browserProsody(baseRate: number, basePitch: number, emotion: Emotion, cast: VoiceCast = VOICE_CAST): { rate: number; pitch: number } {
  const e = cast.emotions[emotion];
  const clamp = (n: number, min: number, max: number): number => Math.round(Math.min(max, Math.max(min, n)) * 100) / 100;
  return { rate: clamp(baseRate * e.rate, 0.5, 2), pitch: clamp(basePitch + e.pitch, 0.5, 2) };
}

/** The Azure voice for a roster client (its own, or the default for its gender). */
export const azureVoiceFor = (clientId: string, gender: VoiceGender, cast: VoiceCast = VOICE_CAST): string => cast.azure.clients[clientId] ?? cast.azure[gender];

const hash = (text: string): number => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};

/**
 * The one browser voice a character keeps (story 037: the voice kept changing). The stored name wins while the phone
 * still has it. Otherwise: the English voices the phone has for this gender (by the preferred names), minus those
 * other characters already hold, picked by the character's id so it is the same every time; then any English voice.
 * Null only when the phone has no English voice at all (the browser's default speaks).
 */
export function pinVoice<V extends AvailableVoice>(voices: readonly V[], key: string, gender: VoiceGender, pinned: Readonly<Record<string, string>>, ownPreferred: readonly string[] = [], cast: VoiceCast = VOICE_CAST): V | null {
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  if (english.length === 0) return null;
  const stored = pinned[key];
  const kept = stored ? english.find((v) => v.name === stored) : undefined;
  if (kept) return kept;
  const starts = (v: V, name: string): boolean => v.name.toLowerCase().startsWith(name.toLowerCase());
  const taken = new Set(Object.entries(pinned).filter(([k]) => k !== key).map(([, name]) => name));
  const wanted = [...ownPreferred, ...cast.browser[gender]];
  const matches = wanted.map((name) => english.find((v) => starts(v, name))).filter((v): v is V => v !== undefined).filter((v, i, list) => list.indexOf(v) === i);
  const free = matches.filter((v) => !taken.has(v.name));
  const pool = free.length > 0 ? free : matches;
  if (pool.length > 0) return pool[hash(key) % pool.length] as V;
  // No voice of this gender by name: avoid the other gender's known names if we can.
  const other = cast.browser[gender === 'female' ? 'male' : 'female'];
  const neutral = english.filter((v) => !other.some((name) => starts(v, name)));
  return (neutral.length > 0 ? neutral : english)[0] as V;
}
