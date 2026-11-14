import { TurnError, networkError } from './types';
import type { GradeAppointment, Grading, TurnErrorCode } from './types';

const ENDPOINT = '/api/grade-appointment';
const TIMEOUT_MS = 60_000;

/** Browser transport: posts the finished appointment to the grading server function. The API key never reaches the browser. */
export function createGradeTransport(): GradeAppointment {
  return async (request) => {
    let response: Response;
    let body: unknown;
    try {
      response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request),
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
    return body as Grading;
  };
}
