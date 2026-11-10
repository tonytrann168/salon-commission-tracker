import { BESTIE_CONFIG } from '../bestie';
import type { BestieLanguage, BestieTransport } from '../bestie';
import { afterAnswer, afterDebrief, bestieLevel, loadMemory, saveMemory, shouldAskQuestion } from '../bestie-memory';
import type { BestieMemory } from '../bestie-memory';
import { t } from '../i18n';
import type { ScoreResult } from '../scoring';
import { TurnError } from '../types';
import type { EnglishLevel, Grading, Message, Outcome, Phase } from '../types';
import { el } from './dom';
import './bestie-panel.css';

/**
 * The bestie's UI: greeting on the title screen, the Hint button and whisper during an appointment, and the debrief
 * (with an occasional question) on the results screen. Memory is loaded and saved here around each AI call.
 * Story: story-003 (design/game-brief.md, MVP feature 4).
 */

const NAME = BESTIE_CONFIG.name;

const unavailable = (error: unknown): boolean => error instanceof TurnError && error.code === 'missing_api_key';

function button(label: string, className = 'chat-button'): HTMLButtonElement {
  const node = el('button', className, label);
  node.type = 'button';
  return node;
}

/** The bestie's greeting bubble for the title screen: a first hello, or welcome back with the client count. */
export function createBestieGreeting(memory: BestieMemory = loadMemory()): HTMLElement {
  const text = memory.sessions === 0 ? t('bestie.greetingFirst', { name: NAME }) : t('bestie.greetingBack', { count: memory.sessions + 1 });
  const bubble = el('p', 'bestie-bubble bestie-greeting', text);
  bubble.setAttribute('aria-live', 'polite');
  return bubble;
}

export interface HintBarOptions {
  transport: BestieTransport;
  level: EnglishLevel;
  language: BestieLanguage;
  /** The conversation as it is now (read when the player taps Hint). */
  current: () => { phase: Phase; mood: number; transcript: readonly Message[] };
  /** Show the bestie's face while she whispers. */
  onWhispering: (whispering: boolean) => void;
  /** Show the Hint button (the bar still carries whispered corrections when hints are off, story 011). */
  hints: boolean;
}

/** A whispered correction (story 011): praise first, then "You said… → Better: …" and one reason. */
export interface CorrectionWhisper {
  praise: string;
  said: string;
  better: string;
  reason: string;
  language: BestieLanguage;
}

/** The Hint button and the whispered hint under the portraits. The client never sees any of it. */
export function createHintBar(options: HintBarOptions): {
  element: HTMLElement;
  setEnabled: (enabled: boolean) => void;
  whisperCorrection: (correction: CorrectionWhisper) => boolean;
} {
  const bar = el('div', 'bestie-bar');
  const hintButton = button(`💡 ${t('bestie.hintButton')}`, 'chat-button secondary bestie-hint-button');
  hintButton.setAttribute('aria-label', t('bestie.hintButtonLabel', { name: NAME }));
  const whisper = el('div', 'bestie-bubble bestie-whisper hidden');
  whisper.setAttribute('aria-live', 'polite');
  bar.append(whisper, ...(options.hints ? [hintButton] : []));

  let requestId = 0;
  const close = (): void => {
    requestId++;
    whisper.classList.add('hidden');
    whisper.replaceChildren();
    hintButton.disabled = false;
    options.onWhispering(false);
  };
  /** Fill the whisper. "Got it" sits in the header row so it is never scrolled out of sight on small phones. */
  const show = (...nodes: Node[]): void => {
    const header = el('div', 'bestie-whisper-header');
    const done = button(t('bestie.gotIt'), 'chat-button secondary bestie-got-it');
    done.addEventListener('click', close);
    header.append(el('span', 'bestie-label', t('bestie.whispers', { name: NAME })), done);
    whisper.replaceChildren(header, ...nodes);
    whisper.classList.remove('hidden', 'correction');
  };

  hintButton.addEventListener('click', () => {
    const mine = ++requestId;
    hintButton.disabled = true;
    options.onWhispering(true);
    show(el('span', 'chat-hint', t('bestie.thinking', { name: NAME })));
    const now = options.current();
    options.transport
      .hint({ level: options.level, language: options.language, phase: now.phase, mood: now.mood, transcript: now.transcript, memory: loadMemory().summary })
      .then(
        ({ hint }) => {
          if (mine !== requestId) return;
          const text = el('p', 'bestie-text', hint);
          text.lang = options.language;
          show(text);
        },
        (error: unknown) => {
          if (mine !== requestId) return;
          show(el('p', 'bestie-text', unavailable(error) ? t('bestie.unavailable', { name: NAME }) : t('bestie.hintFailed', { name: NAME })));
        },
      )
      .finally(() => {
        if (mine === requestId) hintButton.disabled = false;
      });
  });

  return {
    element: bar,
    /** Show a correction unless a whisper is already open. Returns whether it was shown. */
    whisperCorrection(correction) {
      if (!whisper.classList.contains('hidden')) return false;
      requestId++;
      options.onWhispering(true);
      // Compact so the whole correction fits the whisper area on small phones: labels sit inline with the text.
      const praise = el('p', 'bestie-text', correction.praise);
      praise.lang = correction.language;
      const said = el('p', 'bestie-text bestie-said');
      const saidText = el('span', '', correction.said);
      saidText.lang = 'en';
      said.append(el('span', 'bestie-label', `${t('learning.youSaid')}: `), saidText);
      const better = el('p', 'bestie-text bestie-better');
      const betterText = el('strong', '', correction.better);
      betterText.lang = 'en';
      better.append(el('span', 'bestie-label', `→ ${t('learning.better')}: `), betterText);
      const reason = el('p', 'bestie-text bestie-reason', correction.reason);
      reason.lang = correction.language;
      show(praise, said, better, reason);
      whisper.classList.add('correction');
      return true;
    },
    /** Off while the client is answering or the appointment is over; closes any open whisper. */
    setEnabled(enabled) {
      if (!enabled && !whisper.classList.contains('hidden')) close();
      hintButton.disabled = !enabled;
    },
  };
}

