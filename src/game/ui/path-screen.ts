import { NEW_PLAY, doneToday, liveStreak } from '../daily';
import { getLanguage, t } from '../i18n';
import { PATH_CONFIG, askDayChoice, dayProgress, pathView, todaysAppointments } from '../path';
import type { BookedService, PathNode } from '../path';
import { rankFor } from '../progression';
import type { ProgressSave } from '../progression';
import type { ClientPersona, Difficulty } from '../types';
import { avatar, createDailyCard } from './client-picker';
import { el } from './dom';
import './path-screen.css';

/**
 * Story 057a: the salon path. A top bar (the streak flame, the level with its XP bar, the daily goal ring), today's
 * challenge, then the day's nodes as a winding path: done ones ticked, the current one big with "Start", later ones
 * locked. An appointment node seats its client; a lesson node opens a short phrase lesson. Other clients stay one tap
 * away. Big targets and words for mid-age players.
 */
export interface PathScreenOptions {
  save: ProgressSave;
  today: string;
  roster: readonly ClientPersona[];
  unlocked: readonly Difficulty[];
  daily?: Parameters<typeof createDailyCard>[0];
  faceImage?: (client: ClientPersona) => Promise<string | null>;
  onNode: (node: PathNode) => void;
  onMore: () => void;
  onBack: () => void;
  /** Story 062: the answer to "continue Day N, or start Day N+1?". */
  onDayChoice?: (choice: 'continue' | 'next') => void;
  /** Story 062: a booked guest's service from the salon menu ("#2 Gel manicure"). */
  serviceFor?: (client: ClientPersona, node?: PathNode) => string;
  /** Story 071 (testers with an unlock-all code): choose what the next booked client comes in for. */
  testNext?: { value: BookedService | null; onPick: (service: BookedService | null) => void };
}

const SWAY = [0, 62, 0, -62];

/** The daily goal ring: clients finished today out of the goal. */
export function goalRing(done: number, goal: number): HTMLElement {
  const box = el('div', done >= goal ? 'path-goal met' : 'path-goal');
  const share = Math.min(1, done / goal);
  const r = 17;
  const c = 2 * Math.PI * r;
  box.innerHTML = `<svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true"><circle cx="22" cy="22" r="${r}" fill="none" stroke="#f1dde6" stroke-width="6"/><circle cx="22" cy="22" r="${r}" fill="none" stroke="${done >= goal ? '#2f9e5b' : '#ff5c9a'}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(share * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 22 22)"/></svg><span class="path-goal-count"></span>`;
  (box.querySelector('.path-goal-count') as HTMLElement).textContent = `${Math.min(done, goal)}/${goal}`;
  box.setAttribute('role', 'img');
  box.setAttribute('aria-label', t('path.goalLabel', { done: Math.min(done, goal), goal }));
  return box;
}

