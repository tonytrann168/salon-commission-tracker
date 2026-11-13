import { bestieLevel, loadMemory, localDay, saveMemory } from '../bestie-memory';
import { companionLook, loadCompanion, saveCompanion } from '../companion';
import { claimGift, dailyBonus, giftsDue, pickLine } from '../corner';
import type { CornerAction } from '../corner';
import { getLanguage, t } from '../i18n';
import type { StringKey } from '../i18n';
import { renderMascot } from '../mascot';
import type { MascotMood } from '../mascot/mascot';
import { MASCOT_CONFIG } from '../mascot/mascot';
import { NAIL_ART_CONFIG } from '../nail-art/design';
import { loadSave, writeSave } from '../save';
import { emitSound } from '../sound-events';
import { el } from './dom';
import { celebrateFriendship } from './friendship';
import './level-picker.css';
import './companion.css';

/**
 * The companion corner (story 021): the companion large, Chat / Pat / High-five with a mood and a little animation
 * each (none with reduced motion), lines from the string tables (name and chị/anh from the saved companion), the daily
 * friendship bonus, and milestone gifts. No AI calls.
 */

const MOOD: Record<CornerAction, MascotMood[]> = { chat: ['talking', 'proud', 'encouraging'], pat: ['happy', 'proud'], high: ['celebrating'] };
const MOVE: Record<CornerAction, string> = { chat: 'corner-nod', pat: 'corner-wiggle', high: 'corner-jump' };
const FIGURE_PX = 200;

export function createCompanionCorner(host: HTMLElement, onBack: () => void): HTMLElement {
  const lang = getLanguage();
  const screen = el('section', 'screen companion-corner');
  screen.setAttribute('aria-labelledby', 'corner-title');
  const settings = loadCompanion();
  const title = el('h1', '', settings.name);
  title.id = 'corner-title';
  const stage = el('div', 'corner-stage');
  const bubble = el('p', 'bestie-bubble corner-line');
  bubble.setAttribute('aria-live', 'polite');
  const bonus = el('p', 'setting-note corner-bonus');
  bonus.setAttribute('aria-live', 'polite');
  const giftBox = el('div', 'corner-gift');
  let last: Record<CornerAction, number> = { chat: 0, pat: 0, high: 0 };

  const figure = (mood: MascotMood, move?: string): void => {
    const node = renderMascot(mood, FIGURE_PX, { label: settings.name, crop: 'full', ...companionLook() });
    if (move) node.classList.add(move);
    stage.replaceChildren(node);
  };

  const act = (action: CornerAction): void => {
    const moods = MOOD[action];
    figure(moods[Math.floor(Math.random() * moods.length)] ?? 'happy', MOVE[action]);
    const n = pickLine(action, last[action], Math.random());
    last = { ...last, [action]: n };
    bubble.textContent = t(`corner.${action}${n}` as StringKey);
    emitSound(action === 'high' ? 'stars' : 'moodUp');
    const companion = loadCompanion();
    const today = localDay();
    const xp = dailyBonus(action, companion.cornerDay ?? '', today);
    if (action !== 'chat') saveCompanion({ ...companion, cornerDay: today });
    if (xp > 0) {
      const before = loadMemory();
      const after = { ...before, xp: before.xp + xp };
      saveMemory(after);
      bonus.textContent = t('corner.bonus', { xp });
      if (bestieLevel(after.xp) > bestieLevel(before.xp)) celebrateFriendship(bestieLevel(after.xp));
      showGift();
    }
  };

  function showGift(): void {
    const companion = loadCompanion();
    const [gift] = giftsDue(bestieLevel(loadMemory().xp), companion.gifts ?? []);
    if (!gift) {
      giftBox.replaceChildren();
      return;
    }
    const claim = el('button', 'chat-button', t('corner.claim'));
    claim.type = 'button';
    claim.addEventListener('click', () => {
      writeSave(claimGift(loadSave(), gift));
      saveCompanion({ ...loadCompanion(), gifts: [...(loadCompanion().gifts ?? []), gift.level] });
      const thing = gift.kind === 'polish' ? NAIL_ART_CONFIG.palette.find((c) => c.id === gift.id)?.name[lang] ?? gift.id : MASCOT_CONFIG.accessories.find((a) => a.id === gift.id)?.name[lang] ?? gift.id;
      figure('celebrating', 'corner-jump');
      bubble.textContent = t(gift.kind === 'polish' ? 'corner.giftPolish' : 'corner.giftAccessory', { thing });
      emitSound('levelUp');
      showGift();
    });
    giftBox.replaceChildren(el('p', 'corner-gift-line', t('corner.gift', { name: settings.name })), claim);
  }

  const actions = el('div', 'corner-actions');
  for (const [action, icon] of [['chat', '💬'], ['pat', '🤗'], ['high', '🙌']] as const) {
    const b = el('button', 'chat-button secondary corner-action', `${icon} ${t(`corner.${action}`)}`);
    b.type = 'button';
    b.addEventListener('click', () => act(action));
    actions.append(b);
  }
  const back = el('button', 'chat-button secondary', t('common.back'));
  back.type = 'button';
  back.addEventListener('click', onBack);
  figure('happy');
  bubble.textContent = t('corner.chat1');
  showGift();
  screen.append(title, stage, bubble, bonus, giftBox, actions, back);
  host.append(screen);
  return screen;
}
