import { handleBestie } from './handlers/bestie';
import { handleClientTurn } from './handlers/client-turn';
import { handleCorrections } from './handlers/corrections';
import { handleGradeAppointment } from './handlers/grade-appointment';
import { handleTranslate } from './handlers/translate';

/** The AI server functions by route name. Used by the Vite dev middleware and the hosted preview's one function. */
export type ApiHandler = (body: unknown, env: Record<string, string | undefined>, fetchImpl: typeof fetch) => Promise<{ status: number; body: unknown }>;

export const AI_ROUTES: Record<string, ApiHandler> = {
  'client-turn': handleClientTurn,
  'grade-appointment': handleGradeAppointment,
  translate: handleTranslate,
  bestie: handleBestie,
  corrections: handleCorrections,
};
