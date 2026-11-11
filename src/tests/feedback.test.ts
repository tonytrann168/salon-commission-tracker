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
