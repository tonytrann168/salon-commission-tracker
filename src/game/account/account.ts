import { applyBackup, collect, makeBackup, readBackup } from '../backup';
import type { BackupContents } from '../backup';
import { cloudConfigured, createSupabaseCloud, moveSession } from './cloud';
import type { Cloud, CloudError, CloudResult, CloudUser } from './cloud';
import { createUploader, decideSync, fingerprint, loadAccountMemory, progressSummary, saveAccountMemory } from './sync';
import type { AccountMemory, ProgressSummary, Snapshot, Uploader } from './sync';

/**
 * Story 025: the player's account on this device. Optional: the game works the same signed out. Signed in, progress
 * is uploaded after changes and at the end of each appointment; at sign-in and at each start the device and the cloud
 * are matched (decideSync), and when both changed the player chooses which to keep. Nothing is overwritten silently.
 */

type StorageLike = Storage;

/** The outcome of matching this device with the cloud. */
export type SyncOutcome =
  | { kind: 'ok' }
  | { kind: 'error'; error: CloudError }
  | { kind: 'ask'; device: ProgressSummary; cloud: ProgressSummary; keepCloud: () => void; keepDevice: () => Promise<boolean> };

export interface Account {
  readonly user: CloudUser | null;
  memory(): AccountMemory;
  /** Remember me: saved before signing in; while signed in the session moves to the chosen storage. */
  setRemember(remember: boolean): void;
  markNudged(): void;
  /** On boot: a remembered session → match with the cloud. */
  start(): Promise<SyncOutcome>;
  signUp(email: string, password: string): Promise<CloudResult<null>>;
  confirmSignUp(email: string, code: string): Promise<CloudResult<SyncOutcome>>;
  resendSignUpCode(email: string): Promise<CloudResult<null>>;
  signIn(email: string, password: string): Promise<CloudResult<SyncOutcome>>;
  sendRecoveryCode(email: string): Promise<CloudResult<null>>;
  resetPassword(email: string, code: string, password: string): Promise<CloudResult<SyncOutcome>>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<CloudResult<null>>;
  /** A game key changed: upload soon. */
  changed(): void;
  /** An appointment ended: upload now. */
  appointmentDone(): Promise<boolean>;
  onChange(listener: () => void): () => void;
}

export interface AccountDeps {
  cloud: Cloud;
  storage: StorageLike;
  sessionStorage?: StorageLike;
  load?: () => AccountMemory;
  save?: (memory: AccountMemory) => void;
  /** After the cloud's progress replaced this device's (the game rereads everything). */
  reload?: () => void;
  now?: () => Date;
  timers?: Parameters<typeof createUploader>[1];
}

