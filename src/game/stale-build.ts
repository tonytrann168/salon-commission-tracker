/**
 * A new deploy while the game is open (overseer, 2026-11-10): the open page asks for a lazy chunk from the old build
 * (e.g. stage-<oldhash>.js), which the new deployment no longer serves. Instead of breaking mid-tap, say "New version!",
 * and reload once. Saves are already written to the device on every change (localStorage), so nothing is lost.
 * A session flag stops reload loops: a second failure soon after a reload shows the note and does not reload again.
 */

export const RELOAD_FLAG = 'salon.reloadedForUpdate';
/** A failure within this long of our own reload is not a stale build; don't reload again. */
export const RELOAD_GUARD_MS = 60_000;

/** Is this error a failed script/module download (Chrome, Safari and Firefox word it differently)? */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload|Failed to fetch/i.test(message);
}

export interface StaleBuildDeps {
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  reload: () => void;
  /** Show a short message ("New version! Reloading…", or the connection message when offline / looping). */
  note: (kind: 'updating' | 'failed') => void;
  now: () => number;
  online: () => boolean;
}

export interface StaleBuildGuard {
  /** A lazy chunk failed to load. Returns true when it reloads the page. */
  chunkFailed(): boolean;
  /** The new build loaded its chunks fine: allow a future reload. */
  loadedOk(): void;
}

export function createStaleBuildGuard(deps: StaleBuildDeps): StaleBuildGuard {
  /** This page has already started a reload: nothing may clear the flag before it happens. */
  let reloading = false;
  const read = (): number | null => {
    try {
      const raw = deps.storage?.getItem(RELOAD_FLAG);
      return raw ? Number(raw) : null;
    } catch {
      return null;
    }
  };
  return {
    chunkFailed() {
      // Offline is not a new version: say a connection is needed.
      if (!deps.online()) {
        deps.note('failed');
        return false;
      }
      // No session storage (private mode): without the flag a loop can't be prevented, so don't reload.
      if (!deps.storage) {
        deps.note('failed');
        return false;
      }
      const last = read();
      if (last !== null && Number.isFinite(last) && deps.now() - last < RELOAD_GUARD_MS) {
        deps.note('failed');
        return false;
      }
      try {
        deps.storage?.setItem(RELOAD_FLAG, String(deps.now()));
      } catch {
        // No session storage (private mode): without the flag we can't guard a loop, so don't reload.
        deps.note('failed');
        return false;
      }
      reloading = true;
      deps.note('updating');
      deps.reload();
      return true;
    },
    loadedOk() {
      // A cancelled preload error can still let the import resolve on the page that is about to reload.
      if (reloading) return;
      try {
        deps.storage?.removeItem(RELOAD_FLAG);
      } catch {
        // Nothing to clear.
      }
    },
  };
}
