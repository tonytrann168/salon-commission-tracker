import { NEW_PLAY, doneToday, liveStreak } from '../daily';
import { getLanguage, t } from '../i18n';
import { PATH_CONFIG, pathView } from '../path';
import type { PathNode } from '../path';
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

  screen.append(bar, title, ...(options.daily ? [createDailyCard(options.daily, options.faceImage)] : []), path, actions);
  host.append(screen);
  // The current node in view.
  requestAnimationFrame(() => screen.querySelector('.path-stop.current')?.scrollIntoView({ block: 'center' }));
  return screen;
}
