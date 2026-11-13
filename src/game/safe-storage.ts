/**
 * localStorage that never throws. Reads and writes are wrapped in try/catch (private windows can throw), and every
 * write is also kept in memory so the app still works for the session when storage is unavailable. Story: story-010.
 */

const memory = new Map<string, string>();

/** Read a saved string, or `null` when nothing is saved. */
export function readStored(key: string): string | null {
  try {
    const saved = localStorage.getItem(key);
    if (saved !== null) return saved;
  } catch {
    // Storage unavailable: use the in-memory copy.
  }
  return memory.get(key) ?? null;
}

/** Save a string on this device (and in memory). */
export function writeStored(key: string, value: string): void {
  memory.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable or full: the in-memory copy still serves this session.
  }
  for (const listener of writeListeners) listener(key);
}

const writeListeners = new Set<(key: string) => void>();

/** Story 025: hear about each saved change (the account uploads the progress after a quiet moment). */
export function onStoredWrite(listener: (key: string) => void): () => void {
  writeListeners.add(listener);
  return () => writeListeners.delete(listener);
}
