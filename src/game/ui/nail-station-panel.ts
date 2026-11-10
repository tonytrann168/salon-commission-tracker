import type { Container } from 'pixi.js';
import { getLanguage, t } from '../i18n';
import { NAIL_ART_CONFIG, emptyDesign } from '../nail-art/design';
import type { NailDesign, NailRequest, NailShape, PaletteColor, StickerKind } from '../nail-art/design';
import { describeDesign, matchDesign } from '../nail-art/match';
import type { MatchResult } from '../nail-art/match';
import { SHAPES, createStationView } from '../nail-art/station';
import type { StationTool, StationTools } from '../nail-art/station';
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
  /** Story 007: the colours on offer (free ones plus bought shop polishes) and the tool sizes (shop upgrades). */
  palette?: PaletteColor[];
  tools?: StationTools;
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

const HINT_MS = 3000;

export function createNailStation(options: NailStationOptions): NailStation {
  const view = createStationView(emptyDesign(SHAPES[1] ?? 'round'), options.tools);
  const palette = options.palette ?? NAIL_ART_CONFIG.palette.filter((colour) => !colour.shop);
  options.layer.addChild(view.container);
  view.container.visible = false;
  let design = emptyDesign(SHAPES[1] ?? 'round');
  let tool: StationTool = 'polish';
  let sticker: StickerKind = NAIL_ART_CONFIG.stickers[0] ?? 'heart';
  let open = false;
  let done = false;
  const lang = getLanguage();

  // One compact row (overseer, 320 px review): Shape | Colour | Art tabs, the active tab's options (scrolling, with
  // faded edges so it's clear there is more), and Done. The hint/status sits inside the hand area, not under it.
  const toolbar = el('div', 'station-tools hidden');
  const tabs = el('div', 'station-tabs');
  tabs.setAttribute('role', 'tablist');
  const optionsRow = el('div', 'station-row');
  const status = el('p', 'station-status show', t('station.hint'));
  status.setAttribute('aria-live', 'polite');
  // The hint floats over the hand (it would cover the thumb), so it shows for a few seconds after each change.
  let hideHint = 0;
  const say = (text: string, keep = false): void => {
    status.textContent = text;
    status.classList.add('show');
    window.clearTimeout(hideHint);
    if (!keep) hideHint = window.setTimeout(() => status.classList.remove('show'), HINT_MS);
  };
  type Tab = 'shape' | 'colour' | 'art';
  let tab: Tab = 'colour';

  const button = (label: string, className: string, onClick: () => void, aria?: string): HTMLButtonElement => {
    const node = el('button', `station-button ${className}`);
    node.type = 'button';
    node.innerHTML = label;
    if (aria) node.setAttribute('aria-label', aria);
    node.addEventListener('click', onClick);
    return node;
  };

  const spillCount = (d: NailDesign): number => d.spill.reduce((sum, cells) => sum + cells.length, 0);
  const setDesign = (next: NailDesign): void => {
    if (next === design) return;
    // Polish landed on the skin: say so once per slip, and point at Clean up (owner, 2026-11-10).
    if (spillCount(next) > spillCount(design) && tool !== 'cleanup' && !status.classList.contains('show')) say(t('station.spill'));
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
    say(t('station.doneMessage', { score: result.score }), true);
    emitSound(result.moodDelta >= 0 ? 'moodUp' : 'moodDown');
    options.onDone(design, result);
  });
  doneButton.setAttribute('aria-label', t('station.doneLabel'));
  const resetButton = button(t('station.reset'), 'station-reset', () => setDesign(emptyDesign(design.shape)), t('station.resetLabel'));

  const toolButtons: Record<StationTool, HTMLButtonElement> = {
    polish: button(t('station.polish'), 'station-tool', () => selectTool('polish')),
    gradient: button(`<span aria-hidden="true">🌈</span><span class="tab-text">${t('station.gradient').replace('🌈', '').trim()}</span>`, 'station-tool', () => selectTool('gradient'), t('station.gradient').replace('🌈', '').trim()),
    gem: button(t('station.gem'), 'station-tool', () => selectTool('gem')),
    cleanup: button(`<span aria-hidden="true">🧽</span><span class="tab-text">${t('station.cleanup')}</span>`, 'station-tool', () => selectTool('cleanup'), t('station.cleanup')),
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
  const swatches = palette.map((color) => {
    const swatch = button('', 'station-swatch', () => {
      if (tool === 'gradient') setDesign({ ...design, gradient: design.gradient === color.id ? null : color.id });
      else {
        if (tool !== 'polish') selectTool('polish');
        setDesign({ ...design, base: color.id });
      }
      refresh();
    }, t('station.colorLabel', { color: color.name[lang] }));
    swatch.style.background = color.hex;
    return swatch;
  });
  const tabButtons: Record<Tab, HTMLButtonElement> = {
    // Icon + word; narrow phones show the icon only (the word stays as the accessible name).
    shape: button(`<span class="tab-icon" aria-hidden="true">▢</span><span class="tab-text">${t('station.tab.shape')}</span>`, 'station-tab', () => selectTab('shape'), t('station.tab.shape')),
    colour: button(`<span class="tab-icon" aria-hidden="true">🎨</span><span class="tab-text">${t('station.tab.colour')}</span>`, 'station-tab', () => selectTab('colour'), t('station.tab.colour')),
    art: button(`<span class="tab-icon" aria-hidden="true">✨</span><span class="tab-text">${t('station.tab.art')}</span>`, 'station-tab', () => selectTab('art'), t('station.tab.art')),
  };
  Object.values(tabButtons).forEach((node) => node.setAttribute('role', 'tab'));
  tabs.append(...Object.values(tabButtons));
  toolbar.append(tabs, optionsRow, doneButton);

  function selectTab(next: Tab): void {
    tab = next;
    if (tab === 'shape') optionsRow.replaceChildren(...shapeButtons, resetButton);
    else if (tab === 'colour') optionsRow.replaceChildren(toolButtons.cleanup, toolButtons.gradient, ...swatches);
    else optionsRow.replaceChildren(toolButtons.gem, toolButtons.sticker);
    if (tab === 'colour' && tool !== 'gradient' && tool !== 'cleanup') tool = 'polish';
    if (tab === 'art' && tool !== 'gem' && tool !== 'sticker') tool = 'gem';
    optionsRow.scrollLeft = 0;
    refresh();
  }

  function selectTool(next: StationTool): void {
    // Gradient and Clean up toggle back to plain polish when tapped again.
    tool = (next === 'gradient' || next === 'cleanup') && tool === next ? 'polish' : next;
    say(tool === 'gradient' ? t('station.gradientOn') : tool === 'cleanup' ? t('station.cleanupOn') : t('station.hint'));
    refresh();
  }

  function refresh(): void {
    (Object.keys(tabButtons) as Tab[]).forEach((key) => tabButtons[key].setAttribute('aria-selected', String(key === tab)));
    shapeButtons.forEach((node, index) => node.setAttribute('aria-pressed', String(SHAPES[index] === design.shape)));
    (Object.keys(toolButtons) as StationTool[]).forEach((key) => toolButtons[key].setAttribute('aria-pressed', String(key === tool)));
    swatches.forEach((node, index) => {
      const id = palette[index]?.id;
      node.setAttribute('aria-pressed', String(tool === 'gradient' ? id === design.gradient : id === design.base));
    });
    toolbar.querySelectorAll('button').forEach((node) => {
      (node as HTMLButtonElement).disabled = done;
    });
  }

  // Touch layer: forwards pointer positions to the station (relative to the zone).
  const touch = el('div', 'station-touch hidden');
  touch.append(status);
  let drawing = false;
  const forward = (event: PointerEvent, phase: 'down' | 'move'): void => {
    if (done) return;
    const box = touch.getBoundingClientRect();
    setDesign(view.pointer(event.clientX - box.left, event.clientY - box.top, phase, tool, sticker));
  };
  touch.addEventListener('pointerdown', (event) => {
    // No text selection or native drag from a mouse stroke (either cancels the stroke part-way).
    event.preventDefault();
    drawing = true;
    try {
      touch.setPointerCapture(event.pointerId);
    } catch {
      // Older browsers: the drag still paints while the finger stays on the station.
    }
    forward(event, 'down');
  });
  touch.addEventListener('pointermove', (event) => {
    if (!drawing) return;
    // Every point the finger passed this frame, where the browser keeps them (the station also fills gaps).
    const points = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
    for (const point of points.length > 0 ? points : [event]) forward(point, 'move');
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
    // Leave room for Mai's bubble (her corner). The client's small face is top-left, where the hand is empty (the
    // thumb sits low), so only a little room is kept on that side unless Mai is there too.
    const left = side === 'left' ? 70 : 20;
    const right = side === 'right' ? 70 : 8;
    view.layout(r.left, r.top, r.width, r.height, left, right);
    view.setDesign(design);
  };

  function finish(): MatchResult {
    done = true;
    refresh();
    return matchDesign(design, options.request);
  }

  selectTab('colour');
  return {
    toolbar,
    touch,
    setOpen(next) {
      open = next;
      toolbar.classList.toggle('hidden', !open);
      touch.classList.toggle('hidden', !open);
      view.container.visible = open;
      if (open) {
        requestAnimationFrame(relayout);
        if (!done) say(status.textContent ?? t('station.hint'));
      }
    },
    relayout,
    design: () => design,
    finish,
    get done() {
      return done;
    },
    destroy() {
      window.clearTimeout(hideHint);
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
