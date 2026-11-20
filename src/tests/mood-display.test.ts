import { describe, expect, it } from 'vitest';
import moodJson from '../game/config/mood-display.json';
import { MOOD_DISPLAY_CONFIG, moodBand, parseMoodDisplayConfig } from '../game/mood-display';

/** Story 067: her mood as a number, coloured by band (green 70-100, amber 40-69, red 0-39). */
describe('the mood bands', () => {
  it('green from 70, amber 40-69, red below 40, each with its face', () => {
    expect(moodBand(100)).toEqual({ band: 'good', face: '😊' });
    expect(moodBand(70).band).toBe('good');
    expect(moodBand(69).band).toBe('mid');
    expect(moodBand(40).band).toBe('mid');
    expect(moodBand(39).band).toBe('low');
    expect(moodBand(0)).toEqual({ band: 'low', face: '😟' });
  });

  it('reads mood-display.json and refuses bad values', () => {
    expect(parseMoodDisplayConfig(moodJson)).toEqual(MOOD_DISPLAY_CONFIG);
    expect(() => parseMoodDisplayConfig({ bands: [{ band: 'good', min: 70, face: '😊' }] })).toThrow('a band must start at 0');
    expect(() => parseMoodDisplayConfig({ bands: [{ band: 'great', min: 0, face: '😊' }] })).toThrow('"bands[0].band"');
  });
});
