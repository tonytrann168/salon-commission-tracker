import uiSoundsJson from './config/ui-sounds.json';

/**
 * Story 070 (owner request): chunky, satisfying button sounds. Every sound is the game's own, synthesised live
 * (oscillators and filtered noise; see config/ui-sounds.json). This module is pure: the config, a button's sound
 * kind, the throttle and the pitch variation. The DOM listener is game/ui/ui-sound-listener.ts; the audio engine
 * (audio.ts) plays a voice when it hears a UI sound event.
 */
export const UI_SOUND_KINDS = ['press', 'primary', 'secondary', 'open', 'close', 'toggleOn', 'toggleOff', 'blocked', 'tick', 'stinger', 'giftBuild', 'giftPop'] as const;
export type UiSoundKind = (typeof UI_SOUND_KINDS)[number];

export type VoiceWave = 'sine' | 'triangle' | 'square' | 'sawtooth' | 'noise';
export interface VoiceLayer {
  wave: VoiceWave;
  /** MIDI notes, one after another `step` seconds apart (unused for noise). */
  notes: number[];
  step: number;
  duration: number;
  gain: number;
  /** Semitones the pitch slides over the duration (a drop makes a "thock"). */
  bend: number;
  /** Start offset in seconds. */
  at: number;
  /** Noise only: band-pass sweep from, to (Hz). */
  filterHz: [number, number];
}
export interface Voice {
  layers: VoiceLayer[];
}

const SELECTOR_GROUPS = ['toggle', 'close', 'open', 'primary', 'secondary'] as const;
type SelectorGroup = (typeof SELECTOR_GROUPS)[number];

export interface UiSoundsConfig {
  minGapMs: number;
  jitter: number;
  duckGain: number;
  hapticMs: number;
  tickEveryMs: number;
  moveTolerancePx: number;
  selectors: Record<SelectorGroup, string[]>;
  voices: Record<UiSoundKind, Voice>;
}

export function parseUiSoundsConfig(raw: unknown): UiSoundsConfig {
  const c = (raw ?? {}) as Record<string, unknown>;
  const fail = (what: string): never => {
    throw new Error(`ui-sounds.json: ${what}`);
  };
  const num = (v: unknown, what: string, min: number, max: number): number => (typeof v === 'number' && v >= min && v <= max ? v : fail(`"${what}" must be ${min}-${max}`));
  const obj = (v: unknown, what: string): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : fail(`"${what}" must be an object`));
  const sel = obj(c.selectors, 'selectors');
  const selectors = Object.fromEntries(
    SELECTOR_GROUPS.map((group) => {
      const list = sel[group];
      return [group, Array.isArray(list) && list.every((s) => typeof s === 'string' && s.trim()) ? (list as string[]) : fail(`"selectors.${group}" must be a list of selectors`)];
    }),
  ) as Record<SelectorGroup, string[]>;
  const v = obj(c.voices, 'voices');
  const voices = Object.fromEntries(
    UI_SOUND_KINDS.map((kind) => {
      const layers = obj(v[kind], `voices.${kind}`).layers;
      if (!Array.isArray(layers) || layers.length === 0) fail(`"voices.${kind}.layers" must not be empty`);
      return [
        kind,
        {
          layers: (layers as unknown[]).map((rawLayer, i) => {
            const l = obj(rawLayer, `voices.${kind}.layers[${i}]`);
            const where = `voices.${kind}.layers[${i}]`;
            const wave = ['sine', 'triangle', 'square', 'sawtooth', 'noise'].includes(l.wave as string) ? (l.wave as VoiceWave) : fail(`"${where}.wave" must be sine, triangle, square, sawtooth or noise`);
            const notes = wave === 'noise' ? [] : Array.isArray(l.notes) && l.notes.length > 0 && l.notes.every((n) => typeof n === 'number' && n >= 0 && n <= 127) ? (l.notes as number[]) : fail(`"${where}.notes" must be MIDI notes`);
            const filter = l.filterHz === undefined ? [1000, 1000] : Array.isArray(l.filterHz) && l.filterHz.length === 2 && l.filterHz.every((f) => typeof f === 'number' && f >= 20 && f <= 20_000) ? l.filterHz : fail(`"${where}.filterHz" must be [from, to] in Hz`);
            return {
              wave,
              notes,
              step: l.step === undefined ? 0 : num(l.step, `${where}.step`, 0, 1),
              duration: num(l.duration, `${where}.duration`, 0.005, 2),
              gain: num(l.gain, `${where}.gain`, 0, 1),
              bend: l.bend === undefined ? 0 : num(l.bend, `${where}.bend`, -24, 24),
              at: l.at === undefined ? 0 : num(l.at, `${where}.at`, 0, 2),
              filterHz: filter as [number, number],
            };
          }),
        },
      ];
    }),
  ) as Record<UiSoundKind, Voice>;
  return {
    minGapMs: num(c.minGapMs, 'minGapMs', 0, 500),
    jitter: num(c.jitter, 'jitter', 0, 0.2),
    duckGain: num(c.duckGain, 'duckGain', 0, 1),
    hapticMs: num(c.hapticMs, 'hapticMs', 0, 100),
    tickEveryMs: num(c.tickEveryMs, 'tickEveryMs', 30, 1000),
    moveTolerancePx: num(c.moveTolerancePx, 'moveTolerancePx', 0, 50),
    selectors,
    voices,
  };
}

