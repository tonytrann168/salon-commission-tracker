import stuckJson from './config/stuck.json';

/**
 * Story 068 (owner playtest 5): never leave the player stuck in a loop. Track the client's open question and the
 * misses on it (her "say that again", or a reply graded "Try this"): one miss → the companion helps on her own; two →
 * the client picks a sensible answer herself and moves on (a gentle mood dip). Pure; config: config/stuck.json.
 */
export interface StuckConfig {
  sayAgain: RegExp[];
  missesForHelp: number;
  missesBeforeDefault: number;
  stuckMood: number;
  questionMaxChars: number;
}

export function parseStuckConfig(raw: unknown): StuckConfig {
  const c = (raw ?? {}) as Record<string, unknown>;
  const fail = (what: string): never => {
    throw new Error(`stuck.json: ${what}`);
  };
  const whole = (name: string, min: number, max: number): number => {
    const v = c[name];
    return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : fail(`"${name}" must be a whole number ${min}-${max}`);
  };
  const sayAgain = Array.isArray(c.sayAgain) && c.sayAgain.length > 0 ? (c.sayAgain as unknown[]).map((p, i) => {
    try {
      return new RegExp(typeof p === 'string' ? p : fail(`"sayAgain[${i}]" must be text`), 'i');
    } catch {
      return fail(`"sayAgain[${i}]" is not a valid pattern`);
    }
  }) : fail('"sayAgain" needs patterns');
  const config = {
    sayAgain,
    missesForHelp: whole('missesForHelp', 1, 5),
    missesBeforeDefault: whole('missesBeforeDefault', 1, 6),
    stuckMood: typeof c.stuckMood === 'number' && c.stuckMood <= 0 && c.stuckMood >= -20 ? c.stuckMood : fail('"stuckMood" must be from -20 to 0'),
    questionMaxChars: whole('questionMaxChars', 20, 200),
  };
  if (config.missesBeforeDefault < config.missesForHelp) fail('"missesBeforeDefault" must not be below missesForHelp');
  return config;
}

export const STUCK_CONFIG: StuckConfig = parseStuckConfig(stuckJson);

/** She asks to hear it again ("Sorry, dear, can you say that again? Slowly, please."). */
export const asksToRepeat = (line: string, config: StuckConfig = STUCK_CONFIG): boolean => config.sayAgain.some((re) => re.test(line));

/** Her question, short enough for one line: the last sentence that ends with "?". */
export function questionOf(line: string, config: StuckConfig = STUCK_CONFIG): string | null {
  const sentences = line.match(/[^.!?]*\?/g);
  const last = sentences?.at(-1)?.trim();
  if (!last) return null;
  return last.length > config.questionMaxChars ? `${last.slice(0, config.questionMaxChars - 1).trimEnd()}…` : last;
}

export interface StuckState {
  /** Her open question (null: none waiting). */
  question: string | null;
  misses: number;
}
export const NOT_STUCK: StuckState = { question: null, misses: 0 };

/** What happens after a step: the companion helps now, or the client picks for the player. */
export interface StuckStep {
  state: StuckState;
  help: boolean;
  pickForPlayer: boolean;
}

const step = (state: StuckState, before: StuckState, config: StuckConfig): StuckStep => ({
  state,
  help: state.misses === config.missesForHelp && before.misses < config.missesForHelp,
  pickForPlayer: state.misses === config.missesBeforeDefault && before.misses < config.missesBeforeDefault,
});

/** A client line: "say again" is a miss on the open question; a new question opens; anything else answers it. */
export function onClientLine(state: StuckState, line: string, config: StuckConfig = STUCK_CONFIG): StuckStep {
  if (state.question && asksToRepeat(line, config)) return step({ ...state, misses: state.misses + 1 }, state, config);
  const question = questionOf(line, config);
  if (asksToRepeat(line, config)) return step({ question: question ?? state.question, misses: 1 }, state, config);
  return step(question ? { question, misses: 0 } : NOT_STUCK, state, config);
}

/** The player's reply was graded "Try this" while her question waits: a miss. */
export function onTryGrade(state: StuckState, config: StuckConfig = STUCK_CONFIG): StuckStep {
  return state.question ? step({ ...state, misses: state.misses + 1 }, state, config) : { state, help: false, pickForPlayer: false };
}
