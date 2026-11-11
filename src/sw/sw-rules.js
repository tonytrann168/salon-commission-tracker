/**
 * Story 018: which requests the service worker answers, and how. Pure, so it is unit-tested; the build inlines it into
 * sw.js. Static, built files only: never /api (AI calls, invite sign-in, feedback), never other sites, never non-GET.
 *
 * @param {string} url
 * @param {string} method
 * @param {string} origin The app's own origin.
 * @returns {'skip' | 'network-first' | 'cache-first'}
 */
export function strategyFor(url, method, origin) {
  if (method !== 'GET') return 'skip';
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return 'skip';
  }
  if (parsed.origin !== origin) return 'skip';
  const path = parsed.pathname;
  if (path === '/api' || path.startsWith('/api/')) return 'skip';
  if (path === '/sw.js') return 'skip';
  // The page: fresh when online (new builds), the cached copy when offline.
  if (path === '/' || path.endsWith('.html')) return 'network-first';
  // Hashed build files, icons, the manifest: from the cache, filled on install.
  return 'cache-first';
}
