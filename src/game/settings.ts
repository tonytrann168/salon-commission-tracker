import { parseStoredHelpLanguage, parseStoredLevel } from './english-level';
import { readStored, writeStored } from './safe-storage';
import type { EnglishLevel, HelpLanguage } from './types';

/** Player settings saved on the device. Story: story-010 (level picker, Settings, full Vietnamese mode). */

const LEVEL_KEY = 'salon.englishLevel';
const HELP_LANGUAGE_KEY = 'salon.helpLanguage';

/** The saved English level, or `null` before the player has chosen one. */
export function getEnglishLevel(): EnglishLevel | null {
  return parseStoredLevel(readStored(LEVEL_KEY));
}

/** Save the English level. */
export function setEnglishLevel(level: EnglishLevel): void {
  writeStored(LEVEL_KEY, level);
}

/**
 * The language of Vietnamese help: `tap` (translate on tap) or `full` (full Vietnamese mode, every client line with its
 * translation). Stories 003 (bestie) and 011 (recap) read this too.
 */
export function getHelpLanguage(): HelpLanguage {
  return parseStoredHelpLanguage(readStored(HELP_LANGUAGE_KEY));
}

/** Save the help-language setting. */
export function setHelpLanguage(language: HelpLanguage): void {
  writeStored(HELP_LANGUAGE_KEY, language);
}
