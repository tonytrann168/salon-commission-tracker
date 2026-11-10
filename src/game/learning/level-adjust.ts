import { ENGLISH_LEVELS_CONFIG } from '../english-level';
import type { AutoAdjustRules } from '../english-level';
import { readStored, writeStored } from '../safe-storage';
import { ENGLISH_LEVELS } from '../types';
import type { EnglishLevel } from '../types';

/**
 * Level auto-adjust (story 011): after `window` appointments at one level, the average English score decides. Up is
 * automatic; down is only ever a suggestion the player accepts or declines. Rules in config/english-levels.json.
 */

/** English scores earned at the current level since it was last set or a decision was made. */
export interface LevelHistory {
  level: EnglishLevel;
  scores: number[];
}

export type LevelDecision = { kind: 'none' } | { kind: 'up'; to: EnglishLevel; average: number } | { kind: 'suggest-down'; to: EnglishLevel; average: number };

const STORAGE_KEY = 'salon.levelHistory.v1';

/** Read the saved history; a missing or bad save, or one for another level, starts fresh. */
export function parseStoredHistory(raw: string | null, level: EnglishLevel): LevelHistory {
  try {
    const data: unknown = raw === null ? null : JSON.parse(raw);
    if (typeof data === 'object' && data !== null) {
      const record = data as Record<string, unknown>;
      const scores = Array.isArray(record.scores) ? record.scores.filter((score): score is number => typeof score === 'number' && score >= 0 && score <= 100) : [];
      if (record.level === level) return { level, scores };
    }
  } catch {
    // Bad save: start fresh.
  }
  return { level, scores: [] };
}

export function loadHistory(level: EnglishLevel): LevelHistory {
  return parseStoredHistory(readStored(STORAGE_KEY), level);
}

export function saveHistory(history: LevelHistory): void {
  writeStored(STORAGE_KEY, JSON.stringify(history));
}

/** Add one appointment's English score (keeping only the last `window`). */
export function recordScore(history: LevelHistory, score: number, rules: AutoAdjustRules = ENGLISH_LEVELS_CONFIG.autoAdjust): LevelHistory {
  return { level: history.level, scores: [...history.scores, score].slice(-rules.window) };
}

/** Decide once the window is full. Never up from Fluent, never down from Beginner. */
export function decideLevel(history: LevelHistory, rules: AutoAdjustRules = ENGLISH_LEVELS_CONFIG.autoAdjust): LevelDecision {
  if (history.scores.length < rules.window) return { kind: 'none' };
  const recent = history.scores.slice(-rules.window);
  const average = Math.round(recent.reduce((sum, score) => sum + score, 0) / recent.length);
  const index = ENGLISH_LEVELS.indexOf(history.level);
  const up = ENGLISH_LEVELS[index + 1];
  const down = ENGLISH_LEVELS[index - 1];
  if (average >= rules.upAtAverage && up) return { kind: 'up', to: up, average };
  if (average < rules.downBelowAverage && down) return { kind: 'suggest-down', to: down, average };
  return { kind: 'none' };
}

/** A fresh history for a level: after any level change or a declined suggestion, the window starts again. */
export const freshHistory = (level: EnglishLevel): LevelHistory => ({ level, scores: [] });
