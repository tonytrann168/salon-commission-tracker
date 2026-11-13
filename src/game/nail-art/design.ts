import nailJson from '../config/nail-art.json';

/**
 * The nail design as data (story 005, design/game-brief.md MVP feature 6), so it can be drawn, compared to the
 * client's request, described to the AI and saved. One hand, five nails. Config: config/nail-art.json.
 * The hand is data (owner, 2026-11-10): each finger has its own position, angle and nail size, so the thumb and pinky
 * are harder to paint cleanly, and a second hand later is just more config.
 */

export type NailShape = 'square' | 'round' | 'oval' | 'almond' | 'stiletto';
export type StickerKind = 'heart' | 'star' | 'flower';
export type DecorationLevel = 'none' | 'few' | 'lots';

export interface PaletteColor {
  id: string;
  hex: string;
  name: { en: string; vi: string };
  /** Story 007: sold in the shop; in the station only once bought. */
  shop?: boolean;
}

/** One finger, in hand units: the nail's centre, the finger's lean (degrees, 0 = straight up), the nail's size. */
export interface FingerConfig {
  id: string;
  x: number;
  y: number;
  angle: number;
  nail: { w: number; h: number };
  /** How far the finger reaches below the nail, and its width as a multiple of the nail width. */
  length: number;
  width: number;
}

export interface HandConfig {
  box: { w: number; h: number };
  fingers: FingerConfig[];
}

export interface NailArtConfig {
  shapes: NailShape[];
  palette: PaletteColor[];
  stickers: StickerKind[];
  /** Polish coverage is tracked on this grid per nail. */
  grid: { cols: number; rows: number };
  hand: HandConfig;
  /** Story 024: a foot for pedicures (toes as fingers; same count as the hand). */
  foot: HandConfig;
  /** Brush radius in hand units: the same on every finger, so it fills a small nail faster and spills off it more easily. */
  brushRadius: number;
  /** Paint off the nail is tracked this many grid cells out; a nail's neatness hits 0 when its spill reaches this share of its area. */
  spill: { marginCells: number; forgiveRing: number; zeroNeatnessAt: number };
  /** The Clean up tool's radius, in hand units. */
  cleanupRadius: number;
  maxDecorationsPerNail: number;
  /** Coverage that counts as fully painted (0-1). */
  fullCoverage: number;
  matchWeights: { shape: number; color: number; coverage: number; extras: number; neatness: number };
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
  /** Polish on the skin or cuticle around each nail: cells of the grid widened by spill.marginCells on every side. */
  spill: number[][];
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
  /** Story 017: hard clients may want both hands (10 nails). Default one hand. For a pedicure: both feet. */
  hands?: 1 | 2;
  /** Story 024: a pedicure (toes) instead of a manicure. */
  service?: 'manicure' | 'pedicure';
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
    if (item.shop !== undefined && typeof item.shop !== 'boolean') return fail(`"palette[${index}].shop" must be true or false`);
    return { id: item.id, hex: item.hex, name: { en: item.name.en, vi: item.name.vi }, ...(item.shop ? { shop: true } : {}) };
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
  // A hand or a foot (story 024): the same finger list shape (toes are fingers).
  const limb = (value: unknown, name: string): HandConfig => {
    const limbRaw = isRecord(value) ? value : fail(`"${name}" must be an object`);
    const box = isRecord(limbRaw.box) ? limbRaw.box : fail(`"${name}.box" must be an object`);
    const fingers = Array.isArray(limbRaw.fingers) && limbRaw.fingers.length > 0 ? limbRaw.fingers : fail(`"${name}.fingers" must be a non-empty list`);
    return {
      box: { w: num(box.w, `${name}.box.w`, 10, 1000), h: num(box.h, `${name}.box.h`, 10, 1000) },
      fingers: fingers.map((finger, i): FingerConfig => {
        const at = `${name}.fingers[${i}]`;
        if (!isRecord(finger) || typeof finger.id !== 'string' || !isRecord(finger.nail)) return fail(`"${at}" needs an id and a nail size`);
        return {
          id: finger.id,
          x: num(finger.x, `${at}.x`, 0, 1000),
          y: num(finger.y, `${at}.y`, 0, 1000),
          angle: num(finger.angle, `${at}.angle`, -90, 90),
          nail: { w: num(finger.nail.w, `${at}.nail.w`, 1, 100), h: num(finger.nail.h, `${at}.nail.h`, 1, 100) },
          length: num(finger.length, `${at}.length`, 0, 200),
          width: num(finger.width, `${at}.width`, 1, 3),
        };
      }),
    };
  };
  const hand = limb(raw.hand, 'hand');
  const foot = limb(raw.foot, 'foot');
  if (foot.fingers.length !== hand.fingers.length) fail('"foot" needs as many toes as the hand has fingers');
  const spill = isRecord(raw.spill) ? raw.spill : fail('"spill" must be an object');
  return {
    shapes: (Array.isArray(raw.shapes) ? raw.shapes : fail('"shapes" must be a list')).map((shape, index) =>
      ['square', 'round', 'oval', 'almond', 'stiletto'].includes(shape as string) ? (shape as NailShape) : fail(`"shapes[${index}]" is not a shape`),
    ),
    palette: parsedPalette,
    stickers: (Array.isArray(raw.stickers) ? raw.stickers : fail('"stickers" must be a list')).map((kind, index) =>
      ['heart', 'star', 'flower'].includes(kind as string) ? (kind as StickerKind) : fail(`"stickers[${index}]" is not a sticker`),
    ),
    grid: { cols: num(grid.cols, 'grid.cols', 2, 20), rows: num(grid.rows, 'grid.rows', 2, 30) },
    hand,
    foot,
    brushRadius: num(raw.brushRadius, 'brushRadius', 0.5, 20),
    spill: { marginCells: num(spill.marginCells, 'spill.marginCells', 0, 6), forgiveRing: num(spill.forgiveRing, 'spill.forgiveRing', 0, 3), zeroNeatnessAt: num(spill.zeroNeatnessAt, 'spill.zeroNeatnessAt', 0.05, 2) },
    cleanupRadius: num(raw.cleanupRadius, 'cleanupRadius', 0.5, 30),
    maxDecorationsPerNail: num(raw.maxDecorationsPerNail, 'maxDecorationsPerNail', 0, 10),
    fullCoverage: num(raw.fullCoverage, 'fullCoverage', 0.5, 1),
    matchWeights: { shape: num(weights.shape, 'matchWeights.shape', 0, 100), color: num(weights.color, 'matchWeights.color', 0, 100), coverage: num(weights.coverage, 'matchWeights.coverage', 0, 100), extras: num(weights.extras, 'matchWeights.extras', 0, 100), neatness: num(weights.neatness, 'matchWeights.neatness', 0, 100) },
    decorationLevels: { few: range(levels.few, 'decorationLevels.few'), lots: range(levels.lots, 'decorationLevels.lots') },
    moodByMatch: [...parsedBands].sort((a, b) => b.min - a.min),
    fps: { target: num(fps.target, 'fps.target', 30, 120) },
  };
}

