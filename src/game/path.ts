import pathJson from './config/path.json';
import { TOPICS } from './learning/corrections';
import { STARTERS } from './learning/starters';
import type { StarterPhrase } from './learning/starters';
import type { ClientPersona, Difficulty } from './types';

/**
 * Story 057a: home is a path of salon days. Nodes in a fixed pattern per day: an appointment (a set client, harder day
 * by day within what the rank has opened) or a short lesson (a few starter phrases of one topic). The save keeps how
 * many nodes are done; the next one is the current node. Pure. Config: config/path.json.
 */

export type NodeKind = 'appointment' | 'lesson';

export interface PathConfig {
  pattern: NodeKind[];
  lessonPhrases: number;
  lessonXp: number;
  goal: number;
  showDays: number;
  /** Story 062: booked guests (the day's appointment stops). */
  booked: { xp: number; openHour: number; slotMinutes: number };
  /** Story 071: pedicure and combo bookings, mixed in at random (owner 11-26: no fixed rate). */
  feet: { afterVisits: number; mix: Record<BookedService, number> };
}

/** Story 071: what a booked guest comes in for. */
export type BookedService = 'manicure' | 'pedicure' | 'combo';

export function parsePathConfig(raw: unknown): PathConfig {
  const c = raw as Partial<PathConfig>;
  const fail = (what: string): never => {
    throw new Error(`path.json: ${what}`);
  };
  const pattern = Array.isArray(c.pattern) && c.pattern.length >= 2 && c.pattern.length <= 10 && c.pattern.every((k) => k === 'appointment' || k === 'lesson') && c.pattern.includes('appointment') ? (c.pattern as NodeKind[]) : fail('"pattern" needs 2-10 nodes (appointment or lesson), at least one appointment');
  const whole = (n: unknown, name: string, min: number, max: number): number => (typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max ? n : fail(`"${name}" must be ${min}-${max}`));
  const b = (c.booked ?? {}) as Partial<PathConfig['booked']>;
  const booked = { xp: whole(b.xp, 'booked.xp', 0, 100), openHour: whole(b.openHour, 'booked.openHour', 5, 14), slotMinutes: whole(b.slotMinutes, 'booked.slotMinutes', 15, 240) };
  const f = (c.feet ?? {}) as Partial<PathConfig['feet']>;
  const m = (f.mix ?? {}) as Partial<Record<BookedService, unknown>>;
  const weight = (n: unknown, name: string): number => (typeof n === 'number' && n >= 0 && n <= 100 ? n : fail(`"feet.mix.${name}" must be 0-100`));
  const mix = { manicure: weight(m.manicure, 'manicure'), pedicure: weight(m.pedicure, 'pedicure'), combo: weight(m.combo, 'combo') };
  if (mix.manicure + mix.pedicure + mix.combo <= 0) fail('"feet.mix" needs a weight above 0');
  const feet = { afterVisits: whole(f.afterVisits, 'feet.afterVisits', 0, 50), mix };
  return { pattern, lessonPhrases: whole(c.lessonPhrases, 'lessonPhrases', 1, 6), lessonXp: whole(c.lessonXp, 'lessonXp', 0, 100), goal: whole(c.goal, 'goal', 1, 10), showDays: whole(c.showDays, 'showDays', 0, 3), booked, feet };
}

export const PATH_CONFIG: PathConfig = parsePathConfig(pathJson);

export interface PathNode {
  index: number;
  /** 1-based salon day. */
  day: number;
  kind: NodeKind;
  /** An appointment's client. */
  client?: ClientPersona;
  /** Story 071: an appointment's booked service (pedicure and combo bookings come every day). */
  service?: BookedService;
  /** A lesson's topic and phrases. */
  lesson?: { topic: (typeof TOPICS)[number]; phrases: StarterPhrase[] };
}

const hash = (text: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h;
};

/** Node `index` of the path, for a roster and the difficulties open now. */
export function pathNode(index: number, roster: readonly ClientPersona[], unlocked: readonly Difficulty[], config: PathConfig = PATH_CONFIG): PathNode {
  const per = config.pattern.length;
  const day = Math.floor(index / per) + 1;
  const kind = config.pattern[index % per] as NodeKind;
  if (kind === 'lesson') {
    const lessonNo = Math.floor(index / per) * config.pattern.filter((k) => k === 'lesson').length + config.pattern.slice(0, index % per).filter((k) => k === 'lesson').length;
    const topic = TOPICS[lessonNo % TOPICS.length] as (typeof TOPICS)[number];
    const all = STARTERS[topic];
    const start = (Math.floor(lessonNo / TOPICS.length) * config.lessonPhrases) % Math.max(1, all.length);
    const phrases = Array.from({ length: Math.min(config.lessonPhrases, all.length) }, (_, i) => all[(start + i) % all.length] as StarterPhrase);
    return { index, day, kind, lesson: { topic, phrases } };
  }
  // Day 1 easy, then a step up every day, within what the rank has opened.
  const open = unlocked.length > 0 ? unlocked : (['easy'] as Difficulty[]);
  const difficulty = open[Math.min(day - 1, open.length - 1)] as Difficulty;
  const pool = roster.filter((c) => c.difficulty === difficulty);
  const list = pool.length > 0 ? pool : [...roster];
  // Story 062: a different guest for each appointment of the day (while the pool has enough).
  const first = (day - 1) * per;
  const taken = new Set<string>();
  for (let i = first; i < index; i++) if (config.pattern[i - first] === 'appointment') taken.add(pathNode(i, roster, unlocked, config).client?.id ?? '');
  const start = hash(`path-${index}`) % list.length;
  const client = (Array.from({ length: list.length }, (_, k) => list[(start + k) % list.length] as ClientPersona).find((c) => !taken.has(c.id)) ?? list[start]) as ClientPersona;
  return { index, day, kind, client, service: bookedService(index, config) };
}

