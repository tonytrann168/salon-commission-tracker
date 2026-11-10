import { Container, Graphics } from 'pixi.js';
import { NAIL_ART_CONFIG, NAIL_COUNT, brushCells, decorate, emptyDesign, insidePolygon, nailOutline, paint, paletteColor } from './design';
import type { Decoration, NailDesign, NailShape, StickerKind } from './design';

/**
 * The nail art station's drawing and input (story 005): one hand, five nails, drawn with PixiJS on the portrait layer
 * over a DOM rectangle (the caller passes that rectangle). Input arrives as pointer positions in that rectangle (the
 * DOM chat sits above the canvas, so the caller forwards pointer events). Redraws only what changed: one nail's paint
 * per brush step, so a drag stays at 60 fps on a phone.
 */

export type StationTool = 'polish' | 'gradient' | 'gem' | 'sticker';

interface NailView {
  root: Container;
  bed: Graphics;
  paintLayer: Graphics;
  mask: Graphics;
  gloss: Graphics;
  decorations: Graphics;
  x: number;
  y: number;
  w: number;
  h: number;
  outline: [number, number][];
}

export interface StationView {
  container: Container;
  /** Lay the hand out in a w x h box (the station's rectangle), positioned at (x, y) on the layer. */
  layout(x: number, y: number, w: number, h: number, reserveLeft: number, reserveRight: number): void;
  setDesign(design: NailDesign): void;
  /** Pointer down/move at (x, y) in the station rectangle. Returns the new design (or the same one if nothing changed). */
  pointer(x: number, y: number, phase: 'down' | 'move', tool: StationTool, sticker: StickerKind): NailDesign;
  destroy(): void;
}

const SKIN = 0xf3c9a9;
const SKIN_LINE = 0xc98f6d;
const BED = 0xf7dad4;
const INK = 0x5a2e43;

