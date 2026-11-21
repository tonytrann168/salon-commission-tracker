import { describe, expect, it } from 'vitest';
import uiSoundsJson from '../game/config/ui-sounds.json';
import { UI_SOUNDS_CONFIG, UI_SOUND_KINDS, createSoundGate, kindFor, parseUiSoundsConfig, pitchFor } from '../game/ui-sounds';
import type { SoundTarget } from '../game/ui-sounds';

/** Story 070: button sounds (config, the throttle, pitch variation, each button's kind). */

/** A fake button: the selectors it matches, and its attributes. */
const button = (matches: string[], attrs: Record<string, string> = {}): SoundTarget => ({
  matches: (selector) => matches.includes(selector),
  getAttribute: (name) => attrs[name] ?? null,
});

describe('ui-sounds.json', () => {
  it('has a synth voice for every kind, quiet levels, and the 40 ms gap', () => {
    expect(parseUiSoundsConfig(uiSoundsJson)).toEqual(UI_SOUNDS_CONFIG);
    for (const kind of UI_SOUND_KINDS) {
      expect(UI_SOUNDS_CONFIG.voices[kind].layers.length).toBeGreaterThan(0);
      for (const layer of UI_SOUNDS_CONFIG.voices[kind].layers) expect(layer.gain).toBeLessThanOrEqual(0.35);
    }
    expect(UI_SOUNDS_CONFIG.minGapMs).toBe(40);
  });
  it('refuses bad values', () => {
    expect(() => parseUiSoundsConfig({ ...uiSoundsJson, minGapMs: -1 })).toThrow('ui-sounds.json');
    const voices = { ...uiSoundsJson.voices, press: { layers: [] } };
    expect(() => parseUiSoundsConfig({ ...uiSoundsJson, voices })).toThrow('ui-sounds.json');
    const bad = { ...uiSoundsJson.voices, tick: { layers: [{ wave: 'kazoo', notes: [60], duration: 0.1, gain: 0.1 }] } };
    expect(() => parseUiSoundsConfig({ ...uiSoundsJson, voices: bad })).toThrow('ui-sounds.json');
  });
});

describe('the throttle', () => {
  it('lets a sound through only after the gap (no machine-gun on fast taps)', () => {
    const gate = createSoundGate(40);
    expect(gate(1000)).toBe(true);
    expect(gate(1010)).toBe(false);
    expect(gate(1039)).toBe(false);
    expect(gate(1040)).toBe(true);
    expect(gate(1041)).toBe(false);
    expect(gate(2000)).toBe(true);
  });
});

describe('pitch variation', () => {
  it('a small button varies by up to ±jitter; every other kind plays as written', () => {
    const j = UI_SOUNDS_CONFIG.jitter;
    expect(pitchFor('secondary', 0)).toBeCloseTo(1 - j);
    expect(pitchFor('secondary', 1)).toBeCloseTo(1 + j);
    expect(pitchFor('secondary', 0.5)).toBeCloseTo(1);
    for (const kind of ['press', 'primary', 'open', 'close', 'toggleOn', 'blocked'] as const) expect(pitchFor(kind, 0)).toBe(1);
  });
});

describe('each button\'s kind', () => {
  it('disabled > data-sfx > toggle (by state) > close > open > primary > secondary > press', () => {
    expect(kindFor(button([':disabled', '.station-done'], { 'data-sfx': 'giftBuild' }))).toBe('blocked');
    expect(kindFor(button(['.station-done'], { 'data-sfx': 'giftBuild' }))).toBe('giftBuild');
    expect(kindFor(button(['.station-done'], { 'data-sfx': 'not-a-kind' }))).toBe('primary');
    expect(kindFor(button(['.speaker-button'], { 'aria-pressed': 'true' }))).toBe('toggleOff');
    expect(kindFor(button(['.speaker-button'], { 'aria-pressed': 'false' }))).toBe('toggleOn');
    expect(kindFor(button(['input[type=checkbox]', ':checked']))).toBe('toggleOff');
    expect(kindFor(button(['input[type=checkbox]']))).toBe('toggleOn');
    expect(kindFor(button(['.bestie-got-it', '.chat-button.secondary']))).toBe('close');
    expect(kindFor(button(['.chat-menu-button']))).toBe('open');
    expect(kindFor(button(['.mai-bubble'], { 'aria-expanded': 'true' }))).toBe('close');
    expect(kindFor(button(['.chat-form button[type=submit]']))).toBe('primary');
    expect(kindFor(button(['.total-charge']))).toBe('primary');
    expect(kindFor(button(['.station-swatch']))).toBe('secondary');
    expect(kindFor(button(['.mai-answer-use']))).toBe('secondary');
    expect(kindFor(button([]))).toBe('press');
  });
});
