import { loadCompanion } from './companion';
import { loadSave } from './save';
import { getSpeechSpeed } from './settings';
import type { EnglishLevel } from './types';
import type { SpeakOptions } from './voice';

/**
 * Story 055: how the companion speaks, everywhere (tips aloud, Help me say it, pronunciation examples, the voice
 * samples): her gender, the player's chosen voice (in the save) and the Speech speed. The natural voice (/api/tts)
 * is used while it works; the phone's voice only after an error.
 */
export function companionSpeech(lang: 'en' | 'vi', level: EnglishLevel, voice: string | undefined = loadSave().companionVoice): SpeakOptions {
  return { level, companion: { gender: loadCompanion().gender, lang, ...(voice ? { voice } : {}) }, speed: getSpeechSpeed() };
}
