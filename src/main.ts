import { Application, Container } from 'pixi.js';
import { createAppointment } from './game/appointment';
import { createFetchTransport } from './game/client-turn-transport';
import { createGradeTransport } from './game/grade-appointment-transport';
import { DEFAULT_CLIENT } from './game/clients/default-client';
import { ROSTER, clientsByDifficulty, pickShift } from './game/clients/roster';
import { createClientPicker } from './game/ui/client-picker';
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
import { askForInvite, hasSession } from './game/ui/invite-screen';
import { openPracticeSheet } from './game/ui/practice-sheet';
import { createBrowserVoice, withSpeakingSignal } from './game/voice';
import { describeDesign } from './game/nail-art/match';
import type { MatchResult } from './game/nail-art/match';
import type { NailDesign } from './game/nail-art/design';
import { createAudioEngine } from './game/audio';
import { emitSound } from './game/sound-events';
import type { SpeechHost } from './game/voice';
import { createLearningPanel, createLevelChangePanel } from './game/ui/recap-screen';
import { createChatPanel } from './game/ui/chat-panel';
import { applyDocumentLanguage, getLanguage, t } from './game/i18n';
import { createDebriefPanel } from './game/ui/bestie-panel';
import { el } from './game/ui/dom';
import { createLevelPicker } from './game/ui/level-picker';
import { createResultsScreen } from './game/ui/results-screen';
import { createSettingsScreen } from './game/ui/settings-screen';
import type { ClientPersona, EnglishLevel } from './game/types';
import './game/ui/global.css';

async function boot(): Promise<void> {
  const host = document.getElementById('app');
  if (!host) throw new Error('#app element missing');
  applyDocumentLanguage();
  // Hosted preview only (VITE_INVITE_GATE=1, set by scripts/build-preview.mjs): ask for an invite code first.
  if (import.meta.env.VITE_INVITE_GATE === '1' && !(await hasSession())) await askForInvite(host);

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
          showClientPicker();
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
  // Music and sound (story 012): silent until the first tap; music ducks while anything is spoken.
  const audio = createAudioEngine({
    createContext: () => {
      const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      return Context ? new Context() : null;
    },
    setInterval: (handler, ms) => window.setInterval(handler, ms),
    clearInterval: (id) => window.clearInterval(id),
    addEventListener: (type, listener, options) => window.addEventListener(type, listener, options),
    removeEventListener: (type, listener, options) => window.removeEventListener(type, listener, options),
    isHidden: () => document.visibilityState === 'hidden',
  });
  const voice = withSpeakingSignal(createBrowserVoice(window as unknown as SpeechHost), (speaking) => audio.duck(speaking));
  /** Pronunciation practice, where the phone can listen. Uses the saved level (Beginner if none yet). */
  const practice = voice.canListen
    ? (line: string) => openPracticeSheet(host, { voice, line, level: getEnglishLevel() ?? 'beginner' })
    : undefined;
  const translateTransport = createTranslateTransport();
  // Every client's opening line is fixed text, so its translation is also kept on the device.
  const translations = createTranslationCache(translateTransport, ROSTER.map((client) => client.openingLine));

  /** Story 006: the clients still to come in a shift (empty outside a shift) and its size. */
  let shift: { queue: ClientPersona[]; total: number } = { queue: [], total: 0 };
  const SHIFT_SIZE = 3;

  const startAppointment = () => {
    // Inside the Start tap: lets the client's voice play on iPhone (story 004).
    voice.unlock();
    if (getEnglishLevel() === null) showLevelPicker();
    else showClientPicker();
  };

  /** Story 006: choose a difficulty, then a client, a random one, or a shift. */
  const showClientPicker = () => {
    teardownDom();
    shift = { queue: [], total: 0 };
    const begin = (client: ClientPersona) => beginAppointment(getEnglishLevel() ?? 'beginner', client);
    const screen = createClientPicker(host, {
      shiftSize: SHIFT_SIZE,
      onPick: begin,
      onRandom: (difficulty) => begin(pickShift(clientsByDifficulty(difficulty), 1)[0] ?? DEFAULT_CLIENT),
      onShift: (difficulty) => {
        const clients = pickShift(clientsByDifficulty(difficulty), SHIFT_SIZE);
        shift = { queue: clients.slice(1), total: clients.length };
        begin(clients[0] ?? DEFAULT_CLIENT);
      },
      onBack: showTitle,
    });
    teardownDom = () => screen.remove();
  };

  /** After the results: the next client in the shift, or back to the picker. */
  const nextClient = () => {
    voice.unlock();
    const next = shift.queue.shift();
    if (next) beginAppointment(getEnglishLevel() ?? 'beginner', next);
    else showClientPicker();
  };

  const beginAppointment = (level: EnglishLevel, client: ClientPersona) => {
    const shiftPosition = shift.total > 0 ? shift.total - shift.queue.length : 0;
    teardownDom();
    buildScene = createSalonScene;
    draw();
    // Story 005: what the client hears about her nails, and the finished result for the review and the stars.
    const nails: { note: string | undefined; finished: { description: string; match: number } | undefined } = { note: undefined, finished: undefined };
    const appointment = createAppointment({
      client,
      takeTurn: createFetchTransport(() => level, () => nails.note, client.id),
      level,
      // Grading starts from the chat panel's onEnded, once the final line has finished revealing (story 002).
      onFinished: () => undefined,
    });
    const panel = createChatPanel(host, appointment, {
      client,
      layer: portraitLayer,
      level,
      helpLanguage: getHelpLanguage(),
      translations,
      translate: translateTransport,
      ...(client.nailRequest
        ? {
            nailArt: {
              request: client.nailRequest,
              onNote: (note: string | undefined) => {
                nails.note = note;
              },
              onDone: (design: NailDesign, result: MatchResult) => {
                nails.finished = { description: describeDesign(design), match: result.score };
              },
            },
          }
        : {}),
      voice: { io: voice, clientId: client.id, speakReplies: getClientVoiceEnabled(), onSpeakerChange: setClientVoiceEnabled },
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
                  const { book, added } = addPhrases(loadPhrasebook(), [{ ...phrase, source: 'correction', session: loadMemory().sessions + 1 }]);
                  savePhrasebook(book);
                  if (added > 0) emitSound('phraseSaved');
                },
              },
            }
          : {}),
      },
      onEnded: (container, result) =>
        createResultsScreen(container, {
          clientName: client.name,
          clientId: client.id,
          result,
          level,
          config: SCORING_CONFIG,
          grade: gradeAppointment,
          onNextClient: nextClient,
          ...(shift.total > 0
            ? { nextLabel: shift.queue.length > 0 ? t('results.nextInShift', { n: shiftPosition + 1, total: shift.total }) : t('results.shiftDone') }
            : {}),
          onBackToMenu: showTitle,
          translations,
          helpLanguage: getHelpLanguage(),
          ...(nails.finished ? { nails: nails.finished } : {}),
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