export function createAccount(deps: AccountDeps): Account {
  const load = deps.load ?? loadAccountMemory;
  const save = deps.save ?? saveAccountMemory;
  const reload = deps.reload ?? (() => window.location.reload());
  const now = deps.now ?? (() => new Date());
  const update = (change: Partial<AccountMemory>): void => save({ ...load(), ...change });
  let user: CloudUser | null = null;
  const listeners = new Set<() => void>();
  const notify = (): void => listeners.forEach((l) => l());

  const snapshot = async (): Promise<Snapshot & { data: Record<string, string> }> => {
    const data = collect(deps.storage);
    return { data, code: await makeBackup(data, now()), fingerprint: await fingerprint(data) };
  };
  const uploader: Uploader = createUploader(
    { cloud: deps.cloud, userId: () => user?.id ?? null, snapshot, synced: () => load().synced, onSynced: (synced) => update({ synced }) },
    deps.timers,
  );
  const useCloud = (contents: BackupContents, synced: string): void => {
    applyBackup(deps.storage, contents);
    update({ synced });
    reload();
  };

  const match = async (): Promise<SyncOutcome> => {
    if (!user) return { kind: 'ok' };
    const loaded = await deps.cloud.load(user.id);
    if (!loaded.ok) return { kind: 'error', error: loaded.error };
    const local = await snapshot();
    let cloud: { contents: BackupContents; fingerprint: string } | null = null;
    if (loaded.value) {
      const read = await readBackup(loaded.value.data);
      // A cloud save this version can't read is treated as none (the device's progress is uploaded over it).
      if (read.ok) cloud = { contents: read.contents, fingerprint: await fingerprint(read.contents.data) };
    }
    const device = progressSummary({ v: 1, at: now().toISOString(), data: local.data });
    const choice = decideSync({ fingerprint: local.fingerprint, appointments: device.appointments }, cloud, load().synced);
    if (choice === 'same') {
      update({ synced: local.fingerprint });
      return { kind: 'ok' };
    }
    if (choice === 'upload' || !cloud) {
      const ok = await uploader.flush();
      return ok ? { kind: 'ok' } : { kind: 'error', error: 'network' };
    }
    const found = cloud;
    if (choice === 'download') {
      useCloud(found.contents, found.fingerprint);
      return { kind: 'ok' };
    }
    return {
      kind: 'ask',
      device,
      cloud: progressSummary(found.contents),
      keepCloud: () => useCloud(found.contents, found.fingerprint),
      keepDevice: async () => {
        // Keep this device: upload it even though the cloud differs.
        update({ synced: '' });
        return uploader.flush();
      },
    };
  };

  const signedIn = async (result: CloudResult<CloudUser>, email: string): Promise<CloudResult<SyncOutcome>> => {
    if (!result.ok) return result;
    user = result.value;
    update({ email: result.value.email || email });
    notify();
    return { ok: true, value: await match() };
  };

  return {
    get user() {
      return user;
    },
    memory: load,
    setRemember(remember) {
      update({ remember });
      if (user && deps.sessionStorage) moveSession(remember, deps.storage, deps.sessionStorage);
    },
    markNudged: () => update({ nudged: true }),
    async start() {
      user = await deps.cloud.currentUser().catch(() => null);
      notify();
      return match().catch((): SyncOutcome => ({ kind: 'error', error: 'network' }));
    },
    signUp: (email, password) => deps.cloud.signUp(email.trim(), password),
    confirmSignUp: async (email, code) => signedIn(await deps.cloud.confirmSignUp(email.trim(), code.trim()), email.trim()),
    resendSignUpCode: (email) => deps.cloud.resendSignUpCode(email.trim()),
    signIn: async (email, password) => signedIn(await deps.cloud.signIn(email.trim(), password), email.trim()),
    sendRecoveryCode: (email) => deps.cloud.sendRecoveryCode(email.trim()),
    resetPassword: async (email, code, password) => signedIn(await deps.cloud.resetPassword(email.trim(), code.trim(), password), email.trim()),
    async signOut() {
      await uploader.flush();
      uploader.cancel();
      await deps.cloud.signOut();
      user = null;
      update({ synced: '' });
      notify();
    },
    async deleteAccount() {
      uploader.cancel();
      const result = await deps.cloud.deleteAccount();
      if (result.ok) {
        user = null;
        update({ synced: '', email: '' });
        notify();
      }
      return result;
    },
    changed: () => uploader.schedule(),
    appointmentDone: () => uploader.flush(),
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

let shared: Account | null | undefined;

/** The device's account, or null when accounts are off (no Supabase settings in this build). */
export function getAccount(): Account | null {
  if (shared !== undefined) return shared;
  const env = import.meta.env as unknown as Record<string, string>;
  shared = cloudConfigured(env)
    ? createAccount({ cloud: createSupabaseCloud(env.VITE_SUPABASE_URL as string, env.VITE_SUPABASE_ANON_KEY as string, () => loadAccountMemory().remember), storage: localStorage, sessionStorage })
    : null;
  return shared;
}

/** Evidence and tests only (dev builds): use a stand-in cloud. */
export function useCloudForTesting(cloud: Cloud | null): Account | null {
  shared = cloud ? createAccount({ cloud, storage: localStorage, sessionStorage }) : null;
  return shared;
}
