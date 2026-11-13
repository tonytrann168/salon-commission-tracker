import { describe, expect, it, vi } from 'vitest';
import { createAccount } from '../game/account/account';
import { cloudConfigured, mapError, moveSession, rememberStorage } from '../game/account/cloud';
import type { Cloud, CloudResult, CloudSave, CloudUser } from '../game/account/cloud';
import { ACCOUNT_CONFIG, createUploader, decideSync, fingerprint, isCode, isEmail, isPassword, maskEmail } from '../game/account/sync';
import type { AccountMemory } from '../game/account/sync';
import { makeBackup, readBackup } from '../game/backup';

/** Story 025: email + password accounts, remember me, and keeping the device and the cloud together. */

const memoryStorage = (initial: Record<string, string> = {}): Storage => {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  };
};

/** A stand-in Supabase: accounts with passwords, confirmation and recovery codes, one save per player. */
function fakeCloud() {
  const users = new Map<string, { id: string; password: string; confirmed: boolean }>();
  const saves = new Map<string, CloudSave>();
  let current: CloudUser | null = null;
  const sent: { email: string; kind: 'signup' | 'recovery'; code: string }[] = [];
  let n = 0;
  const fail = <T>(error: Parameters<typeof mapError>[0], step?: Parameters<typeof mapError>[1]): CloudResult<T> => mapError(error, step);
  const send = (email: string, kind: 'signup' | 'recovery'): void => void sent.push({ email, kind, code: String(100000 + sent.length) });
  const lastCode = (email: string, kind: 'signup' | 'recovery'): string | undefined => sent.filter((s) => s.email === email && s.kind === kind).at(-1)?.code;
  const cloud: Cloud = {
    async signUp(email, password) {
      if (!users.has(email)) users.set(email, { id: `u${++n}`, password, confirmed: false });
      send(email, 'signup');
      return { ok: true, value: null };
    },
    async confirmSignUp(email, code) {
      const u = users.get(email);
      if (!u || code !== lastCode(email, 'signup')) return fail({ message: 'Token has expired or is invalid' }, 'code');
      u.confirmed = true;
      current = { id: u.id, email };
      return { ok: true, value: current };
    },
    async resendSignUpCode(email) {
      send(email, 'signup');
      return { ok: true, value: null };
    },
    async signIn(email, password) {
      const u = users.get(email);
      if (!u || u.password !== password) return fail({ status: 400, message: 'Invalid login credentials' }, 'signIn');
      if (!u.confirmed) return fail({ status: 400, message: 'Email not confirmed', code: 'email_not_confirmed' }, 'signIn');
      current = { id: u.id, email };
      return { ok: true, value: current };
    },
    async sendRecoveryCode(email) {
      send(email, 'recovery');
      return { ok: true, value: null };
    },
    async resetPassword(email, code, password) {
      const u = users.get(email);
      if (!u || code !== lastCode(email, 'recovery')) return fail({ message: 'Token has expired or is invalid' }, 'code');
      u.password = password;
      u.confirmed = true;
      current = { id: u.id, email };
      return { ok: true, value: current };
    },
    currentUser: async () => current,
    signOut: async () => void (current = null),
    async load(id) {
      return { ok: true, value: saves.get(id) ?? null };
    },
    async save(id, data, version) {
      const s = { data, version, updatedAt: new Date().toISOString() };
      saves.set(id, s);
      return { ok: true, value: s };
    },
    async deleteAccount() {
      if (!current) return { ok: false, error: 'not_signed_in' };
      for (const [email, u] of users) if (u.id === current.id) users.delete(email);
      saves.delete(current.id);
      current = null;
      return { ok: true, value: null };
    },
  };
  return { cloud, users, saves, sent, lastCode, setCurrent: (u: CloudUser | null) => (current = u) };
}

const progress = (appointments: number, wallet = 10): Record<string, string> => ({
  'salon.save': JSON.stringify({ version: 1, appointments, wallet, xp: appointments * 25, tipsEarned: appointments * 5 }),
  'salon.companion.v1': JSON.stringify({ chosen: true, gender: 'female', name: 'Mai', equipped: {} }),
});

function device(data: Record<string, string>) {
  const storage = memoryStorage(data);
  const session = memoryStorage();
  let memory: AccountMemory = { email: '', nudged: false, remember: true, synced: '' };
  const reload = vi.fn();
  return {
    storage,
    session,
    reload,
    get memory() {
      return memory;
    },
    make: (cloud: Cloud) => createAccount({ cloud, storage, sessionStorage: session, load: () => memory, save: (m) => (memory = m), reload, timers: { set: () => 0, clear: () => undefined }, now: () => new Date('2026-11-13T10:00:00Z') }),
  };
}

