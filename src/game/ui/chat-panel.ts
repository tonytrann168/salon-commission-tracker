import type { Container } from 'pixi.js';
import type { Appointment, AppointmentSnapshot } from '../appointment';
import { MOOD_MAX } from '../mood';
import { getPortraitDefinition } from '../portraits/definitions';
import { EXPRESSION_CONFIG, poseFor } from '../portraits/portrait';
import type { Expression } from '../portraits/portrait';
import { PHASES, TurnError } from '../types';
import type { AppointmentResult, ClientPersona, EnglishLevel, HelpLanguage, Translate } from '../types';
import type { TranslationCache } from '../translation-cache';
import { t } from '../i18n';
import { el } from './dom';
import { createHintBar } from './bestie-panel';
import type { BestieLanguage, BestieTransport } from '../bestie';
import { LEARNING_CONFIG, shouldCheckLine } from '../learning/corrections';
import type { CorrectionsTransport, Phrase } from '../learning/corrections';
import { createHelpMeSayIt } from './help-me-say-it';
import { createMicButton } from './mic-button';
import { openPracticeSheet, practiceButton } from './practice-sheet';
import type { VoiceIO } from '../voice';
import { createPortraitZone } from './portrait-zone';
import { startTextReveal } from './text-reveal';
import type { TextReveal } from './text-reveal';
import './chat-panel.css';

/**
 * DOM chat UI over the Pixi scene: chat, mood meter, phase indicator, typing indicator, retry, hand-off to results. Story: story-001, story-002.
 * Client replies (and the opening line) are revealed at speaking pace while the client portrait talks. Story: story-009.
 * Tap a client line to show or hide its Vietnamese translation (or show it always in full Vietnamese mode); "Help me say it"
 * sits beside the input. Per-line translation state lives here, not in the DOM, because the log is rebuilt on every snapshot. Story: story-010.
 */

const VISIBLE_PHASES = PHASES.filter((phase) => phase !== 'done');

/** Mood color from red (angry) through amber to green (happy). */
const moodColor = (mood: number): string => `hsl(${Math.round((mood / MOOD_MAX) * 120)}, 70%, 50%)`;

/**
 * Mount the appointment UI into `host`. `portraits.layer` is the Pixi container the client and bestie portraits
 * are drawn on, over the portrait zone. `destroy` removes the UI and the portraits.
 */
