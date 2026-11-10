import nailJson from '../config/nail-art.json';

/**
 * The nail design as data (story 005, design/game-brief.md MVP feature 6), so it can be drawn, compared to the
 * client's request, described to the AI and saved. One hand, five nails. Config: config/nail-art.json.
 */

export type NailShape = 'square' | 'round' | 'oval' | 'almond' | 'stiletto';
export type StickerKind = 'heart' | 'star' | 'flower';
export type DecorationLevel = 'none' | 'few' | 'lots';

export interface PaletteColor {
  id: string;
  hex: string;
  name: { en: string; vi: string };
}

export interface NailArtConfig {
  shapes: NailShape[];
  palette: PaletteColor[];
  stickers: StickerKind[];
  /** Polish coverage is tracked on this grid per nail. */
  grid: { cols: number; rows: number };
  /** Brush radius, in grid cells. */
  brushCells: number;
  maxDecorationsPerNail: number;
  /** Coverage that counts as fully painted (0-1). */
  fullCoverage: number;
  matchWeights: { shape: number; color: number; coverage: number; extras: number };
  /** Decoration counts on the whole hand that count as "few" and "lots" ([min, max]). */
  decorationLevels: { few: [number, number]; lots: [number, number] };
  /** Mood change for a finished design, by match score (first band whose min the score reaches). */
  moodByMatch: { min: number; delta: number }[];
  fps: { target: number };
}

export interface Decoration {
  /** Nail index 0-4 (thumb to pinky). */
  nail: number;
  /** Position on the nail, 0-1 across and 0-1 from tip to cuticle. */
  x: number;
  y: number;
  kind: 'gem' | StickerKind;
}

export interface NailDesign {
  shape: NailShape;
  /** Palette id of the polish, or null before any polish is chosen. */
  base: string | null;
  /** Palette id the polish fades to at the tip, or null. */
  gradient: string | null;
  /** Painted grid cells per nail (indexes into cols x rows). */
  painted: number[][];
  decorations: Decoration[];
}

/** What the client asked for (story 005). Part of the client's data. */
export interface NailRequest {
  shapes: NailShape[];
  /** Palette ids the client would be happy with. */
  colors: string[];
  gradient: 'no' | 'ok' | 'yes';
  gems: DecorationLevel;
  stickers: DecorationLevel;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Validate the raw nail-art file. Throws a clear `nail-art.json: ...` error when it is malformed. */
export function parseNailArtConfig(raw: unknown): NailArtConfig {
  const fail = (problem: string): never => {
    throw new Error(`nail-art.json: ${problem}`);
  };
  if (!isRecord(raw)) return fail('root must be an object');
  const num = (value: unknown, path: string, min: number, max: number): number =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : fail(`"${path}" must be a number from ${min} to ${max}`);
  const palette = Array.isArray(raw.palette) && raw.palette.length > 0 ? raw.palette : fail('"palette" must be a non-empty list');
  const parsedPalette = palette.map((item, index): PaletteColor => {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(item.hex)) return fail(`"palette[${index}]" needs an id and a #rrggbb hex`);
    if (!isRecord(item.name) || typeof item.name.en !== 'string' || typeof item.name.vi !== 'string') return fail(`"palette[${index}].name" needs en and vi`);
    return { id: item.id, hex: item.hex, name: { en: item.name.en, vi: item.name.vi } };
  });
  const grid = isRecord(raw.grid) ? raw.grid : fail('"grid" must be an object');
  const weights = isRecord(raw.matchWeights) ? raw.matchWeights : fail('"matchWeights" must be an object');
  const levels = isRecord(raw.decorationLevels) ? raw.decorationLevels : fail('"decorationLevels" must be an object');
  const range = (value: unknown, path: string): [number, number] =>
    Array.isArray(value) && value.length === 2 && value.every((n) => typeof n === 'number') && (value[0] as number) <= (value[1] as number) ? [value[0] as number, value[1] as number] : fail(`"${path}" must be [min, max]`);
  const bands = Array.isArray(raw.moodByMatch) ? raw.moodByMatch : fail('"moodByMatch" must be a list');
  const parsedBands = bands.map((band, index) => (isRecord(band) ? { min: num(band.min, `moodByMatch[${index}].min`, 0, 100), delta: num(band.delta, `moodByMatch[${index}].delta`, -30, 30) } : fail(`"moodByMatch[${index}]" must be an object`)));
  if (!parsedBands.some((band) => band.min === 0)) fail('"moodByMatch" needs a band with min 0');
  const fps = isRecord(raw.fps) ? raw.fps : fail('"fps" must be an object');
  return {
    shapes: (Array.isArray(raw.shapes) ? raw.shapes : fail('"shapes" must be a list')).map((shape, index) =>
      ['square', 'round', 'oval', 'almond', 'stiletto'].includes(shape as string) ? (shape as NailShape) : fail(`"shapes[${index}]" is not a shape`),
    ),
    palette: parsedPalette,
    stickers: (Array.isArray(raw.stickers) ? raw.stickers : fail('"stickers" must be a list')).map((kind, index) =>
      ['heart', 'star', 'flower'].includes(kind as string) ? (kind as StickerKind) : fail(`"stickers[${index}]" is not a sticker`),
    ),
    grid: { cols: num(grid.cols, 'grid.cols', 2, 20), rows: num(grid.rows, 'grid.rows', 2, 30) },
    brushCells: num(raw.brushCells, 'brushCells', 0.5, 5),
    maxDecorationsPerNail: num(raw.maxDecorationsPerNail, 'maxDecorationsPerNail', 0, 10),
    fullCoverage: num(raw.fullCoverage, 'fullCoverage', 0.5, 1),
    matchWeights: { shape: num(weights.shape, 'matchWeights.shape', 0, 100), color: num(weights.color, 'matchWeights.color', 0, 100), coverage: num(weights.coverage, 'matchWeights.coverage', 0, 100), extras: num(weights.extras, 'matchWeights.extras', 0, 100) },
    decorationLevels: { few: range(levels.few, 'decorationLevels.few'), lots: range(levels.lots, 'decorationLevels.lots') },
    moodByMatch: [...parsedBands].sort((a, b) => b.min - a.min),
    fps: { target: num(fps.target, 'fps.target', 30, 120) },
  };
}

