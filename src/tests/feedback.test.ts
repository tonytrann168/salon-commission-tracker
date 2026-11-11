import { describe, expect, it } from 'vitest';
import { feedbackPost } from '../game/feedback';
import { GUARD_CONFIG, createGuard } from '../server/guard';
import { handleFeedback, parseFeedback } from '../server/handlers/feedback';
import { PLAIN_ROUTES } from '../server/routes';

/** Story 016: tester feedback. No AI, no network: the handler only validates and logs one line. */

const chat = [{ role: 'client' as const, content: 'Hi, I want pink nails.' }, { role: 'player' as const, content: 'Sure! Please sit.' }];

describe('what the browser sends', () => {
  it('adds game details only when allowed, and the chat only when ticked', () => {
    const details = { clientId: 'grace', level: 'some', language: 'vi', stars: 4 };
    const plain = feedbackPost(4, '  Fun! ', { details, includeDetails: false, chat, includeChat: false });
    expect(plain).toEqual({ rating: 4, text: 'Fun!' });
    const withDetails = feedbackPost(4, 'Fun!', { details, includeDetails: true, chat, includeChat: false });
    expect(withDetails.details).toMatchObject({ clientId: 'grace', stars: 4, appVersion: expect.any(String) });
    expect(withDetails).not.toHaveProperty('chat');
    expect(feedbackPost(4, '', { includeDetails: true, chat, includeChat: true })).toMatchObject({ includeChat: true, chat });
  });
});

describe('the feedback handler', () => {
  it('writes one FEEDBACK log line with the rating, tidy text, details and the tester id', async () => {
    const lines: string[] = [];
    const result = await handleFeedback(
      { rating: 5, text: 'Love it!\nThe nails are hard.', details: { clientId: 'tom', level: 'beginner', language: 'en', stars: 3, appVersion: '0.1.0', difficulty: 'hard', extra: 'x' } },
      { tester: 'abc123', now: () => new Date('2026-11-10T12:00:00Z') },
      (line) => lines.push(line),
    );
    expect(result).toEqual({ status: 200, body: { ok: true } });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^FEEDBACK \{/);
    expect(lines[0]).not.toContain('\n');
    expect(JSON.parse(lines[0]!.slice('FEEDBACK '.length))).toEqual({
      v: 1, at: '2026-11-10T12:00:00.000Z', tester: 'abc123', rating: 5, text: 'Love it! The nails are hard.',
      details: { clientId: 'tom', level: 'beginner', language: 'en', stars: 3, appVersion: '0.1.0', difficulty: 'hard' }, chat: null,
    });
  });

  it('never logs chat text unless includeChat is true', async () => {
    const lines: string[] = [];
    await handleFeedback({ rating: 3, chat }, {}, (line) => lines.push(line));
    expect(lines[0]).not.toContain('pink nails');
    await handleFeedback({ rating: 3, includeChat: true, chat }, {}, (line) => lines.push(line));
    expect(lines[1]).toContain('pink nails');
  });

  it('refuses a bad rating or a long note, and drops bad details one by one', async () => {
    expect(parseFeedback({ rating: 0 })).toMatchObject({ ok: false });
    expect(parseFeedback({ rating: 4.5 })).toMatchObject({ ok: false });
    expect(parseFeedback({ rating: 4, text: 'x'.repeat(501) })).toMatchObject({ ok: false });
    const lines: string[] = [];
    expect(await handleFeedback({ rating: 9 }, {}, (l) => lines.push(l))).toMatchObject({ status: 400 });
    expect(lines).toHaveLength(0);
    expect(parseFeedback({ rating: 2, details: { clientId: '<script>', stars: 9, level: 'expert', language: 'vi' } })).toEqual({ ok: true, value: { rating: 2, text: '', details: { language: 'vi' }, chat: null } });
  });

  it('is a plain route (not an AI route)', () => {
    expect(PLAIN_ROUTES.feedback).toBeTypeOf('function');
  });
});

