import { buildReport, createReportLimiter } from '../error-report';
import type { ErrorReport } from '../error-report';
import { companionLook } from '../companion';
import { t } from '../i18n';
import { renderMascot } from '../mascot';
import { isChunkLoadError } from '../stale-build';
import { el } from './dom';
import './error-screen.css';

/**
 * Story 032: the global error screen and client error reports. An error the game did not catch shows a friendly,
 * companion-voiced screen: "Try again" reloads (progress is saved as you play, so it is safe); when the game was
 * already usable, "Keep playing" closes it. Chunk-load errors belong to the stale-build guard (story 018); browser
 * noise and other origins' errors are ignored.
 */

/** Errors that are not the game's fault, or that another part of the game already handles. */
export function isIgnorable(error: unknown, filename: string | undefined, origin: string): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/ResizeObserver loop/i.test(message)) return true;
  if (filename && !filename.startsWith(origin)) return true;
  if (isChunkLoadError(error)) return true;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  return false;
}

export function showErrorScreen(host: HTMLElement, canContinue: boolean): HTMLElement {
  document.querySelector('.error-screen')?.remove();
  const overlay = el('div', 'error-screen');
  overlay.setAttribute('role', 'alertdialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'error-title');
  const card = el('div', 'error-card');
  const title = el('h2', '', t('error.title'));
  title.id = 'error-title';
  let face: HTMLElement | null = null;
  try {
    face = renderMascot('worried', 96, companionLook());
  } catch {
    face = null;
  }
  const retry = el('button', 'chat-button', t('error.retry'));
  retry.type = 'button';
  retry.addEventListener('click', () => window.location.reload());
  const actions = el('div', 'feedback-actions');
  if (canContinue) {
    const keep = el('button', 'chat-button secondary', t('error.keepPlaying'));
    keep.type = 'button';
    keep.addEventListener('click', () => overlay.remove());
    actions.append(keep);
  }
  actions.append(retry);
  card.append(...(face ? [face] : []), title, el('p', '', t('error.line')), actions);
  overlay.append(card);
  host.append(overlay);
  retry.focus();
  return overlay;
}

export interface ErrorHandlingOptions {
  host: HTMLElement;
  version: string;
  /** Is the game showing something usable (a screen or the title)? Then "Keep playing" is offered. */
  usable: () => boolean;
  send?: (report: ErrorReport) => void;
}

const sendReport = (report: ErrorReport): void => {
  void fetch('/api/client-error', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(report), keepalive: true }).catch(() => undefined);
};

/** Listen for uncaught errors and rejected promises; returns `fail` for errors the caller catches itself (boot). */
export function installErrorHandling(options: ErrorHandlingOptions): (error: unknown) => void {
  const allow = createReportLimiter();
  const send = options.send ?? sendReport;
  const fail = (error: unknown, filename?: string): void => {
    if (isIgnorable(error, filename, location.origin)) return;
    const report = buildReport(error, options.version, location);
    if (allow(report)) send(report);
    showErrorScreen(options.host, options.usable());
  };
  window.addEventListener('error', (event) => fail(event.error ?? event.message, event.filename));
  window.addEventListener('unhandledrejection', (event) => fail(event.reason));
  return fail;
}
