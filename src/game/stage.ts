import { Application, Container, Graphics, Rectangle } from 'pixi.js';
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
  /** Story 050: a photo of something on the stage (the finished nails) as a JPEG data URL, `width` px wide. */
  snapshot(target: Container, width: number, quality: number, frame?: Rectangle): Promise<string | null>;
  createChatPanel: typeof createChatPanel;
}

const SCENES: Record<SceneName, (width: number, height: number) => Container> = { title: createTitleScreen, salon: createSalonScene };

export async function createStage(host: HTMLElement): Promise<Stage> {
  const app = new Application();
  // Story 047: the canvas is redrawn every frame, so its cost is per pixel: density is capped at 2 (3× phones drew 2.25×
  // the pixels for no visible gain). Antialiasing stays on (overseer: without it the hand and nail edges look jagged;
  // the art is the product).
  const density = Math.min(2, window.devicePixelRatio || 1);
  await app.init({ resizeTo: host, background: 0xfff4f8, antialias: true, autoDensity: true, resolution: density });
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
    async snapshot(target, width, quality, frame) {
      try {
        const bounds = frame ?? target.getLocalBounds().rectangle;
        if (bounds.width <= 0 || bounds.height <= 0) return null;
        const source = app.renderer.extract.canvas({ target, resolution: width / bounds.width, ...(frame ? { frame } : {}) }) as HTMLCanvasElement;
        // JPEG has no transparency: the salon pink goes behind the hand.
        const photo = document.createElement('canvas');
        photo.width = source.width;
        photo.height = source.height;
        const g = photo.getContext('2d');
        if (!g) return null;
        g.fillStyle = '#fde7ef';
        g.fillRect(0, 0, photo.width, photo.height);
        g.drawImage(source, 0, 0);
        return photo.toDataURL('image/jpeg', quality);
      } catch {
        return null;
      }
    },
    createChatPanel,
  };
}
