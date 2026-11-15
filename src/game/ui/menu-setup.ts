import { companionLook, companionName } from '../companion';
import { t } from '../i18n';
import { renderMascot } from '../mascot';
import { el } from './dom';
import { priceBoardIcon } from './menu-icon';
import { createMenuSection } from './menu-settings';
import './menu-sheet.css';

/**
 * Story 054: "Set up your salon menu", the first step of a new game (and once for older saves): Basic / Mid / Fancy or
 * the player's own prices, the numbered list, Confirm. The companion says in one line that clients order by number.
 * Also the home screen's menu button (view or edit any time; then it has Back instead of the first-time line).
 */
export function createMenuSetupScreen(host: HTMLElement, options: { firstTime: boolean; onDone: () => void }): HTMLElement {
  const screen = el('section', 'screen menu-setup');
  const title = el('h1', 'menu-setup-title');
  title.innerHTML = priceBoardIcon(40);
  title.append(t(options.firstTime ? 'menu.setupTitle' : 'menu.sectionTitle'));
  const mai = el('div', 'bestie-bubble menu-setup-mai');
  mai.append(renderMascot('talking', 44, { crop: 'bust', ...companionLook() }), el('p', '', t('menu.setupMai', { name: companionName() })));
  const section = createMenuSection(options.firstTime ? { onConfirm: options.onDone } : {});
  screen.append(title, mai, section);
  if (!options.firstTime) {
    const back = el('button', 'chat-button secondary', t('common.back'));
    back.type = 'button';
    back.addEventListener('click', options.onDone);
    screen.append(back);
  }
  host.append(screen);
  return screen;
}
