import { BESTIE_CONFIG } from '../bestie';
import type { BestieLanguage, BestieTransport } from '../bestie';
import { afterAnswer, afterDebrief, bestieLevel, loadMemory, saveMemory, shouldAskQuestion } from '../bestie-memory';
import type { BestieMemory } from '../bestie-memory';
import { t } from '../i18n';
import type { ScoreResult } from '../scoring';
import { TurnError } from '../types';
import type { EnglishLevel, Grading, Message, Outcome, Phase } from '../types';
import { emitSound } from '../sound-events';
import { renderMascot } from '../mascot';
import { el } from './dom';
import './mai-bubble.css';
import './bestie-panel.css';

/**
 * The bestie's UI: greeting on the title screen and the debrief (with an occasional question) on the results screen,
 * behind one "Mai has notes for you" card. During an appointment Mai is the on-demand bubble (mai-bubble.ts). Memory is loaded and saved here around each AI call.
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
    if (now > before) emitSound('levelUp');
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

  // Owner, 2026-11-10: Mai's notes wait behind one card ("Mai has notes for you"); nothing opens by itself.
  // The debrief call already ran above, so memory and XP are saved even if the card is never opened.
  const wrap = el('div', 'mai-notes');
  const card = el('button', 'mai-notes-card');
  card.type = 'button';
  card.setAttribute('aria-expanded', 'false');
  const words = el('span', '');
  words.append(el('strong', '', t('mai.notesCard', { name: NAME })), el('span', 'mai-notes-tap', t('mai.notesTap')));
  card.append(renderMascot('happy', 44), words);
  section.hidden = true;
  card.addEventListener('click', () => {
    section.hidden = !section.hidden;
    card.setAttribute('aria-expanded', String(!section.hidden));
    (card.querySelector('.mai-notes-tap') as HTMLElement).textContent = t(section.hidden ? 'mai.notesTap' : 'mai.notesHide');
  });
  wrap.append(card, section);
  return wrap;
}
