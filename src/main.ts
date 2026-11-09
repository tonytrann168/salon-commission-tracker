import { Application, Container } from 'pixi.js';
import { createAppointment } from './game/appointment';
import { createFetchTransport } from './game/client-turn-transport';
import { DEFAULT_CLIENT } from './game/clients/default-client';
import { createSalonScene } from './game/salon-scene';
import { createTitleMenu, createTitleScreen } from './game/title-screen';
import { createChatPanel } from './game/ui/chat-panel';

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

  const startAppointment = () => {
    teardownDom();
    buildScene = createSalonScene;
    draw();
    const appointment = createAppointment({
      client: DEFAULT_CLIENT,
      takeTurn: createFetchTransport(),
      // Story 002 will take the result to its results screen; for now the chat panel shows a placeholder end state.
      onFinished: () => undefined,
    });
    const panel = createChatPanel(host, appointment, showTitle, { client: DEFAULT_CLIENT, layer: portraitLayer });
    teardownDom = panel.destroy;
  };

  app.renderer.on('resize', draw);
  showTitle();
}

void boot();
