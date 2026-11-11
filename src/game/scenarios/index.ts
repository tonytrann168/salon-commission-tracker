import { ROSTER } from '../clients/roster';
import { parseScenarios } from './scenarios';
import type { Scenario } from './scenarios';

/** Every scenario file in this folder (story 019), validated at load. */
export const SCENARIOS: Scenario[] = parseScenarios(import.meta.glob('./*.json', { eager: true, import: 'default' }), ROSTER.map((c) => c.id));

export const getScenario = (id: string | undefined | null): Scenario | undefined => (id ? SCENARIOS.find((s) => s.id === id) : undefined);

export * from './scenarios';

/**
 * The optional scenario fields of a client-turn or grading request: a known `scenarioId`, and for a returning client
 * the visit facts the device knows. Bad visit facts are dropped; an unknown id is an error.
 */
export function parseScenarioFields(body: Record<string, unknown>): { ok: true; value: { scenarioId?: string; visits?: { visits: number; lastStars: number; lastDay: string } } } | { ok: false; message: string } {
  if (body.scenarioId === undefined) return { ok: true, value: {} };
  if (typeof body.scenarioId !== 'string' || !getScenario(body.scenarioId)) return { ok: false, message: 'scenarioId is not a known scenario.' };
  const v = body.visits as Record<string, unknown> | undefined;
  const visits =
    v && typeof v === 'object' && Number.isInteger(v.visits) && (v.visits as number) >= 1 && (v.visits as number) <= 10_000 && Number.isInteger(v.lastStars) && (v.lastStars as number) >= 1 && (v.lastStars as number) <= 5 && typeof v.lastDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.lastDay)
      ? { visits: v.visits as number, lastStars: v.lastStars as number, lastDay: v.lastDay }
      : undefined;
  return { ok: true, value: { scenarioId: body.scenarioId, ...(visits ? { visits } : {}) } };
}
