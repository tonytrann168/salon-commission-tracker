import { ENGLISH_LEVELS_CONFIG, buildWordTiles, matchesTarget, shuffledWordTiles } from '../english-level';
import type { EnglishLevel, Translate } from '../types';
import { t } from '../i18n';
import { el } from './dom';
import './help-me-say-it.css';

/**
 * "Help me say it": the player types in Vietnamese, the server translates it, and the player produces the English
 * line themselves. Beginner taps shuffled word tiles in order; Some and above re-type it, and Send stays off until
 * the typing matches (game code, config tolerance). The sent line is the player's own. Story: story-010.
 */
export interface HelpMeSayItOptions {
  level: EnglishLevel;
  /** Injected transport. Only `vi-to-en` is asked for here. */
  translate: Translate;
  /** The finished English line. The caller sends it with `helped: true`. */
  onSend: (text: string) => void;
  onClose: () => void;
}

interface Tile {
  id: number;
  text: string;
}

/** Mount-ready overlay. The caller appends `element` and calls `focus()` once it is in the page. */
export function createHelpMeSayIt(options: HelpMeSayItOptions): { element: HTMLElement; focus: () => void } {
  const { level, translate, onSend, onClose } = options;
  const mode = ENGLISH_LEVELS_CONFIG.levels[level].helpMode;

  const overlay = el('div', 'help-sheet');
  const dialog = el('div', 'help-dialog');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'help-title');

  const header = el('div', 'help-header');
  const title = el('h2');
  title.id = 'help-title';
  title.textContent = t('help.button');
  const close = el('button', 'chat-button secondary', t('common.close'));
  close.type = 'button';
  header.append(title, close);

  const viLabel = el('label', 'help-label');
  viLabel.htmlFor = 'help-vi';
  viLabel.textContent = t('help.viLabel');
  const viInput = el('textarea', 'help-input');
  viInput.id = 'help-vi';
  viInput.lang = 'vi';
  viInput.rows = 3;
  viInput.placeholder = t('help.viPlaceholder', undefined, 'vi');
  viInput.autocapitalize = 'sentences';
  viInput.spellcheck = false;

  const translateButton = el('button', 'chat-button', t('help.translate'));
  translateButton.type = 'button';
  const status = el('p', 'help-status');
  status.setAttribute('aria-live', 'polite');

  const stage = el('div', 'help-stage');
  const sendButton = el('button', 'chat-button');
  sendButton.type = 'button';
  sendButton.disabled = true;
  sendButton.textContent = t('common.send');

  dialog.append(header, viLabel, viInput, translateButton, status, stage, sendButton);
  overlay.appendChild(dialog);

  /** What Send will send, or `null` while the line is not complete. */
  let ready: (() => string | null) | null = null;
  // A newer translate request or an edit makes older answers stale.
  let requestId = 0;

  const refreshSend = (): void => {
    sendButton.disabled = ready === null || ready() === null;
  };

  const resetStage = (): void => {
    stage.replaceChildren();
    ready = null;
    refreshSend();
  };

  const showRetype = (target: string): void => {
    const label = el('label', 'help-label');
    label.htmlFor = 'help-en';
    label.textContent = t('help.retypeLabel');
    const targetLine = el('p', 'help-target', target);
    targetLine.lang = 'en';
    const input = el('input', 'help-input');
    input.id = 'help-en';
    input.type = 'text';
    input.lang = 'en';
    input.autocomplete = 'off';
    input.autocapitalize = 'off';
    input.spellcheck = false;
    input.setAttribute('autocorrect', 'off');
    input.enterKeyHint = 'send';
    input.addEventListener('input', refreshSend);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !sendButton.disabled) sendButton.click();
    });
    stage.append(label, targetLine, input);
    ready = () => (matchesTarget(input.value, target) ? input.value.trim() : null);
    input.focus();
  };

  const showTiles = (target: string): void => {
    const correct = buildWordTiles(target);
    let available: Tile[] = shuffledWordTiles(target).map((text, id) => ({ id, text }));
    let placed: Tile[] = [];

    const label = el('p', 'help-label');
    label.textContent = t('help.tilesLabel');
    const lineLabel = el('p', 'help-label');
    lineLabel.textContent = t('help.yourLine');
    const line = el('div', 'help-tiles help-line');
    line.lang = 'en';
    line.setAttribute('role', 'group');
    const pool = el('div', 'help-tiles');
    pool.lang = 'en';
    pool.setAttribute('role', 'group');
    // Once every tile is placed, the whole English line is shown once so the learner sees it in one piece.
    const fullLine = el('p', 'help-target', target);
    fullLine.lang = 'en';
    fullLine.hidden = true;
    stage.append(label, pool, lineLabel, line, fullLine);

    const draw = (): void => {
      const tileButton = (tile: Tile, className: string, onTap: (button: HTMLButtonElement) => void, name?: string): HTMLButtonElement => {
        const button = el('button', `help-tile ${className}`, tile.text);
        button.type = 'button';
        if (name) button.setAttribute('aria-label', name);
        button.addEventListener('click', () => onTap(button));
        button.addEventListener('animationend', () => button.classList.remove('wiggle'));
        return button;
      };
      pool.replaceChildren(
        ...available.map((tile) =>
          tileButton(tile, 'pool', (button) => {
            // A wrong tile is a gentle no-op: it wiggles and nothing is placed.
            if (tile.text !== correct[placed.length]) {
              button.classList.add('wiggle');
              return;
            }
            available = available.filter((other) => other.id !== tile.id);
            placed = [...placed, tile];
            draw();
            pool.querySelector('button')?.focus();
          }),
        ),
      );
      line.replaceChildren(
        ...placed.map((tile, index) =>
          tileButton(tile, 'placed', () => {
            // The line is always a correct start, so removing a word also returns the words after it.
            available = [...available, ...placed.slice(index)];
            placed = placed.slice(0, index);
            draw();
          }, t('help.removeWord', { word: tile.text })),
        ),
      );
      fullLine.hidden = placed.length !== correct.length;
      refreshSend();
    };

    ready = () => (placed.length === correct.length ? placed.map((tile) => tile.text).join(' ') : null);
    draw();
  };

  const runTranslate = async (): Promise<void> => {
    const text = viInput.value.trim();
    if (text === '') return;
    const mine = ++requestId;
    resetStage();
    status.textContent = t('help.working');
    translateButton.disabled = true;
    let english: string | null = null;
    try {
      english = await translate(text, 'vi-to-en', level);
    } catch {
      english = null;
    }
    if (mine !== requestId) return;
    translateButton.disabled = false;
    if (english === null) {
      status.textContent = t('help.failed');
      return;
    }
    status.replaceChildren();
    if (mode === 'tiles') showTiles(english);
    else showRetype(english);
  };

  viInput.addEventListener('input', () => {
    // Editing the Vietnamese makes the shown English stale.
    requestId++;
    translateButton.disabled = false;
    status.replaceChildren();
    resetStage();
  });
  translateButton.addEventListener('click', () => void runTranslate());
  sendButton.addEventListener('click', () => {
    const line = ready?.();
    if (line) onSend(line);
  });
  close.addEventListener('click', onClose);
  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') onClose();
  });

  return { element: overlay, focus: () => viInput.focus() };
}
