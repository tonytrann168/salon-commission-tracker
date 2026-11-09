/** Appointment phases in order. `done` is terminal. */
export const PHASES = ['consultation', 'service', 'checkout', 'done'] as const;

/** Phase of an appointment. Story: story-001 (design/game-brief.md, MVP feature 1). */
export type Phase = (typeof PHASES)[number];

/** One line of the conversation. `player` is the stylist, `client` is the AI client. */
export interface Message {
  role: 'player' | 'client';
  content: string;
}

/** Structured model output for one client turn. */
export interface ClientTurn {
  reply: string;
  /** How the player's last message changed the client's mood. Clamped by the game. */
  moodDelta: number;
  /** Phase the model proposes. The game enforces the real phase. */
  phase: Phase;
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
