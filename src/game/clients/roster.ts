import { NAIL_ART_CONFIG } from '../nail-art/design';
import type { NailRequest } from '../nail-art/design';
import { CLIENT_PRONOUNS, CLIENT_TYPES, DIFFICULTIES } from '../types';
import type { ClientPersona, ClientType, Difficulty } from '../types';

/**
 * The client roster (story 006, design/game-brief.md MVP feature 7): every `*.json` file in this folder is a client.
 * Adding a client is adding a file: no code change. Each file is validated at load, so a bad one fails clearly.
 */

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Validate one client file. Throws a clear `clients/<file>: ...` error. */
export function parseClient(raw: unknown, file: string): ClientPersona {
  const fail = (problem: string): never => {
    throw new Error(`clients/${file}: ${problem}`);
  };
  if (!isRecord(raw)) return fail('must be an object');
  const text = (key: string, max = 600): string => {
    const value = raw[key];
    return typeof value === 'string' && value.trim() !== '' && value.length <= max ? value : fail(`"${key}" must be text (1-${max} characters)`);
  };
  const id = text('id', 30);
  if (!/^[a-z][a-z0-9-]*$/.test(id)) fail('"id" must be lowercase letters, digits and dashes');
  const difficulty = DIFFICULTIES.find((d) => d === raw.difficulty) ?? fail(`"difficulty" must be ${DIFFICULTIES.join(', ')}`);
  const types = (Array.isArray(raw.types) ? raw.types : fail('"types" must be a list')).map((type, i) => CLIENT_TYPES.find((t) => t === type) ?? fail(`"types[${i}]" must be one of ${CLIENT_TYPES.join(', ')}`)) as ClientType[];
  const description = isRecord(raw.description) && typeof raw.description.en === 'string' && typeof raw.description.vi === 'string' ? { en: raw.description.en, vi: raw.description.vi } : fail('"description" needs en and vi');
  const colour = (value: unknown, key: string): string => (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fail(`"look.${key}" must be #rrggbb`));
  const look = isRecord(raw.look) ? { skin: colour(raw.look.skin, 'skin'), hair: colour(raw.look.hair, 'hair'), accent: colour(raw.look.accent, 'accent') } : fail('"look" must be an object');
  if (isRecord(raw.look) && raw.look.hairStyle !== undefined) {
    const style = raw.look.hairStyle === 'long' || raw.look.hairStyle === 'short' ? raw.look.hairStyle : fail('"look.hairStyle" must be long or short');
    (look as { hairStyle?: 'long' | 'short' }).hairStyle = style;
  }
  const mood = raw.startingMood;
  if (typeof mood !== 'number' || mood < 10 || mood > 90) fail('"startingMood" must be 10-90');
  const sensitivity = isRecord(raw.moodSensitivity) ? raw.moodSensitivity : fail('"moodSensitivity" must be { up, down }');
  const factor = (value: unknown, key: string): number => (typeof value === 'number' && value >= 0.3 && value <= 2 ? value : fail(`"moodSensitivity.${key}" must be 0.3-2`));
  let nailRequest: NailRequest | undefined;
  if (raw.nailRequest !== undefined) {
    const n = isRecord(raw.nailRequest) ? raw.nailRequest : fail('"nailRequest" must be an object');
    const shapes = (Array.isArray(n.shapes) && n.shapes.length > 0 ? n.shapes : fail('"nailRequest.shapes" must be a non-empty list')).map((shape) => (NAIL_ART_CONFIG.shapes.includes(shape) ? shape : fail(`"nailRequest.shapes" has an unknown shape "${String(shape)}"`)));
    const colors = (Array.isArray(n.colors) && n.colors.length > 0 ? n.colors : fail('"nailRequest.colors" must be a non-empty list')).map((color) => (NAIL_ART_CONFIG.palette.some((p) => p.id === color) ? color : fail(`"nailRequest.colors" has an unknown colour "${String(color)}"`)));
    const level = (value: unknown, key: string) => (['none', 'few', 'lots'].includes(value as string) ? (value as 'none' | 'few' | 'lots') : fail(`"nailRequest.${key}" must be none, few or lots`));
    const gradient = ['no', 'ok', 'yes'].includes(n.gradient as string) ? (n.gradient as 'no' | 'ok' | 'yes') : fail('"nailRequest.gradient" must be no, ok or yes');
    const hands = n.hands === undefined || n.hands === 1 ? 1 : n.hands === 2 ? 2 : fail('"nailRequest.hands" must be 1 or 2');
    const service = n.service === undefined || n.service === 'manicure' ? undefined : n.service === 'pedicure' ? ('pedicure' as const) : fail('"nailRequest.service" must be manicure or pedicure');
    nailRequest = { shapes, colors, gradient, gems: level(n.gems, 'gems'), stickers: level(n.stickers, 'stickers'), ...(hands === 2 ? { hands: 2 as const } : {}), ...(service ? { service } : {}) };
  }
  const pronoun = CLIENT_PRONOUNS.find((p) => p === raw.pronoun) ?? fail('"pronoun" must be she, he or they');
  return {
    id,
    pronoun,
    name: text('name', 30),
    portraitId: text('portraitId', 30),
    difficulty,
    types,
    description,
    look,
    wants: text('wants'),
    personality: text('personality', 900),
    startingMood: mood as number,
    moodSensitivity: { up: factor(sensitivity.up, 'up'), down: factor(sensitivity.down, 'down') },
    openingLine: text('openingLine', 300),
    ...(nailRequest ? { nailRequest } : {}),
  };
}

/** Validate the whole roster: unique ids. */
export function parseRoster(files: Record<string, unknown>): ClientPersona[] {
  const clients = Object.entries(files)
    .map(([path, raw]) => parseClient(raw, path.split('/').pop() ?? path))
    .sort((a, b) => a.name.localeCompare(b.name));
  const ids = new Set<string>();
  for (const client of clients) {
    if (ids.has(client.id)) throw new Error(`clients: duplicate id "${client.id}"`);
    ids.add(client.id);
  }
  if (clients.length === 0) throw new Error('clients: no client files');
  return clients;
}

const files = import.meta.glob('./*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
export const ROSTER: readonly ClientPersona[] = parseRoster(files);

export function getClient(id: string): ClientPersona | undefined {
  return ROSTER.find((client) => client.id === id);
}

export const clientsByDifficulty = (difficulty: Difficulty): ClientPersona[] => ROSTER.filter((client) => client.difficulty === difficulty);

/**
 * A shift: `count` clients back to back, drawn without repeats from `pool` (shuffled with `random`, passed in so it is
 * testable). Fewer clients in the pool than `count` gives the whole pool.
 */
export function pickShift(pool: readonly ClientPersona[], count: number, random: () => number = Math.random): ClientPersona[] {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j] as ClientPersona, shuffled[i] as ClientPersona];
  }
  return shuffled.slice(0, count);
}
