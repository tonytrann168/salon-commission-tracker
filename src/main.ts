import type { SceneName, Stage } from './game/stage';
import { createAppointment } from './game/appointment';
import { createFetchTransport } from './game/client-turn-transport';
import { createGradeTransport } from './game/grade-appointment-transport';
import { DEFAULT_CLIENT } from './game/clients/default-client';
import { ROSTER, clientsByDifficulty, pickShift } from './game/clients/roster';
import { createClientPicker } from './game/ui/client-picker';
import { NAIL_ART_CONFIG } from './game/nail-art/design';
import { applyAppointment, dailyChallenge, dailyDoneToday, liveStreak, rankUnlocking, stationPalette, unlockedDifficulties, upgradeEffects, hashDay } from './game/progression';
import { loadSave, writeSave } from './game/save';
import { afterHello, localDay } from './game/bestie-memory';
import { celebrationsFor, createProgressPanel } from './game/ui/progress-panel';
import { celebrate } from './game/ui/celebration';
import { companionIdentity, loadCompanion } from './game/companion';
import { createDressUpScreen, createMeetScreen } from './game/ui/companion-screens';
import { gainFriendship } from './game/ui/friendship';
import { createStaleBuildGuard, isChunkLoadError } from './game/stale-build';
import { SCENARIOS, SCENARIO_ODDS, applyScenario, eligibleScenarios, getScenario, pickScenario } from './game/scenarios';
import type { Scenario } from './game/scenarios';
import { startTour } from './game/ui/tour';
import { feedbackButton } from './game/ui/feedback-sheet';
import { SCORING_CONFIG } from './game/scoring';
import { createTitleMenu } from './game/ui/title-menu';
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
import './game/ui/comfort.css';
import { applyComfort } from './game/comfort';
import { installErrorHandling } from './game/ui/error-screen';
import { APP_VERSION } from './game/feedback';
import { getAccount, useCloudForTesting } from './game/account/account';
import { accountNudge, showSyncOutcome } from './game/ui/account-panel';
import { isBackedUp } from './game/backup';
import { onStoredWrite, readStored, writeStored } from './game/safe-storage';
import { CORNER_SEEN_KEY, shouldCue } from './game/corner';
import { SEASON_KEY, activeSeason, giftDue, openGift, parseSeasonState, seasonOverride, seasonPalette, seasonStickers } from './game/seasons';
import type { Season } from './game/seasons';

