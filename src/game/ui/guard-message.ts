import { t } from '../i18n';
import { TurnError } from '../types';

/**
 * Friendly words for the hosted preview's guard (owner, 2026-11-10): over a limit or a daily cap, "Mai needs a rest,
 * come back tomorrow"; a lost invite cookie, "enter your code again". Null for any other error.
 */
export function guardMessage(error: unknown): string | null {
  if (!(error instanceof TurnError)) return null;
  if (error.code === 'daily_cap' || error.code === 'rate_limited') return t('guard.rest');
  if (error.code === 'unauthorized') return t('guard.signedOut');
  return null;
}
