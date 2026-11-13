/**
 * Story 025: the cloud behind player accounts, as a small interface so the game and the tests don't depend on the
 * library. The real one (createSupabaseCloud) uses supabase-js with the PUBLIC anon key only; each player can read and
 * write only their own row (row-level security, supabase/migrations/001_saves.sql). The library loads on first use.
 */

export interface CloudUser {
  id: string;
  email: string;
}

export interface CloudSave {
  /** The SB1 backup code (story 020). */
  data: string;
  version: number;
  updatedAt: string;
}

export type CloudError = 'invalid_email' | 'weak_password' | 'wrong_login' | 'not_confirmed' | 'wrong_code' | 'rate_limited' | 'network' | 'not_signed_in' | 'unknown';
export type CloudResult<T> = { ok: true; value: T } | { ok: false; error: CloudError };

/**
 * Email + password accounts (owner, 2026-11-13). Every email step uses a 6-digit CODE, not a link: links open Safari
 * instead of the home-screen app. Sign-up confirms the email with a code; "Forgot password?" sends a recovery code.
 */
export interface Cloud {
  /** Create the account; Supabase emails a 6-digit confirmation code. */
  signUp(email: string, password: string): Promise<CloudResult<null>>;
  confirmSignUp(email: string, code: string): Promise<CloudResult<CloudUser>>;
  resendSignUpCode(email: string): Promise<CloudResult<null>>;
  signIn(email: string, password: string): Promise<CloudResult<CloudUser>>;
  /** Forgot password: email a 6-digit recovery code (also "Send a new code"). */
  sendRecoveryCode(email: string): Promise<CloudResult<null>>;
  /** Recovery code → signed in → the new password is set. */
  resetPassword(email: string, code: string, newPassword: string): Promise<CloudResult<CloudUser>>;
  /** The signed-in player on this device, if any (the session is kept by the library). */
  currentUser(): Promise<CloudUser | null>;
  signOut(): Promise<void>;
  /** This player's cloud save, or null. */
  load(userId: string): Promise<CloudResult<CloudSave | null>>;
  save(userId: string, data: string, version: number): Promise<CloudResult<CloudSave>>;
  /** Delete the account and its save (server function, own account only). */
  deleteAccount(): Promise<CloudResult<null>>;
}


/** Account features are on only when the project's public URL and anon key are set at build time. */
export const cloudConfigured = (env: Record<string, unknown> = import.meta.env as unknown as Record<string, unknown>): boolean =>
  typeof env.VITE_SUPABASE_URL === 'string' && /^https:\/\//.test(env.VITE_SUPABASE_URL) && typeof env.VITE_SUPABASE_ANON_KEY === 'string' && env.VITE_SUPABASE_ANON_KEY.length > 20;

/**
 * Map library errors to friendly kinds. Sign-in failures never say whether the email exists: "wrong_login" for both.
 */
export function mapError(error: { status?: number; message?: string; code?: string } | null | undefined, step: 'signIn' | 'code' | 'other' = 'other'): CloudResult<never> {
  const message = error?.message ?? '';
  const code = error?.code ?? '';
  if (error?.status === 429 || /rate limit|too many|over_email_send_rate_limit|over_request_rate_limit/i.test(`${message} ${code}`)) return { ok: false, error: 'rate_limited' };
  if (/failed to fetch|network|load failed/i.test(message)) return { ok: false, error: 'network' };
  if (/email not confirmed|email_not_confirmed/i.test(`${message} ${code}`)) return { ok: false, error: 'not_confirmed' };
  if (step === 'signIn') return { ok: false, error: 'wrong_login' };
  if (/weak_password|password should be/i.test(`${message} ${code}`)) return { ok: false, error: 'weak_password' };
  if (/invalid.*email|email_address_invalid/i.test(`${message} ${code}`)) return { ok: false, error: 'invalid_email' };
  if (step === 'code' || /token|otp|expired/i.test(message)) return { ok: false, error: 'wrong_code' };
  return { ok: false, error: 'unknown' };
}

/**
 * "Remember me" (owner): ON keeps the session in localStorage (signed in next time); OFF keeps it in sessionStorage
 * (closing the app signs out). The library is given this storage; changing the choice moves the session.
 */
