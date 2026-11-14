import whatsNewJson from './config/whats-new.json';
import { readStored, writeStored } from './safe-storage';

/** Story 034: "What's new" notes per version, shown once on the title after an update (and any time in Settings). */
export interface ReleaseNotes {
  version: string;
  items: { en: string; vi: string }[];
}

export function parseWhatsNew(raw: unknown): ReleaseNotes[] {
  const list = (raw as { releases?: unknown })?.releases;
  if (!Array.isArray(list)) throw new Error('whats-new.json: "releases" must be a list');
  return list.map((r: Partial<ReleaseNotes>, i) => {
    if (typeof r.version !== 'string' || !r.version) throw new Error(`whats-new.json: releases[${i}] needs a version`);
    if (!Array.isArray(r.items) || r.items.length === 0 || !r.items.every((it) => typeof it?.en === 'string' && it.en.trim() && typeof it?.vi === 'string' && it.vi.trim())) throw new Error(`whats-new.json: releases[${i}] needs en/vi items`);
    return { version: r.version, items: r.items };
  });
}

export const WHATS_NEW = parseWhatsNew(whatsNewJson);
export const WHATS_NEW_KEY = 'salon.whatsNewSeen';

export const notesFor = (version: string, releases: readonly ReleaseNotes[] = WHATS_NEW): ReleaseNotes | null => releases.find((r) => r.version === version) ?? null;

/** Show on the title? Only for a version with notes, only once, and never on a first run (nothing is "new" yet). */
export function shouldShowWhatsNew(version: string, seen: string | null, firstRun: boolean, releases: readonly ReleaseNotes[] = WHATS_NEW): boolean {
  return !firstRun && seen !== version && notesFor(version, releases) !== null;
}

export const markWhatsNewSeen = (version: string): void => writeStored(WHATS_NEW_KEY, version);
export const whatsNewSeen = (): string | null => readStored(WHATS_NEW_KEY);