export const NAIL_ART_CONFIG: NailArtConfig = parseNailArtConfig(nailJson);

export const NAIL_COUNT = 5;

export const emptyDesign = (shape: NailShape = 'round'): NailDesign => ({ shape, base: null, gradient: null, painted: Array.from({ length: NAIL_COUNT }, () => []), decorations: [] });

export const paletteColor = (id: string | null, config: NailArtConfig = NAIL_ART_CONFIG): PaletteColor | undefined => config.palette.find((color) => color.id === id);

// ---- The nail outline (shared by drawing, hit testing and coverage) ----

/** How far the tip curve rises, as a share of the nail height, and its profile across the width (0-1 → 0-1). */
const TIP: Record<NailShape, { rise: number; profile: (u: number) => number }> = {
  square: { rise: 0.07, profile: (u) => Math.min(1, Math.min(u, 1 - u) / 0.14) ** 0.5 },
  round: { rise: 0.24, profile: (u) => Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2)) },
  oval: { rise: 0.36, profile: (u) => Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2)) },
  almond: { rise: 0.48, profile: (u) => (1 - Math.abs(2 * u - 1)) ** 0.6 },
  stiletto: { rise: 0.62, profile: (u) => 1 - Math.abs(2 * u - 1) },
};

/** The nail outline as a polygon in nail-local units (x 0..w, y 0..h, tip at y = 0, cuticle at y = h). */
export function nailOutline(shape: NailShape, w: number, h: number, steps = 16): [number, number][] {
  const { rise, profile } = TIP[shape];
  const top = rise * h;
  const cuticle = 0.08 * h;
  const points: [number, number][] = [[0, h - cuticle * 0.2], [0, top]];
  for (let i = 1; i < steps; i++) {
    const u = i / steps;
    points.push([u * w, top - profile(u) * top]);
  }
  points.push([w, top], [w, h - cuticle * 0.2]);
  for (let i = steps - 1; i > 0; i--) {
    const u = i / steps;
    points.push([u * w, h - cuticle * Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2))]);
  }
  return points;
}

/** Point-in-polygon (even-odd). */
export function insidePolygon(points: readonly [number, number][], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i] as [number, number];
    const [xj, yj] = points[j] as [number, number];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** The grid cells inside the nail (the cells that need polish), for a unit-size nail (w = cols, h = rows). */
export function paintableCells(shape: NailShape, config: NailArtConfig = NAIL_ART_CONFIG): number[] {
  const { cols, rows } = config.grid;
  const outline = nailOutline(shape, cols, rows);
  const cells: number[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (insidePolygon(outline, c + 0.5, r + 0.5)) cells.push(r * cols + c);
  return cells;
}

/** Cells the brush covers at grid position (gx, gy) (in cells). */
export function brushCells(shape: NailShape, gx: number, gy: number, config: NailArtConfig = NAIL_ART_CONFIG): number[] {
  const radius = config.brushCells;
  return paintableCells(shape, config).filter((cell) => {
    const cx = (cell % config.grid.cols) + 0.5;
    const cy = Math.floor(cell / config.grid.cols) + 0.5;
    return (cx - gx) ** 2 + (cy - gy) ** 2 <= radius * radius;
  });
}

/** Share of each nail's paintable cells that are painted (0-1). Changing shape keeps only cells inside the new shape. */
export function coverage(design: NailDesign, config: NailArtConfig = NAIL_ART_CONFIG): number[] {
  const cells = new Set(paintableCells(design.shape, config));
  return design.painted.map((nail) => (cells.size === 0 ? 0 : nail.filter((cell) => cells.has(cell)).length / cells.size));
}

/** Add painted cells to a nail (no duplicates). Returns a new design. */
export function paint(design: NailDesign, nail: number, cells: readonly number[]): NailDesign {
  const current = design.painted[nail] ?? [];
  const merged = [...new Set([...current, ...cells])];
  if (merged.length === current.length) return design;
  return { ...design, painted: design.painted.map((list, index) => (index === nail ? merged : list)) };
}

/** Place a gem or sticker, unless the nail already has the maximum. */
export function decorate(design: NailDesign, decoration: Decoration, config: NailArtConfig = NAIL_ART_CONFIG): NailDesign {
  if (design.decorations.filter((d) => d.nail === decoration.nail).length >= config.maxDecorationsPerNail) return design;
  return { ...design, decorations: [...design.decorations, decoration] };
}
