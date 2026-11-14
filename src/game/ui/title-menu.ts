import { t } from '../i18n';
import { createBestieGreeting } from './bestie-panel';
import { companionName } from '../companion';
import './chat-panel.css';
import './level-picker.css';

/**
 * Story 018: the title menu is plain HTML, kept apart from the PixiJS title scene so it shows before PixiJS loads.
 */
/** DOM menu over the title scene: Start and Settings (story 008: in the interface language). Returns the element so the caller can remove it. */
export function createTitleMenu(host: HTMLElement, onStart: () => void, onSettings: () => void, onPhrasebook: () => void, onShop?: () => void, onProfile?: () => void, onCompanion?: () => void, cue = false, extras: { tagline?: string; language?: 'en' | 'vi'; onLanguage?: (language: 'en' | 'vi') => void } = {}): HTMLElement {
  const menu = document.createElement('div');
  menu.className = 'title-menu';
  const start = document.createElement('button');
  start.type = 'button';
  start.className = 'chat-button';
  start.textContent = t('title.start');
  start.addEventListener('click', onStart);
  const settings = document.createElement('button');
  settings.type = 'button';
  settings.className = 'chat-button secondary';
  settings.textContent = t('title.settings');
  settings.addEventListener('click', onSettings);
  const phrasebook = document.createElement('button');
  phrasebook.type = 'button';
  phrasebook.className = 'chat-button secondary';
  phrasebook.textContent = t('title.phrasebook');
  phrasebook.addEventListener('click', onPhrasebook);
  // Settings and Phrasebook share a row so the menu still fits small phones (story 011).
  const row = document.createElement('div');
  row.className = 'title-menu-row';
  row.append(settings, phrasebook);
  // Story 007: the shop and the profile share a second row.
  const extra = document.createElement('div');
  extra.className = 'title-menu-row';
  for (const [label, onClick] of [[t('title.shop'), onShop], [t('title.profile'), onProfile]] as const) {
    if (!onClick) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chat-button secondary';
    button.textContent = label;
    button.addEventListener('click', onClick);
    extra.append(button);
  }
  menu.append(createBestieGreeting(), start, row, ...(extra.childElementCount > 0 ? [extra] : []));
  // Story 021: tap the companion (drawn on the canvas above) to spend a moment together.
  if (onCompanion) {
    const spot = document.createElement('button');
    spot.type = 'button';
    spot.className = 'companion-hotspot';
    spot.setAttribute('aria-label', t('corner.open', { name: companionName() }));
    spot.addEventListener('click', onCompanion);
    menu.append(spot);
    // Story 027: until the corner is first opened, a small "tap me" bubble by the companion.
    if (cue) {
      const tip = document.createElement('span');
      tip.className = 'companion-cue';
      tip.textContent = t('corner.cue');
      tip.setAttribute('aria-hidden', 'true');
      spot.classList.add('cued');
      spot.append(tip);
    }
  }
  // Story 042: this visit's catchy line, above the menu (plain HTML: it shows before PixiJS loads).
  if (extras.tagline) {
    const tagline = document.createElement('p');
    tagline.className = 'title-tagline';
    tagline.textContent = extras.tagline;
    menu.append(tagline);
  }
  // Story 041: EN | VI in the top corner switches the whole interface at once (the labels are never translated).
  if (extras.onLanguage) {
    const onLanguage = extras.onLanguage;
    const toggle = document.createElement('div');
    toggle.className = 'language-toggle';
    toggle.setAttribute('role', 'group');
    toggle.setAttribute('aria-label', 'Language / Ngôn ngữ');
    for (const [code, label, name] of [['en', 'EN', 'English'], ['vi', 'VI', 'Tiếng Việt']] as const) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'language-option';
      button.textContent = label;
      button.lang = code;
      button.setAttribute('aria-label', name);
      button.setAttribute('aria-pressed', String(extras.language === code));
      button.addEventListener('click', () => extras.language !== code && onLanguage(code));
      toggle.append(button);
    }
    menu.append(toggle);
  }
  host.appendChild(menu);
  return menu;
}
