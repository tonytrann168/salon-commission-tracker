import { NAIL_ART_CONFIG, coverage, paletteColor } from './design';
import type { DecorationLevel, NailArtConfig, NailDesign, NailRequest } from './design';

/**
 * Compare the finished design with what the client asked for (story 005). Pure: 0-100 overall plus the four parts
 * (shape, colour, coverage, extras), a mood change from config, and a short English description for the AI client and
 * the review.
 */

export interface MatchResult {
  score: number;
  parts: { shape: number; color: number; coverage: number; extras: number };
  /** Average polish coverage across the five nails, 0-1. */
  covered: number;
  moodDelta: number;
}

const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const distance = (a: string, b: string): number => Math.hypot(...rgb(a).map((v, i) => v - (rgb(b)[i] as number)));
/** Colours this far apart (RGB distance) or more score 0. */
const FAR = 160;

function levelScore(count: number, wanted: DecorationLevel, config: NailArtConfig): number {
  if (wanted === 'none') return Math.max(0, 100 - 30 * count);
  const [min, max] = config.decorationLevels[wanted];
  if (count >= min && count <= max) return 100;
  const off = count < min ? min - count : count - max;
  return Math.max(0, 100 - 25 * off);
}

export function matchDesign(design: NailDesign, request: NailRequest, config: NailArtConfig = NAIL_ART_CONFIG): MatchResult {
  const shape = request.shapes.includes(design.shape) ? 100 : 30;

  const base = paletteColor(design.base, config);
  const wantedHexes = request.colors.map((id) => paletteColor(id, config)?.hex).filter((hex): hex is string => hex !== undefined);
  const color = !base
    ? 0
    : request.colors.includes(base.id)
      ? 100
      : Math.round(Math.max(0, 1 - Math.min(...wantedHexes.map((hex) => distance(hex, base.hex))) / FAR) * 70);

  const perNail = coverage(design, config);
  const covered = perNail.reduce((sum, value) => sum + value, 0) / perNail.length;
  // Full marks at the "fully painted" line; nothing below half painted.
  const coverageScore = Math.round(Math.max(0, Math.min(1, (covered - 0.5) / (config.fullCoverage - 0.5))) * 100);

  const gems = design.decorations.filter((d) => d.kind === 'gem').length;
  const stickers = design.decorations.length - gems;
  const usedGradient = design.gradient !== null;
  const gradient = request.gradient === 'ok' || (request.gradient === 'yes') === usedGradient ? 100 : 0;
  const extras = Math.round((levelScore(gems, request.gems, config) + levelScore(stickers, request.stickers, config) + gradient) / 3);

  const w = config.matchWeights;
  const total = w.shape + w.color + w.coverage + w.extras;
  const score = Math.round((shape * w.shape + color * w.color + coverageScore * w.coverage + extras * w.extras) / total);
  const moodDelta = (config.moodByMatch.find((band) => score >= band.min) ?? { delta: 0 }).delta;
  return { score, parts: { shape, color, coverage: coverageScore, extras }, covered, moodDelta };
}

/** One English line about the nails for the AI client and the review, e.g. "square, pale pink, 2 gems; 96% painted". */
export function describeDesign(design: NailDesign, config: NailArtConfig = NAIL_ART_CONFIG): string {
  const perNail = coverage(design, config);
  const covered = Math.round((perNail.reduce((sum, value) => sum + value, 0) / perNail.length) * 100);
  const base = paletteColor(design.base, config)?.name.en.toLowerCase() ?? 'no polish yet';
  const fade = design.gradient ? ` fading to ${paletteColor(design.gradient, config)?.name.en.toLowerCase()} at the tips` : '';
  const counts = new Map<string, number>();
  design.decorations.forEach((d) => counts.set(d.kind, (counts.get(d.kind) ?? 0) + 1));
  const extras = [...counts].map(([kind, n]) => `${n} ${kind}${n === 1 ? '' : 's'}`).join(', ');
  return `${design.shape} shape, ${base}${fade}${extras ? `, ${extras}` : ', no gems or stickers'}; ${covered}% painted`;
}

/** The request in plain English, for the client's prompt. */
export function describeRequest(request: NailRequest, config: NailArtConfig = NAIL_ART_CONFIG): string {
  const colors = request.colors.map((id) => paletteColor(id, config)?.name.en.toLowerCase() ?? id).join(' or ');
  const art = [request.gems !== 'none' ? `${request.gems} gems` : 'no gems', request.stickers !== 'none' ? `${request.stickers} stickers` : 'no stickers', request.gradient === 'yes' ? 'a gradient' : request.gradient === 'no' ? 'no gradient' : 'a gradient is fine'].join(', ');
  return `${request.shapes.join(' or ')} shape, ${colors}, ${art}`;
}
