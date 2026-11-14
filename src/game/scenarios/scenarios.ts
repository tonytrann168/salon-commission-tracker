import oddsJson from '../config/scenario-odds.json';
import { NAIL_ART_CONFIG } from '../nail-art/design';
import type { NailRequest } from '../nail-art/design';
import { DIFFICULTIES } from '../types';
import type { ClientPersona, Difficulty } from '../types';

/**
 * Scenarios (story 019): the same clients in new situations. Each JSON file here layers an occasion, constraints, an
 * opening line and (optionally) a different nail request over a client. A new scenario is just a new file. Shared by
 * the game and the server (the prompts read the same files).
 */

export interface Scenario {
  id: string;
  name: { en: string; vi: string };
  tag: { en: string; vi: string };
  difficulty: Difficulty;
  eligible: { difficulties?: Difficulty[]; clients?: string[]; excludeClients?: string[]; returning?: boolean };
  occasion: string;
  constraints: string;
  openingLine: string;
  nailRequest?: Partial<NailRequest>;
  /** Story 033: after Done, the client asks for one redo (the station allows one more Done). */
  redo?: boolean;
}

/** What the save knows about past visits of one client (for "returning"). */
export interface ClientVisits {
  visits: number;
  lastStars: number;
  lastDay: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export function parseScenario(raw: unknown, file: string, clientIds: readonly string[]): Scenario {
  const fail = (problem: string): never => {
    throw new Error(`scenarios/${file}: ${problem}`);
  };
  if (!isRecord(raw)) return fail('must be an object');
  const text = (key: string, max: number): string => (typeof raw[key] === 'string' && (raw[key] as string).trim() !== '' && (raw[key] as string).length <= max ? (raw[key] as string) : fail(`"${key}" must be text up to ${max} characters`));
  const both = (key: string): { en: string; vi: string } => {
    const v = raw[key];
    return isRecord(v) && typeof v.en === 'string' && typeof v.vi === 'string' && v.en.trim() !== '' && v.vi.trim() !== '' ? { en: v.en, vi: v.vi } : fail(`"${key}" needs en and vi`);
  };
  const id = text('id', 40);
  if (`${id}.json` !== file) fail(`"id" must match the file name (${file})`);
  const difficulty = DIFFICULTIES.find((d) => d === raw.difficulty) ?? fail('"difficulty" must be easy, medium or hard');
  const e = isRecord(raw.eligible) ? raw.eligible : fail('"eligible" must be an object');
  const ids = (value: unknown, key: string): string[] | undefined => {
    if (value === undefined) return undefined;
    return Array.isArray(value) && value.every((v) => typeof v === 'string' && clientIds.includes(v)) ? (value as string[]) : fail(`"eligible.${key}" must list known client ids`);
  };
  const difficulties = e.difficulties === undefined ? undefined : Array.isArray(e.difficulties) ? e.difficulties.map((d) => DIFFICULTIES.find((x) => x === d) ?? fail('"eligible.difficulties" has an unknown difficulty')) : fail('"eligible.difficulties" must be a list');
  const clients = ids(e.clients, 'clients');
  const excludeClients = ids(e.excludeClients, 'excludeClients');
  if (!difficulties && !clients) fail('"eligible" needs difficulties or clients');
  let nailRequest: Partial<NailRequest> | undefined;
  if (raw.nailRequest !== undefined) {
    const n = isRecord(raw.nailRequest) ? raw.nailRequest : fail('"nailRequest" must be an object');
    const level = (v: unknown, key: string) => (v === undefined ? undefined : ['none', 'few', 'lots'].includes(v as string) ? (v as 'none' | 'few' | 'lots') : fail(`"nailRequest.${key}" must be none, few or lots`));
    nailRequest = {
      ...(n.shapes !== undefined ? { shapes: (Array.isArray(n.shapes) && n.shapes.length > 0 ? n.shapes : fail('"nailRequest.shapes" must be a list')).map((s) => (NAIL_ART_CONFIG.shapes.includes(s) ? s : fail(`unknown shape "${String(s)}"`))) } : {}),
      ...(n.colors !== undefined ? { colors: (Array.isArray(n.colors) && n.colors.length > 0 ? n.colors : fail('"nailRequest.colors" must be a list')).map((c) => (NAIL_ART_CONFIG.palette.some((p) => p.id === c && !p.shop) ? (c as string) : fail(`"nailRequest.colors": "${String(c)}" is not a free palette colour`))) } : {}),
      ...(n.gradient !== undefined ? { gradient: ['no', 'ok', 'yes'].includes(n.gradient as string) ? (n.gradient as 'no' | 'ok' | 'yes') : fail('"nailRequest.gradient" must be no, ok or yes') } : {}),
      ...(level(n.gems, 'gems') ? { gems: level(n.gems, 'gems') as 'none' | 'few' | 'lots' } : {}),
      ...(level(n.stickers, 'stickers') ? { stickers: level(n.stickers, 'stickers') as 'none' | 'few' | 'lots' } : {}),
      ...(n.hands !== undefined ? { hands: n.hands === 1 || n.hands === 2 ? n.hands : fail('"nailRequest.hands" must be 1 or 2') } : {}),
      ...(n.service !== undefined ? { service: n.service === 'manicure' || n.service === 'pedicure' ? n.service : fail('"nailRequest.service" must be manicure or pedicure') } : {}),
    };
  }
  return {
    id,
    name: both('name'),
    tag: both('tag'),
    difficulty,
    eligible: { ...(difficulties ? { difficulties } : {}), ...(clients ? { clients } : {}), ...(excludeClients ? { excludeClients } : {}), ...(e.returning === true ? { returning: true } : {}) },
    occasion: text('occasion', 300),
    constraints: text('constraints', 600),
    openingLine: text('openingLine', 300),
    ...(nailRequest ? { nailRequest } : {}),
    ...(raw.redo === undefined ? {} : raw.redo === true ? { redo: true } : fail('"redo" must be true when set')),
  };
}

export function parseScenarios(files: Record<string, unknown>, clientIds: readonly string[]): Scenario[] {
  const list = Object.entries(files).map(([path, raw]) => parseScenario(raw, path.split('/').pop() ?? path, clientIds));
  return list.sort((a, b) => a.id.localeCompare(b.id));
}

export const SCENARIO_ODDS: { dailyChance: number; randomChance: number } = (() => {
  const o = oddsJson as Record<string, unknown>;
  const chance = (v: unknown, key: string): number => (typeof v === 'number' && v >= 0 && v <= 1 ? v : (() => { throw new Error(`scenario-odds.json: "${key}" must be 0-1`); })());
  return { dailyChance: chance(o.dailyChance, 'dailyChance'), randomChance: chance(o.randomChance, 'randomChance') };
})();

/** Scenarios this client can have now: client fits, the player has unlocked the scenario's difficulty, and "returning" needs a past visit. */
export function eligibleScenarios(client: ClientPersona, scenarios: readonly Scenario[], context: { unlocked: readonly Difficulty[]; visits?: ClientVisits | null }): Scenario[] {
  return scenarios.filter((s) => {
    if (!context.unlocked.includes(s.difficulty)) return false;
    if (s.eligible.excludeClients?.includes(client.id)) return false;
    const fits = (s.eligible.clients?.includes(client.id) ?? false) || (s.eligible.difficulties?.includes(client.difficulty) ?? false);
    if (!fits) return false;
    return !s.eligible.returning || (context.visits?.visits ?? 0) > 0;
  });
}

/** The client as they come in for this scenario: its opening line and nail request (merged over theirs). */
export function applyScenario(client: ClientPersona, scenario: Scenario | null | undefined): ClientPersona {
  if (!scenario) return client;
  const base = client.nailRequest;
  return {
    ...client,
    openingLine: scenario.openingLine,
    ...(base || scenario.nailRequest ? { nailRequest: { ...(base ?? { shapes: ['round'], colors: ['nude'], gradient: 'ok', gems: 'none', stickers: 'none' }), ...(scenario.nailRequest ?? {}) } as NailRequest } : {}),
  };
}

/** The scenario's lines for the AI prompts (client turn and grading). */
export function scenarioPrompt(scenario: Scenario, visits?: ClientVisits | null): string {
  const history = scenario.eligible.returning && visits ? ` You have visited ${visits.visits} time${visits.visits === 1 ? '' : 's'} before; last time (${visits.lastDay}) the visit earned ${visits.lastStars} of 5 stars.` : '';
  return `${scenario.occasion}${history} ${scenario.constraints}`;
}

/** A stable pick from a seed (the date, or a random number): a scenario with probability `chance`, else none. */
export function pickScenario(seed: number, candidates: readonly Scenario[], chance: number): Scenario | null {
  if (candidates.length === 0) return null;
  const roll = (seed % 1000) / 1000;
  if (roll >= chance) return null;
  return candidates[Math.floor(seed / 1000) % candidates.length] ?? null;
}
