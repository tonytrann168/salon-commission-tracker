/**
 * Save backup & transfer (story 020): everything the game keeps on this device (localStorage keys starting with
 * "salon.") packed into one code the player can copy or save, and restore on another device or in the home-screen app
 * (iPhone keeps Safari and the installed app separate). Format: "SB1-<checksum>-<data>", where data is deflated JSON in
 * base64url and the checksum is the first 12 hex digits of its SHA-256. No secrets: the invite cookie is not in
 * localStorage. Pure apart from the Web Streams/Crypto APIs (also in Node, for tests).
 */

export const BACKUP_PREFIX = 'SB1';
export const BACKUP_KEY_PREFIX = 'salon.';
/** Keys never backed up (per-device or per-session). */
const SKIPPED = new Set(['salon.reloadedForUpdate', 'salon.maiSide']);
const MAX_CODE_CHARS = 400_000;
const MAX_VALUE_CHARS = 200_000;

export interface BackupContents {
  v: 1;
  /** When it was made (ISO). */
  at: string;
  data: Record<string, string>;
}

export type BackupProblem = 'format' | 'version' | 'checksum' | 'contents';

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (text: string): Uint8Array => {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([new Uint8Array(bytes).buffer]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

async function checksum(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
}

/** Which stored keys belong in a backup. */
export const isBackedUp = (key: string): boolean => key.startsWith(BACKUP_KEY_PREFIX) && !SKIPPED.has(key) && key.length <= 60;

/** Collect the game's keys from a Storage-like object. */
export function collect(storage: { length: number; key(i: number): string | null; getItem(key: string): string | null }): Record<string, string> {
  const data: Record<string, string> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && isBackedUp(key)) {
      const value = storage.getItem(key);
      if (value !== null) data[key] = value;
    }
  }
  return data;
}

export async function makeBackup(data: Record<string, string>, now: Date = new Date()): Promise<string> {
  const contents: BackupContents = { v: 1, at: now.toISOString(), data: Object.fromEntries(Object.entries(data).filter(([key]) => isBackedUp(key)).sort(([a], [b]) => a.localeCompare(b))) };
  const packed = toBase64Url(await pipe(new TextEncoder().encode(JSON.stringify(contents)), new CompressionStream('deflate-raw')));
  return `${BACKUP_PREFIX}-${await checksum(packed)}-${packed}`;
}

/** Read a code (spaces and line breaks from copying are ignored). Nothing is changed here. */
export async function readBackup(raw: string): Promise<{ ok: true; contents: BackupContents } | { ok: false; problem: BackupProblem }> {
  const code = raw.replace(/\s+/g, '');
  if (code.length > MAX_CODE_CHARS) return { ok: false, problem: 'format' };
  const match = /^SB(\d+)-([0-9a-f]{12})-([A-Za-z0-9_-]+)$/.exec(code);
  if (!match) return { ok: false, problem: 'format' };
  if (`SB${match[1]}` !== BACKUP_PREFIX) return { ok: false, problem: 'version' };
  const [, , sum, packed] = match as unknown as [string, string, string, string];
  if ((await checksum(packed)) !== sum) return { ok: false, problem: 'checksum' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(await pipe(fromBase64Url(packed), new DecompressionStream('deflate-raw'))));
  } catch {
    return { ok: false, problem: 'contents' };
  }
  const c = parsed as Partial<BackupContents> | null;
  if (!c || c.v !== 1 || typeof c.at !== 'string' || typeof c.data !== 'object' || c.data === null || Array.isArray(c.data)) return { ok: false, problem: c && c.v !== 1 ? 'version' : 'contents' };
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(c.data)) {
    // Only the game's own keys, only text: a code can never write anything else.
    if (!isBackedUp(key) || typeof value !== 'string' || value.length > MAX_VALUE_CHARS) return { ok: false, problem: 'contents' };
    data[key] = value;
  }
  return { ok: true, contents: { v: 1, at: c.at, data } };
}

/** What a backup holds, for the confirm step (from the save and companion keys, if present). */
export function summarize(contents: BackupContents): { appointments: number; companion: string | null; phrases: number; at: string } {
  const json = (key: string): Record<string, unknown> | unknown[] | null => {
    try {
      return JSON.parse(contents.data[key] ?? 'null') as Record<string, unknown> | unknown[] | null;
    } catch {
      return null;
    }
  };
  const save = json('salon.save') as Record<string, unknown> | null;
  const companion = json('salon.companion.v1') as Record<string, unknown> | null;
  const phrases = json('salon.phrasebook.v1');
  return {
    appointments: typeof save?.appointments === 'number' ? save.appointments : 0,
    companion: typeof companion?.name === 'string' ? companion.name : null,
    phrases: Array.isArray(phrases) ? phrases.length : Array.isArray((phrases as Record<string, unknown> | null)?.entries) ? ((phrases as { entries: unknown[] }).entries.length) : 0,
    at: contents.at,
  };
}

/** Replace the game's keys in storage with the backup's (other sites' or non-game keys are untouched). */
export function applyBackup(storage: { length: number; key(i: number): string | null; removeItem(key: string): void; setItem(key: string, value: string): void }, contents: BackupContents): void {
  const old: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && isBackedUp(key)) old.push(key);
  }
  old.forEach((key) => storage.removeItem(key));
  for (const [key, value] of Object.entries(contents.data)) storage.setItem(key, value);
}
