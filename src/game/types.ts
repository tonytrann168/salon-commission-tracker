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
}

/** Transport that asks the AI for the client's next turn. `transcript` already ends with the new player message. */
export type TakeTurn = (transcript: readonly Message[], phase: Phase, mood: number) => Promise<ClientTurn>;

/** Error codes the turn transport can raise (server codes plus client-side ones). */
export type TurnErrorCode =
  | 'missing_api_key'
  | 'invalid_request'
  | 'upstream_error'
  | 'upstream_unreachable'
  | 'invalid_model_output'
  | 'network'
  | 'unknown';

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
export type Translate = (text: string, direction: TranslateDirection) => Promise<string>;

/** How Vietnamese help is shown on client lines: on tap, or always side by side (full Vietnamese mode). Story: story-010. */
export const HELP_LANGUAGES = ['tap', 'full'] as const;

export type HelpLanguage = (typeof HELP_LANGUAGES)[number];
