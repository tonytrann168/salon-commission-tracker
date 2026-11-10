import { Application, Container } from 'pixi.js';
import { createAppointment } from './game/appointment';
import { createFetchTransport } from './game/client-turn-transport';
import { createGradeTransport } from './game/grade-appointment-transport';
import { DEFAULT_CLIENT } from './game/clients/default-client';
import { SCORING_CONFIG } from './game/scoring';
import { createSalonScene } from './game/salon-scene';
import { createTitleMenu, createTitleScreen } from './game/title-screen';
import { createTranslateTransport } from './game/translate-transport';
import { createTranslationCache } from './game/translation-cache';
import { getEnglishLevel, getHelpLanguage, setEnglishLevel } from './game/settings';
import { createChatPanel } from './game/ui/chat-panel';
import { applyDocumentLanguage, t } from './game/i18n';
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
    const menu = createTitleMenu(host, startAppointment, showSettings);
    teardownDom = () => menu.remove();
  };

  const showSettings = () => {
    teardownDom();
    const screen = createSettingsScreen(host, showTitle);
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
          setEnglishLevel(level);
          beginAppointment(level);
        },
      }),
      back,
    );
    host.appendChild(screen);
    teardownDom = () => screen.remove();
  };

  const gradeAppointment = createGradeTransport();
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
      onEnded: (container, result) =>
        createResultsScreen(container, {
          clientName: DEFAULT_CLIENT.name,
          result,
          level,
          config: SCORING_CONFIG,
          grade: gradeAppointment,
          onNextClient: startAppointment,
          onBackToMenu: showTitle,
        }).destroy,
    });
    teardownDom = panel.destroy;
  };

  app.renderer.on('resize', draw);
  showTitle();
}

void boot();
