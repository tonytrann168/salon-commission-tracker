import { readStored, writeStored } from './safe-storage';

/**
 * Story 033: canned lines without repeats. A pick (1..n) never repeats any of the last `within` picks (capped at n - 1
 * so there is always a choice). The recent picks are kept on the device per kind, so a new visit doesn't repeat either.
 */
export function pickFresh(n: number, recent: readonly number[], within: number, roll: number): number {
  if (n <= 1) return 1;
  const avoid = new Set(recent.slice(-Math.min(within, n - 1)));
  const choices = Array.from({ length: n }, (_, i) => i + 1).filter((k) => !avoid.has(k));
  return choices[Math.min(choices.length - 1, Math.floor(Math.max(0, roll) * choices.length))] ?? 1;
}

export const remember = (recent: readonly number[], pick: number, keep: number): number[] => [...recent, pick].slice(-Math.max(1, keep));

const KEY = 'salon.lines.v1';

export function loadRecent(kind: string): number[] {
  try {
    const all = JSON.parse(readStored(KEY) ?? '{}') as Record<string, unknown>;
    const list = all[kind];
    return Array.isArray(list) ? list.filter((n): n is number => Number.isInteger(n) && n >= 1).slice(-20) : [];
  } catch {
    return [];
  }
}

export function saveRecent(kind: string, recent: readonly number[]): void {
  let all: Record<string, unknown> = {};
  try {
    all = JSON.parse(readStored(KEY) ?? '{}') as Record<string, unknown>;
  } catch {
    all = {};
  }
  writeStored(KEY, JSON.stringify({ ...all, [kind]: recent }));
}

/** Pick, remember and save in one go (1-based). */
export function nextFresh(kind: string, n: number, within: number, roll: number = Math.random()): number {
  const recent = loadRecent(kind);
  const pick = pickFresh(n, recent, within, roll);
  saveRecent(kind, remember(recent, pick, within));
  return pick;
}
