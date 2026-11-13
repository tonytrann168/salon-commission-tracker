import { describe, expect, it } from 'vitest';
import { DEFAULT_COMFORT, applyComfort, comfortAttributes, loadComfort, parseComfort, prefersReducedMotion, saveComfort } from '../game/comfort';

/** Story 023: comfort settings. */

describe('comfort settings', () => {
  it('reads a damaged save safely (defaults: normal text, vibration on, the rest off)', () => {
    expect(parseComfort(null)).toEqual(DEFAULT_COMFORT);
    expect(parseComfort('{oops')).toEqual(DEFAULT_COMFORT);
    expect(parseComfort(JSON.stringify({ textSize: 'huge', reduceMotion: 'yes', vibration: false, highContrast: true }))).toEqual({ textSize: 'normal', reduceMotion: false, vibration: false, highContrast: true });
  });

  it('becomes attributes on <html>; reduced motion follows the phone or the setting', () => {
    expect(comfortAttributes({ ...DEFAULT_COMFORT, textSize: 'large' }, false)).toEqual({ 'data-text': 'large', 'data-motion': 'full', 'data-contrast': 'normal' });
    expect(comfortAttributes(DEFAULT_COMFORT, true)['data-motion']).toBe('reduce');
    expect(comfortAttributes({ ...DEFAULT_COMFORT, reduceMotion: true, highContrast: true }, false)).toMatchObject({ 'data-motion': 'reduce', 'data-contrast': 'high' });
  });

  it('saves, applies to a root element, and feeds the code that animates', () => {
    const attrs: Record<string, string> = {};
    saveComfort({ ...DEFAULT_COMFORT, reduceMotion: true });
    applyComfort(loadComfort(), { setAttribute: (name, value) => void (attrs[name] = value) });
    expect(attrs).toMatchObject({ 'data-motion': 'reduce' });
    expect(prefersReducedMotion()).toBe(true);
    saveComfort(DEFAULT_COMFORT);
    expect(prefersReducedMotion()).toBe(false);
  });
});
