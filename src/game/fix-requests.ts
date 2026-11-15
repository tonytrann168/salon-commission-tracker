import fixJson from './config/fix-requests.json';
import { NAIL_ART_CONFIG, coverage, neatness } from './nail-art/design';
import type { NailArtConfig, NailDesign } from './nail-art/design';
import type { SkillKey } from './types';

/**
 * Story 048: when the client asks for a fix during the service ("Can you fix that edge?", the colour redo). Each
 * request is tracked as open or fixed. Fixed: she thanks the player (a mood lift) and it counts as good problem
 * handling. Still open at Done: her reaction line, a mood dip, and it shows in the review and the companion's debrief.
 * Pure: the chat panel says the lines and the station runs the tools. Config: config/fix-requests.json.
 */

export type FixKind = 'edge' | 'colour';
export const FIX_KINDS: FixKind[] = ['edge', 'colour'];

export interface FixConfig {
  asks: Record<FixKind, string[]>;
  /** The same ask in her own words (AI replies during the service): case-insensitive regular expressions. */
  patterns: Record<FixKind, RegExp[]>;
  edge: { minNeatness: number };
  colour: { minCoverage: number };
  fixedMood: number;
  openMood: number;
  skills: { fixedFloor: number; openCap: number };
  lines: Record<FixKind, { thanks: string[]; open: string[] }>;
}

export function parseFixConfig(raw: unknown): FixConfig {
  const c = raw as Partial<FixConfig>;
  const fail = (what: string): never => {
    throw new Error(`fix-requests.json: ${what}`);
  };
  const texts = (list: unknown, name: string): string[] => (Array.isArray(list) && list.length > 0 && list.every((l) => typeof l === 'string' && l.trim()) ? (list as string[]) : fail(`"${name}" needs lines`));
  const share = (n: unknown, name: string): number => (typeof n === 'number' && n > 0 && n <= 1 ? n : fail(`"${name}" must be above 0 and at most 1`));
  const score = (n: unknown, name: string): number => (typeof n === 'number' && n >= 0 && n <= 100 ? n : fail(`"${name}" must be 0-100`));
  const asks = {} as Record<FixKind, string[]>;
  const patterns = {} as Record<FixKind, RegExp[]>;
  const lines = {} as Record<FixKind, { thanks: string[]; open: string[] }>;
  for (const kind of FIX_KINDS) {
    asks[kind] = texts(c.asks?.[kind], `asks.${kind}`);
    patterns[kind] = texts((c.patterns as Record<string, unknown> | undefined)?.[kind], `patterns.${kind}`).map((source) => {
      try {
        return new RegExp(source, 'i');
      } catch {
        return fail(`"patterns.${kind}" has a bad pattern: ${source}`);
      }
    });
    lines[kind] = { thanks: texts(c.lines?.[kind]?.thanks, `lines.${kind}.thanks`), open: texts(c.lines?.[kind]?.open, `lines.${kind}.open`) };
  }
  if (typeof c.fixedMood !== 'number' || c.fixedMood < 0) fail('"fixedMood" must be 0 or more');
  if (typeof c.openMood !== 'number' || c.openMood > 0) fail('"openMood" must be 0 or less');
  const fixedFloor = score(c.skills?.fixedFloor, 'skills.fixedFloor');
  const openCap = score(c.skills?.openCap, 'skills.openCap');
  if (openCap > fixedFloor) fail('"skills.openCap" must not be above skills.fixedFloor');
  return {
    asks,
    patterns,
    edge: { minNeatness: share(c.edge?.minNeatness, 'edge.minNeatness') },
    colour: { minCoverage: share(c.colour?.minCoverage, 'colour.minCoverage') },
    fixedMood: c.fixedMood as number,
    openMood: c.openMood as number,
    skills: { fixedFloor, openCap },
    lines,
  };
}

export const FIX_CONFIG: FixConfig = parseFixConfig(fixJson);

export interface FixRequest {
  kind: FixKind;
  status: 'open' | 'fixed';
  /** The polish colour when she asked (a colour fix needs a different one). */
  fromBase: string | null;
  /** The player used a fix tool (Clean up, Remover) since she asked: a fix never happens by itself. */
  acted: boolean;
}

/** The kind of fix a client line asks for (one of her set lines, or the same ask in her own words), or null. */
export function fixKindOf(line: string, config: FixConfig = FIX_CONFIG): FixKind | null {
  return FIX_KINDS.find((kind) => config.asks[kind].includes(line)) ?? FIX_KINDS.find((kind) => config.patterns[kind].some((re) => re.test(line))) ?? null;
}

export const openRequest = (kind: FixKind, design: NailDesign): FixRequest => ({ kind, status: 'open', fromBase: design.base, acted: false });

/** Does the design now answer the request? (Before the player acted, never.) */
export function meetsRequest(request: FixRequest, design: NailDesign, config: FixConfig = FIX_CONFIG, nailConfig: NailArtConfig = NAIL_ART_CONFIG): boolean {
  if (request.kind === 'colour') {
    if (design.base === null || design.base === request.fromBase) return false;
    const perNail = coverage(design, nailConfig);
    return perNail.reduce((sum, v) => sum + v, 0) / Math.max(1, perNail.length) >= config.colour.minCoverage;
  }
  if (!request.acted) return false;
  return Math.min(...neatness(design, nailConfig)) >= config.edge.minNeatness;
}

/** Requests after a design change: the open ones that are now met become fixed. Returns the list and the newly fixed. */
export function updateRequests(requests: readonly FixRequest[], design: NailDesign, acted: boolean, config: FixConfig = FIX_CONFIG, nailConfig: NailArtConfig = NAIL_ART_CONFIG): { requests: FixRequest[]; fixed: FixRequest[] } {
  const fixed: FixRequest[] = [];
  const next = requests.map((request) => {
    if (request.status !== 'open') return request;
    const updated = acted && !request.acted ? { ...request, acted: true } : request;
    if (!meetsRequest(updated, design, config, nailConfig)) return updated;
    const done = { ...updated, status: 'fixed' as const };
    fixed.push(done);
    return done;
  });
  return { requests: next, fixed };
}

const pick = (lines: string[], rand: () => number): string => lines[Math.floor(rand() * lines.length)] as string;
export const thanksLine = (kind: FixKind, rand: () => number = Math.random, config: FixConfig = FIX_CONFIG): string => pick(config.lines[kind].thanks, rand);
export const openLine = (kind: FixKind, rand: () => number = Math.random, config: FixConfig = FIX_CONFIG): string => pick(config.lines[kind].open, rand);

/** What the results need: each request's kind and whether it was fixed. */
export interface FixOutcome {
  kind: FixKind;
  fixed: boolean;
}
export const fixOutcomes = (requests: readonly FixRequest[]): FixOutcome[] => requests.map((r) => ({ kind: r.kind, fixed: r.status === 'fixed' }));

/** Problem handling after the fixes: at most openCap with one left open, at least fixedFloor when all were fixed. */
export function applyFixesToSkills<T extends Record<SkillKey, number>>(skills: T, outcomes: readonly FixOutcome[], config: FixConfig = FIX_CONFIG): T {
  if (outcomes.length === 0) return skills;
  const current = skills.problemHandling;
  const problemHandling = outcomes.some((o) => !o.fixed) ? Math.min(current, config.skills.openCap) : Math.max(current, config.skills.fixedFloor);
  return problemHandling === current ? skills : { ...skills, problemHandling };
}
