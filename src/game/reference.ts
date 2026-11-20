import referenceJson from './config/reference.json';
import { NAIL_ART_CONFIG, decorate, emptyDesign, nailsFor, paint, paintableCells } from './nail-art/design';
import type { DecorationLevel, NailArtConfig, NailDesign, NailRequest, StickerKind } from './nail-art/design';
import type { Difficulty } from './types';

/**
 * Story 065 (hard clients): she brings a picture of the nails she wants. The picture is a target design made from her
 * request (one shape, one length, one colour, her art), drawn by the game's own nail renderer as a polaroid. Her
 * request narrows to the picture, so the match at Done says how close the set is to it; mood follows it a little more
 * strongly. No real photos and no image generation (the owner may supply real reference photos later).
 */
export interface ReferenceConfig {
  chance: number;
  /** Her mood change from the match is multiplied by this when she brought a picture. */
  moodScale: number;
}

export function parseReferenceConfig(raw: unknown): ReferenceConfig {
  const c = (raw ?? {}) as Record<string, unknown>;
  const fail = (what: string): never => {
    throw new Error(`reference.json: ${what}`);
  };
  const chance = typeof c.chance === 'number' && c.chance >= 0 && c.chance <= 1 ? c.chance : fail('"chance" must be from 0 to 1');
  const moodScale = typeof c.moodScale === 'number' && c.moodScale >= 1 && c.moodScale <= 3 ? c.moodScale : fail('"moodScale" must be from 1 to 3');
  return { chance, moodScale };
}

export const REFERENCE_CONFIG: ReferenceConfig = parseReferenceConfig(referenceJson);

const hash = (text: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h;
};

/** Does she bring a picture this visit? Hard clients only, by a stable hash of the visit. */
export function bringsPicture(difficulty: Difficulty, visit: string, config: ReferenceConfig = REFERENCE_CONFIG): boolean {
  return difficulty === 'hard' && (hash(`picture:${visit}`) % 1000) / 1000 < config.chance;
}

/** How many decorations a level means in the picture (the middle of its range). */
const countFor = (level: DecorationLevel, config: NailArtConfig): number => {
  if (level === 'none') return 0;
  const [min, max] = config.decorationLevels[level];
  return Math.round((min + max) / 2);
};

/** The picture's design and her request narrowed to it (what the match compares the set with). */
export function referenceTarget(request: NailRequest, config: NailArtConfig = NAIL_ART_CONFIG): { design: NailDesign; request: NailRequest } {
  const shape = request.shapes[0] ?? 'round';
  const length = request.lengths?.[0] ?? 'medium';
  const base = request.colors[0] ?? config.palette[0]?.id ?? null;
  const nails = nailsFor(request);
  let design: NailDesign = { ...emptyDesign(shape, nails, length), base };
  const cells = paintableCells(shape, config);
  for (let nail = 0; nail < nails; nail++) design = paint(design, nail, cells);
  if (request.gradient === 'yes') design = { ...design, gradient: request.colors[1] ?? config.palette.find((c) => c.id !== base)?.id ?? null };
  // Her art, spread over the nails: gems near the cuticle, stickers in the middle.
  // Story 069: a big-toe accent puts the art on the big toes only (spread across them).
  const perLimb = config.hand.fingers.length;
  const bigToes = Array.from({ length: Math.max(1, Math.round(nails / perLimb)) }, (_, i) => i * perLimb);
  const where = (i: number, spread: (i: number) => number): number => (request.accent === 'bigToe' ? (bigToes[i % bigToes.length] as number) : spread(i));
  const across = (i: number, of: number): number => (request.accent === 'bigToe' ? 0.25 + (0.5 * (Math.floor(i / bigToes.length) % 3)) / 2 : of);
  const gems = countFor(request.gems, config);
  for (let i = 0; i < gems; i++) design = decorate(design, { nail: where(i, (k) => (k * 2 + 1) % nails), x: across(i, 0.5), y: 0.7, kind: 'gem' }, config);
  const stickers = countFor(request.stickers, config);
  const kinds: StickerKind[] = config.stickers;
  for (let i = 0; i < stickers; i++) design = decorate(design, { nail: where(i, (k) => (k * 2) % nails), x: across(i, 0.5), y: 0.45, kind: kinds[i % kinds.length] as StickerKind }, config);
  const narrowed: NailRequest = {
    ...request,
    shapes: [shape],
    lengths: [length],
    colors: base ? [base] : request.colors,
    gradient: request.gradient === 'yes' ? 'yes' : 'no',
  };
  return { design, request: narrowed };
}
