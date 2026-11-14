import { describe, expect, it, vi } from 'vitest';
import { createAppointment } from '../game/appointment';
import { withNaturalVoice } from '../game/natural-voice';
import type { AudioLike } from '../game/natural-voice';
import type { ClientPersona, ClientTurn } from '../game/types';
import { createBrowserVoice, loadPinnedVoices, savePinnedVoices } from '../game/voice';
import type { SpeechHost, VoiceIO } from '../game/voice';
import { VOICE_CAST, azureVoiceFor, browserProsody, emotionFor, parseVoiceCast, pinVoice } from '../game/voice-cast';
import { ROSTER } from '../game/clients/roster';
import { GUARD_CONFIG, createGuard } from '../server/guard';
import { parseModelOutput } from '../server/handlers/client-turn';
import { azureConfigured, buildSsml, createLru, handleTts, parseTtsRequest } from '../server/handlers/tts';

/** Stories 037/038: one voice per character, natural voices from the server, and the mood in the voice. */

const phone = [
  { name: 'Samantha', lang: 'en-US' }, { name: 'Karen', lang: 'en-AU' }, { name: 'Moira', lang: 'en-IE' },
  { name: 'Daniel', lang: 'en-GB' }, { name: 'Alex', lang: 'en-US' }, { name: 'Linh', lang: 'vi-VN' },
];

describe('pinned browser voices', () => {
  it('a character keeps the same voice, whatever order the phone lists its voices in', () => {
    const first = pinVoice(phone, 'brenda', 'female', {})!;
    expect(['Samantha', 'Karen', 'Moira']).toContain(first.name);
    for (let i = 0; i < 5; i++) expect(pinVoice([...phone].reverse(), 'brenda', 'female', {})!.name).toBe(first.name);
    // Once stored, the stored voice wins even if the lists change.
    expect(pinVoice(phone, 'brenda', 'female', { brenda: 'Moira' })!.name).toBe('Moira');
  });

  it('men get a man\'s voice, women a woman\'s, and never a non-English voice', () => {
    expect(['Daniel', 'Alex']).toContain(pinVoice(phone, 'tom', 'male', {})!.name);
    for (const id of ['ana', 'kim', 'rosa', 'victoria']) expect(['Samantha', 'Karen', 'Moira']).toContain(pinVoice(phone, id, 'female', {})!.name);
    expect(pinVoice([{ name: 'Linh', lang: 'vi-VN' }], 'ana', 'female', {})).toBeNull();
  });

  it('different characters get different voices while the phone has spare ones', () => {
    const pinned: Record<string, string> = {};
    for (const id of ['ana', 'kim', 'rosa']) pinned[id] = pinVoice(phone, id, 'female', pinned)!.name;
    expect(new Set(Object.values(pinned)).size).toBe(3);
  });

  it('a stored voice the phone no longer has is picked again; the choice is saved on the device', async () => {
    expect(pinVoice(phone, 'tom', 'male', { tom: 'Gone Voice' })!.name).not.toBe('Gone Voice');
    savePinnedVoices({});
    const spoken: { voice?: { name: string }; rate: number; pitch: number }[] = [];
    class Utterance { text: string; lang = ''; rate = 1; pitch = 1; volume = 1; voice?: { name: string }; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(text: string) { this.text = text; } }
    const host = { speechSynthesis: { getVoices: () => phone, speak: (u: Utterance) => { spoken.push(u); u.onend?.(); }, cancel: () => undefined }, SpeechSynthesisUtterance: Utterance, setTimeout, clearTimeout } as unknown as SpeechHost;
    const io = createBrowserVoice(host);
    await io.speak('Hi', { clientId: 'tom', level: 'some', gender: 'male', emotion: 'neutral' });
    await io.speak('Hurry up', { clientId: 'tom', level: 'some', gender: 'male', emotion: 'angry' });
    expect(spoken[0]!.voice!.name).toBe(spoken[1]!.voice!.name);
    expect(loadPinnedVoices().tom).toBe(spoken[0]!.voice!.name);
    // 038: an angry line is faster and lower than a neutral one.
    expect(spoken[1]!.rate).toBeGreaterThan(spoken[0]!.rate);
    expect(spoken[1]!.pitch).toBeLessThan(spoken[0]!.pitch);
  });
});

