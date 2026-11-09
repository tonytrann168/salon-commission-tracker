import scoringJson from './config/scoring.json';
import { MOOD_MAX, MOOD_MIN } from './mood';
import { ENGLISH_KEYS, ENGLISH_LEVELS, SKILL_KEYS } from './types';
import type { EnglishKey, EnglishLevel, EnglishScores, Outcome, SkillKey, SkillScores } from './types';

/**
 * Pure scoring: stars, tip, goal and fail from the final mood and the graded scorecard.
 * Story: story-002 (design/game-brief.md, MVP feature 5). Every number comes from config/scoring.json.
 */

/** Stars a result can have. */
export type Stars = 1 | 2 | 3 | 4 | 5;

export interface ScoringConfig {
  /** Level used until story 010 adds the picker. */
  defaultEnglishLevel: EnglishLevel;
  stars: {
    /** Share of the composite that comes from the final mood; the rest comes from the weighted skills. */
    moodWeight: number;
    skillWeights: Record<SkillKey, number>;
    /** Lowest composite (0-100) that earns 2, 3, 4 and 5 stars. Below the 2-star line is 1 star. */
    minComposite: Record<2 | 3 | 4 | 5, number>;
    fiveStar: { minMood: number; skillFloor: number };
  };
  /** Weight of each English part in the composite, per level. 0 means it has no effect on stars, tip or the floor. */
  englishWeights: Record<EnglishLevel, Record<EnglishKey, number>>;
  tip: {
    /** Fewest stars that earn a tip. */
    minStars: 2 | 3 | 4 | 5;
    min: number;
    max: number;
    /** A tip at or above this counts as "good" for the goal. */
    goodTipMin: number;
  };
}

export type FailReason = 'walked_out' | 'low_stars' | 'redo_demanded';

export interface ScoreInput {
  finalMood: number;
  outcome: Outcome;
  skills: SkillScores;
  english: EnglishScores;
  level: EnglishLevel;
  rebooked: boolean;
  redoDemanded: boolean;
}

