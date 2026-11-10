import audioJson from './config/audio.json';
import { readStored, writeStored } from './safe-storage';
import { SOUND_EVENTS, SOUND_EVENT_NAME } from './sound-events';
import type { SoundEvent } from './sound-events';

/**
 * Music and sound (story 012). Everything is synthesised at run time with Web Audio from config/audio.json, so no
 * audio files are downloaded and there is no third-party licence (see assets/audio/LICENSES.md): a looping lo-fi
 * track (pad chords, bass, soft drums, a short melody) and short effects for game events. Nothing plays before the
 * player's first tap; music ducks while the client speaks; audio pauses in the background.
 * Pure parts (config, settings, gain maths, the music pattern) are exported for tests.
 */

export type Wave = 'sine' | 'triangle' | 'square' | 'sawtooth';

export interface SfxSpec {
  wave: Wave;
  /** MIDI note numbers, played one after another. */
  notes: number[];
  stepSeconds: number;
  durationSeconds: number;
  gain: number;
}

export interface MusicSpec {
  bpm: number;
  /** Delay of every off-beat sixteenth, as a share of a sixteenth (the lo-fi lilt). */
  swing: number;
  lowpassHz: number;
  /** One chord per bar; `bass` is the bass note for the bar. */
  chords: { notes: number[]; bass: number }[];
  /** Steps (0-15) in each bar. */
  bassSteps: number[];
  kickSteps: number[];
  snareSteps: number[];
  hatSteps: number[];
  /** [step in the whole loop, MIDI note]. */
  melody: [number, number][];
  levels: Record<'pad' | 'bass' | 'kick' | 'snare' | 'hat' | 'melody', number>;
}