describe('the mood in the voice', () => {
  it('the line\'s own tag wins; otherwise the mood band decides', () => {
    expect(emotionFor(10, null)).toBe('angry');
    expect(emotionFor(30, undefined)).toBe('annoyed');
    expect(emotionFor(55, null)).toBe('neutral');
    expect(emotionFor(80, null)).toBe('happy');
    expect(emotionFor(100, null)).toBe('excited');
    expect(emotionFor(90, 'sad')).toBe('sad');
    expect(browserProsody(0.9, 1, 'neutral')).toEqual({ rate: 0.9, pitch: 1 });
    expect(() => parseVoiceCast({ ...VOICE_CAST, moodBands: [{ below: 50, emotion: 'happy' }] })).toThrow(/moodBands/);
  });

  it('the client turn may carry an emotion from the list; anything else is dropped', () => {
    const make = (emotion: unknown) => ({ content: [{ type: 'tool_use', name: 'client_turn', input: { reply: 'Okay.', moodDelta: 1, phase: 'service', unclearEnglish: false, rude: false, emotion } }] });
    const good = parseModelOutput(make('annoyed'));
    const bad = parseModelOutput(make('furious!!'));
    expect(good).toMatchObject({ ok: true, value: { emotion: 'annoyed' } });
    expect(bad.ok && bad.value.emotion).toBeUndefined();
    expect(bad.ok).toBe(true);
  });

  it('the appointment remembers how the latest line was said (null for her own data lines)', async () => {
    const client = { id: 'lily', name: 'Lily', openingLine: 'Hi!', startingMood: 60, moodSensitivity: { up: 1, down: 1 }, difficulty: 'medium' } as unknown as ClientPersona;
    const takeTurn = async (): Promise<ClientTurn> => ({ reply: 'Ugh.', moodDelta: 0, phase: 'service', unclearEnglish: false, rude: false, emotion: 'annoyed' });
    const appointment = createAppointment({ client, takeTurn, level: 'some', onFinished: () => undefined });
    expect(appointment.getSnapshot().lastEmotion).toBeNull();
    await appointment.send('Hello');
    expect(appointment.getSnapshot().lastEmotion).toBe('annoyed');
    appointment.clientSays('Are you almost done?');
    expect(appointment.getSnapshot().lastEmotion).toBeNull();
  });
});

describe('/api/tts', () => {
  const env = { AZURE_SPEECH_KEY: 'k', AZURE_SPEECH_REGION: 'westus2' };

  it('every roster client has a neural voice of their gender; the companion has en and vi voices', () => {
    const male = new Set(['en-US-GuyNeural', 'en-US-DavisNeural', 'en-US-JasonNeural', 'en-US-TonyNeural']);
    for (const client of ROSTER) expect(male.has(azureVoiceFor(client.id, client.pronoun === 'he' ? 'male' : 'female'))).toBe(client.pronoun === 'he');
    expect(VOICE_CAST.azure.companion.female.vi).toBe('vi-VN-HoaiMyNeural');
    expect(VOICE_CAST.azure.companion.male.vi).toBe('vi-VN-NamMinhNeural');
  });

  it('only a known client or the companion can speak; text is capped', () => {
    expect(parseTtsRequest({ text: 'Hi', clientId: 'tom', emotion: 'angry' })).toMatchObject({ ok: true, value: { voice: 'en-US-GuyNeural', emotion: 'angry', lang: 'en-US' } });
    expect(parseTtsRequest({ text: 'Chào em', companion: { gender: 'female', lang: 'vi' } })).toMatchObject({ ok: true, value: { voice: 'vi-VN-HoaiMyNeural', lang: 'vi-VN' } });
    expect(parseTtsRequest({ text: 'Hi' }).ok).toBe(false);
    expect(parseTtsRequest({ text: 'Hi', clientId: 'player' }).ok).toBe(false);
    expect(parseTtsRequest({ text: 'Hi', clientId: 'tom', voice: 'en-US-EvilNeural' })).toMatchObject({ value: { voice: 'en-US-GuyNeural' } });
    expect(parseTtsRequest({ text: 'x'.repeat(VOICE_CAST.limits.maxChars + 1), clientId: 'tom' }).ok).toBe(false);
    expect(parseTtsRequest({ text: 'Hi', clientId: 'tom', emotion: 'shouting' }).ok).toBe(false);
  });

  it('the SSML escapes the text and carries the style; Vietnamese voices get no style', () => {
    const parsed = parseTtsRequest({ text: 'Is <this> "okay" & done?', clientId: 'tom', emotion: 'annoyed', level: 'beginner' });
    if (!parsed.ok) throw new Error(parsed.message);
    const ssml = buildSsml(parsed.value);
    expect(ssml).toContain('Is &lt;this&gt; &quot;okay&quot; &amp; done?');
    expect(ssml).toContain('<voice name="en-US-GuyNeural"><mstts:express-as style="unfriendly"');
    expect(ssml).toMatch(/<prosody rate="-\d+%">/);
    const vi = parseTtsRequest({ text: 'Chào em', companion: { gender: 'male', lang: 'vi' } });
    if (!vi.ok) throw new Error(vi.message);
    expect(buildSsml(vi.value)).not.toContain('express-as');
  });

  it('without the Azure settings it says "not configured"; with them it returns audio and caches it', async () => {
    expect(azureConfigured({})).toBeNull();
    expect(azureConfigured({ AZURE_SPEECH_KEY: 'k', AZURE_SPEECH_REGION: 'evil.example.com/x' })).toBeNull();
    const none = await handleTts({ text: 'Hi', clientId: 'tom' }, {}, fetch);
    expect(none).toMatchObject({ status: 503, body: { error: { code: 'not_configured' } } });
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 }));
    const cache = createLru<string>(2);
    const first = await handleTts({ text: 'Hi', clientId: 'tom' }, env, fetchImpl as unknown as typeof fetch, cache);
    expect(first).toMatchObject({ status: 200, body: { audio: 'AQIDBA==', mime: 'audio/mpeg', cached: false } });
    expect(String(fetchImpl.mock.calls[0]![0])).toBe('https://westus2.tts.speech.microsoft.com/cognitiveservices/v1');
    const second = await handleTts({ text: 'Hi', clientId: 'tom' }, env, fetchImpl as unknown as typeof fetch, cache);
    expect(second).toMatchObject({ body: { cached: true } });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    // The cache forgets the oldest line.
    cache.set('a', '1');
    cache.set('b', '2');
    expect(cache.size()).toBe(2);
    const failing = await handleTts({ text: 'Other', clientId: 'tom' }, env, (async () => new Response('no', { status: 401 })) as unknown as typeof fetch, createLru<string>(2));
    expect(failing.status).toBe(502);
  });

  it('on the hosted preview it is charged by characters, with a daily cap per code', () => {
    let now = 10_000;
    const guard = createGuard({ TESTER_CODES: 'LAN-01', COOKIE_SECRET: 'a-long-enough-test-secret' }, () => now, { ...GUARD_CONFIG, ttsCharsPerCodePerDay: 100, ttsCharsPerDay: 1000, ttsPerCodePerMinute: 2, perIpPerMinute: 100 });
    expect(guard.chargeTts(undefined, 'ip', 10)).toMatchObject({ ok: false, code: 'unauthorized' });
    const login = guard.login('LAN-01', 'ip');
    const cookie = login.ok ? (login.value.split(';')[0] as string) : '';
    expect(guard.chargeTts(cookie, 'ip', 60).ok).toBe(true);
    expect(guard.chargeTts(cookie, 'ip', 60)).toMatchObject({ ok: false, code: 'daily_cap' });
    expect(guard.chargeTts(cookie, 'ip', 30).ok).toBe(true);
    expect(guard.chargeTts(cookie, 'ip', 5)).toMatchObject({ ok: false, code: 'rate_limited' });
    now += 61_000;
    expect(guard.chargeTts(cookie, 'ip', 20)).toMatchObject({ ok: false, code: 'daily_cap' });
  });
});

