import { clientGrammar } from '../types';
import type { ClientPronoun } from '../types';
import { scoreAppointment } from '../scoring';
import type { ScoreResult, ScoringConfig } from '../scoring';
import { ENGLISH_KEYS, SKILL_KEYS, TurnError } from '../types';
import type { TranslationCache } from '../translation-cache';
import type { AppointmentResult, EnglishLevel, GradeAppointment, Grading, HelpLanguage } from '../types';
import { t } from '../i18n';
import { servicePrice, tipParts } from '../payment';
import { createPaymentCard } from './payment-card';
import { guardMessage } from './guard-message';
import './results-screen.css';

/**
 * Results screen: loading, then stars, tip, review, five-skill scorecard and the English score; or a friendly error with retry.
 * Story: story-002 (design/game-brief.md, MVP feature 5). Shows only what grading and scoring.ts returned, never made-up numbers.
 * The client's review is a client line, so it gets the same Vietnamese help as the chat: tap to translate, or shown
 * automatically in full Vietnamese mode (story 010, owner review of story 008).
 */

export interface ResultsScreenOptions {
  clientName: string;
  result: AppointmentResult;
  level: EnglishLevel;
  config: ScoringConfig;
  grade: GradeAppointment;
  onNextClient: () => void;
  onBackToMenu: () => void;
  /** English-to-Vietnamese translations of client lines (shared with the chat, so a line is never translated twice). */
  translations: TranslationCache;
  /** `full` shows the review's Vietnamese automatically; `tap` shows it when the review is tapped. */
  helpLanguage: HelpLanguage;
  /** Story 006: which roster client (sent to grading). */
  clientId?: string;
  /** Story 019: the situation, sent to grading. */
  scenario?: { scenarioId: string; visits?: { visits: number; lastStars: number; lastDay: string } };
  /** The client's pronoun for English text ("She walked out" / "He walked out"); "they" when not given. */
  clientPronoun?: ClientPronoun;
  /** Story 006: the Next client button's label during a shift ("Next client (2/3)", "Shift done!"). */
  nextLabel?: string;
  /** Story 005: the finished nails and their match (0-100), for the review and the stars. */
  nails?: { description: string; match: number };
  /** Sections built once the scorecard is ready: the bestie's debrief (story 003), the English review, recap and level change (story 011). */
  extras?: (grading: Grading, score: ScoreResult) => HTMLElement[];
  /** Story 039: what was done (for the price the client pays): a manicure or a pedicure, one or both hands/feet. */
  service?: { kind: 'manicure' | 'pedicure'; hands: 1 | 2 };
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label: string, onClick: () => void, secondary = false): HTMLButtonElement {
  const node = el('button', secondary ? 'chat-button secondary' : 'chat-button', label);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

/** One labelled 0-100 bar. */
function scoreRow(label: string, score: number, overall = false): HTMLElement {
  const row = el('div', overall ? 'results-row overall' : 'results-row');
  const bar = el('div', 'results-bar');
  const fill = el('div', 'results-bar-fill');
  fill.style.width = `${score}%`;
  bar.appendChild(fill);
  bar.setAttribute('role', 'img');
  bar.setAttribute('aria-label', t('results.scoreOutOf', { score }));
  row.append(el('span', 'results-label', label), bar, el('span', 'results-score', String(score)));
  return row;
}

function section(title: string, ...children: HTMLElement[]): HTMLElement {
  const box = el('section', 'results-section');
  box.append(el('h2', '', title), ...children);
  return box;
}

/** The client's review with its Vietnamese under it (automatic in full mode, otherwise on tap). */
function translatableReview(text: string, translations: TranslationCache, full: boolean): HTMLElement {
  const wrap = el('div', 'results-review-wrap');
  const quote = el('blockquote', 'results-review', text);
  quote.lang = 'en';
  const box = el('div', 'chat-translation results-translation');
  box.setAttribute('aria-live', 'polite');
  let shown = full;
  let failed = false;

  const refresh = (): void => {
    if (!full) quote.setAttribute('aria-expanded', String(shown));
    if (!shown) {
      const hint = el('span', 'chat-hint', t('chat.translateHint'));
      hint.setAttribute('aria-hidden', 'true');
      box.replaceChildren(hint);
      return;
    }
    const cached = translations.peek(text);
    if (cached !== undefined) {
      const translated = el('span', 'chat-translation-text', cached);
      translated.lang = 'vi';
      box.replaceChildren(translated);
      return;
    }
    if (failed) {
      const retry = el('button', 'chat-button secondary', t('common.tryAgain'));
      retry.type = 'button';
      retry.addEventListener('click', () => {
        failed = false;
        refresh();
      });
      box.replaceChildren(el('span', '', t('chat.translateFailed')), retry);
      return;
    }
    box.replaceChildren(el('span', 'chat-hint', t('chat.translating')));
    translations.get(text).then(
      () => undefined,
      () => {
        failed = true;
      },
    ).finally(refresh);
  };

  if (!full) {
    const toggle = (): void => {
      shown = !shown;
      refresh();
    };
    quote.tabIndex = 0;
    quote.setAttribute('role', 'button');
    quote.addEventListener('click', toggle);
    quote.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggle();
    });
  }
  wrap.append(quote, box);
  refresh();
  return wrap;
}

