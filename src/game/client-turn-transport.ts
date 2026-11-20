import type { MenuItem } from './menu';
import { TurnError, networkError } from './types';
import type { ClientTurn, EnglishLevel, TakeTurn, TurnErrorCode } from './types';

const ENDPOINT = '/api/client-turn';
const TIMEOUT_MS = 30_000;

/** Browser transport: posts the turn and the player's current English level to the server function. The API key never reaches the browser. */
/** `getNails` (story 005): a one-line description of the nails for the client, or undefined before the service. */
/** `scenario` (story 019): the situation and, for a returning client, the visit facts. */
/** `menu` (story 044): the salon menu and her order numbers, so she orders by number. */
/** `flags` (story 068): read each turn: she brought a picture; the player is stuck (asked once, then cleared). */
export function createFetchTransport(getLevel: () => EnglishLevel, getNails: () => string | undefined = () => undefined, clientId?: string, scenario?: { scenarioId: string; visits?: { visits: number; lastStars: number; lastDay: string } }, menu?: { items: MenuItem[]; order: number[] }, flags?: { picture: boolean; pickNext: boolean }): TakeTurn {
  const takeStuck = (): boolean => {
    const stuck = flags?.pickNext ?? false;
    if (flags) flags.pickNext = false;
    return stuck;
  };
  return async (transcript, phase, mood) => {
    let response: Response;
    let body: unknown;
    try {
      response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ transcript, phase, mood, level: getLevel(), ...(getNails() ? { nails: getNails() } : {}), ...(clientId ? { clientId } : {}), ...(scenario ?? {}), ...(menu ? { menu } : {}), ...(flags?.picture ? { picture: true } : {}), ...(takeStuck() ? { stuck: true } : {}) }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      body = await response.json();
    } catch (error) {
      throw networkError(error);
    }
    if (!response.ok) {
      const error = (body as { error?: { code?: TurnErrorCode; message?: string } } | null)?.error;
      throw new TurnError(error?.code ?? 'unknown', error?.message ?? `Server returned ${response.status}.`);
    }
    return body as ClientTurn;
  };
}
