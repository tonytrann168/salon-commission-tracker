import { prefersReducedMotion, haptic } from '../comfort';
import { getHelpLanguage } from '../settings';
import { t } from '../i18n';
import { loadRecent, remember, saveRecent } from '../fresh-lines';
import { PREP_CONFIG, isFinished, prepOutcome, startPrep, stepPrep } from '../nail-art/prep';
import type { Prep, PrepEvent } from '../nail-art/prep';
import type { Difficulty } from '../types';
import { el } from './dom';
import './pedicure-prep.css';

/**
 * Story 026: soak & scrub over the foot area, before the paint tools. Tap Start → the soak timer fills (delta time) →
 * swipe back and forth (or tap Scrub) → the client's reaction → `onFinish` with the mood change.
 */
export interface PrepOverlay {
  element: HTMLElement;
  destroy(): void;
}

const LINE_MS = 2600;

export function createPrepOverlay(options: { difficulty: Difficulty; onFinish: (moodDelta: number, line: string) => void; roll?: number }): PrepOverlay {
  const box = el('div', 'pedi-prep');
  box.setAttribute('role', 'group');
  const title = el('p', 'pedi-prep-title');
  const note = el('p', 'pedi-prep-note');
  note.setAttribute('aria-live', 'polite');
  const bar = el('div', 'pedi-prep-bar');
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  const fill = el('div', 'pedi-prep-fill');
  bar.append(fill);
  const actions = el('div', 'pedi-prep-actions');
  const button = (label: string, className: string, onClick: () => void): HTMLButtonElement => {
    const b = el('button', className, label);
    b.type = 'button';
    b.addEventListener('click', (event) => {
      event.stopPropagation();
      onClick();
    });
    return b;
  };
  const skip = button(t('prep.skip'), 'chat-button secondary pedi-skip', () => send({ type: 'skip' }));
  const start = button(t('prep.start'), 'chat-button pedi-start', () => send({ type: 'start' }));
  const tap = button(t('prep.scrubTap'), 'chat-button pedi-scrub', () => {
    bubble(box.clientWidth / 2 + (Math.random() - 0.5) * 60, box.clientHeight / 2);
    send({ type: 'scrub', widths: PREP_CONFIG.scrubTapWidths });
  });

  let prep: Prep = startPrep(options.difficulty);
  let frame = 0;
  let last = 0;
  let ended = false;
  let finishTimer = 0;

  const draw = (): void => {
    box.dataset.step = prep.state;
    const pct = Math.round(prep.progress * 100);
    fill.style.width = `${pct}%`;
    bar.setAttribute('aria-valuenow', String(pct));
    if (prep.state === 'ready') {
      title.textContent = t('prep.soakTitle');
      note.textContent = t('prep.soakNote');
      bar.setAttribute('aria-label', t('prep.soakTitle'));
      actions.replaceChildren(...(prep.canSkip ? [skip] : []), start);
    } else if (prep.state === 'soaking') {
      title.textContent = t('prep.soakTitle');
      note.textContent = t('prep.soaking');
      actions.replaceChildren(...(prep.canSkip ? [skip] : []));
    } else if (prep.state === 'scrubbing') {
      title.textContent = t('prep.scrubTitle');
      note.textContent = t('prep.scrubNote');
      bar.setAttribute('aria-label', t('prep.scrubTitle'));
      actions.replaceChildren(...(prep.canSkip ? [skip] : []), tap);
    }
  };

  const loop = (time: number): void => {
    const seconds = last ? Math.min(0.25, (time - last) / 1000) : 0;
    last = time;
    send({ type: 'tick', seconds });
    if (prep.state === 'soaking') frame = requestAnimationFrame(loop);
  };

  function send(event: PrepEvent): void {
    if (ended) return;
    const before = prep.state;
    prep = stepPrep(prep, event);
    if (prep.state === 'soaking' && before === 'ready') {
      last = 0;
      frame = requestAnimationFrame(loop);
    }
    if (prep.state === 'scrubbing' && before === 'soaking') haptic(20);
    if (isFinished(prep)) return end();
    draw();
  }

  function end(): void {
    ended = true;
    cancelAnimationFrame(frame);
    // Story 033: the client's reaction doesn't repeat the last ones.
    const kind = `pedi.${prep.state}`;
    const recent = loadRecent(kind);
    const outcome = prepOutcome(prep, options.roll ?? Math.random(), PREP_CONFIG, recent);
    if (!outcome) return;
    saveRecent(kind, remember(recent, outcome.pick, 3));
    if (prep.state === 'done') haptic([20, 40, 20]);
    const line = el('p', 'pedi-prep-line', outcome.line.en);
    line.lang = 'en';
    if (getHelpLanguage() === 'full') {
      const vi = el('small', '', outcome.line.vi);
      vi.lang = 'vi';
      line.append(vi);
    }
    line.setAttribute('role', 'status');
    box.dataset.step = prep.state;
    box.replaceChildren(line);
    finishTimer = window.setTimeout(() => {
      box.remove();
      options.onFinish(outcome.moodDelta, outcome.line.en);
    }, LINE_MS);
  }

  function bubble(x: number, y: number): void {
    if (prefersReducedMotion()) return;
    const b = el('span', 'pedi-bubble', '🫧');
    b.setAttribute('aria-hidden', 'true');
    b.style.left = `${x}px`;
    b.style.top = `${y}px`;
    box.append(b);
    window.setTimeout(() => b.remove(), 700);
  }

  // Swipe to scrub: the distance moved sideways (and a little up/down), in widths of the area.
  let lastX: number | null = null;
  let lastY = 0;
  let spawned = 0;
  box.addEventListener('pointerdown', (event) => {
    // A press on Skip / Scrub stays a button press (capturing it would swallow the click).
    if (prep.state !== 'scrubbing' || (event.target as Element | null)?.closest('button')) return;
    lastX = event.clientX;
    lastY = event.clientY;
    box.setPointerCapture?.(event.pointerId);
  });
  box.addEventListener('pointermove', (event) => {
    if (prep.state !== 'scrubbing' || lastX === null) return;
    const distance = Math.abs(event.clientX - lastX) + Math.abs(event.clientY - lastY) * 0.5;
    lastX = event.clientX;
    lastY = event.clientY;
    const width = Math.max(1, box.clientWidth);
    spawned += distance;
    if (spawned > 40) {
      spawned = 0;
      const r = box.getBoundingClientRect();
      bubble(event.clientX - r.left, event.clientY - r.top);
    }
    send({ type: 'scrub', widths: distance / width });
  });
  const up = (): void => {
    lastX = null;
  };
  box.addEventListener('pointerup', up);
  box.addEventListener('pointercancel', up);

  box.append(title, note, bar, actions);
  draw();
  return {
    element: box,
    destroy() {
      ended = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(finishTimer);
      box.remove();
    },
  };
}
