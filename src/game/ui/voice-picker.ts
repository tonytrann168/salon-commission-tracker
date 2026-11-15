import { loadCompanion } from '../companion';
import { companionSpeech } from '../companion-voice';
import { getLanguage, t } from '../i18n';
import { createBrowserVoice } from '../voice';
import type { SpeechHost, VoiceIO } from '../voice';
import { withNaturalVoice } from '../natural-voice';
import type { AudioLike } from '../natural-voice';
import { loadSave, writeSave } from '../save';
import { getEnglishLevel } from '../settings';
import { VOICE_CAST, companionVoice } from '../voice-cast';
import type { VoiceGender } from '../voice-cast';
import { el } from './dom';
import './voice-picker.css';

/**
 * Story 055: choose the companion's voice: 3 Azure voices for her gender, each with a ▶ sample in the player's help
 * language. The choice goes in the save (synced) and is used everywhere she speaks.
 */
let shared: VoiceIO | null = null;
const speaker = (): VoiceIO =>
  (shared ??= withNaturalVoice(createBrowserVoice(window as unknown as SpeechHost), { fetch: (input, init) => fetch(input, init), createAudio: () => new Audio() as unknown as AudioLike }));

export function createVoicePicker(options: { gender?: () => VoiceGender; name?: () => string } = {}): HTMLElement {
  const box = el('section', 'voice-picker');
  const draw = (): void => {
    const gender = options.gender?.() ?? loadCompanion().gender;
    const name = options.name?.() ?? loadCompanion().name;
    const chosen = companionVoice(gender, loadSave().companionVoice).id;
    const lang = getLanguage();
    const list = el('div', 'voice-choices');
    list.setAttribute('role', 'radiogroup');
    list.setAttribute('aria-label', t('voicePick.title', { name }));
    for (const choice of VOICE_CAST.azure.companion[gender]) {
      const row = el('div', 'voice-choice');
      const pick = el('button', 'chat-button secondary voice-choice-pick', choice.label[lang]);
      pick.type = 'button';
      pick.dataset.voice = choice.id;
      pick.setAttribute('role', 'radio');
      pick.setAttribute('aria-checked', String(choice.id === chosen));
      pick.addEventListener('click', () => {
        writeSave({ ...loadSave(), companionVoice: choice.id });
        draw();
      });
      const play = el('button', 'chat-button voice-choice-play', '▶');
      play.type = 'button';
      play.dataset.voice = choice.id;
      play.setAttribute('aria-label', t('voicePick.sample', { voice: choice.label[lang] }));
      play.addEventListener('click', () => {
        const io = speaker();
        io.unlock();
        void io.speak(t('voicePick.sampleLine', { name }), companionSpeech(lang, getEnglishLevel() ?? 'some', choice.id));
      });
      row.append(pick, play);
      list.append(row);
    }
    box.replaceChildren(el('strong', '', t('voicePick.title', { name })), el('span', 'setting-note', t('voicePick.note', { name })), list);
  };
  draw();
  return Object.assign(box, { redraw: draw });
}
