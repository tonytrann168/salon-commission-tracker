import { BESTIE_CONFIG } from '../bestie';
import type { BestieLanguage } from '../bestie';
import { loadMemory } from '../bestie-memory';
import { t } from '../i18n';
import type { CorrectionsTransport, Phrase, ReviewResult } from '../learning/corrections';
import { decideLevel, freshHistory, loadHistory, recordScore, saveHistory } from '../learning/level-adjust';
import { addPhrases, loadPhrasebook, savePhrasebook } from '../learning/phrasebook';
import type { PhrasebookEntry } from '../learning/phrasebook';
import { setEnglishLevel } from '../settings';
import { TurnError } from '../types';
import type { EnglishLevel, Message, Outcome } from '../types';
import { el } from './dom';
import './recap-screen.css';

/**
 * Results-screen parts of the learning loop (story 011): the English review (lines worth improving), the Vietnamese
 * recap with lines to try, the phrasebook note, and the level change (up: automatic with a celebration; down: a
 * suggestion the player accepts or declines).
 */

const NAME = BESTIE_CONFIG.name;

function button(label: string, secondary = false): HTMLButtonElement {
  const node = el('button', secondary ? 'chat-button secondary' : 'chat-button', label);
  node.type = 'button';
  return node;
}

/** One English line with its Vietnamese meaning under it. */
function phraseLine(phrase: Phrase): HTMLElement {
  const box = el('div', 'learning-phrase');
  const en = el('span', 'learning-en', phrase.en);
  en.lang = 'en';
  const vi = el('span', 'learning-vi', phrase.vi);
  vi.lang = 'vi';
  box.append(en, vi);
  return box;
}

/** Save the review's phrases (better lines, lines to try, phrases used well). Returns how many were new. */
export function savePhrasesFrom(review: ReviewResult, session: number): number {
  const entries: PhrasebookEntry[] = [
    ...review.usedWell.map((phrase) => ({ ...phrase, source: 'used' as const, session })),
    ...review.lines.map((line) => ({ ...line.better, source: 'correction' as const, session })),
    ...review.tryLines.map((phrase) => ({ ...phrase, source: 'recap' as const, session })),
  ];
  const { book, added } = addPhrases(loadPhrasebook(), entries);
  savePhrasebook(book);
  return added;
}

export interface LearningPanelOptions {
  transport: CorrectionsTransport;
  level: EnglishLevel;
  language: BestieLanguage;
  outcome: Outcome;
  transcript: readonly Message[];
}

/** The English review and the Vietnamese recap. Starts the review call at once; a failure never blocks the results. */
export function createLearningPanel(options: LearningPanelOptions): HTMLElement {
  const box = el('div', 'learning');
  box.setAttribute('aria-live', 'polite');
  // Phrases are saved under the appointment number they came from (the bestie's debrief counts sessions).
  const session = loadMemory().sessions + 1;

  const run = (): void => {
    const loading = el('div', 'results-message');
    loading.append(el('p', '', t('learning.loading', { name: NAME })), el('span', 'results-spinner'));
    box.replaceChildren(loading);
    options.transport.review({ level: options.level, language: options.language, outcome: options.outcome, transcript: options.transcript }).then(
      (review) => {
        const reviewSection = el('section', 'results-section learning-review');
        reviewSection.append(el('h2', '', t('learning.reviewTitle')));
        if (review.lines.length === 0) reviewSection.append(el('p', 'learning-reason', t('learning.reviewEmpty')));
        for (const line of review.lines) {
          const item = el('div', 'learning-item');
          const said = el('p', 'learning-said');
          const saidText = el('span', '', line.said);
          saidText.lang = 'en';
          said.append(el('span', 'bestie-label', t('learning.youSaid')), saidText);
          const reason = el('p', 'learning-reason', line.reason);
          reason.lang = options.language;
          item.append(said, el('span', 'bestie-label', `→ ${t('learning.better')}`), phraseLine(line.better), reason);
          reviewSection.append(item);
        }

        const recapSection = el('section', 'results-section learning-recap');
        const recap = el('p', 'learning-recap-text', review.recap);
        recap.lang = 'vi';
        recapSection.append(el('h2', '', t('learning.recapTitle')), recap, el('h3', '', t('learning.tryTitle')), ...review.tryLines.map(phraseLine));

        const added = savePhrasesFrom(review, session);
        const note = el('p', added > 0 ? 'results-note good' : 'results-note', added > 0 ? t('learning.phrasesAdded', { count: added }) : t('learning.phrasesNone'));
        box.replaceChildren(reviewSection, recapSection, note);
      },
      (error: unknown) => {
        const unavailable = error instanceof TurnError && error.code === 'missing_api_key';
        const retry = button(t('common.tryAgain'), true);
        retry.addEventListener('click', run);
        const failed = el('section', 'results-section');
        failed.append(el('p', '', unavailable ? t('bestie.unavailable', { name: NAME }) : t('learning.failed', { name: NAME })), ...(unavailable ? [] : [retry]));
        box.replaceChildren(failed);
      },
    );
  };
  run();
  return box;
}

/**
 * Record this appointment's English score and, once the window is full, act on the decision. Returns the section to
 * show, or null when nothing changes. Level names and the reason are shown in Vietnamese and English (story 011).
 */
export function createLevelChangePanel(level: EnglishLevel, englishScore: number): HTMLElement | null {
  const history = recordScore(loadHistory(level), englishScore);
  const decision = decideLevel(history);
  if (decision.kind === 'none') {
    saveHistory(history);
    return null;
  }
  const count = history.scores.length;
  const both = (key: 'level.upLine' | 'level.downLine', to: EnglishLevel): HTMLElement => {
    const box = el('div', 'bilingual learning-both');
    for (const language of ['vi', 'en'] as const) {
      const line = el('span', language === 'vi' ? 'bi-vi' : 'bi-en', t(key, { level: t(`level.${to}.name`, undefined, language), average: decision.average, count }, language));
      line.lang = language;
      box.append(line);
    }
    return box;
  };
  const section = el('section', `results-section level-change ${decision.kind}`);
  section.setAttribute('aria-live', 'polite');

  if (decision.kind === 'up') {
    setEnglishLevel(decision.to);
    saveHistory(freshHistory(decision.to));
    section.append(el('p', 'level-change-burst', '🎉'), el('h2', '', t('level.upTitle')), both('level.upLine', decision.to), el('p', 'learning-reason', t('level.switchBack')));
    return section;
  }

  // Down is only a suggestion. Either answer starts a fresh window so the game never asks again right away.
  saveHistory(freshHistory(level));
  const toName = t(`level.${decision.to}.name`);
  const accept = button(t('level.downAccept', { level: toName }));
  const decline = button(t('level.downDecline'), true);
  const answer = (accepted: boolean): void => {
    if (accepted) {
      setEnglishLevel(decision.to);
      saveHistory(freshHistory(decision.to));
    }
    actions.replaceChildren(el('p', 'results-note', accepted ? t('level.downAccepted', { level: toName }) : t('level.downDeclined')));
  };
  accept.addEventListener('click', () => answer(true));
  decline.addEventListener('click', () => answer(false));
  const actions = el('div', 'results-actions');
  actions.append(accept, decline);
  section.append(el('h2', '', t('level.downTitle')), both('level.downLine', decision.to), actions);
  return section;
}
