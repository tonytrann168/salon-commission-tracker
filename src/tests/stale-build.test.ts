import { describe, expect, it } from 'vitest';
import { RELOAD_FLAG, RELOAD_GUARD_MS, createStaleBuildGuard, isChunkLoadError } from '../game/stale-build';

/** A new deploy while the game is open: a lazy chunk fails → note + one reload, never a loop. */

function setup(options: { online?: boolean; storage?: 'ok' | 'none' | 'throws' } = {}) {
  const store = new Map<string, string>();
  const storage =
    options.storage === 'none' ? null
    : options.storage === 'throws' ? { getItem: () => null, setItem: () => { throw new Error('blocked'); }, removeItem: () => undefined }
    : { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
  let now = 1_000_000;
  const events: string[] = [];
  const guard = createStaleBuildGuard({ storage, reload: () => events.push('reload'), note: (kind) => events.push(`note:${kind}`), now: () => now, online: () => options.online ?? true });
  return { guard, events, store, tick: (ms: number) => { now += ms; } };
}

describe('stale build after a deploy', () => {
  it('a failed chunk import shows "New version!" and reloads once', async () => {
    const { guard, events, store } = setup();
    // The loader pattern used in main.ts: a dynamic import that rejects (the old hashed file is gone).
    const fakeImport = (): Promise<unknown> => Promise.reject(new TypeError('Failed to fetch dynamically imported module: /assets/stage-OLD.js'));
    await fakeImport().catch(() => guard.chunkFailed());
    expect(events).toEqual(['note:updating', 'reload']);
    expect(store.has(RELOAD_FLAG)).toBe(true);
  });

  it('never loops: a second failure soon after the reload only shows the note', () => {
    const { guard, events, tick } = setup();
    expect(guard.chunkFailed()).toBe(true);
    tick(5_000);
    expect(guard.chunkFailed()).toBe(false);
    expect(events).toEqual(['note:updating', 'reload', 'note:failed']);
    // Much later (another deploy), it may reload again.
    tick(RELOAD_GUARD_MS);
    expect(guard.chunkFailed()).toBe(true);
  });

  it('regression: a load that "succeeds" on the page that is reloading does not clear the flag (no loop)', () => {
    // Vite fires vite:preloadError (we cancel it and reload); the import can then still resolve on this page.
    const { guard, events, store, tick } = setup();
    expect(guard.chunkFailed()).toBe(true);
    guard.loadedOk();
    expect(store.has(RELOAD_FLAG)).toBe(true);
    // The reloaded page fails again: note only, no second reload.
    const again = createStaleBuildGuard({ storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v), removeItem: (k) => void store.delete(k) }, reload: () => events.push('reload'), note: (kind) => events.push(`note:${kind}`), now: () => 1_000_000 + 2_000, online: () => true });
    tick(2_000);
    expect(again.chunkFailed()).toBe(false);
    expect(events.filter((e) => e === 'reload')).toHaveLength(1);
  });

  it('after the new build loads fine the flag is cleared, so the next deploy can reload', () => {
    const { guard, events, store } = setup();
    guard.chunkFailed();
    // The reloaded page (a fresh guard) loads fine and clears the flag.
    const fresh = createStaleBuildGuard({ storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v), removeItem: (k) => void store.delete(k) }, reload: () => events.push('reload'), note: (kind) => events.push(`note:${kind}`), now: () => 1_000_000, online: () => true });
    fresh.loadedOk();
    expect(store.has(RELOAD_FLAG)).toBe(false);
    expect(fresh.chunkFailed()).toBe(true);
    expect(events.filter((e) => e === 'reload')).toHaveLength(2);
  });

  it('offline is not a new version, and without session storage it never reloads (no loop guard)', () => {
    const offline = setup({ online: false });
    expect(offline.guard.chunkFailed()).toBe(false);
    expect(offline.events).toEqual(['note:failed']);
    const none = setup({ storage: 'none' });
    expect(none.guard.chunkFailed()).toBe(false);
    expect(none.events).toEqual(['note:failed']);
    const blocked = setup({ storage: 'throws' });
    expect(blocked.guard.chunkFailed()).toBe(false);
    expect(blocked.events).toEqual(['note:failed']);
  });
});

describe('which errors count as a missing chunk', () => {
  it('recognises Chrome, Safari and Firefox wording, and not other errors', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/stage-OLD.js'))).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module'))).toBe(true);
    expect(isChunkLoadError(new Error('WebGL not supported'))).toBe(false);
  });
});
