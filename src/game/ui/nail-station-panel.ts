import type { Container } from 'pixi.js';
import { getLanguage, t } from '../i18n';
import { NAIL_ART_CONFIG, emptyDesign } from '../nail-art/design';
import type { NailDesign, NailRequest, NailShape, StickerKind } from '../nail-art/design';
import { describeDesign, matchDesign } from '../nail-art/match';
import type { MatchResult } from '../nail-art/match';
import { SHAPES, createStationView } from '../nail-art/station';
import type { StationTool } from '../nail-art/station';
import { emitSound } from '../sound-events';
import { el } from './dom';
import './nail-station.css';

/**
 * The nail art station panel (story 005): the PixiJS hand over the portrait zone, a DOM touch layer on top of it (the
 * chat UI sits above the canvas), and a two-row toolbar (shapes + Done; tools + colours). The chat below stays usable.
 */

export interface NailStationOptions {
  /** Where the station draws (the portrait zone's rectangle, relative to the Pixi host). */
  rect: () => { left: number; top: number; width: number; height: number };
  /** The element the touch layer covers (the portrait zone). */
  zone: HTMLElement;
  layer: Container;
  request: NailRequest;
  /** Mai's bubble corner, so the hand leaves room for her. */
  maiSide: () => 'left' | 'right' | null;
  /** The design changed (for the client's game note). */
  onChange: (design: NailDesign) => void;
  /** The player tapped Done. */
  onDone: (design: NailDesign, result: MatchResult) => void;
}

export interface NailStation {
  /** The toolbar (mount right under the zone). */
  toolbar: HTMLElement;
  /** The touch layer (mount over the zone, in the same positioned parent). */
  touch: HTMLElement;
  setOpen(open: boolean): void;
  /** Re-lay the hand out (the zone changed size). */
  relayout(): void;
  design(): NailDesign;
  /** Finish now (the appointment ended before Done): the match without a mood change. */
  finish(): MatchResult;
  readonly done: boolean;
  destroy(): void;
}