export function createChatPanel(
  host: HTMLElement,
  appointment: Appointment,
  portraits: {
    client: ClientPersona;
    layer: Container;
    /** Called once, when the appointment is over and the final line has finished revealing. Mount the results into `container`; return a cleanup. */
    onEnded: (container: HTMLElement, result: AppointmentResult) => () => void;
    /** The player's English level: decides whether Help me say it offers word tiles or re-typing. */
    level: EnglishLevel;
    /** `full` shows every client line with its Vietnamese translation automatically. */
    helpLanguage: HelpLanguage;
    /** English-to-Vietnamese translations of client lines, cached per line. */
    translations: TranslationCache;
    /** Transport for Help me say it (Vietnamese to English). */
    translate: Translate;
    /** The bestie's whisper channel: the Hint button (story 003, `hints`) and whispered corrections (story 011, `corrections`). */
    bestie?: {
      transport: BestieTransport;
      language: BestieLanguage;
      hints: boolean;
      /** Omitted when the player turned corrections off. `onPhrase` saves a shown correction's better line to the phrasebook. */
      corrections?: { transport: CorrectionsTransport; onPhrase: (phrase: Phrase) => void };
    };
    /** Voice in and out (story 004): the mic button, the client speaking aloud, and practising the last line. */
    voice?: { io: VoiceIO; clientId: string; speakReplies: boolean; onSpeakerChange: (on: boolean) => void };
  },
): { destroy: () => void; setBestieExpression: (expression: Expression) => void } {
  const root = el('div', 'chat-panel');
  const clientName = getPortraitDefinition(portraits.client.portraitId).name;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Assistive tech gets each reply whole, here, while the visible bubble reveals letter by letter (aria-hidden).
  const announcer = el('div', 'visually-hidden');
  announcer.setAttribute('aria-live', 'polite');

  const header = el('div', 'chat-header');
  const phases = el('ol', 'chat-phases');
  const phaseItems = VISIBLE_PHASES.map((phase) => phases.appendChild(el('li', '', t(`chat.phase.${phase}`))));
  const mood = el('div', 'mood');
  const track = el('div', 'mood-track');
  const fill = el('div', 'mood-fill');
  const value = el('span', 'mood-value');
  track.appendChild(fill);
  track.setAttribute('role', 'meter');
  track.setAttribute('aria-label', t('chat.mood'));
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', String(MOOD_MAX));
  mood.append(el('span', '', t('chat.mood')), track, value);
  const voice = portraits.voice;
  let speakerOn = voice?.speakReplies ?? false;
  if (voice?.io.canSpeak) {
    // The speaker button switches the client's voice on and off at any point in the appointment (story 004).
    const speaker = el('button', 'speaker-button');
    speaker.type = 'button';
    const showSpeaker = (): void => {
      speaker.textContent = speakerOn ? '🔊' : '🔇';
      speaker.setAttribute('aria-label', t(speakerOn ? 'voice.speakerOnLabel' : 'voice.speakerOffLabel'));
      speaker.setAttribute('aria-pressed', String(speakerOn));
    };
    showSpeaker();
    speaker.addEventListener('click', () => {
      speakerOn = !speakerOn;
      if (!speakerOn) voice.io.cancelSpeech();
      voice.onSpeakerChange(speakerOn);
      showSpeaker();
    });
    mood.append(speaker);
  }
  header.append(phases, mood);

  const initial = appointment.getSnapshot();
  const zone = createPortraitZone(host, portraits.layer, portraits.client, poseFor(initial.mood, initial.result?.outcome ?? null));

  const log = el('div', 'chat-log');
  const errorBox = el('div', 'chat-error');
  const errorText = el('p');
  errorText.style.margin = '0';
  const retryButton = el('button', 'chat-button', t('common.tryAgain'));
  retryButton.type = 'button';
  errorBox.append(errorText, retryButton);

  // Where the results screen mounts once the appointment is over and the final line has been shown.
  const resultsBox = el('div', 'chat-results hidden');

  const form = el('form', 'chat-form');
  const helpButton = el('button', 'chat-button help-button');
  helpButton.type = 'button';
  helpButton.textContent = t('help.button');
  const input = el('input', 'chat-input');
  input.type = 'text';
  input.placeholder = t('chat.placeholder');
  input.autocomplete = 'off';
  input.enterKeyHint = 'send';
  const sendButton = el('button', 'chat-button', t('common.send'));
  sendButton.type = 'submit';
  form.append(helpButton, input, sendButton);

  const bestie = portraits.bestie;
  const hintBar = bestie && (bestie.hints || bestie.corrections)
    ? createHintBar({
        hints: bestie.hints,
        transport: bestie.transport,
        level: portraits.level,
        language: bestie.language,
        current: () => ({ phase: latest.phase, mood: latest.mood, transcript: latest.transcript }),
        onWhispering: (whispering) => zone.setBestieExpression(whispering ? 'pleased' : 'neutral'),
      })
    : null;

  // The Hint button and an open whisper sit over the header and portraits, so they never push the chat down (small phones).
  const top = el('div', 'chat-top');
  top.append(header, zone.element, ...(hintBar ? [hintBar.element] : []));

  // Voice messages (listening, mic blocked, fall back to typing) sit just above the reply box.
  const voiceStatus = el('p', 'voice-status');
  voiceStatus.setAttribute('aria-live', 'polite');
  const mic = voice
    ? createMicButton({
        voice: voice.io,
        onStart: () => {
          voice.io.cancelSpeech();
          reveal?.finish();
        },
        onPartial: (text) => {
          input.value = text;
        },
        onText: (text) => {
          input.value = '';
          sendLine(text, false);
        },
        onStatus: (message) => {
          voiceStatus.textContent = message;
        },
      })
    : null;
  if (mic) form.insertBefore(mic.element, sendButton);

  root.append(top, log, errorBox, resultsBox, voiceStatus, form, announcer);
  host.appendChild(root);

  let latest = initial;
  let reveal: TextReveal | null = null;
  let renderedCount = 0;
  let destroyResults: (() => void) | null = null;

  const { translations, helpLanguage } = portraits;
  const fullMode = helpLanguage === 'full';
  /** Transcript indexes whose translation the player opened by tapping. */
  const shownTranslations = new Set<number>();
  const translationStatus = new Map<number, 'loading' | 'failed'>();
  /** Bubble and translation box of each client line in the current DOM. */
  const clientNodes = new Map<number, { bubble: HTMLElement; box: HTMLElement }>();
  /** Transcript index of the line being revealed, or -1. */
  let speakingIndex = -1;

  /** Bring one client line's translation box and `aria-expanded` up to date, and start the fetch when it is needed. */
  const refreshTranslation = (index: number): void => {
    const node = clientNodes.get(index);
    const text = latest.transcript[index]?.content;
    if (!node || text === undefined) return;
    const visible = fullMode || shownTranslations.has(index);
    node.bubble.setAttribute('aria-expanded', String(visible));
    if (!visible) {
      const hint = el('span', 'chat-hint', t('chat.translateHint'));
      hint.setAttribute('aria-hidden', 'true');
      node.box.replaceChildren(hint);
      return;
    }
    const cached = translations.peek(text);
    if (cached !== undefined) {
      // A translation that lands under the newest line would push it below the fold: keep the chat scrolled to the end.
      const atEnd = log.scrollHeight - log.scrollTop - log.clientHeight < 8;
      const translated = el('span', 'chat-translation-text', cached);
      translated.lang = 'vi';
      node.box.replaceChildren(translated);
      if (atEnd || index === latest.transcript.length - 1) log.scrollTop = log.scrollHeight;
      return;
    }
    if (translationStatus.get(index) === 'failed') {
      const retry = el('button', 'chat-button secondary', t('common.tryAgain'));
      retry.type = 'button';
      retry.addEventListener('click', () => {
        translationStatus.delete(index);
        refreshTranslation(index);
      });
      node.box.replaceChildren(el('span', '', t('chat.translateFailed')), retry);
      return;
    }
    node.box.replaceChildren(el('span', 'chat-hint', t('chat.translating')));
    if (translationStatus.get(index) === 'loading') return;
    translationStatus.set(index, 'loading');
    translations.get(text).then(
      () => translationStatus.delete(index),
      () => translationStatus.set(index, 'failed'),
    ).finally(() => refreshTranslation(index));
  };

  /** Tap or Enter/Space on a client line: finish the reveal if it is running, otherwise show or hide the translation. */
  const activateLine = (index: number): void => {
    if (reveal !== null && index === speakingIndex) {
      reveal.finish();
      return;
    }
    if (fullMode) return;
    if (!shownTranslations.delete(index)) shownTranslations.add(index);
    refreshTranslation(index);
  };

  /** Swap the chat for the results area (once), after the final line is fully shown. */
  const showEnd = (show: boolean): void => {
    resultsBox.classList.toggle('hidden', !show);
    log.classList.toggle('hidden', show);
    form.classList.toggle('hidden', show);
    if (show && destroyResults === null && latest.result) destroyResults = portraits.onEnded(resultsBox, latest.result);
  };

  /** Everything that waits for the reply to be fully shown: the walk-out pose and the results. */
  const settle = (): void => {
    reveal = null;
    zone.setClientTalking(false);
    zone.setClientPose(poseFor(latest.mood, latest.result?.outcome ?? null));
    showEnd(latest.status === 'finished');
  };

  /** Reveal the client's line in `bubble` (at once under reduced motion). Ends in `settle`, which stops the talking. */
  const speak = (bubble: HTMLElement, line: HTMLElement, text: string): void => {
    const shown = el('span');
    const node = document.createTextNode('');
    shown.appendChild(node);
    line.appendChild(shown);
    announcer.textContent = t('chat.clientSaid', { name: clientName, text });
    if (voice && speakerOn) void voice.io.speak(text, { clientId: voice.clientId, level: portraits.level });
    if (reducedMotion.matches) {
      node.data = text;
      settle();
      return;
    }
    shown.setAttribute('aria-hidden', 'true');
    bubble.classList.add('revealing');
    const active = startTextReveal(
      node,
      text,
      EXPRESSION_CONFIG.talking,
      () => {
        log.scrollTop = log.scrollHeight;
      },
      () => {
        shown.removeAttribute('aria-hidden');
        bubble.classList.remove('revealing');
        settle();
      },
    );
    reveal = active;
  };

  const render = (snapshot: AppointmentSnapshot): void => {
    latest = snapshot;
    reveal?.cancel();
    reveal = null;
    const last = snapshot.transcript[snapshot.transcript.length - 1];
    const speaking = snapshot.transcript.length > renderedCount && last?.role === 'client';
    renderedCount = snapshot.transcript.length;
    const phaseIndex = VISIBLE_PHASES.findIndex((phase) => phase === snapshot.phase);
    phaseItems.forEach((item, index) => {
      const finished = snapshot.status === 'finished' && snapshot.result?.outcome === 'completed';
      item.className = finished || index < phaseIndex ? 'past' : index === phaseIndex ? 'current' : '';
      if (index === phaseIndex && !finished) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });

    // While the final line is spoken the client keeps her mood face; the walk-out pose comes after (settle).
    zone.setClientPose(poseFor(snapshot.mood, speaking ? null : (snapshot.result?.outcome ?? null)));

    fill.style.width = `${snapshot.mood}%`;
    fill.style.backgroundColor = moodColor(snapshot.mood);
    value.textContent = String(snapshot.mood);
    track.setAttribute('aria-valuenow', String(snapshot.mood));

    speakingIndex = speaking ? snapshot.transcript.length - 1 : -1;
    clientNodes.clear();
    const lines = new Map<number, HTMLElement>();
    const bubbles = snapshot.transcript.map((message, index) => {
      const bubble = el('div', `chat-bubble ${message.role}`);
      if (message.role === 'player') {
        bubble.textContent = message.content;
        // The player's newest line can be practised aloud (story 004).
        const isLastPlayerLine = !snapshot.transcript.slice(index + 1).some((later) => later.role === 'player');
        if (!voice?.io.canListen || !isLastPlayerLine || snapshot.status === 'finished') return bubble;
        const entry = el('div', 'chat-entry player');
        const practice = practiceButton(message.content, (line) => openPracticeSheet(root, { voice: voice.io, line, level: portraits.level }));
        practice.textContent = `🎤 ${t('practice.lastLine')}`;
        entry.append(bubble, practice);
        return entry;
      }
      const line = el('span');
      if (index !== speakingIndex) line.textContent = message.content;
      bubble.appendChild(line);
      bubble.tabIndex = 0;
      bubble.setAttribute('role', 'button');
      bubble.addEventListener('click', () => activateLine(index));
      bubble.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        activateLine(index);
      });
      const box = el('div', 'chat-translation');
      box.setAttribute('aria-live', 'polite');
      const entry = el('div', 'chat-entry client');
      entry.append(bubble, box);
      clientNodes.set(index, { bubble, box });
      lines.set(index, line);
      return entry;
    });
    if (snapshot.pendingPlayerMessage !== null) {
      bubbles.push(el('div', 'chat-bubble player pending', snapshot.pendingPlayerMessage));
    }
    if (snapshot.status === 'waiting') {
      const typing = el('div', 'chat-typing');
      typing.setAttribute('aria-live', 'polite');
      typing.append(el('span', '', t('chat.typing', { name: clientName })), el('span', 'dots'));
      typing.lastElementChild?.append(...['.', '.', '.'].map((dot) => el('span', '', dot)));
      bubbles.push(typing);
    }
    log.replaceChildren(...bubbles);
    log.scrollTop = log.scrollHeight;
    clientNodes.forEach((_, index) => refreshTranslation(index));
    const speakingNode = clientNodes.get(speakingIndex);
    const speakingLine = lines.get(speakingIndex);
    if (speakingNode && speakingLine && last) speak(speakingNode.bubble, speakingLine, last.content);

    const failed = snapshot.status === 'error';
    errorBox.classList.toggle('hidden', !failed);
    if (failed) {
      errorText.textContent =
        snapshot.error instanceof TurnError && snapshot.error.code === 'missing_api_key'
          ? t('chat.aiUnavailable')
          : t('chat.aiTrouble');
    }

    // The results wait until the final line has finished revealing (settle shows them).
    showEnd(snapshot.status === 'finished' && reveal === null);

    // She talks from the moment the typing indicator shows until her reply is fully shown; an error stops her.
    zone.setClientTalking(snapshot.status === 'waiting' || reveal !== null);

    const canType = snapshot.status === 'awaiting_player';
    input.disabled = !canType;
    sendButton.disabled = !canType;
    helpButton.disabled = !canType;
    if (mic) mic.element.disabled = !canType;
    hintBar?.setEnabled(canType);
    hintBar?.element.classList.toggle('hidden', snapshot.status === 'finished');
  };

  /** Whispered corrections shown this appointment (capped in config/learning.json). */
  let whispersShown = 0;
  /** After the player sends a line: check it in the background and, if it needs it, whisper a correction. Never blocks the chat. */
  const checkLine = (line: string, helped: boolean, before: AppointmentSnapshot): void => {
    const corrections = bestie?.corrections;
    if (!corrections || !hintBar || !shouldCheckLine(line, helped, whispersShown)) return;
    const clientLine = [...before.transcript].reverse().find((message) => message.role === 'client')?.content ?? '';
    corrections.transport
      .checkLine({ level: portraits.level, language: bestie.language, phase: before.phase, line: line.trim(), clientLine })
      .then((result) => {
        if (!result.needsCorrection || !result.better || latest.status === 'finished') return;
        // Checks run side by side, so the cap is checked again when each answer lands.
        if (whispersShown >= LEARNING_CONFIG.whispers.maxPerAppointment) return;
        const shown = hintBar.whisperCorrection({ praise: result.praise, said: line.trim(), better: result.better.en, reason: result.reason, language: bestie.language });
        if (!shown) return;
        whispersShown++;
        corrections.onPhrase(result.better);
      })
      .catch(() => undefined);
  };

  const unsubscribe = appointment.subscribe(render);
  render(appointment.getSnapshot());

  /** Send a typed or spoken line. */
  function sendLine(text: string, helped: boolean): void {
    if (text.trim() === '') return;
    reveal?.finish();
    voice?.io.cancelSpeech();
    checkLine(text, helped, latest);
    void appointment.send(text, helped ? { helped: true } : undefined).then(() => {
      if (appointment.getSnapshot().status === 'awaiting_player') input.focus();
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value;
    if (text.trim() === '') return;
    input.value = '';
    voiceStatus.textContent = '';
    sendLine(text, false);
  });
  retryButton.addEventListener('click', () => void appointment.retry());

  let helpSheet: HTMLElement | null = null;
  const closeHelp = (): void => {
    helpSheet?.remove();
    helpSheet = null;
    helpButton.focus();
  };
  helpButton.addEventListener('click', () => {
    if (helpSheet) return;
    const sheet = createHelpMeSayIt({
      level: portraits.level,
      translate: portraits.translate,
      onClose: closeHelp,
      onSend: (text) => {
        closeHelp();
        sendLine(text, true);
      },
    });
    helpSheet = sheet.element;
    root.appendChild(sheet.element);
    sheet.focus();
  });

  return {
    setBestieExpression: zone.setBestieExpression,
    destroy() {
      mic?.stop();
      voice?.io.cancelSpeech();
      unsubscribe();
      destroyResults?.();
      reveal?.cancel();
      zone.destroy();
      root.remove();
    },
  };
}