export interface DebriefOptions {
  transport: BestieTransport;
  level: EnglishLevel;
  language: BestieLanguage;
  outcome: Outcome;
  transcript: readonly Message[];
  grading: Grading;
  score: ScoreResult;
  /** Random number in [0, 1) deciding whether she asks a question this time. */
  roll?: number;
}

/**
 * The debrief section on the results screen. Starts the debrief call at once; saves memory (session, XP, refreshed
 * summary) when it lands. A failure never blocks the results: it shows a friendly message with Try again.
 */
export function createDebriefPanel(options: DebriefOptions): HTMLElement {
  const { transport, level, language, outcome, transcript, grading, score } = options;
  const section = el('section', 'results-section bestie-debrief');
  section.setAttribute('aria-live', 'polite');
  const heading = el('h2', '', t('bestie.debriefTitle', { name: NAME }));
  const levelTag = el('span', 'bestie-level');
  const body = el('div', 'bestie-debrief-body');
  section.append(heading, levelTag, body);

  const startMemory = loadMemory();
  const askQuestion = shouldAskQuestion(startMemory, options.roll ?? Math.random());
  levelTag.textContent = t('bestie.level', { level: bestieLevel(startMemory.xp) });

  const line = (label: string, text: string): HTMLElement => {
    const p = el('p', 'bestie-line');
    const words = el('span', '', text);
    words.lang = language;
    p.append(el('strong', '', `${label}: `), words);
    return p;
  };

  const showLevel = (before: number, after: BestieMemory): void => {
    const now = bestieLevel(after.xp);
    levelTag.textContent = t('bestie.level', { level: now });
    if (now > before) body.append(el('p', 'results-note good bestie-level-up', t('bestie.levelUp', { name: NAME, level: now })));
  };

  const showQuestion = (question: string): void => {
    const box = el('div', 'bestie-question');
    const asked = el('p', 'bestie-bubble');
    const words = el('span', '', question);
    words.lang = language;
    asked.append(el('span', 'bestie-label', t('bestie.asks', { name: NAME })), words);
    const label = el('label', 'help-label', t('bestie.answerLabel'));
    label.htmlFor = 'bestie-answer';
    const input = el('textarea', 'help-input');
    input.id = 'bestie-answer';
    input.rows = 2;
    input.placeholder = t('bestie.answerPlaceholder');
    const send = button(t('bestie.answerSend'));
    const status = el('p', 'bestie-text');
    status.setAttribute('aria-live', 'polite');
    send.addEventListener('click', () => {
      const answer = input.value.trim();
      if (answer === '') return;
      send.disabled = true;
      input.disabled = true;
      status.textContent = t('bestie.thinking', { name: NAME });
      const memory = loadMemory();
      transport.answer({ level, language, question, answer, memory: memory.summary }).then(
        (reply) => {
          const before = bestieLevel(memory.xp);
          const next = afterAnswer(memory, reply.memory);
          saveMemory(next);
          const replyBubble = el('p', 'bestie-bubble');
          const replyWords = el('span', '', reply.reply);
          replyWords.lang = language;
          replyBubble.append(el('span', 'bestie-label', NAME), replyWords);
          box.replaceChildren(asked, el('p', 'bestie-answer', answer), replyBubble);
          showLevel(before, next);
        },
        () => {
          status.textContent = t('bestie.answerFailed', { name: NAME });
          send.disabled = false;
          input.disabled = false;
        },
      );
    });
    box.append(asked, label, input, send, status);
    body.append(box);
  };

  const run = (): void => {
    const box = el('div', 'results-message');
    box.append(el('p', '', t('bestie.debriefLoading', { name: NAME })), el('span', 'results-spinner'));
    body.replaceChildren(box);
    const memory = loadMemory();
    transport
      .debrief({
        level, language, outcome, transcript, review: grading.review, skills: grading.skills, english: grading.english,
        stars: score.stars, tip: score.tip, englishScore: score.englishScore,
        memory: memory.summary, sessionNumber: memory.sessions + 1, askQuestion,
      })
      .then(
        (debrief) => {
          const next = afterDebrief(memory, { summary: debrief.memory, outcome, asked: debrief.question !== null });
          saveMemory(next);
          body.replaceChildren(line(t('bestie.praise'), debrief.praise), line(t('bestie.tryNext'), debrief.tryNext));
          showLevel(bestieLevel(memory.xp), next);
          if (debrief.question) showQuestion(debrief.question);
        },
        (error: unknown) => {
          const retry = button(t('common.tryAgain'), 'chat-button secondary');
          retry.addEventListener('click', run);
          body.replaceChildren(el('p', '', unavailable(error) ? t('bestie.unavailable', { name: NAME }) : t('bestie.debriefFailed', { name: NAME })), ...(unavailable(error) ? [] : [retry]));
        },
      );
  };
  run();
  return section;
}
