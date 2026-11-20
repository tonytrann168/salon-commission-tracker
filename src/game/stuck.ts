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
  /** Story 068b: words that start a yes/no question. */
  yesNoStart: string[];
  /** Story 068b: direct answers, per kind of question ({X}/{x} = her choice). */
  answers: Record<'choice' | 'yesNo' | 'open', { en: string[]; vi: string[] }>;
  /** Story 068b: Vietnamese for common choices. */
  words: Record<string, string>;
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
  const lines = (v: unknown, what: string): string[] => (Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'string' && x.trim()) ? (v as string[]) : fail(`"${what}" needs lines`));
  const a = (c.answers ?? {}) as Record<string, Record<string, unknown> | undefined>;
  const kind = (k: 'choice' | 'yesNo' | 'open') => {
    const en = lines(a[k]?.en, `answers.${k}.en`);
    const vi = lines(a[k]?.vi, `answers.${k}.vi`);
    return vi.length === en.length ? { en, vi } : fail(`"answers.${k}" needs as many vi lines as en lines`);
  };
  const words = c.words && typeof c.words === 'object' && Object.values(c.words).every((w) => typeof w === 'string') ? (c.words as Record<string, string>) : fail('"words" must map words to Vietnamese');
  const config = {
    yesNoStart: lines(c.yesNoStart, 'yesNoStart').map((w) => w.toLowerCase()),
    answers: { choice: kind('choice'), yesNo: kind('yesNo'), open: kind('open') },
    words,
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

/** Story 068b: a ready answer to her question: the English line to say, and its Vietnamese. */
export interface Answer {
  en: string;
  vi: string;
}

const cap = (w: string): string => w.charAt(0).toUpperCase() + w.slice(1);
const fill = (line: string, word: string): string => line.replaceAll('{X}', cap(word)).replaceAll('{x}', word);

/**
 * Story 068b: direct answers to her open question (the companion's top card on a miss). "Short or medium nails,
 * please?" → "Short, please." / "Let's do short." / "Medium would be nice."; a yes/no question → "Yes, please." /
 * "No, thank you."; anything else → a polite holding line. Never praise; always an answer.
 */
export function answersFor(question: string, config: StuckConfig = STUCK_CONFIG): Answer[] {
  const q = question.replace(/…$/, '').trim();
  // A choice: "<a> or <b>" (last word before "or", first word after it).
  const choice = q.match(/([A-Za-z]+)\s*,?\s+or\s+([A-Za-z]+)/i);
  if (choice) {
    const picks = [choice[1]!, choice[1]!, choice[2]!].map((w) => w.toLowerCase());
    return config.answers.choice.en.map((en, i) => {
      const word = picks[i % picks.length] as string;
      const viWord = config.words[word] ?? word;
      return { en: fill(en, word), vi: fill(config.answers.choice.vi[i] as string, viWord) };
    });
  }
  const first = q.toLowerCase().match(/^[a-z']+/)?.[0] ?? '';
  const kind = config.yesNoStart.includes(first) ? 'yesNo' : 'open';
  return config.answers[kind].en.map((en, i) => ({ en, vi: config.answers[kind].vi[i] as string }));
}