async function signedUp(fake: ReturnType<typeof fakeCloud>, email = 'lan@example.com', password = 'polish123') {
  await fake.cloud.signUp(email, password);
  await fake.cloud.confirmSignUp(email, fake.lastCode(email, 'signup')!);
  await fake.cloud.signOut();
}

describe('account rules', () => {
  it('is on only with an https project URL and a public key', () => {
    expect(cloudConfigured({})).toBe(false);
    expect(cloudConfigured({ VITE_SUPABASE_URL: 'http://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'k'.repeat(40) })).toBe(false);
    expect(cloudConfigured({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'short' })).toBe(false);
    expect(cloudConfigured({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'k'.repeat(40) })).toBe(true);
  });

  it('checks email, password (8+ characters, nothing else) and 6-digit codes; masks the email hint', () => {
    expect(ACCOUNT_CONFIG.minPassword).toBe(8);
    expect(isPassword('1234567')).toBe(false);
    expect(isPassword('abcdefgh')).toBe(true);
    expect(isEmail(' lan@example.com ')).toBe(true);
    expect(isEmail('lan@example')).toBe(false);
    expect(isCode('123456')).toBe(true);
    expect(isCode('12345a')).toBe(false);
    expect(maskEmail('test@gmail.com')).toBe('t***@gmail.com');
  });

  it('never says whether an email exists when sign-in fails', () => {
    expect(mapError({ status: 400, message: 'Invalid login credentials' }, 'signIn')).toEqual({ ok: false, error: 'wrong_login' });
    expect(mapError({ status: 400, message: 'User not found' }, 'signIn')).toEqual({ ok: false, error: 'wrong_login' });
    expect(mapError({ status: 400, message: 'Email not confirmed', code: 'email_not_confirmed' }, 'signIn')).toEqual({ ok: false, error: 'not_confirmed' });
    expect(mapError({ status: 429, message: 'Too many requests' }, 'signIn')).toEqual({ ok: false, error: 'rate_limited' });
    expect(mapError({ message: 'Failed to fetch' }, 'signIn')).toEqual({ ok: false, error: 'network' });
    expect(mapError({ message: 'Token has expired or is invalid' }, 'code')).toEqual({ ok: false, error: 'wrong_code' });
    expect(mapError({ message: 'Password should be at least 8 characters', code: 'weak_password' })).toEqual({ ok: false, error: 'weak_password' });
  });
});

describe('remember me', () => {
  it('ON keeps the session in localStorage (signed in next time)', () => {
    const local = memoryStorage();
    const session = memoryStorage({ 'sb-x-auth-token': 'old' });
    const storage = rememberStorage(() => true, local, session);
    storage.setItem('sb-x-auth-token', 'token');
    expect(local.getItem('sb-x-auth-token')).toBe('token');
    expect(session.getItem('sb-x-auth-token')).toBeNull();
    expect(storage.getItem('sb-x-auth-token')).toBe('token');
  });

  it('OFF keeps it in sessionStorage only (closing the app signs out)', () => {
    const local = memoryStorage({ 'sb-x-auth-token': 'old' });
    const session = memoryStorage();
    const storage = rememberStorage(() => false, local, session);
    storage.setItem('sb-x-auth-token', 'token');
    expect(session.getItem('sb-x-auth-token')).toBe('token');
    expect(local.getItem('sb-x-auth-token')).toBeNull();
    // A new app session: sessionStorage is empty → nobody is signed in.
    expect(rememberStorage(() => false, local, memoryStorage()).getItem('sb-x-auth-token')).toBeNull();
    storage.removeItem('sb-x-auth-token');
    expect(session.getItem('sb-x-auth-token')).toBeNull();
  });

  it('changing the choice while signed in moves the session (and only the library keys)', () => {
    const local = memoryStorage({ 'sb-x-auth-token': 'token', 'salon.save': '{}' });
    const session = memoryStorage();
    moveSession(false, local, session);
    expect(session.getItem('sb-x-auth-token')).toBe('token');
    expect(local.getItem('sb-x-auth-token')).toBeNull();
    expect(local.getItem('salon.save')).toBe('{}');
    moveSession(true, local, session);
    expect(local.getItem('sb-x-auth-token')).toBe('token');
    expect(session.length).toBe(0);
  });
});

describe('keeping the device and the cloud together', () => {
  it('decides quietly when only one side changed, and asks when both did', () => {
    const local = { fingerprint: 'L', appointments: 3 };
    expect(decideSync(local, null, '')).toBe('upload');
    expect(decideSync(local, { fingerprint: 'L' }, '')).toBe('same');
    expect(decideSync({ fingerprint: 'L', appointments: 0 }, { fingerprint: 'C' }, '')).toBe('download');
    expect(decideSync(local, { fingerprint: 'C' }, 'L')).toBe('download');
    expect(decideSync(local, { fingerprint: 'C' }, 'C')).toBe('upload');
    expect(decideSync(local, { fingerprint: 'C' }, 'X')).toBe('ask');
  });

  it('fingerprints the progress, not the code (codes carry their date)', async () => {
    const data = progress(2);
    expect(await makeBackup(data, new Date(1))).not.toBe(await makeBackup(data, new Date(2)));
    expect(await fingerprint(data)).toBe(await fingerprint({ ...data }));
    expect(await fingerprint(data)).not.toBe(await fingerprint(progress(3)));
  });

  it('uploads after a quiet moment, once, and skips unchanged progress', async () => {
    const fake = fakeCloud();
    const save = vi.spyOn(fake.cloud, 'save');
    let synced = '';
    let fp = 'a';
    const queued: (() => void)[] = [];
    const uploader = createUploader(
      { cloud: fake.cloud, userId: () => 'u1', snapshot: async () => ({ code: `code-${fp}`, fingerprint: fp }), synced: () => synced, onSynced: (f) => (synced = f) },
      { set: (fn, ms) => (expect(ms).toBe(ACCOUNT_CONFIG.syncDebounceMs), queued.push(fn)), clear: () => queued.splice(0) },
    );
    uploader.schedule();
    uploader.schedule();
    expect(queued).toHaveLength(1);
    expect(await uploader.flush()).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    expect(synced).toBe('a');
    expect(await uploader.flush()).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    fp = 'b';
    await uploader.flush();
    expect(save).toHaveBeenCalledTimes(2);
  });
});

describe('the account on a device', () => {
  it('sign-up confirms the email with a code; the first sign-in uploads this phone', async () => {
    const fake = fakeCloud();
    const phone = device(progress(2));
    const account = phone.make(fake.cloud);
    expect((await account.signUp('lan@example.com', 'polish123')).ok).toBe(true);
    expect((await account.confirmSignUp('lan@example.com', '000000'))).toEqual({ ok: false, error: 'wrong_code' });
    await account.resendSignUpCode('lan@example.com');
    const result = await account.confirmSignUp('lan@example.com', fake.lastCode('lan@example.com', 'signup')!);
    expect(result).toEqual({ ok: true, value: { kind: 'ok' } });
    expect(account.user?.email).toBe('lan@example.com');
    expect(phone.memory.email).toBe('lan@example.com');
    expect(fake.saves.get(account.user!.id)?.data).toMatch(/^SB1-/);
    expect(phone.memory.synced).toBe(await fingerprint(progress(2)));
  });

  it('wrong password and unknown email get the same answer; unconfirmed is told to confirm', async () => {
    const fake = fakeCloud();
    await signedUp(fake);
    const account = device({}).make(fake.cloud);
    expect(await account.signIn('lan@example.com', 'wrongpass')).toEqual({ ok: false, error: 'wrong_login' });
    expect(await account.signIn('nobody@example.com', 'polish123')).toEqual({ ok: false, error: 'wrong_login' });
    expect(account.user).toBeNull();
    await fake.cloud.signUp('new@example.com', 'polish123');
    expect(await account.signIn('new@example.com', 'polish123')).toEqual({ ok: false, error: 'not_confirmed' });
  });

  it('continue anywhere: a new phone signs in and gets the progress', async () => {
    const fake = fakeCloud();
    const first = device(progress(5, 77));
    const a = first.make(fake.cloud);
    await a.signUp('lan@example.com', 'polish123');
    await a.confirmSignUp('lan@example.com', fake.lastCode('lan@example.com', 'signup')!);
    await fake.cloud.signOut();
    const second = device({ 'salon.helpLanguage': 'full' });
    const b = second.make(fake.cloud);
    expect(await b.signIn('lan@example.com', 'polish123')).toEqual({ ok: true, value: { kind: 'ok' } });
    expect(JSON.parse(second.storage.getItem('salon.save')!).wallet).toBe(77);
    expect(second.reload).toHaveBeenCalledTimes(1);
  });

  it('a remembered phone picks up newer progress at start, and uploads its own when only it changed', async () => {
    const fake = fakeCloud();
    const phone = device(progress(3));
    const account = phone.make(fake.cloud);
    await account.signUp('lan@example.com', 'polish123');
    await account.confirmSignUp('lan@example.com', fake.lastCode('lan@example.com', 'signup')!);
    const id = account.user!.id;
    // Played elsewhere: the cloud moved on, this phone did not.
    fake.saves.set(id, { data: await makeBackup(progress(9)), version: 1, updatedAt: '' });
    expect(await account.start()).toEqual({ kind: 'ok' });
    expect(JSON.parse(phone.storage.getItem('salon.save')!).appointments).toBe(9);
    // Now only this phone moves on.
    phone.storage.setItem('salon.save', progress(10)['salon.save']!);
    expect(await account.start()).toEqual({ kind: 'ok' });
    const uploaded = await readBackup(fake.saves.get(id)!.data);
    expect(uploaded.ok && JSON.parse(uploaded.contents.data['salon.save']!).appointments).toBe(10);
    expect(phone.memory.synced).toBe(await fingerprint(progress(10)));
  });

  it('both changed: the player chooses which progress to keep', async () => {
    const fake = fakeCloud();
    await signedUp(fake);
    const id = fake.users.get('lan@example.com')!.id;
    fake.saves.set(id, { data: await makeBackup(progress(8, 50)), version: 1, updatedAt: '' });
    const phone = device(progress(4, 20));
    const account = phone.make(fake.cloud);
    const result = await account.signIn('lan@example.com', 'polish123');
    if (!result.ok || result.value.kind !== 'ask') throw new Error('expected a choice');
    expect(result.value.device).toMatchObject({ appointments: 4, xp: 100, tips: 20 });
    expect(result.value.cloud).toMatchObject({ appointments: 8, xp: 200, tips: 40 });
    expect(phone.reload).not.toHaveBeenCalled();
    expect(await result.value.keepDevice()).toBe(true);
    expect(phone.memory.synced).toBe(await fingerprint(progress(4, 20)));
    // The other choice replaces this phone's progress with the account's.
    result.value.keepCloud();
    expect(JSON.parse(phone.storage.getItem('salon.save')!).wallet).toBe(50);
    expect(phone.reload).toHaveBeenCalledTimes(1);
  });

  it('forgot password: a recovery code, a new password, signed in', async () => {
    const fake = fakeCloud();
    await signedUp(fake);
    const account = device(progress(1)).make(fake.cloud);
    await account.sendRecoveryCode('lan@example.com');
    expect(await account.resetPassword('lan@example.com', '999999', 'newpolish1')).toEqual({ ok: false, error: 'wrong_code' });
    expect((await account.resetPassword('lan@example.com', fake.lastCode('lan@example.com', 'recovery')!, 'newpolish1')).ok).toBe(true);
    expect(account.user?.email).toBe('lan@example.com');
    await account.signOut();
    expect((await account.signIn('lan@example.com', 'newpolish1')).ok).toBe(true);
  });

  it('signing out uploads first; deleting the account forgets it and keeps this phone\'s progress', async () => {
    const fake = fakeCloud();
    await signedUp(fake);
    const phone = device(progress(2));
    const account = phone.make(fake.cloud);
    await account.signIn('lan@example.com', 'polish123');
    phone.storage.setItem('salon.save', progress(3)['salon.save']!);
    await account.signOut();
    expect(account.user).toBeNull();
    expect(fake.saves.size).toBe(1);
    await account.signIn('lan@example.com', 'polish123');
    expect(await account.deleteAccount()).toEqual({ ok: true, value: null });
    expect(account.user).toBeNull();
    expect(phone.memory.email).toBe('');
    expect(fake.saves.size).toBe(0);
    expect(fake.users.size).toBe(0);
    expect(JSON.parse(phone.storage.getItem('salon.save')!).appointments).toBe(3);
  });

  it('remember me is saved before signing in and moves the session while signed in', async () => {
    const fake = fakeCloud();
    await signedUp(fake);
    const phone = device(progress(1));
    const account = phone.make(fake.cloud);
    account.setRemember(false);
    expect(phone.memory.remember).toBe(false);
    await account.signIn('lan@example.com', 'polish123');
    phone.session.setItem('sb-x-auth-token', 'token');
    account.setRemember(true);
    expect(phone.storage.getItem('sb-x-auth-token')).toBe('token');
    expect(phone.session.getItem('sb-x-auth-token')).toBeNull();
  });
});
