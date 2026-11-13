import type { BackupContents } from '../backup';
import { readStored, writeStored } from '../safe-storage';
import accountJson from '../config/account.json';
import type { Cloud } from './cloud';

/**
 * Story 025: keeping the local save and the cloud save together, local-first. Signed in, changes are uploaded after a
 * short quiet time (debounced) and at the end of each appointment. On sign-in: no cloud save → upload; this device
 * empty → use the cloud; both have progress and differ → the player chooses. Never overwrites silently.
 */

export const SAVE_VERSION = 1;
export const ACCOUNT_CONFIG = accountJson as { minPassword: number; resendSeconds: number; syncDebounceMs: number; nudgeAfterAppointments: number };
export const SYNC_DEBOUNCE_MS = ACCOUNT_CONFIG.syncDebounceMs;

/** What the device remembers about the account (not backed up; the library keeps the session itself). */
export interface AccountMemory {
  /** The email last used to sign in on this device (shown masked as a hint). */
  email: string;
  /** The companion's "sign in so you never lose me" suggestion was shown. */
  nudged: boolean;
  /** "Remember me" (default on): keep the session on this device. */
  remember: boolean;
  /** Fingerprint of the progress last matched with the cloud (uploaded or downloaded) on this device. */
  synced: string;
}

const KEY = 'salon.account.v1';
export const loadAccountMemory = (): AccountMemory => {
  try {
    const d = JSON.parse(readStored(KEY) ?? 'null') as Partial<AccountMemory> | null;
    return { email: typeof d?.email === 'string' ? d.email : '', nudged: d?.nudged === true, remember: d?.remember !== false, synced: typeof d?.synced === 'string' ? d.synced : '' };
  } catch {
    return { email: '', nudged: false, remember: true, synced: '' };
  }
};
export const saveAccountMemory = (memory: AccountMemory): void => writeStored(KEY, JSON.stringify(memory));

/** t***@gmail.com: enough to recognise, not enough to reveal. */
export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) return '';
  return `${name.slice(0, 1)}${'*'.repeat(Math.min(3, Math.max(1, name.length - 1)))}@${domain}`;
}

export const isEmail = (text: string): boolean => /^[^\s@]{1,64}@[^\s@]{1,255}\.[a-z]{2,}$/i.test(text.trim());
export const isCode = (text: string): boolean => /^\d{6}$/.test(text.trim());
export const isPassword = (text: string): boolean => text.length >= ACCOUNT_CONFIG.minPassword;

/** The same progress gives the same fingerprint (backup codes differ every time: they carry their date). */
export async function fingerprint(data: Record<string, string>): Promise<string> {
  const text = JSON.stringify(Object.entries(data).sort(([a], [b]) => a.localeCompare(b)));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

export type SyncChoice = 'upload' | 'download' | 'same' | 'ask';

/**
 * What to do when signed in (at sign-in and at each start), from this device's progress, the cloud's, and what was
 * last matched on this device. Only one side changed since → that side wins quietly; both changed → the player chooses.
 */
export function decideSync(local: { fingerprint: string; appointments: number }, cloud: { fingerprint: string } | null, synced: string): SyncChoice {
  if (!cloud) return 'upload';
  if (cloud.fingerprint === local.fingerprint) return 'same';
  if (local.appointments === 0 || local.fingerprint === synced) return 'download';
  if (cloud.fingerprint === synced) return 'upload';
  return 'ask';
}

/** The progress summary shown in the "keep which?" choice. */
export interface ProgressSummary {
  appointments: number;
  xp: number;
  tips: number;
  at: string;
}
export function progressSummary(contents: BackupContents): ProgressSummary {
  let save: Record<string, unknown> = {};
  try {
    save = JSON.parse(contents.data['salon.save'] ?? '{}') as Record<string, unknown>;
  } catch {
    save = {};
  }
  const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return { appointments: n(save.appointments), xp: n(save.xp), tips: n(save.tipsEarned), at: contents.at };
}

export interface Snapshot {
  code: string;
  fingerprint: string;
}

export interface Uploader {
  /** Something changed: upload after SYNC_DEBOUNCE_MS of quiet. */
  schedule(): void;
  /** Upload now (end of an appointment, or before signing out). Resolves true when the cloud matches this device. */
  flush(): Promise<boolean>;
  cancel(): void;
}

/** A debounced uploader for the signed-in player. Unchanged progress (same fingerprint as last synced) is not sent. */
export function createUploader(
  deps: { cloud: Cloud; userId: () => string | null; snapshot: () => Promise<Snapshot>; synced: () => string; onSynced: (fingerprint: string) => void },
  timers: { set: (fn: () => void, ms: number) => unknown; clear: (id: unknown) => void } = { set: (fn, ms) => setTimeout(fn, ms), clear: (id) => clearTimeout(id as ReturnType<typeof setTimeout>) },
): Uploader {
  let pending: unknown = null;
  const run = async (): Promise<boolean> => {
    pending = null;
    const id = deps.userId();
    if (!id) return false;
    const snap = await deps.snapshot();
    if (snap.fingerprint === deps.synced()) return true;
    const result = await deps.cloud.save(id, snap.code, SAVE_VERSION);
    if (result.ok) deps.onSynced(snap.fingerprint);
    return result.ok;
  };
  return {
    schedule() {
      if (!deps.userId()) return;
      if (pending !== null) timers.clear(pending);
      pending = timers.set(() => void run().catch(() => false), SYNC_DEBOUNCE_MS);
    },
    async flush() {
      if (pending !== null) timers.clear(pending);
      return run().catch(() => false);
    },
    cancel() {
      if (pending !== null) timers.clear(pending);
      pending = null;
    },
  };
}
