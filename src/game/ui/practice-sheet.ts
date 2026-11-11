import { afterPractice } from '../bestie-memory';
import { gainFriendship } from './friendship';
import { t } from '../i18n';
import type { EnglishLevel } from '../types';
import { checkPronunciation, VoiceError } from '../voice';
import type { VoiceIO } from '../voice';
import { el } from './dom';
import { failureMessage } from './mic-button';
import './voice.css';

/**
 * Pronunciation practice (story 004): hear a line, say it, and see which words came through clearly (the free
 * word-level check), then try again. Opened from the phrasebook, the recap and review, or the player's last line.
 */
export function openPracticeSheet(host: HTMLElement, options: { voice: VoiceIO; line: string; level: EnglishLevel }): void {
  const { voice, line, level } = options;
  const previousFocus = document.activeElement as HTMLElement | null;
  const overlay = el('div', 'help-sheet practice-sheet');
  const dialog = el('div', 'help-dialog');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'practice-title');

  const header = el('div', 'help-header');
  const title = el('h2', '', t('practice.title'));
  title.id = 'practice-title';
  const close = el('button', 'chat-button secondary', t('common.close'));
  close.type = 'button';
  header.append(title, close);

  const target = el('p', 'practice-line');
  target.lang = 'en';
  const words = (checks?: { word: string; heard: boolean }[]): void => {
    target.replaceChildren(
      ...(checks ?? line.trim().split(/\s+/).map((word) => ({ word, heard: false }))).map((check, index) => {
        const span = el('span', checks ? (check.heard ? 'practice-word heard' : 'practice-word missed') : 'practice-word', check.word);
        if (checks) span.setAttribute('aria-label', `${check.word}: ${t(check.heard ? 'practice.heard' : 'practice.notHeard')}`);
        return index === 0 ? span : [document.createTextNode(' '), span];
      }).flat(),
    );
  };
  words();

  const actions = el('div', 'practice-actions');
  const listen = el('button', 'chat-button secondary', `🔊 ${t('practice.listen')}`);
  listen.type = 'button';
  listen.disabled = !voice.canSpeak;
  const say = el('button', 'chat-button', `🎤 ${t('practice.say')}`);
  say.type = 'button';
  actions.append(listen, say);
  const heard = el('p', 'practice-heard');
  heard.lang = 'en';
  const status = el('p', 'help-status');
  status.setAttribute('aria-live', 'polite');
  const note = el('p', 'practice-note', t('practice.note'));

  dialog.append(header, target, actions, heard, status, note);
  overlay.appendChild(dialog);

  let session: { stop: () => void } | null = null;
  listen.addEventListener('click', () => void voice.speak(line, { level }));
  say.addEventListener('click', () => {
    if (session) {
      session.stop();
      return;
    }
    if (!voice.canListen) {
      status.textContent = failureMessage('unsupported');
      return;
    }
    voice.cancelSpeech();
    words();
    heard.textContent = '';
    status.textContent = t('voice.listening');
    say.classList.add('listening');
    const current = voice.listen((partial) => {
      heard.textContent = partial;
    });
    session = current;
    current.result.then(
      (text) => {
        session = null;
        say.classList.remove('listening');
        say.textContent = `🎤 ${t('practice.again')}`;
        heard.textContent = text;
        const checks = checkPronunciation(line, text);
        words(checks);
        const count = checks.filter((check) => check.heard).length;
        // Story 013: practising out loud adds a little friendship.
        if (count > 0) gainFriendship((memory) => afterPractice(memory));
        status.textContent = t(count === checks.length ? 'practice.heardAll' : count === 0 ? 'practice.heardNone' : 'practice.heardSome');
      },
      (error: unknown) => {
        session = null;
        say.classList.remove('listening');
        status.textContent = failureMessage(error instanceof VoiceError ? error.reason : 'failed');
      },
    );
  });

  const done = (): void => {
    session?.stop();
    voice.cancelSpeech();
    overlay.remove();
    previousFocus?.focus();
  };
  close.addEventListener('click', done);
  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') done();
  });
  host.appendChild(overlay);
  say.focus();
}

/** A small "🎤 Practise" button for a line. */
export function practiceButton(line: string, onPractice: (line: string) => void): HTMLButtonElement {
  const button = el('button', 'practice-button', `🎤 ${t('practice.button')}`);
  button.type = 'button';
  button.setAttribute('aria-label', t('practice.buttonLabel', { line }));
  button.addEventListener('click', () => onPractice(line));
  return button;
}
