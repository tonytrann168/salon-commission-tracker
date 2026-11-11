import type { CompanionIdentity } from '../companion-core';
import learningJson from '../config/learning.json';
import type { BestieLanguage } from '../bestie';
import { TurnError } from '../types';
import type { EnglishLevel, Message, Outcome, Phase, TurnErrorCode } from '../types';

/**
 * The learning loop's AI side: request/response shapes shared with api/corrections.ts, the browser transport, the
 * config, and the whisper budget (at most one whisper per player line, a cap per appointment).
 * Story: story-011 (design/game-brief.md, MVP feature 4).
 */

/** Phrasebook topics (story 011). */
export const TOPICS = ['greeting', 'consultation', 'price', 'booking', 'problems'] as const;
export type Topic = (typeof TOPICS)[number];

export interface LearningConfig {
  whispers: {
    /** Whispered corrections shown per appointment, at most. */
    maxPerAppointment: number;
    /** Lines shorter than this many words are not checked ("ok", "yes"). */
    minPlayerWords: number;
  };
  review: { maxLines: number; tryLines: number; maxUsedWell: number };
  phrasebook: { maxEntries: number };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Validate the raw learning file. Throws a clear `learning.json: ...` error when it is malformed. */
export function parseLearningConfig(raw: unknown): LearningConfig {
  const fail = (problem: string): never => {
    throw new Error(`learning.json: ${problem}`);
  };
  const object = (value: unknown, path: string): Record<string, unknown> => (isRecord(value) ? value : fail(`"${path}" must be an object`));
  const whole = (value: unknown, path: string, min: number, max: number): number =>
    typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : fail(`"${path}" must be a whole number from ${min} to ${max}`);
  const root = object(raw, 'root');
  const whispers = object(root.whispers, 'whispers');
  const review = object(root.review, 'review');
  const phrasebook = object(root.phrasebook, 'phrasebook');
  return {
    whispers: {
      maxPerAppointment: whole(whispers.maxPerAppointment, 'whispers.maxPerAppointment', 0, 20),
      minPlayerWords: whole(whispers.minPlayerWords, 'whispers.minPlayerWords', 1, 20),
    },
    review: {
      maxLines: whole(review.maxLines, 'review.maxLines', 1, 10),
      tryLines: whole(review.tryLines, 'review.tryLines', 1, 10),
      maxUsedWell: whole(review.maxUsedWell, 'review.maxUsedWell', 0, 10),
    },
    phrasebook: { maxEntries: whole(phrasebook.maxEntries, 'phrasebook.maxEntries', 10, 5000) },
  };
}

export const LEARNING_CONFIG: LearningConfig = parseLearningConfig(learningJson);

/** An English phrase with its Vietnamese meaning and topic. */
export interface Phrase {
  en: string;
  vi: string;
  topic: Topic;
}

/** Check one player line right after it is sent. */
export interface LineCheckRequest {
  kind: 'line';
  /** Story 013: the companion giving the correction. */
  companion?: CompanionIdentity;
  level: EnglishLevel;
  language: BestieLanguage;
  phase: Phase;
  /** The player's line. */
  line: string;
  /** The client's line the player was answering ('' at the very start). */
  clientLine: string;
}

export interface LineCheckResult {
  /** False when the line is fine for the player's level: no whisper. */
  needsCorrection: boolean;
  /** What worked, said first (kind before correcting). */
  praise: string;
  /** The better English line. */
  better: Phrase | null;
  /** One short reason, in the coaching language. */
  reason: string;
}

/** The English review and Vietnamese recap after an appointment. */
export interface ReviewRequest {
  kind: 'review';
  companion?: CompanionIdentity;
  level: EnglishLevel;
  language: BestieLanguage;
  outcome: Outcome;
  transcript: readonly Message[];
}

export interface ReviewLine {
  /** What the player said. */
  said: string;
  better: Phrase;
  /** One line, in Vietnamese in Vietnamese mode. */
  reason: string;
}

export interface ReviewResult {
  /** The player's lines worth improving (may be empty). */
  lines: ReviewLine[];
  /** Short recap of the appointment, always in Vietnamese. */
  recap: string;
  /** Better English lines to try next time. */
  tryLines: Phrase[];
  /** Salon phrases the player used well. */
  usedWell: Phrase[];
}

export interface CorrectionsTransport {
  checkLine(request: Omit<LineCheckRequest, 'kind'>): Promise<LineCheckResult>;
  review(request: Omit<ReviewRequest, 'kind'>): Promise<ReviewResult>;
}

const ENDPOINT = '/api/corrections';
const TIMEOUT_MS = 30_000;

/** Browser transport: posts to the corrections server function. The API key never reaches the browser. */
/** `getCompanion` (story 013) adds the companion's name and gender to every request. */
export function createCorrectionsTransport(getCompanion?: () => CompanionIdentity): CorrectionsTransport {
  const post = async <T>(request: LineCheckRequest | ReviewRequest): Promise<T> => {
    let response: Response;
    let body: unknown;
    try {
      response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(getCompanion ? { ...request, companion: getCompanion() } : request),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      body = await response.json();
    } catch {
      throw new TurnError('network', 'Could not reach the server.');
    }
    if (!response.ok) {
      const error = (body as { error?: { code?: TurnErrorCode; message?: string } } | null)?.error;
      throw new TurnError(error?.code ?? 'unknown', error?.message ?? `Server returned ${response.status}.`);
    }
    return body as T;
  };
  return {
    checkLine: (request) => post<LineCheckResult>({ kind: 'line', ...request }),
    review: (request) => post<ReviewResult>({ kind: 'review', ...request }),
  };
}

/** Whether a just-sent player line gets checked for a whisper. Help me say it lines are the game's English, never checked. */
export function shouldCheckLine(
  line: string,
  helped: boolean,
  whispersShown: number,
  config: LearningConfig = LEARNING_CONFIG,
): boolean {
  if (helped || whispersShown >= config.whispers.maxPerAppointment) return false;
  return line.trim().split(/\s+/).filter((word) => word !== '').length >= config.whispers.minPlayerWords;
}
