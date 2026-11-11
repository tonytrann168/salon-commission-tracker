import { Application, Container, Graphics } from 'pixi.js';
import { createPortrait } from './game/portraits/definitions';
import { createAppointment } from './game/appointment';
import { createFetchTransport } from './game/client-turn-transport';
import { createGradeTransport } from './game/grade-appointment-transport';
import { DEFAULT_CLIENT } from './game/clients/default-client';
import { ROSTER, clientsByDifficulty, pickShift } from './game/clients/roster';
import { createClientPicker } from './game/ui/client-picker';
import { NAIL_ART_CONFIG } from './game/nail-art/design';
import { applyAppointment, dailyChallenge, dailyDoneToday, liveStreak, rankUnlocking, stationPalette, unlockedDifficulties, upgradeEffects } from './game/progression';
import { loadSave, writeSave } from './game/save';
import { localDay } from './game/bestie-memory';
import { createShopScreen } from './game/ui/shop-screen';
import { createProfileScreen } from './game/ui/profile-screen';
import { celebrationsFor, createProgressPanel } from './game/ui/progress-panel';
import { celebrate } from './game/ui/celebration';
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
import { askForInvite, getSession } from './game/ui/invite-screen';
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
import { DIFFICULTIES } from './game/types';
import type { ClientPersona, EnglishLevel, Grading, Outcome } from './game/types';
import type { ScoreResult } from './game/scoring';
import './game/ui/global.css';