const hex = (value: string): number => parseInt(value.slice(1), 16);
const mix = (a: number, b: number, t: number): number => {
  const ch = (shift: number): number => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

export function createStationView(initial: NailDesign = emptyDesign()): StationView {
  const container = new Container();
  container.label = 'nail-station';
  const hand = new Graphics();
  container.addChild(hand);
  let design = initial;
  let views: NailView[] = [];
  let lastNail = -1;

  const drawPaint = (index: number): void => {
    const view = views[index];
    if (!view) return;
    const { cols, rows } = NAIL_ART_CONFIG.grid;
    const base = paletteColor(design.base);
    const fade = paletteColor(design.gradient);
    view.paintLayer.clear();
    view.gloss.clear();
    const cells = design.painted[index] ?? [];
    if (!base || cells.length === 0) return;
    const cw = view.w / cols;
    const ch = view.h / rows;
    const from = hex(base.hex);
    const to = fade ? hex(fade.hex) : from;
    for (const cell of cells) {
      const col = cell % cols;
      const row = Math.floor(cell / cols);
      // Gradient: polish at the cuticle, fading to the gradient colour at the tip.
      const color = fade ? mix(to, from, (row + 0.5) / rows) : from;
      view.paintLayer.rect(col * cw - 0.6, row * ch - 0.6, cw + 1.2, ch + 1.2).fill({ color });
    }
    if (cells.length > 6) view.gloss.moveTo(view.w * 0.28, view.h * 0.3).lineTo(view.w * 0.28, view.h * 0.62).stroke({ width: Math.max(1.5, view.w * 0.08), color: 0xffffff, alpha: 0.6, cap: 'round' });
  };

  const drawDecorations = (index: number): void => {
    const view = views[index];
    if (!view) return;
    const g = view.decorations;
    g.clear();
    const r = view.w * 0.14;
    for (const d of design.decorations.filter((item) => item.nail === index)) {
      const x = d.x * view.w;
      const y = d.y * view.h;
      if (d.kind === 'gem') {
        g.poly([x, y - r, x + r, y, x, y + r, x - r, y]).fill({ color: 0xdff6ff }).stroke({ width: 1, color: 0x6aa9c9 });
        g.circle(x - r * 0.3, y - r * 0.3, r * 0.22).fill({ color: 0xffffff });
      } else if (d.kind === 'heart') {
        g.circle(x - r * 0.45, y - r * 0.2, r * 0.55).fill({ color: 0xff4f8b });
        g.circle(x + r * 0.45, y - r * 0.2, r * 0.55).fill({ color: 0xff4f8b });
        g.poly([x - r, y, x + r, y, x, y + r * 1.1]).fill({ color: 0xff4f8b });
      } else if (d.kind === 'star') {
        const points: number[] = [];
        for (let i = 0; i < 10; i++) {
          const angle = -Math.PI / 2 + (i * Math.PI) / 5;
          const radius = i % 2 === 0 ? r * 1.1 : r * 0.45;
          points.push(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
        }
        g.poly(points).fill({ color: 0xffd54f }).stroke({ width: 0.8, color: 0xc9952e });
      } else {
        for (let i = 0; i < 5; i++) {
          const angle = (i * 2 * Math.PI) / 5;
          g.circle(x + Math.cos(angle) * r * 0.55, y + Math.sin(angle) * r * 0.55, r * 0.45).fill({ color: 0xffffff });
        }
        g.circle(x, y, r * 0.35).fill({ color: 0xffc94a });
      }
    }
  };

  const drawNail = (index: number): void => {
    const view = views[index];
    if (!view) return;
    view.outline = nailOutline(design.shape, view.w, view.h);
    const flat = view.outline.flat();
    view.bed.clear().poly(flat).fill({ color: BED }).stroke({ width: 1.6, color: INK, alpha: 0.7 });
    view.mask.clear().poly(flat).fill({ color: 0xffffff });
    drawPaint(index);
    drawDecorations(index);
  };

  const view: StationView = {
    container,
    layout(x, y, w, h, reserveLeft, reserveRight) {
      container.position.set(x, y);
      for (const old of views) old.root.destroy({ children: true });
      views = [];
      hand.clear();
      // Five fingers across the free width (thumb shorter and lower, middle finger highest).
      const free = Math.max(80, w - reserveLeft - reserveRight);
      const nailW = Math.min(free / 6.2, h * 0.3);
      const nailH = nailW * 1.45;
      const gap = (free - NAIL_COUNT * nailW) / (NAIL_COUNT + 1);
      const lift = [0.32, 0.1, 0, 0.08, 0.22];
      const palm = h * 0.98;
      for (let index = 0; index < NAIL_COUNT; index++) {
        const nx = reserveLeft + gap + index * (nailW + gap);
        const ny = h * 0.08 + (lift[index] as number) * h * 0.5;
        // The finger under the nail.
        hand.roundRect(nx - nailW * 0.12, ny + nailH * 0.35, nailW * 1.24, palm - ny - nailH * 0.2, nailW * 0.55).fill({ color: SKIN }).stroke({ width: 1.2, color: SKIN_LINE });
        const root = new Container();
        root.position.set(nx, ny);
        const bed = new Graphics();
        const mask = new Graphics();
        const paintLayer = new Graphics();
        paintLayer.mask = mask;
        const gloss = new Graphics();
        const decorations = new Graphics();
        root.addChild(bed, mask, paintLayer, gloss, decorations);
        container.addChild(root);
        views.push({ root, bed, paintLayer, mask, gloss, decorations, x: nx, y: ny, w: nailW, h: nailH, outline: [] });
      }
      hand.roundRect(reserveLeft + gap * 0.5, palm - h * 0.1, free - gap, h * 0.2, h * 0.08).fill({ color: SKIN });
      views.forEach((_, index) => drawNail(index));
    },
    setDesign(next) {
      const shapeChanged = next.shape !== design.shape;
      const colorChanged = next.base !== design.base || next.gradient !== design.gradient;
      const previous = design;
      design = next;
      views.forEach((_, index) => {
        if (shapeChanged) drawNail(index);
        else {
          if (colorChanged || next.painted[index] !== previous.painted[index]) drawPaint(index);
          if (next.decorations !== previous.decorations) drawDecorations(index);
        }
      });
    },
    pointer(x, y, phase, tool, sticker) {
      const hit = views.findIndex((v) => insidePolygon(v.outline, x - v.x, y - v.y));
      if (hit < 0) {
        if (phase === 'down') lastNail = -1;
        return design;
      }
      const v = views[hit] as NailView;
      const lx = (x - v.x) / v.w;
      const ly = (y - v.y) / v.h;
      if (tool === 'gem' || tool === 'sticker') {
        if (phase !== 'down') return design;
        const decoration: Decoration = { nail: hit, x: lx, y: ly, kind: tool === 'gem' ? 'gem' : sticker };
        return decorate(design, decoration);
      }
      if (!design.base) return design;
      lastNail = hit;
      const { cols, rows } = NAIL_ART_CONFIG.grid;
      return paint(design, hit, brushCells(design.shape, lx * cols, ly * rows));
    },
    destroy() {
      container.destroy({ children: true });
    },
  };
  view.setDesign(initial);
  return view;
}

/** The shapes in the order the toolbar shows them. */
export const SHAPES: NailShape[] = NAIL_ART_CONFIG.shapes;
