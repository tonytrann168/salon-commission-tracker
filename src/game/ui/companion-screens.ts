import { isUnlocked, loadCompanion, saveCompanion, unlockFacts, wear, withGender, withName, companionLook } from '../companion';
import type { CompanionSettings } from '../companion';
import { COMPANION_CONFIG, COMPANION_GENDERS } from '../companion-core';
import type { NameProblem } from '../companion-core';
import { getLanguage, t } from '../i18n';
import { MASCOT_CONFIG, renderMascot } from '../mascot';
import type { Accessory, AccessorySlot } from '../mascot/mascot';
import { el } from './dom';
import { openRestoreSheet } from './backup-panel';
import './level-picker.css';
import './companion.css';

/**
 * Story 013 screens (art-independent; the designer's figures and accessory art drop in later through the skin system):
 * the first meeting (pick a female or male companion and a name), the companion part of Settings, and dress-up.
 */

const PREVIEW_PX = 96;
const DRESS_PX = 200;

/** The name field with live checking. `onValid` gets the tidied name. */
function nameField(initial: string, onValid: (name: string | null) => void): { root: HTMLElement; input: HTMLInputElement } {
  const root = el('label', 'companion-name');
  const input = el('input', 'help-input');
  input.type = 'text';
  input.value = initial;
  input.maxLength = COMPANION_CONFIG.maxNameLength * 2;
  input.autocomplete = 'off';
  input.spellcheck = false;
  const problem = el('span', 'companion-name-problem');
  problem.setAttribute('aria-live', 'polite');
  const check = (): void => {
    const result = withName(loadCompanion(), input.value);
    problem.textContent = result.ok ? '' : t(`companion.name.${result.problem}` as `companion.name.${NameProblem}`, { max: COMPANION_CONFIG.maxNameLength });
    input.setAttribute('aria-invalid', String(!result.ok));
    onValid(result.ok ? result.settings.name : null);
  };
  input.addEventListener('input', check);
  root.append(el('span', 'setting-text', t('companion.nameLabel')), input, problem);
  return { root, input };
}

/** Female / male choice with a preview of each. */
function genderChoice(current: CompanionSettings, onPick: (gender: CompanionSettings['gender']) => void): HTMLElement {
  const row = el('div', 'companion-genders');
  row.setAttribute('role', 'radiogroup');
  row.setAttribute('aria-label', t('companion.genderLabel'));
  for (const gender of COMPANION_GENDERS) {
    const option = el('button', 'companion-gender');
    option.type = 'button';
    option.setAttribute('role', 'radio');
    option.setAttribute('aria-checked', String(current.gender === gender));
    const preview = withGender(current, gender);
    option.append(renderMascot('happy', PREVIEW_PX, companionLook(preview)), el('strong', '', t(`companion.${gender}`)));
    option.addEventListener('click', () => onPick(gender));
    row.append(option);
  }
  return row;
}

/**
 * Story 025b: older or younger than the player (Vietnamese kinship pronouns); younger asks chị or anh. The title
 * question is phrased without "em" so it never contradicts the choice just made.
 */
function relationChoice(current: CompanionSettings, name: string, onPick: (change: Pick<CompanionSettings, 'relation' | 'playerTitle'>) => void): HTMLElement {
  const box = el('div', 'companion-relation');
  const question = el('strong', '', t('companion.relationQuestion', { name }));
  question.id = `relation-q-${Math.random().toString(36).slice(2, 8)}`;
  const row = el('div', 'companion-genders companion-relations');
  row.setAttribute('role', 'radiogroup');
  row.setAttribute('aria-labelledby', question.id);
  const elder = current.gender === 'male' ? 'anh' : 'chị';
  for (const relation of ['older', 'younger'] as const) {
    const option = el('button', 'companion-gender companion-relation-card');
    option.type = 'button';
    option.setAttribute('role', 'radio');
    option.setAttribute('aria-checked', String(current.relation === relation));
    option.append(el('strong', '', t(`companion.${relation}`)), el('span', 'setting-note', t(`companion.${relation}Note`, { name, elder })));
    option.addEventListener('click', () => onPick({ relation, playerTitle: current.playerTitle }));
    row.append(option);
  }
  box.append(question, el('span', 'setting-note', t('companion.relationNote', { name })), row);
  if (current.relation === 'younger') {
    const titleQ = el('strong', '', t('companion.titleQuestion', { name }));
    titleQ.id = `${question.id}-title`;
    const titles = el('div', 'companion-titles');
    titles.setAttribute('role', 'radiogroup');
    titles.setAttribute('aria-labelledby', titleQ.id);
    for (const title of ['chi', 'anh'] as const) {
      const b = el('button', 'chat-button secondary companion-title', t(title === 'chi' ? 'companion.titleChi' : 'companion.titleAnh'));
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(current.playerTitle === title));
      b.addEventListener('click', () => onPick({ relation: 'younger', playerTitle: title }));
      titles.append(b);
    }
    box.append(titleQ, titles);
  }
  return box;
}

