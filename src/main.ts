import { Application, Container } from 'pixi.js';
import { createAppointment } from './game/appointment';
import { createFetchTransport } from './game/client-turn-transport';
import { createGradeTransport } from './game/grade-appointment-transport';
import { DEFAULT_CLIENT } from './game/clients/default-client';
import { SCORING_CONFIG } from './game/scoring';
import { createSalonScene } from './game/salon-scene';
import { createTitleMenu, createTitleScreen } from './game/title-screen';
import { createBestieTransport } from './game/bestie';
import { createTranslateTransport } from './game/translate-transport';
import { createTranslationCache } from './game/translation-cache';
import { getClientVoiceEnabled, setClientVoiceEnabled, getCorrectionsEnabled, getEnglishLevel, getHelpLanguage, getHintsEnabled, chooseEnglishLevel } from './game/settings';
import { loadMemory } from './game/bestie-memory';
import { createCorrectionsTransport } from './game/learning/corrections';
import { addPhrases, loadPhrasebook, savePhrasebook } from './game/learning/phrasebook';
import { createPhrasebookScreen } from './game/ui/phrasebook-screen';
import { openPracticeSheet } from './game/ui/practice-sheet';
import { createBrowserVoice } from './game/voice';
import type { SpeechHost } from './game/voice';
import { createLearningPanel, createLevelChangePanel } from './game/ui/recap-screen';
import { createChatPanel } from './game/ui/chat-panel';
import { applyDocumentLanguage, getLanguage, t } from './game/i18n';
import { createDebriefPanel } from './game/ui/bestie-panel';
import { el } from './game/ui/dom';
import { createLevelPicker } from './game/ui/level-picker';
import { createResultsScreen } from './game/ui/results-screen';
import { createSettingsScreen } from './game/ui/settings-screen';
import type { EnglishLevel } from './game/types';
import './game/ui/global.css';

async function boot(): Promise<void> {
  const host = document.getElementById('app');
  if (!host) throw new Error('#app element missing');
  applyDocumentLanguage();

  const app = new Application();
  await app.init({ resizeTo: host, background: 0xfff4f8, antialias: true, autoDensity: true, resolution: window.devicePixelRatio || 1 });
  host.appendChild(app.canvas);

  let buildScene: (width: number, height: number) => Container = createTitleScreen;
  let teardownDom: () => void = () => undefined;

  // Scenes are rebuilt on resize. Portraits live on their own layer so they survive redraws.
  const sceneRoot = new Container();
  const portraitLayer = new Container();
  app.stage.addChild(sceneRoot, portraitLayer);

  const draw = () => {
    sceneRoot.removeChildren().forEach((old) => old.destroy({ children: true }));
    sceneRoot.addChild(buildScene(app.screen.width, app.screen.height));
  };

  const showTitle = () => {
    teardownDom();
    buildScene = createTitleScreen;
    draw();
    const menu = createTitleMenu(host, startAppointment, showSettings, showPhrasebook);
    teardownDom = () => menu.remove();
  };

  const showSettings = () => {
    teardownDom();
    const screen = createSettingsScreen(host, showTitle);
    teardownDom = () => screen.remove();
  };

  const showPhrasebook = () => {
    teardownDom();
    const screen = createPhrasebookScreen(host, showTitle, practice);
    teardownDom = () => screen.remove();
  };

  /** First appointment: the player picks an English level before anything starts. */
  const showLevelPicker = () => {
    teardownDom();
    const screen = el('section', 'screen');
    const title = el('h1', '', t('level.pickerTitle'));
    const back = el('button', 'chat-button secondary', t('common.back'));
    back.type = 'button';
    back.addEventListener('click', showTitle);
    screen.append(
      title,
      createLevelPicker({
        current: null,
        onPick: (level) => {
          if (chooseEnglishLevel(level)) applyDocumentLanguage();
          beginAppointment(level);
        },
      }),
      back,
    );
    host.appendChild(screen);
    teardownDom = () => screen.remove();
  };

  const gradeAppointment = createGradeTransport();
  const bestie = createBestieTransport();
  const corrections = createCorrectionsTransport();
  // Voice: the phone's own speech recognition and synthesis (story 004). No key, nothing on the server.
  const voice = createBrowserVoice(window as unknown as SpeechHost);
  /** Pronunciation practice, where the phone can listen. Uses the saved level (Beginner if none yet). */
  const practice = voice.canListen
    ? (line: string) => openPracticeSheet(host, { voice, line, level: getEnglishLevel() ?? 'beginner' })
    : undefined;
  const translateTransport = createTranslateTransport();
  // The default client's opening line is fixed text, so its translation is also kept on the device.
  const translations = createTranslationCache(translateTransport, [DEFAULT_CLIENT.openingLine]);

  const startAppointment = () => {
    const level = getEnglishLevel();
    if (level === null) showLevelPicker();
    else beginAppointment(level);
  };

  const beginAppointment = (level: EnglishLevel) => {
    teardownDom();
    buildScene = createSalonScene;
    draw();
    const appointment = createAppointment({
      client: DEFAULT_CLIENT,
      takeTurn: createFetchTransport(() => level),
      level,
      // Grading starts from the chat panel's onEnded, once the final line has finished revealing (story 002).
      onFinished: () => undefined,
    });
    const panel = createChatPanel(host, appointment, {
      client: DEFAULT_CLIENT,
      layer: portraitLayer,
      level,
      helpLanguage: getHelpLanguage(),
      translations,
      translate: translateTransport,
      voice: { io: voice, clientId: DEFAULT_CLIENT.id, speakReplies: getClientVoiceEnabled(), onSpeakerChange: setClientVoiceEnabled },
      bestie: {
        transport: bestie,
        language: getLanguage(),
        hints: getHintsEnabled(),
        ...(getCorrectionsEnabled()
          ? {
              corrections: {
                transport: corrections,
                // A whispered correction's better line goes straight into the phrasebook.
                onPhrase: (phrase) => {
                  const { book } = addPhrases(loadPhrasebook(), [{ ...phrase, source: 'correction', session: loadMemory().sessions + 1 }]);
                  savePhrasebook(book);
                },
              },
            }
          : {}),
      },
      onEnded: (container, result) =>
        createResultsScreen(container, {
          clientName: DEFAULT_CLIENT.name,
          result,
          level,
          config: SCORING_CONFIG,
          grade: gradeAppointment,
          onNextClient: startAppointment,
          onBackToMenu: showTitle,
          translations,
          helpLanguage: getHelpLanguage(),
          extras: (grading, score) => [
            createDebriefPanel({ transport: bestie, level, language: getLanguage(), outcome: result.outcome, transcript: result.transcript, grading, score }),
            createLearningPanel({ transport: corrections, level, language: getLanguage(), outcome: result.outcome, transcript: result.transcript, ...(practice ? { onPractice: practice } : {}) }),
            ...[createLevelChangePanel(level, score.englishScore)].filter((panel): panel is HTMLElement => panel !== null),
          ],
        }).destroy,
    });
    teardownDom = panel.destroy;
  };

  app.renderer.on('resize', draw);
  showTitle();
}

void boot();