export function createPathScreen(host: HTMLElement, options: PathScreenOptions): HTMLElement {
  const { save, today } = options;
  const lang = getLanguage();
  const screen = el('section', 'screen path-screen');
  screen.setAttribute('aria-labelledby', 'path-title');

  // The top bar: streak, level + XP, the daily goal.
  const bar = el('div', 'path-bar');
  const play = save.play ?? NEW_PLAY;
  const days = liveStreak(play, today);
  const streak = el('div', days > 0 ? 'path-streak lit' : 'path-streak');
  streak.append(el('span', 'path-flame', '🔥'), el('strong', '', String(days)));
  streak.setAttribute('role', 'img');
  streak.setAttribute('aria-label', t('daily.streakLabel', { days }));
  const { rank, index, next } = rankFor(save.xp);
  const level = el('div', 'path-level');
  const levelWords = el('span', 'path-level-words');
  levelWords.append(el('strong', '', t('path.level', { n: index + 1 })), el('span', '', `${rank.icon} ${rank.name[lang]}`));
  const xpBar = el('div', 'path-xp');
  const fill = el('div', 'path-xp-fill');
  const share = next ? Math.max(0, Math.min(1, (save.xp - rank.xp) / (next.xp - rank.xp))) : 1;
  fill.style.width = `${Math.round(share * 100)}%`;
  xpBar.append(fill);
  xpBar.setAttribute('role', 'meter');
  xpBar.setAttribute('aria-label', next ? t('path.xpLabel', { xp: save.xp, next: next.xp }) : t('path.xpTop', { xp: save.xp }));
  level.append(levelWords, xpBar);
  bar.append(streak, level, goalRing(doneToday(play, today), PATH_CONFIG.goal));

  const title = el('h1', 'path-title', t('path.title'));
  title.id = 'path-title';

  // The path itself.
  const path = el('div', 'path-nodes');
  const view = pathView(save.pathDone ?? 0, options.roster, options.unlocked);
  let lastDay = 0;
  view.forEach(({ node, state }, i) => {
    if (node.day !== lastDay) {
      lastDay = node.day;
      path.append(el('p', 'path-day', t('path.day', { n: node.day })));
    }
    const wrap = el('div', `path-stop ${state}`);
    wrap.style.setProperty('--sway', `${SWAY[i % SWAY.length]}px`);
    const button = el('button', `path-node ${node.kind} ${state}`);
    button.type = 'button';
    button.dataset.index = String(node.index);
    if (node.kind === 'appointment' && node.client) {
      button.append(avatar(node.client, options.faceImage));
    } else {
      button.append(el('span', 'path-node-icon', '📖'));
    }
    if (state === 'done') button.append(el('span', 'path-tick', '✓'));
    if (state === 'locked') button.append(el('span', 'path-lock', '🔒'));
    const label = node.kind === 'appointment' && node.client ? node.client.name : t(`path.lesson.${node.lesson?.topic ?? 'greeting'}`);
    const name = el('span', 'path-name', label);
    button.setAttribute('aria-label', `${label}: ${t(`path.state.${state}`)}`);
    button.disabled = state === 'locked';
    if (state === 'current') {
      const start = el('span', 'path-start', t(node.kind === 'lesson' ? 'path.startLesson' : 'path.start'));
      wrap.append(start);
      button.addEventListener('click', () => options.onNode(node));
    } else if (state === 'done') {
      // A finished node can be played again (no new progress).
      button.addEventListener('click', () => options.onNode(node));
    }
    wrap.append(button, name);
    path.append(wrap);
  });

  const more = el('button', 'chat-button secondary path-more', t('path.more'));
  more.type = 'button';
  more.addEventListener('click', options.onMore);
  const back = el('button', 'chat-button secondary', t('common.back'));
  back.type = 'button';
  back.addEventListener('click', options.onBack);
  const actions = el('div', 'path-actions');
  actions.append(back, more);

  // Story 062: a day left unfinished on an earlier calendar day: continue it, or start the next one (no penalty).
  const done = save.pathDone ?? 0;
  const progress = dayProgress(done);
  const choice = options.onDayChoice && askDayChoice(done, save.pathDayOn ?? '', today) ? dayChoiceCard(progress, options.onDayChoice) : null;
  // The last day closed early: a small note ("Day 3: 2 clients").
  const last = save.pathLog?.at(-1);
  const summary = last && last.day === progress.day - 1 ? el('p', 'path-summary', t(last.clients === 1 ? 'path.summaryOne' : 'path.summary', { n: last.day, clients: last.clients })) : null;
  const booked = todaysAppointments(done, options.roster, options.unlocked);
  // 062 review: one "today" card. Today's challenge is the first row of today's appointments (⭐); alone, it keeps its card.
  const appointments = booked.length > 0 && !choice ? appointmentsCard(booked, options) : null;
  const dailyAlone = options.daily && !appointments ? [createDailyCard(options.daily, options.faceImage)] : [];
  const tester = options.testNext ? testNextRow(options.testNext) : null;
  screen.append(bar, title, ...(choice ? [choice] : []), ...(summary ? [summary] : []), ...(tester ? [tester] : []), ...dailyAlone, ...(appointments ? [appointments] : []), path, actions);
  host.append(screen);
  // The current node in view.
  requestAnimationFrame(() => screen.querySelector('.path-stop.current')?.scrollIntoView({ block: 'center' }));
  return screen;
}

