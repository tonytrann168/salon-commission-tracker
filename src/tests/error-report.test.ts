import { describe, expect, it, vi } from 'vitest';
import { ERROR_REPORT_LIMITS, buildReport, createReportLimiter, parseReport, scrub, stackTop } from '../game/error-report';
import { GUARD_CONFIG, createGuard } from '../server/guard';
import { handleClientError } from '../server/handlers/client-error';
import { TurnError, networkError } from '../game/types';

/** Story 032: privacy-safe client error reports, their server route and limits, and AI timeouts. */

const ORIGIN = 'https://salon.example.app';

describe('client error reports', () => {
  it('scrubs emails, long numbers and backup codes; keeps the error readable', () => {
    expect(scrub('Failed for lan@gmail.com with code 123456 SB1-0123456789ab-ZVLdeflated')).toBe('Failed for <email> with code <number> SB1-0123456789ab-<code>');
  });

  it('keeps only the top 3 stack lines from the game\'s own files, without query strings', () => {
    const stack = ['TypeError: x is undefined', `    at draw (${ORIGIN}/assets/stage-abc.js?v=1:10:5)`, '    at ext (chrome-extension://xyz/inject.js:1:1)', `    at a (${ORIGIN}/assets/index.js:2:3)`, `    at b (${ORIGIN}/assets/index.js:3:3)`, `    at c (${ORIGIN}/assets/index.js:4:3)`].join('\n');
    const top = stackTop(stack, ORIGIN);
    expect(top).toEqual(['at draw (/assets/stage-abc.js:10:5)', 'at a (/assets/index.js:2:3)', 'at b (/assets/index.js:3:3)']);
  });

  it('builds a report with only message, stack, version and path', () => {
    const error = new TypeError(`can't read "x" for lan@gmail.com ${'y'.repeat(400)}`);
    const report = buildReport(error, '1.0.0-rc.1', { origin: ORIGIN, pathname: '/' });
    expect(Object.keys(report).sort()).toEqual(['message', 'path', 'stack', 'version']);
    expect(report.message.length).toBeLessThanOrEqual(ERROR_REPORT_LIMITS.message);
    expect(report.message).toMatch(/^TypeError: can't read "x" for <email>/);
    expect(buildReport('plain text', 'v', { origin: ORIGIN, pathname: '/x' })).toMatchObject({ message: 'plain text', stack: [] });
  });

  it('sends at most 3 a session and never the same message twice', () => {
    const allow = createReportLimiter();
    const r = (message: string) => ({ message, stack: [], version: 'v', path: '/' });
    expect([allow(r('a')), allow(r('a')), allow(r('b')), allow(r('c')), allow(r('d'))]).toEqual([true, false, true, true, false]);
  });
});

describe('/api/client-error', () => {
  it('validates strictly, scrubs again, logs, and forwards to the webhook when set', async () => {
    expect((await handleClientError({ message: '', stack: [], version: 'v', path: '/' }, {}, () => undefined)).status).toBe(400);
    expect((await handleClientError({ message: 'x', stack: ['1', '2', '3', '4'], version: 'v', path: '/' }, {}, () => undefined)).status).toBe(400);
    expect((await handleClientError({ message: 'x', stack: [], version: 'v', path: 'no-slash' }, {}, () => undefined)).status).toBe(400);
    const logs: string[] = [];
    const fetchImpl = vi.fn(async () => new Response('', { status: 204 }));
    const result = await handleClientError({ message: 'Boom for lan@gmail.com', stack: ['at a (/assets/index.js:1:1)'], version: '1.0.0', path: '/', chat: 'secret chat' }, { tester: 'abc' }, (l) => logs.push(l), { env: { FEEDBACK_WEBHOOK_URL: 'https://discord.example/webhook' }, fetchImpl });
    expect(result.status).toBe(200);
    expect(logs[0]).toMatch(/^CLIENT_ERROR /);
    expect(logs[0]).not.toMatch(/gmail|secret chat/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const sent = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(sent.content).toMatch(/Client error · v1\.0\.0/);
    expect(sent.allowed_mentions).toEqual({ parse: [] });
  });

  it('a webhook failure never fails the report', async () => {
    const result = await handleClientError({ message: 'x', stack: [], version: 'v', path: '/' }, {}, () => undefined, { env: { FEEDBACK_WEBHOOK_URL: 'https://discord.example/w' }, fetchImpl: async () => { throw new Error('down'); }, warn: () => undefined });
    expect(result.status).toBe(200);
  });

  it('on the hosted preview it needs the invite cookie and has its own limits', () => {
    const env = { TESTER_CODES: 'LAN-01', COOKIE_SECRET: 'a-long-enough-test-secret' };
    const config = { ...GUARD_CONFIG, clientErrorPerCodePerMinute: 2, clientErrorPerCodePerDay: 3, perIpPerMinute: 100 };
    let now = 10_000;
    const guard = createGuard(env, () => now, config);
    expect(guard.chargeClientError(undefined, 'ip')).toMatchObject({ ok: false, code: 'unauthorized' });
    const login = guard.login('LAN-01', 'ip');
    const cookie = login.ok ? (login.value.split(';')[0] as string) : '';
    expect(guard.chargeClientError(cookie, 'ip').ok).toBe(true);
    expect(guard.chargeClientError(cookie, 'ip').ok).toBe(true);
    expect(guard.chargeClientError(cookie, 'ip')).toMatchObject({ ok: false, code: 'rate_limited' });
    // Feedback keeps its own budget.
    expect(guard.chargeFeedback(cookie, 'ip').ok).toBe(true);
    now += 61_000;
    expect(guard.chargeClientError(cookie, 'ip').ok).toBe(true);
    now += 61_000;
    expect(guard.chargeClientError(cookie, 'ip')).toMatchObject({ ok: false, code: 'daily_cap' });
  });
});

describe('AI timeouts', () => {
  it('a timed-out call is a "timeout" TurnError; other failures stay "network"', () => {
    expect(networkError(new DOMException('slow', 'TimeoutError'))).toMatchObject({ code: 'timeout' });
    expect(networkError(new TypeError('Failed to fetch'))).toMatchObject({ code: 'network' });
    expect(networkError(new TypeError('x'))).toBeInstanceOf(TurnError);
  });
});