/** A small shape icon for a toolbar button (SVG, built from code). */
function shapeIcon(shape: NailShape): string {
  const paths: Record<NailShape, string> = {
    square: 'M5 22 V6 Q5 4 7 4 H17 Q19 4 19 6 V22 Z',
    round: 'M5 22 V11 A7 7 0 0 1 19 11 V22 Z',
    oval: 'M5 22 V13 Q5 2 12 2 Q19 2 19 13 V22 Z',
    almond: 'M5 22 V14 Q6 6 12 1 Q18 6 19 14 V22 Z',
    stiletto: 'M6 22 V15 L12 1 L18 15 V22 Z',
  };
  return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="${paths[shape]}" fill="#ffd1e3" stroke="#5a2e43" stroke-width="1.6"/></svg>`;
}

export function createNailStation(options: NailStationOptions): NailStation {
  const view = createStationView(emptyDesign(SHAPES[1] ?? 'round'));
  options.layer.addChild(view.container);
  view.container.visible = false;
  let design = emptyDesign(SHAPES[1] ?? 'round');
  let tool: StationTool = 'polish';
  let sticker: StickerKind = NAIL_ART_CONFIG.stickers[0] ?? 'heart';
  let open = false;
  let done = false;
  const lang = getLanguage();

  const toolbar = el('div', 'station-tools hidden');
  const rowA = el('div', 'station-row');
  const rowB = el('div', 'station-row');
  const status = el('p', 'station-status', t('station.hint'));
  status.setAttribute('aria-live', 'polite');
  toolbar.append(rowA, rowB, status);

  const button = (label: string, className: string, onClick: () => void, aria?: string): HTMLButtonElement => {
    const node = el('button', `station-button ${className}`);
    node.type = 'button';
    node.innerHTML = label;
    if (aria) node.setAttribute('aria-label', aria);
    node.addEventListener('click', onClick);
    return node;
  };

  const setDesign = (next: NailDesign): void => {
    if (next === design) return;
    design = next;
    view.setDesign(design);
    options.onChange(design);
  };

  const shapeButtons = SHAPES.map((shape) =>
    button(shapeIcon(shape), 'station-shape', () => {
      setDesign({ ...design, shape });
      refresh();
    }, t('station.shapeLabel', { shape: t(`station.shape.${shape}`) })),
  );
  const doneButton = button(t('station.done'), 'station-done', () => {
    if (done) return;
    const result = finish();
    status.textContent = t('station.doneMessage', { score: result.score });
    emitSound(result.moodDelta >= 0 ? 'moodUp' : 'moodDown');
    options.onDone(design, result);
  });
  const resetButton = button(t('station.reset'), 'station-reset', () => setDesign(emptyDesign(design.shape)));
  rowA.append(...shapeButtons, resetButton, doneButton);

  const toolButtons: Record<StationTool, HTMLButtonElement> = {
    polish: button(t('station.polish'), 'station-tool', () => selectTool('polish')),
    gradient: button(t('station.gradient'), 'station-tool', () => selectTool('gradient')),
    gem: button(t('station.gem'), 'station-tool', () => selectTool('gem')),
    sticker: button(t(`station.sticker.${sticker}`), 'station-tool', () => {
      // Tapping Sticker again cycles heart → star → flower.
      if (tool === 'sticker') {
        const kinds = NAIL_ART_CONFIG.stickers;
        sticker = kinds[(kinds.indexOf(sticker) + 1) % kinds.length] ?? sticker;
        toolButtons.sticker.innerHTML = t(`station.sticker.${sticker}`);
      }
      selectTool('sticker');
    }),
  };
  const swatches = NAIL_ART_CONFIG.palette.map((color) => {
    const swatch = button('', 'station-swatch', () => {
      if (tool === 'gradient') setDesign({ ...design, gradient: design.gradient === color.id ? null : color.id });
      else {
        setDesign({ ...design, base: color.id });
        if (tool !== 'polish') selectTool('polish');
      }
      refresh();
    }, t('station.colorLabel', { color: color.name[lang] }));
    swatch.style.background = color.hex;
    return swatch;
  });
  rowB.append(...Object.values(toolButtons), ...swatches);

  function selectTool(next: StationTool): void {
    tool = next;
    status.textContent = next === 'gradient' ? t('station.gradientOn') : t('station.hint');
    refresh();
  }

  function refresh(): void {
    shapeButtons.forEach((node, index) => node.setAttribute('aria-pressed', String(SHAPES[index] === design.shape)));
    (Object.keys(toolButtons) as StationTool[]).forEach((key) => toolButtons[key].setAttribute('aria-pressed', String(key === tool)));
    swatches.forEach((node, index) => {
      const id = NAIL_ART_CONFIG.palette[index]?.id;
      node.setAttribute('aria-pressed', String(tool === 'gradient' ? id === design.gradient : id === design.base));
    });
    toolbar.querySelectorAll('button').forEach((node) => {
      (node as HTMLButtonElement).disabled = done;
    });
  }

  // Touch layer: forwards pointer positions to the station (relative to the zone).
  const touch = el('div', 'station-touch hidden');
  touch.setAttribute('aria-hidden', 'true');
  let drawing = false;
  const forward = (event: PointerEvent, phase: 'down' | 'move'): void => {
    if (done) return;
    const box = touch.getBoundingClientRect();
    setDesign(view.pointer(event.clientX - box.left, event.clientY - box.top, phase, tool, sticker));
  };
  touch.addEventListener('pointerdown', (event) => {
    drawing = true;
    try {
      touch.setPointerCapture(event.pointerId);
    } catch {
      // Older browsers: the drag still paints while the finger stays on the station.
    }
    forward(event, 'down');
  });
  touch.addEventListener('pointermove', (event) => {
    if (drawing) forward(event, 'move');
  });
  const stop = (): void => {
    drawing = false;
  };
  touch.addEventListener('pointerup', stop);
  touch.addEventListener('pointercancel', stop);

  const relayout = (): void => {
    if (!open) return;
    const r = options.rect();
    const side = options.maiSide();
    // Leave room for the client's small face (top-left) and Mai's bubble (her corner).
    const left = 66;
    const right = side === 'right' ? 70 : 8;
    view.layout(r.left, r.top, r.width, r.height, side === 'left' ? Math.max(left, 70) : left, right);
    view.setDesign(design);
  };

  function finish(): MatchResult {
    done = true;
    refresh();
    return matchDesign(design, options.request);
  }

  refresh();
  return {
    toolbar,
    touch,
    setOpen(next) {
      open = next;
      toolbar.classList.toggle('hidden', !open);
      touch.classList.toggle('hidden', !open);
      view.container.visible = open;
      if (open) requestAnimationFrame(relayout);
    },
    relayout,
    design: () => design,
    finish,
    get done() {
      return done;
    },
    destroy() {
      view.destroy();
      toolbar.remove();
      touch.remove();
    },
  };
}

/** The client's game note line for the nails (story 005). */
export function nailsNote(design: NailDesign, result: MatchResult | null): string {
  const line = describeDesign(design);
  return result ? `finished: ${line}; matches what you asked for: ${result.score}/100` : `in progress: ${line}`;
}
