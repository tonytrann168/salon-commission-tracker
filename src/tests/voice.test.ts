import { describe, expect, it } from 'vitest';
import { VOICE_CONFIG, VoiceError, checkPronunciation, clientVoiceFor, createBrowserVoice, parseVoiceConfig, pickVoice } from '../game/voice';
import type { SpeechHost } from '../game/voice';

/** Story 004: voice config, voice choice, the word-level pronunciation check and the Web Speech adapter (with fakes). */

const heardWords = (target: string, heard: string) => checkPronunciation(target, heard).filter((check) => check.heard).map((check) => check.word);

describe('pronunciation check (free, word level)', () => {
  it('marks every word when the line is heard as written, ignoring case and punctuation', () => {
    expect(checkPronunciation('What color would you like?', 'what color would you like').every((check) => check.heard)).toBe(true);
  });

  it('marks the words the recogniser missed, without knocking out the words after them', () => {
    expect(heardWords('Would you like a hand massage today?', 'would you like hand massage today')).toEqual(['Would', 'you', 'like', 'hand', 'massage', 'today?']);
    expect(heardWords('See you in three weeks!', 'see you in tree weeks')).toEqual(['See', 'you', 'in', 'weeks!']);
  });

  it('lets a long word be one letter off, but not a short one', () => {
    expect(heardWords('Your manicure is ready.', 'your manicur is ready')).toEqual(['Your', 'manicure', 'is', 'ready.']);
    expect(heardWords('Pick a shape.', 'pack a shape')).toEqual(['a', 'shape.']);
  });

  it('hears nothing from silence or the wrong words', () => {
    expect(heardWords('Thank you so much!', '')).toEqual([]);
    expect(heardWords('Thank you so much!', 'banana')).toEqual([]);
  });

  it('keeps the words in order: a repeated word is matched once per time it is said', () => {
    expect(heardWords('no no no', 'no')).toEqual(['no']);
  });
});

describe('voice config and choice', () => {
  it('loads voice.json: slower at Beginner, natural at Fluent', () => {
    expect(VOICE_CONFIG.rateByLevel.beginner).toBeLessThan(VOICE_CONFIG.rateByLevel.fluent);
    expect(clientVoiceFor('dana').preferredVoices.length).toBeGreaterThan(0);
    expect(clientVoiceFor('nobody')).toEqual(VOICE_CONFIG.defaultClient);
    expect(() => parseVoiceConfig({ ...structuredClone(VOICE_CONFIG), rateByLevel: { ...VOICE_CONFIG.rateByLevel, some: 9 } })).toThrow(/rateByLevel\.some/);
  });

  it('picks the first preferred voice the phone has, then the right language, then any English', () => {
    const voices = [
      { name: 'Thomas', lang: 'fr-FR' },
      { name: 'Daniel', lang: 'en-GB' },
      { name: 'Alex', lang: 'en-US' },
      { name: 'Samantha (Enhanced)', lang: 'en-US' },
    ];
    expect(pickVoice(voices, ['Karen', 'Samantha'], 'en-US')?.name).toBe('Samantha (Enhanced)');
    expect(pickVoice(voices, ['Karen'], 'en-US')?.name).toBe('Alex');
    expect(pickVoice(voices.slice(0, 2), [], 'en-US')?.name).toBe('Daniel');
    expect(pickVoice([{ name: 'Thomas', lang: 'fr-FR' }], [], 'en-US')).toBeNull();
  });
});