export interface AudioConfig {
  defaults: { music: number; sfx: number };
  masterMusicGain: number;
  masterSfxGain: number;
  duck: { level: number; fadeSeconds: number };
  music: MusicSpec;
  sfx: Record<SoundEvent, SfxSpec>;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Validate the raw audio file. Throws a clear `audio.json: ...` error when it is malformed. */
export function parseAudioConfig(raw: unknown): AudioConfig {
  const fail = (problem: string): never => {
    throw new Error(`audio.json: ${problem}`);
  };
  const object = (value: unknown, path: string): Record<string, unknown> => (isRecord(value) ? value : fail(`"${path}" must be an object`));
  const number = (value: unknown, path: string, min: number, max: number): number =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : fail(`"${path}" must be a number from ${min} to ${max}`);
  const list = (value: unknown, path: string, min: number, max: number): number[] =>
    Array.isArray(value) ? value.map((item, index) => number(item, `${path}[${index}]`, min, max)) : fail(`"${path}" must be a list`);
  const root = object(raw, 'root');
  const defaults = object(root.defaults, 'defaults');
  const duck = object(root.duck, 'duck');
  const music = object(root.music, 'music');
  const levels = object(music.levels, 'music.levels');
  const sfx = object(root.sfx, 'sfx');
  const chords = Array.isArray(music.chords) && music.chords.length > 0 ? music.chords : fail('"music.chords" must be a non-empty list');
  const melody = Array.isArray(music.melody) ? music.melody : fail('"music.melody" must be a list');
  const loopSteps = chords.length * 16;
  return {
    defaults: { music: number(defaults.music, 'defaults.music', 0, 1), sfx: number(defaults.sfx, 'defaults.sfx', 0, 1) },
    masterMusicGain: number(root.masterMusicGain, 'masterMusicGain', 0, 1),
    masterSfxGain: number(root.masterSfxGain, 'masterSfxGain', 0, 1),
    duck: { level: number(duck.level, 'duck.level', 0, 1), fadeSeconds: number(duck.fadeSeconds, 'duck.fadeSeconds', 0, 3) },
    music: {
      bpm: number(music.bpm, 'music.bpm', 40, 200),
      swing: number(music.swing, 'music.swing', 0, 0.5),
      lowpassHz: number(music.lowpassHz, 'music.lowpassHz', 200, 20000),
      chords: chords.map((chord, index) => {
        const entry = object(chord, `music.chords[${index}]`);
        return { notes: list(entry.notes, `music.chords[${index}].notes`, 0, 127), bass: number(entry.bass, `music.chords[${index}].bass`, 0, 127) };
      }),
      bassSteps: list(music.bassSteps, 'music.bassSteps', 0, 15),
      kickSteps: list(music.kickSteps, 'music.kickSteps', 0, 15),
      snareSteps: list(music.snareSteps, 'music.snareSteps', 0, 15),
      hatSteps: list(music.hatSteps, 'music.hatSteps', 0, 15),
      melody: melody.map((pair, index) => {
        if (!Array.isArray(pair) || pair.length !== 2) fail(`"music.melody[${index}]" must be [step, note]`);
        return [number(pair[0], `music.melody[${index}][0]`, 0, loopSteps - 1), number(pair[1], `music.melody[${index}][1]`, 0, 127)] as [number, number];
      }),
      levels: Object.fromEntries(['pad', 'bass', 'kick', 'snare', 'hat', 'melody'].map((key) => [key, number(levels[key], `music.levels.${key}`, 0, 1)])) as MusicSpec['levels'],
    },
    sfx: Object.fromEntries(
      SOUND_EVENTS.map((event) => {
        const entry = object(sfx[event], `sfx.${event}`);
        const wave = entry.wave;
        if (wave !== 'sine' && wave !== 'triangle' && wave !== 'square' && wave !== 'sawtooth') fail(`"sfx.${event}.wave" must be sine, triangle, square or sawtooth`);
        const notes = list(entry.notes, `sfx.${event}.notes`, 0, 127);
        if (notes.length === 0) fail(`"sfx.${event}.notes" must not be empty`);
        return [event, {
          wave: wave as Wave,
          notes,
          stepSeconds: number(entry.stepSeconds, `sfx.${event}.stepSeconds`, 0, 1),
          durationSeconds: number(entry.durationSeconds, `sfx.${event}.durationSeconds`, 0.01, 2),
          gain: number(entry.gain, `sfx.${event}.gain`, 0, 1),
        }];
      }),
    ) as Record<SoundEvent, SfxSpec>,
  };
}

export const AUDIO_CONFIG: AudioConfig = parseAudioConfig(audioJson);

/** The player's sound settings, saved on the device. */
export interface AudioSettings {
  music: number;
  sfx: number;
  musicMuted: boolean;
  sfxMuted: boolean;
}

const SETTINGS_KEY = 'salon.audio.v1';
export const AUDIO_SETTINGS_EVENT = 'salon:audio-settings';

const volume = (value: unknown, fallback: number): number => (typeof value === 'number' && value >= 0 && value <= 1 ? value : fallback);

/** Read saved settings; anything missing or bad falls back to the config defaults. */
export function parseAudioSettings(raw: string | null, config: AudioConfig = AUDIO_CONFIG): AudioSettings {
  let data: Record<string, unknown> = {};
  try {
    const parsed: unknown = raw === null ? null : JSON.parse(raw);
    if (isRecord(parsed)) data = parsed;
  } catch {
    // Bad save: defaults.
  }
  return {
    music: volume(data.music, config.defaults.music),
    sfx: volume(data.sfx, config.defaults.sfx),
    musicMuted: data.musicMuted === true,
    sfxMuted: data.sfxMuted === true,
  };
}

export function loadAudioSettings(): AudioSettings {
  return parseAudioSettings(readStored(SETTINGS_KEY));
}

/** Save settings and tell a running engine to apply them at once. */
export function saveAudioSettings(settings: AudioSettings): void {
  writeStored(SETTINGS_KEY, JSON.stringify(settings));
  if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') window.dispatchEvent(new CustomEvent(AUDIO_SETTINGS_EVENT));
}

/** Music bus gain: the player's volume, 0 when muted, lowered while the client speaks. */
export function musicGain(settings: AudioSettings, ducked: boolean, config: AudioConfig = AUDIO_CONFIG): number {
  if (settings.musicMuted) return 0;
  return config.masterMusicGain * settings.music * (ducked ? config.duck.level : 1);
}

/** Effects bus gain: the player's volume, 0 when muted. */
export function sfxGain(settings: AudioSettings, config: AudioConfig = AUDIO_CONFIG): number {
  return settings.sfxMuted ? 0 : config.masterSfxGain * settings.sfx;
}

export const midiToHz = (note: number): number => 440 * 2 ** ((note - 69) / 12);

/** One sound in the music loop. `step` is the sixteenth within the whole loop; `delay` is seconds after the step. */
export interface MusicNote {
  part: 'pad' | 'bass' | 'kick' | 'snare' | 'hat' | 'melody';
  note: number;
  /** Seconds. */
  duration: number;
}

/** Seconds per sixteenth note. */
export const stepSeconds = (spec: MusicSpec): number => 60 / spec.bpm / 4;

/** Steps in the whole loop (one bar of 16 steps per chord). */
export const loopLength = (spec: MusicSpec): number => spec.chords.length * 16;

/** What sounds on one step of the loop (`step` wraps around). Pure, so the music is testable without audio. */
export function musicNotesAt(spec: MusicSpec, step: number): MusicNote[] {
  const loopStep = ((step % loopLength(spec)) + loopLength(spec)) % loopLength(spec);
  const bar = Math.floor(loopStep / 16);
  const inBar = loopStep % 16;
  const chord = spec.chords[bar] as MusicSpec['chords'][number];
  const sixteenth = stepSeconds(spec);
  const notes: MusicNote[] = [];
  if (inBar === 0) chord.notes.forEach((note) => notes.push({ part: 'pad', note, duration: sixteenth * 16 }));
  if (spec.bassSteps.includes(inBar)) notes.push({ part: 'bass', note: chord.bass, duration: sixteenth * 2 });
  if (spec.kickSteps.includes(inBar)) notes.push({ part: 'kick', note: 0, duration: 0.25 });
  if (spec.snareSteps.includes(inBar)) notes.push({ part: 'snare', note: 0, duration: 0.18 });
  if (spec.hatSteps.includes(inBar)) notes.push({ part: 'hat', note: 0, duration: 0.05 });
  for (const [at, note] of spec.melody) if (at === loopStep) notes.push({ part: 'melody', note, duration: sixteenth * 3 });
  return notes;
}

/** Swing: off-beat sixteenths are pushed late. */
export const swingDelay = (spec: MusicSpec, step: number): number => (step % 2 === 1 ? spec.swing * stepSeconds(spec) : 0);

/** What the engine needs from Web Audio (a real AudioContext fits; tests pass a fake). */
export interface AudioHost {
  createContext(): AudioContext | null;
  setInterval(handler: () => void, ms: number): unknown;
  clearInterval(id: never): void;
  addEventListener(type: string, listener: (event: Event) => void, options?: AddEventListenerOptions | boolean): void;
  removeEventListener(type: string, listener: (event: Event) => void, options?: EventListenerOptions | boolean): void;
  isHidden(): boolean;
}

export interface AudioEngine {
  /** Lower the music (client speaking) or bring it back. */
  duck(ducked: boolean): void;
  /** Play an effect now (the same as an `emitSound` event). */
  play(event: SoundEvent): void;
  /** True once the first tap has started audio. */
  readonly started: boolean;
  destroy(): void;
}

const SCHEDULE_AHEAD_SECONDS = 0.25;
const SCHEDULER_MS = 60;

/**
 * Create the engine. It does nothing until the first tap or key press (phone autoplay rules); that gesture creates
 * and resumes the AudioContext and starts the music. Missing Web Audio or any audio error leaves the game silent,
 * never broken.
 */
export function createAudioEngine(host: AudioHost, config: AudioConfig = AUDIO_CONFIG): AudioEngine {
  let ctx: AudioContext | null = null;
  let musicBus: GainNode | null = null;
  let sfxBus: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let settings = loadAudioSettings();
  let ducked = false;
  let nextStep = 0;
  let nextTime = 0;
  let timer: unknown = null;
  let destroyed = false;

  const applyGains = (fade: number): void => {
    if (!ctx || !musicBus || !sfxBus) return;
    const now = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setValueAtTime(musicBus.gain.value, now);
    musicBus.gain.linearRampToValueAtTime(musicGain(settings, ducked, config), now + Math.max(0.01, fade));
    sfxBus.gain.setValueAtTime(sfxGain(settings, config), now);
  };

  const tone = (bus: AudioNode, wave: Wave, note: number, at: number, duration: number, level: number, attack = 0.01): void => {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(midiToHz(note), at);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(level, at + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain).connect(bus);
    osc.start(at);
    osc.stop(at + duration + 0.05);
  };

  const noiseHit = (at: number, duration: number, level: number, filterHz: number): void => {
    if (!ctx || !musicBus || !noise) return;
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(filterHz, at);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter).connect(gain).connect(musicBus);
    source.start(at);
    source.stop(at + duration + 0.02);
  };

