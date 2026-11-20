import moodDisplayJson from './config/mood-display.json';

/**
 * Story 067 (owner): the client's mood as a number 0-100 in a pill (like a phone's battery %), its colour and face by
 * band. Pure; config: config/mood-display.json.
 */
export type MoodBand = 'good' | 'mid' | 'low';
export interface MoodDisplayConfig {
  /** Highest first. */
  bands: { band: MoodBand; min: number; face: string }[];
}

export function parseMoodDisplayConfig(raw: unknown): MoodDisplayConfig {
  const fail = (what: string): never => {
    throw new Error(`mood-display.json: ${what}`);
  };
  const list = (raw as { bands?: unknown } | null)?.bands;
  if (!Array.isArray(list) || list.length === 0) return fail('"bands" must be a list');
  const bands = list.map((b, i) => {
    const r = b as Record<string, unknown>;
    const band: MoodBand = r.band === 'good' || r.band === 'mid' || r.band === 'low' ? r.band : fail(`"bands[${i}].band" must be good, mid or low`);
    const min = typeof r.min === 'number' && r.min >= 0 && r.min <= 100 ? r.min : fail(`"bands[${i}].min" must be 0-100`);
    const face = typeof r.face === 'string' && r.face.trim() ? r.face : fail(`"bands[${i}].face" is missing`);
    return { band, min, face };
  });
  if (!bands.some((b) => b.min === 0)) fail('a band must start at 0');
  return { bands: [...bands].sort((a, b) => b.min - a.min) };
}

export const MOOD_DISPLAY_CONFIG: MoodDisplayConfig = parseMoodDisplayConfig(moodDisplayJson);

/** The band (and face) for a mood. */
export function moodBand(mood: number, config: MoodDisplayConfig = MOOD_DISPLAY_CONFIG): { band: MoodBand; face: string } {
  const found = config.bands.find((b) => mood >= b.min) ?? config.bands[config.bands.length - 1]!;
  return { band: found.band, face: found.face };
}
