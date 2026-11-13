import type { BrowserContext, Page, Route } from '@playwright/test';

/**
 * Story 029: shared helpers for the end-to-end suite. Every /api route and every Supabase call is answered here, so the
 * suite needs no keys and no network. Nothing is shared between tests: each test makes its own fakes.
 */

export type Lang = 'en' | 'vi';
export const LANGS: Lang[] = ['en', 'vi'];

export const localDay = (d = new Date()): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export interface SeedOptions {
  /** Companion already chosen (false = a true first run). */
  companion?: boolean;
  /** English level already chosen. */
  level?: boolean;
  tourDone?: boolean;
  save?: Record<string, unknown>;
  extra?: Record<string, string>;
}

/** Storage for a player, written once per browser context (a reload keeps what the game saved). */
export async function seed(target: Page | BrowserContext, lang: Lang, options: SeedOptions = {}): Promise<void> {
  const data: Record<string, string> = {
    'salon.helpLanguage': lang === 'vi' ? 'full' : 'tap',
    'salon.clientVoice': 'off',
    'salon.cornerSeen': '1',
    ...(options.level === false ? {} : { 'salon.englishLevel': 'some' }),
    ...(options.companion === false ? {} : { 'salon.companion.v1': JSON.stringify({ chosen: true, gender: 'female', name: 'Mai', equipped: {} }) }),
    ...(options.tourDone === false ? {} : { 'salon.tour.v1': JSON.stringify({ done: true, seen: [] }) }),
    ...(options.save ? { 'salon.save': JSON.stringify({ version: 1, wallet: 0, tipsEarned: 0, xp: 0, appointments: 0, owned: [], badges: [], daily: null, dailyDoneDay: '', streak: 0, history: {}, ...options.save }) } : {}),
    ...options.extra,
  };
  await target.addInitScript((entries) => {
    if (sessionStorage.getItem('e2e.seeded') || localStorage.getItem('e2e.seeded')) return;
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
    localStorage.setItem('e2e.seeded', '1');
    sessionStorage.setItem('e2e.seeded', '1');
  }, data);
}

/** Today's daily challenge with a chosen client (and situation), so a test can pick its client from the daily card. */
export const dailyWith = (clientId: string, scenarioId?: string): Record<string, unknown> => ({ daily: { day: localDay(), clientId, ...(scenarioId ? { scenarioId } : {}) } });

export interface ApiOptions {
  /** Client replies in order; the phase walks consultation → service → checkout → done one step per turn. */
  replies?: string[];
  grading?: Record<string, unknown>;
}

/** Answer every /api call the game makes. Returns the requests seen, by route. */
export async function mockApi(target: Page | BrowserContext, options: ApiOptions = {}): Promise<Record<string, unknown[]>> {
  const seen: Record<string, unknown[]> = {};
  const phases = ['service', 'checkout', 'done'];
  let turn = 0;
  const replies = options.replies ?? ['Hi! I would like a manicure, please.', 'That colour is lovely, thank you!', 'How much do I owe you?', 'Thank you so much, see you next time!'];
  await target.route('**/api/**', async (route: Route) => {
    const name = new URL(route.request().url()).pathname.replace('/api/', '');
    const body = route.request().postDataJSON?.() ?? null;
    (seen[name] ??= []).push(body);
    const json = (value: unknown) => route.fulfill({ json: value });
    switch (name) {
      case 'client-turn': {
        const phase = phases[Math.min(turn, phases.length - 1)];
        const reply = replies[Math.min(turn + 1, replies.length - 1)];
        turn += 1;
        return json({ reply, moodDelta: 3, phase, unclearEnglish: false, rude: false });
      }
      case 'grade-appointment':
        return json(options.grading ?? {
          skills: { greeting: 90, consultation: 85, upsell: 70, rebooking: 80, problemHandling: 80 },
          english: { clarity: 85, politeness: 95, grammarVocabulary: 80 },
          rebooked: true,
          redoDemanded: false,
          review: 'Lovely service and a friendly chat. My nails look great!',
        });
      case 'translate':
        return json({ translation: 'Chào em, chị muốn làm móng.' });
      case 'corrections':
        return json({ needsCorrection: false, praise: '', better: null, reason: '' });
      case 'bestie':
        return json({ hint: 'Ask what colour she likes.', praise: 'Great job!', tryNext: 'Offer a top coat.', question: '', memory: '', reply: 'Nice!' });
      case 'session':
        return json({ signedIn: true });
      default:
        return json({ ok: true });
    }
  });
  return seen;
}

/** Start an appointment from today's daily card and send lines until the results show. */
export async function playToResults(page: Page, lines = ['Hello! Welcome to our salon. Please have a seat.', 'Which colour would you like today?', 'Your nails are done. That is twenty-five dollars.', 'Thank you! See you next time.']): Promise<void> {
  await page.locator('.title-menu > .chat-button').first().click();
  await page.locator('.picker-daily').click();
  await page.waitForSelector('.chat-input');
  for (const line of lines) {
    if (await page.locator('.chat-results:not(.hidden)').count()) break;
    await page.locator('.chat-input').fill(line);
    await page.locator('.chat-form button[type=submit]').click();
    await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>('.chat-form button[type=submit]')?.disabled || document.querySelector('.chat-results:not(.hidden)'));
  }
  await page.waitForSelector('.chat-results:not(.hidden) .results-section', { timeout: 15_000 });
}

