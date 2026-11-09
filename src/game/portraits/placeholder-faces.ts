import { Container, Graphics, Ticker } from 'pixi.js';
import { EXPRESSION_CONFIG, FACE_PARAM_KEYS } from './portrait';
import type { FaceParams, Portrait, PortraitPalette, Pose } from './portrait';

/**
 * Placeholder portrait renderer: a cute head drawn with PixiJS Graphics, no image files.
 * Expressions differ by shape (brows, eyes, mouth), not color. Story: story-009.
 */

/** The face is drawn in a 100x100 design square, then scaled to the requested size. */
const DESIGN_SIZE = 100;
const HEAD_CENTER_Y = 52;
const FEATURE_COLOR = 0x3b2a33;
const MOUTH_INSIDE = 0xb8456b;
const EYE_Y = 8;
const EYE_SPACING = 14;
const MOUTH_Y = 24;
const BLUSH_SPACING = 23;
const BLUSH_Y = 18;
const TURN_RANGE = 8;

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

function drawFeatures(g: Graphics, p: FaceParams, palette: PortraitPalette, extraMouthOpen: number): void {
  g.clear();

  if (p.blush > 0.02) {
    for (const side of [-1, 1]) {
      g.ellipse(side * BLUSH_SPACING, BLUSH_Y, 7, 4).fill({ color: palette.accent, alpha: 0.65 * Math.min(1, p.blush) });
    }
  }

  for (const side of [-1, 1]) {
    const cx = side * EYE_SPACING;
    const ry = Math.max(0.8, 8.5 * p.eyeOpen);
    const pupilX = cx + p.lookX * 3;
    g.ellipse(cx, EYE_Y, 8, ry).fill(0xffffff).stroke({ width: 1.5, color: FEATURE_COLOR });
    g.ellipse(pupilX, EYE_Y, 4.5, Math.min(5.5, ry)).fill(FEATURE_COLOR);
    if (p.eyeOpen > 0.5) g.circle(pupilX + 1.5, EYE_Y - Math.min(5.5, ry) * 0.4, 1.5).fill(0xffffff);
  }

  const angle = (p.browAngle * Math.PI) / 180;
  const browY = -4 - p.browHeight * 6;
  for (const side of [-1, 1]) {
    const cx = side * EYE_SPACING;
    const dx = Math.cos(angle) * 9;
    const dy = Math.sin(angle) * 9;
    g.moveTo(cx - side * dx, browY + dy)
      .lineTo(cx + side * dx, browY - dy)
      .stroke({ width: 3.5, color: FEATURE_COLOR, cap: 'round' });
  }

  const halfWidth = 11 * p.mouthWidth;
  const cornerY = MOUTH_Y - p.mouthCurve * 4;
  const topControlY = MOUTH_Y + p.mouthCurve * 8;
  const bottomControlY = topControlY + (p.mouthOpen + extraMouthOpen) * 24;
  g.moveTo(-halfWidth, cornerY)
    .quadraticCurveTo(0, topControlY, halfWidth, cornerY)
    .quadraticCurveTo(0, bottomControlY, -halfWidth, cornerY)
    .closePath()
    .fill(MOUTH_INSIDE)
    .stroke({ width: 2.5, color: FEATURE_COLOR, cap: 'round', join: 'round' });
}

