import { describe, expect, it } from 'vitest';
import {
  AUDIO_CONFIG,
  createAudioEngine,
  loopLength,
  midiToHz,
  musicGain,
  musicNotesAt,
  parseAudioConfig,
  parseAudioSettings,
  sfxGain,
  swingDelay,
} from '../game/audio';
import type { AudioHost } from '../game/audio';
import { withSpeakingSignal } from '../game/voice';
import type { VoiceIO } from '../game/voice';

/** Story 012: audio config, settings, gain maths, the music pattern, the engine (fake Web Audio) and ducking. */

const settings = { music: 0.5, sfx: 1, musicMuted: false, sfxMuted: false };

describe('audio config and settings', () => {
  it('loads audio.json and names the problem in a bad one', () => {
    expect(AUDIO_CONFIG.music.chords.length).toBeGreaterThan(0);
    expect(Object.keys(AUDIO_CONFIG.sfx).sort()).toEqual(['levelUp', 'moodDown', 'moodUp', 'phraseSaved', 'send', 'stars', 'tip', 'whisper']);
    const bad = structuredClone(AUDIO_CONFIG) as Record<string, any>;
    bad.sfx.send.wave = 'kazoo';
    expect(() => parseAudioConfig(bad)).toThrow(/sfx\.send\.wave/);
  });

  it('reads saved settings, falling back to the defaults field by field', () => {
    expect(parseAudioSettings(null)).toEqual({ music: AUDIO_CONFIG.defaults.music, sfx: AUDIO_CONFIG.defaults.sfx, musicMuted: false, sfxMuted: false });
    expect(parseAudioSettings(JSON.stringify({ music: 0.2, sfx: 7, musicMuted: true }))).toEqual({ music: 0.2, sfx: AUDIO_CONFIG.defaults.sfx, musicMuted: true, sfxMuted: false });
    expect(parseAudioSettings('{oops')).toEqual(parseAudioSettings(null));
  });

  it('works out bus volumes: mute is silence, ducking lowers the music only', () => {
    expect(musicGain(settings, false)).toBeCloseTo(AUDIO_CONFIG.masterMusicGain * 0.5);
    expect(musicGain(settings, true)).toBeCloseTo(AUDIO_CONFIG.masterMusicGain * 0.5 * AUDIO_CONFIG.duck.level);
    expect(musicGain({ ...settings, musicMuted: true }, false)).toBe(0);
    expect(sfxGain(settings)).toBeCloseTo(AUDIO_CONFIG.masterSfxGain);
    expect(sfxGain({ ...settings, sfxMuted: true })).toBe(0);
  });
});

describe('the lo-fi loop', () => {
  const spec = AUDIO_CONFIG.music;

  it('starts each bar with its chord and bass, and loops', () => {
    const first = musicNotesAt(spec, 0);
    expect(first.filter((note) => note.part === 'pad').map((note) => note.note)).toEqual(spec.chords[0]?.notes);
    expect(first.some((note) => note.part === 'bass' && note.note === spec.chords[0]?.bass)).toBe(true);
    expect(first.some((note) => note.part === 'kick')).toBe(true);
    expect(musicNotesAt(spec, loopLength(spec))).toEqual(first);
    expect(musicNotesAt(spec, 16).filter((note) => note.part === 'pad').map((note) => note.note)).toEqual(spec.chords[1]?.notes);
  });

  it('plays the snare on the back beats and swings the off-beats', () => {
    expect(musicNotesAt(spec, 4).some((note) => note.part === 'snare')).toBe(true);
    expect(musicNotesAt(spec, 5).some((note) => note.part === 'snare')).toBe(false);
    expect(swingDelay(spec, 0)).toBe(0);
    expect(swingDelay(spec, 1)).toBeGreaterThan(0);
  });

  it('converts notes to pitch', () => {
    expect(midiToHz(69)).toBe(440);
    expect(midiToHz(81)).toBeCloseTo(880);
  });
});

