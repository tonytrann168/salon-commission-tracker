import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import { handleClientTurn } from './server/handlers/client-turn';
import { handleGradeAppointment } from './server/handlers/grade-appointment';
import { handleBestie } from './server/handlers/bestie';
import { handleCorrections } from './server/handlers/corrections';
import { handleTranslate } from './server/handlers/translate';

type ApiHandler = (
  body: unknown,
  env: Record<string, string | undefined>,
  fetchImpl: typeof fetch,
) => Promise<{ status: number; body: unknown }>;

const API_ROUTES: Record<string, ApiHandler> = {
  '/api/client-turn': handleClientTurn,
  '/api/grade-appointment': handleGradeAppointment,
  '/api/translate': handleTranslate,
  '/api/bestie': handleBestie,
  '/api/corrections': handleCorrections,
};

/** Dev-only: serve the POST /api routes with the same handlers Vercel runs in production. */
function devApi(env: Record<string, string>): Plugin {
  return {
    name: 'salon-dev-api',
    configureServer(server) {
      for (const [route, handler] of Object.entries(API_ROUTES)) {
        server.middlewares.use(route, (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end();
            return;
          }
          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => chunks.push(chunk));
          req.on('end', () => {
            let body: unknown;
            try {
              body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            } catch {
              body = undefined;
            }
            void handler(body, env, fetch).then(({ status, body: payload }) => {
              res.statusCode = status;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify(payload));
            });
          });
        });
      }
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
  plugins: [devApi(loadEnv(mode, process.cwd(), '')), ...(servedOnLan ? [basicSsl()] : [])],
}));
