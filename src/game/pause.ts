import pauseJson from './config/pause.json';

/** Story 068: leaving a visit mid-way: it is not counted; any penalty is in config/pause.json (owner default: none). */
export interface PauseConfig {
  leave: { xpPenalty: number; coinsPenalty: number };
}

export function parsePauseConfig(raw: unknown): PauseConfig {
  const leave = ((raw ?? {}) as { leave?: Record<string, unknown> }).leave ?? {};
  const whole = (v: unknown, name: string): number => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 1000 ? v : (() => {
    throw new Error(`pause.json: "leave.${name}" must be a whole number 0-1000`);
  })());
  return { leave: { xpPenalty: whole(leave.xpPenalty, 'xpPenalty'), coinsPenalty: whole(leave.coinsPenalty, 'coinsPenalty') } };
}

export const PAUSE_CONFIG: PauseConfig = parsePauseConfig(pauseJson);

/** The save after leaving a visit: nothing counted; only the configured penalty (never below zero). */
export function afterLeaving<S extends { xp: number; coins?: number }>(save: S, config: PauseConfig = PAUSE_CONFIG): S {
  if (config.leave.xpPenalty === 0 && config.leave.coinsPenalty === 0) return save;
  return { ...save, xp: Math.max(0, save.xp - config.leave.xpPenalty), coins: Math.max(0, (save.coins ?? 0) - config.leave.coinsPenalty) };
}
