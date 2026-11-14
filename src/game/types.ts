import type { NailRequest } from './nail-art/design';
import type { Emotion } from './voice-cast';

/** Appointment phases in order. `done` is terminal. */
export const PHASES = ['consultation', 'service', 'checkout', 'done'] as const;

/** Phase of an appointment. Story: story-001 (design/game-brief.md, MVP feature 1). */
export type Phase = (typeof PHASES)[number];

/** One line of the conversation. `player` is the stylist, `client` is the AI client. */
export interface Message {
  role: 'player' | 'client';
  content: string;
  /** Player line written with "Help me say it" (story 010). Never lowers the client's mood. */
  helped?: boolean;
}

/** Structured model output for one client turn. */
export interface ClientTurn {
  reply: string;
  /** How the player's last message changed the client's mood. Clamped by the game. */
  moodDelta: number;
  /** Phase the model proposes. The game enforces the real phase. */
  phase: Phase;
  /** The player's last line was hard to understand or ungrammatical (story 010). */
  unclearEnglish: boolean;
  /** The player's last line was rude or disrespectful (story 010). */
  rude: boolean;
  /** Story 038: how the client says this line (optional; the mood decides when missing). */
  emotion?: Emotion;
}

/** How an appointment ended. */
export type Outcome = 'completed' | 'walked_out';

/** Hand-off to the results step (story 002). */
export interface AppointmentResult {
  outcome: Outcome;
  transcript: readonly Message[];
  /** Mood after every exchange, starting with the starting mood. */
  moodHistory: readonly number[];
}

/** Static description of a client. */
export interface ClientPersona {
  id: string;
  name: string;
  /** Id of the portrait definition that draws this client (see portraits/definitions.ts). */
  portraitId: string;
  /** What the client wants from the appointment. */
  wants: string;
  personality: string;
  startingMood: number;
  openingLine: string;
  /** Story 005: what the client wants done to her nails, as data (compared with the finished design). */
  nailRequest?: NailRequest;
  /** Story 006: roster data. */
  /** Story 006 follow-up: the client's pronoun for English interface text (Tom is "he"). */
  pronoun: ClientPronoun;
  /** Story 036: how this client speaks Vietnamese, when it isn't the default for the pronoun (see clientVietnamese). */
  vi?: { self?: string; you?: string; note?: string };
  difficulty: Difficulty;
  /** The hard-client types this client covers (the brief's list). */
  types: ClientType[];
  /** One line for the client picker, en and vi. */
  description: { en: string; vi: string };
  /** Placeholder portrait colours (#rrggbb). */
  look: { skin: string; hair: string; accent: string; hairStyle?: 'long' | 'short' };
  /** Multipliers on the model's mood changes: up for raises, down for drops (sensitive clients drop faster). */
  moodSensitivity: { up: number; down: number };
}

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const CLIENT_PRONOUNS = ['she', 'he', 'they'] as const;
export type ClientPronoun = (typeof CLIENT_PRONOUNS)[number];

/** English interface grammar for a client: {cShe}/{CShe}/{cHer} in the string tables ("they" when unknown). */
/** Story 036: the Vietnamese words a client may use for themself, and for the stylist. */
export const VI_SELF_WORDS = ['chị', 'anh', 'cô', 'chú', 'em', 'bà', 'ông'] as const;
export const VI_YOU_WORDS = ['em', 'chị', 'anh', 'con', 'cháu'] as const;

/**
 * How a client talks in Vietnamese: `self` is their word for "I" (male → anh, female → chị, unless the client file
 * says otherwise), `you` their word for the stylist (em by default: the player is the stylist).
 */
export function clientVietnamese(client: Pick<ClientPersona, 'pronoun' | 'vi'>): { self: string; you: string; note: string } {
  return { self: client.vi?.self ?? (client.pronoun === 'he' ? 'anh' : 'chị'), you: client.vi?.you ?? 'em', note: client.vi?.note ?? '' };
}

/** The rule for a Vietnamese translation of this client's own words. */
export function clientVietnameseRule(client: Pick<ClientPersona, 'pronoun' | 'vi' | 'name'>): string {
  const v = clientVietnamese(client);
  const others = VI_SELF_WORDS.filter((w) => w !== v.self && w !== v.you).slice(0, 3).map((w) => `"${w}"`).join(', ');
  return `This client is ${client.name}${client.pronoun === 'he' ? ', a man' : client.pronoun === 'she' ? ', a woman' : ''}. In Vietnamese ${client.name} calls ${client.pronoun === 'he' ? 'himself' : client.pronoun === 'she' ? 'herself' : 'themself'} "${v.self}" and calls the nail technician "${v.you}" (so "I" becomes "${v.self}" and "you" becomes "${v.you}"). Never use ${others} for ${client.name}, and never "tôi" or "bạn".${v.note ? ` ${v.note}` : ''}`;
}