  const kick = (at: number, level: number): void => {
    if (!ctx || !musicBus) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(110, at);
    osc.frequency.exponentialRampToValueAtTime(45, at + 0.12);
    gain.gain.setValueAtTime(level, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
    osc.connect(gain).connect(musicBus);
    osc.start(at);
    osc.stop(at + 0.3);
  };

  const scheduleStep = (step: number, at: number): void => {
    if (!musicBus) return;
    const { levels } = config.music;
    for (const note of musicNotesAt(config.music, step)) {
      if (note.part === 'pad') tone(musicBus, 'triangle', note.note, at, note.duration, levels.pad / 2, 0.4);
      else if (note.part === 'bass') tone(musicBus, 'sine', note.note, at, note.duration, levels.bass, 0.02);
      else if (note.part === 'melody') tone(musicBus, 'sine', note.note, at, note.duration, levels.melody, 0.01);
      else if (note.part === 'kick') kick(at, levels.kick);
      else if (note.part === 'snare') noiseHit(at, note.duration, levels.snare, 1500);
      else noiseHit(at, note.duration, levels.hat, 7000);
    }
  };

  const scheduler = (): void => {
    if (!ctx || ctx.state !== 'running') return;
    while (nextTime < ctx.currentTime + SCHEDULE_AHEAD_SECONDS) {
      scheduleStep(nextStep, nextTime + swingDelay(config.music, nextStep));
      nextTime += stepSeconds(config.music);
      nextStep = (nextStep + 1) % loopLength(config.music);
    }
  };

  const start = (): void => {
    if (ctx || destroyed) {
      if (ctx && ctx.state === 'suspended' && !host.isHidden()) void ctx.resume().catch(() => undefined);
      return;
    }
    try {
      ctx = host.createContext();
      if (!ctx) return;
      musicBus = ctx.createGain();
      sfxBus = ctx.createGain();
      const warmth = ctx.createBiquadFilter();
      warmth.type = 'lowpass';
      warmth.frequency.value = config.music.lowpassHz;
      musicBus.gain.value = 0;
      musicBus.connect(warmth).connect(ctx.destination);
      sfxBus.connect(ctx.destination);
      noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let index = 0; index < data.length; index++) data[index] = Math.random() * 2 - 1;
      void ctx.resume().catch(() => undefined);
      nextTime = ctx.currentTime + 0.1;
      applyGains(1.5);
      timer = host.setInterval(scheduler, SCHEDULER_MS);
    } catch {
      ctx = null;
    }
  };

