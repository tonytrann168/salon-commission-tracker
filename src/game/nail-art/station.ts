import { Container, Graphics } from 'pixi.js';
import { NAIL_ART_CONFIG, addSpill, cleanUp, dab, decorate, emptyDesign, insidePolygon, nailOutline, paint, paletteColor, spillGrid, wipeCells } from './design';
import type { Decoration, FingerConfig, NailDesign, NailShape, StickerKind } from './design';

/**
 * The nail art station's drawing and input (story 005; realistic hand, owner 2026-11-10): one hand drawn from the
 * finger list in config (each finger its own place, lean and nail size), with PixiJS on the portrait layer over a DOM
 * rectangle. Input arrives as pointer positions in that rectangle (the DOM chat sits above the canvas). Redraws only
 * what changed: one nail's paint or spill per brush step, so a drag stays at 60 fps on a phone.
 */

export type StationTool = 'polish' | 'gradient' | 'gem' | 'sticker' | 'cleanup';

interface NailView {
  finger: FingerConfig;
  root: Container;
  spillLayer: Graphics;
  bed: Graphics;
  paintLayer: Graphics;
  mask: Graphics;
  gloss: Graphics;
  cuticle: Graphics;
  decorations: Graphics;
  /** The nail outline in nail units (0..w, 0..h). */
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
const SKIN_SHADE = 0xe8b48f;
const SKIN_LINE = 0xc98f6d;
const BED = 0xf7dad4;
const FREE_EDGE = 0xfdf3ee;
const INK = 0x5a2e43;

const hex = (value: string): number => parseInt(value.slice(1), 16);
const mix = (a: number, b: number, t: number): number => {
  const ch = (shift: number): number => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};
const rad = (deg: number): number => (deg * Math.PI) / 180;
/** Pixels kept clear above the hand box. */
const TOP_MARGIN = 7;

export function createStationView(initial: NailDesign = emptyDesign()): StationView {
  const container = new Container();
  container.label = 'nail-station';
  const fingersLayer = new Container();
  const palm = new Graphics();
  const nailsLayer = new Container();
  // The palm goes under the fingers, so the thumb lies over it and every nail sits on a visible fingertip.
  container.addChild(palm, fingersLayer, nailsLayer);
  const hand = NAIL_ART_CONFIG.hand;
  let design = initial;
  let views: NailView[] = [];
  /** Hand units → pixels, and the hand box's offset in the station rectangle. */
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  /** The nail the current stroke started on (-1: none), and the stroke's last point. */
  let strokeNail = -1;
  let last: { x: number; y: number } | null = null;

  /** A point in the station rectangle, in the given nail's own units (0..w across, 0..h from tip to cuticle). */
  const toNail = (finger: FingerConfig, px: number, py: number): { x: number; y: number } => {
    const dx = (px - offsetX) / scale - finger.x;
    const dy = (py - offsetY) / scale - finger.y;
    const a = rad(finger.angle);
    return { x: Math.cos(a) * dx + Math.sin(a) * dy + finger.nail.w / 2, y: -Math.sin(a) * dx + Math.cos(a) * dy + finger.nail.h / 2 };
  };

  const drawPaint = (index: number): void => {
    const view = views[index];
    if (!view) return;
    const { cols, rows } = NAIL_ART_CONFIG.grid;
    const { w, h } = view.finger.nail;
    const base = paletteColor(design.base);
    const fade = paletteColor(design.gradient);
    view.paintLayer.clear();
    view.gloss.clear();
    const cells = design.painted[index] ?? [];
    if (!base || cells.length === 0) return;
    const cw = w / cols;
    const ch = h / rows;
    const from = hex(base.hex);
    const to = fade ? hex(fade.hex) : from;
    const bleed = 0.05;
    for (const cell of cells) {
      const col = cell % cols;
      const row = Math.floor(cell / cols);
      // Gradient: polish at the cuticle, fading to the gradient colour at the tip.
      const color = fade ? mix(to, from, (row + 0.5) / rows) : from;
      view.paintLayer.rect(col * cw - bleed, row * ch - bleed, cw + 2 * bleed, ch + 2 * bleed).fill({ color });
    }
    // The nail is curved: a highlight down one side.
    if (cells.length > 6) view.gloss.moveTo(w * 0.3, h * 0.3).quadraticCurveTo(w * 0.24, h * 0.5, w * 0.3, h * 0.7).stroke({ width: Math.max(0.6, w * 0.08), color: 0xffffff, alpha: 0.55, cap: 'round' });
  };

  const drawSpill = (index: number): void => {
    const view = views[index];
    if (!view) return;
    view.spillLayer.clear();
    const cells = design.spill[index] ?? [];
    const base = paletteColor(design.base);
    if (!base || cells.length === 0) return;
    const grid = spillGrid();
    const cw = view.finger.nail.w / NAIL_ART_CONFIG.grid.cols;
    const ch = view.finger.nail.h / NAIL_ART_CONFIG.grid.rows;
    for (const cell of cells) {
      const col = (cell % grid.cols) - grid.margin;
      const row = Math.floor(cell / grid.cols) - grid.margin;
      view.spillLayer.ellipse((col + 0.5) * cw, (row + 0.5) * ch, cw * 0.62, ch * 0.62).fill({ color: hex(base.hex), alpha: 0.9 }).stroke({ width: 0.7 / scale, color: mix(hex(base.hex), INK, 0.35), alpha: 0.6 });
    }
  };

  const drawDecorations = (index: number): void => {
    const view = views[index];
    if (!view) return;
    const g = view.decorations;
    g.clear();
    const { w, h } = view.finger.nail;
    const r = Math.min(w, 12) * 0.14;
    for (const d of design.decorations.filter((item) => item.nail === index)) {
      const x = d.x * w;
      const y = d.y * h;
      if (d.kind === 'gem') {
        g.poly([x, y - r, x + r, y, x, y + r, x - r, y]).fill({ color: 0xdff6ff }).stroke({ width: 0.4, color: 0x6aa9c9 });
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
        g.poly(points).fill({ color: 0xffd54f }).stroke({ width: 0.3, color: 0xc9952e });
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
    const { w, h } = view.finger.nail;
    view.outline = nailOutline(design.shape, w, h);
    const flat = view.outline.flat();
    const line = 1.4 / scale;
    view.bed.clear().poly(flat).fill({ color: BED }).stroke({ width: line, color: INK, alpha: 0.7 });
    // The free edge at the tip is paler than the nail bed.
    view.bed.poly(nailOutline(design.shape, w, h).filter(([, y]) => y <= h * 0.3).flat()).fill({ color: FREE_EDGE, alpha: 0.8 });
    view.mask.clear().poly(flat).fill({ color: 0xffffff });
    // Cuticle: a soft skin fold hugging the base of the nail, and the side walls.
    view.cuticle
      .clear()
      .moveTo(-w * 0.04, h * 0.84)
      .quadraticCurveTo(w * 0.5, h * 1.12, w * 1.04, h * 0.84)
      .stroke({ width: line * 1.3, color: SKIN_LINE, alpha: 0.8, cap: 'round' })
      .moveTo(-w * 0.06, h * 0.35)
      .lineTo(-w * 0.06, h * 0.8)
      .moveTo(w * 1.06, h * 0.35)
      .lineTo(w * 1.06, h * 0.8)
      .stroke({ width: line, color: SKIN_LINE, alpha: 0.45, cap: 'round' });
    drawSpill(index);
    drawPaint(index);
    drawDecorations(index);
  };

  /** A finger: a rounded column from just above the nail down into the palm, with two knuckle creases. */
  const drawFinger = (finger: FingerConfig): Graphics => {
    const { w, h } = finger.nail;
    const fw = w * finger.width;
    const left = (w - fw) / 2;
    // The rounded fingertip shows just past the free edge (long shapes reach beyond it).
    const top = -h * 0.04;
    const length = h - top + finger.length;
    const g = new Graphics()
      .roundRect(left, top, fw, length, fw * 0.5)
      .fill({ color: SKIN })
      .stroke({ width: 1.2 / scale, color: SKIN_LINE });
    for (const at of [0.42, 0.72]) {
      const y = h + finger.length * at;
      if (y > top + length - fw * 0.5) continue;
      g.moveTo(left + fw * 0.25, y).quadraticCurveTo(w / 2, y + fw * 0.08, left + fw * 0.75, y).stroke({ width: 1 / scale, color: SKIN_LINE, alpha: 0.5, cap: 'round' });
    }
    g.position.set(finger.x, finger.y);
    g.pivot.set(w / 2, h / 2);
    g.rotation = rad(finger.angle);
    return g;
  };

  const view: StationView = {
    container,
    layout(x, y, w, h, reserveLeft, reserveRight) {
      container.position.set(x, y);
      for (const old of views) old.root.destroy({ children: true });
      fingersLayer.removeChildren().forEach((child) => child.destroy());
      views = [];
      // Fit the hand box into the free width and the height less a small top margin (so pointed tips show), keeping
      // its proportions: the hand never pushes the layout.
      const free = Math.max(80, w - reserveLeft - reserveRight);
      scale = Math.min(free / hand.box.w, (h - TOP_MARGIN) / hand.box.h);
      offsetX = reserveLeft + (free - hand.box.w * scale) / 2;
      offsetY = TOP_MARGIN;
      for (const layer of [fingersLayer, palm, nailsLayer]) {
        layer.position.set(offsetX, offsetY);
        layer.scale.set(scale);
      }
      // The palm: below the fingers, covering their bases (cropped by the toolbar under the zone).
      const bottom = h / scale;
      palm.clear().ellipse(hand.box.w * 0.52, Math.max(hand.box.h * 1.02, bottom * 0.98), hand.box.w * 0.42, hand.box.h * 0.2).fill({ color: SKIN });
      palm.ellipse(hand.box.w * 0.3, Math.max(hand.box.h * 1.02, bottom * 0.98) - hand.box.h * 0.04, hand.box.w * 0.16, hand.box.h * 0.12).fill({ color: SKIN_SHADE, alpha: 0.35 });
      for (const finger of hand.fingers) {
        fingersLayer.addChild(drawFinger(finger));
        const root = new Container();
        root.position.set(finger.x, finger.y);
        root.pivot.set(finger.nail.w / 2, finger.nail.h / 2);
        root.rotation = rad(finger.angle);
        const spillLayer = new Graphics();
        const bed = new Graphics();
        const mask = new Graphics();
        const paintLayer = new Graphics();
        paintLayer.mask = mask;
        const gloss = new Graphics();
        const cuticle = new Graphics();
        const decorations = new Graphics();
        // Spill sits on the skin, under the nail, so the nail's edge stays crisp.
        root.addChild(spillLayer, cuticle, bed, mask, paintLayer, gloss, decorations);
        nailsLayer.addChild(root);
        views.push({ finger, root, spillLayer, bed, paintLayer, mask, gloss, cuticle, decorations, outline: [] });
      }
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
          if (colorChanged || next.spill[index] !== previous.spill[index]) drawSpill(index);
          if (next.decorations !== previous.decorations) drawDecorations(index);
        }
      });
    },
    pointer(x, y, phase, tool, sticker) {
      // Browsers merge fast moves into one event per frame: fill the gap in half-brush steps so a quick stroke has no holes.
      const from = phase === 'move' ? last : null;
      last = { x, y };
      if (!from || tool === 'gem' || tool === 'sticker') return applyAt(x, y, phase, tool, sticker);
      const step = Math.max(1, NAIL_ART_CONFIG.brushRadius * scale * 0.5);
      const steps = Math.min(64, Math.ceil(Math.hypot(x - from.x, y - from.y) / step));
      // applyAt reads `design`; step it through the in-between points, then put the stored design back for setDesign.
      const stored = design;
      let next = design;
      for (let i = 1; i <= steps; i++) {
        design = next;
        next = applyAt(from.x + ((x - from.x) * i) / steps, from.y + ((y - from.y) * i) / steps, 'move', tool, sticker);
      }
      design = stored;
      return next;
    },
    destroy() {
      container.destroy({ children: true });
    },
  };

