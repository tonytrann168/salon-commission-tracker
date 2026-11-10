import { scoreAppointment } from '../scoring';
import type { ScoreResult, ScoringConfig } from '../scoring';
import { ENGLISH_KEYS, SKILL_KEYS, TurnError } from '../types';
import type { AppointmentResult, EnglishLevel, GradeAppointment, Grading } from '../types';
import { t } from '../i18n';
import './results-screen.css';

/**
 * Results screen: loading, then stars, tip, review, five-skill scorecard and the English score; or a friendly error with retry.
 * Story: story-002 (design/game-brief.md, MVP feature 5). Shows only what grading and scoring.ts returned, never made-up numbers.
 */

export interface ResultsScreenOptions {
  clientName: string;
  result: AppointmentResult;
  level: EnglishLevel;
  config: ScoringConfig;
  grade: GradeAppointment;
  onNextClient: () => void;
  onBackToMenu: () => void;
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

/** Mount the results screen into `container` and start grading. `destroy` ignores a grading that is still running. */
export function createResultsScreen(container: HTMLElement, options: ResultsScreenOptions): { destroy: () => void } {
  const { clientName, result, level, config, grade, onNextClient, onBackToMenu } = options;
  let destroyed = false;

  const show = (...nodes: HTMLElement[]): void => {
    if (!destroyed) container.replaceChildren(...nodes);
  };

  const showLoading = (): void => {
    const box = el('div', 'results-message');
    box.setAttribute('role', 'status');
    box.append(el('p', '', t('results.writingReview', { name: clientName })), el('span', 'results-spinner'));
    show(box);
  };

  const showError = (error: unknown): void => {
    const box = el('div', 'results-message');
    box.setAttribute('role', 'alert');
    const unavailable = error instanceof TurnError && error.code === 'missing_api_key';
    box.append(
      el('p', '', unavailable ? t('results.reviewUnavailable') : t('results.reviewTrouble', { name: clientName })),
      button(t('common.tryAgain'), () => void run()),
      button(t('results.backToMenu'), onBackToMenu, true),
    );
    show(box);
  };

  const showResults = (grading: Grading, score: ScoreResult): void => {
    const stars = el('div', 'results-stars', '★'.repeat(score.stars) + '☆'.repeat(5 - score.stars));
    stars.setAttribute('role', 'img');
    stars.setAttribute('aria-label', t(score.stars === 1 ? 'results.starsOne' : 'results.starsMany', { count: score.stars }));
    const tip = el('p', 'results-tip');
    tip.append(el('span', '', `${t('results.tip')}: `), el('strong', '', t('results.tipAmount', { dollars: score.tip })));

    const notes: HTMLElement[] = [];
    if (score.goalMet) notes.push(el('p', 'results-note good', t('results.goalMet')));
    else if (grading.rebooked && !score.failed) notes.push(el('p', 'results-note', t('results.rebooked')));
    score.failReasons.forEach((reason) => notes.push(el('p', 'results-note bad', t(`results.fail.${reason}`))));

    const actions = el('div', 'results-actions');
    actions.append(button(t('results.nextClient'), onNextClient), button(t('results.backToMenu'), onBackToMenu, true));

    show(
      stars,
      tip,
      ...notes,
      section(t('results.reviewTitle', { name: clientName }), el('blockquote', 'results-review', grading.review)),
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
      grading = await grade({ transcript: result.transcript, outcome: result.outcome, finalMood, level });
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
