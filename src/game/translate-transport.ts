import { TurnError, networkError } from './types';
import type { Translate, TurnErrorCode } from './types';

const ENDPOINT = '/api/translate';
const TIMEOUT_MS = 20_000;

/** Browser transport: posts the text to the translate server function. The API key never reaches the browser. */
export function createTranslateTransport(): Translate {
  return async (text, direction, level, clientId) => {
    let response: Response;
    let body: unknown;
    try {
      response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, direction, ...(level === undefined ? {} : { level }), ...(clientId ? { clientId } : {}) }),
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
    return (body as { translation: string }).translation;
  };
}
