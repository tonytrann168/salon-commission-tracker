import { createHangnailOverlay } from './hangnail-overlay';
import { haptic, prefersReducedMotion } from '../comfort';
import { clientGrammar } from '../types';
import type { ClientPronoun } from '../types';
import type { Container, Rectangle } from 'pixi.js';
import { getLanguage, t } from '../i18n';
import { NAIL_ART_CONFIG, NAIL_LENGTHS, emptyDesign, limbFor, nailsFor, paletteColor, removeAll } from '../nail-art/design';
import type { FixKind } from '../fix-requests';
import type { NailDesign, NailLength, NailRequest, NailShape, PaletteColor, StickerKind } from '../nail-art/design';
import { describeDesign, matchDesign } from '../nail-art/match';
import type { MatchResult } from '../nail-art/match';
import { SHAPES, createStationView } from '../nail-art/station';
import { STATION_STEPS, stepChecks, wantsArt } from '../nail-art/steps';
import { openHowTo } from './station-howto';
import { cottonPadIcon, cottonSwabIcon } from './clean-icons';
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
  /** Full-screen service: the height taken at the top by her face, her bubble and the order (measured). */
  topBand?: () => number;
  /** The design changed (for the client's game note). */
  onChange: (design: NailDesign) => void;
  /** The player tapped Done. */
  onDone: (design: NailDesign, result: MatchResult) => void;
  /** Story 007: the colours on offer (free ones plus bought shop polishes) and the tool sizes (shop upgrades). */
  palette?: PaletteColor[];
  /** Story 033: how many times the client may ask for a redo after Done (the "Colour redo" scenario). */
  redos?: number;
  /** Story 028: the sticker cycle (seasonal stickers while their season runs). */
  stickers?: StickerKind[];
  tools?: StationTools;
  /** Story 051: the lengths on offer (Extra long for hard clients). Default short, medium, long. */
  lengths?: NailLength[];
  /** The client's pronoun for the Done message ("her request" / "his request"). */
  clientPronoun?: ClientPronoun;
  /** Story 064 (hard clients): a hangnail on this nail (0-based over all nails), trimmed with the Nipper. */
  hangnail?: { nail: number; onTrim: (outcome: 'clean' | 'slip') => void; onFirstAid: () => void };
}

