import comboJson from './config/combo.json';
import { pedicureRequest } from './nail-art/design';
import type { NailRequest } from './nail-art/design';

/**
 * Story 069b (owner playtest 5): a combo visit (mani + pedi). The hands first, then the feet (soak and scrub first),
 * then one checkout at the combo price. Pure; config: config/combo.json.
 */
export interface ComboConfig {
  moodShare: number;
  switchMs: number;
  feetLine: string;
  feetArt: boolean;
}

export function parseComboConfig(raw: unknown): ComboConfig {
  const c = (raw ?? {}) as Record<string, unknown>;
  const fail = (what: string): never => {
    throw new Error(`combo.json: ${what}`);
  };
  return {
    moodShare: typeof c.moodShare === 'number' && c.moodShare > 0 && c.moodShare <= 1 ? c.moodShare : fail('"moodShare" must be above 0 and at most 1'),
    switchMs: typeof c.switchMs === 'number' && c.switchMs >= 0 && c.switchMs <= 10_000 ? c.switchMs : fail('"switchMs" must be 0-10000'),
    feetLine: typeof c.feetLine === 'string' && c.feetLine.trim() ? c.feetLine : fail('"feetLine" must be text'),
    feetArt: typeof c.feetArt === 'boolean' ? c.feetArt : fail('"feetArt" must be true or false'),
  };
}

export const COMBO_CONFIG: ComboConfig = parseComboConfig(comboJson);

/** The two stages of a combo request (hands, then feet), or null when it is not a combo. */
export function comboStages(request: NailRequest, config: ComboConfig = COMBO_CONFIG): { hands: NailRequest; feet: NailRequest } | null {
  if (!request.combo) return null;
  const { combo: _combo, accent: _accent, ...rest } = request;
  const hands: NailRequest = { ...rest, service: 'manicure' };
  const feet = pedicureRequest({
    ...rest,
    service: 'pedicure',
    hands: 2,
    ...(config.feetArt ? (rest.gems !== 'none' || rest.stickers !== 'none' ? { accent: 'bigToe' as const, gradient: 'no' as const } : { gradient: 'no' as const }) : { gems: 'none' as const, stickers: 'none' as const, gradient: 'no' as const }),
  });
  return { hands, feet };
}

/** One match for the whole combo: the hands and the feet count the same. */
export const comboScore = (hands: number, feet: number): number => Math.round((hands + feet) / 2);
