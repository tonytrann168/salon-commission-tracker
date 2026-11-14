import { t } from '../i18n';
import { VoiceError } from '../voice';
import type { ListenFailure, VoiceIO } from '../voice';
import { el } from './dom';
import './voice.css';

/**
 * The mic button: tap to start listening, tap again to stop (tap-to-toggle works on every phone; holding is awkward
 * with a thumb on the keyboard). Words appear as they are heard. On a block or failure, a clear message and typing
 * still works. Story: story-004.
 */

export const failureMessage = (reason: ListenFailure): string =>
  t(reason === 'unsupported' ? 'voice.unsupported' : reason === 'blocked' ? 'voice.blocked' : reason === 'no-speech' ? 'voice.noSpeech' : 'voice.failed');

export interface MicButtonOptions {
  voice: VoiceIO;
  /** Words heard so far, while listening. */
  onPartial: (text: string) => void;
  /** The final words. */
  onText: (text: string) => void;
  /** A message to show the player ('' clears it). */
  onStatus: (message: string) => void;
  /** Called when listening starts (stop the client talking). */
  onStart?: () => void;
}

export function createMicButton(options: MicButtonOptions): { element: HTMLButtonElement; stop: () => void; setAgain: (again: boolean) => void } {
  // Story 046: the icon with a word (the audience reads words more easily than icons).
  const button = el('button', 'chat-button mic-button', `🎤 ${t('voice.micWord')}`);
  button.type = 'button';
  button.setAttribute('aria-label', t('voice.micLabel'));
  button.setAttribute('aria-pressed', 'false');
  let active: { stop: () => void } | null = null;

  const reset = (): void => {
    active = null;
    button.classList.remove('listening');
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', t('voice.micLabel'));
  };

  button.addEventListener('click', () => {
    if (active) {
      active.stop();
      return;
    }
    if (!options.voice.canListen) {
      options.onStatus(failureMessage('unsupported'));
      return;
    }
    options.voice.unlock();
    options.onStart?.();
    const session = options.voice.listen(options.onPartial);
    active = session;
    button.classList.add('listening');
    button.setAttribute('aria-pressed', 'true');
    button.setAttribute('aria-label', t('voice.stopLabel'));
    options.onStatus(t('voice.listening'));
    session.result.then(
      (text) => {
        reset();
        options.onStatus('');
        // Story 046: words are in the box now; the mic offers to say them again.
        button.textContent = `🎤 ${t('voice.micAgain')}`;
        options.onText(text);
      },
      (error: unknown) => {
        reset();
        options.onStatus(failureMessage(error instanceof VoiceError ? error.reason : 'failed'));
      },
    );
  });

  return {
    element: button,
    stop: () => active?.stop(),
    setAgain: (again) => {
      if (!active) button.textContent = `🎤 ${t(again ? 'voice.micAgain' : 'voice.micWord')}`;
    },
  };
}