/** Build a placeholder face portrait. Pixi's shared ticker runs only while a transition or talking is in progress. */
export function createPlaceholderFace(palette: PortraitPalette, size: number): Portrait {
  const view = new Container();
  view.label = 'portrait';
  const head = new Container();
  head.position.set(DESIGN_SIZE / 2, HEAD_CENTER_Y);
  view.addChild(head);

  const hairBack = new Graphics()
    .ellipse(0, -4, 42, 40)
    .fill(palette.hair)
    .roundRect(-43, -6, 18, 50, 9)
    .fill(palette.hair)
    .roundRect(25, -6, 18, 50, 9)
    .fill(palette.hair);
  const ears = new Graphics().circle(-36, 6, 7).fill(palette.skin).circle(36, 6, 7).fill(palette.skin);
  const skin = new Graphics().ellipse(0, 4, 36, 33).fill(palette.skin);
  const fringe = new Graphics()
    .moveTo(-36, -2)
    .quadraticCurveTo(-36, -44, 0, -40)
    .quadraticCurveTo(36, -44, 36, -2)
    .quadraticCurveTo(14, -26, 0, -18)
    .quadraticCurveTo(-16, -14, -36, -2)
    .closePath()
    .fill(palette.hair);
  const bow = new Graphics()
    .ellipse(20, -36, 6, 4)
    .fill(palette.accent)
    .ellipse(32, -36, 6, 4)
    .fill(palette.accent)
    .circle(26, -36, 3.5)
    .fill(palette.accent)
    .stroke({ width: 1, color: FEATURE_COLOR, alpha: 0.35 });
  const features = new Graphics();
  head.addChild(hairBack, ears, skin, fringe, features, bow);

  // Preallocated so a transition allocates nothing per frame.
  const current = { ...EXPRESSION_CONFIG.faces.neutral };
  const from = { ...current };
  let target: FaceParams = current;
  let elapsed = 0;
  let animating = false;
  let talking = false;
  let talkElapsed = 0;
  let talkStill = false;
  let running = false;
  let hasPose = false;

  const mouthExtra = (): number => {
    if (!talking) return 0;
    const { mouthHz, mouthOpenMax, reducedMotionMouthOpen } = EXPRESSION_CONFIG.talking;
    if (talkStill) return reducedMotionMouthOpen;
    // Raised-cosine wave from 0 to mouthOpenMax: starts closed, so the mouth eases open on top of the pose's own.
    return mouthOpenMax * (0.5 - 0.5 * Math.cos((2 * Math.PI * mouthHz * talkElapsed) / 1000));
  };

  const apply = (): void => {
    drawFeatures(features, current, palette, mouthExtra());
    features.x = current.headTurn * TURN_RANGE;
    head.rotation = (current.headTilt * Math.PI) / 180;
  };

  const tick = (ticker: Ticker): void => {
    if (animating) {
      elapsed += ticker.deltaMS;
      const t = Math.min(1, elapsed / EXPRESSION_CONFIG.transitionMs);
      const eased = easeOutCubic(t);
      for (const key of FACE_PARAM_KEYS) current[key] = from[key] + (target[key] - from[key]) * eased;
      if (t >= 1) animating = false;
    }
    if (talking && !talkStill) talkElapsed += ticker.deltaMS;
    apply();
    if (!animating && (!talking || talkStill)) halt();
  };

  function start(): void {
    if (running) return;
    running = true;
    Ticker.shared.add(tick);
  }

  function halt(): void {
    if (!running) return;
    running = false;
    Ticker.shared.remove(tick);
  }

  view.once('destroyed', halt);

  const setSize = (next: number): void => {
    view.scale.set(next / DESIGN_SIZE);
  };
  setSize(size);

  return {
    view,
    setSize,
    setPose(pose: Pose): void {
      const next = EXPRESSION_CONFIG.faces[pose];
      if (!hasPose) {
        hasPose = true;
        target = next;
        for (const key of FACE_PARAM_KEYS) current[key] = next[key];
        apply();
        return;
      }
      if (next === target) return;
      for (const key of FACE_PARAM_KEYS) from[key] = current[key];
      target = next;
      elapsed = 0;
      animating = true;
      start();
    },
    setTalking(next: boolean): void {
      if (next === talking) return;
      talking = next;
      talkElapsed = 0;
      talkStill = next && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (next && !talkStill) {
        start();
      } else if (!animating) {
        halt();
        apply();
      }
    },
    destroy(): void {
      halt();
      view.destroy({ children: true });
    },
  };
}
