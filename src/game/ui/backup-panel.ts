import { applyBackup, collect, makeBackup, readBackup, summarize } from '../backup';
import type { BackupContents, BackupProblem } from '../backup';
import { t } from '../i18n';
import type { StringKey } from '../i18n';
import { el } from './dom';
import { qrMatrix, qrPath } from '../backup-qr';
import './feedback.css';

/**
 * Story 020: "Back up my progress" and "Restore from code" (Settings), and the restore sheet the first-run screen
 * offers ("Played in Safari before?"). Restoring always asks first, then reloads.
 */

const button = (label: string, className = 'chat-button secondary'): HTMLButtonElement => {
  const b = el('button', className, label);
  b.type = 'button';
  return b;
};

/** The Settings section: back up (copy or save as a file) and restore. */
export function createBackupSection(host: HTMLElement): HTMLElement {
  const section = el('section', 'backup-section');
  const status = el('p', 'setting-note');
  status.setAttribute('aria-live', 'polite');
  const backUp = button(t('backup.make'));
  const out = el('textarea', 'help-input backup-code');
  out.readOnly = true;
  out.rows = 3;
  out.hidden = true;
  out.setAttribute('aria-label', t('backup.codeLabel'));
  const copy = button(t('backup.copy'));
  const save = button(t('backup.saveFile'));
  copy.hidden = true;
  save.hidden = true;
  // Story 027: the same code as a QR code, for another phone's camera.
  const qr = el('figure', 'backup-qr');
  qr.hidden = true;
  backUp.addEventListener('click', async () => {
    status.textContent = '';
    try {
      out.value = await makeBackup(collect(localStorage));
    } catch {
      status.textContent = t('backup.makeFailed');
      return;
    }
    out.hidden = false;
    copy.hidden = false;
    save.hidden = false;
    status.textContent = t('backup.made');
    drawQr(qr, out.value);
  });
  copy.addEventListener('click', async () => {
    out.select();
    try {
      await navigator.clipboard.writeText(out.value);
      status.textContent = t('backup.copied');
    } catch {
      status.textContent = t('backup.copyByHand');
    }
  });
  save.addEventListener('click', () => {
    const link = el('a');
    link.href = URL.createObjectURL(new Blob([out.value], { type: 'text/plain' }));
    link.download = `salon-besties-backup-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  });
  const restore = button(t('backup.restore'));
  restore.addEventListener('click', () => openRestoreSheet(host));
  section.append(el('h2', '', t('backup.title')), el('p', 'setting-note', t('backup.note')), backUp, out, copy, save, status, qr, restore);
  return section;
}

/** Draw the code as a QR (an SVG built here; no network), or say it is too long for one. */
function drawQr(figure: HTMLElement, code: string): void {
  const matrix = qrMatrix(code);
  figure.hidden = false;
  if (!matrix) {
    figure.replaceChildren(el('figcaption', 'setting-note', t('backup.qrTooLong')));
    return;
  }
  const { size, d } = qrPath(matrix);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', t('backup.qrLabel'));
  svg.setAttribute('shape-rendering', 'crispEdges');
  const bg = document.createElementNS(ns, 'rect');
  bg.setAttribute('width', String(size));
  bg.setAttribute('height', String(size));
  bg.setAttribute('fill', '#fff');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', '#000');
  svg.append(bg, path);
  figure.replaceChildren(svg, el('figcaption', 'setting-note', t('backup.qrNote')));
}

/** Paste or open a backup, check it, show what it holds, confirm, restore, reload. */
export function openRestoreSheet(host: HTMLElement, onRestored: () => void = () => window.location.reload()): HTMLElement {
  const overlay = el('div', 'feedback-overlay');
  const sheet = el('section', 'feedback-sheet');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-labelledby', 'restore-title');
  const title = el('h2', '', t('backup.restoreTitle'));
  title.id = 'restore-title';
  const input = el('textarea', 'help-input backup-code');
  input.rows = 4;
  input.placeholder = t('backup.pastePlaceholder');
  input.setAttribute('aria-label', t('backup.codeLabel'));
  const file = el('input');
  file.type = 'file';
  file.accept = '.txt,text/plain';
  file.className = 'backup-file';
  file.setAttribute('aria-label', t('backup.openFile'));
  file.addEventListener('change', async () => {
    const chosen = file.files?.[0];
    if (chosen) input.value = await chosen.text();
  });
  const status = el('p', 'setting-note feedback-status');
  status.setAttribute('role', 'alert');
  const check = button(t('backup.check'), 'chat-button');
  const cancel = button(t('common.back'));
  const close = (): void => overlay.remove();
  cancel.addEventListener('click', close);
  let found: BackupContents | null = null;
  const confirmBox = el('div', 'backup-confirm');
  confirmBox.hidden = true;
  const replace = button(t('backup.replace'), 'chat-button');
  replace.addEventListener('click', () => {
    if (!found) return;
    applyBackup(localStorage, found);
    status.textContent = t('backup.restored');
    onRestored();
  });
  check.addEventListener('click', async () => {
    status.textContent = '';
    confirmBox.hidden = true;
    const result = await readBackup(input.value);
    if (!result.ok) {
      found = null;
      status.textContent = t(`backup.problem.${result.problem}` as StringKey & `backup.problem.${BackupProblem}`);
      return;
    }
    found = result.contents;
    const s = summarize(result.contents);
    confirmBox.replaceChildren(
      el('p', '', t('backup.holds', { date: s.at.slice(0, 10), appointments: s.appointments, phrases: s.phrases, companion: s.companion ?? '—' })),
      el('p', 'results-note bad', t('backup.warning')),
      replace,
    );
    confirmBox.hidden = false;
  });
  const actions = el('div', 'feedback-actions');
  actions.append(cancel, check);
  sheet.append(title, el('p', 'setting-note', t('backup.restoreNote')), input, file, status, confirmBox, actions);
  overlay.append(sheet);
  host.append(overlay);
  input.focus();
  return overlay;
}