/** Story 071: testers (unlock-all code) choose the next booked client's service: manicure, pedicure or combo. */
function testNextRow(test: NonNullable<PathScreenOptions['testNext']>): HTMLElement {
  const row = el('div', 'path-test-next');
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', t('path.testNext'));
  row.append(el('span', 'path-test-label', t('path.testNext')));
  for (const service of ['manicure', 'pedicure', 'combo'] as const) {
    const button = el('button', 'chat-button secondary path-test-option', t(`path.testNext.${service}`));
    button.type = 'button';
    button.dataset.service = service;
    button.setAttribute('aria-pressed', String(test.value === service));
    button.addEventListener('click', () => test.onPick(test.value === service ? null : service));
    row.append(button);
  }
  return row;
}

/** Story 062: "Continue Day 3 (2 of 5 done)" or "Start Day 4". */
function dayChoiceCard(progress: ReturnType<typeof dayProgress>, onChoice: (choice: 'continue' | 'next') => void): HTMLElement {
  const card = el('section', 'path-choice');
  card.setAttribute('aria-label', t('path.choiceTitle'));
  card.append(el('h2', '', t('path.choiceTitle')));
  const go = el('button', 'chat-button path-continue', t('path.continueDay', { n: progress.day, done: progress.doneInDay, all: progress.perDay }));
  go.type = 'button';
  go.addEventListener('click', () => onChoice('continue'));
  const next = el('button', 'chat-button secondary path-next-day', t('path.nextDay', { n: progress.day + 1 }));
  next.type = 'button';
  next.addEventListener('click', () => onChoice('next'));
  card.append(go, next, el('p', 'path-choice-note', t('path.choiceNote')));
  return card;
}

/** Story 062: 📅 Today's appointments: the booked guests with their time and service. */
function appointmentsCard(booked: { node: PathNode; time: string }[], options: PathScreenOptions): HTMLElement {
  const card = el('section', 'path-appointments');
  card.setAttribute('aria-labelledby', 'path-appointments-title');
  const head = el('h2', '', t('path.appointmentsTitle'));
  head.id = 'path-appointments-title';
  const daily = options.daily && !options.daily.done ? options.daily : undefined;
  // The challenge guest is listed once (her ⭐ row), even when she also has a booking today.
  const rest = options.daily ? booked.filter((b) => b.node.client?.id !== options.daily?.client.id) : booked;
  const count = rest.length + (daily ? 1 : 0);
  card.append(head, el('p', 'path-appointments-count', t(count === 1 ? 'path.appointmentsOne' : 'path.appointments', { n: count })));
  const list = el('ul', 'path-appointment-list');
  // Today's challenge first: her row is the challenge card itself (tap to start), with its streak line.
  if (options.daily) {
    const row = el('li', 'path-appointment path-challenge');
    const challenge = createDailyCard(options.daily, options.faceImage);
    const tag = el('span', 'path-challenge-tag', t('path.challengeTag'));
    challenge.querySelector('.picker-words')?.prepend(tag);
    if (options.serviceFor) challenge.querySelector('.picker-words strong')?.after(el('span', 'path-appointment-service', options.serviceFor(options.daily.client)));
    row.append(challenge);
    list.append(row);
  }
  for (const { node, time } of rest) {
    if (!node.client) continue;
    const row = el('li', 'path-appointment');
    const words = el('span', 'path-appointment-words');
    words.append(el('strong', '', node.client.name), ...(options.serviceFor ? [el('span', 'path-appointment-service', options.serviceFor(node.client, node))] : []));
    // Story 071: a pedicure or combo booking says so at a glance.
    if (node.service && node.service !== 'manicure') row.classList.add(`booked-${node.service}`);
    row.append(el('span', 'path-appointment-time', time), avatar(node.client, options.faceImage), words);
    list.append(row);
  }
  card.append(list, el('p', 'path-appointments-note', t('path.appointmentsNote', { xp: PATH_CONFIG.booked.xp })));
  return card;
}
