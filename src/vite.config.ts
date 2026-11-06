import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import { handleClientTurn } from './api/client-turn';

/** Dev-only: serve POST /api/client-turn with the same handler Vercel runs in production. */
function clientTurnDevApi(env: Record<string, string>): Plugin {
  return {
    name: 'client-turn-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/client-turn', (req, res) => {
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
          void handleClientTurn(body, env, fetch).then(({ status, body: payload }) => {
            res.statusCode = status;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify(payload));
          });
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [clientTurnDevApi(loadEnv(mode, process.cwd(), ''))],
}));
