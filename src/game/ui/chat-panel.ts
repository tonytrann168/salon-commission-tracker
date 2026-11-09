import type { Container } from 'pixi.js';
import type { Appointment, AppointmentSnapshot } from '../appointment';
import { MOOD_MAX } from '../mood';
import { getPortraitDefinition } from '../portraits/definitions';
import { EXPRESSION_CONFIG, poseFor } from '../portraits/portrait';
import type { Expression } from '../portraits/portrait';
import { PHASES, TurnError } from '../types';
import type { ClientPersona } from '../types';
import { createPortraitZone } from './portrait-zone';
import { startTextReveal } from './text-reveal';
import type { TextReveal } from './text-reveal';
import { STRINGS } from './strings';
import './chat-panel.css';

/**
 * DOM chat UI over the Pixi scene: chat, mood meter, phase indicator, typing indicator, retry, end state. Story: story-001.
 * Client replies (and the opening line) are revealed at speaking pace while the client portrait talks. Story: story-009.
 */

const VISIBLE_PHASES = PHASES.filter((phase) => phase !== 'done');

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Mood color from red (angry) through amber to green (happy). */
const moodColor = (mood: number): string => `hsl(${Math.round((mood / MOOD_MAX) * 120)}, 70%, 50%)`;

/**
 * Mount the appointment UI into `host`. `portraits.layer` is the Pixi container the client and bestie portraits
 * are drawn on, over the portrait zone. `destroy` removes the UI and the portraits.
 */
export function createChatPanel(
  host: HTMLElement,
  appointment: Appointment,
  onExit: () => void,
  portraits: { client: ClientPersona; layer: Container },
): { destroy: () => void; setBestieExpression: (expression: Expression) => void } {
  const root = el('div', 'chat-panel');
  const clientName = getPortraitDefinition(portraits.client.portraitId).name;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Assistive tech gets each reply whole, here, while the visible bubble reveals letter by letter (aria-hidden).
  const announcer = el('div', 'visually-hidden');
  announcer.setAttribute('aria-live', 'polite');

  const header = el('div', 'chat-header');
  const phases = el('ol', 'chat-phases');
  const phaseItems = VISIBLE_PHASES.map((phase) => phases.appendChild(el('li', '', STRINGS.phaseLabels[phase])));
  const mood = el('div', 'mood');
  const track = el('div', 'mood-track');
  const fill = el('div', 'mood-fill');
  const value = el('span', 'mood-value');
  track.appendChild(fill);
  track.setAttribute('role', 'meter');
  track.setAttribute('aria-label', STRINGS.moodLabel);
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', String(MOOD_MAX));
  mood.append(el('span', '', STRINGS.moodLabel), track, value);
  header.append(phases, mood);

  const initial = appointment.getSnapshot();
  const zone = createPortraitZone(host, portraits.layer, portraits.client, poseFor(initial.mood, initial.result?.outcome ?? null));

  const log = el('div', 'chat-log');
  const errorBox = el('div', 'chat-error');
  const errorText = el('p');
  errorText.style.margin = '0';
  const retryButton = el('button', 'chat-button', STRINGS.retry);
  retryButton.type = 'button';
  errorBox.append(errorText, retryButton);

  const endBox = el('div', 'chat-end');
  const endText = el('p');
  const exitButton = el('button', 'chat-button', STRINGS.backToTitle);
  exitButton.type = 'button';
  endBox.append(endText, el('p', '', STRINGS.endPlaceholder), exitButton);

  const form = el('form', 'chat-form');
  const input = el('input', 'chat-input');
  input.type = 'text';
  input.placeholder = STRINGS.inputPlaceholder;
  input.autocomplete = 'off';
  input.enterKeyHint = 'send';
  const sendButton = el('button', 'chat-button', STRINGS.send);
  sendButton.type = 'submit';
  form.append(input, sendButton);

  root.append(header, zone.element, log, errorBox, endBox, form, announcer);
  host.appendChild(root);

  let latest = initial;
  let reveal: TextReveal | null = null;
  let renderedCount = 0;

  /** Everything that waits for the reply to be fully shown: the walk-out pose and the end box. */
  const settle = (): void => {
    reveal = null;
    zone.setClientTalking(false);
    zone.setClientPose(poseFor(latest.mood, latest.result?.outcome ?? null));
    const finished = latest.status === 'finished';
    endBox.classList.toggle('hidden', !finished);
    form.classList.toggle('hidden', finished);
  };

  /** Reveal the client's line in `bubble` (at once under reduced motion). Ends in `settle`, which stops the talking. */
  const speak = (bubble: HTMLElement, text: string): void => {
    const shown = el('span');
    const node = document.createTextNode('');
    shown.appendChild(node);
    bubble.appendChild(shown);
    announcer.textContent = STRINGS.clientSaid(clientName, text);
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
    bubble.addEventListener('click', () => active.finish());
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

    const bubbles = snapshot.transcript.map((message, index) => {
      const bubble = el('div', `chat-bubble ${message.role}`);
      if (!speaking || index < snapshot.transcript.length - 1) bubble.textContent = message.content;
      return bubble;
    });
    if (snapshot.pendingPlayerMessage !== null) {
      bubbles.push(el('div', 'chat-bubble player pending', snapshot.pendingPlayerMessage));
    }
    if (snapshot.status === 'waiting') {
      const typing = el('div', 'chat-typing');
      typing.setAttribute('aria-live', 'polite');
      typing.append(el('span', '', STRINGS.typing), el('span', 'dots'));
      typing.lastElementChild?.append(...['.', '.', '.'].map((dot) => el('span', '', dot)));
      bubbles.push(typing);
    }
    log.replaceChildren(...bubbles);
    log.scrollTop = log.scrollHeight;
    const speakingBubble = bubbles[snapshot.transcript.length - 1];
    if (speaking && speakingBubble && last) speak(speakingBubble, last.content);

    const failed = snapshot.status === 'error';
    errorBox.classList.toggle('hidden', !failed);
    if (failed) {
      errorText.textContent =
        snapshot.error instanceof TurnError && snapshot.error.code === 'missing_api_key'
          ? STRINGS.aiUnavailable
          : STRINGS.aiTrouble;
    }

    // The end box waits until the final line has finished revealing (settle shows it).
    const finished = snapshot.status === 'finished';
    const showEnd = finished && reveal === null;
    endBox.classList.toggle('hidden', !showEnd);
    form.classList.toggle('hidden', showEnd);
    if (snapshot.result) {
      endText.textContent = snapshot.result.outcome === 'completed' ? STRINGS.endCompleted : STRINGS.endWalkedOut;
    }

    // She talks from the moment the typing indicator shows until her reply is fully shown; an error stops her.
    zone.setClientTalking(snapshot.status === 'waiting' || reveal !== null);

    const canType = snapshot.status === 'awaiting_player';
    input.disabled = !canType;
    sendButton.disabled = !canType;
  };

  const unsubscribe = appointment.subscribe(render);
  render(appointment.getSnapshot());

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value;
    if (text.trim() === '') return;
    reveal?.finish();
    input.value = '';
    void appointment.send(text).then(() => {
      if (appointment.getSnapshot().status === 'awaiting_player') input.focus();
    });
  });
  retryButton.addEventListener('click', () => void appointment.retry());
  exitButton.addEventListener('click', onExit);

  return {
    setBestieExpression: zone.setBestieExpression,
    destroy() {
      unsubscribe();
      reveal?.cancel();
      zone.destroy();
      root.remove();
    },
  };
}
