import { NAIL_ART_CONFIG } from './design';
import type { NailArtConfig, NailDesign, NailRequest } from './design';
import { matchDesign } from './match';

/**
 * Story 049: the station's steps, in order (1 Shape → 2 Colour → 3 Art (optional) → Done; story 051 adds Length after
 * Shape), and whether each one already matches her order. Pure.
 */

export type StationStep = 'shape' | 'colour' | 'art';
export const STATION_STEPS: StationStep[] = ['shape', 'colour', 'art'];
/** Steps she may not need: Art only when she asked for gems, stickers or a gradient. */
export const OPTIONAL_STEPS: StationStep[] = ['art'];

/** Each step's ✓: shape = one of her shapes; colour = one of her colours, every nail fully painted; art = the extras she asked for. */
export function stepChecks(design: NailDesign, request: NailRequest, config: NailArtConfig = NAIL_ART_CONFIG): Record<StationStep, boolean> {
  const { parts } = matchDesign(design, request, config);
  return { shape: parts.shape === 100, colour: parts.color === 100 && parts.coverage === 100, art: parts.extras === 100 };
}

/** Whether she asked for anything on the Art step (otherwise it is marked optional and needs nothing). */
export const wantsArt = (request: NailRequest): boolean => request.gems !== 'none' || request.stickers !== 'none' || request.gradient === 'yes';
