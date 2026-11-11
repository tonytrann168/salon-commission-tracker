import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import guardJson from './guard-config.json';

/**
 * The hosted preview's door and spending guard (owner, 2026-11-10). Testers enter an invite code (env TESTER_CODES,
 * comma-separated, one per tester, so one can be revoked); a valid code sets a signed, httpOnly cookie, and every AI
 * call needs that cookie. AI calls are rate-limited per code and per IP, capped per code per day, and capped for
 * everyone per day (env DAILY_AI_CALL_CAP). Codes in env UNLOCK_ALL_CODES (also valid invite codes) open every client
 * difficulty for that tester (owner-controlled; normal players keep the rank locks). The page only learns a yes/no from
 * /api/session, never the list.
 *
 * Counters live in memory: best effort. Each warm Vercel instance keeps its own counts, and a cold start resets them.
 * The Anthropic Console's monthly spend limit is the real backstop (see the owner setup README).
 */

export interface GuardConfig {
  cookieName: string;
  cookieDays: number;
  perCodePerMinute: number;
  perIpPerMinute: number;
  loginTriesPerIpPerMinute: number;
  perCodePerDay: number;
  defaultGlobalPerDay: number;
  maxBodyBytes: number;
  /** Story 016: feedback posts, separate from the AI budget. */
  feedbackPerCodePerMinute: number;
  feedbackPerCodePerDay: number;
}

export const GUARD_CONFIG: GuardConfig = guardJson;

export type GuardErrorCode = 'unauthorized' | 'bad_code' | 'rate_limited' | 'daily_cap' | 'not_configured';
export type GuardResult<T> = { ok: true; value: T } | { ok: false; status: number; code: GuardErrorCode };

/** Codes are matched ignoring case and spaces at the ends (easy to type on a phone). */
export const normalizeCode = (code: string): string => code.trim().toUpperCase();

/** The tester codes from env, normalised; empty entries dropped. */
export function parseCodes(raw: string | undefined): Set<string> {
  return new Set((raw ?? '').split(',').map(normalizeCode).filter((code) => code !== ''));
}

/** A code's id: a short hash, so the cookie never carries the code itself. */
export const codeId = (code: string): string => createHash('sha256').update(normalizeCode(code)).digest('hex').slice(0, 16);

const signature = (payload: string, secret: string): string => createHmac('sha256', secret).update(payload).digest('base64url');

/** Cookie value: `<codeId>.<issuedAt ms>.<hmac>`. */
export function signSession(id: string, issuedAt: number, secret: string): string {
  const payload = `${id}.${issuedAt}`;
  return `${payload}.${signature(payload, secret)}`;
}

/** The code id from a valid, unexpired cookie whose code is still in TESTER_CODES (so revoking a code locks it out). */
export function verifySession(value: string | undefined, secret: string, codes: Set<string>, now: number, config: GuardConfig = GUARD_CONFIG): string | null {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  const [id, issued, mac] = parts as [string, string, string];
  const expected = signature(`${id}.${issued}`, secret);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const issuedAt = Number(issued);
  if (!Number.isFinite(issuedAt) || issuedAt > now || now - issuedAt > config.cookieDays * 86_400_000) return null;
  return [...codes].some((code) => codeId(code) === id) ? id : null;
}