async function boot(): Promise<void> {
  const host = document.getElementById('app');
  if (!host) throw new Error('#app element missing');
  const appHost: HTMLElement = host;
  applyDocumentLanguage();
  // Hosted preview only (VITE_INVITE_GATE=1, set by scripts/build-preview.mjs): ask for an invite code first.
  // Tester codes the owner lists in UNLOCK_ALL_CODES open every client difficulty; the server decides, each load.
  let unlockAll = false;
  if (import.meta.env.VITE_INVITE_GATE === '1') {
    if (!(await getSession()).signedIn) await askForInvite(host);
    unlockAll = (await getSession()).unlockAll;
  }

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
    const menu = createTitleMenu(host, startAppointment, showSettings, showPhrasebook, showShop, showProfile);
    teardownDom = () => menu.remove();
  };

  const showSettings = () => {
    teardownDom();
    const screen = createSettingsScreen(host, showTitle);
    teardownDom = () => screen.remove();
  };

  /** Story 007: the shop and the profile. */
  const showShop = () => {
    teardownDom();
    const screen = createShopScreen(host, { load: loadSave, save: writeSave, onBack: showTitle });
    teardownDom = () => screen.remove();
  };

  const showProfile = () => {
    teardownDom();
    const screen = createProfileScreen(host, { save: loadSave(), today: localDay(), onBack: showTitle });
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
  /** Let the stars land before a celebration card covers them. */
  const CELEBRATE_DELAY_MS = 900;

  const startAppointment = () => {
    // Inside the Start tap: lets the client's voice play on iPhone (story 004).
    voice.unlock();
    if (getEnglishLevel() === null) showLevelPicker();
    else showClientPicker();
  };

  /** The client picker's faces: each client's placeholder portrait (neutral), drawn once and kept as an image. */
  const faces = new Map<string, Promise<string | null>>();
  const FACE_PX = 96;
  const faceImage = (client: ClientPersona): Promise<string | null> => {
    const cached = faces.get(client.id);
    if (cached) return cached;
    const drawn = (async () => {
      const portrait = createPortrait(client.portraitId, FACE_PX, 'neutral');
      // A clear square behind the face keeps every image the same size and centred.
      const frame = new Container();
      frame.addChild(new Graphics().rect(0, 0, FACE_PX, FACE_PX).fill({ color: 0xffffff, alpha: 0 }), portrait.view);
      try {
        return await app.renderer.extract.base64({ target: frame, resolution: 2 });
      } catch {
        return null;
      } finally {
        frame.destroy({ children: true });
      }
    })();
    faces.set(client.id, drawn);
    return drawn;
  };

  /** Story 006: choose a difficulty, then a client, a random one, or a shift. */
  const showClientPicker = () => {
    teardownDom();
    shift = { queue: [], total: 0 };
    const begin = (client: ClientPersona, daily = false) => beginAppointment(getEnglishLevel() ?? 'beginner', client, daily);
    // Story 007: harder clients open with rank; today's challenge is fixed in the save once offered.
    const today = localDay();
    const offered = dailyChallenge(loadSave(), today, ROSTER);
    if (offered) writeSave(offered.save);
    const save = loadSave();
    const screen = createClientPicker(host, {
      unlocked: unlockAll ? DIFFICULTIES : unlockedDifficulties(save.xp),
      lockedLine: (difficulty) => t('picker.locked', { rank: `${rankUnlocking(difficulty).name[getLanguage()]} ${rankUnlocking(difficulty).icon}` }),
      ...(offered ? { daily: { client: offered.client, done: dailyDoneToday(save, today), streak: liveStreak(save, today), onPick: () => begin(offered.client, true) } } : {}),
      shiftSize: SHIFT_SIZE,
      onPick: begin,
      onRandom: (difficulty) => begin(pickShift(clientsByDifficulty(difficulty), 1)[0] ?? DEFAULT_CLIENT),
      onShift: (difficulty) => {
        const clients = pickShift(clientsByDifficulty(difficulty), SHIFT_SIZE);
        shift = { queue: clients.slice(1), total: clients.length };
        begin(clients[0] ?? DEFAULT_CLIENT);
      },
      onBack: showTitle,
      faceImage,
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

  const beginAppointment = (level: EnglishLevel, persona: ClientPersona, daily = false) => {
    // Story 007: owned upgrades (a comfier chair starts clients happier; finer brush; better clean-up pen).
    const effects = upgradeEffects(loadSave());
    const client: ClientPersona = { ...persona, startingMood: Math.min(90, persona.startingMood + effects.startMood) };
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
              palette: stationPalette(NAIL_ART_CONFIG.palette, loadSave()),
              tools: { brushRadius: NAIL_ART_CONFIG.brushRadius * effects.brushScale, cleanupRadius: NAIL_ART_CONFIG.cleanupRadius * effects.cleanupScale },
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
            // Story 007: tips into the wallet, XP and rank, badges and the daily streak, once per appointment.
            progressPanel(grading, score, result.outcome),
            createDebriefPanel({ transport: bestie, level, language: getLanguage(), outcome: result.outcome, transcript: result.transcript, grading, score }),
            createLearningPanel({ transport: corrections, level, language: getLanguage(), outcome: result.outcome, transcript: result.transcript, ...(practice ? { onPractice: practice } : {}) }),
            ...[createLevelChangePanel(level, score.englishScore)].filter((panel): panel is HTMLElement => panel !== null),
          ],
        }).destroy,
    });
    teardownDom = panel.destroy;

    let progress: HTMLElement | null = null;
    function progressPanel(grading: Grading, score: ScoreResult, outcome: Outcome): HTMLElement {
      if (progress) return progress;
      const update = applyAppointment(loadSave(), {
        stars: score.stars,
        tip: score.tip,
        goalMet: score.goalMet,
        walkedOut: outcome === 'walked_out',
        skills: grading.skills,
        englishScore: score.englishScore,
        ...(nails.finished ? { nailMatch: nails.finished.match } : {}),
        difficulty: persona.difficulty,
        daily,
        today: localDay(),
      });
      writeSave(update.save);
      const items = celebrationsFor(update);
      const panel = createProgressPanel(update);
      // Only while the results are still showing (the player may already have tapped Next).
      if (items.length > 0) window.setTimeout(() => panel.isConnected && celebrate(appHost, items), CELEBRATE_DELAY_MS);
      progress = panel;
      return panel;
    }
  };

  app.renderer.on('resize', draw);
  showTitle();
}

void boot();