export function rememberStorage(remember: () => boolean, local: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, session: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  return {
    getItem: (key) => (remember() ? local.getItem(key) : session.getItem(key)),
    setItem: (key, value) => {
      const [to, other] = remember() ? [local, session] : [session, local];
      to.setItem(key, value);
      other.removeItem(key);
    },
    removeItem: (key) => {
      local.removeItem(key);
      session.removeItem(key);
    },
  };
}

/** "Remember me" changed while signed in: move the library's session keys (sb-…) to the chosen storage. */
export function moveSession(remember: boolean, local: Storage, session: Storage): void {
  const [from, to] = remember ? [session, local] : [local, session];
  const keys: string[] = [];
  for (let i = 0; i < from.length; i++) {
    const key = from.key(i);
    if (key?.startsWith('sb-')) keys.push(key);
  }
  for (const key of keys) {
    const value = from.getItem(key);
    if (value !== null) to.setItem(key, value);
    from.removeItem(key);
  }
}

/** The real cloud: supabase-js, loaded on demand, with the public anon key only. */
export function createSupabaseCloud(url: string, anonKey: string, remember: () => boolean): Cloud {
  type Client = import('@supabase/supabase-js').SupabaseClient;
  let client: Promise<Client> | null = null;
  const get = (): Promise<Client> =>
    (client ??= import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storage: rememberStorage(remember, window.localStorage, window.sessionStorage) } }),
    ));
  const user = (u: { id: string; email?: string | null } | null | undefined): CloudUser | null => (u ? { id: u.id, email: u.email ?? '' } : null);
  const signedIn = (u: { id: string; email?: string | null } | null | undefined, error: unknown, step: 'signIn' | 'code'): CloudResult<CloudUser> => {
    const value = user(u);
    return error || !value ? mapError(error as { message?: string } | null, step) : { ok: true, value };
  };
  return {
    async signUp(email, password) {
      const { error } = await (await get()).auth.signUp({ email, password });
      return error ? mapError(error) : { ok: true, value: null };
    },
    async confirmSignUp(email, code) {
      const { data, error } = await (await get()).auth.verifyOtp({ email, token: code, type: 'signup' });
      return signedIn(data?.user, error, 'code');
    },
    async resendSignUpCode(email) {
      const { error } = await (await get()).auth.resend({ type: 'signup', email });
      return error ? mapError(error) : { ok: true, value: null };
    },
    async signIn(email, password) {
      const { data, error } = await (await get()).auth.signInWithPassword({ email, password });
      return signedIn(data?.user, error, 'signIn');
    },
    async sendRecoveryCode(email) {
      const { error } = await (await get()).auth.resetPasswordForEmail(email);
      return error ? mapError(error) : { ok: true, value: null };
    },
    async resetPassword(email, code, newPassword) {
      const c = await get();
      const verified = await c.auth.verifyOtp({ email, token: code, type: 'recovery' });
      if (verified.error || !verified.data?.user) return mapError(verified.error ?? { message: 'invalid' }, 'code');
      const { data, error } = await c.auth.updateUser({ password: newPassword });
      return signedIn(data?.user, error, 'code');
    },
    async currentUser() {
      const { data } = await (await get()).auth.getSession();
      return user(data.session?.user);
    },
    async signOut() {
      await (await get()).auth.signOut();
    },
    async load(userId) {
      const { data, error } = await (await get()).from('saves').select('data, version, updated_at').eq('user_id', userId).maybeSingle();
      if (error) return mapError(error);
      return { ok: true, value: data ? { data: data.data as string, version: data.version as number, updatedAt: data.updated_at as string } : null };
    },
    async save(userId, data, version) {
      const updatedAt = new Date().toISOString();
      const { error } = await (await get()).from('saves').upsert({ user_id: userId, data, version, updated_at: updatedAt });
      return error ? mapError(error) : { ok: true, value: { data, version, updatedAt } };
    },
    async deleteAccount() {
      const c = await get();
      const { error } = await c.rpc('delete_my_account');
      if (error) return mapError(error);
      await c.auth.signOut();
      return { ok: true, value: null };
    },
  };
}
