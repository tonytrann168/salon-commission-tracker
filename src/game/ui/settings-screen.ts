import { companionName } from '../companion';
import { applyDocumentLanguage, getLanguage, t } from '../i18n';
import { loadAudioSettings, saveAudioSettings } from '../audio';
import type { AudioSettings } from '../audio';
import { LEARNING_CONFIG } from '../learning/corrections';
import { getPlayerName, setPlayerName, PLAYER_NAME_MAX, getClientVoiceEnabled, setClientVoiceEnabled, getCorrectionsEnabled, getEnglishLevel, getHelpLanguage, getHintsEnabled, setCorrectionsEnabled, chooseEnglishLevel, setHelpLanguage, setHintsEnabled } from '../settings';
import { bilingual, el } from './dom';
import { createLevelPicker } from './level-picker';
import { createCompanionSettings } from './companion-screens';
import { replayTour } from '../onboarding';
import { feedbackButton } from './feedback-sheet';
import { createBackupSection } from './backup-panel';
import { createComfortSection } from './comfort-section';
import './level-picker.css';

/**
 * Settings: change the English level, turn full Vietnamese mode on or off, turn bestie hints (story 003) and whispered corrections (story 011) on or off. All save at once.
 * Full Vietnamese mode is also the interface language: turning it on or off redraws this screen in the new language
 * at once. Its own label is always shown in both languages, so a player can always find the way back. Story: story-010, story-008.
 */