async function boot(): Promise<void> {
  const host = document.getElementById('app');
  if (!host) throw new Error('#app element missing');
  const appHost: HTMLElement = host;
  applyDocumentLanguage();
  // Story 023: text size, reduced motion and contrast from the saved comfort settings.
  applyComfort();
  // Story 025: accounts (only when this build has the account settings). Saved changes go up after a quiet moment;
  // a remembered session is matched with the cloud at start.
  onStoredWrite((key) => {
    if (isBackedUp(key)) getAccount()?.changed();
  });
  const account = getAccount();
  if (account) void account.start().then((outcome) => (outcome.kind !== 'error' || navigator.onLine) && showSyncOutcome(appHost, outcome));
  // Dev builds only: evidence scripts swap in a stand-in cloud.
  if (import.meta.env.DEV) (window as unknown as { salonUseCloud?: typeof useCloudForTesting }).salonUseCloud = useCloudForTesting;
  // Hosted preview only (VITE_INVITE_GATE=1, set by scripts/build-preview.mjs): ask for an invite code first.
  // Tester codes the owner lists in UNLOCK_ALL_CODES open every client difficulty; the server decides, each load.
  let unlockAll = false;
  // Story 018: offline the invite check can't run; the title opens and Start explains a connection is needed (the
  // server still needs the cookie for every AI call).
  if (import.meta.env.VITE_INVITE_GATE === '1' && navigator.onLine) {
    if (!(await getSession()).signedIn) await askForInvite(host);
    unlockAll = (await getSession()).unlockAll;
  }

  // A new deploy while the game is open: an old lazy chunk is gone → "New version!" and one reload (never a loop).
  const staleBuild = createStaleBuildGuard({
    storage: (() => {
      try {
        return window.sessionStorage;
      } catch {
        return null;
      }
    })(),
    reload: () => window.location.reload(),
    note: (kind) => showNote(t(kind === 'updating' ? 'app.updating' : navigator.onLine ? 'app.loadFailed' : 'title.needsConnection')),
    now: () => Date.now(),
    online: () => navigator.onLine,
  });
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    staleBuild.chunkFailed();
  });
  /** Load a lazy part of the game; a failure is handled as a stale build (or no connection) and rethrown. */
  const lazy = async <T>(load: () => Promise<T>): Promise<T> => {
    try {
      return await load();
    } catch (error) {
      staleBuild.chunkFailed();
      throw error;
    }
  };

  // Story 018: PixiJS and everything drawn with it load in the background; the HTML title menu shows at once.
  const stageReady: Promise<Stage> = lazy(() => import('./game/stage'))
    .then((module) => module.createStage(appHost))
    .then((stage) => {
      // Only a stage that really started proves the build's files are all there.
      staleBuild.loadedOk();
      return stage;
    })
    .catch((error: unknown) => {
      // PixiJS loads its own parts while starting: a stale one of those is the same "new version" case.
      if (isChunkLoadError(error)) staleBuild.chunkFailed();
      throw error;
    });
  let scene: SceneName = 'title';
  const showScene = (next: SceneName): void => {
    scene = next;
    void stageReady.then((stage) => stage.show(scene)).catch(() => undefined);
  };
  let teardownDom: () => void = () => undefined;

  const showTitle = () => {
    teardownDom();
    // Story 013: the first open of the day is Mai's daily hello (a little friendship; a new level gets her card).
    gainFriendship((memory) => afterHello(memory, localDay()));
    showScene('title');
    const menu = createTitleMenu(host, startAppointment, showSettings, showPhrasebook, showShop, showProfile, showCorner, shouldCue(readStored(CORNER_SEEN_KEY)));
    // Story 025: once, after a few appointments, the companion suggests an account.
    const account = getAccount();
    const nudge = account ? accountNudge(host, account, loadSave().appointments) : null;
    if (nudge) menu.prepend(nudge);
    // Story 028: during a season, the companion's daily gift (Tết: a lì xì envelope of in-game tips; free).
    const season = activeSeason(localDay(), seasonOverride());
    const seasonState = parseSeasonState(readStored(SEASON_KEY));
    if (season && giftDue(seasonState, season, localDay())) menu.prepend(seasonGiftCard(season));
    // Story 027: the "tap me" cue appears only once the companion is drawn (the menu shows before PixiJS loads).
    void stageReady
      .then(() => requestAnimationFrame(() => requestAnimationFrame(() => menu.querySelector('.companion-cue')?.classList.add('ready'))))
      .catch(() => undefined);
    teardownDom = () => menu.remove();
  };

  const showSettings = () => {
    teardownDom();
    const screen = createSettingsScreen(host, showTitle, () => showDressUp(showSettings));
    teardownDom = () => screen.remove();
  };

  /** Story 007: the shop and the profile. */
  const showShop = async () => {
    const module = await lazy(() => import('./game/ui/shop-screen')).catch(() => null);
    if (!module) return;
    const { createShopScreen } = module;
    teardownDom();
    const screen = createShopScreen(host, { load: loadSave, save: writeSave, onBack: showTitle });
    teardownDom = () => screen.remove();
  };

  const showProfile = async () => {
    const module = await lazy(() => import('./game/ui/profile-screen')).catch(() => null);
    if (!module) return;
    const { createProfileScreen } = module;
    teardownDom();
    const screen = createProfileScreen(host, { save: loadSave(), today: localDay(), onBack: showTitle, onDressUp: () => showDressUp(showProfile) });
    teardownDom = () => screen.remove();
  };

  /** Story 021: tap the companion on the title. */
  const showCorner = async () => {
    const module = await lazy(() => import('./game/ui/companion-corner')).catch(() => null);
    if (!module) return;
    teardownDom();
    // Story 027: the corner has been found; the title's "tap me" cue goes away for good.
    writeStored(CORNER_SEEN_KEY, '1');
    const screen = module.createCompanionCorner(host, showTitle);
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
  // Story 013: every bestie and corrections request carries the companion's name and gender.
  const bestie = createBestieTransport(companionIdentity);
  const corrections = createCorrectionsTransport(companionIdentity);
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
  const translations = createTranslationCache(translateTransport, [...ROSTER.map((client) => client.openingLine), ...SCENARIOS.map((scenario) => scenario.openingLine)]);

  /** Story 006: the clients still to come in a shift (empty outside a shift) and its size. */
  let shift: { queue: ClientPersona[]; total: number } = { queue: [], total: 0 };
  const SHIFT_SIZE = 3;
  const NOTE_MS = 4000;
  /** Let the stars land before a celebration card covers them. */
  const CELEBRATE_DELAY_MS = 900;

  const startAppointment = () => {
    // Inside the Start tap: lets the client's voice play on iPhone (story 004).
    voice.unlock();
    // Story 018: clients are AI, so offline the title explains instead of starting.
    if (!navigator.onLine) return showNote(t('title.needsConnection'));
    // Story 013: the first time, meet your bestie (female or male, and a name) before anything else.
    if (!loadCompanion().chosen) return showMeet();
    if (getEnglishLevel() === null) showLevelPicker();
    else showClientPicker();
  };

  const showMeet = () => {
    teardownDom();
    const screen = createMeetScreen(host, () => {
      applyDocumentLanguage();
      if (getEnglishLevel() === null) showLevelPicker();
      else showClientPicker();
    });
    teardownDom = () => screen.remove();
  };

  const showDressUp = (back: () => void) => {
    teardownDom();
    const screen = createDressUpScreen(host, back);
    teardownDom = () => screen.remove();
  };

  /** The client picker's faces: each client's placeholder portrait (neutral), drawn once and kept as an image. */
  const faces = new Map<string, Promise<string | null>>();
  const FACE_PX = 96;
  const faceImage = (client: ClientPersona): Promise<string | null> => {
    const cached = faces.get(client.id);
    if (cached) return cached;
    const drawn = stageReady.then((stage) => stage.faceImage(client.portraitId, FACE_PX)).catch(() => null);
    faces.set(client.id, drawn);
    return drawn;
  };

  /** Story 006: choose a difficulty, then a client, a random one, or a shift. */
  const showClientPicker = () => {
    teardownDom();
    shift = { queue: [], total: 0 };
    const begin = (client: ClientPersona, daily = false, scenario?: Scenario) => beginAppointment(getEnglishLevel() ?? 'beginner', client, daily, scenario);
    // Story 007: harder clients open with rank; today's challenge is fixed in the save once offered.
    const today = localDay();
    const openDifficulties = unlockAll ? [...DIFFICULTIES] : unlockedDifficulties(loadSave().xp);
    /** Story 019: scenarios this client can have now (unlocked, fits, "returning" only after a real visit). */
    const scenariosFor = (client: ClientPersona) => eligibleScenarios(client, SCENARIOS, { unlocked: openDifficulties, visits: loadSave().history[client.id] ?? null });
    const offered = dailyChallenge(loadSave(), today, ROSTER, undefined, (client) => pickScenario(hashDay(`${today}:${client.id}`), scenariosFor(client), SCENARIO_ODDS.dailyChance)?.id ?? null);
    if (offered) writeSave(offered.save);
    const save = loadSave();
    const screen = createClientPicker(host, {
      unlocked: unlockAll ? DIFFICULTIES : unlockedDifficulties(save.xp),
      lockedLine: (difficulty) => t('picker.locked', { rank: `${rankUnlocking(difficulty).name[getLanguage()]} ${rankUnlocking(difficulty).icon}` }),
      ...(offered
        ? (() => {
            const scenario = getScenario(offered.scenarioId);
            return { daily: { client: offered.client, done: dailyDoneToday(save, today), streak: liveStreak(save, today), onPick: () => begin(offered.client, true, scenario), ...(scenario ? { tag: scenario.tag[getLanguage()] } : {}) } };
          })()
        : {}),
      shiftSize: SHIFT_SIZE,
      onPick: begin,
      onRandom: (difficulty) => {
        const client = pickShift(clientsByDifficulty(difficulty), 1)[0] ?? DEFAULT_CLIENT;
        // Story 019: Random sometimes brings a situation too.
        begin(client, false, pickScenario(Math.floor(Math.random() * 1e9), scenariosFor(client), SCENARIO_ODDS.randomChance) ?? undefined);
      },
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

  const beginAppointment = async (level: EnglishLevel, persona: ClientPersona, daily = false, scenario?: Scenario) => {
    // Story 018: the appointment needs the PixiJS stage (usually loaded by now) and a connection.
    let stage: Stage;
    try {
      stage = await stageReady;
    } catch {
      // The stale-build guard already showed "New version!" (and reloads) or the connection message.
      return;
    }
    // Story 007: owned upgrades (a comfier chair starts clients happier; finer brush; better clean-up pen).
    const effects = upgradeEffects(loadSave());
    // Story 019: the scenario's opening line and nail request; the AI gets the situation (and past visits if returning).
    const client: ClientPersona = applyScenario({ ...persona, startingMood: Math.min(90, persona.startingMood + effects.startMood) }, scenario);
    const visits = loadSave().history[persona.id];
    const scenarioFields = scenario ? { scenarioId: scenario.id, ...(scenario.eligible.returning && visits ? { visits } : {}) } : undefined;
    const shiftPosition = shift.total > 0 ? shift.total - shift.queue.length : 0;
    teardownDom();
    showScene('salon');
    // Story 005: what the client hears about her nails, and the finished result for the review and the stars.
    const nails: { note: string | undefined; finished: { description: string; match: number } | undefined } = { note: undefined, finished: undefined };
    const appointment = createAppointment({
      client,
      takeTurn: createFetchTransport(() => level, () => nails.note, client.id, scenarioFields),
      level,
      // Grading starts from the chat panel's onEnded, once the final line has finished revealing (story 002).
      onFinished: () => undefined,
    });
    const panel = stage.createChatPanel(host, appointment, {
      client,
      layer: stage.layer,
      level,
      helpLanguage: getHelpLanguage(),
      translations,
      translate: translateTransport,
      ...(client.nailRequest
        ? {
            nailArt: {
              request: client.nailRequest,
              // Story 028: seasonal polishes and stickers only while their season runs.
              palette: seasonPalette(stationPalette(NAIL_ART_CONFIG.palette, loadSave()), activeSeason(localDay(), seasonOverride())),
              stickers: seasonStickers(NAIL_ART_CONFIG.stickers, activeSeason(localDay(), seasonOverride())),
              tools: { brushRadius: NAIL_ART_CONFIG.brushRadius * effects.brushScale, cleanupRadius: NAIL_ART_CONFIG.cleanupRadius * effects.cleanupScale },
              onNote: (note: string | undefined) => {
                nails.note = note;
              },
              onDone: (design: NailDesign, result: MatchResult) => {
                nails.finished = { description: describeDesign(design, undefined, client.nailRequest?.service), match: result.score };
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
          clientPronoun: client.pronoun,
          ...(scenarioFields ? { scenario: scenarioFields } : {}),
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
            // Story 016: feedback with this visit's details; the chat only if the tester ticks the box.
            feedbackButton(appHost, { details: { clientId: client.id, difficulty: client.difficulty, level, language: getLanguage(), stars: score.stars }, chat: result.transcript }),
            createDebriefPanel({ transport: bestie, level, language: getLanguage(), outcome: result.outcome, transcript: result.transcript, grading, score }),
            createLearningPanel({ transport: corrections, level, language: getLanguage(), outcome: result.outcome, transcript: result.transcript, ...(practice ? { onPractice: practice } : {}) }),
            ...[createLevelChangePanel(level, score.englishScore)].filter((panel): panel is HTMLElement => panel !== null),
          ],
        }).destroy,
    });
    teardownDom = panel.destroy;
    // Story 015: the first appointment comes with the companion's tour (once; replayable from Settings).
    startTour(appHost);

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
        clientId: persona.id,
        today: localDay(),
      });
      writeSave(update.save);
      // Story 025: signed in → the appointment's progress goes to the account now.
      void getAccount()?.appointmentDone();
      const items = celebrationsFor(update);
      const panel = createProgressPanel(update);
      // Only while the results are still showing (the player may already have tapped Next).
      if (items.length > 0) window.setTimeout(() => panel.isConnected && celebrate(appHost, items), CELEBRATE_DELAY_MS);
      progress = panel;
      return panel;
    }
  };

  /** Story 028: the season's daily gift card on the title. Opening it adds tips (and the outfit the first time). */
  function seasonGiftCard(season: Season): HTMLElement {
    const card = el('div', 'bestie-bubble account-nudge season-gift');
    card.setAttribute('role', 'status');
    const line = el('p', '', t('tet.wish'));
    const later = el('button', 'chat-button secondary', t('tet.later'));
    later.type = 'button';
    later.addEventListener('click', () => card.remove());
    const open = el('button', 'chat-button', t('tet.open'));
    open.type = 'button';
    open.addEventListener('click', () => {
      const result = openGift(loadSave(), parseSeasonState(readStored(SEASON_KEY)), season, localDay());
      actions.remove();
      if (!result) return card.remove();
      writeSave(result.save);
      writeStored(SEASON_KEY, JSON.stringify(result.state));
      emitSound('moodUp');
      line.textContent = t(result.outfit ? 'tet.gotOutfit' : 'tet.got', { tips: result.tips });
      window.setTimeout(() => card.isConnected && card.remove(), 6000);
    });
    const actions = el('div', 'feedback-actions');
    actions.append(later, open);
    card.append(el('strong', '', t('tet.envelope')), line, actions);
    return card;
  }

  /** A short message over the current screen (e.g. no connection). */
  function showNote(text: string): void {
    const note = el('p', 'app-note', text);
    note.setAttribute('role', 'alert');
    appHost.append(note);
    window.setTimeout(() => note.remove(), NOTE_MS);
  }

  showTitle();

  // Story 018: installable app with an offline title (built files only; never /api). Production builds only.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js').catch(() => undefined));
  }
}

// Story 032: a friendly screen (and a privacy-safe report) for any error the game did not catch, boot included.
const failApp = installErrorHandling({
  host: document.getElementById('app') ?? document.body,
  version: APP_VERSION,
  usable: () => document.querySelector('.title-menu, .screen, .chat-panel') !== null,
});
void boot().catch(failApp);
