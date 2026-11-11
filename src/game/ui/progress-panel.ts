import { getLanguage, t } from '../i18n';
import type { ProgressUpdate } from '../progression';
import type { Celebration } from './celebration';
import { el } from './dom';
import { rankBar } from './profile-screen';
import './progression.css';

/** The results screen's progress section (story 007): XP and tips gained, the wallet, the rank bar, the streak. */
export function createProgressPanel(update: ProgressUpdate): HTMLElement {
  const section = el('section', 'results-section progress-panel');
  section.append(el('h2', '', t('progress.title')));
  section.append(el('p', 'progress-gains', t('progress.gains', { xp: update.xpGained, dollars: update.tipGained, wallet: update.save.wallet })));
  section.append(rankBar(update.save.xp));
  if (update.streak) section.append(el('p', 'progress-streak', t('daily.doneStreak', { days: update.streak.days })));
  return section;
}

/** The celebrations an update earns: rank-up (with what it unlocks), each new badge, a streak milestone. */
export function celebrationsFor(update: ProgressUpdate): Celebration[] {
  const lang = getLanguage();
  const items: Celebration[] = [];
  if (update.rankUp) {
    const unlocked = update.unlocked.map((d) => t(`picker.${d}`)).join(', ');
    items.push({ icon: update.rankUp.icon, title: t('celebrate.rankUp', { rank: update.rankUp.name[lang], icon: update.rankUp.icon }), line: unlocked ? t('celebrate.unlocked', { what: unlocked }) : t('celebrate.rankLine') });
  }
  // One card for the badges, however many: a first great visit can earn several at once.
  const [only] = update.badges;
  if (update.badges.length === 1 && only) items.push({ icon: only.icon, title: t('celebrate.badge', { name: only.name[lang] }), line: only.goal[lang] });
  else if (update.badges.length > 1) items.push({ icon: update.badges.map((b) => b.icon).join(''), title: t('celebrate.badges', { count: update.badges.length }), line: update.badges.map((b) => b.name[lang]).join(' · ') });
  if (update.streak?.milestone) items.push({ icon: '🔥', title: t('celebrate.streak', { days: update.streak.days }), line: t('celebrate.streakLine') });
  return items;
}