describe('natural voice in the browser', () => {
  const browser = (): VoiceIO & { said: string[] } => {
    const said: string[] = [];
    return { said, canListen: false, canSpeak: true, listen: () => ({ result: Promise.reject(new Error('no')), stop: () => undefined }), speak: async (text) => void said.push(text), cancelSpeech: () => undefined, unlock: () => undefined };
  };
  const audio = (): AudioLike & { played: string[] } => {
    const a = { played: [] as string[], src: '', onended: null as (() => void) | null, onerror: null as (() => void) | null, play: async () => { a.played.push(a.src); queueMicrotask(() => a.onended?.()); }, pause: () => undefined };
    return a;
  };

  it('plays the server\'s audio for a client line, caches it, and never sends a line without a client', async () => {
    const io = browser();
    const a = audio();
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ audio: 'AAAA', mime: 'audio/mpeg' }), { status: 200 }));
    const voice = withNaturalVoice(io, { fetch: fetchImpl as unknown as typeof fetch, createAudio: () => a });
    await voice.speak('Red, please!', { clientId: 'lily', level: 'some', emotion: 'happy' });
    await voice.speak('Red, please!', { clientId: 'lily', level: 'some', emotion: 'happy' });
    expect(a.played).toEqual(['data:audio/mpeg;base64,AAAA', 'data:audio/mpeg;base64,AAAA']);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, { body: string }])[1].body)).toEqual({ text: 'Red, please!', clientId: 'lily', level: 'some', emotion: 'happy' });
    // The player's own line (practice) has no client: browser voice, no request.
    await voice.speak('Hello, welcome!', { level: 'some' });
    expect(io.said).toEqual(['Hello, welcome!']);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('not set up on the server → the browser voice, and it stops asking', async () => {
    const io = browser();
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: { code: 'not_configured' } }), { status: 503 }));
    const voice = withNaturalVoice(io, { fetch: fetchImpl as unknown as typeof fetch, createAudio: audio });
    await voice.speak('One', { clientId: 'tom', level: 'some' });
    await voice.speak('Two', { clientId: 'tom', level: 'some' });
    expect(io.said).toEqual(['One', 'Two']);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('a network failure falls back for that line; three in a row stop the asking', async () => {
    const io = browser();
    const fetchImpl = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    const voice = withNaturalVoice(io, { fetch: fetchImpl as unknown as typeof fetch, createAudio: audio });
    for (const line of ['1', '2', '3', '4']) await voice.speak(line, { clientId: 'tom', level: 'some' });
    expect(io.said).toEqual(['1', '2', '3', '4']);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
