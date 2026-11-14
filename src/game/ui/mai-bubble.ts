import { prefersReducedMotion } from '../comfort';
import { companionLook, companionName } from '../companion';
import type { BestieLanguage, BestieTransport } from '../bestie';
import { loadMemory } from '../bestie-memory';
import { t } from '../i18n';
import { EMPTY_TIPS, addTip, openTips, tipCueShown } from '../mai-tips';
import type { Tip } from '../mai-tips';
import { renderMascot } from '../mascot';
import type { MascotExpression } from '../mascot';
import { readStored, writeStored } from '../safe-storage';
import { getPlayerName } from '../settings';
import { emitSound } from '../sound-events';
import { TurnError } from '../types';
import type { EnglishLevel, Message, Phase } from '../types';
import { el } from './dom';
import { guardMessage } from './guard-message';
import './mai-bubble.css';

/**
 * Mai as an on-demand bubble (owner, 2026-11-10: "an available assistant, not a person who fixes the problem every
 * time"). A small round Mai sits in the portrait strip (so she never covers the newest line or the reply box) and can
 * be dragged to either side. Nothing pops up by itself: corrections wait behind a badge. Tapping her opens a small
 * panel over the top strip with her waiting tips, "Give me a hint" and "Help me say it". Stories 003 and 011.
 */

const SIDE_KEY = 'salon.maiSide';
const BUBBLE_PX = 56;
const PANEL_FACE_PX = 40;
/** Pointer travel (px) that turns a tap into a drag. */
const DRAG_PX = 8;

export interface MaiBubbleOptions {
  transport: BestieTransport;
  level: EnglishLevel;
  language: BestieLanguage;
  /** Offer "Give me a hint" (the Settings switch). */
  hints: boolean;
  /** At most this many tips per appointment (config/learning.json). */
  tipCap: number;
  current: () => { phase: Phase; mood: number; transcript: readonly Message[] };
  /** Open Help me say it (the same flow as its button). */
  onHelpMeSayIt: () => void;
  /** A tip was shown in the panel: its better line goes into the phrasebook. */
  onTipSeen: (tip: Tip) => void;
}

export interface MaiBubble {
  /** Mount inside the fixed top strip (it is positioned over it). */
  element: HTMLElement;
  /** Queue a correction: the badge counts it; nothing pops up. Returns false once the cap is reached. */
  queueTip: (tip: Tip) => boolean;
  /** Hint and Help me say it only while the player can type. */
  setEnabled: (enabled: boolean) => void;
  destroy: () => void;
}

