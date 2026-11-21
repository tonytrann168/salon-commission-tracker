import visitJson from './config/visit-save.json';
import type { AppointmentRestore } from './appointment';
import type { FixRequest } from './fix-requests';
import type { NailDesign } from './nail-art/design';
import type { EnglishLevel, Message, Phase } from './types';
import { ENGLISH_LEVELS, PHASES } from './types';

/**
 * Story 072 (owner: reload survival matters): the visit in progress, saved on this phone (localStorage, never the
 * cloud) on every meaningful change, so a reload or a crash can continue it exactly. Versioned: a save of another
 * version, a broken one or one older than maxAgeHours is dropped safely. Pure; config: config/visit-save.json.
 */
export interface VisitSaveConfig {
  version: number;
  maxAgeHours: number;
}

export function parseVisitSaveConfig(raw: unknown): VisitSaveConfig {
  const c = (raw ?? {}) as Record<string, unknown>;
  const fail = (what: string): never => {
    throw new Error(`visit-save.json: ${what}`);
  };
  return {
    version: typeof c.version === 'number' && Number.isInteger(c.version) && c.version >= 1 ? c.version : fail('"version" must be a whole number from 1'),
    maxAgeHours: typeof c.maxAgeHours === 'number' && c.maxAgeHours > 0 && c.maxAgeHours <= 168 ? c.maxAgeHours : fail('"maxAgeHours" must be above 0 and at most 168'),
  };
}

export const VISIT_SAVE_CONFIG: VisitSaveConfig = parseVisitSaveConfig(visitJson);

/** The station's part of a visit (from the chat panel). */
export interface ServiceState {
  /** The service has started (her service lines are planned from serviceElapsedMs). */
  started: boolean;
  serviceElapsedMs: number;
  /** The soak and scrub are over (a pedicure, or the feet of a combo). */
  prepDone: boolean;
  /** A combo's half on the station. */
  stage: 'hands' | 'feet';
  /** The hands' match, once a combo is on its feet. */
  handsScore?: number;
  /** The set on the station now. */
  design: NailDesign | null;
  fixes: FixRequest[];
  /** Her hangnail is still there (trimmed or never planned: false). */
  hangnailLeft: boolean;
}

export interface VisitSave {
  v: number;
  savedAt: number;
  clientId: string;
  scenarioId?: string;
  daily: boolean;
  pathNode?: number;
  level: EnglishLevel;
  appointment: AppointmentRestore;
  service?: ServiceState;
  /** After Done: the finished set (for the results) and its photo. */
  finished?: { description: string; match: number };
  photo?: string;
  /** A combo's hands, once done. */
  handsDone?: { description: string; score: number; photo?: string };
}

export const VISIT_SAVE_KEY = 'salon.visit';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isMessage = (m: unknown): m is Message => isRecord(m) && (m.role === 'client' || m.role === 'player') && typeof m.content === 'string';

/** Read a saved visit: null when there is none, it is broken, of another version, or older than maxAgeHours. */
export function parseVisitSave(raw: string | null, now: number, config: VisitSaveConfig = VISIT_SAVE_CONFIG): VisitSave | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data) || data.v !== config.version) return null;
  if (typeof data.savedAt !== 'number' || now - data.savedAt > config.maxAgeHours * 3_600_000 || data.savedAt > now + 60_000) return null;
  if (typeof data.clientId !== 'string' || !data.clientId || typeof data.daily !== 'boolean') return null;
  if (!(ENGLISH_LEVELS as readonly string[]).includes(data.level as string)) return null;
  const a = data.appointment;
  if (!isRecord(a) || !PHASES.includes(a.phase as Phase) || a.phase === 'done' || typeof a.mood !== 'number' || !Array.isArray(a.transcript) || !a.transcript.every(isMessage) || a.transcript.length === 0) return null;
  if (!Array.isArray(a.moodHistory) || !a.moodHistory.every((n) => typeof n === 'number')) return null;
  if (data.service !== undefined) {
    const s = data.service;
    if (!isRecord(s) || typeof s.started !== 'boolean' || typeof s.serviceElapsedMs !== 'number' || typeof s.prepDone !== 'boolean' || (s.stage !== 'hands' && s.stage !== 'feet') || !Array.isArray(s.fixes) || typeof s.hangnailLeft !== 'boolean') return null;
    if (s.design !== null && !(isRecord(s.design) && Array.isArray(s.design.painted) && Array.isArray(s.design.spill) && Array.isArray(s.design.decorations))) return null;
  }
  return data as unknown as VisitSave;
}

/** Story 072: the save for the visit as it is now. */
export function visitSaveOf(parts: Omit<VisitSave, 'v' | 'savedAt'>, now: number, config: VisitSaveConfig = VISIT_SAVE_CONFIG): VisitSave {
  return { v: config.version, savedAt: now, ...parts };
}
