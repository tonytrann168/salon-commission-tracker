import { Application, Container, Graphics } from 'pixi.js';
import { createPortrait } from './portraits/definitions';
import { createSalonScene } from './salon-scene';
import { createTitleScreen } from './title-screen';
import { createChatPanel } from './ui/chat-panel';

/**
 * Everything that needs PixiJS (story 018): the canvas, the title and salon scenes, portraits drawn as images, and the
 * chat panel (portraits, nail station). main.ts loads this module with a dynamic import, so the HTML title menu shows
 * first and PixiJS (most of the download) arrives in the background.
 */

export type SceneName = 'title' | 'salon';

export interface Stage {
  /** Draw a scene (redrawn on resize). */
  show(scene: SceneName): void;
  /** The layer the chat panel puts portraits and the nail station on. */
  layer: Container;
  /** A portrait as a data-URL image (the client picker's faces). */
  faceImage(portraitId: string, px: number): Promise<string | null>;
  createChatPanel: typeof createChatPanel;
}

const SCENES: Record<SceneName, (width: number, height: number) => Container> = { title: createTitleScreen, salon: createSalonScene };

export async function createStage(host: HTMLElement): Promise<Stage> {
  const app = new Application();
  await app.init({ resizeTo: host, background: 0xfff4f8, antialias: true, autoDensity: true, resolution: window.devicePixelRatio || 1 });
  // Behind every HTML screen, which may already be showing.
  host.prepend(app.canvas);
  // Scenes are rebuilt on resize. Portraits live on their own layer so they survive redraws.
  const sceneRoot = new Container();
  const layer = new Container();
  app.stage.addChild(sceneRoot, layer);
  let current: SceneName = 'title';
  const draw = (): void => {
    sceneRoot.removeChildren().forEach((old) => old.destroy({ children: true }));
    sceneRoot.addChild(SCENES[current](app.screen.width, app.screen.height));
  };
  app.renderer.on('resize', draw);
  return {
    show(scene) {
      current = scene;
      draw();
    },
    layer,
    async faceImage(portraitId, px) {
      const portrait = createPortrait(portraitId, px, 'neutral');
      // A clear square behind the face keeps every image the same size and centred.
      const frame = new Container();
      frame.addChild(new Graphics().rect(0, 0, px, px).fill({ color: 0xffffff, alpha: 0 }), portrait.view);
      try {
        return await app.renderer.extract.base64({ target: frame, resolution: 2 });
      } catch {
        return null;
      } finally {
        frame.destroy({ children: true });
      }
    },
    createChatPanel,
  };
}
