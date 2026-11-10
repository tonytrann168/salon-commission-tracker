import { TurnError } from './types';
import type { ClientTurn, EnglishLevel, TakeTurn, TurnErrorCode } from './types';

const ENDPOINT = '/api/client-turn';
const TIMEOUT_MS = 30_000;

/** Browser transport: posts the turn and the player's current English level to the server function. The API key never reaches the browser. */
/** `getNails` (story 005): a one-line description of the nails for the client, or undefined before the service. */
export function createFetchTransport(getLevel: () => EnglishLevel, getNails: () => string | undefined = () => undefined, clientId?: string): TakeTurn {
  return async (transcript, phase, mood) => {
    let response: Response;
    let body: unknown;
    try {
      response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ transcript, phase, mood, level: getLevel(), ...(getNails() ? { nails: getNails() } : {}), ...(clientId ? { clientId } : {}) }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      body = await response.json();
    } catch {
      throw new TurnError('network', 'Could not reach the server.');
    }
    if (!response.ok) {
      const error = (body as { error?: { code?: TurnErrorCode; message?: string } } | null)?.error;
      throw new TurnError(error?.code ?? 'unknown', error?.message ?? `Server returned ${response.status}.`);
    }
    return body as ClientTurn;
  };
}