/**
 * Story 071 (owner 11-26: "just mix them up, no fixed rate"): the service booked at path node `index`. The first
 * `feet.afterVisits` appointment stops are manicures; after that each booking is a random pick by the `feet.mix`
 * weights, stable for that stop (so the day's list never changes). No daily quota: some days have several pedicures
 * or combos, some none.
 */
export function bookedService(index: number, config: PathConfig = PATH_CONFIG): BookedService {
  const per = config.pattern.length;
  if (config.pattern[index % per] !== 'appointment') return 'manicure';
  const perDay = config.pattern.filter((k) => k === 'appointment').length;
  const ordinal = Math.floor(index / per) * perDay + config.pattern.slice(0, index % per).filter((k) => k === 'appointment').length;
  if (ordinal < config.feet.afterVisits) return 'manicure';
  const { manicure, pedicure, combo } = config.feet.mix;
  const roll = ((hash(`service-${index}`) % 10_000) / 10_000) * (manicure + pedicure + combo);
  return roll < manicure ? 'manicure' : roll < manicure + pedicure ? 'pedicure' : 'combo';
}

/** The nodes to draw: the current day (and `showDays` ahead), with each node's state. */
export function pathView(done: number, roster: readonly ClientPersona[], unlocked: readonly Difficulty[], config: PathConfig = PATH_CONFIG): { node: PathNode; state: 'done' | 'current' | 'locked' }[] {
  const per = config.pattern.length;
  const firstDay = Math.floor(done / per);
  const nodes: { node: PathNode; state: 'done' | 'current' | 'locked' }[] = [];
  for (let i = firstDay * per; i < (firstDay + 1 + config.showDays) * per; i++) nodes.push({ node: pathNode(i, roster, unlocked, config), state: i < done ? 'done' : i === done ? 'current' : 'locked' });
  return nodes;
}

/** The node is finished: the path moves on (never backwards). */
export const finishNode = (done: number, index: number): number => (index === done ? done + 1 : done);

/** Story 062: where the player is in the current salon day. */
export interface DayProgress {
  /** 1-based salon day. */
  day: number;
  /** Stops finished in this day, and how many the day has. */
  doneInDay: number;
  perDay: number;
  /** Clients (appointment stops) served in this day. */
  clientsDone: number;
}

export function dayProgress(done: number, config: PathConfig = PATH_CONFIG): DayProgress {
  const per = config.pattern.length;
  const doneInDay = done % per;
  return { day: Math.floor(done / per) + 1, doneInDay, perDay: per, clientsDone: config.pattern.slice(0, doneInDay).filter((k) => k === 'appointment').length };
}

/**
 * Story 062: coming back on a later calendar day to a salon day that was started but not finished: ask whether to
 * continue it or start the next one. `dayOn` is the calendar day the path was last played ('' = never).
 */
export function askDayChoice(done: number, dayOn: string, today: string, config: PathConfig = PATH_CONFIG): boolean {
  return dayProgress(done, config).doneInDay > 0 && dayOn !== '' && dayOn !== today;
}

/** Story 062: close the current day with however many clients were served (no penalty) and start the next one. */
export function startNextDay(done: number, config: PathConfig = PATH_CONFIG): { done: number; log: { day: number; clients: number } } {
  const now = dayProgress(done, config);
  return { done: now.day * now.perDay, log: { day: now.day, clients: now.clientsDone } };
}

/** Story 062: a booked guest's time: the day's appointment stops are spread from the opening hour, one slot apart. */
export function bookedTime(slot: number, config: PathConfig = PATH_CONFIG): string {
  const minutes = config.booked.openHour * 60 + slot * config.booked.slotMinutes;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Story 062: today's booked guests: the current day's appointment stops not served yet, each with a time. */
export function todaysAppointments(done: number, roster: readonly ClientPersona[], unlocked: readonly Difficulty[], config: PathConfig = PATH_CONFIG): { node: PathNode; time: string }[] {
  const per = config.pattern.length;
  const first = Math.floor(done / per) * per;
  const out: { node: PathNode; time: string }[] = [];
  let slot = 0;
  for (let i = first; i < first + per; i++) {
    if (config.pattern[i - first] !== 'appointment') continue;
    if (i >= done) out.push({ node: pathNode(i, roster, unlocked, config), time: bookedTime(slot, config) });
    slot++;
  }
  return out;
}