/** Page width never exceeds the phone. */
export const noOverflow = (page: Page): Promise<boolean> => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

// ---------------------------------------------------------------------------------------------------------------
// A fake Supabase (Auth + the saves table) over HTTP, shared by every context a test routes through it.

const b64 = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url');

export interface FakeSupabase {
  route(context: BrowserContext): Promise<unknown>;
  /** The last 6-digit code emailed to this address. */
  code(email: string): string | undefined;
  saves: Map<string, { data: string; version: number; updated_at: string }>;
  users: Map<string, { id: string; password: string; confirmed: boolean }>;
}

export function fakeSupabase(): FakeSupabase {
  const users = new Map<string, { id: string; password: string; confirmed: boolean }>();
  const saves = new Map<string, { data: string; version: number; updated_at: string }>();
  const codes = new Map<string, string>();
  const tokens = new Map<string, string>();
  let n = 0;
  const user = (email: string) => ({ id: users.get(email)!.id, aud: 'authenticated', role: 'authenticated', email, email_confirmed_at: users.get(email)!.confirmed ? new Date().toISOString() : null, app_metadata: { provider: 'email' }, user_metadata: {}, created_at: new Date().toISOString() });
  const session = (email: string) => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const access = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: users.get(email)!.id, email, role: 'authenticated', aud: 'authenticated', exp })}.sig`;
    tokens.set(access, email);
    return { access_token: access, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: `r-${++n}`, user: user(email) };
  };
  const sendCode = (email: string) => codes.set(email, String(100000 + Math.floor(Math.random() * 899999)));
  const fail = (route: Route, status: number, code: string, msg: string) => route.fulfill({ status, json: { code: status, error_code: code, msg } });
  const who = (route: Route) => tokens.get((route.request().headers().authorization ?? '').replace(/^Bearer /, ''));

  const handle = async (route: Route): Promise<void> => {
    const req = route.request();
    const url = new URL(req.url());
    const body = (req.postDataJSON?.() ?? {}) as Record<string, string>;
    const path = url.pathname;
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (path === '/auth/v1/signup') {
      if (!users.has(body.email!)) users.set(body.email!, { id: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`, password: body.password!, confirmed: false });
      sendCode(body.email!);
      return route.fulfill({ json: user(body.email!) });
    }
    if (path === '/auth/v1/resend') {
      sendCode(body.email!);
      return route.fulfill({ json: {} });
    }
    if (path === '/auth/v1/verify') {
      if (!users.has(body.email!) || codes.get(body.email!) !== body.token) return fail(route, 403, 'otp_expired', 'Token has expired or is invalid');
      users.get(body.email!)!.confirmed = true;
      return route.fulfill({ json: session(body.email!) });
    }
    if (path === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
      const u = users.get(body.email!);
      if (!u || u.password !== body.password) return fail(route, 400, 'invalid_credentials', 'Invalid login credentials');
      if (!u.confirmed) return fail(route, 400, 'email_not_confirmed', 'Email not confirmed');
      return route.fulfill({ json: session(body.email!) });
    }
    if (path === '/auth/v1/recover') {
      if (users.has(body.email!)) sendCode(body.email!);
      return route.fulfill({ json: {} });
    }
    if (path === '/auth/v1/user') {
      const email = who(route);
      if (!email) return fail(route, 401, 'no_authorization', 'not signed in');
      if (req.method() === 'PUT' && body.password) users.get(email)!.password = body.password;
      return route.fulfill({ json: user(email) });
    }
    if (path === '/auth/v1/logout') return route.fulfill({ status: 204, body: '' });
    if (path === '/rest/v1/saves') {
      const email = who(route);
      const id = email ? users.get(email)!.id : null;
      if (req.method() === 'GET') {
        const wanted = (url.searchParams.get('user_id') ?? '').replace('eq.', '');
        const row = id && wanted === id ? saves.get(id) : undefined;
        return route.fulfill({ json: row ? [row] : [] });
      }
      if (req.method() === 'POST') {
        const rows = Array.isArray(body) ? body : [body];
        for (const row of rows as unknown as { user_id: string; data: string; version: number; updated_at: string }[]) {
          if (row.user_id !== id) return route.fulfill({ status: 403, json: { message: 'row-level security' } });
          saves.set(row.user_id, { data: row.data, version: row.version, updated_at: row.updated_at });
        }
        return route.fulfill({ status: 201, body: '' });
      }
    }
    if (path === '/rest/v1/rpc/delete_my_account') {
      const email = who(route);
      if (email) {
        saves.delete(users.get(email)!.id);
        users.delete(email);
      }
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill({ status: 404, json: { message: `fake supabase: ${req.method()} ${path}` } });
  };
  return {
    route: (context) => context.route('https://e2etest.supabase.co/**', handle),
    code: (email) => codes.get(email),
    saves,
    users,
  };
}