export const NAIL_ART_CONFIG: NailArtConfig = parseNailArtConfig(nailJson);

/** One nail per finger of the configured hand. */
export const NAIL_COUNT = NAIL_ART_CONFIG.hand.fingers.length;

/** Nails a request needs: one hand, or both (story 017). Nails 0-4 are the right hand, 5-9 the left. */
export const nailsFor = (request?: { hands?: 1 | 2 }): number => NAIL_COUNT * (request?.hands ?? 1);

const empties = (count: number): number[][] => Array.from({ length: count }, () => []);
export const emptyDesign = (shape: NailShape = 'round', nails: number = NAIL_COUNT): NailDesign => ({ shape, base: null, gradient: null, painted: empties(nails), spill: empties(nails), decorations: [] });

/** The hand or foot a request needs (story 024). */
export const limbFor = (request?: { service?: 'manicure' | 'pedicure' }, config: NailArtConfig = NAIL_ART_CONFIG): HandConfig => (request?.service === 'pedicure' ? config.foot : config.hand);

/** The left hand: the configured hand mirrored (x across the box, lean reversed). The hand stays data. */
export function mirroredFingers(hand: HandConfig = NAIL_ART_CONFIG.hand): FingerConfig[] {
  return hand.fingers.map((finger) => ({ ...finger, id: `left-${finger.id}`, x: hand.box.w - finger.x, angle: -finger.angle }));
}

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

const paintableCache = new Map<string, number[]>();