export interface ScoreResult {
  stars: Stars;
  /** Whole dollars. */
  tip: number;
  /** Brief goal: 5 stars + good tip + rebooking. */
  goalMet: boolean;
  /** Brief fail: walk-out, 1-2 stars or a redo demand. */
  failed: boolean;
  failReasons: FailReason[];
  /** Mean of the three English parts, 0-100. Display only; level weighting applies to stars and tip, not to this. */
  englishScore: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isScore = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= MOOD_MIN && value <= MOOD_MAX;

/** Validate the raw scoring file. Throws a clear `scoring.json: ...` error when it is malformed. */
export function parseScoringConfig(raw: unknown): ScoringConfig {
  const fail = (problem: string): never => {
    throw new Error(`scoring.json: ${problem}`);
  };
  const object = (value: unknown, path: string): Record<string, unknown> =>
    isRecord(value) ? value : fail(`"${path}" must be an object`);
  const number = (value: unknown, path: string, min: number, max: number): number =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
      ? value
      : fail(`"${path}" must be a number from ${min} to ${max}`);

  const root = object(raw, 'root');
  const level = root.defaultEnglishLevel;
  if (!ENGLISH_LEVELS.some((known) => known === level)) {
    fail(`"defaultEnglishLevel" must be one of ${ENGLISH_LEVELS.join(', ')}`);
  }

  const stars = object(root.stars, 'stars');
  const skillWeights = object(stars.skillWeights, 'stars.skillWeights');
  const parsedSkillWeights = Object.fromEntries(
    SKILL_KEYS.map((key) => [key, number(skillWeights[key], `stars.skillWeights.${key}`, 0, 100)]),
  ) as Record<SkillKey, number>;
  const minComposite = object(stars.minComposite, 'stars.minComposite');
  const parsedMin = {
    2: number(minComposite['2'], 'stars.minComposite.2', 0, 100),
    3: number(minComposite['3'], 'stars.minComposite.3', 0, 100),
    4: number(minComposite['4'], 'stars.minComposite.4', 0, 100),
    5: number(minComposite['5'], 'stars.minComposite.5', 0, 100),
  };
  if (!(parsedMin[2] < parsedMin[3] && parsedMin[3] < parsedMin[4] && parsedMin[4] < parsedMin[5])) {
    fail('"stars.minComposite" must increase from 2 to 5 stars');
  }
  const fiveStar = object(stars.fiveStar, 'stars.fiveStar');

  const weights = object(root.englishWeights, 'englishWeights');
  const englishWeights = Object.fromEntries(
    ENGLISH_LEVELS.map((name) => {
      const perLevel = object(weights[name], `englishWeights.${name}`);
      return [
        name,
        Object.fromEntries(ENGLISH_KEYS.map((key) => [key, number(perLevel[key], `englishWeights.${name}.${key}`, 0, 100)])),
      ];
    }),
  ) as Record<EnglishLevel, Record<EnglishKey, number>>;
  // Story-002 rule: below Comfortable, grammar/vocabulary can never cost a star.
  for (const name of ['beginner', 'some'] as const) {
    if (englishWeights[name].grammarVocabulary !== 0) fail(`"englishWeights.${name}.grammarVocabulary" must be 0`);
  }

  const tip = object(root.tip, 'tip');
  const minStars = tip.minStars;
  if (minStars !== 2 && minStars !== 3 && minStars !== 4 && minStars !== 5) fail('"tip.minStars" must be 2, 3, 4 or 5');
  const tipMin = number(tip.min, 'tip.min', 0, 10_000);
  const tipMax = number(tip.max, 'tip.max', tipMin, 10_000);

  return {
    defaultEnglishLevel: level as EnglishLevel,
    stars: {
      moodWeight: number(stars.moodWeight, 'stars.moodWeight', 0, 1),
      skillWeights: parsedSkillWeights,
      minComposite: parsedMin,
      fiveStar: {
        minMood: number(fiveStar.minMood, 'stars.fiveStar.minMood', MOOD_MIN, MOOD_MAX),
        skillFloor: number(fiveStar.skillFloor, 'stars.fiveStar.skillFloor', 0, 100),
      },
    },
    englishWeights,
    tip: { minStars: minStars as 2 | 3 | 4 | 5, min: tipMin, max: tipMax, goodTipMin: number(tip.goodTipMin, 'tip.goodTipMin', tipMin, tipMax) },
  };
}

/** Validated once at load: a bad file fails at startup, not mid-appointment. */
export const SCORING_CONFIG: ScoringConfig = parseScoringConfig(scoringJson);

/**
 * Turn the final mood and graded scorecard into stars, tip and the goal/fail marks. Deterministic.
 * A walk-out is always 1 star with no tip. 5 stars also need a high final mood and no counted skill below the floor;
 * a counted skill is one with a weight above 0 at the player's level.
 */
export function scoreAppointment(input: ScoreInput, config: ScoringConfig = SCORING_CONFIG): ScoreResult {
  const { finalMood, outcome, skills, english, level, rebooked, redoDemanded } = input;
  const englishScore = Math.round(ENGLISH_KEYS.reduce((sum, key) => sum + english[key], 0) / ENGLISH_KEYS.length);

  const counted: { score: number; weight: number }[] = [
    ...SKILL_KEYS.map((key) => ({ score: skills[key], weight: config.stars.skillWeights[key] })),
    ...ENGLISH_KEYS.map((key) => ({ score: english[key], weight: config.englishWeights[level][key] })),
  ].filter((entry) => entry.weight > 0);

  let stars: Stars = 1;
  let tip = 0;
  if (outcome !== 'walked_out') {
    const totalWeight = counted.reduce((sum, entry) => sum + entry.weight, 0);
    const skillMean = counted.reduce((sum, entry) => sum + entry.score * entry.weight, 0) / totalWeight;
    const composite = config.stars.moodWeight * finalMood + (1 - config.stars.moodWeight) * skillMean;

    const fiveStarOk =
      finalMood >= config.stars.fiveStar.minMood && counted.every((entry) => entry.score >= config.stars.fiveStar.skillFloor);
    for (const candidate of [2, 3, 4, 5] as const) {
      if (composite >= config.stars.minComposite[candidate] && (candidate < 5 || fiveStarOk)) stars = candidate;
    }

    if (stars >= config.tip.minStars) {
      const from = config.stars.minComposite[config.tip.minStars];
      const share = Math.min(1, Math.max(0, (composite - from) / (MOOD_MAX - from)));
      tip = Math.round(config.tip.min + (config.tip.max - config.tip.min) * share);
    }
  }

  const failReasons: FailReason[] = [];
  if (outcome === 'walked_out') failReasons.push('walked_out');
  else if (stars <= 2) failReasons.push('low_stars');
  if (redoDemanded) failReasons.push('redo_demanded');

  return {
    stars,
    tip,
    goalMet: stars === 5 && tip >= config.tip.goodTipMin && rebooked,
    failed: failReasons.length > 0,
    failReasons,
    englishScore,
  };
}
