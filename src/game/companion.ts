import { bestieLevel, loadMemory } from './bestie-memory';
import type { BestieMemory } from './bestie-memory';
import { COMPANION_CONFIG, checkCompanionName, companionGrammar } from './companion-core';
import type { CompanionGender, CompanionIdentity, NameProblem } from './companion-core';
import { loadPhrasebook } from './learning/phrasebook';
import { MASCOT_CONFIG } from './mascot/mascot';
import type { Accessory, Equipped } from './mascot/mascot';
import type { ProgressSave } from './progression';
import { readStored, writeStored } from './safe-storage';
import { loadSave } from './save';

/**
 * The player's companion on this device (story 013): female or male (picked at the first meeting, changeable in
 * Settings), a name, and the look (accessories worn). Accessories are free and unlock by playing. Everything that
 * shows or names the companion asks here.
 */

export interface CompanionSettings extends CompanionIdentity {
  /** False until the player has met and picked their companion. */
  chosen: boolean;
  equipped: Equipped;
}

const KEY = 'salon.companion.v1';

const defaults = (gender: CompanionGender = 'female'): CompanionSettings => ({ chosen: false, gender, name: COMPANION_CONFIG.defaultName[gender], equipped: { ...MASCOT_CONFIG.equipped } });

/** Read the saved companion; anything missing or bad falls back (to Mai, female, nothing worn). */
export function parseCompanion(raw: string | null): CompanionSettings {
  let data: unknown = null;
  try {
    data = raw === null ? null : JSON.parse(raw);
  } catch {
    data = null;
  }
  if (typeof data !== 'object' || data === null) return defaults();
  const d = data as Record<string, unknown>;
  const gender: CompanionGender = d.gender === 'male' ? 'male' : 'female';
  const name = typeof d.name === 'string' ? checkCompanionName(d.name) : null;
  const equipped: Equipped = {};
  if (typeof d.equipped === 'object' && d.equipped !== null) {
    for (const [slot, id] of Object.entries(d.equipped as Record<string, unknown>)) {
      const accessory = MASCOT_CONFIG.accessories.find((a) => a.id === id && a.slot === slot);
      if (accessory) equipped[accessory.slot] = accessory.id;
    }
  }
  return { chosen: d.chosen === true, gender, name: name?.ok ? name.name : COMPANION_CONFIG.defaultName[gender], equipped };
}

export const loadCompanion = (): CompanionSettings => parseCompanion(readStored(KEY));
export const saveCompanion = (settings: CompanionSettings): void => writeStored(KEY, JSON.stringify(settings));

export const companionName = (): string => loadCompanion().name;
export const companionIdentity = (): CompanionIdentity => {
  const { name, gender } = loadCompanion();
  return { name, gender };
};
/** How the companion says "I" in Vietnamese, capitalised (Chị / Anh). */
export const companionSelf = (): string => companionGrammar(loadCompanion().gender).self;
/** The mascot skin for the companion's gender. */
export const companionSkin = (settings: CompanionSettings = loadCompanion()): string => COMPANION_CONFIG.skins[settings.gender];
/** What renderMascot needs to show the companion's current look. */
export const companionLook = (settings: CompanionSettings = loadCompanion()): { skinId: string; equipped: Equipped } => ({ skinId: companionSkin(settings), equipped: settings.equipped });

/** Pick (or change) gender. Keeps a name the player typed; a default name follows the new gender. */
export function withGender(settings: CompanionSettings, gender: CompanionGender): CompanionSettings {
  const typed = settings.name !== COMPANION_CONFIG.defaultName[settings.gender];
  return { ...settings, gender, name: typed ? settings.name : COMPANION_CONFIG.defaultName[gender] };
}

/** Rename: the tidied name, or why not. */
export function withName(settings: CompanionSettings, raw: string): { ok: true; settings: CompanionSettings } | { ok: false; problem: NameProblem } {
  const checked = checkCompanionName(raw);
  return checked.ok ? { ok: true, settings: { ...settings, name: checked.name } } : checked;
}

// ---- Free accessories, unlocked by playing ----

export interface UnlockFacts {
  friendshipLevel: number;
  phrases: number;
  fiveStars: boolean;
  /** Best daily streak reached (from the streak badges) or the live one. */
  streak: number;
}

export function unlockFacts(memory: BestieMemory = loadMemory(), save: ProgressSave = loadSave(), phrases: number = loadPhrasebook().length): UnlockFacts {
  const badgeStreak = save.badges.includes('streak-7') ? 7 : save.badges.includes('streak-3') ? 3 : 0;
  return { friendshipLevel: bestieLevel(memory.xp), phrases, fiveStars: save.badges.includes('five-stars'), streak: Math.max(badgeStreak, save.streak) };
}

/** Is this accessory's unlock rule met? Rules: start, bestie-level-N, first-five-stars, phrasebook-N, streak-N. */
export function isUnlocked(accessory: Accessory, facts: UnlockFacts): boolean {
  const rule = accessory.unlock;
  if (rule === 'start') return true;
  if (rule === 'first-five-stars') return facts.fiveStars;
  const match = /^(bestie-level|phrasebook|streak)-(\d+)$/.exec(rule);
  if (!match) return false;
  const n = Number(match[2]);
  if (match[1] === 'bestie-level') return facts.friendshipLevel >= n;
  if (match[1] === 'phrasebook') return facts.phrases >= n;
  return facts.streak >= n;
}

/** Wear an accessory (or take the slot off with null). Locked items cannot be worn. */
export function wear(settings: CompanionSettings, accessory: Accessory, on: boolean, facts: UnlockFacts): CompanionSettings {
  if (on && !isUnlocked(accessory, facts)) return settings;
  const equipped = { ...settings.equipped };
  if (on) equipped[accessory.slot] = accessory.id;
  else if (equipped[accessory.slot] === accessory.id) delete equipped[accessory.slot];
  return { ...settings, equipped };
}