/** The grid cells inside the nail (the cells that need polish), for a unit-size nail (w = cols, h = rows). */
export function paintableCells(shape: NailShape, config: NailArtConfig = NAIL_ART_CONFIG): number[] {
  const { cols, rows } = config.grid;
  const key = `${shape}:${cols}x${rows}`;
  const cached = config === NAIL_ART_CONFIG ? paintableCache.get(key) : undefined;
  if (cached) return cached;
  const outline = nailOutline(shape, cols, rows);
  const cells: number[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (insidePolygon(outline, c + 0.5, r + 0.5)) cells.push(r * cols + c);
  if (config === NAIL_ART_CONFIG) paintableCache.set(key, cells);
  return cells;
}

/**
 * Cells just outside the nail (within spill.forgiveRing cells of it), in nail-grid (col, row) form "c,r": a brush that
 * reaches the edge always grazes these, so they count as neither paint nor spill. Real slips land further out.
 */
function forgivenCells(shape: NailShape, config: NailArtConfig): Set<string> {
  const { cols } = config.grid;
  const ring = Math.round(config.spill.forgiveRing);
  const forgiven = new Set<string>();
  for (const cell of paintableCells(shape, config)) {
    const c = cell % cols;
    const r = Math.floor(cell / cols);
    for (let dr = -ring; dr <= ring; dr++) for (let dc = -ring; dc <= ring; dc++) forgiven.add(`${c + dc},${r + dr}`);
  }
  return forgiven;
}

/** The spill grid: the nail grid widened by spill.marginCells on every side (cell index = row * width + col). */
export const spillGrid = (config: NailArtConfig = NAIL_ART_CONFIG): { margin: number; cols: number; rows: number } => {
  const margin = Math.round(config.spill.marginCells);
  return { margin, cols: config.grid.cols + 2 * margin, rows: config.grid.rows + 2 * margin };
};

/**
 * One brush dab on a nail of size (w, h) hand units, centred at (x, y) in the nail's own units (0..w across, 0..h
 * from tip to cuticle). Cells inside the nail get polish; cells further out (skin, cuticle, past the tip), beyond the
 * forgiven ring and within the spill margin, are spill. The radius is in hand units, so the same dab is a bigger share of a small nail.
 */
export function dab(shape: NailShape, nail: { w: number; h: number }, x: number, y: number, radius: number, config: NailArtConfig = NAIL_ART_CONFIG): { paint: number[]; spill: number[] } {
  const { cols, rows } = config.grid;
  const inside = new Set(paintableCells(shape, config));
  const forgiven = forgivenCells(shape, config);
  const grid = spillGrid(config);
  const cw = nail.w / cols;
  const ch = nail.h / rows;
  const paint: number[] = [];
  const spill: number[] = [];
  for (let r = -grid.margin; r < rows + grid.margin; r++) {
    for (let c = -grid.margin; c < cols + grid.margin; c++) {
      if (((c + 0.5) * cw - x) ** 2 + ((r + 0.5) * ch - y) ** 2 > radius * radius) continue;
      const cell = r * cols + c;
      if (c >= 0 && c < cols && r >= 0 && r < rows && inside.has(cell)) paint.push(cell);
      else if (!forgiven.has(`${c},${r}`)) spill.push((r + grid.margin) * grid.cols + (c + grid.margin));
    }
  }
  return { paint, spill };
}

/** Spill cells within `radius` of (x, y) on a nail of size (w, h) (what one Clean up wipe removes). */
export function wipeCells(nail: { w: number; h: number }, x: number, y: number, radius: number, config: NailArtConfig = NAIL_ART_CONFIG): number[] {
  const grid = spillGrid(config);
  const cw = nail.w / config.grid.cols;
  const ch = nail.h / config.grid.rows;
  const cells: number[] = [];
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (((c - grid.margin + 0.5) * cw - x) ** 2 + ((r - grid.margin + 0.5) * ch - y) ** 2 <= radius * radius) cells.push(r * grid.cols + c);
    }
  }
  return cells;
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

/** Add spill cells to a nail (no duplicates). Returns a new design, or the same one if nothing changed. */
export function addSpill(design: NailDesign, nail: number, cells: readonly number[]): NailDesign {
  const current = design.spill[nail] ?? [];
  const merged = [...new Set([...current, ...cells])];
  if (merged.length === current.length) return design;
  return { ...design, spill: design.spill.map((list, index) => (index === nail ? merged : list)) };
}

/** Wipe spill cells off a nail's skin (the Clean up tool). Returns the same design if there was nothing to wipe. */
export function cleanUp(design: NailDesign, nail: number, cells: readonly number[]): NailDesign {
  const current = design.spill[nail] ?? [];
  const wipe = new Set(cells);
  const kept = current.filter((cell) => !wipe.has(cell));
  if (kept.length === current.length) return design;
  return { ...design, spill: design.spill.map((list, index) => (index === nail ? kept : list)) };
}

/** Neatness per nail, 0-1: 1 with no paint on the skin, 0 when the spill reaches spill.zeroNeatnessAt of the nail's area. */
export function neatness(design: NailDesign, config: NailArtConfig = NAIL_ART_CONFIG): number[] {
  const area = Math.max(1, paintableCells(design.shape, config).length);
  return design.spill.map((cells) => Math.max(0, 1 - cells.length / area / config.spill.zeroNeatnessAt));
}

/** Place a gem or sticker, unless the nail already has the maximum. */
export function decorate(design: NailDesign, decoration: Decoration, config: NailArtConfig = NAIL_ART_CONFIG): NailDesign {
  if (design.decorations.filter((d) => d.nail === decoration.nail).length >= config.maxDecorationsPerNail) return design;
  return { ...design, decorations: [...design.decorations, decoration] };
}
