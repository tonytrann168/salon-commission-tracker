import { Application, Container } from 'pixi.js';
import { createAppointment } from './game/appointment';
import { createFetchTransport } from './game/client-turn-transport';
import { createGradeTransport } from './game/grade-appointment-transport';
import { DEFAULT_CLIENT } from './game/clients/default-client';
import { SCORING_CONFIG } from './game/scoring';
import { createSalonScene } from './game/salon-scene';
import { createTitleMenu, createTitleScreen } from './game/title-screen';
import { createChatPanel } from './game/ui/chat-panel';
import { createResultsScreen } from './game/ui/results-screen';
import './game/ui/global.css';

async function boot(): Promise<void> {
  const host = document.getElementById('app');
  if (!host) throw new Error('#app element missing');

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
    const menu = createTitleMenu(host, startAppointment);
    teardownDom = () => menu.remove();
  };

  const gradeAppointment = createGradeTransport();

  const startAppointment = () => {
    teardownDom();
    buildScene = createSalonScene;
    draw();
    const appointment = createAppointment({
      client: DEFAULT_CLIENT,
      takeTurn: createFetchTransport(),
      // Grading starts from the chat panel's onEnded, once the final line has finished revealing (story 002).
      onFinished: () => undefined,
    });
    const panel = createChatPanel(host, appointment, {
      client: DEFAULT_CLIENT,
      layer: portraitLayer,
      onEnded: (container, result) =>
        createResultsScreen(container, {
          clientName: DEFAULT_CLIENT.name,
          result,
          level: SCORING_CONFIG.defaultEnglishLevel, // story 010 replaces this with the player's chosen level
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
