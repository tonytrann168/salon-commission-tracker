import bestieJson from './config/bestie.json';
import { TurnError } from './types';
import type { EnglishLevel, EnglishScores, Message, Outcome, Phase, SkillScores, TurnErrorCode } from './types';

/**
 * The signature bestie: persona and tuning from config/bestie.json, the request/response shapes shared with the
 * server function (api/bestie.ts), and the browser transport. Story: story-003 (design/game-brief.md, MVP feature 4).
 * Memory lives in bestie-memory.ts; the UI in ui/bestie-panel.ts.
 */

/** The language the bestie coaches in: follows full Vietnamese mode (story 010). English example lines stay English. */
export type BestieLanguage = 'en' | 'vi';

export interface BestieConfig {
  name: string;
  /** Goes into every bestie system prompt. */
  persona: string;
  /** XP needed for each bestie level, ascending, starting at 0 (level 1). */
  levelXp: number[];
  xp: { completed: number; walkedOut: number; questionAnswered: number };
  question: {
    /** Chance of a question after an appointment, when one is allowed. */
    chance: number;
    /** No question until this many appointments are behind the player. */
    firstAfterSessions: number;
    /** Appointments between two questions (2 = never two in a row). */
    minSessionsBetween: number;
  };
  memory: { maxSummaryChars: number };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Validate the raw bestie file. Throws a clear `bestie.json: ...` error when it is malformed. */
export function parseBestieConfig(raw: unknown): BestieConfig {
  const fail = (problem: string): never => {
    throw new Error(`bestie.json: ${problem}`);
  };
  const object = (value: unknown, path: string): Record<string, unknown> => (isRecord(value) ? value : fail(`"${path}" must be an object`));
  const text = (value: unknown, path: string): string =>
    typeof value === 'string' && value.trim() !== '' ? value : fail(`"${path}" must be a non-empty string`);
  const number = (value: unknown, path: string, min: number, max: number): number =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : fail(`"${path}" must be a number from ${min} to ${max}`);

  const root = object(raw, 'root');
  const levelXp = Array.isArray(root.levelXp) ? root.levelXp : fail('"levelXp" must be a list');
  const parsedLevels = levelXp.map((value, index) => number(value, `levelXp[${index}]`, 0, 1_000_000));
  if (parsedLevels.length === 0 || parsedLevels[0] !== 0) fail('"levelXp" must start at 0');
  if (parsedLevels.some((value, index) => index > 0 && value <= (parsedLevels[index - 1] as number))) fail('"levelXp" must go up');
  const xp = object(root.xp, 'xp');
  const question = object(root.question, 'question');
  const memory = object(root.memory, 'memory');
  return {
    name: text(root.name, 'name'),
    persona: text(root.persona, 'persona'),
    levelXp: parsedLevels,
    xp: {
      completed: number(xp.completed, 'xp.completed', 0, 1000),
      walkedOut: number(xp.walkedOut, 'xp.walkedOut', 0, 1000),
      questionAnswered: number(xp.questionAnswered, 'xp.questionAnswered', 0, 1000),
    },
    question: {
      chance: number(question.chance, 'question.chance', 0, 1),
      firstAfterSessions: number(question.firstAfterSessions, 'question.firstAfterSessions', 0, 100),
      minSessionsBetween: number(question.minSessionsBetween, 'question.minSessionsBetween', 1, 100),
    },
    memory: { maxSummaryChars: number(memory.maxSummaryChars, 'memory.maxSummaryChars', 100, 4000) },
  };
}

/** Validated once at load: a bad file fails at startup. */
export const BESTIE_CONFIG: BestieConfig = parseBestieConfig(bestieJson);

/** A whispered hint during an appointment. The client never sees it. */
export interface HintRequest {
  kind: 'hint';
  level: EnglishLevel;
  language: BestieLanguage;
  phase: Phase;
  mood: number;
  transcript: readonly Message[];
  /** The bestie's memory of past sessions (may be empty). */
  memory: string;
}

/** The debrief after an appointment, built on the scorecard. */
export interface DebriefRequest {
  kind: 'debrief';
  level: EnglishLevel;
  language: BestieLanguage;
  outcome: Outcome;
  stars: number;
  tip: number;
  englishScore: number;
  skills: SkillScores;
  english: EnglishScores;
  review: string;
  transcript: readonly Message[];
  memory: string;
  /** Which appointment this is for the player (1 = first ever). */
  sessionNumber: number;
  /** Ask the player a "how would you handle..." question this time. */
  askQuestion: boolean;
}

/** The player's answer to the bestie's question. */
export interface AnswerRequest {
  kind: 'answer';
  level: EnglishLevel;
  language: BestieLanguage;
  question: string;
  answer: string;
  memory: string;
}

export type BestieRequest = HintRequest | DebriefRequest | AnswerRequest;

export interface HintResult {
  hint: string;
}

export interface DebriefResult {
  /** One thing done well. */
  praise: string;
  /** One thing to try next time. */
  tryNext: string;
  /** Set only when the request asked for a question. */
  question: string | null;
  /** The refreshed memory summary. */
  memory: string;
}

export interface AnswerResult {
  reply: string;
  /** The refreshed memory summary (now including what the player shared). */
  memory: string;
}

export interface BestieTransport {
  hint(request: Omit<HintRequest, 'kind'>): Promise<HintResult>;
  debrief(request: Omit<DebriefRequest, 'kind'>): Promise<DebriefResult>;
  answer(request: Omit<AnswerRequest, 'kind'>): Promise<AnswerResult>;
}

const ENDPOINT = '/api/bestie';
const TIMEOUT_MS = 30_000;

/** Browser transport: posts to the bestie server function. The API key never reaches the browser. */
export function createBestieTransport(): BestieTransport {
  const post = async <T>(request: BestieRequest): Promise<T> => {
    let response: Response;
    let body: unknown;
    try {
      response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request),
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
    hint: (request) => post<HintResult>({ kind: 'hint', ...request }),
    debrief: (request) => post<DebriefResult>({ kind: 'debrief', ...request }),
    answer: (request) => post<AnswerResult>({ kind: 'answer', ...request }),
  };
}