/** A fake SpeechRecognition the test drives by hand. */
function fakeHost(options: { recognition?: boolean; synthesis?: boolean } = {}) {
  const recognitions: FakeRecognition[] = [];
  const spoken: { text: string; rate: number; pitch: number; voice: unknown }[] = [];
  let cancelled = 0;
  class FakeRecognition {
    lang = '';
    interimResults = false;
    continuous = true;
    maxAlternatives = 0;
    onresult: ((event: any) => void) | null = null;
    onerror: ((event: { error: string }) => void) | null = null;
    onend: (() => void) | null = null;
    started = false;
    constructor() {
      recognitions.push(this);
    }
    start() {
      this.started = true;
    }
    stop() {
      this.onend?.();
    }
    abort() {
      this.onend?.();
    }
    say(text: string, isFinal: boolean) {
      const result = Object.assign([{ transcript: text }], { isFinal });
      this.onresult?.({ resultIndex: 0, results: [result] });
    }
  }
  class FakeUtterance {
    lang = '';
    rate = 1;
    pitch = 1;
    voice: unknown = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(public text: string) {}
  }
  const host: SpeechHost = {
    ...(options.recognition === false ? {} : { webkitSpeechRecognition: FakeRecognition as unknown as SpeechHost['webkitSpeechRecognition'] }),
    ...(options.synthesis === false
      ? {}
      : {
          speechSynthesis: {
            getVoices: () => [{ name: 'Samantha', lang: 'en-US' }],
            speak: (utterance: any) => {
              spoken.push({ text: utterance.text, rate: utterance.rate, pitch: utterance.pitch, voice: utterance.voice });
              utterance.onend?.();
            },
            cancel: () => {
              cancelled++;
            },
          },
          SpeechSynthesisUtterance: FakeUtterance as unknown as SpeechHost['SpeechSynthesisUtterance'],
        }),
    setTimeout: () => 0,
    clearTimeout: () => undefined,
  };
  return { host, recognitions, spoken, cancelledCount: () => cancelled };
}

describe('browser voice adapter', () => {
  it('turns speech into text, passing partial words along the way', async () => {
    const { host, recognitions } = fakeHost();
    const voice = createBrowserVoice(host);
    const partials: string[] = [];
    const { result } = voice.listen((text) => partials.push(text));
    const recognition = recognitions[0]!;
    expect(recognition.lang).toBe('en-US');
    expect(recognition.started).toBe(true);
    recognition.say('what color', false);
    recognition.say('What color would you like?', true);
    recognition.stop();
    await expect(result).resolves.toBe('What color would you like?');
    expect(partials).toEqual(['what color', 'What color would you like?']);
  });

  it('reports a blocked mic, silence and a missing recogniser, so the game can fall back to typing', async () => {
    const blocked = fakeHost();
    const first = createBrowserVoice(blocked.host).listen();
    blocked.recognitions[0]!.onerror?.({ error: 'not-allowed' });
    blocked.recognitions[0]!.stop();
    await expect(first.result).rejects.toMatchObject({ reason: 'blocked' });

    const silent = fakeHost();
    const second = createBrowserVoice(silent.host).listen();
    silent.recognitions[0]!.stop();
    await expect(second.result).rejects.toMatchObject({ reason: 'no-speech' });

    const none = createBrowserVoice(fakeHost({ recognition: false }).host);
    expect(none.canListen).toBe(false);
    await expect(none.listen().result).rejects.toBeInstanceOf(VoiceError);
  });

  it('speaks a client line at the level rate, with the client pitch and voice', async () => {
    const { host, spoken, cancelledCount } = fakeHost();
    const voice = createBrowserVoice(host);
    await voice.speak('Pink, please.', { clientId: 'dana', level: 'beginner' });
    expect(spoken).toEqual([{ text: 'Pink, please.', rate: VOICE_CONFIG.rateByLevel.beginner, pitch: clientVoiceFor('dana').pitch, voice: { name: 'Samantha', lang: 'en-US' } }]);
    expect(cancelledCount()).toBe(1);
    voice.cancelSpeech();
    expect(cancelledCount()).toBe(2);
  });

  it('unlocks speech once, with a silent empty line (for iPhone, inside the first tap)', () => {
    const { host, spoken } = fakeHost();
    const voice = createBrowserVoice(host);
    voice.unlock();
    voice.unlock();
    expect(spoken).toHaveLength(1);
    expect(spoken[0]?.text).toBe('');
  });

  it('does nothing (and never fails) when the phone cannot speak', async () => {
    const voice = createBrowserVoice(fakeHost({ synthesis: false }).host);
    expect(voice.canSpeak).toBe(false);
    await expect(voice.speak('Hello', { level: 'some' })).resolves.toBeUndefined();
  });
});
