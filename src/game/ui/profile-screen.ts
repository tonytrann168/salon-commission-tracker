import { companionName } from '../companion';
import { getLanguage, t } from '../i18n';
import { PROGRESSION_CONFIG, liveStreak, rankFor } from '../progression';
import type { ProgressSave } from '../progression';
import { el } from './dom';
import './level-picker.css';
import './progression.css';

/** The rank bar: this rank, XP towards the next one. Shared by the profile and the results panel. */
export function rankBar(xp: number): HTMLElement {
  const lang = getLanguage();
  const { rank, next } = rankFor(xp);
  const box = el('div', 'rank-box');
  box.append(el('strong', 'rank-name', `${rank.icon} ${rank.name[lang]}`));
  const bar = el('div', 'rank-bar');
  const fill = el('div', 'rank-fill');
  const share = next ? (xp - rank.xp) / (next.xp - rank.xp) : 1;
  fill.style.width = `${Math.round(Math.max(0, Math.min(1, share)) * 100)}%`;
  bar.append(fill);
  bar.setAttribute('role', 'img');
  const label = next ? t('rank.toNext', { xp, next: next.xp, rank: next.name[lang] }) : t('rank.top', { xp });
  bar.setAttribute('aria-label', label);
  box.append(bar, el('span', 'rank-label', label));
  return box;
}

/** The profile (story 007): rank and XP, tips, streak, appointments and every badge (earned ones in colour). */
export function createProfileScreen(host: HTMLElement, options: { save: ProgressSave; today: string; onBack: () => void; onDressUp?: () => void }): HTMLElement {
  const lang = getLanguage();
  const { save } = options;
  const screen = el('section', 'screen profile');
  screen.setAttribute('aria-labelledby', 'profile-title');
  const title = el('h1', '', t('profile.title'));
  title.id = 'profile-title';
  const stats = el('div', 'profile-stats');
  const stat = (value: string, label: string): HTMLElement => {
    const box = el('div', 'profile-stat');
    box.append(el('strong', '', value), el('span', '', label));
    return box;
  };
  stats.append(
    stat(String(save.appointments), t('profile.appointments')),
    stat(`$${save.wallet}`, t('profile.wallet')),
    stat(`$${save.tipsEarned}`, t('profile.tipsEarned')),
    stat(`🔥 ${liveStreak(save, options.today)}`, t('profile.streak')),
  );
  const badges = el('section', 'results-section');
  const earned = PROGRESSION_CONFIG.badges.filter((b) => save.badges.includes(b.id)).length;
  badges.append(el('h2', '', t('profile.badges', { earned, total: PROGRESSION_CONFIG.badges.length })));
  const grid = el('div', 'badge-grid');
  for (const badge of PROGRESSION_CONFIG.badges) {
    const has = save.badges.includes(badge.id);
    const node = el('div', has ? 'badge earned' : 'badge');
    node.append(el('span', 'badge-icon', badge.icon), el('strong', '', badge.name[lang]), el('span', 'badge-goal', badge.goal[lang]));
    node.setAttribute('aria-label', `${badge.name[lang]}: ${has ? t('profile.earned') : t('profile.notYet')}. ${badge.goal[lang]}`);
    grid.append(node);
  }
  badges.append(grid);
  const back = el('button', 'chat-button secondary', t('common.back'));
  back.type = 'button';
  back.addEventListener('click', options.onBack);
  const extra: HTMLElement[] = [];
  if (options.onDressUp) {
    const dress = el('button', 'chat-button', t('companion.dressUp', { name: companionName() }));
    dress.type = 'button';
    dress.addEventListener('click', options.onDressUp);
    extra.push(dress);
  }
  screen.append(title, rankBar(save.xp), stats, ...extra, badges, back);
  host.appendChild(screen);
  return screen;
}