/** Mount the results screen into `container` and start grading. `destroy` ignores a grading that is still running. */
export function createResultsScreen(container: HTMLElement, options: ResultsScreenOptions): { destroy: () => void } {
  const { clientName, result, level, config, grade, onNextClient, onBackToMenu, translations, helpLanguage, extras } = options;
  const who = clientGrammar(options.clientPronoun);
  let destroyed = false;

  const show = (...nodes: HTMLElement[]): void => {
    if (!destroyed) container.replaceChildren(...nodes);
  };

  const showLoading = (): void => {
    const box = el('div', 'results-message');
    box.setAttribute('role', 'status');
    box.append(el('p', '', t('results.writingReview', { ...who, name: clientName })), el('span', 'results-spinner'));
    show(box);
  };

  const showError = (error: unknown): void => {
    const box = el('div', 'results-message');
    box.setAttribute('role', 'alert');
    const unavailable = error instanceof TurnError && error.code === 'missing_api_key';
    box.append(
      el('p', '', guardMessage(error) ?? (unavailable ? t('results.reviewUnavailable') : t('results.reviewTrouble', { ...who, name: clientName }))),
      button(t('common.tryAgain'), () => void run()),
      button(t('results.backToMenu'), onBackToMenu, true),
    );
    show(box);
  };

  const showResults = (grading: Grading, score: ScoreResult): void => {
    // Story 039: the payment moment first (price, the tip part by part, stars, the companion's cheer); the review and
    // the scorecard appear when it is done (a tap skips; reduced motion shows the totals at once).
    const finalMood = result.moodHistory[result.moodHistory.length - 1] ?? 0;
    const kind = options.service?.kind ?? 'manicure';
    container.classList.add('paying');
    const payment = createPaymentCard({
      serviceLabel: t(kind === 'pedicure' ? 'payment.pedicure' : 'payment.manicure'),
      price: servicePrice(kind, options.service?.hands ?? 1),
      parts: tipParts({ tip: score.tip, finalMood, scenario: options.scenario !== undefined, ...(options.nails ? { nailMatch: options.nails.match } : {}) }),
      tip: score.tip,
      stars: score.stars,
      walkedOut: result.outcome === 'walked_out',
      onDone: () => container.classList.remove('paying'),
    });

    const notes: HTMLElement[] = [];
    if (score.goalMet) notes.push(el('p', 'results-note good', t('results.goalMet', who)));
    else if (grading.rebooked && !score.failed) notes.push(el('p', 'results-note', t('results.rebooked', who)));
    score.failReasons.forEach((reason) => notes.push(el('p', 'results-note bad', t(`results.fail.${reason}`, who))));

    const actions = el('div', 'results-actions');
    actions.append(button(options.nextLabel ?? t('results.nextClient'), onNextClient), button(t('results.backToMenu'), onBackToMenu, true));

    show(
      payment,
      ...notes,
      ...(extras ? extras(grading, score) : []),
      section(t('results.reviewTitle', { name: clientName }), translatableReview(grading.review, translations, helpLanguage === 'full')),
      section(t('results.skillsTitle'), ...SKILL_KEYS.map((key) => scoreRow(t(`results.skill.${key}`), grading.skills[key]))),
      section(
        t('results.englishTitle'),
        scoreRow(t('results.englishOverall'), score.englishScore, true),
        ...ENGLISH_KEYS.map((key) => scoreRow(t(`results.english.${key}`), grading.english[key])),
        el('p', 'results-hint', t('results.englishLevelNote')),
      ),
      actions,
    );
    container.scrollTop = 0;
  };

  const run = async (): Promise<void> => {
    showLoading();
    const finalMood = result.moodHistory[result.moodHistory.length - 1] ?? 0;
    let grading: Grading;
    try {
      grading = await grade({ transcript: result.transcript, outcome: result.outcome, finalMood, level, ...(options.nails ? { nails: options.nails } : {}), ...(options.clientId ? { clientId: options.clientId } : {}), ...(options.scenario ?? {}) });
    } catch (error) {
      showError(error);
      return;
    }
    showResults(
      grading,
      scoreAppointment(
        {
          finalMood,
          outcome: result.outcome,
          skills: grading.skills,
          english: grading.english,
          level,
          rebooked: grading.rebooked,
          redoDemanded: grading.redoDemanded,
          ...(options.nails ? { nailMatch: options.nails.match } : {}),
        },
        config,
      ),
    );
  };

  void run();
  return {
    destroy() {
      destroyed = true;
      container.replaceChildren();
    },
  };
}
