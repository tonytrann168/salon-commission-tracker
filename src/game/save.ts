import { NEW_SAVE } from './progression';
import type { ProgressSave } from './progression';
import { readStored, writeStored } from './safe-storage';

/**
 * The progression save on this device (story 007): one versioned JSON record, so a cloud save can be added later
 * without changing its shape. A missing or damaged save never breaks the game: each field falls back on its own.
 */

export const SAVE_KEY = 'salon.save';
export const SAVE_VERSION = 1;

const whole = (value: unknown, fallback: number): number => (typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : fallback);
const day = (value: unknown): string => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '');
const ids = (value: unknown): string[] => (Array.isArray(value) ? [...new Set(value.filter((v): v is string => typeof v === 'string'))] : []);

/** Read a stored save. Unknown future versions are not guessed at: the player starts fresh rather than lose data silently. */
export function parseSave(raw: string | null): ProgressSave {
  if (raw === null) return { ...NEW_SAVE };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ...NEW_SAVE };
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return { ...NEW_SAVE };
  const d = data as Record<string, unknown>;
  if (d.version !== SAVE_VERSION) return { ...NEW_SAVE };
  const daily = typeof d.daily === 'object' && d.daily !== null ? (d.daily as Record<string, unknown>) : null;
  return {
    version: 1,
    wallet: whole(d.wallet, 0),
    tipsEarned: whole(d.tipsEarned, 0),
    xp: whole(d.xp, 0),
    appointments: whole(d.appointments, 0),
    owned: ids(d.owned),
    badges: ids(d.badges),
    daily: daily && day(daily.day) && typeof daily.clientId === 'string' ? { day: day(daily.day), clientId: daily.clientId } : null,
    dailyDoneDay: day(d.dailyDoneDay),
    streak: whole(d.streak, 0),
  };
}

export const loadSave = (): ProgressSave => parseSave(readStored(SAVE_KEY));

export function writeSave(save: ProgressSave): void {
  writeStored(SAVE_KEY, JSON.stringify(save));
}