/** A fake AudioContext recording what the engine builds. */
function fakeAudio() {
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
  const node = () => ({ connect(next: unknown) { return next; } });
  const created = { oscillators: 0, contexts: 0 };
  const state = { value: 'suspended' as AudioContextState };
  const makeContext = () => {
    created.contexts++;
    return {
      get state() { return state.value; },
      currentTime: 0,
      sampleRate: 8000,
      destination: node(),
      resume: async () => { state.value = 'running'; },
      suspend: async () => { state.value = 'suspended'; },
      close: async () => { state.value = 'closed'; },
      createGain: () => ({ ...node(), gain: param() }),
      createBiquadFilter: () => ({ ...node(), type: '', frequency: param() }),
      createOscillator: () => { created.oscillators++; return { ...node(), type: '', frequency: param(), start() {}, stop() {} }; },
      createBuffer: (_c: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
      createBufferSource: () => ({ ...node(), buffer: null, start() {}, stop() {} }),
    } as unknown as AudioContext;
  };
  const listeners = new Map<string, Set<(event: Event) => void>>();
  let hidden = false;
  const intervals: (() => void)[] = [];
  const host: AudioHost = {
    createContext: makeContext,
    setInterval: (handler) => { intervals.push(handler); return intervals.length; },
    clearInterval: () => { intervals.length = 0; },
    addEventListener: (type, listener) => { (listeners.get(type) ?? listeners.set(type, new Set()).get(type))!.add(listener); },
    removeEventListener: (type, listener) => { listeners.get(type)?.delete(listener); },
    isHidden: () => hidden,
  };
  const fire = (type: string, detail?: unknown) => [...(listeners.get(type) ?? [])].forEach((listener) => listener({ detail } as unknown as Event));
  return { host, created, state, fire, intervals, listeners, setHidden: (value: boolean) => { hidden = value; } };
}

describe('audio engine', () => {
  it('stays silent until the first tap, then starts the music', async () => {
    const audio = fakeAudio();
    const engine = createAudioEngine(audio.host);
    audio.fire('salon:sound', 'send');
    expect(engine.started).toBe(false);
    expect(audio.created.contexts).toBe(0);
    audio.fire('pointerdown');
    await Promise.resolve();
    expect(engine.started).toBe(true);
    expect(audio.state.value).toBe('running');
    audio.intervals[0]?.();
    expect(audio.created.oscillators).toBeGreaterThan(0);
    expect(audio.listeners.get('pointerdown')?.size).toBe(0);
  });

  it('plays an effect for a sound event, one tone per note', async () => {
    const audio = fakeAudio();
    createAudioEngine(audio.host);
    audio.fire('pointerdown');
    await Promise.resolve();
    const before = audio.created.oscillators;
    audio.fire('salon:sound', 'levelUp');
    expect(audio.created.oscillators - before).toBe(AUDIO_CONFIG.sfx.levelUp.notes.length);
  });

  it('pauses in the background and resumes on return', async () => {
    const audio = fakeAudio();
    createAudioEngine(audio.host);
    audio.fire('pointerdown');
    await Promise.resolve();
    audio.setHidden(true);
    audio.fire('visibilitychange');
    await Promise.resolve();
    expect(audio.state.value).toBe('suspended');
    audio.setHidden(false);
    audio.fire('visibilitychange');
    await Promise.resolve();
    expect(audio.state.value).toBe('running');
  });

  it('never breaks the game when Web Audio is missing', () => {
    const audio = fakeAudio();
    const engine = createAudioEngine({ ...audio.host, createContext: () => null });
    audio.fire('pointerdown');
    expect(engine.started).toBe(false);
    expect(() => engine.play('stars')).not.toThrow();
  });
});

describe('ducking under speech', () => {
  it('signals speaking until every overlapping line has ended', async () => {
    const endings: (() => void)[] = [];
    const io: VoiceIO = {
      canListen: true,
      canSpeak: true,
      listen: () => ({ result: Promise.resolve(''), stop: () => undefined }),
      speak: () => new Promise<void>((resolve) => endings.push(resolve)),
      cancelSpeech: () => undefined,
      unlock: () => undefined,
    };
    const signals: boolean[] = [];
    const voice = withSpeakingSignal(io, (speaking) => signals.push(speaking));
    const first = voice.speak('Hi.', { level: 'some' });
    const second = voice.speak('Pink, please.', { level: 'some' });
    endings[0]?.();
    await first;
    expect(signals).toEqual([true, true]);
    endings[1]?.();
    await second;
    expect(signals).toEqual([true, true, false]);
  });
});
