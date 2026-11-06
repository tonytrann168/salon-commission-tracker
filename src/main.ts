import { Application } from 'pixi.js';
import { createTitleScreen } from './game/title-screen';

async function boot(): Promise<void> {
  const host = document.getElementById('app');
  if (!host) throw new Error('#app element missing');

  const app = new Application();
  await app.init({ resizeTo: host, background: 0xfff4f8, antialias: true, autoDensity: true, resolution: window.devicePixelRatio || 1 });
  host.appendChild(app.canvas);

  const show = () => {
    app.stage.removeChildren();
    app.stage.addChild(createTitleScreen(app.screen.width, app.screen.height));
  };
  show();
  app.renderer.on('resize', show);
}

void boot();
