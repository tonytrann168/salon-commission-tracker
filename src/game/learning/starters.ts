import startersJson from '../config/phrase-starters.json';
import { TOPICS } from './corrections';
import type { Topic } from './corrections';

/** Story 033: ready-made salon phrases per phrasebook topic (10 each, with Vietnamese), apart from the player's own. */
export interface StarterPhrase {
  en: string;
  vi: string;
}

export function parseStarters(raw: unknown): Record<Topic, StarterPhrase[]> {
  const topics = (raw as { topics?: Record<string, unknown> })?.topics;
  if (!topics || typeof topics !== 'object') throw new Error('phrase-starters.json: "topics" must be an object');
  const out = {} as Record<Topic, StarterPhrase[]>;
  for (const topic of TOPICS) {
    const list = topics[topic];
    if (!Array.isArray(list) || list.length === 0) throw new Error(`phrase-starters.json: "${topic}" needs phrases`);
    out[topic] = list.map((p, i) => {
      if (typeof p?.en !== 'string' || typeof p?.vi !== 'string' || !p.en.trim() || !p.vi.trim()) throw new Error(`phrase-starters.json: ${topic}[${i}] needs en and vi`);
      return { en: p.en, vi: p.vi };
    });
  }
  return out;
}

export const STARTERS = parseStarters(startersJson);
