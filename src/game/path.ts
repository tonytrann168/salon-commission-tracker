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
}

export function parsePathConfig(raw: unknown): PathConfig {
  const c = raw as Partial<PathConfig>;
  const fail = (what: string): never => {
    throw new Error(`path.json: ${what}`);
  };
  const pattern = Array.isArray(c.pattern) && c.pattern.length >= 2 && c.pattern.length <= 10 && c.pattern.every((k) => k === 'appointment' || k === 'lesson') && c.pattern.includes('appointment') ? (c.pattern as NodeKind[]) : fail('"pattern" needs 2-10 nodes (appointment or lesson), at least one appointment');
  const whole = (n: unknown, name: string, min: number, max: number): number => (typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max ? n : fail(`"${name}" must be ${min}-${max}`));
  return { pattern, lessonPhrases: whole(c.lessonPhrases, 'lessonPhrases', 1, 6), lessonXp: whole(c.lessonXp, 'lessonXp', 0, 100), goal: whole(c.goal, 'goal', 1, 10), showDays: whole(c.showDays, 'showDays', 0, 3) };
}

export const PATH_CONFIG: PathConfig = parsePathConfig(pathJson);

export interface PathNode {
  index: number;
  /** 1-based salon day. */
  day: number;
  kind: NodeKind;
  /** An appointment's client. */
  client?: ClientPersona;
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
  const client = list[hash(`path-${index}`) % list.length] as ClientPersona;
  return { index, day, kind, client };
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