/** One cookie from a Cookie header. */
export function readCookie(header: string | undefined, name: string): string | undefined {
  for (const part of (header ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
}

/** The Set-Cookie header for a session. */
export const sessionCookie = (value: string, config: GuardConfig = GUARD_CONFIG): string =>
  `${config.cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${config.cookieDays * 86_400}`;

/** Fixed one-minute windows per key. */
class MinuteLimiter {
  private counts = new Map<string, { window: number; count: number }>();

  /** Count one hit; false when the key is over `limit` this minute. */
  hit(key: string, limit: number, now: number): boolean {
    const window = Math.floor(now / 60_000);
    const entry = this.counts.get(key);
    if (!entry || entry.window !== window) {
      this.counts.set(key, { window, count: 1 });
      if (this.counts.size > 10_000) this.counts.clear();
      return true;
    }
    entry.count++;
    return entry.count <= limit;
  }
}

/** Calls per UTC day, per key. */
class DailyCounter {
  private day = '';
  private counts = new Map<string, number>();

  count(key: string, now: number): number {
    this.roll(now);
    return this.counts.get(key) ?? 0;
  }

  add(key: string, now: number): void {
    this.roll(now);
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
  }

  private roll(now: number): void {
    const day = new Date(now).toISOString().slice(0, 10);
    if (day !== this.day) {
      this.day = day;
      this.counts.clear();
    }
  }
}

export interface GuardEnv {
  TESTER_CODES?: string;
  UNLOCK_ALL_CODES?: string;
  COOKIE_SECRET?: string;
  DAILY_AI_CALL_CAP?: string;
}

export interface Guard {
  /** Check an invite code; on success returns the Set-Cookie header value. */
  login(code: unknown, ip: string): GuardResult<string>;
  /** Is this request signed in? Returns the code id. */
  session(cookieHeader: string | undefined): GuardResult<string>;
  /** Does this signed-in code open every client difficulty (UNLOCK_ALL_CODES)? */
  unlocksAll(id: string): boolean;
  /** Signed in AND within every limit; counts the AI call. */
  chargeAiCall(cookieHeader: string | undefined, ip: string): GuardResult<string>;
  /** Story 016: signed in and within the feedback limits (separate from the AI budget); counts the post. */
  chargeFeedback(cookieHeader: string | undefined, ip: string): GuardResult<string>;
}

export function createGuard(env: GuardEnv, clock: () => number = Date.now, config: GuardConfig = GUARD_CONFIG): Guard {
  const minute = new MinuteLimiter();
  const daily = new DailyCounter();
  const fail = <T>(status: number, code: GuardErrorCode): GuardResult<T> => ({ ok: false, status, code });
  const unlockIds = (): Set<string> => new Set([...parseCodes(env.UNLOCK_ALL_CODES)].map(codeId));
  const configured = (): { codes: Set<string>; secret: string } | null => {
    // Unlock-all codes are invite codes too.
    const codes = new Set([...parseCodes(env.TESTER_CODES), ...parseCodes(env.UNLOCK_ALL_CODES)]);
    const secret = env.COOKIE_SECRET ?? '';
    // Fail closed: no codes or a short secret means nobody gets in.
    return codes.size > 0 && secret.length >= 16 ? { codes, secret } : null;
  };
  const globalCap = (): number => {
    const value = Number(env.DAILY_AI_CALL_CAP);
    return Number.isInteger(value) && value > 0 ? value : config.defaultGlobalPerDay;
  };

  const session = (cookieHeader: string | undefined): GuardResult<string> => {
    const setup = configured();
    if (!setup) return fail(503, 'not_configured');
    const id = verifySession(readCookie(cookieHeader, config.cookieName), setup.secret, setup.codes, clock(), config);
    return id ? { ok: true, value: id } : fail(401, 'unauthorized');
  };

  return {
    login(code, ip) {
      const setup = configured();
      if (!setup) return fail(503, 'not_configured');
      const now = clock();
      if (!minute.hit(`login:${ip}`, config.loginTriesPerIpPerMinute, now)) return fail(429, 'rate_limited');
      if (typeof code !== 'string' || !setup.codes.has(normalizeCode(code))) return fail(401, 'bad_code');
      return { ok: true, value: sessionCookie(signSession(codeId(code), now, setup.secret), config) };
    },
    session,
    unlocksAll: (id) => unlockIds().has(id),
    chargeAiCall(cookieHeader, ip) {
      const signedIn = session(cookieHeader);
      if (!signedIn.ok) return signedIn;
      const id = signedIn.value;
      const now = clock();
      if (daily.count('all', now) >= globalCap() || daily.count(`code:${id}`, now) >= config.perCodePerDay) return fail(429, 'daily_cap');
      if (!minute.hit(`code:${id}`, config.perCodePerMinute, now) || !minute.hit(`ip:${ip}`, config.perIpPerMinute, now)) return fail(429, 'rate_limited');
      daily.add('all', now);
      daily.add(`code:${id}`, now);
      return { ok: true, value: id };
    },
    chargeFeedback(cookieHeader, ip) {
      const signedIn = session(cookieHeader);
      if (!signedIn.ok) return signedIn;
      const id = signedIn.value;
      const now = clock();
      if (daily.count(`feedback:${id}`, now) >= config.feedbackPerCodePerDay) return fail(429, 'daily_cap');
      if (!minute.hit(`feedback:${id}`, config.feedbackPerCodePerMinute, now) || !minute.hit(`ip:${ip}`, config.perIpPerMinute, now)) return fail(429, 'rate_limited');
      daily.add(`feedback:${id}`, now);
      return { ok: true, value: id };
    },
  };
}
