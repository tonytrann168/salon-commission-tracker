import { describe, expect, it } from 'vitest';
import { GUARD_CONFIG, codeId, createGuard, parseCodes, readCookie, signSession, verifySession } from '../server/guard';
import { routeOf } from '../server/preview-function';

/** Hosted preview: invite codes, signed cookie, rate limits and daily caps (owner, 2026-11-10). */

const SECRET = 'a-long-enough-test-secret';
const env = { TESTER_CODES: ' lan-01 , MAI-OWNER ,, ', COOKIE_SECRET: SECRET, DAILY_AI_CALL_CAP: '5' };
const config = { ...GUARD_CONFIG, perCodePerMinute: 100, perIpPerMinute: 100, perCodePerDay: 3 };
const cookieFrom = (setCookie: string): string => setCookie.split(';')[0] as string;

describe('invite codes and the session cookie', () => {
  it('parses codes ignoring case and blanks', () => {
    expect(parseCodes(env.TESTER_CODES)).toEqual(new Set(['LAN-01', 'MAI-OWNER']));
  });

  it('signs a session that verifies, and rejects tampering, expiry and revoked codes', () => {
    const value = signSession(codeId('lan-01'), 1000, SECRET);
    const codes = parseCodes(env.TESTER_CODES);
    expect(verifySession(value, SECRET, codes, 2000)).toBe(codeId('LAN-01'));
    expect(verifySession(value.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')), SECRET, codes, 2000)).toBeNull();
    expect(verifySession(value, 'another-secret-entirely', codes, 2000)).toBeNull();
    expect(verifySession(value, SECRET, codes, 1000 + 31 * 86_400_000)).toBeNull();
    expect(verifySession(value, SECRET, parseCodes('MAI-OWNER'), 2000)).toBeNull();
  });

  it('logs in with a valid code (httpOnly, Secure cookie) and refuses a wrong one', () => {
    const guard = createGuard(env, () => 10_000, config);
    const ok = guard.login('  Lan-01 ', '1.1.1.1');
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value).toMatch(/HttpOnly/);
      expect(ok.value).toMatch(/Secure/);
      expect(guard.session(cookieFrom(ok.value)).ok).toBe(true);
    }
    expect(guard.login('nope', '1.1.1.1')).toMatchObject({ ok: false, status: 401, code: 'bad_code' });
    expect(guard.session(undefined)).toMatchObject({ ok: false, status: 401, code: 'unauthorized' });
  });

  it('fails closed when the secrets are not set', () => {
    expect(createGuard({ TESTER_CODES: 'A' }).session('x')).toMatchObject({ ok: false, status: 503, code: 'not_configured' });
    expect(createGuard({ COOKIE_SECRET: SECRET }).login('A', 'ip')).toMatchObject({ ok: false, code: 'not_configured' });
  });

  it('reads one cookie from a header', () => {
    expect(readCookie('a=1; sb_tester=x.y.z; b=2', 'sb_tester')).toBe('x.y.z');
  });
});

describe('spending guard', () => {
  it('caps AI calls per code per day, then for everyone per day', () => {
    let now = Date.UTC(2026, 10, 10, 12);
    const guard = createGuard(env, () => now, config);
    const lan = guard.login('LAN-01', 'ip1');
    const owner = guard.login('MAI-OWNER', 'ip2');
    if (!lan.ok || !owner.ok) throw new Error('login failed');
    const results = [1, 2, 3, 4].map(() => guard.chargeAiCall(cookieFrom(lan.value), 'ip1'));
    expect(results.map((r) => r.ok)).toEqual([true, true, true, false]);
    expect(results[3]).toMatchObject({ status: 429, code: 'daily_cap' });
    // Global cap 5: the owner gets 2 more, then everyone is capped.
    expect([1, 2, 3].map(() => guard.chargeAiCall(cookieFrom(owner.value), 'ip2').ok)).toEqual([true, true, false]);
    // A new UTC day resets the counts.
    now += 86_400_000;
    expect(guard.chargeAiCall(cookieFrom(lan.value), 'ip1').ok).toBe(true);
  });

  it('rate-limits per minute and refuses AI calls without a valid cookie', () => {
    const guard = createGuard(env, () => Date.UTC(2026, 10, 10, 12), { ...GUARD_CONFIG, perCodePerMinute: 2 });
    const lan = guard.login('LAN-01', 'ip');
    if (!lan.ok) throw new Error('login failed');
    const cookie = cookieFrom(lan.value);
    expect([1, 2, 3].map(() => guard.chargeAiCall(cookie, 'ip').ok)).toEqual([true, true, false]);
    expect(guard.chargeAiCall('sb_tester=forged.1.x', 'ip')).toMatchObject({ status: 401, code: 'unauthorized' });
  });
});

describe('preview routing', () => {
  it('reads the route from the rewrite query or the path', () => {
    expect(routeOf('/api?route=client-turn')).toBe('client-turn');
    expect(routeOf('/api/session')).toBe('session');
  });
});
