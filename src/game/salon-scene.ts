import { Container, Graphics } from 'pixi.js';

/** Placeholder salon background behind the chat. */
export function createSalonScene(width: number, height: number): Container {
  const scene = new Container();
  scene.label = 'salon-scene';
  const wall = new Graphics().rect(0, 0, width, height).fill(0xffe6f0);
  const floor = new Graphics().rect(0, height * 0.8, width, height * 0.2).fill(0xf3cfdc);
  scene.addChild(wall, floor);
  return scene;
}
