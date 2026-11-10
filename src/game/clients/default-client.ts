import { getClient } from './roster';
import type { ClientPersona } from '../types';

/** The first client (story 001): Dana, now a roster file (dana.json, story 006). Used when no client was chosen. */
export const DEFAULT_CLIENT: ClientPersona = getClient('dana') as ClientPersona;
