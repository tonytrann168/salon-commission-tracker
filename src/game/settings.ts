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

const HINTS_KEY = 'salon.bestieHints';

/** Whether the bestie's Hint button shows during appointments (story 003). On unless the player turned it off. */
export function getHintsEnabled(): boolean {
  return readStored(HINTS_KEY) !== 'off';
}

/** Turn bestie hints on or off. */
export function setHintsEnabled(enabled: boolean): void {
  writeStored(HINTS_KEY, enabled ? 'on' : 'off');
}

const CORRECTIONS_KEY = 'salon.bestieCorrections';

/** Whether the bestie whispers corrections after a player line (story 011). On unless the player turned it off. */
export function getCorrectionsEnabled(): boolean {
  return readStored(CORRECTIONS_KEY) !== 'off';
}

/** Turn whispered corrections on or off. */
export function setCorrectionsEnabled(enabled: boolean): void {
  writeStored(CORRECTIONS_KEY, enabled ? 'on' : 'off');
}

const CLIENT_VOICE_KEY = 'salon.clientVoice';

/** Whether clients speak their lines aloud (story 004). On unless the player turned it off. */
export function getClientVoiceEnabled(): boolean {
  return readStored(CLIENT_VOICE_KEY) !== 'off';
}

/** Turn the client's voice on or off (Settings, or the speaker button in an appointment). */
export function setClientVoiceEnabled(enabled: boolean): void {
  writeStored(CLIENT_VOICE_KEY, enabled ? 'on' : 'off');
}
