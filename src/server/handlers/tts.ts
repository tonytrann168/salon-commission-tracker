import { getClient } from '../../game/clients/roster';
import { ENGLISH_LEVELS } from '../../game/types';
import type { EnglishLevel } from '../../game/types';
import { VOICE_CONFIG } from '../../game/voice';
import { VOICE_CAST, azureVoiceFor, isEmotion } from '../../game/voice-cast';
import type { Emotion, VoiceGender } from '../../game/voice-cast';

/**
 * Story 037/038: text to speech with Azure AI Speech neural voices. Only a roster client or the companion can be the
 * speaker (the game never sends the player's own text here). The voice comes from config/voice-cast.json, the tone from
 * the emotion (SSML mstts:express-as), the pace from the player's English level. Without AZURE_SPEECH_KEY and
 * AZURE_SPEECH_REGION it answers "not_configured" and the game keeps the browser's voice. The key stays server-side;
 * the text and the key are never logged.
 */

const TIMEOUT_MS = 12_000;

export interface TtsRequest {
  text: string;
  voice: string;
  /** BCP-47 language of the voice (en-US, vi-VN). */
  lang: string;
  emotion: Emotion;
  level: EnglishLevel;
}

export type TtsParse = { ok: true; value: TtsRequest } | { ok: false; message: string };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export function parseTtsRequest(body: unknown): TtsParse {
  if (!isRecord(body)) return { ok: false, message: 'Body must be a JSON object.' };
  const { text, clientId, companion, emotion, level } = body;
  if (typeof text !== 'string' || text.trim() === '' || text.length > VOICE_CAST.limits.maxChars) return { ok: false, message: `text must be 1-${VOICE_CAST.limits.maxChars} characters.` };
  const knownLevel = level === undefined ? 'some' : ENGLISH_LEVELS.find((l) => l === level);
  if (!knownLevel) return { ok: false, message: 'level is not valid.' };
  if (emotion !== undefined && !isEmotion(emotion)) return { ok: false, message: 'emotion is not valid.' };
  let voice: string;
  let lang = 'en-US';
  if (typeof clientId === 'string' && companion === undefined) {
    const client = getClient(clientId);
    if (!client) return { ok: false, message: 'clientId is not a known client.' };
    voice = azureVoiceFor(client.id, client.pronoun === 'he' ? 'male' : 'female');
  } else if (isRecord(companion) && clientId === undefined) {
    const gender: VoiceGender | undefined = companion.gender === 'female' || companion.gender === 'male' ? companion.gender : undefined;
    const language = companion.lang === 'en' || companion.lang === 'vi' ? companion.lang : undefined;
    if (!gender || !language) return { ok: false, message: 'companion needs gender (female, male) and lang (en, vi).' };
    voice = VOICE_CAST.azure.companion[gender][language];
    lang = language === 'vi' ? 'vi-VN' : 'en-US';
  } else {
    return { ok: false, message: 'The speaker must be a client (clientId) or the companion.' };
  }
  return { ok: true, value: { text: text.trim(), voice, lang, emotion: isEmotion(emotion) ? emotion : 'neutral', level: knownLevel } };
}

const escapeXml = (text: string): string => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c] as string);

/** The SSML for one line. English neural voices get the emotion as an express-as style; the pace follows the level. */
export function buildSsml(request: TtsRequest): string {
  const sound = VOICE_CAST.emotions[request.emotion];
  const percent = Math.round((VOICE_CONFIG.rateByLevel[request.level] * sound.rate - 1) * 100);
  const prosody = `<prosody rate="${percent >= 0 ? '+' : ''}${percent}%">${escapeXml(request.text)}</prosody>`;
  const styled = request.lang === 'en-US' ? `<mstts:express-as style="${sound.style}" styledegree="${sound.degree}">${prosody}</mstts:express-as>` : prosody;
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${request.lang}"><voice name="${request.voice}">${styled}</voice></speak>`;
}

/** A small least-recently-used cache: the same line in the same voice and tone is made once. */
export function createLru<V>(max: number): { get(key: string): V | undefined; set(key: string, value: V): void; size(): number } {
  const map = new Map<string, V>();
  return {
    get(key) {
      const value = map.get(key);
      if (value === undefined) return undefined;
      map.delete(key);
      map.set(key, value);
      return value;
    },
    set(key, value) {
      map.delete(key);
      map.set(key, value);
      while (map.size > max) map.delete(map.keys().next().value as string);
    },
    size: () => map.size,
  };
}

const sharedCache = createLru<string>(VOICE_CAST.limits.serverCacheEntries);

export const azureConfigured = (env: Record<string, string | undefined>): { key: string; region: string } | null => {
  const key = env.AZURE_SPEECH_KEY?.trim();
  const region = env.AZURE_SPEECH_REGION?.trim().toLowerCase();
  return key && region && /^[a-z0-9]{3,30}$/.test(region) ? { key, region } : null;
};

const failure = (status: number, code: string, message: string) => ({ status, body: { error: { code, message } } });

export async function handleTts(body: unknown, env: Record<string, string | undefined>, fetchImpl: typeof fetch, cache = sharedCache): Promise<{ status: number; body: unknown }> {
  const parsed = parseTtsRequest(body);
  if (!parsed.ok) return failure(400, 'invalid_request', parsed.message);
  const azure = azureConfigured(env);
  if (!azure) return failure(503, 'not_configured', 'Natural voices are not set up on the server.');
  const request = parsed.value;
  const cacheKey = `${request.voice}|${request.emotion}|${request.level}|${request.text}`;
  const hit = cache.get(cacheKey);
  if (hit) return { status: 200, body: { audio: hit, mime: 'audio/mpeg', cached: true } };
  let upstream: Response;
  try {
    upstream = await fetchImpl(`https://${azure.region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: { 'Ocp-Apim-Subscription-Key': azure.key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': VOICE_CAST.azure.outputFormat, 'User-Agent': 'salon-game' },
      body: buildSsml(request),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return failure(502, 'upstream_unreachable', 'Could not reach the voice service.');
  }
  if (!upstream.ok) return failure(502, 'upstream_error', `The voice service answered ${upstream.status}.`);
  const audio = Buffer.from(await upstream.arrayBuffer()).toString('base64');
  if (audio === '') return failure(502, 'upstream_error', 'The voice service sent no audio.');
  cache.set(cacheKey, audio);
  return { status: 200, body: { audio, mime: 'audio/mpeg', cached: false } };
}