  /** One pointer position: paint, wipe or decorate there. Returns the new design (does not store it). */
  function applyAt(x: number, y: number, phase: 'down' | 'move', tool: StationTool, sticker: StickerKind): NailDesign {
    const local = views.map((v) => toNail(v.finger, x, y));
    const onNail = views.findIndex((v, i) => insidePolygon(v.outline, (local[i] as { x: number }).x, (local[i] as { y: number }).y));
    // Near a nail: within the spill margin around it (the skin a slip of the brush lands on).
    const margin = spillGrid().margin;
    const near = (i: number): boolean => {
      const v = views[i] as NailView;
      const p = local[i] as { x: number; y: number };
      const mx = (margin * v.finger.nail.w) / NAIL_ART_CONFIG.grid.cols;
      const my = (margin * v.finger.nail.h) / NAIL_ART_CONFIG.grid.rows;
      return p.x >= -mx && p.x <= v.finger.nail.w + mx && p.y >= -my && p.y <= v.finger.nail.h + my;
    };
    if (tool === 'gem' || tool === 'sticker') {
      if (phase !== 'down' || onNail < 0) return design;
      const p = local[onNail] as { x: number; y: number };
      const v = views[onNail] as NailView;
      const decoration: Decoration = { nail: onNail, x: p.x / v.finger.nail.w, y: p.y / v.finger.nail.h, kind: tool === 'gem' ? 'gem' : sticker };
      return decorate(design, decoration);
    }
    // A stroke stays on its nail while the brush is on it or the skin around it; it moves on to another nail it reaches.
    if (phase === 'down') strokeNail = onNail >= 0 ? onNail : views.findIndex((_, i) => near(i));
    else if (strokeNail < 0 || !near(strokeNail)) strokeNail = onNail;
    else if (onNail >= 0 && onNail !== strokeNail) strokeNail = onNail;
    if (strokeNail < 0) return design;
    const v = views[strokeNail] as NailView;
    const p = local[strokeNail] as { x: number; y: number };
    if (tool === 'cleanup') return cleanUp(design, strokeNail, wipeCells(v.finger.nail, p.x, p.y, NAIL_ART_CONFIG.cleanupRadius));
    if (!design.base) return design;
    const hit = dab(design.shape, v.finger.nail, p.x, p.y, NAIL_ART_CONFIG.brushRadius);
    return addSpill(paint(design, strokeNail, hit.paint), strokeNail, hit.spill);
  }
  view.setDesign(initial);
  return view;
}

/** The shapes in the order the toolbar shows them. */
export const SHAPES: NailShape[] = NAIL_ART_CONFIG.shapes;
