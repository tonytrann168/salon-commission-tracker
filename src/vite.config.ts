/// <reference types="vitest/config" />
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { configDefaults } from 'vitest/config';
import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';

type ApiHandler = (body: unknown, env: Record<string, string | undefined>, fetchImpl: typeof fetch) => Promise<{ status: number; body: unknown }>;

/**
 * Dev-only: serve POST /api/<route> with the same handlers the hosted preview runs (server/routes.ts), loaded through
 * Vite on each request so they can use Vite features (the client roster is a folder of JSON files, story 006) and pick
 * up edits without a restart. No invite code in dev (the preview adds that, see server/preview-function.ts).
 */
/**
 * Story 018: write sw.js at build time from sw/sw-template.js, with the pure rules (sw/sw-rules.js) inlined, every
 * built file and public file to precache, and a cache name versioned by the build's file names (they carry content
 * hashes), so a new build replaces the old cache.
 */
function serviceWorker(): Plugin {
  const publicFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? publicFiles(full) : [`/${relative('public', full).split('\\').join('/')}`];
    });
  return {
    name: 'salon-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      // The page itself ('/') is always precached: Vite adds index.html to the bundle after this plugin runs.
      const built = ['/', ...Object.keys(bundle).filter((file) => file !== 'index.html').map((file) => `/${file}`)];
      const files = [...new Set([...built, ...publicFiles('public').filter((file) => file !== '/robots.txt')])].sort();
      const version = createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 12);
      const rules = readFileSync('sw/sw-rules.js', 'utf8').replace(/^export /m, '');
      const source = readFileSync('sw/sw-template.js', 'utf8').replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(files)).replace('__RULES__', rules);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

function devApi(env: Record<string, string>): Plugin {
  return {
    name: 'salon-dev-api',
    configureServer(server) {
      server.middlewares.use('/api', (req, res, next) => {
        const route = (req.url ?? '').replace(/^\//, '').split('?')[0] ?? '';
        if (req.method !== 'POST') {
          next();
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          void (async () => {
            const routes = (await server.ssrLoadModule('/server/routes.ts')) as { AI_ROUTES: Record<string, ApiHandler>; PLAIN_ROUTES: Record<string, (body: unknown, meta: { tester?: string | null }, env: Record<string, string | undefined>, fetchImpl: typeof fetch) => Promise<{ status: number; body: unknown }>> };
            // Story 016: plain routes (feedback) have no guard in local dev.
            const plain = routes.PLAIN_ROUTES[route];
            const handler: ApiHandler | undefined = plain ? (body, e, f) => plain(body, { tester: 'dev' }, e, f) : routes.AI_ROUTES[route];
            if (!handler) {
              res.statusCode = 404;
              res.end();
              return;
            }
            let body: unknown;
            try {
              body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            } catch {
              body = undefined;
            }
            const { status, body: payload } = await handler(body, env, fetch);
            res.statusCode = status;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify(payload));
          })().catch((error: unknown) => {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: { code: 'unknown', message: String(error) } }));
          });
        });
      });
    },
  };
}

/**
 * Phones reach the dev server on a LAN address (`npm run dev` = `vite --host`). Plain HTTP there is not a secure
 * context, so phones block the mic and speech recognition (story 004). With `--host`, serve HTTPS with a
 * self-signed certificate (accept the warning once on the phone). Without it (`npm run dev:local`), plain
 * http://localhost as before.
 */
const servedOnLan = process.argv.includes('--host') || process.argv.some((arg) => arg.startsWith('--host='));

export default defineConfig(({ mode }) => ({
  plugins: [devApi(loadEnv(mode, process.cwd(), '')), serviceWorker(), ...(servedOnLan ? [basicSsl()] : [])],
  // Story 029: the Playwright suite (tests/integration, `npm run e2e`) is not a Vitest suite.
  test: { exclude: [...configDefaults.exclude, 'tests/integration/**'] },
}));