export function createMaiBubble(options: MaiBubbleOptions): MaiBubble {
  const layer = el('div', 'mai-layer');
  const bubble = el('button', 'mai-bubble');
  bubble.type = 'button';
  const badge = el('span', 'mai-badge hidden');
  badge.setAttribute('aria-hidden', 'true');
  const panel = el('div', 'mai-panel hidden');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', companionName());
  const cue = el('span', 'mai-cue hidden', t('mai.tipCue'));
  cue.setAttribute('aria-hidden', 'true');
  layer.append(panel, bubble, cue);

  let queue = EMPTY_TIPS;
  let open = false;
  let enabled = true;
  let expression: MascotExpression = 'idle';
  let side: 'left' | 'right' = readStored(SIDE_KEY) === 'left' ? 'left' : 'right';
  let hintRequest = 0;

  const drawBubble = (): void => {
    const face = renderMascot(queue.unseen > 0 ? 'tipWaiting' : expression, BUBBLE_PX, { crop: 'bust', ...companionLook() });
    badge.textContent = String(queue.unseen);
    badge.classList.toggle('hidden', queue.unseen === 0);
    // Story 040: a waiting tip is hard to miss: a glow ring and a small label by the bubble (a bare number wasn't).
    const waiting = tipCueShown(queue, open);
    bubble.classList.toggle('has-tip', waiting);
    cue.classList.toggle('hidden', !waiting);
    bubble.replaceChildren(face, badge);
    bubble.setAttribute('aria-label', queue.unseen > 0 ? t('mai.openTips', { name: companionName(), count: queue.unseen }) : t('mai.open', { name: companionName() }));
    bubble.setAttribute('aria-expanded', String(open));
    layer.dataset.side = side;
  };

  const hintBox = el('div', 'mai-hint');
  hintBox.setAttribute('aria-live', 'polite');

  const tipView = (tip: Tip): HTMLElement => {
    const item = el('div', 'mai-tip');
    const praise = el('p', 'bestie-text', tip.praise);
    praise.lang = tip.language;
    const said = el('p', 'bestie-text');
    const saidText = el('span', '', tip.said);
    saidText.lang = 'en';
    said.append(el('span', 'bestie-label', `${t('learning.youSaid')}: `), saidText);
    const better = el('p', 'bestie-text');
    const betterText = el('strong', '', tip.better.en);
    betterText.lang = 'en';
    better.append(el('span', 'bestie-label', `→ ${t('learning.better')}: `), betterText);
    const reason = el('p', 'bestie-reason', tip.reason);
    reason.lang = tip.language;
    // Praise first (kind before correcting), then the Better line, so the key part is never the part cut off.
    item.append(praise, better, said, reason);
    return item;
  };

  const drawPanel = (): void => {
    const header = el('div', 'mai-panel-header');
    const close = el('button', 'chat-button secondary bestie-got-it', t('common.close'));
    close.type = 'button';
    close.addEventListener('click', () => setOpen(false));
    header.append(renderMascot(expression, PANEL_FACE_PX, { crop: 'full', ...companionLook() }), el('strong', 'mai-panel-name', companionName()), close);

    const tips = el('div', 'mai-tips');
    if (queue.tips.length > 0) {
      tips.append(el('span', 'bestie-label', t('mai.tipsTitle', { name: companionName() })), ...[...queue.tips].reverse().map(tipView));
    }

    const actions = el('div', 'mai-actions');
    if (options.hints) {
      const hint = el('button', 'chat-button secondary mai-hint-button', t('mai.hint'));
      hint.type = 'button';
      hint.disabled = !enabled;
      hint.addEventListener('click', askHint);
      actions.append(hint);
    }
    const help = el('button', 'chat-button secondary', t('help.button'));
    help.type = 'button';
    help.disabled = !enabled;
    help.addEventListener('click', () => {
      setOpen(false);
      options.onHelpMeSayIt();
    });
    actions.append(help);
    // Actions first: on a small phone they stay in view without scrolling the panel.
    panel.replaceChildren(header, actions, hintBox, ...(queue.tips.length > 0 ? [tips] : []));
    if (queue.tips.length === 0 && hintBox.childElementCount === 0) hintBox.replaceChildren(el('p', 'bestie-text mai-empty', t('mai.noTips')));
  };

  const setExpression = (next: MascotExpression): void => {
    expression = next;
    drawBubble();
    const face = panel.querySelector('.mai-panel-header .mascot');
    if (face) face.replaceWith(renderMascot(expression, PANEL_FACE_PX, { crop: 'full', ...companionLook() }));
  };

  function setOpen(next: boolean): void {
    open = next;
    if (open) {
      const opened = openTips(queue);
      queue = opened.queue;
      opened.fresh.forEach(options.onTipSeen);
      hintBox.replaceChildren();
      drawPanel();
      emitSound('whisper');
    } else {
      hintRequest++;
      expression = 'idle';
    }
    panel.classList.toggle('hidden', !open);
    drawBubble();
  }

  function askHint(): void {
    const mine = ++hintRequest;
    setExpression('thinking');
    hintBox.replaceChildren(el('p', 'chat-hint', t('bestie.thinking', { name: companionName() })));
    const now = options.current();
    options.transport
      .hint({ level: options.level, language: options.language, phase: now.phase, mood: now.mood, transcript: now.transcript, memory: loadMemory().summary, playerName: getPlayerName() })
      .then(
        ({ hint }) => {
          if (mine !== hintRequest) return;
          const text = el('p', 'bestie-text', hint);
          text.lang = options.language;
          hintBox.replaceChildren(text);
          setExpression('talking');
        },
        (error: unknown) => {
          if (mine !== hintRequest) return;
          const missing = error instanceof TurnError && error.code === 'missing_api_key';
          hintBox.replaceChildren(el('p', 'bestie-text', guardMessage(error) ?? t(missing ? 'bestie.unavailable' : 'bestie.hintFailed', { name: companionName() })));
          setExpression('idle');
        },
      );
  }

  // Tap opens or closes the panel; a drag moves Mai to the left or right corner (saved).
  let dragStart: { x: number; moved: boolean } | null = null;
  /** The click that ends a drag must not toggle the panel. */
  let suppressClick = false;
  bubble.addEventListener('pointerdown', (event) => {
    // A drag is not always followed by a click, so a stale flag must never swallow the next real tap.
    suppressClick = false;
    dragStart = { x: event.clientX, moved: false };
    try {
      bubble.setPointerCapture(event.pointerId);
    } catch {
      // Not supported: the drag still works while the pointer stays on the bubble.
    }
  });
  bubble.addEventListener('pointermove', (event) => {
    if (!dragStart) return;
    const dx = event.clientX - dragStart.x;
    if (Math.abs(dx) > DRAG_PX) dragStart.moved = true;
    if (dragStart.moved) bubble.style.transform = `translateX(${dx}px)`;
  });
  const endDrag = (event: PointerEvent): void => {
    if (!dragStart) return;
    const moved = dragStart.moved;
    dragStart = null;
    bubble.style.transform = '';
    if (!moved) return;
    suppressClick = true;
    const box = layer.getBoundingClientRect();
    side = event.clientX < box.left + box.width / 2 ? 'left' : 'right';
    writeStored(SIDE_KEY, side);
    drawBubble();
  };
  bubble.addEventListener('pointerup', endDrag);
  bubble.addEventListener('pointercancel', () => {
    dragStart = null;
    bubble.style.transform = '';
  });
  bubble.addEventListener('click', () => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    setOpen(!open);
  });

  // Tap outside the panel (and the bubble) closes it; the chat stays usable underneath.
  const onOutside = (event: PointerEvent): void => {
    if (!open) return;
    const target = event.target as Node;
    if (!panel.contains(target) && !bubble.contains(target)) setOpen(false);
  };
  document.addEventListener('pointerdown', onOutside, true);
  const onKey = (event: KeyboardEvent): void => {
    if (open && event.key === 'Escape') setOpen(false);
  };
  document.addEventListener('keydown', onKey);

  drawBubble();

  return {
    element: layer,
    queueTip(tip) {
      const next = addTip(queue, tip, options.tipCap);
      if (next === queue) return false;
      queue = next;
      if (open) setOpen(true);
      else {
        drawBubble();
        // One gentle bounce when a new tip arrives (not with reduced motion).
        if (!prefersReducedMotion()) {
          bubble.classList.remove('bounce');
          void bubble.offsetWidth;
          bubble.classList.add('bounce');
        }
      }
      return true;
    },
    setEnabled(next) {
      enabled = next;
      panel.querySelectorAll<HTMLButtonElement>('.mai-actions button').forEach((button) => {
        button.disabled = !next;
      });
    },
    destroy() {
      document.removeEventListener('pointerdown', onOutside, true);
      document.removeEventListener('keydown', onKey);
      layer.remove();
    },
  };
}