/** The first meeting: pick your bestie and their name. Resolves when the player taps Let's go. */
export function createMeetScreen(host: HTMLElement, onDone: () => void): HTMLElement {
  const screen = el('section', 'screen companion-meet');
  screen.setAttribute('aria-labelledby', 'meet-title');
  let settings = loadCompanion();
  let validName: string | null = settings.name;
  const draw = (): void => {
    const title = el('h1', '', t('companion.meetTitle'));
    title.id = 'meet-title';
    const go = el('button', 'chat-button', t('companion.letsGo'));
    go.type = 'button';
    const field = nameField(settings.name, (name) => {
      validName = name;
      go.disabled = name === null;
    });
    go.addEventListener('click', () => {
      if (validName === null) return;
      saveCompanion({ ...settings, name: validName, chosen: true });
      screen.remove();
      onDone();
    });
    const choice = genderChoice(settings, (gender) => {
      settings = withGender({ ...settings, name: validName ?? settings.name }, gender);
      validName = settings.name;
      draw();
    });
    const relation = relationChoice(settings, validName ?? settings.name, (change) => {
      // Saved at once so every string (and the question itself) follows the choice.
      settings = { ...settings, ...change, name: validName ?? settings.name };
      saveCompanion({ ...loadCompanion(), ...change });
      draw();
    });
    // Story 020: a player who played in Safari can bring their progress into the home-screen app here.
    const restore = el('button', 'meet-restore', t('backup.firstRun'));
    restore.type = 'button';
    restore.addEventListener('click', () => openRestoreSheet(host));
    screen.replaceChildren(title, el('p', 'setting-note', t('companion.meetNote')), choice, field.root, relation, el('p', 'setting-note', t('companion.changeLater')), go, restore);
  };
  draw();
  host.append(screen);
  return screen;
}

/** The companion part of Settings: female/male, rename, and a way to dress-up. */
export function createCompanionSettings(onDressUp: () => void, onChange: () => void): HTMLElement {
  const section = el('section', 'companion-settings');
  const draw = (): void => {
    const settings = loadCompanion();
    const title = el('h2', '', t('companion.settingsTitle'));
    const status = el('p', 'setting-note');
    status.setAttribute('aria-live', 'polite');
    const choice = genderChoice(settings, (gender) => {
      saveCompanion({ ...withGender(loadCompanion(), gender), chosen: true });
      onChange();
    });
    let pending: string | null = settings.name;
    const field = nameField(settings.name, (name) => {
      pending = name;
    });
    const save = el('button', 'chat-button secondary', t('companion.saveName'));
    save.type = 'button';
    save.addEventListener('click', () => {
      if (pending === null) return;
      saveCompanion({ ...loadCompanion(), name: pending, chosen: true });
      onChange();
    });
    const dress = el('button', 'chat-button secondary', t('companion.dressUp', { name: settings.name }));
    dress.type = 'button';
    dress.addEventListener('click', onDressUp);
    const relation = relationChoice(settings, settings.name, (change) => {
      saveCompanion({ ...loadCompanion(), ...change, chosen: true });
      onChange();
    });
    section.replaceChildren(title, choice, field.root, save, relation, dress, status);
  };
  draw();
  return section;
}

/** How to earn a locked accessory, from its unlock rule. */
export function unlockText(accessory: Accessory): string {
  const rule = accessory.unlock;
  if (rule === 'first-five-stars') return t('unlock.fiveStars');
  if (rule === 'gift') return t('unlock.gift');
  const match = /^(bestie-level|phrasebook|streak)-(\d+)$/.exec(rule);
  if (!match) return t('unlock.start');
  const n = Number(match[2]);
  return match[1] === 'bestie-level' ? t('unlock.friendship', { n }) : match[1] === 'phrasebook' ? t('unlock.phrases', { n }) : t('unlock.streak', { n });
}

/** Dress-up: the companion large, every accessory by slot (locked ones say how to earn them), saved at once. */
export function createDressUpScreen(host: HTMLElement, onBack: () => void): HTMLElement {
  const lang = getLanguage();
  const screen = el('section', 'screen dress-up');
  screen.setAttribute('aria-labelledby', 'dress-title');
  const facts = unlockFacts();
  const draw = (): void => {
    const settings = loadCompanion();
    const title = el('h1', '', t('companion.dressTitle', { name: settings.name }));
    title.id = 'dress-title';
    const stage = el('div', 'dress-stage');
    stage.append(renderMascot('happy', DRESS_PX, { label: settings.name, crop: 'full', ...companionLook(settings) }));
    const slots = el('div', 'dress-slots');
    const bySlot = new Map<AccessorySlot, Accessory[]>();
    for (const accessory of MASCOT_CONFIG.accessories) bySlot.set(accessory.slot, [...(bySlot.get(accessory.slot) ?? []), accessory]);
    for (const [slot, items] of bySlot) {
      const group = el('section', 'results-section dress-slot');
      group.append(el('h2', '', t(`slot.${slot}` as `slot.${AccessorySlot}`)));
      for (const accessory of items) {
        const open = isUnlocked(accessory, facts);
        const on = settings.equipped[slot] === accessory.id;
        const item = el('button', open ? 'dress-item' : 'dress-item locked');
        item.type = 'button';
        item.setAttribute('aria-pressed', String(on));
        item.disabled = !open;
        item.append(el('strong', '', `${open ? '' : '🔒 '}${accessory.name[lang]}`), el('span', 'dress-how', open ? (on ? t('dress.wearing') : t('dress.tryOn')) : unlockText(accessory)));
        item.addEventListener('click', () => {
          saveCompanion(wear(loadCompanion(), accessory, !on, facts));
          draw();
        });
        group.append(item);
      }
      slots.append(group);
    }
    // The later cosmetic shop: a placeholder only. No prices, no purchases, nothing that helps English.
    const boutique = el('section', 'results-section dress-boutique');
    boutique.append(el('h2', '', t('dress.boutique')), el('p', 'setting-note', t('dress.boutiqueNote')));
    const back = el('button', 'chat-button secondary', t('common.back'));
    back.type = 'button';
    back.addEventListener('click', onBack);
    screen.replaceChildren(title, stage, el('p', 'setting-note', t('dress.note')), slots, boutique, back);
  };
  draw();
  host.append(screen);
  return screen;
}