/** Story 036: how the companion and the corrections talk ABOUT this client, and write Vietnamese said TO them. */
export function clientMentionRule(client: Pick<ClientPersona, 'pronoun' | 'vi' | 'name'>): string {
  const v = clientVietnamese(client);
  const third = v.self === 'em' ? 'em ấy' : `${v.self} ấy`;
  return `The client in this appointment is ${client.name}${client.pronoun === 'he' ? ', a man' : client.pronoun === 'she' ? ', a woman' : ''}. In Vietnamese, refer to ${client.name} as "${third}", "khách" or by name, and when you write the Vietnamese meaning of a line the technician says to ${client.name}, the technician calls ${client.name} "${v.self}" and themself "${v.you}"${client.pronoun === 'he' ? ' (never "chị" for him)' : ''}.`;
}

export function clientGrammar(pronoun: ClientPronoun = 'they'): { cShe: string; CShe: string; cHer: string } {
  return pronoun === 'he' ? { cShe: 'he', CShe: 'He', cHer: 'his' } : pronoun === 'she' ? { cShe: 'she', CShe: 'She', cHer: 'her' } : { cShe: 'they', CShe: 'They', cHer: 'their' };
}
export type Difficulty = (typeof DIFFICULTIES)[number];
/** The brief's hard-client types (story 006). */
export const CLIENT_TYPES = ['picky', 'rude-impatient', 'complaint-redo', 'price-booking'] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];

/** Transport that asks the AI for the client's next turn. `transcript` already ends with the new player message. */
export type TakeTurn = (transcript: readonly Message[], phase: Phase, mood: number) => Promise<ClientTurn>;

/** Error codes the turn transport can raise (server codes plus client-side ones). */
export type TurnErrorCode =
  | 'missing_api_key'
  /** Hosted preview (owner, 2026-11-10): no valid invite cookie, a per-minute limit, or a daily cap. */
  | 'unauthorized'
  | 'rate_limited'
  | 'daily_cap'
  | 'invalid_request'
  | 'upstream_error'
  | 'upstream_unreachable'
  | 'invalid_model_output'
  | 'network'
  /** Story 032: the call took longer than its time limit. */
  | 'timeout'
  | 'unknown';

/** Story 032: a fetch that failed, as a TurnError: a timed-out call says so (the chat offers Try again either way). */
export const networkError = (error: unknown): TurnError =>
  error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError') ? new TurnError('timeout', 'The server took too long.') : new TurnError('network', 'Could not reach the server.');

/** Typed failure of a client turn. */
export class TurnError extends Error {
  readonly code: TurnErrorCode;

  constructor(code: TurnErrorCode, message: string) {
    super(message);
    this.name = 'TurnError';
    this.code = code;
  }
}

/** The player's English level. Story: story-002 (weights); story-010 adds the picker. */
export const ENGLISH_LEVELS = ['beginner', 'some', 'comfortable', 'fluent'] as const;

/** English level of the player. */
export type EnglishLevel = (typeof ENGLISH_LEVELS)[number];

/** The five scorecard skills. Story: story-002. */
export const SKILL_KEYS = ['greeting', 'consultation', 'upsell', 'rebooking', 'problemHandling'] as const;

export type SkillKey = (typeof SKILL_KEYS)[number];

/** Each skill 0-100. */
export type SkillScores = Record<SkillKey, number>;

/** The three parts of the English score. */
export const ENGLISH_KEYS = ['clarity', 'politeness', 'grammarVocabulary'] as const;

export type EnglishKey = (typeof ENGLISH_KEYS)[number];

/** Each part 0-100, graded from the player's own lines only. */
export type EnglishScores = Record<EnglishKey, number>;

/** What the grading call needs to know about a finished appointment. */
export interface GradingRequest {
  transcript: readonly Message[];
  outcome: Outcome;
  /** Mood when the appointment ended, 0-100. */
  finalMood: number;
  level: EnglishLevel;
  /** Story 005: the finished nails and their match with the request (0-100), so the review mentions them. */
  nails?: { description: string; match: number };
  /** Story 019: the situation (optional), and the visit facts for a returning client. */
  scenarioId?: string;
  visits?: { visits: number; lastStars: number; lastDay: string };
  /** Story 006: which roster client (Dana when missing). */
  clientId?: string;
}

/** Structured output of the grading call. Stars and tip are computed from it by game code (scoring.ts). */
export interface Grading {
  skills: SkillScores;
  english: EnglishScores;
  /** The client agreed to book again. */
  rebooked: boolean;
  /** The client demanded the work be redone. */
  redoDemanded: boolean;
  /** 1-3 sentences in the client's voice. */
  review: string;
}

/** Transport that grades a finished appointment. Rejects with TurnError. */
export type GradeAppointment = (request: GradingRequest) => Promise<Grading>;

/** Which way a line is translated (story 010). */
export type TranslateDirection = 'en-to-vi' | 'vi-to-en';

/** Transport that translates one line through the server. Rejects with TurnError. */
export type Translate = (text: string, direction: TranslateDirection, level?: EnglishLevel, clientId?: string) => Promise<string>;

/** How Vietnamese help is shown on client lines: on tap, or always side by side (full Vietnamese mode). Story: story-010. */
export const HELP_LANGUAGES = ['tap', 'full'] as const;

export type HelpLanguage = (typeof HELP_LANGUAGES)[number];
