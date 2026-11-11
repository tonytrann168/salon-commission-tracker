import type { IncomingMessage, ServerResponse } from 'node:http';
import { createGuard, GUARD_CONFIG } from './guard';
import { AI_ROUTES, PLAIN_ROUTES } from './routes';

/**
 * The hosted preview's ONE server function (Vercel Build Output API, Node runtime). Every /api/* request lands here:
 * - POST /api/login {code}: check an invite code, set the signed cookie.
 * - GET  /api/session: 200 when signed in, else 401.
 * - POST /api/<ai-route>: signed in + within limits, then the same handler the dev server uses.
 * Built by scripts/build-preview.mjs. Env (Vercel project settings): ANTHROPIC_API_KEY, TESTER_CODES, COOKIE_SECRET,
 * DAILY_AI_CALL_CAP.
 */

const guard = createGuard(process.env);

function send(res: ServerResponse, status: number, body: unknown, extraHeaders: Record<string, string> = {}): void {
  res.writeHead(status, {
    'content-type': 'application/json',
    'cache-control': 'no-store',
    'x-robots-tag': 'noindex, nofollow',
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
}

const error = (code: string, message: string) => ({ error: { code, message } });

function clientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return first || (req.headers['x-real-ip'] as string | undefined) || req.socket.remoteAddress || 'unknown';
}

/** Read a JSON body up to the size cap. `undefined` for an empty or unreadable body; `null` when too large. */
async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > GUARD_CONFIG.maxBodyBytes) return null;
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return undefined;
  }
}

/** The route name: from ?route= (set by the preview's rewrite) or the path after /api/. */
export function routeOf(url: string | undefined): string {
  const parsed = new URL(url ?? '/', 'http://preview.local');
  return parsed.searchParams.get('route') ?? parsed.pathname.replace(/^\/api\/?/, '');
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const route = routeOf(req.url);
  const ip = clientIp(req);

  if (route === 'session' && req.method === 'GET') {
    const result = guard.session(req.headers.cookie);
    send(res, result.ok ? 200 : result.status, result.ok ? { ok: true, unlockAll: guard.unlocksAll(result.value) } : error(result.code, 'Not signed in.'));
    return;
  }
  if (req.method !== 'POST') {
    send(res, 405, error('invalid_request', 'Use POST.'));
    return;
  }
  const body = await readJson(req);
  if (body === null) {
    send(res, 413, error('invalid_request', 'Request too large.'));
    return;
  }
  if (route === 'login') {
    const code = typeof body === 'object' && body !== null ? (body as { code?: unknown }).code : undefined;
    const result = guard.login(code, ip);
    if (result.ok) send(res, 200, { ok: true }, { 'set-cookie': result.value });
    else send(res, result.status, error(result.code, 'That invite code did not work.'));
    return;
  }
  const plain = PLAIN_ROUTES[route];
  if (plain) {
    // Story 016: feedback needs the invite cookie and has its own limits; it never spends the AI budget.
    const allowed = guard.chargeFeedback(req.headers.cookie, ip);
    if (!allowed.ok) {
      send(res, allowed.status, error(allowed.code, allowed.code === 'unauthorized' ? 'Enter your invite code.' : 'Thanks! Please wait a little before sending more.'));
      return;
    }
    const result = await plain(body, { tester: allowed.value });
    send(res, result.status, result.body);
    return;
  }
  const run = AI_ROUTES[route];
  if (!run) {
    send(res, 404, error('invalid_request', 'Unknown route.'));
    return;
  }
  const allowed = guard.chargeAiCall(req.headers.cookie, ip);
  if (!allowed.ok) {
    send(res, allowed.status, error(allowed.code, allowed.code === 'unauthorized' ? 'Enter your invite code.' : 'Mai needs a rest.'));
    return;
  }
  const result = await run(body, process.env, fetch);
  send(res, result.status, result.body);
}
