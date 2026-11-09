import type { Container } from 'pixi.js';
import { MOOD_MAX, MOOD_MIN, clampMood } from '../mood';
import type { Outcome } from '../types';
import expressionsJson from '../config/expressions.json';

/** Portrait contract and expression selection. Story: story-009 (design/game-brief.md, art direction). */

/** Mood-band expressions, worst to best. */
export const EXPRESSIONS = ['furious', 'annoyed', 'neutral', 'pleased', 'delighted'] as const;
export type Expression = (typeof EXPRESSIONS)[number];

/** Pose a client shows when the appointment ends in a walk-out. Chosen by outcome, never by a mood band. */
export const WALKOUT_POSE = 'walkout';
export type Pose = Expression | typeof WALKOUT_POSE;
export const POSES: readonly Pose[] = [...EXPRESSIONS, WALKOUT_POSE];

/** Tunable face shape parameters (see config/expressions.json). Angles are degrees; the rest are unit-less. */
export const FACE_PARAM_KEYS = [
  'browAngle', // + tilts inner ends down (angry), - tilts them up
  'browHeight', // -1 low .. 1 high
  'eyeOpen', // 0 shut .. 1 round
  'mouthCurve', // -1 frown .. 1 smile
  'mouthOpen', // 0 closed .. 1 wide open
  'mouthWidth', // 1 is the default width
  'blush', // 0 none .. 1 full
  'lookX', // -1 .. 1 pupil direction
  'headTurn', // -1 .. 1 features slide sideways
  'headTilt', // degrees
] as const;
export type FaceParamKey = (typeof FACE_PARAM_KEYS)[number];
export type FaceParams = Record<FaceParamKey, number>;

export interface ExpressionBand {
  expression: Expression;
  /** Inclusive mood range. */
  min: number;
  max: number;
}

export interface ExpressionConfig {
  /** Length of the expression transition. */
  transitionMs: number;
  bands: readonly ExpressionBand[];
  faces: Record<Pose, FaceParams>;
}

/** Colors a portrait definition gives its renderer. */
export interface PortraitPalette {
  skin: number;
  hair: number;
  accent: number;
}

/** Renderer kinds. Final art (images, Rive faces) adds a kind here and a registry entry in definitions.ts. */
export type PortraitKind = 'placeholder-face';

/** A drawn character face. `view` has its origin at the top-left of a square of `size` pixels. */
export interface Portrait {
  readonly view: Container;
  /** Resize the square. */
  setSize(size: number): void;
  /** Show a pose. The first call snaps; later calls animate. */
  setPose(pose: Pose): void;
  destroy(): void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Validate the raw expressions file. Throws a clear error when it is malformed. */
export function parseExpressionConfig(raw: unknown): ExpressionConfig {
  const fail = (problem: string): never => {
    throw new Error(`expressions.json: ${problem}`);
  };
  if (!isRecord(raw)) return fail('must be an object');

  const { transitionMs, bands, faces } = raw;
  if (typeof transitionMs !== 'number' || !Number.isFinite(transitionMs) || transitionMs <= 0) {
    return fail('"transitionMs" must be a positive number');
  }
  if (!Array.isArray(bands) || bands.length === 0) return fail('"bands" must be a non-empty array');

  let expectedMin = MOOD_MIN;
  const seen = new Set<string>();
  const parsedBands: ExpressionBand[] = bands.map((band: unknown, index) => {
    if (!isRecord(band)) return fail(`bands[${index}] must be an object`);
    const { expression, min, max } = band;
    if (!EXPRESSIONS.some((known) => known === expression)) return fail(`bands[${index}] has unknown expression "${String(expression)}"`);
    if (!Number.isInteger(min) || !Number.isInteger(max)) return fail(`bands[${index}] min and max must be integers`);
    if (seen.has(String(expression))) return fail(`expression "${String(expression)}" has more than one band`);
    seen.add(String(expression));
    const parsed = { expression, min, max } as ExpressionBand;
    if (parsed.min !== expectedMin) {
      return fail(`bands[${index}] starts at ${parsed.min} but must start at ${expectedMin} (gap or overlap)`);
    }
    if (parsed.max < parsed.min) return fail(`bands[${index}] max is below min`);
    expectedMin = parsed.max + 1;
    return parsed;
  });
  if (expectedMin !== MOOD_MAX + 1) return fail(`bands must end at ${MOOD_MAX} but end at ${expectedMin - 1}`);
  for (const expression of EXPRESSIONS) {
    if (!seen.has(expression)) return fail(`expression "${expression}" has no band`);
  }

  if (!isRecord(faces)) return fail('"faces" must be an object');
  for (const pose of POSES) {
    const params = faces[pose];
    if (!isRecord(params)) return fail(`faces.${pose} is missing`);
    for (const key of FACE_PARAM_KEYS) {
      const value = params[key];
      if (typeof value !== 'number' || !Number.isFinite(value)) return fail(`faces.${pose}.${key} must be a number`);
    }
  }

  return { transitionMs, bands: parsedBands, faces: faces as Record<Pose, FaceParams> };
}

/** Validated once at load: a bad file fails at startup, not mid-appointment. */
export const EXPRESSION_CONFIG: ExpressionConfig = parseExpressionConfig(expressionsJson);

/** Expression for a mood, from the configured bands. */
export function expressionForMood(mood: number): Expression {
  const value = Math.round(clampMood(mood));
  const band = EXPRESSION_CONFIG.bands.find((candidate) => value >= candidate.min && value <= candidate.max);
  // Bands cover the whole mood range (validated at load), so a band always matches.
  return (band as ExpressionBand).expression;
}

/** Pose for the client: the walk-out pose when the appointment ended in a walk-out, otherwise the mood's expression. */
export function poseFor(mood: number, outcome: Outcome | null): Pose {
  return outcome === 'walked_out' ? WALKOUT_POSE : expressionForMood(mood);
}
