import { PEDICURE_LENGTHS } from '../nail-art/design';
import { NOT_STUCK, STUCK_CONFIG, onClientLine, onTryGrade, answersFor } from '../stuck';
import type { StuckState, StuckStep } from '../stuck';
import { moodBand } from '../mood-display';
import { REFERENCE_CONFIG } from '../reference';
import { openPictureSheet } from './picture-sheet';
import { HANGNAIL_CONFIG, saysSorry } from '../hangnail';
import { haptic, prefersReducedMotion } from '../comfort';
import type { Container, Rectangle } from 'pixi.js';
import type { Appointment, AppointmentSnapshot } from '../appointment';
import { MOOD_MAX } from '../mood';
import { getPortraitDefinition } from '../portraits/definitions';
import { EXPRESSION_CONFIG, poseFor } from '../portraits/portrait';
import type { Expression } from '../portraits/portrait';
import { PHASES, TurnError, clientGrammar, clientVietnamese } from '../types';
import type { AppointmentResult, ClientPersona, EnglishLevel, HelpLanguage, Translate } from '../types';
import type { TranslationCache } from '../translation-cache';
import { getLanguage, t } from '../i18n';
import { el } from './dom';
import { createMaiBubble } from './mai-bubble';
import { createPrepOverlay } from './pedicure-prep';
import { emotionFor } from '../voice-cast';
import { SERVICE_TALK, checkoutLine, expectsAnswer, planServiceTalk } from '../service-talk';
import type { PrepOverlay } from './pedicure-prep';
import { createNailStation, nailsNote } from './nail-station-panel';
import type { NailStation } from './nail-station-panel';
import { COMBO_CONFIG, comboScore } from '../combo';
import { openMenuSheet } from './menu-sheet';
import { priceBoardIcon } from './menu-icon';
import type { MenuItem, OrderLine } from '../menu';
import { FIX_CONFIG, canFix, fixKindOf, fixKindsOf, fixOutcomes, offersFix, openLine, openRequest, thanksLine, updateRequests } from '../fix-requests';
import type { FixKind } from '../fix-requests';
import type { FixOutcome, FixRequest } from '../fix-requests';
import { NAIL_ART_CONFIG, NAIL_LENGTHS } from '../nail-art/design';
import type { NailDesign, NailRequest, PaletteColor, StickerKind } from '../nail-art/design';
import type { StationTools } from '../nail-art/station';
import type { MatchResult } from '../nail-art/match';
import type { BestieLanguage, BestieTransport } from '../bestie';
import { LEARNING_CONFIG, shouldCheckLine } from '../learning/corrections';
import type { CorrectionsTransport, Phrase } from '../learning/corrections';
import { createHelpMeSayIt } from './help-me-say-it';
import { createMicButton } from './mic-button';
import { createSendCountdown } from '../voice-send';
import { getCompanionVoiceEnabled, getSpeechSpeed, getVoiceAutoSend } from '../settings';
import { companionSpeech } from '../companion-voice';
import { VOICE_CONFIG } from '../voice';
import { openPracticeSheet, practiceButton } from './practice-sheet';
import type { VoiceIO } from '../voice';
import { createPortraitZone } from './portrait-zone';
import { emitSound } from '../sound-events';
import { guardMessage } from './guard-message';
import { createScrollFollower, fitToVisualViewport } from './scroll-follow';
import { startTextReveal } from './text-reveal';
import type { TextReveal } from './text-reveal';
import './chat-panel.css';
import { JUICE_CONFIG, appointmentProgress, lineGrade } from '../juice';
import type { LineGrade } from '../juice';
import { burst, centreOf } from './burst';

/**
 * DOM chat UI over the Pixi scene: chat, mood meter, phase indicator, typing indicator, retry, hand-off to results. Story: story-001, story-002.
 * Client replies (and the opening line) are revealed at speaking pace while the client portrait talks. Story: story-009.
 * Tap a client line to show or hide its Vietnamese translation (or show it always in full Vietnamese mode); "Help me say it"
 * sits beside the input. Per-line translation state lives here, not in the DOM, because the log is rebuilt on every snapshot. Story: story-010.
 */

const VISIBLE_PHASES = PHASES.filter((phase) => phase !== 'done');

/** Mood color from red (angry) through amber to green (happy). */

/**
 * Mount the appointment UI into `host`. `portraits.layer` is the Pixi container the client and bestie portraits
 * are drawn on, over the portrait zone. `destroy` removes the UI and the portraits.
 */
/** 067: how long the picture notice row stays (it also goes when 📷 is opened). */
const PICTURE_NOTE_MS = 9000;