export interface NailStation {
  readonly canRedo: boolean;
  /** Story 051: the lengths on offer. */
  readonly lengths: readonly NailLength[];
  /** Story 050: what to photograph for the finished set (the hand on the stage, cropped to the fingers). */
  photoSource(): { target: Container; frame: Rectangle | null };
  /**
   * Story 048: she asked for a fix. The Fix it step shows (in Clean up's place) with the Remover, Remove all and the
   * right tool for the request; after Done (the colour redo) the station reopens for it.
   */
  openFix(kind: FixKind): void;
  /** Story 048: the Fix it step goes away (`fixed`: every request was fixed, the station says so). */
  closeFix(fixed?: boolean): void;
  /** Story 048: whether a fix tool (Clean up, Remover, Remove all) changed the nails since the last call. */
  takeFixAction(): boolean;
  /** Story 064: the hangnail is still there (never trimmed). */
  hangnailLeft(): boolean;
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

/** Story 051: a fingertip with its nail at a length (taller nail = longer). */
function lengthIcon(length: NailLength): string {
  const grow = { short: 0, medium: 3, long: 6, xlong: 9 }[length];
  const top = 10 - grow;
  return `<svg viewBox="0 0 24 26" width="22" height="24" aria-hidden="true"><rect x="5" y="11" width="14" height="15" rx="7" fill="#f3c9a9" stroke="#c98f6d" stroke-width="1.2"/><path d="M7.5 19 V${top + 4} Q7.5 ${top} 12 ${top} Q16.5 ${top} 16.5 ${top + 4} V19 Z" fill="#ffd1e3" stroke="#5a2e43" stroke-width="1.4"/></svg>`;
}

const HINT_MS = 3000;

/** Story 047: an icon with its word under it (the audience reads words more easily than icons). */
const labelled = (icon: string, word: string): string => `<span class="tab-icon" aria-hidden="true">${icon}</span><span class="tab-text">${word}</span>`;

export function createNailStation(options: NailStationOptions): NailStation {
  // Story 017: both hands (10 nails) when the client asks for it.
  const nails = nailsFor(options.request);
  // Story 024: a pedicure shows the foot (toes as fingers).
  // Story 051: the lengths on offer; the hand keeps room for the longest so it never jumps.
  const lengths = options.lengths ?? NAIL_LENGTHS.filter((l) => l !== 'xlong');
  // Overseer (051): the hand stays as big as it can: room only for the longest length she ordered (or the one picked).
  const longest = Math.max(1, ...(options.request.lengths ?? []).map((l) => NAIL_ART_CONFIG.lengths[l]));
  const view = createStationView(emptyDesign(SHAPES[1] ?? 'round', nails), options.tools, limbFor(options.request), longest);
  const palette = options.palette ?? NAIL_ART_CONFIG.palette.filter((colour) => !colour.shop);
  options.layer.addChild(view.container);
  view.container.visible = false;
  let design = emptyDesign(SHAPES[1] ?? 'round', nails);
  let tool: StationTool = 'polish';
  const stickerKinds = options.stickers ?? NAIL_ART_CONFIG.stickers;
  let sticker: StickerKind = stickerKinds[0] ?? 'heart';
  let open = false;
  let done = false;
  const lang = getLanguage();

  // One compact row (overseer, 320 px review): Shape | Colour | Art tabs, the active tab's options (scrolling, with
  // faded edges so it's clear there is more), and Done. The hint/status sits inside the hand area, not under it.
  const toolbar = el('div', 'station-tools hidden');
  // Story 049: the steps as a numbered path at the top of the toolbar (they are the tabs), with a ✓ on each step that
  // matches her order, and a one-line instruction for the current step under them.
  const tabs = el('div', 'station-tabs station-steps');
  tabs.setAttribute('role', 'tablist');
  const instruction = el('p', 'station-instruction');
  const optionsRow = el('div', 'station-row');
  // Story 049: the step's instruction is always in the toolbar, so the floating hint only shows short messages.
  const status = el('p', 'station-status');
  status.setAttribute('aria-live', 'polite');
  // The hint floats over the hand (it would cover the thumb), so it shows for a few seconds after each change.
  let hideHint = 0;
  const say = (text: string, keep = false): void => {
    status.textContent = text;
    status.classList.add('show');
    window.clearTimeout(hideHint);
    if (!keep) hideHint = window.setTimeout(() => status.classList.remove('show'), HINT_MS);
  };
  // Story 052: 'clean' is the clean-up mode (Rub, Clean edges), opened from Clean (the cotton pad) in the bottom row.
  type Tab = 'shape' | 'length' | 'colour' | 'art' | 'fix' | 'clean';
  let tab: Tab = 'colour';
  let stepTab: Tab = 'colour';

  const button = (label: string, className: string, onClick: () => void, aria?: string): HTMLButtonElement => {
    const node = el('button', `station-button ${className}`);
    node.type = 'button';
    node.innerHTML = label;
    if (aria) node.setAttribute('aria-label', aria);
    node.addEventListener('click', onClick);
    return node;
  };

  const spillCount = (d: NailDesign): number => d.spill.reduce((sum, cells) => sum + cells.length, 0);
  // Story 047: the spill count is compared only when the spill changed (same arrays → no recount).
  let changeTimer = 0;
  // Story 048: a fix tool changed the nails (read and reset by the chat panel).
  let fixActed = false;
  let fixKind: FixKind | null = null;
  const flushChange = (): void => {
    window.clearTimeout(changeTimer);
    changeTimer = 0;
    updateChecks();
    options.onChange(design);
  };
  // Story 052: Undo: the design before each stroke or tap (the last 20).
  const history: NailDesign[] = [];
  const remember = (): void => {
    history.push(design);
    if (history.length > 20) history.shift();
  };
  let busy = false;
  const setDesign = (next: NailDesign): void => {
    if (next === design) return;
    // Polish landed on the skin: say so once per slip, and point at Clean up (owner, 2026-11-10).
    if (next.spill !== design.spill && tool !== 'cleanup' && !status.classList.contains('show') && spillCount(next) > spillCount(design)) say(t('station.spill'));
    design = next;
    view.setDesign(design);
    // Story 047: the client's note about the nails is rebuilt at most every 250 ms (and when the finger lifts), not on
    // every movement.
    if (changeTimer === 0) changeTimer = window.setTimeout(flushChange, 250);
  };

  const shapeButtons = SHAPES.map((shape) =>
    button(shapeIcon(shape), 'station-shape', () => {
      if (design.shape !== shape) remember();
      setDesign({ ...design, shape });
      refresh();
    }, t('station.shapeLabel', { shape: t(`station.shape.${shape}`) })),
  );
  const lengthButtons = lengths.map((length) =>
    button(labelled(lengthIcon(length), t(`station.length.${length}`)), 'station-length', () => {
      if (design.length !== length) remember();
      setDesign({ ...design, length });
      flushChange();
      refresh();
    }, t('station.lengthLabel', { length: t(`station.length.${length}`) })),
  );
  // Story 033: a redo scenario lets the client ask once more after Done; story 048: the station then reopens on the
  // Fix it step (the latest design is the one that counts).
  let redosLeft = options.redos ?? 0;
  const doneButton = button(labelled('✓', t('station.doneLabel')), 'station-done', () => {
    if (done) return;
    const result = finish();
    haptic(30);
    say(t('station.doneMessage', { ...clientGrammar(options.clientPronoun), score: result.score }), true);
    emitSound(result.moodDelta >= 0 ? 'moodUp' : 'moodDown');
    options.onDone(design, result);
  });
  doneButton.setAttribute('aria-label', t('station.doneLabel'));
  const resetButton = button(t('station.reset'), 'station-reset', () => {
    remember();
    setDesign(emptyDesign(design.shape, nails, design.length));
    refresh();
  }, t('station.resetLabel'));

  const toolButtons: Record<StationTool, HTMLButtonElement> = {
    polish: button(t('station.polish'), 'station-tool', () => selectTool('polish')),
    gradient: button(`<span aria-hidden="true">🌈</span><span class="tab-text">${t('station.gradient').replace('🌈', '').trim()}</span>`, 'station-tool', () => selectTool('gradient'), t('station.gradient').replace('🌈', '').trim()),
    gem: button(t('station.gem'), 'station-tool', () => selectTool('gem')),
    cleanup: button(labelled(cottonPadIcon(), t('station.rubWord')), 'station-tool', () => selectTool('cleanup'), t('station.cleanup')),
    remover: button(labelled('🧴', t('station.removerWord')), 'station-tool station-remover', () => selectTool('remover'), t('station.remover')),
    tidy: button(labelled(cottonSwabIcon(), t('station.tidyWord')), 'station-tool station-tidy', () => selectTool('tidy'), t('station.tidyLabel')),
    sticker: button(t(`station.sticker.${sticker}`), 'station-tool', () => {
      // Tapping Sticker again cycles heart → star → flower.
      if (tool === 'sticker') {
        const kinds = stickerKinds;
        sticker = kinds[(kinds.indexOf(sticker) + 1) % kinds.length] ?? sticker;
        toolButtons.sticker.innerHTML = t(`station.sticker.${sticker}`);
      }
      selectTool('sticker');
    }),
  };
  const swatches = palette.map((color) => {
    const swatch = button('', 'station-swatch', () => {
      remember();
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
  const tabButtons: Record<Exclude<Tab, 'clean'>, HTMLButtonElement> = {
    // Story 049: a numbered step: its number, its word, and a ✓ once it matches her order (Art says "optional" when
    // she asked for no art).
    shape: stepButton('shape'),
    length: stepButton('length'),
    colour: stepButton('colour'),
    art: stepButton('art'),
    fix: button(labelled('🔧', t('station.fixWord')), 'station-tab station-fix', () => selectTab('fix'), t('station.fixLabel')),
  };
  function stepButton(step: 'shape' | 'length' | 'colour' | 'art'): HTMLButtonElement {
    const n = STATION_STEPS.indexOf(step) + 1;
    const optional = step === 'art' && !wantsArt(options.request);
    const node = button(
      `<span class="step-num" aria-hidden="true">${n}</span><span class="tab-text">${t(`station.tab.${step}`)}${optional ? `<small class="step-optional">${t('station.stepOptional')}</small>` : ''}</span><span class="step-check" aria-hidden="true">✓</span>`,
      'station-tab station-step',
      () => selectTab(step),
      t('station.stepLabel', { n, step: t(`station.tab.${step}`) }),
    );
    node.dataset.step = step;
    return node;
  }
  const removeAllButton = button(labelled('🫧', t('station.removeAll')), 'station-remove-all', () => {
    fixActed = true;
    remember();
    setDesign(removeAll(design));
    flushChange();
    refresh();
  }, t('station.removeAllLabel'));
  Object.values(tabButtons).forEach((node) => node.setAttribute('role', 'tab'));
  tabs.append(tabButtons.shape, tabButtons.length, tabButtons.colour, tabButtons.art);
  // Story 017: the hand switch, only for two-hand clients (one hand on the station at a time keeps the chat space).
  let hand: 0 | 1 = 0;
  // Story 024: feet for a pedicure.
  const foot = options.request.service === 'pedicure';
  const icon = foot ? '🦶' : '✋';
  const sideLabel = (side: 0 | 1): string => t(foot ? (side === 0 ? 'station.footRight' : 'station.footLeft') : side === 0 ? 'station.handRight' : 'station.handLeft');
  const handWord = (): string => t(foot ? 'station.footWord' : 'station.handWord');
  // Story 052: the hand switch floats over the hand (top left, where no nail is), so the bottom row keeps its room.
  const handButton = button(labelled(`${icon}1`, handWord()), 'station-hand station-hand-float', () => {
    hand = hand === 0 ? 1 : 0;
    view.setHand(hand);
    view.setDesign(design);
    const r = options.rect();
    placeHint(r.width, r.height);
    handButton.innerHTML = labelled(`${icon}${hand + 1}`, handWord());
    handButton.setAttribute('aria-label', sideLabel(hand));
    say(sideLabel(hand));
  }, sideLabel(0));
  // 035 fixes: two rows. Row 1: the selected tab's options at full width (the colours are in plain sight). Row 2: the
  // tabs, Clean up (always at hand), the hand switch and Done.
  const controls = el('div', 'station-controls');
  // Story 048: while a fix is asked for, Fix it takes Clean up's place (Clean up is inside it), so the row still fits.
  const fixSlot = el('div', 'station-fix-slot');
  // Story 052: Clean (the cotton pad) opens the clean-up mode (Rub, Clean edges); tapped again, back to the step.
  const cleanButton = button(labelled(cottonPadIcon(), t('station.cleanWord')), 'station-tool station-clean-mode', () => selectTab(tab === 'clean' ? stepTab : 'clean'), t('station.cleanup'));
  fixSlot.append(cleanButton);
  // Story 052: Undo the last stroke or tap.
  const undoButton = button(labelled('↶', t('station.undoWord')), 'station-undo', () => {
    const previous = history.pop();
    if (!previous || busy) return;
    setDesign(previous);
    flushChange();
    say(t('station.undone'));
    refresh();
  }, t('station.undoLabel'));
  // Story 049: "?" opens a 3-picture how-to.
  const howButton = button(labelled('?', t('station.howWord')), 'station-how', () => openHowTo(), t('station.howLabel'));
  controls.append(fixSlot, undoButton, howButton, doneButton);
  // 060: the row in a wrapper with a › while more is hidden to the right.
  const rowWrap = el('div', 'station-row-wrap');
  const more = el('button', 'station-row-more', '›');
  more.type = 'button';
  more.setAttribute('aria-label', t('station.more'));
  more.addEventListener('click', () => optionsRow.scrollBy({ left: optionsRow.clientWidth * 0.7, behavior: prefersReducedMotion() ? 'auto' : 'smooth' }));
  rowWrap.append(optionsRow, more);
  const checkMore = (): void => {
    rowWrap.classList.toggle('more', optionsRow.scrollWidth - optionsRow.clientWidth - optionsRow.scrollLeft > 6);
  };
  optionsRow.addEventListener('scroll', checkMore, { passive: true });
  new ResizeObserver(checkMore).observe(optionsRow);
  toolbar.append(tabs, rowWrap, controls);

  function selectTab(next: Tab): void {
    tab = next;
    if (next !== 'clean' && next !== 'fix') stepTab = next;
    if (tab === 'shape') optionsRow.replaceChildren(...shapeButtons, resetButton);
    else if (tab === 'length') optionsRow.replaceChildren(...lengthButtons);
    else if (tab === 'colour') optionsRow.replaceChildren(...swatches, toolButtons.gradient);
    else if (tab === 'art') optionsRow.replaceChildren(toolButtons.gem, toolButtons.sticker);
    else if (tab === 'clean') optionsRow.replaceChildren(toolButtons.cleanup, toolButtons.tidy, ...(nipperButton && hangnail?.left ? [nipperButton] : []));
    // Story 048: the fix tools; a colour fix also has the colours right there.
    else optionsRow.replaceChildren(...(fixKind === 'length' ? lengthButtons : []), toolButtons.remover, removeAllButton, toolButtons.cleanup, ...(fixKind === 'colour' ? swatches : []));
    if (tab === 'clean' && tool !== 'cleanup' && tool !== 'tidy') tool = 'cleanup';
    if ((tab === 'shape' || tab === 'length' || tab === 'colour') && (tool === 'cleanup' || tool === 'tidy' || tool === 'remover')) tool = 'polish';
    if (tab === 'colour' && tool !== 'gradient') tool = 'polish';
    if (tab === 'art' && tool !== 'gem' && tool !== 'sticker') tool = 'gem';
    if (tab === 'fix' && tool !== 'cleanup' && tool !== 'remover' && tool !== 'polish') tool = fixKind === 'edge' ? 'cleanup' : fixKind === 'colour' ? 'remover' : 'polish';
    instruction.textContent = tab === 'fix' ? t('station.step.fix') : tab === 'clean' ? t('station.step.clean') : t(`station.step.${tab}`, { n: STATION_STEPS.indexOf(tab) + 1 });
    if (aidButtons) optionsRow.replaceChildren(...aidButtons);
    optionsRow.scrollLeft = 0;
    requestAnimationFrame(checkMore);
    refresh();
  }

  function selectTool(next: StationTool): void {
    setNipper(false);
    // Gradient and Clean up toggle back to plain polish when tapped again.
    // In the clean-up mode, Rub and Clean edges stay chosen (one of them is always on).
    tool = (next === 'gradient' || next === 'remover' || (next === 'cleanup' && tab !== 'clean' && tab !== 'fix')) && tool === next ? 'polish' : next;
    if (tool === 'gradient' || tool === 'cleanup' || tool === 'remover' || tool === 'tidy') say(t(tool === 'gradient' ? 'station.gradientOn' : tool === 'cleanup' ? 'station.cleanupOn' : tool === 'tidy' ? 'station.tidyOn' : 'station.removerOn'));
    else status.classList.remove('show');
    refresh();
  }

  /** Story 049: the ✓ on each step that matches her order (updated with the design note, at most 4 times a second). */
  function updateChecks(): void {
    const checks = stepChecks(design, options.request);
    for (const step of STATION_STEPS) tabButtons[step].classList.toggle('matched', checks[step]);
  }

  function refresh(): void {
    updateChecks();
    (Object.keys(tabButtons) as Exclude<Tab, 'clean'>[]).forEach((key) => tabButtons[key].setAttribute('aria-selected', String(key === tab)));
    shapeButtons.forEach((node, index) => node.setAttribute('aria-pressed', String(SHAPES[index] === design.shape)));
    lengthButtons.forEach((node, index) => node.setAttribute('aria-pressed', String(lengths[index] === design.length)));
    (Object.keys(toolButtons) as StationTool[]).forEach((key) => toolButtons[key].setAttribute('aria-pressed', String(key === tool)));
    swatches.forEach((node, index) => {
      const id = palette[index]?.id;
      node.setAttribute('aria-pressed', String(tool === 'gradient' ? id === design.gradient : id === design.base));
    });
    toolbar.querySelectorAll('button').forEach((node) => {
      // Story 064: a first-aid step waiting for the one before stays off.
      (node as HTMLButtonElement).disabled = done || (node as HTMLElement).dataset.wait === '1';
    });
    cleanButton.setAttribute('aria-pressed', String(tab === 'clean'));
    undoButton.disabled = done || history.length === 0;
    handButton.disabled = done;
  }

  // Touch layer: forwards pointer positions to the station (relative to the zone).
  const touch = el('div', 'station-touch hidden');
  // Story 049: the step's instruction sits over the empty palm (no toolbar height taken); a short message (spill, a
  // tool) takes its place for a few seconds.
  touch.append(status, instruction, ...(nails > NAIL_ART_CONFIG.hand.fingers.length ? [handButton] : []));
  // Story 064 (hard clients): the hangnail and the Nipper (in the Clean row). With the Nipper on, the hand isn't painted.
  let nipper = false;
  /** Story 064: while first aid is on, its two steps are the tool row. */
  let aidButtons: HTMLElement[] | null = null;
  const nipperButton = options.hangnail ? button(labelled('✂️', t('hangnail.nipperWord')), 'station-tool station-nipper', () => setNipper(!nipper), t('hangnail.nipperLabel')) : null;
  function setNipper(on: boolean): void {
    nipper = on && !!hangnail?.left;
    touch.classList.toggle('nipping', nipper);
    nipperButton?.setAttribute('aria-pressed', String(nipper));
    if (nipper) say(t('hangnail.nipperOn'));
  }
  const perHand = NAIL_ART_CONFIG.hand.fingers.length;
  const hangnail = options.hangnail
    ? createHangnailOverlay({
        touch,
        box: () => (Math.floor((options.hangnail?.nail ?? 0) / perHand) === hand ? (view.nailBoxes()[(options.hangnail?.nail ?? 0) % perHand] ?? null) : null),
        nipperOn: () => nipper,
        hint: (text, keep) => say(text, keep),
        firstAid: (buttons) => {
          aidButtons = buttons;
          selectTab(tab);
        },
        onTrim: (outcome) => {
          setNipper(false);
          if (tab === 'clean') selectTab('clean');
          options.hangnail?.onTrim(outcome);
        },
        onFirstAid: () => options.hangnail?.onFirstAid(),
      })
    : null;
  let drawing = false;
  // Story 047: the layer's position is read once per stroke (not on every finger movement).
  let box: DOMRect | null = null;
  // Story 052: a polish brush under the finger while painting (its tip at the touch point, the handle leaning up and
  // away so it never hides the paint). Moved with a transform only; off with reduced motion.
  const brush = el('div', 'station-brush');
  brush.setAttribute('aria-hidden', 'true');
  const BRUSH_SVG = `<svg viewBox="0 0 40 80" width="30" height="60"><rect x="15" y="0" width="10" height="44" rx="4" fill="#3b2a33"/><rect x="14" y="40" width="12" height="12" rx="2" fill="#c9c2c6"/><path d="M14 52 H26 L22 76 Q20 80 18 76 Z" fill="var(--polish, #ff5c9a)" stroke="#5a2e43" stroke-width="1"/></svg>`;
  // Story 054: clean-up shows its own tool where the finger is: a cotton pad for Rub (centred on the touch, so the
  // player sees what is being wiped), a cotton swab for Clean edges (its tip at the touch point).
  const PAD_SVG = `<svg viewBox="0 0 60 60" width="44" height="44"><circle cx="30" cy="30" r="26" fill="#fffdfa" stroke="#d9cfc6" stroke-width="2"/><circle cx="30" cy="30" r="19" fill="none" stroke="#efe6dd" stroke-width="2" stroke-dasharray="3 4"/><circle cx="30" cy="30" r="9" fill="none" stroke="#efe6dd" stroke-width="2" stroke-dasharray="2 4"/></svg>`;
  const SWAB_SVG = `<svg viewBox="0 0 40 80" width="30" height="60"><rect x="18" y="4" width="4" height="60" rx="2" fill="#7ec8e3"/><ellipse cx="20" cy="70" rx="7" ry="9" fill="#fffdfa" stroke="#d9cfc6" stroke-width="1.5"/><ellipse cx="20" cy="6" rx="6" ry="7" fill="#fffdfa" stroke="#d9cfc6" stroke-width="1.5"/></svg>`;
  let brushKind: 'brush' | 'pad' | 'swab' | null = null;
  const brushOn = (): boolean => ((tool === 'polish' || tool === 'gradient') && design.base !== null || tool === 'cleanup' || tool === 'tidy') && document.documentElement.dataset.motion !== 'reduce' && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const setBrushKind = (): void => {
    const kind = tool === 'cleanup' ? 'pad' : tool === 'tidy' ? 'swab' : 'brush';
    if (kind === brushKind) return;
    brushKind = kind;
    brush.dataset.kind = kind;
    brush.innerHTML = kind === 'pad' ? PAD_SVG : kind === 'swab' ? SWAB_SVG : BRUSH_SVG;
  };
  setBrushKind();
  const moveBrush = (x: number, y: number): void => {
    brush.style.transform = brushKind === 'pad' ? `translate3d(${x}px, ${y}px, 0)` : `translate3d(${x}px, ${y}px, 0) rotate(28deg)`;
  };
  touch.append(brush);
  let strokeStart: NailDesign | null = null;
  const forward = (event: PointerEvent, phase: 'down' | 'move'): void => {
    if (done || busy || nipper) return;
    if (phase === 'down' || !box) box = touch.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    if (phase === 'down') strokeStart = design;
    // Story 048: a clean-up or remover stroke is the player acting on her fix (even where the skin is already clean).
    if (tool === 'cleanup' || tool === 'remover' || tool === 'tidy') fixActed = true;
    if (brushOn()) {
      if (phase === 'down') {
        setBrushKind();
        brush.style.setProperty('--polish', paletteColor(design.base)?.hex ?? '#ff5c9a');
        brush.classList.add('show');
      }
      moveBrush(x, y);
    }
    const next = view.pointer(x, y, phase, tool, sticker);
    if (tool === 'tidy' && next !== design) {
      // Story 052: Clean edges takes a moment (never free perfection): the station waits, then the nail is tidy.
      busy = true;
      toolbar.classList.add('busy');
      say(t('station.tidying'), true);
      window.setTimeout(() => {
        busy = false;
        toolbar.classList.remove('busy');
        remember();
        setDesign(next);
        flushChange();
        say(t('station.tidied'));
        refresh();
      }, NAIL_ART_CONFIG.tidy.seconds * 1000);
      return;
    }
    setDesign(next);
  };
  touch.addEventListener('pointerdown', (event) => {
    // Story 052: the floating hand switch is a button over the hand, not paint.
    if ((event.target as Element | null)?.closest?.('button')) return;
    // No text selection or native drag from a mouse stroke (either cancels the stroke part-way).
    event.preventDefault();
    drawing = true;
    // Story 047: decorative animations pause while a finger paints (they cost frames on a mid-range phone).
    document.documentElement.classList.add('painting');
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
    box = null;
    brush.classList.remove('show');
    // Story 052: the stroke (or tap) is one Undo step.
    if (strokeStart && strokeStart !== design) {
      history.push(strokeStart);
      if (history.length > 20) history.shift();
      refresh();
    }
    strokeStart = null;
    document.documentElement.classList.remove('painting');
    flushChange();
  };
  touch.addEventListener('pointerup', stop);
  touch.addEventListener('pointercancel', stop);

  const relayout = (): void => {
    if (!open) return;
    const r = options.rect();
    const side = options.maiSide();
    // Leave room for Mai's bubble (her corner). The client's small face is top-left, where the hand is empty (the
    // thumb sits low), so only a little room is kept on that side unless Mai is there too.
    // Story 035: a tall zone is the full-screen service: the hand uses the width, below a band for her face and bubble.
    // The full-screen service (story 049: the steps make the toolbar taller, so the hand zone can be under 300 px).
    const tall = r.height >= 220;
    const left = tall ? 8 : side === 'left' ? 70 : 20;
    const right = tall ? 8 : side === 'right' ? 70 : 8;
    const band = tall ? Math.max(84, options.topBand?.() ?? 138) : 0;
    view.layout(r.left, r.top, r.width, r.height, left, right, band);
    // Story 052: the hand switch sits just under her bubble and the order, at the left (no nail there).
    handButton.style.top = `${band + 4}px`;
    view.setDesign(design);
    placeHint(r.width, r.height);
    hangnail?.place();
  };

  /**
   * Put the hint along the bottom of the hand area in the widest gap that no nail reaches (overseer, 2026-11-10: on
   * the mirrored left hand a fixed spot covered the thumb). Computed from the nails' boxes, so it works for both hands.
   */
  function placeHint(width: number, height: number): void {
    const margin = 6;
    const hintHeight = Math.max(30, status.offsetHeight || 34, instruction.offsetHeight);
    const top = height - 3 - hintHeight;
    const blocked = view
      .nailBoxes()
      .filter((box) => box.bottom > top - 2)
      .map((box) => [box.left - 4, box.right + 4] as const)
      .sort((a, b) => a[0] - b[0]);
    let best: [number, number] = [margin, margin];
    let x = margin;
    for (const [from, to] of [...blocked, [width - margin, width - margin] as const]) {
      if (from - x > best[1] - best[0]) best = [x, Math.max(x, from)];
      x = Math.max(x, to);
    }
    // Keep a sensible width; if the gap is too narrow the hint spans the bottom (it only shows for a few seconds).
    if (best[1] - best[0] < 140) best = [margin, width - margin];
    status.style.left = instruction.style.left = `${best[0]}px`;
    status.style.right = instruction.style.right = `${width - best[1]}px`;
  }

  function finish(): MatchResult {
    // A pending "in progress" note must not land after the finished one.
    window.clearTimeout(changeTimer);
    changeTimer = 0;
    done = true;
    refresh();
    return matchDesign(design, options.request);
  }

  selectTab('colour');
  return {
    toolbar,
    touch,
    hangnailLeft: () => hangnail?.left ?? false,
    setOpen(next) {
      open = next;
      toolbar.classList.toggle('hidden', !open);
      touch.classList.toggle('hidden', !open);
      view.container.visible = open;
      if (open) {
        requestAnimationFrame(relayout);
        if (!done && status.textContent) say(status.textContent);
      }
    },
    relayout,
    lengths,
    photoSource: () => ({ target: view.container, frame: view.photoFrame() }),
    design: () => design,
    openFix(kind) {
      if (done) {
        if (redosLeft > 0) redosLeft -= 1;
        done = false;
      }
      fixKind = kind;
      toolbar.classList.add('fixing');
      fixSlot.replaceChildren(tabButtons.fix);
      tabButtons.fix.classList.remove('pulse');
      void tabButtons.fix.offsetWidth;
      tabButtons.fix.classList.add('pulse');
      tool = kind === 'edge' ? 'cleanup' : kind === 'colour' ? 'remover' : 'polish';
      selectTab('fix');
      // 064 review: while first aid is open, its step hint stays (the Fix it step waits in the steps).
      if (!aidButtons) say(t(`station.fixAsk.${kind}`, clientGrammar(options.clientPronoun)), true);
    },
    closeFix(fixed = true) {
      if (fixKind === null) return;
      fixKind = null;
      toolbar.classList.remove('fixing');
      fixSlot.replaceChildren(cleanButton);
      if (tool === 'remover') tool = 'polish';
      if (tab === 'fix') selectTab('colour');
      else refresh();
      if (fixed) say(t('station.fixed', clientGrammar(options.clientPronoun)));
    },
    takeFixAction() {
      const acted = fixActed;
      fixActed = false;
      return acted;
    },
    finish,
    get done() {
      return done;
    },
    /** Story 035: Done was tapped and a redo is still allowed (the client asks for it). */
    get canRedo() {
      return done && redosLeft > 0;
    },
    destroy() {
      hangnail?.destroy();
      window.clearTimeout(hideHint);
      view.destroy();
      toolbar.remove();
      touch.remove();
    },
  };
}

/** The client's game note line for the nails (story 005). */
export function nailsNote(design: NailDesign, result: MatchResult | null, service?: 'manicure' | 'pedicure'): string {
  const line = describeDesign(design, undefined, service);
  return result ? `finished: ${line}; matches what you asked for: ${result.score}/100` : `in progress: ${line}`;
}
