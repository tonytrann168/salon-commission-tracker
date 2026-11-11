import { BESTIE_CONFIG } from './bestie';
import type { BestieConfig } from './bestie';
import { readStored, writeStored } from './safe-storage';
import { SKILL_KEYS } from './types';
import type { Outcome, SkillKey, SkillScores } from './types';

/**
 * What the bestie remembers on this device: a compact summary (refreshed by each debrief and answer, never whole
 * transcripts), how many appointments the player has done, the bestie's XP, and when she last asked a question.
 * Pure functions plus load/save. Story: story-003.
 */

export interface BestieMemory {
  /** Short notes in the bestie's words: weak skills, wins, details the player shared. */
  summary: string;
  /** Appointments finished (with a debrief). */
  sessions: number;
  xp: number;
  /** `sessions` value when the last question was asked, or -1 for never. */
  lastQuestionAt: number;
  /** The last appointment was a tough one (walk-out or 1-2 stars): Mai is gentle next time. */
  lastTough: boolean;
  /** Story 013: the local day of the last daily hello ('' for never), and the skill the player did best last time. */
  lastHelloDay: string;
  lastWin: SkillKey | '';
}

const STORAGE_KEY = 'salon.bestie.v1';

export const EMPTY_MEMORY: BestieMemory = { summary: '', sessions: 0, xp: 0, lastQuestionAt: -1, lastTough: false, lastHelloDay: '', lastWin: '' };

const whole = (value: unknown, min: number): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= min ? value : null;

/** Read saved memory. Anything missing or malformed falls back field by field, so a bad save never breaks the bestie. */
export function parseStoredMemory(raw: string | null, config: BestieConfig = BESTIE_CONFIG): BestieMemory {
  if (raw === null) return { ...EMPTY_MEMORY };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ...EMPTY_MEMORY };
  }
  if (typeof data !== 'object' || data === null) return { ...EMPTY_MEMORY };
  const record = data as Record<string, unknown>;
  return {
    summary: typeof record.summary === 'string' ? record.summary.slice(0, config.memory.maxSummaryChars) : '',
    sessions: whole(record.sessions, 0) ?? 0,
    xp: whole(record.xp, 0) ?? 0,
    lastQuestionAt: whole(record.lastQuestionAt, -1) ?? -1,
    lastTough: record.lastTough === true,
    lastHelloDay: typeof record.lastHelloDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(record.lastHelloDay) ? record.lastHelloDay : '',
    lastWin: SKILL_KEYS.find((key) => key === record.lastWin) ?? '',
  };
}

export function loadMemory(): BestieMemory {
  return parseStoredMemory(readStored(STORAGE_KEY));
}

export function saveMemory(memory: BestieMemory): void {
  writeStored(STORAGE_KEY, JSON.stringify(memory));
}

/** The bestie's level (1-based) for an XP total. */
export function bestieLevel(xp: number, config: BestieConfig = BESTIE_CONFIG): number {
  return config.levelXp.filter((needed) => xp >= needed).length;
}

/**
 * Whether this debrief asks a question. `roll` is a random number in [0, 1) passed in so this stays testable.
 * Never before `firstAfterSessions` appointments, never closer than `minSessionsBetween`, and then only by chance.
 */
export function shouldAskQuestion(memory: BestieMemory, roll: number, config: BestieConfig = BESTIE_CONFIG): boolean {
  const { chance, firstAfterSessions, minSessionsBetween } = config.question;
  if (memory.sessions < firstAfterSessions) return false;
  if (memory.lastQuestionAt >= 0 && memory.sessions - memory.lastQuestionAt < minSessionsBetween) return false;
  return roll < chance;
}

const clampSummary = (summary: string, config: BestieConfig): string => summary.trim().slice(0, config.memory.maxSummaryChars);

/** Local calendar date as YYYY-MM-DD. */
export const localDay = (date: Date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Which hello Mai gives on the title screen (owner, 2026-11-10: warm, personal, gentle after a bad visit). */
export type GreetingKind = 'first' | 'tough' | 'streak' | 'back';

/**
 * `streak` is THE streak (story 007, unified 2026-11-10): days in a row with a finished daily client, from the progress
 * save (`liveStreak`, already 0 after a missed day, which Mai never mentions). Mai keeps no counter of her own.
 */
export function greetingKind(memory: BestieMemory, streak: number): GreetingKind {
  if (memory.sessions === 0) return 'first';
  if (memory.lastTough) return 'tough';
  if (streak >= 2) return 'streak';
  return 'back';
}

/** Memory after a debrief: one more session, XP for the outcome, the refreshed summary, and the question mark if one was asked. */
export function afterDebrief(
  memory: BestieMemory,
  update: { summary: string; outcome: Outcome; asked: boolean; today?: string; tough?: boolean; win?: SkillKey | '' },
  config: BestieConfig = BESTIE_CONFIG,
): BestieMemory {
  return {
    ...memory,
    ...(update.win !== undefined ? { lastWin: update.win } : {}),
    lastTough: update.tough ?? update.outcome === 'walked_out',
    summary: clampSummary(update.summary, config),
    sessions: memory.sessions + 1,
    xp: memory.xp + (update.outcome === 'completed' ? config.xp.completed : config.xp.walkedOut),
    lastQuestionAt: update.asked ? memory.sessions : memory.lastQuestionAt,
  };
}

/** The skill the player did best, if it was good enough to mention (80+), else ''. */
export function bestSkill(skills: SkillScores, min = 80): SkillKey | '' {
  const [key, score] = SKILL_KEYS.map((k) => [k, skills[k]] as const).sort((a, b) => b[1] - a[1])[0] ?? ['greeting', 0];
  return score >= min ? key : '';
}

/** The first open of a day: Mai says hello and the friendship gains a little. Returns null if she already did today. */
export function afterHello(memory: BestieMemory, today: string, config: BestieConfig = BESTIE_CONFIG): BestieMemory | null {
  if (memory.lastHelloDay === today) return null;
  return { ...memory, lastHelloDay: today, xp: memory.xp + (memory.sessions > 0 ? config.xp.dailyHello : 0) };
}

/** A phrase practised out loud adds a little friendship. */
export function afterPractice(memory: BestieMemory, config: BestieConfig = BESTIE_CONFIG): BestieMemory {
  return { ...memory, xp: memory.xp + config.xp.phrasePractised };
}

/** Memory after the player answers a question: the refreshed summary and XP for answering. */
export function afterAnswer(memory: BestieMemory, summary: string, config: BestieConfig = BESTIE_CONFIG): BestieMemory {
  return { ...memory, summary: clampSummary(summary, config), xp: memory.xp + config.xp.questionAnswered };
}