describe('the hosted preview guards feedback separately from the AI budget', () => {
  const env = { TESTER_CODES: 'LAN-01', COOKIE_SECRET: 'x'.repeat(32) };
  it('needs the invite cookie, and has its own per-minute and per-day limits', () => {
    let now = Date.parse('2026-11-10T12:00:00Z');
    const guard = createGuard(env, () => now, { ...GUARD_CONFIG, feedbackPerCodePerMinute: 2, feedbackPerCodePerDay: 3 });
    expect(guard.chargeFeedback(undefined, 'ip')).toMatchObject({ ok: false, status: 401 });
    const login = guard.login('LAN-01', 'ip');
    if (!login.ok) throw new Error('login failed');
    const cookie = login.value.split(';')[0];
    expect(guard.chargeFeedback(cookie, 'ip').ok).toBe(true);
    expect(guard.chargeFeedback(cookie, 'ip').ok).toBe(true);
    expect(guard.chargeFeedback(cookie, 'ip')).toMatchObject({ ok: false, code: 'rate_limited' });
    now += 61_000;
    expect(guard.chargeFeedback(cookie, 'ip').ok).toBe(true);
    now += 61_000;
    expect(guard.chargeFeedback(cookie, 'ip')).toMatchObject({ ok: false, code: 'daily_cap' });
    // The AI budget is untouched by feedback.
    expect(guard.chargeAiCall(cookie, 'ip').ok).toBe(true);
  });
});

describe('durable feedback: the optional Discord webhook (FEEDBACK_WEBHOOK_URL)', () => {
  const entryBody = { rating: 4, text: 'Fun! @everyone look', details: { clientId: 'tom', difficulty: 'hard', level: 'some', language: 'vi', stars: 3, appVersion: '0.1.0' }, includeChat: true, chat };
  const fakeFetch = (status = 204, throws = false) => {
    const calls: { url: string; body: { content: string; allowed_mentions: unknown } }[] = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) });
      if (throws) throw new Error('down');
      return new Response(null, { status });
    }) as unknown as typeof fetch;
    return { calls, fetchImpl };
  };
  const quiet = { log: () => undefined };

  it('posts one readable Discord message (stars, note, game details, chat only when ticked), with no mentions', async () => {
    const { calls, fetchImpl } = fakeFetch();
    const result = await handleFeedback(entryBody, { tester: 'abc123' }, quiet.log, { env: { FEEDBACK_WEBHOOK_URL: 'https://discord.com/api/webhooks/1/x' }, fetchImpl });
    expect(result.status).toBe(200);
    expect(calls).toHaveLength(1);
    const content = calls[0]!.body.content;
    expect(content.split('\n')[0]).toBe('⭐⭐⭐⭐☆ (4/5) · tester abc123');
    expect(content).toContain('> Fun! @everyone look');
    expect(content).toContain('Game: client tom (hard) · level some · vi · 3★ · v0.1.0');
    expect(content).toContain('Client: Hi, I want pink nails.');
    expect(calls[0]!.body.allowed_mentions).toEqual({ parse: [] });
    const { calls: noChat, fetchImpl: f2 } = fakeFetch();
    await handleFeedback({ ...entryBody, includeChat: false }, {}, quiet.log, { env: { FEEDBACK_WEBHOOK_URL: 'https://discord.com/api/webhooks/1/x' }, fetchImpl: f2 });
    expect(noChat[0]!.body.content).not.toContain('pink nails');
  });

  it('keeps the message under 2000 characters', async () => {
    const { calls, fetchImpl } = fakeFetch();
    const long = Array.from({ length: 60 }, () => ({ role: 'client' as const, content: 'x'.repeat(900) }));
    await handleFeedback({ rating: 2, includeChat: true, chat: long }, {}, quiet.log, { env: { FEEDBACK_WEBHOOK_URL: 'https://example.com/hook' }, fetchImpl });
    expect(calls[0]!.body.content.length).toBeLessThanOrEqual(2000);
  });

  it('a failing or non-https webhook never fails the request, and the warning never shows the URL', async () => {
    const warnings: string[] = [];
    const warn = (line: string) => warnings.push(line);
    const secret = 'https://discord.com/api/webhooks/123/SECRET';
    for (const [status, throws] of [[500, false], [204, true]] as const) {
      const { fetchImpl } = fakeFetch(status, throws);
      expect(await handleFeedback({ rating: 3 }, {}, quiet.log, { env: { FEEDBACK_WEBHOOK_URL: secret }, fetchImpl, warn })).toEqual({ status: 200, body: { ok: true } });
    }
    const { calls, fetchImpl } = fakeFetch();
    expect(await handleFeedback({ rating: 3 }, {}, quiet.log, { env: { FEEDBACK_WEBHOOK_URL: 'http://insecure.example/hook' }, fetchImpl, warn })).toMatchObject({ status: 200 });
    expect(calls).toHaveLength(0);
    expect(warnings).toHaveLength(3);
    expect(warnings.join(' ')).not.toMatch(/SECRET|discord\.com|insecure/);
    const { calls: none, fetchImpl: f3 } = fakeFetch();
    await handleFeedback({ rating: 3 }, {}, quiet.log, { env: {}, fetchImpl: f3, warn });
    expect(none).toHaveLength(0);
  });
});