export const UI_SOUNDS_CONFIG: UiSoundsConfig = parseUiSoundsConfig(uiSoundsJson);

/** The throttle: true when a sound may play at `nowMs` (and then remembers it). */
export function createSoundGate(minGapMs: number): (nowMs: number) => boolean {
  let last = Number.NEGATIVE_INFINITY;
  return (nowMs) => {
    if (nowMs - last < minGapMs) return false;
    last = nowMs;
    return true;
  };
}

/** The pitch for one tap: secondary taps vary by up to ±jitter (`rand` 0-1) so repeats don't sound robotic. */
export function pitchFor(kind: UiSoundKind, rand: number, config: UiSoundsConfig = UI_SOUNDS_CONFIG): number {
  return kind === 'secondary' ? 1 + (rand * 2 - 1) * config.jitter : 1;
}

/** What `kindFor` needs from a button (an Element works). */
export interface SoundTarget {
  matches(selector: string): boolean;
  getAttribute(name: string): string | null;
}

const isKind = (value: string | null): value is UiSoundKind => value !== null && (UI_SOUND_KINDS as readonly string[]).includes(value);

/**
 * A button's sound kind: a disabled button is always `blocked`; then `data-sfx`; then the config's selector groups in
 * order (a toggle sounds by its state at the tap: on → off is the down-blip), else `press`.
 */
export function kindFor(target: SoundTarget, config: UiSoundsConfig = UI_SOUNDS_CONFIG): UiSoundKind {
  if (target.matches(':disabled') || target.getAttribute('aria-disabled') === 'true') return 'blocked';
  const explicit = target.getAttribute('data-sfx');
  if (isKind(explicit)) return explicit;
  const any = (group: SelectorGroup): boolean => config.selectors[group].some((s) => target.matches(s));
  if (any('toggle')) {
    const on = target.getAttribute('aria-pressed') ?? target.getAttribute('aria-checked') ?? (target.matches(':checked') ? 'true' : 'false');
    return on === 'true' ? 'toggleOff' : 'toggleOn';
  }
  if (any('close')) return 'close';
  if (any('open')) return target.getAttribute('aria-expanded') === 'true' ? 'close' : 'open';
  if (any('primary')) return 'primary';
  if (any('secondary')) return 'secondary';
  return 'press';
}

export const UI_SOUND_EVENT = 'salon:ui-sound';
export interface UiSoundDetail {
  kind: UiSoundKind;
  pitch: number;
}

/** Announce a UI sound (the audio engine plays it; with no engine it is simply ignored). */
export function emitUiSound(kind: UiSoundKind, pitch = 1): void {
  if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') return;
  window.dispatchEvent(new CustomEvent<UiSoundDetail>(UI_SOUND_EVENT, { detail: { kind, pitch } }));
}