export function createSettingsScreen(host: HTMLElement, onBack: () => void, onDressUp?: () => void): HTMLElement {
  const screen = el('section', 'screen');
  screen.setAttribute('aria-labelledby', 'settings-title');

  const render = (): void => {
    const title = el('h1', '', t('settings.title'));
    title.id = 'settings-title';

    // Mai greets the player by name (owner, 2026-11-10). Optional; saved only on this phone.
    const nameRow = el('label', 'setting-row');
    const nameText = el('span', 'setting-text');
    nameText.append(el('strong', '', t('settings.playerName')), el('span', 'setting-note', t('settings.playerNameNote')));
    const nameInput = el('input', 'help-input setting-name');
    nameInput.type = 'text';
    nameInput.maxLength = PLAYER_NAME_MAX;
    nameInput.autocomplete = 'given-name';
    nameInput.placeholder = t('settings.playerNamePlaceholder');
    nameInput.value = getPlayerName();
    nameInput.addEventListener('change', () => {
      setPlayerName(nameInput.value);
      nameInput.value = getPlayerName();
    });
    nameRow.append(nameText, nameInput);

    const levelTitle = el('h2', '', t('settings.levelSection'));
    const picker = createLevelPicker({
      current: getEnglishLevel(),
      onPick: (level) => {
        // Switching to Beginner turns full Vietnamese mode on: redraw so the switch and the menus show it at once.
        if (!chooseEnglishLevel(level)) return;
        applyDocumentLanguage();
        render();
        screen.querySelector<HTMLButtonElement>('.level-card[aria-pressed="true"]')?.focus();
      },
    });

    const row = el('label', 'setting-row');
    const toggle = el('input');
    toggle.type = 'checkbox';
    toggle.checked = getHelpLanguage() === 'full';
    toggle.addEventListener('change', () => {
      setHelpLanguage(toggle.checked ? 'full' : 'tap');
      applyDocumentLanguage();
      render();
      screen.querySelector<HTMLInputElement>('.setting-row input')?.focus();
    });
    const note = el('span', 'setting-text');
    note.append(bilingual('settings.fullVietnamese'), el('span', 'setting-note', t('settings.fullVietnameseNote')));
    row.append(note, toggle);

    const hintsRow = el('label', 'setting-row');
    const hintsToggle = el('input');
    hintsToggle.type = 'checkbox';
    hintsToggle.checked = getHintsEnabled();
    hintsToggle.addEventListener('change', () => setHintsEnabled(hintsToggle.checked));
    const hintsText = el('span', 'setting-text');
    hintsText.append(el('strong', '', t('settings.hints')), el('span', 'setting-note', t('settings.hintsNote', { name: companionName() })));
    hintsRow.append(hintsText, hintsToggle);

    const correctionsRow = el('label', 'setting-row');
    const correctionsToggle = el('input');
    correctionsToggle.type = 'checkbox';
    correctionsToggle.checked = getCorrectionsEnabled();
    correctionsToggle.addEventListener('change', () => setCorrectionsEnabled(correctionsToggle.checked));
    const correctionsText = el('span', 'setting-text');
    correctionsText.append(
      el('strong', '', t('settings.corrections')),
      el('span', 'setting-note', t('settings.correctionsNote', { name: companionName(), count: LEARNING_CONFIG.whispers.maxPerAppointment })),
    );
    correctionsRow.append(correctionsText, correctionsToggle);

    const voiceRow = el('label', 'setting-row');
    const voiceToggle = el('input');
    voiceToggle.type = 'checkbox';
    voiceToggle.checked = getClientVoiceEnabled();
    voiceToggle.addEventListener('change', () => setClientVoiceEnabled(voiceToggle.checked));
    const voiceText = el('span', 'setting-text');
    voiceText.append(el('strong', '', t('settings.clientVoice')), el('span', 'setting-note', t('settings.clientVoiceNote')));
    voiceRow.append(voiceText, voiceToggle);

    // Music and sound effects (story 012): a volume slider and a mute each, saved and applied at once.
    const soundRow = (key: 'music' | 'sfx'): HTMLElement => {
      const row = el('div', 'setting-row sound-row');
      const name = t(key === 'music' ? 'settings.music' : 'settings.sfx');
      const slider = el('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '100';
      slider.step = '5';
      slider.value = String(Math.round(loadAudioSettings()[key] * 100));
      slider.setAttribute('aria-label', t('settings.volumeLabel', { name }));
      const muteLabel = el('label', 'sound-mute');
      const mute = el('input');
      mute.type = 'checkbox';
      const muteKey: keyof AudioSettings = key === 'music' ? 'musicMuted' : 'sfxMuted';
      mute.checked = loadAudioSettings()[muteKey] as boolean;
      muteLabel.append(mute, el('span', '', t('settings.mute')));
      slider.addEventListener('input', () => saveAudioSettings({ ...loadAudioSettings(), [key]: Number(slider.value) / 100 }));
      mute.addEventListener('change', () => saveAudioSettings({ ...loadAudioSettings(), [muteKey]: mute.checked }));
      row.append(el('strong', 'sound-name', name), slider, muteLabel);
      return row;
    };
    const soundNote = el('p', 'setting-note sound-note', t('settings.soundNote'));

    const back = el('button', 'chat-button secondary', t('common.back'));
    back.type = 'button';
    back.addEventListener('click', onBack);

    // Story 013: your bestie (female/male, name, dress-up).
    const companion = createCompanionSettings(onDressUp ?? (() => undefined), render);
    // Story 015: show the first-appointment tour again.
    const tourRow = el('div', 'setting-row');
    const replay = el('button', 'chat-button secondary', t('settings.replayTour'));
    replay.type = 'button';
    const tourNote = el('span', 'setting-note');
    tourNote.setAttribute('aria-live', 'polite');
    replay.addEventListener('click', () => {
      replayTour();
      tourNote.textContent = t('settings.replayTourDone');
    });
    tourRow.append(replay, tourNote);
    // Story 016: tester feedback (game details on by default, never chat text from here).
    const feedback = feedbackButton(host, { details: { language: getLanguage(), ...(getEnglishLevel() ? { level: getEnglishLevel() as string } : {}) } });
    // Story 020: back up / restore (iPhone keeps Safari and the home-screen app apart).
    const backup = createBackupSection(host);
    // Story 023: comfort and accessibility.
    const comfort = createComfortSection();
    screen.replaceChildren(title, nameRow, companion, tourRow, feedback, levelTitle, picker, row, voiceRow, soundRow('music'), soundRow('sfx'), soundNote, hintsRow, correctionsRow, comfort, backup, back);
  };

  render();
  host.appendChild(screen);
  return screen;
}