  const onFirstGesture = (): void => {
    start();
    host.removeEventListener('pointerdown', onFirstGesture, true);
    host.removeEventListener('keydown', onFirstGesture, true);
  };
  const onSound = (event: Event): void => engine.play((event as CustomEvent<SoundEvent>).detail);
  const onSettings = (): void => {
    settings = loadAudioSettings();
    applyGains(0.1);
  };
  const onVisibility = (): void => {
    if (!ctx) return;
    if (host.isHidden()) void ctx.suspend().catch(() => undefined);
    else {
      void ctx.resume().catch(() => undefined);
      nextTime = Math.max(nextTime, ctx.currentTime + 0.05);
    }
  };

  host.addEventListener('pointerdown', onFirstGesture, true);
  host.addEventListener('keydown', onFirstGesture, true);
  host.addEventListener(SOUND_EVENT_NAME, onSound);
  host.addEventListener(AUDIO_SETTINGS_EVENT, onSettings);
  host.addEventListener('visibilitychange', onVisibility);

  const engine: AudioEngine = {
    get started() {
      return ctx !== null;
    },
    duck(next) {
      if (next === ducked) return;
      ducked = next;
      applyGains(config.duck.fadeSeconds);
    },
    play(event) {
      if (!ctx || !sfxBus || ctx.state !== 'running' || settings.sfxMuted) return;
      const spec = config.sfx[event];
      if (!spec) return;
      const now = ctx.currentTime + 0.01;
      spec.notes.forEach((note, index) => tone(sfxBus as GainNode, spec.wave, note, now + index * spec.stepSeconds, spec.durationSeconds, spec.gain));
    },
    destroy() {
      destroyed = true;
      if (timer !== null) host.clearInterval(timer as never);
      host.removeEventListener('pointerdown', onFirstGesture, true);
      host.removeEventListener('keydown', onFirstGesture, true);
      host.removeEventListener(SOUND_EVENT_NAME, onSound);
      host.removeEventListener(AUDIO_SETTINGS_EVENT, onSettings);
      host.removeEventListener('visibilitychange', onVisibility);
      void ctx?.close().catch(() => undefined);
    },
  };
  return engine;
}
