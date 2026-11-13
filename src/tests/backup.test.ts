import { describe, expect, it } from 'vitest';
import { applyBackup, collect, makeBackup, readBackup, summarize } from '../game/backup';

/** Story 020: backup codes. Round trip, checksum, version, bad input, and only the game's keys. */

const memoryStorage = (initial: Record<string, string>) => {
  const map = new Map(Object.entries(initial));
  return {
    map,
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
};

const device = {
  'salon.save': JSON.stringify({ version: 1, appointments: 12, wallet: 40 }),
  'salon.companion.v1': JSON.stringify({ chosen: true, gender: 'male', name: 'Minh', equipped: { head: 'bow-pink' } }),
  'salon.phrasebook.v1': JSON.stringify([{ en: 'See you soon!', vi: 'Hẹn gặp lại!' }, { en: 'Please sit here.', vi: 'Mời chị ngồi.' }]),
  'salon.helpLanguage': 'full',
  'salon.maiSide': 'right',
  'other.app': 'not ours',
};

describe('backup codes', () => {
  it('round-trips everything the game saves (and nothing else), compressed', async () => {
    const code = await makeBackup(collect(memoryStorage(device)), new Date('2026-11-13T21:00:00Z'));
    expect(code).toMatch(/^SB1-[0-9a-f]{12}-[A-Za-z0-9_-]+$/);
    // A real phrasebook compresses well.
    const big = { ...device, 'salon.phrasebook.v1': JSON.stringify(Array.from({ length: 60 }, (_, i) => ({ en: `Would you like a top coat today? ${i}`, vi: `Chị có muốn sơn bóng không? ${i}`, topic: 'consultation' }))) };
    const bigCode = await makeBackup(collect(memoryStorage(big)));
    expect(bigCode.length).toBeLessThan(JSON.stringify(big).length / 2);
    const read = await readBackup(`  ${code.slice(0, 40)}\n${code.slice(40)} `);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(Object.keys(read.contents.data).sort()).toEqual(['salon.companion.v1', 'salon.helpLanguage', 'salon.phrasebook.v1', 'salon.save']);
    expect(read.contents.data['salon.companion.v1']).toBe(device['salon.companion.v1']);
    expect(summarize(read.contents)).toEqual({ appointments: 12, companion: 'Minh', phrases: 2, at: '2026-11-13T21:00:00.000Z' });
  });

  it('refuses a damaged, edited, cut-off or future-version code', async () => {
    const code = await makeBackup(collect(memoryStorage(device)));
    const last = code.slice(-1);
    expect(await readBackup(code.slice(0, -1) + (last === 'A' ? 'B' : 'A'))).toEqual({ ok: false, problem: 'checksum' });
    expect(await readBackup(code.slice(0, code.length - 20))).toEqual({ ok: false, problem: 'checksum' });
    expect(await readBackup('hello')).toEqual({ ok: false, problem: 'format' });
    expect(await readBackup(code.replace(/^SB1/, 'SB2'))).toEqual({ ok: false, problem: 'version' });
  });

  it('a code can only write the game\'s own text keys', async () => {
    // A hand-made code with a foreign key and a correct checksum is still refused.
    const sneaky = await makeBackup({ 'salon.save': '{}' });
    const read = await readBackup(sneaky);
    expect(read.ok).toBe(true);
    const evil = { v: 1, at: 'x', data: { 'salon.save': '{}', 'evil.key': 'x' } };
    const forged = await (async () => {
      const bytes = new TextEncoder().encode(JSON.stringify(evil));
      const out = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
      const b64 = Buffer.from(out).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const digest = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(b64))).toString('hex').slice(0, 12);
      return `SB1-${digest}-${b64}`;
    })();
    expect(await readBackup(forged)).toEqual({ ok: false, problem: 'contents' });
  });

  it('restoring replaces only the game\'s keys', async () => {
    const phone = memoryStorage({ 'salon.save': '{"old":true}', 'salon.tour.v1': '{"done":true}', 'other.app': 'keep me' });
    const read = await readBackup(await makeBackup(collect(memoryStorage(device))));
    if (!read.ok) throw new Error('bad code');
    applyBackup(phone, read.contents);
    expect(phone.map.get('salon.save')).toBe(device['salon.save']);
    expect(phone.map.has('salon.tour.v1')).toBe(false);
    expect(phone.map.get('other.app')).toBe('keep me');
    expect(phone.map.get('salon.companion.v1')).toBe(device['salon.companion.v1']);
  });
});