export function createChatPanel(
  host: HTMLElement,
  appointment: Appointment,
  portraits: {
    client: ClientPersona;
    layer: Container;
    /** Called once, when the appointment is over and the final line has finished revealing. Mount the results into `container`; return a cleanup. */
    onEnded: (container: HTMLElement, result: AppointmentResult) => () => void;
    /** The player's English level: decides whether Help me say it offers word tiles or re-typing. */
    level: EnglishLevel;
    /** `full` shows every client line with its Vietnamese translation automatically. */
    helpLanguage: HelpLanguage;
    /** English-to-Vietnamese translations of client lines, cached per line. */
    translations: TranslationCache;
    /** Transport for Help me say it (Vietnamese to English). */
    translate: Translate;
    /** The bestie's whisper channel: the Hint button (story 003, `hints`) and whispered corrections (story 011, `corrections`). */
    bestie?: {
      transport: BestieTransport;
      language: BestieLanguage;
      hints: boolean;
      /** Omitted when the player turned corrections off. `onPhrase` saves a shown correction's better line to the phrasebook. */
      corrections?: { transport: CorrectionsTransport; onPhrase: (phrase: Phrase) => void };
    };
    /** Story 044: the salon menu (numbered) and her order on it, for the 📋 Menu button (consultation and checkout). */
    menu?: { items: MenuItem[]; order: OrderLine[] };
    /** Story 005: the nail art station during the service phase (omitted when the client has no nail request). */
    nailArt?: {
      request: NailRequest;
      /** Story 028: the sticker cycle for today. */
      stickers?: StickerKind[];
      /** Story 033: redos allowed after Done (the "Colour redo" scenario). */
      redos?: number;
      /** The client's game note about the nails (undefined before any work). */
      onNote: (note: string | undefined) => void;
      /** Finished (Done, or the appointment ended): the design and its match. */
      onDone: (design: NailDesign, result: MatchResult) => void;
      /** Story 050: the finished set, to photograph (at the final Done, while the hand is still on the stage). */
      onPhoto?: (source: { target: Container; frame: Rectangle | null }) => void;
      /** Story 048: the fixes she asked for and whether each was done (at the final Done). */
      onFixes?: (fixes: FixOutcome[]) => void;
      /** Story 007: bought polishes and upgraded tools. */
      palette?: PaletteColor[];
      tools?: StationTools;
      /** Story 064 (hard clients): a hangnail on this nail (0-based), or none. */
      hangnail?: number;
      /** Story 065 (hard clients): her picture of the nails she wants (drawn by the nail renderer). */
      reference?: Promise<string | null>;
      /** Story 069b: a combo: after the hands' Done the station becomes the feet (soak and scrub first). */
      feet?: NailRequest;
      /** Story 069b: the hands of a combo are done (the feet come next). */
      onHandsDone?: (design: NailDesign, result: MatchResult) => void;
    };
    /** Story 068: the player is stuck on her question (two misses): the next client turn picks for them. */
    onStuck?: () => void;
    /** Story 068: "Leave visit" on the pause overlay (the visit is not counted). */
    onLeave?: () => void;
    /** Voice in and out (story 004): the mic button, the client speaking aloud, and practising the last line. */
    voice?: { io: VoiceIO; clientId: string; speakReplies: boolean; onSpeakerChange: (on: boolean) => void };
  },
): { destroy: () => void; setBestieExpression: (expression: Expression) => void } {
  const root = el('div', 'chat-panel');
  const clientName = getPortraitDefinition(portraits.client.portraitId).name;
  // Story 023: the phone's setting or the game's own Reduce motion.
  const reducedMotion = { get matches(): boolean { return prefersReducedMotion(); } };
  // Assistive tech gets each reply whole, here, while the visible bubble reveals letter by letter (aria-hidden).
  const announcer = el('div', 'visually-hidden');
  announcer.setAttribute('aria-live', 'polite');

  const header = el('div', 'chat-header');
  const phases = el('ol', 'chat-phases');
  const phaseItems = VISIBLE_PHASES.map((phase) => phases.appendChild(el('li', '', t(`chat.phase.${phase}`))));
  // Story 067 (owner): her mood is a number in a pill, like a phone's battery % ("😊 72"), coloured by band; it
  // keeps one width beside 📋 and 📷 (the old bar shrank to a stub at 320 px).
  const mood = el('div', 'mood');
  const pill = el('span', 'mood-pill');
  const face = el('span', 'mood-face');
  face.setAttribute('aria-hidden', 'true');
  const value = el('span', 'mood-value');
  pill.append(face, value);
  pill.setAttribute('role', 'meter');
  pill.setAttribute('aria-valuemin', '0');
  pill.setAttribute('aria-valuemax', String(MOOD_MAX));
  // The pill says it all (face, number, and "Mood N of 100" for screen readers), so the row fits 320 px with 📋, 📷 and 🔇.
  pill.title = t('chat.mood');
  mood.append(pill, el('span', 'mood-spacer'));
  let shownMood = -1;
  const voice = portraits.voice;
  let speakerOn = voice?.speakReplies ?? false;
  if (voice?.io.canSpeak) {
    // The speaker button switches the client's voice on and off at any point in the appointment (story 004).
    const speaker = el('button', 'speaker-button');
    speaker.type = 'button';
    const showSpeaker = (): void => {
      speaker.textContent = speakerOn ? '🔊' : '🔇';
      speaker.setAttribute('aria-label', t(speakerOn ? 'voice.speakerOnLabel' : 'voice.speakerOffLabel'));
      // Story 068: its scope is clear on a long press / hover too: only the client's voice.
      speaker.title = t(speakerOn ? 'voice.speakerOnLabel' : 'voice.speakerOffLabel');
      speaker.setAttribute('aria-pressed', String(speakerOn));
    };
    showSpeaker();
    speaker.addEventListener('click', () => {
      speakerOn = !speakerOn;
      if (!speakerOn) voice.io.cancelSpeech();
      voice.onSpeakerChange(speakerOn);
      showSpeaker();
    });
    mood.append(speaker);
  }
  // Story 044: 📋 Menu (consultation and checkout): the numbered menu; at checkout her order and the total.
  const menuButton = portraits.menu ? el('button', 'chat-menu-button') : null;
  if (menuButton) menuButton.innerHTML = `${priceBoardIcon(24)}<span>${t('menu.button')}</span>`;
  if (menuButton && portraits.menu) {
    const menu = portraits.menu;
    menuButton.type = 'button';
    menuButton.addEventListener('click', () => openMenuSheet(menu, latest.phase === 'checkout', clientGrammar(portraits.client.pronoun)));
  }
  // Story 057b: a thin bar under the steps that fills as the visit goes on (full at the end).
  const progressBar = el('div', 'chat-progress');
  const progressFill = el('div', 'chat-progress-fill');
  progressBar.append(progressFill);
  progressBar.setAttribute('role', 'progressbar');
  progressBar.setAttribute('aria-label', t('chat.progress'));
  progressBar.setAttribute('aria-valuemin', '0');
  progressBar.setAttribute('aria-valuemax', '100');
  let progressPhase = -1;
  let phaseStartLines = 0;
  header.append(phases, progressBar, mood);

  const initial = appointment.getSnapshot();
  const zone = createPortraitZone(host, portraits.layer, portraits.client, poseFor(initial.mood, initial.result?.outcome ?? null), !portraits.bestie);
  // Story 044: the menu button sits at the top left of the face area (Mai is at the right), never squeezing the mood.
  // Story 065: 📷 her picture, a small button in the mood row (any time); it pulses until first opened.
  const pictureButton = portraits.nailArt?.reference ? el('button', 'chat-picture-button pulse', '📷') : null;
  if (pictureButton && portraits.nailArt?.reference) {
    const photo = portraits.nailArt.reference;
    pictureButton.type = 'button';
    pictureButton.setAttribute('aria-label', t('picture.button'));
    pictureButton.addEventListener('click', () => {
      pictureButton.classList.remove('pulse');
      void photo.then((src) => openPictureSheet(src, clientName));
    });
  }
  // Story 060: 📋 sits in the mood row as a small icon button, so it never covers her face while she talks.
  if (menuButton) {
    menuButton.setAttribute('aria-label', t('menu.sectionTitle'));
    mood.insertBefore(menuButton, mood.querySelector('.speaker-button'));
  }
  // 066: 📷 right after 📋 (the menu shows in consultation and checkout; the picture all visit long).
  if (pictureButton) mood.insertBefore(pictureButton, mood.querySelector('.speaker-button'));

  const log = el('div', 'chat-log');
  const errorBox = el('div', 'chat-error');
  const errorText = el('p');
  errorText.style.margin = '0';
  const retryButton = el('button', 'chat-button', t('common.tryAgain'));
  retryButton.type = 'button';
  errorBox.append(errorText, retryButton);

  // Where the results screen mounts once the appointment is over and the final line has been shown.
  const resultsBox = el('div', 'chat-results hidden');

  const form = el('form', 'chat-form');
  const helpButton = el('button', 'chat-button help-button');
  helpButton.type = 'button';
  helpButton.textContent = t('help.button');
  // Story 047: a box that grows with the line (up to about 4 lines, then it scrolls), so a whole spoken line can be
  // checked before it is sent. Enter sends; Shift+Enter is never needed for one line of chat.
  const input = el('textarea', 'chat-input');
  input.rows = 1;
  input.placeholder = t('chat.placeholder');
  input.autocomplete = 'off';
  input.enterKeyHint = 'send';
  input.spellcheck = false;
  const fitInput = (): void => {
    input.style.height = 'auto';
    if (input.value) input.style.height = `${input.scrollHeight + (input.offsetHeight - input.clientHeight)}px`;
    else input.style.height = '';
  };
  const setInput = (text: string): void => {
    input.value = text;
    fitInput();
  };
  input.addEventListener('input', fitInput);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  const sendButton = el('button', 'chat-button', t('common.send'));
  sendButton.type = 'submit';
  form.append(helpButton, input, sendButton);

  const bestie = portraits.bestie;
  // Mai, on demand (owner, 2026-11-10): a bubble in the portrait strip; her panel opens over the top strip, so neither
  // ever covers the newest line or the reply box. Corrections wait behind her badge; nothing pops up by itself.
  const mai = bestie
    ? createMaiBubble({
        hints: bestie.hints,
        transport: bestie.transport,
        level: portraits.level,
        language: bestie.language,
        tipCap: LEARNING_CONFIG.whispers.maxPerAppointment,
        current: () => ({ phase: latest.phase, mood: latest.mood, transcript: latest.transcript }),
        // 068b review: a tapped answer goes into the reply box (opened if the station is up); the player sends it.
        useLine: (text: string) => {
          if (serviceMode) setReplyOpen(true);
          setInput(text);
          input.focus();
        },
        onHelpMeSayIt: () => helpButton.click(),
        onTipSeen: (tip) => bestie.corrections?.onPhrase(tip.better),
        // Story 043: her tips aloud, in her voice, at the Speech speed (only when the setting is on).
        ...(voice?.io.canSpeak && getCompanionVoiceEnabled()
          ? { speak: (text: string, lang: 'en' | 'vi') => void voice.io.speak(text, companionSpeech(lang, portraits.level)) }
          : {}),
      })
    : null;

  // Story 005: the nail station draws over the portrait zone in the service phase; the chat below stays usable.
  const serviceTop = el('div', 'service-top');
  const nailArt = portraits.nailArt;
  // Story 069b: a combo does the hands, then the feet (a new station), then one checkout.
  let feetNext: NailRequest | null = nailArt?.feet ?? null;
  const isCombo = feetNext !== null;
  let handsScore: number | null = null;
  const makeStation = (art: NonNullable<typeof nailArt>, request: NailRequest): NailStation =>
    createNailStation({
        rect: () => zone.rect(),
        zone: zone.element,
        layer: portraits.layer,
        request,
        clientPronoun: portraits.client.pronoun,
        // Story 064: her hangnail: a clean trim earns her thanks; a slip is her ouch, then first aid and a sorry.
        ...(art.hangnail !== undefined && request.service !== 'pedicure'
          ? {
              hangnail: {
                nail: art.hangnail,
                onTrim: (outcome: 'clean' | 'slip') => {
                  if (outcome === 'clean') {
                    appointment.adjustMood(HANGNAIL_CONFIG.trimmedMood);
                    sayWhenFree(HANGNAIL_CONFIG.lines.thanks);
                  } else {
                    appointment.adjustMood(HANGNAIL_CONFIG.slipMood);
                    apologyDue = true;
                    // 064 review: the trimming notice goes, so the strip shows the first-aid step.
                    window.clearTimeout(nudgeTimer);
                    nudge.classList.add('hidden');
                    root.classList.remove('nudging');
                    appointment.clientSays(HANGNAIL_CONFIG.lines.ouch);
                  }
                },
                onFirstAid: () => {
                  appointment.adjustMood(HANGNAIL_CONFIG.aidMood);
                  sayWhenFree(HANGNAIL_CONFIG.lines.afterAid);
                },
              },
            }
          : {}),
        ...(art.palette ? { palette: art.palette } : {}),
        ...(art.stickers ? { stickers: art.stickers } : {}),
        ...(art.redos ? { redos: art.redos } : {}),
        ...(art.tools ? { tools: art.tools } : {}),
        // Story 051: Extra long is offered to hard clients (or when she asks for it).
        // Story 069: toes only take short nails.
        lengths: request.service === 'pedicure' ? PEDICURE_LENGTHS : NAIL_LENGTHS.filter((l) => l !== 'xlong' || portraits.client.difficulty === 'hard' || request.lengths?.includes('xlong')),
        topBand: () => serviceTop.offsetHeight + 6,
        maiSide: () => (mai ? ((mai.element.dataset.side as 'left' | 'right' | undefined) ?? 'right') : null),
        onChange: (design) => {
          art.onNote(nailsNote(design, null, request.service));
          checkFixes(design);
        },
        onDone: (design, result) => {
          // Story 058: a fix at checkout is judged by the fix itself (thanks or her open line), not the set again.
          // Story 065: with her picture the match matters more. Story 069b: each half of a combo counts a share.
          if (!checkoutFixing) appointment.adjustMood(Math.round(result.moodDelta * (art.reference ? REFERENCE_CONFIG.moodScale : 1) * (isCombo ? COMBO_CONFIG.moodShare : 1)));
          art.onNote(nailsNote(design, result, request.service));
          // Story 069b: the hands of a combo are done: the feet come next (no checkout yet).
          if (feetNext && !checkoutFixing && !station?.canRedo) {
            handsScore = result.score;
            art.onHandsDone?.(design, result);
            toFeet(art, feetNext);
            return;
          }
          art.onDone(design, result);
          lastMatch = handsScore === null ? result.score : comboScore(handsScore, result.score);
          // Story 035: Done ends the service (or, in a redo scenario, the client asks for her redo first).
          afterDone();
        },
      });
  let station: NailStation | null = nailArt ? makeStation(nailArt, nailArt.request) : null;
  /** Story 069b: the hands are done: her line, then the foot comes up (a new station) with the soak and scrub first. */
  function toFeet(art: NonNullable<typeof nailArt>, feet: NailRequest): void {
    feetNext = null;
    appointment.clientSays(COMBO_CONFIG.feetLine);
    window.setTimeout(() => {
      const old = station;
      if (!old || ending) return;
      const next = makeStation(art, feet);
      old.touch.before(next.touch);
      old.toolbar.before(next.toolbar);
      old.destroy();
      station = next;
      new ResizeObserver(liftMai).observe(next.toolbar);
      drawOrder(feet);
      root.dataset.stage = 'feet';
      setStationOpen(true);
      startPrep();
    }, COMBO_CONFIG.switchMs);
  }
  const stationToggle = el('button', 'station-toggle hidden', t('station.toggle'));
  stationToggle.type = 'button';
  stationToggle.setAttribute('aria-label', t('station.toggleLabel'));
  let stationOpen = false;
  let stationOpened = false;
  function setStationOpen(next: boolean): void {
    if (!station) return;
    stationOpen = next;
    station.setOpen(next);
    root.classList.toggle('station-open', next);
    zone.setCompactClient(next);
    stationToggle.setAttribute('aria-pressed', String(next));
    requestAnimationFrame(() => {
      station?.relayout();
      liftMai();
    });
  }
  /** While the station is open, Mai's bubble sits above its toolbar (in the station's corner), never over the tools. */
  function liftMai(): void {
    if (!station || !mai) return;
    // Top-right corner of the hand area (the hand layout keeps that corner clear), so she never covers a nail or the tools.
    if (stationOpen) {
      mai.element.style.setProperty('--mai-top', `${zone.element.offsetTop + 4}px`);
      mai.element.classList.add('over-station');
    } else mai.element.classList.remove('over-station');
  }
  let prep: PrepOverlay | null = null;
  function startPrep(): void {
    if (!station || !nailArt) return;
    root.classList.add('prepping');
    prep = createPrepOverlay({
      difficulty: portraits.client.difficulty,
      vi: clientVietnamese(portraits.client),
      onFinish: (moodDelta) => {
        prep = null;
        root.classList.remove('prepping');
        if (moodDelta !== 0) appointment.adjustMood(moodDelta);
        requestAnimationFrame(() => station?.relayout());
      },
    });
    zone.element.append(prep.element);
  }
  stationToggle.addEventListener('click', () => setStationOpen(!stationOpen));
  if (station) {
    zone.element.append(station.touch);
    mood.insertBefore(stationToggle, mood.querySelector('.speaker-button'));
    new ResizeObserver(() => station?.relayout()).observe(zone.element);
    new ResizeObserver(liftMai).observe(station.toolbar);
  }

  const top = el('div', 'chat-top');
  top.append(header, zone.element, ...(station ? [station.toolbar] : []), ...(mai ? [mai.element] : []));

  // Voice messages (listening, mic blocked, fall back to typing) sit just above the reply box.
  const voiceStatus = el('p', 'voice-status');
  voiceStatus.setAttribute('aria-live', 'polite');
  const mic = voice
    ? createMicButton({
        voice: voice.io,
        onStart: () => {
          countdown.cancel();
          voice.io.cancelSpeech();
          reveal?.finish();
        },
        onPartial: (text) => {
          setInput(text);
        },
        onText: (text) => {
          // Story 046: the words wait in the box; a countdown on Send sends them unless the player changes them.
          setInput(text);
          if (getVoiceAutoSend()) {
            voiceStatus.textContent = t('voice.checkWords');
            countdown.start();
          } else {
            voiceStatus.textContent = t('voice.checkWordsManual');
          }
        },
        onStatus: (message) => {
          voiceStatus.textContent = message;
        },
      })
    : null;
  if (mic) form.insertBefore(mic.element, sendButton);

  // Only the message list scrolls (the header and portraits stay put), and it follows the conversation.
  const logWrap = el('div', 'chat-log-wrap');
  const follower = createScrollFollower(log, { reducedMotion: () => reducedMotion.matches });
  logWrap.append(log, follower.pill);
  const unfit = fitToVisualViewport(root);

  root.append(top, logWrap, errorBox, resultsBox, voiceStatus, form, announcer);
  host.appendChild(root);

  // Story 035: the service is the game. While the nails are painted the screen is the station (the client's face small,
  // her mood, the companion); the chat and the reply box wait in a bottom sheet behind a "💬 Reply" chip. She still talks:
  // her lines pop from her face, a few data lines of her own, and an unanswered question costs a little mood, once.
  const say = el('button', 'service-say hidden');
  say.type = 'button';
  // Story 060 (focus mode): the chat is a slim bar at the bottom (💬 Reply, with a dot while she has an unread line);
  // her line pops as a bubble that stays until it is read: tap it to reply, or ✕.
  const chip = el('button', 'reply-chip', t('service.replyTo', { name: clientName }));
  chip.type = 'button';
  const focusBar = el('div', 'focus-bar');
  focusBar.append(chip);
  const dismiss = el('button', 'service-dismiss hidden', '✕');
  dismiss.type = 'button';
  dismiss.setAttribute('aria-label', t('service.dismiss'));
  const nudge = el('p', 'service-nudge hidden');
  nudge.setAttribute('role', 'status');
  const doneBanner = el('p', 'service-done hidden', t('service.toCheckout'));
  doneBanner.setAttribute('role', 'status');
  const sheet = el('div', 'reply-sheet');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-label', t('service.replyTitle', { name: clientName }));
  const sheetHead = el('div', 'reply-sheet-head');
  const sheetClose = el('button', 'reply-sheet-close', '✕');
  sheetClose.type = 'button';
  sheetClose.setAttribute('aria-label', t('service.backToNails'));
  sheetHead.append(el('strong', '', t('service.replyTitle', { name: clientName })), sheetClose);
  sheet.append(sheetHead);
  // 035 fixes: her bubble and the Reply chip sit together beside her face (nothing covers the hint line), and a small
  // order reminder stays under them the whole service.
  const talk = el('div', 'service-talk');
  const bubble = el('div', 'service-bubble');
  bubble.append(say, dismiss);
  talk.append(bubble);
  root.insertBefore(focusBar, announcer);
  /** Her line was read (replied to, or ✕): the bubble goes, the bar's dot goes. */
  const markRead = (): void => {
    say.classList.add('hidden');
    dismiss.classList.add('hidden');
    chip.classList.remove('unread', 'pulse');
  };
  dismiss.addEventListener('click', markRead);
  const order = el('p', 'service-order');
  /** Her order on the card (story 069b: redrawn for the feet of a combo). */
  function drawOrder(r: NailRequest): void {
    const lang = getLanguage();
    const colours = r.colors.map((id) => NAIL_ART_CONFIG.palette.find((c) => c.id === id)?.name[lang] ?? id).join(' / ');
    const shapes = r.shapes.map((shape) => t(`station.shape.${shape}`)).join(' / ');
    // Story 051: her length goes with the shape on the order.
    const lengthWords = r.lengths?.length ? ` · ${r.lengths.map((l) => t(`station.length.${l}`)).join(' / ')}` : '';
    const extras = [r.gradient === 'yes' ? '🌈' : '', r.gems !== 'none' ? `💎 ${t(`service.order.${r.gems}`)}` : '', r.stickers !== 'none' ? `⭐ ${t(`service.order.${r.stickers}`)}` : ''].filter(Boolean);
    // Story 069: a big-toe accent says where the art goes (069b review: on its own line, so it is never cut at 320 px).
    const accent = r.accent === 'bigToe' && extras.some((x) => x.startsWith('💎') || x.startsWith('⭐')) ? `\n👣 ${t('service.order.bigToe')}` : '';
    // Story 069b: the feet of a combo say so.
    const feet = isCombo && r.service === 'pedicure' ? `🦶 ${t('service.order.feet')} · ` : '';
    // Colours on the first line, shape and extras on the second (never cut; a tap shows it all if it is longer).
    order.textContent = `${feet}🎨 ${colours}\n${[`${shapes}${lengthWords}`, ...extras].join(" · ")}${accent}`;
    order.setAttribute('aria-label', `${t('service.order.label')}: ${order.textContent}`);
  }
  if (nailArt) drawOrder(nailArt.request);
  // Her bubble grows to fit the whole sentence (this is an English-practice game) and the order is never cut: the block
  // is measured, and the hand is laid out below it.
  serviceTop.append(talk, order);
  order.addEventListener('click', () => order.classList.toggle('full'));
  if (station) {
    zone.element.append(serviceTop, nudge, doneBanner);
    new ResizeObserver(() => {
      root.style.setProperty('--service-top', `${serviceTop.offsetHeight + 6}px`);
      station?.relayout();
    }).observe(serviceTop);
  }
  let serviceMode = false;
  let serviceStarted = false;
  let replyOpen = false;
  let ending = false;
  let lastSeenClient = -1;
  let awaitingAnswer = false;
  let lastMatch = 0;
  // Story 048: the fixes she asked for during this service.
  let fixes: FixRequest[] = [];
  /** A fix she asked for: track it and show the Fix it step. */
  const askFix = (text: string): void => {
    const kind = fixKindOf(text);
    if (kind) openFixKind(kind, text);
  };
  /** Track a request of this kind and show the Fix it step. */
  const openFixKind = (kind: FixKind, text: string): void => {
    if (!station || ending) return;
    // The same ask again (or heard twice) while it is still open is one request.
    if (fixes.some((f) => f.kind === kind && f.status === 'open')) return;
    const request = openRequest(kind, station.design(), text);
    // Story 051: "a little shorter" on the shortest nails is just a line (nothing to fix).
    if (!canFix(request, station.lengths)) return;
    fixes = [...fixes, request];
    station.openFix(kind);
  };
  /** After a change on the nails: a request now met is fixed; she thanks the player (a mood lift). */
  function checkFixes(design: NailDesign): void {
    if (!station || fixes.every((f) => f.status !== 'open')) return;
    const update = updateRequests(fixes, design, station.takeFixAction());
    fixes = update.requests;
    // Doing the fix answers her ask: no wait for a reply, and no "ignored question" dip.
    if (update.fixed.length > 0) {
      awaitingAnswer = false;
      window.clearTimeout(ignoreTimer);
    }
    for (const fixed of update.fixed) {
      appointment.adjustMood(FIX_CONFIG.fixedMood);
      sayWhenFree(thanksLine(fixed.kind));
    }
    if (update.fixed.length > 0 && fixes.every((f) => f.status !== 'open')) station.closeFix();
  }
  let ignoreTimer = 0;
  let nudgeTimer = 0;
  const talkTimers: number[] = [];
  const setReplyOpen = (open: boolean): void => {
    if (open === replyOpen) return;
    replyOpen = open;
    root.classList.toggle('reply-open', open);
    if (open) {
      // Opening the sheet is paying attention: no penalty for this question, and her later lines can come.
      window.clearTimeout(ignoreTimer);
      awaitingAnswer = false;
      markRead();
      sheet.append(logWrap, voiceStatus, form);
      root.append(sheet);
      requestAnimationFrame(() => log.scrollTo({ top: log.scrollHeight }));
      input.focus({ preventScroll: true });
    } else {
      root.insertBefore(logWrap, errorBox);
      root.insertBefore(voiceStatus, announcer);
      root.insertBefore(form, announcer);
      sheet.remove();
    }
  };
  chip.addEventListener('click', () => setReplyOpen(true));
  say.addEventListener('click', () => setReplyOpen(true));
  sheetClose.addEventListener('click', () => setReplyOpen(false));
  const showNudge = (text: string): void => {
    nudge.textContent = text;
    nudge.classList.remove('hidden');
    // The nudge takes the hint line's place while it shows (they never overlap).
    root.classList.add('nudging');
    window.clearTimeout(nudgeTimer);
    nudgeTimer = window.setTimeout(() => {
      nudge.classList.add('hidden');
      root.classList.remove('nudging');
    }, 4500);
  };
  /** A client line while the station is on screen: a bubble from her face, the Reply chip, and a wait for questions. */
  const clientLineInService = (index: number, text: string): void => {
    lastSeenClient = index;
    // Story 048: a line asking for a fix (her set lines or an AI reply) shows the Fix it step.
    askFix(text);
    say.textContent = text.length > 140 ? `${text.slice(0, 137)}…` : text;
    say.classList.remove('hidden', 'pop');
    dismiss.classList.remove('hidden');
    void say.offsetWidth;
    say.classList.add('pop');
    chip.classList.add('unread');
    chip.classList.remove('pulse');
    void chip.offsetWidth;
    chip.classList.add('pulse');
    // A soft ding (and a short buzz where the phone can) so a line is never missed while painting.
    emitSound('ding');
    haptic(25);
    window.clearTimeout(ignoreTimer);
    awaitingAnswer = expectsAnswer(text);
    if (!awaitingAnswer) return;
    const askedAt = pauseCount;
    ignoreTimer = window.setTimeout(() => {
      awaitingAnswer = false;
      const answered = latest.transcript.slice(index + 1).some((m) => m.role === 'player');
      // Story 068: a pause during her wait stops the clock: no "ignored question" dip.
      if (answered || !serviceMode || paused || pauseCount !== askedAt) return;
      appointment.adjustMood(SERVICE_TALK.ignoreMoodDip);
      showNudge(t('service.nudge', { name: clientName }));
    }, SERVICE_TALK.ignoreSeconds * 1000);
  };
  /** Her own line, when she can say it (not over a reply, a turn in flight, or the pedicure prep). */
  const saidInService = new Set<string>();
  const sayWhenFree = (text: string, tries = 0): void => {
    if (!serviceMode || ending || tries > 12) return;
    // She doesn't pile up questions: her next line waits while one is still unanswered (until its wait runs out).
    // Story 068: nothing from her while the visit is paused.
    if (paused || awaitingAnswer || replyOpen || latest.status !== 'awaiting_player' || root.classList.contains('prepping')) {
      talkTimers.push(window.setTimeout(() => sayWhenFree(text, tries + 1), 5000));
      return;
    }
    // Story 051: she never asks for a fix that can't be done (shorter than the shortest nails): another of her lines.
    const kind = fixKindOf(text);
    if (kind && station && !canFix(openRequest(kind, station.design(), text), station.lengths)) {
      const other = SERVICE_TALK.lines[portraits.client.difficulty].find((line) => !saidInService.has(line) && !fixKindOf(line));
      if (other) sayWhenFree(other, tries);
      return;
    }
    // No line twice (a stand-in line may have been one she had planned for later).
    if (saidInService.has(text) && SERVICE_TALK.lines[portraits.client.difficulty].includes(text)) return;
    saidInService.add(text);
    appointment.clientSays(text);
  };
  // Story 065: she shows her picture as the visit starts (the 📷 stays in the mood row).
  // 067: the picture notice has its own row under the mood bar (never on her chin or under the companion's bubble);
  // it goes when 📷 is opened, or after a while.
  if (pictureButton) {
    const note = el('p', 'picture-note', t('picture.nudge', clientGrammar(portraits.client.pronoun)));
    note.setAttribute('role', 'status');
    header.append(note);
    const drop = (): void => note.remove();
    pictureButton.addEventListener('click', drop);
    window.setTimeout(drop, PICTURE_NOTE_MS);
  }
  const startService = (): void => {
    serviceStarted = true;
    appointment.holdPhase('service');
    // Story 064: she mentions her hangnail first (and the station says how to trim it).
    if (nailArt?.hangnail !== undefined) {
      sayWhenFree(HANGNAIL_CONFIG.lines.notice);
      showNudge(t('hangnail.notice', clientGrammar(portraits.client.pronoun)));
    }
    for (const line of planServiceTalk(portraits.client.difficulty)) talkTimers.push(window.setTimeout(() => sayWhenFree(line.text), line.at * 1000));
  };
  // Story 058: after Done (checkout), her complaint ("polish on my skin… more red than coral") or the player offering a
  // fix shows 🔧 Fix it in the chat; it reopens the station on the Fix it step, and the next Done returns to checkout.
  let checkoutFixing = false;
  let checkoutSeen = Number.MAX_SAFE_INTEGER;
  let checkoutFixStart = 0;
  const checkoutAsks = new Map<FixKind, string>();
  const fixNow = el('button', 'chat-button fix-now hidden', `🔧 ${t('fix.now')}`);
  fixNow.type = 'button';
  root.insertBefore(fixNow, form);
  const watchCheckout = (snapshot: AppointmentSnapshot): void => {
    if (snapshot.status === 'finished') {
      fixNow.classList.add('hidden');
      return;
    }
    if (!root.classList.contains('service-over') || checkoutFixing) return;
    for (let i = checkoutSeen + 1; i < snapshot.transcript.length; i++) {
      const message = snapshot.transcript[i]!;
      if (message.role === 'client') fixKindsOf(message.content).forEach((kind) => checkoutAsks.set(kind, message.content));
      else if (message.role === 'player' && offersFix(message.content) && checkoutAsks.size === 0) {
        // The player offers before she names it: the last thing she said about the nails, else a clean-up.
        const hers = [...snapshot.transcript.slice(0, i)].reverse().find((m) => m.role === 'client' && fixKindsOf(m.content).length > 0);
        if (hers) fixKindsOf(hers.content).forEach((kind) => checkoutAsks.set(kind, hers.content));
        else checkoutAsks.set('edge', message.content);
      }
    }
    checkoutSeen = Math.max(checkoutSeen, snapshot.transcript.length - 1);
    fixNow.classList.toggle('hidden', checkoutAsks.size === 0);
  };
  fixNow.addEventListener('click', () => {
    if (!station || checkoutFixing) return;
    checkoutFixing = true;
    fixNow.classList.add('hidden');
    checkoutFixStart = fixes.length;
    root.classList.remove('service-over');
    root.classList.add('service-mode', 'checkout-fix');
    setStationOpen(true);
    for (const [kind, text] of checkoutAsks) openFixKind(kind, text);
    checkoutAsks.clear();
  });
  /** The Done after a checkout fix: back to checkout; she thanks the player (fixed) or says it is still not right. */
  const finishCheckoutFix = (): void => {
    if (!station) return;
    checkFixes(station.design());
    const asked = fixes.slice(checkoutFixStart);
    for (const request of asked.filter((f) => f.status === 'open')) appointment.adjustMood(FIX_CONFIG.openMood);
    if (fixes.length > 0) nailArt?.onFixes?.(fixOutcomes(fixes));
    nailArt?.onPhoto?.(station.photoSource());
    station.closeFix(false);
    setStationOpen(false);
    root.classList.remove('service-mode', 'checkout-fix');
    root.classList.add('service-over');
    for (const request of asked) appointment.clientSays(request.status === 'fixed' ? thanksLine(request.kind) : openLine(request.kind));
    checkoutFixing = false;
    checkoutSeen = appointment.getSnapshot().transcript.length - 1;
  };

  /** After Done: a redo scenario's first Done → her redo line, the station stays; otherwise → checkout in the chat. */
  function afterDone(): void {
    if (!station) return;
    if (checkoutFixing) return finishCheckoutFix();
    if (station.canRedo) {
      // Story 048: her redo is a fix request: the station reopens on the Fix it step.
      appointment.clientSays(SERVICE_TALK.redo);
      askFix(SERVICE_TALK.redo);
      return;
    }
    // Story 064: a hangnail left at Done costs a little (once).
    if (station.hangnailLeft() && !hangnailNoted) {
      hangnailNoted = true;
      appointment.adjustMood(HANGNAIL_CONFIG.leftMood);
      appointment.clientSays(HANGNAIL_CONFIG.lines.left);
    }
    // Story 048: a fix still open at Done: her reaction and a mood dip; the results and the debrief say so.
    checkFixes(station.design());
    for (const open of fixes.filter((f) => f.status === 'open')) {
      appointment.adjustMood(FIX_CONFIG.openMood);
      appointment.clientSays(openLine(open.kind));
    }
    if (fixes.length > 0) nailArt?.onFixes?.(fixOutcomes(fixes));
    nailArt?.onPhoto?.(station.photoSource());
    station.closeFix(false);
    if (!serviceStarted) {
      window.setTimeout(() => setStationOpen(false), 1800);
      return;
    }
    ending = true;
    talkTimers.forEach((id) => window.clearTimeout(id));
    window.clearTimeout(ignoreTimer);
    setReplyOpen(false);
    markRead();
    doneBanner.classList.remove('hidden');
    window.setTimeout(() => {
      doneBanner.classList.add('hidden');
      appointment.holdPhase(null);
      // The job is finished: no tools at checkout, just the finished nails.
      root.classList.add('service-over');
      checkoutSeen = latest.transcript.length - 1;
      appointment.advance('checkout');
      appointment.clientSays(checkoutLine(lastMatch, latest.mood));
      ending = false;
    }, 1600);
  }
  /** Called at the end of each render. */
  const updateService = (snapshot: AppointmentSnapshot): void => {
    if (!station || !nailArt) return;
    const next = snapshot.phase === 'service' && snapshot.status !== 'finished';
    if (next && !serviceStarted) startService();
    if (next !== serviceMode) {
      serviceMode = next;
      root.classList.toggle('service-mode', next);
      if (next) {
        // The line that brought her into the service shows from her face too (the log is out of sight now).
        const lastIndex = snapshot.transcript.length - 1;
        if (snapshot.transcript[lastIndex]?.role === 'client') clientLineInService(lastIndex, snapshot.transcript[lastIndex]!.content);
        else lastSeenClient = lastIndex;
      } else {
        setReplyOpen(false);
        markRead();
        nudge.classList.add('hidden');
        window.clearTimeout(ignoreTimer);
        if (stationOpen && !ending) setStationOpen(false);
      }
      requestAnimationFrame(() => station?.relayout());
    }
    watchCheckout(snapshot);
    trackLines(snapshot);
    pauseButton.disabled = snapshot.status === 'waiting' || snapshot.status === 'finished';
    pauseButton.classList.toggle('hidden', snapshot.status === 'finished');
    if (!serviceMode) return;
    if (!stationOpen) setStationOpen(true);
    // The player sent from the sheet: back to the nails; her question is answered.
    if (snapshot.status === 'waiting') {
      awaitingAnswer = false;
      window.clearTimeout(ignoreTimer);
      if (replyOpen) setReplyOpen(false);
    }
    const lastIndex = snapshot.transcript.length - 1;
    const last = snapshot.transcript[lastIndex];
    if (last?.role === 'client' && lastIndex > lastSeenClient) clientLineInService(lastIndex, last.content);
  };

  let latest = initial;
  let reveal: TextReveal | null = null;
  let renderedCount = 0;
  let destroyResults: (() => void) | null = null;

  const { translations, helpLanguage } = portraits;
  const fullMode = helpLanguage === 'full';
  /** Transcript indexes whose translation the player opened by tapping. */
  const shownTranslations = new Set<number>();
  const translationStatus = new Map<number, 'loading' | 'failed'>();
  /** Bubble and translation box of each client line in the current DOM. */
  const clientNodes = new Map<number, { bubble: HTMLElement; box: HTMLElement }>();
  /** Transcript index of the line being revealed, or -1. */
  let speakingIndex = -1;

  /** Bring one client line's translation box and `aria-expanded` up to date, and start the fetch when it is needed. */
  const refreshTranslation = (index: number): void => {
    const node = clientNodes.get(index);
    const text = latest.transcript[index]?.content;
    if (!node || text === undefined) return;
    const visible = fullMode || shownTranslations.has(index);
    node.bubble.setAttribute('aria-expanded', String(visible));
    if (!visible) {
      const hint = el('span', 'chat-hint', t('chat.translateHint'));
      hint.setAttribute('aria-hidden', 'true');
      node.box.replaceChildren(hint);
      return;
    }
    const cached = translations.peek(text);
    if (cached !== undefined) {
      // A translation that lands under the newest line would push it below the fold: keep the chat scrolled to the end.
      const translated = el('span', 'chat-translation-text', cached);
      translated.lang = 'vi';
      node.box.replaceChildren(translated);
      return;
    }
    if (translationStatus.get(index) === 'failed') {
      const retry = el('button', 'chat-button secondary', t('common.tryAgain'));
      retry.type = 'button';
      retry.addEventListener('click', () => {
        translationStatus.delete(index);
        refreshTranslation(index);
      });
      node.box.replaceChildren(el('span', '', t('chat.translateFailed')), retry);
      return;
    }
    node.box.replaceChildren(el('span', 'chat-hint', t('chat.translating')));
    if (translationStatus.get(index) === 'loading') return;
    translationStatus.set(index, 'loading');
    translations.get(text).then(
      () => translationStatus.delete(index),
      () => translationStatus.set(index, 'failed'),
    ).finally(() => refreshTranslation(index));
  };

  /** Tap or Enter/Space on a client line: finish the reveal if it is running, otherwise show or hide the translation. */
  const activateLine = (index: number): void => {
    if (reveal !== null && index === speakingIndex) {
      reveal.finish();
      return;
    }
    if (fullMode) return;
    if (!shownTranslations.delete(index)) shownTranslations.add(index);
    refreshTranslation(index);
  };

  /** Swap the chat for the results area (once), after the final line is fully shown. */
  const showEnd = (show: boolean): void => {
    resultsBox.classList.toggle('hidden', !show);
    logWrap.classList.toggle('hidden', show);
    form.classList.toggle('hidden', show);
    if (show && destroyResults === null && latest.result) destroyResults = portraits.onEnded(resultsBox, latest.result);
  };

  /** Everything that waits for the reply to be fully shown: the walk-out pose and the results. */
  const settle = (): void => {
    reveal = null;
    zone.setClientTalking(false);
    zone.setClientPose(poseFor(latest.mood, latest.result?.outcome ?? null));
    showEnd(latest.status === 'finished');
  };

  /** Reveal the client's line in `bubble` (at once under reduced motion). Ends in `settle`, which stops the talking. */
  const speak = (bubble: HTMLElement, line: HTMLElement, text: string): void => {
    const shown = el('span');
    const node = document.createTextNode('');
    shown.appendChild(node);
    line.appendChild(shown);
    announcer.textContent = t('chat.clientSaid', { name: clientName, text });
    // Stories 037/038: her own voice (by gender, pinned), in the tone of this line (her tag, else her mood).
    if (voice && speakerOn) void voice.io.speak(text, { clientId: voice.clientId, level: portraits.level, gender: portraits.client.pronoun === 'he' ? 'male' : 'female', emotion: emotionFor(latest.mood, latest.lastEmotion), speed: getSpeechSpeed() });
    if (reducedMotion.matches) {
      node.data = text;
      settle();
      return;
    }
    shown.setAttribute('aria-hidden', 'true');
    bubble.classList.add('revealing');
    const active = startTextReveal(
      node,
      text,
      // Story 045: her text appears at the Speech speed too.
      { ...EXPRESSION_CONFIG.talking, charsPerSecond: EXPRESSION_CONFIG.talking.charsPerSecond * VOICE_CONFIG.speechSpeed[getSpeechSpeed()] },
      () => undefined,
      () => {
        shown.removeAttribute('aria-hidden');
        bubble.classList.remove('revealing');
        settle();
      },
    );
    reveal = active;
  };

  const render = (snapshot: AppointmentSnapshot): void => {
    // Story 012: a soft sound when the client's mood moves (never a buzzer for a mistake).
    if (snapshot.mood > latest.mood) emitSound('moodUp');
    else if (snapshot.mood < latest.mood) emitSound('moodDown');
    latest = snapshot;
    reveal?.cancel();
    reveal = null;
    const last = snapshot.transcript[snapshot.transcript.length - 1];
    const speaking = snapshot.transcript.length > renderedCount && last?.role === 'client';
    renderedCount = snapshot.transcript.length;
    const phaseIndex = VISIBLE_PHASES.findIndex((phase) => phase === snapshot.phase);
    // Story 057b: the appointment bar (her lines in this phase fill its share; the phase moving on completes it).
    const playerLines = snapshot.transcript.filter((message) => message.role === 'player').length;
    if (phaseIndex !== progressPhase) {
      progressPhase = phaseIndex;
      phaseStartLines = playerLines;
    }
    const over = snapshot.status === 'finished';
    const share = appointmentProgress(phaseIndex, VISIBLE_PHASES.length, playerLines - phaseStartLines, over && snapshot.result?.outcome === 'completed');
    progressFill.style.width = `${Math.round(share * 100)}%`;
    progressBar.setAttribute('aria-valuenow', String(Math.round(share * 100)));
    progressBar.classList.toggle('done', share >= 1);
    // A walk-out: the companion looks sad with you for a moment (gentle, no blame).
    if (over && snapshot.result?.outcome === 'walked_out' && !walkOutShown) {
      walkOutShown = true;
      mai?.react('sad', JUICE_CONFIG.reactMs);
    }
    phaseItems.forEach((item, index) => {
      const finished = snapshot.status === 'finished' && snapshot.result?.outcome === 'completed';
      item.className = finished || index < phaseIndex ? 'past' : index === phaseIndex ? 'current' : '';
      if (index === phaseIndex && !finished) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });

    // While the final line is spoken the client keeps her mood face; the walk-out pose comes after (settle).
    zone.setClientPose(poseFor(snapshot.mood, speaking ? null : (snapshot.result?.outcome ?? null)));

    // Story 005: the station opens by itself the first time the service starts, and can be toggled after.
    if (station && nailArt) {
      const working = snapshot.phase !== 'consultation' && snapshot.status !== 'finished';
      stationToggle.classList.toggle('hidden', !working);
      if (working && !stationOpened) {
        stationOpened = true;
        setStationOpen(true);
        // Story 026: a pedicure starts with soak & scrub over the foot, then the paint tools.
        if (nailArt.request.service === 'pedicure') startPrep();
      }
      if (snapshot.status === 'finished') {
        prep?.destroy();
        prep = null;
        root.classList.remove('prepping');
        if (stationOpen) setStationOpen(false);
        // Ended before Done: score what was done (no mood change: the appointment is over).
        if (stationOpened && !station.done) nailArt.onDone(station.design(), station.finish());
      }
    }

    const band = moodBand(snapshot.mood);
    value.textContent = String(snapshot.mood);
    face.textContent = band.face;
    pill.dataset.band = band.band;
    pill.setAttribute('aria-valuenow', String(snapshot.mood));
    pill.setAttribute('aria-label', t('chat.moodLabel', { n: snapshot.mood }));
    // A quick tick when it changes (not with reduced motion).
    if (shownMood !== -1 && shownMood !== snapshot.mood && !prefersReducedMotion()) {
      pill.classList.remove('tick');
      void pill.offsetWidth;
      pill.classList.add('tick');
    }
    shownMood = snapshot.mood;

    speakingIndex = speaking ? snapshot.transcript.length - 1 : -1;
    clientNodes.clear();
    const lines = new Map<number, HTMLElement>();
    const bubbles = snapshot.transcript.map((message, index) => {
      const bubble = el('div', `chat-bubble ${message.role}`);
      if (message.role === 'player') {
        bubble.textContent = message.content;
        bubble.dataset.index = String(index);
        const grade = grades.get(index);
        if (grade) {
          bubble.classList.add('graded');
          bubble.append(gradeBadge(grade, 'span', index));
        }
        // The player's newest line can be practised aloud (story 004).
        const isLastPlayerLine = !snapshot.transcript.slice(index + 1).some((later) => later.role === 'player');
        if (!voice?.io.canListen || !isLastPlayerLine || snapshot.status === 'finished') return bubble;
        const entry = el('div', 'chat-entry player');
        const practice = practiceButton(message.content, (line) => openPracticeSheet(root, { voice: voice.io, line, level: portraits.level }));
        practice.textContent = `🎤 ${t('practice.lastLine')}`;
        entry.append(bubble, practice);
        return entry;
      }
      const line = el('span');
      if (index !== speakingIndex) line.textContent = message.content;
      bubble.appendChild(line);
      bubble.tabIndex = 0;
      bubble.setAttribute('role', 'button');
      bubble.addEventListener('click', () => activateLine(index));
      bubble.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        activateLine(index);
      });
      const box = el('div', 'chat-translation');
      box.setAttribute('aria-live', 'polite');
      const entry = el('div', 'chat-entry client');
      entry.append(bubble, box);
      clientNodes.set(index, { bubble, box });
      lines.set(index, line);
      return entry;
    });
    if (snapshot.pendingPlayerMessage !== null) {
      const pending = el('div', 'chat-bubble player pending', snapshot.pendingPlayerMessage);
      pending.dataset.index = String(snapshot.transcript.length);
      const grade = grades.get(snapshot.transcript.length);
      if (grade) {
        pending.classList.add('graded');
        pending.append(gradeBadge(grade));
      }
      bubbles.push(pending);
    }
    if (snapshot.status === 'waiting') {
      const typing = el('div', 'chat-typing');
      typing.setAttribute('aria-live', 'polite');
      typing.append(el('span', '', t('chat.typing', { name: clientName })), el('span', 'dots'));
      typing.lastElementChild?.append(...['.', '.', '.'].map((dot) => el('span', '', dot)));
      bubbles.push(typing);
    }
    log.replaceChildren(...bubbles);
    clientNodes.forEach((_, index) => refreshTranslation(index));
    const speakingNode = clientNodes.get(speakingIndex);
    const speakingLine = lines.get(speakingIndex);
    if (speakingNode && speakingLine && last) speak(speakingNode.bubble, speakingLine, last.content);

    const failed = snapshot.status === 'error';
    errorBox.classList.toggle('hidden', !failed);
    if (failed) {
      errorText.textContent =
        guardMessage(snapshot.error) ??
        (snapshot.error instanceof TurnError && snapshot.error.code === 'missing_api_key'
          ? t('chat.aiUnavailable')
          : snapshot.error instanceof TurnError && snapshot.error.code === 'timeout'
            ? t('chat.aiSlow', { name: clientName })
            : t('chat.aiTrouble'));
    }

    // The results wait until the final line has finished revealing (settle shows them).
    showEnd(snapshot.status === 'finished' && reveal === null);

    // She talks from the moment the typing indicator shows until her reply is fully shown; an error stops her.
    zone.setClientTalking(snapshot.status === 'waiting' || reveal !== null);

    const canType = snapshot.status === 'awaiting_player';
    input.disabled = !canType;
    sendButton.disabled = !canType;
    helpButton.disabled = !canType;
    if (mic) mic.element.disabled = !canType;
    mai?.setEnabled(canType);
    mai?.element.classList.toggle('hidden', snapshot.status === 'finished');
    updateService(snapshot);
    menuButton?.classList.toggle('hidden', !(snapshot.phase === 'consultation' || snapshot.phase === 'checkout') || snapshot.status === 'finished');
  };

  /** Corrections queued for Mai this appointment (capped in config/learning.json). */
  let tipsQueued = 0;
  let walkOutShown = false;
  // Story 068: ⏸ pauses the visit out of world (no client line; her timers and mood wait); Resume returns exactly here.
  let paused = false;
  let pauseCount = 0;
  const pauseButton = el('button', 'pause-button', '⏸');
  pauseButton.type = 'button';
  pauseButton.setAttribute('aria-label', t('pause.button'));
  mood.prepend(pauseButton);
  const pauseOverlay = el('div', 'pause-overlay hidden');
  pauseOverlay.setAttribute('role', 'dialog');
  pauseOverlay.setAttribute('aria-modal', 'true');
  pauseOverlay.setAttribute('aria-label', t('pause.title'));
  const pauseCard = el('div', 'pause-card');
  const resume = el('button', 'chat-button pause-resume', `▶ ${t('pause.resume')}`);
  resume.type = 'button';
  const leave = el('button', 'chat-button secondary pause-leave', t('pause.leave'));
  leave.type = 'button';
  pauseCard.append(el('h2', '', `⏸ ${t('pause.title')}`), el('p', 'pause-line', t('pause.line')), resume, leave, el('p', 'pause-note', t('pause.leaveNote')));
  pauseOverlay.append(pauseCard);
  root.append(pauseOverlay);
  const setPaused = (next: boolean): void => {
    paused = next;
    if (next) pauseCount++;
    pauseOverlay.classList.toggle('hidden', !next);
    root.classList.toggle('paused', next);
    if (next) resume.focus({ preventScroll: true });
  };
  pauseButton.addEventListener('click', () => setPaused(true));
  resume.addEventListener('click', () => setPaused(false));
  leave.addEventListener('click', () => {
    setPaused(false);
    portraits.onLeave?.();
  });
  // Story 068 (owner playtest 5): her open question waits in a small line above the reply box; a miss (her "say that
  // again", or a reply graded "Try this") brings the companion's help; two misses and she picks for the player.
  let stuck: StuckState = NOT_STUCK;
  /** Two misses: the next turn asks her to pick; until her answer the line says so. */
  let pickArmed = false;
  let trackedLines = initial.transcript.length;
  const waiting = el('p', 'waiting-for hidden');
  waiting.setAttribute('aria-live', 'polite');
  root.insertBefore(waiting, form);
  const showWaiting = (): void => {
    const last = latest.transcript[latest.transcript.length - 1];
    const on = stuck.question !== null && last?.role === 'client' && latest.status === 'awaiting_player';
    const words = { ...clientGrammar(portraits.client.pronoun), q: stuck.question ?? '' };
    waiting.textContent = on ? t(pickArmed ? 'stuck.pickNext' : 'stuck.waiting', words) : '';
    waiting.classList.toggle('hidden', !on);
  };
  const stuckStep = (next: StuckStep): void => {
    stuck = next.state;
    // Story 068b: her help answers the open question directly (not a tip about the last line).
    if (next.help) mai?.helpNow(next.state.question ? { question: next.state.question, lines: answersFor(next.state.question) } : undefined);
    if (next.pickForPlayer) {
      appointment.adjustMood(STUCK_CONFIG.stuckMood);
      portraits.onStuck?.();
      // The question stays in the line, saying she will choose: any reply moves the visit on.
      pickArmed = true;
    }
    showWaiting();
  };
  const trackLines = (snapshot: AppointmentSnapshot): void => {
    for (let i = trackedLines; i < snapshot.transcript.length; i++) {
      const message = snapshot.transcript[i]!;
      if (message.role === 'client') {
        // Her line after a pick was asked for is her choice: the question is closed.
        if (pickArmed) {
          pickArmed = false;
          stuck = NOT_STUCK;
          continue;
        }
        stuckStep(onClientLine(stuck, message.content));
      }
    }
    trackedLines = snapshot.transcript.length;
    showWaiting();
  };
  /** Story 064: a slip waits for a sorry; a hangnail left at Done is said once. */
  let apologyDue = false;
  let hangnailNoted = false;
  /**
   * Story 061 (057b's "Perfect line!", graded): every line gets a badge that matches how good it was. Try this 💡
   * (a fix waits on the companion's badge), Good 👍, Great ✨, Perfect line! 🌟. Only Perfect gets confetti and a cheer.
   */
  /** 061 review: each graded line keeps a small badge pinned to its bubble's top-right corner (by transcript index). */
  const grades = new Map<number, LineGrade>();
  /** Story 068: the better line for a "Try this" grade (tap the chip to see and hear it). */
  const betterLines = new Map<number, { en: string; vi: string }>();
  const gradeBadge = (grade: LineGrade, tag: 'span' | 'div' = 'span', index = -1): HTMLElement => {
    // The big floating Perfect celebration is .perfect-line; a pinned badge is only its grade.
    const better = betterLines.get(index);
    const tappable = grade === 'try' && better && tag === 'span';
    const badge = el(tappable ? 'button' : tag, `line-grade grade-${grade}${grade === 'perfect' && tag === 'div' ? ' perfect-line' : ''}${tappable ? ' tappable' : ''}`, t(`chat.grade.${grade}`));
    badge.dataset.grade = grade;
    if (tappable && better) {
      (badge as HTMLButtonElement).type = 'button';
      badge.setAttribute('aria-label', t('stuck.showBetter'));
      badge.addEventListener('click', (event) => {
        event.stopPropagation();
        openBetterLine(better);
      });
    }
    return badge;
  };
  /** Story 068: the better line, with 🔊 to hear it (the companion's voice). */
  const openBetterLine = (better: { en: string; vi: string }): void => {
    root.querySelector('.better-line')?.remove();
    const card = el('div', 'better-line');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', t('stuck.betterTitle'));
    const en = el('p', 'better-en', better.en);
    en.lang = 'en';
    const vi = el('p', 'better-vi', better.vi);
    vi.lang = 'vi';
    const row = el('div', 'better-actions');
    if (voice?.io.canSpeak) {
      const hear = el('button', 'chat-button secondary better-hear', `🔊 ${t('help.listen')}`);
      hear.type = 'button';
      hear.addEventListener('click', () => void voice.io.speak(better.en, companionSpeech('en', portraits.level)));
      row.append(hear);
    }
    const close = el('button', 'chat-button better-close', t('common.close'));
    close.type = 'button';
    close.addEventListener('click', () => card.remove());
    row.append(close);
    card.append(el('strong', '', `💡 ${t('stuck.betterTitle')}`), en, vi, row);
    root.append(card);
    close.focus({ preventScroll: true });
  };
  const showGrade = (grade: LineGrade, index: number): void => {
    grades.set(index, grade);
    // Story 068: a "Try this" reply to her open question is a miss.
    if (grade === 'try') stuckStep(onTryGrade(stuck));
    const perfect = grade === 'perfect';
    const ms = perfect ? JUICE_CONFIG.perfect.showMs : JUICE_CONFIG.grades.showMs;
    // In the chat: pinned to the corner of the line it grades. While painting (the chat is folded away): it floats.
    const bubble = log.querySelector<HTMLElement>(`.chat-bubble.player[data-index="${index}"]`);
    let badge: HTMLElement;
    if (bubble) {
      bubble.querySelector('.line-grade')?.remove();
      bubble.classList.add('graded');
      bubble.append(gradeBadge(grade, 'span', index));
    }
    // Perfect also gets its big moment (confetti); and while painting (the chat folded away) every grade floats.
    if (bubble && bubble.offsetParent !== null && !perfect) {
      badge = bubble.querySelector('.line-grade') as HTMLElement;
      badge.classList.add('pop');
    } else {
      root.querySelector(':scope > .line-grade')?.remove();
      badge = gradeBadge(grade, 'div');
      badge.classList.add('floating');
      badge.style.setProperty('--show-ms', `${ms}ms`);
      root.append(badge);
      window.setTimeout(() => badge.remove(), ms);
    }
    badge.setAttribute('role', 'status');
    if (perfect) {
      emitSound('correct');
      burst(centreOf(badge), 'confetti');
      mai?.react('celebrating', JUICE_CONFIG.reactMs);
    } else if (grade === 'great') mai?.react('happy', JUICE_CONFIG.reactMs);
  };
  /** After the player sends a line: check it in the background and, if it needs it, queue a tip on Mai's badge. Never blocks the chat. */
  const checkLine = (line: string, helped: boolean, before: AppointmentSnapshot): void => {
    const corrections = bestie?.corrections;
    if (!corrections || !mai) return;
    // Story 061: a helped or very short line is graded Good at once (nothing to check); the rest wait for the check.
    const index = before.transcript.length;
    if (!shouldCheckLine(line, helped, 0)) {
      // After the line's bubble is drawn (it is sent right after this), so the badge pins to it.
      window.setTimeout(() => showGrade(lineGrade(line, null, helped), index), 0);
      return;
    }
    const clientLine = [...before.transcript].reverse().find((message) => message.role === 'client')?.content ?? '';
    corrections.transport
      .checkLine({ level: portraits.level, language: bestie.language, phase: before.phase, line: line.trim(), clientLine })
      .then((result) => {
        if (result.needsCorrection && result.better) betterLines.set(index, { en: result.better.en, vi: result.better.vi });
        if (latest.status !== 'finished') showGrade(lineGrade(line, result, helped), index);
        if (!result.needsCorrection || !result.better || latest.status === 'finished') return;
        // Checks run side by side, so the cap is checked again when each answer lands.
        if (mai.queueTip({ praise: result.praise, said: line.trim(), better: result.better, reason: result.reason, language: bestie.language })) tipsQueued++;
      })
      .catch(() => undefined);
  };

  const unsubscribe = appointment.subscribe(render);
  render(appointment.getSnapshot());

  /** Send a typed or spoken line. */
  function sendLine(text: string, helped: boolean): void {
    if (text.trim() === '') return;
    // Story 064: saying sorry after a slip wins back a little.
    if (apologyDue && saysSorry(text)) {
      apologyDue = false;
      appointment.adjustMood(HANGNAIL_CONFIG.sorryMood);
    }
    emitSound('send');
    reveal?.finish();
    voice?.io.cancelSpeech();
    checkLine(text, helped, latest);
    void appointment.send(text, helped ? { helped: true } : undefined).then(() => {
      if (appointment.getSnapshot().status === 'awaiting_player') input.focus();
    });
  }

  // Story 046: the countdown after speaking. Tapping the box or typing stops it; Send sends at once.
  const countdown = createSendCountdown(
    () => form.requestSubmit(),
    (running) => {
      sendButton.classList.toggle('counting', running);
      if (!running && voiceStatus.textContent === t('voice.checkWords')) voiceStatus.textContent = '';
    },
  );
  for (const type of ['pointerdown', 'focus', 'keydown', 'input'] as const) {
    input.addEventListener(type, () => {
      if (!countdown.running) return;
      countdown.cancel();
      voiceStatus.textContent = t('voice.checkWordsManual');
    });
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    countdown.cancel();
    const text = input.value;
    if (text.trim() === '') return;
    setInput('');
    voiceStatus.textContent = '';
    mic?.setAgain(false);
    sendLine(text, false);
  });
  retryButton.addEventListener('click', () => void appointment.retry());

  let helpSheet: HTMLElement | null = null;
  const closeHelp = (): void => {
    helpSheet?.remove();
    helpSheet = null;
    helpButton.focus();
  };
  helpButton.addEventListener('click', () => {
    if (helpSheet) return;
    const sheet = createHelpMeSayIt({
      level: portraits.level,
      translate: portraits.translate,
      onClose: closeHelp,
      onSend: (text) => {
        closeHelp();
        sendLine(text, true);
      },
      // Story 055: the companion says the English line, in her chosen voice.
      ...(voice?.io.canSpeak ? { speak: (english: string) => void voice.io.speak(english, companionSpeech('en', portraits.level)) } : {}),
    });
    helpSheet = sheet.element;
    root.appendChild(sheet.element);
    sheet.focus();
  });

  return {
    setBestieExpression: zone.setBestieExpression,
    destroy() {
      prep?.destroy();
      station?.destroy();
      mai?.destroy();
      follower.destroy();
      unfit();
      mic?.stop();
      voice?.io.cancelSpeech();
      unsubscribe();
      destroyResults?.();
      reveal?.cancel();
      zone.destroy();
      root.remove();
    },
  };
}
