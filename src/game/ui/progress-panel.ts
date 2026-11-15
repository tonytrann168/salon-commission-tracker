import { prefersReducedMotion } from '../comfort';
import { getLanguage, t } from '../i18n';
import { JUICE_CONFIG, countUpValue } from '../juice';
import type { ProgressUpdate } from '../progression';
import { emitSound } from '../sound-events';
import type { Celebration } from './celebration';
import { coinIcon } from './coin-icon';
import { el } from './dom';
import { rankBar } from './profile-screen';
import './progression.css';

/**
 * The results' rewards (story 007; story 057c: a count-up card at the TOP of the results). The stars, then +XP,
 * +coins and +$ tips counting up together, then the streak moving on (🔥 3 → 4); the rank bar below. A tap shows
 * the totals at once; with Reduce motion nothing counts. `results-top`: the results screen puts it first.
 */
export function createProgressPanel(update: ProgressUpdate, stars: number): HTMLElement {
  const section = el('section', 'results-section progress-panel results-top results-rewards');
  section.setAttribute('aria-label', t('progress.title'));
  const tiles = el('div', 'rewards-tiles');
  const tile = (kind: string, icon: string, label: string, final: string): { value: HTMLElement; node: HTMLElement } => {
    const node = el('div', `rewards-tile rewards-${kind}`);
    const top = el('span', 'rewards-icon');
    top.innerHTML = icon;
    const value = el('strong', 'rewards-value', final);
    node.append(top, value, el('span', 'rewards-label', label));
    tiles.append(node);
    return { value, node };
  };
  tile('stars', '★', t('progress.stars'), `${stars}/5`);
  const counters = [
    { ...tile('xp', '✨', 'XP', `+${update.xpGained}`), target: update.xpGained, format: (n: number) => `+${n}` },
    { ...tile('coins', coinIcon(22), t('progress.coins'), `+${update.coinsGained}`), target: update.coinsGained, format: (n: number) => `+${n}` },
    { ...tile('tips', '$', t('progress.tips'), `+$${update.tipGained}`), target: update.tipGained, format: (n: number) => `+$${n}` },
  ];
  section.append(tiles);
  // The streak moving on (the first appointment today): 🔥 from → to.
  const played = update.played;
  const streakChip = played?.newDay ? el('p', 'rewards-streak', t('progress.streakUp', { from: Math.max(0, played.streak - 1), to: played.streak })) : null;
  if (streakChip) section.append(streakChip);
  section.append(rankBar(update.save.xp));
  if (update.streak) section.append(el('p', 'progress-streak', t('daily.doneStreak', { days: update.streak.days })));
  const skip = el('p', 'rewards-skip', t('payment.skip'));

  let done = false;
  let frame = 0;
  let timer = 0;
  const finish = (): void => {
    if (done) return;
    done = true;
    window.cancelAnimationFrame(frame);
    window.clearTimeout(timer);
    counters.forEach((c) => (c.value.textContent = c.format(c.target)));
    if (streakChip && !streakChip.classList.contains('shown')) {
      streakChip.classList.add('shown');
      emitSound('streak');
    }
    skip.remove();
    section.classList.add('done');
  };
  if (prefersReducedMotion()) {
    finish();
    return section;
  }
  section.append(skip);
  section.classList.add('counting');
  section.addEventListener('click', finish);
  // Count once the card is on screen (the results mount it after grading).
  let start = 0;
  const step = (now: number): void => {
    if (done) return;
    if (!section.isConnected) {
      frame = window.requestAnimationFrame(step);
      return;
    }
    if (start === 0) {
      start = now;
      timer = window.setTimeout(finish, Math.max(JUICE_CONFIG.results.countMs, JUICE_CONFIG.results.streakDelayMs));
    }
    const elapsed = now - start;
    counters.forEach((c) => (c.value.textContent = c.format(countUpValue(c.target, elapsed, JUICE_CONFIG.results.countMs))));
    frame = window.requestAnimationFrame(step);
  };
  counters.forEach((c) => (c.value.textContent = c.format(0)));
  frame = window.requestAnimationFrame(step);
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
