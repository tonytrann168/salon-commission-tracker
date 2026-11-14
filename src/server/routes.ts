import { handleBestie } from './handlers/bestie';
import { handleClientTurn } from './handlers/client-turn';
import { handleCorrections } from './handlers/corrections';
import { handleGradeAppointment } from './handlers/grade-appointment';
import { handleTranslate } from './handlers/translate';
import { handleFeedback } from './handlers/feedback';
import { handleClientError } from './handlers/client-error';
import { handleTts } from './handlers/tts';

/** The AI server functions by route name. Used by the Vite dev middleware and the hosted preview's one function. */
export type ApiHandler = (body: unknown, env: Record<string, string | undefined>, fetchImpl: typeof fetch) => Promise<{ status: number; body: unknown }>;

export const AI_ROUTES: Record<string, ApiHandler> = {
  'client-turn': handleClientTurn,
  'grade-appointment': handleGradeAppointment,
  translate: handleTranslate,
  bestie: handleBestie,
  corrections: handleCorrections,
};

/** Routes that are not AI calls (no AI budget). The hosted preview guards them separately; `tester` is the code id. */
export type PlainHandler = (body: unknown, meta: { tester?: string | null }, env: Record<string, string | undefined>, fetchImpl: typeof fetch) => Promise<{ status: number; body: unknown }>;
export const PLAIN_ROUTES: Record<string, PlainHandler> = {
  feedback: (body, meta, env, fetchImpl) => handleFeedback(body, meta, undefined, { env, fetchImpl }),
  // Story 032: client error reports (own limits on the hosted preview).
  'client-error': (body, meta, env, fetchImpl) => handleClientError(body, meta, undefined, { env, fetchImpl }),
  // Story 037: natural voices (Azure). Own limits on the hosted preview: a per-minute limit and daily character caps.
  tts: (body, _meta, env, fetchImpl) => handleTts(body, env, fetchImpl),
};
