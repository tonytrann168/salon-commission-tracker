import type { Container } from 'pixi.js';
import { companionPortraitId, createPortrait, getPortraitDefinition } from '../portraits/definitions';
import { loadCompanion } from '../companion';
import type { Expression, Portrait, Pose } from '../portraits/portrait';
import type { ClientPersona } from '../types';
import { t } from '../i18n';

/**
 * Fixed-height transparent zone between the chat header and log (sized in chat-panel.css). The Pixi
 * portraits are positioned over it, so expression changes never touch the DOM layout. Story: story-009.
 */

const CLIENT_PADDING = 6;
const BESTIE_CORNER_FRACTION = 0.42;
const BESTIE_CORNER_MARGIN = 10;
/** The client's face size while the nail station is open (story 005). */
const COMPACT_CLIENT_PX = 58;

export interface PortraitZone {
  element: HTMLElement;
  /** Show the client's pose. */
  setClientPose(pose: Pose): void;
  /** Start or stop the client talking (mouth moving over her current pose). */
  setClientTalking(talking: boolean): void;
  /** Show the bestie's expression (story 003 drives this later). */
  setBestieExpression(expression: Expression): void;
  /** Story 005: while the nail station is open the client shrinks to a small face in the top-left corner. */
  setCompactClient(compact: boolean): void;
  /** The zone's rectangle relative to the host (where the station draws). */
  rect(): { left: number; top: number; width: number; height: number };
  destroy(): void;
}

/** Create the zone element (the caller mounts it) and put the client and bestie portraits on `layer`, over the zone. */
export function createPortraitZone(host: HTMLElement, layer: Container, client: ClientPersona, initialPose: Pose, showBestie = true): PortraitZone {
  const element = document.createElement('div');
  element.className = 'portrait-zone';
  element.setAttribute('role', 'img');

  const clientName = getPortraitDefinition(client.portraitId).name;
  const clientPortrait = createPortrait(client.portraitId, 1, initialPose);
  const bestiePortrait: Portrait = createPortrait(companionPortraitId(loadCompanion().gender), 1, 'neutral');
  // With the Mai bubble on screen (owner, 2026-11-10) the corner portrait would be a second Mai: hide it.
  bestiePortrait.view.visible = showBestie;
  layer.addChild(clientPortrait.view, bestiePortrait.view);

  let clientPose = initialPose;
  const label = (): void =>
    element.setAttribute('aria-label', t('portrait.label', { name: clientName, pose: t(`pose.${clientPose}`) }));
  label();

  let compact = false;
  const rect = (): { left: number; top: number; width: number; height: number } => {
    const zone = element.getBoundingClientRect();
    const origin = host.getBoundingClientRect();
    return { left: zone.left - origin.left, top: zone.top - origin.top, width: zone.width, height: zone.height };
  };
  const place = (): void => {
    const zone = rect();
    const { left, top } = zone;
    if (compact) {
      const small = Math.min(COMPACT_CLIENT_PX, Math.max(1, zone.height * 0.4));
      clientPortrait.setSize(small);
      clientPortrait.view.position.set(left + 8, top + 6);
    } else {
      const clientSize = Math.max(1, zone.height - CLIENT_PADDING * 2);
      clientPortrait.setSize(clientSize);
      clientPortrait.view.position.set(left + (zone.width - clientSize) / 2, top + CLIENT_PADDING);
    }
    const bestieSize = Math.max(1, zone.height * BESTIE_CORNER_FRACTION);
    bestiePortrait.setSize(bestieSize);
    bestiePortrait.view.position.set(
      left + zone.width - bestieSize - BESTIE_CORNER_MARGIN,
      top + zone.height - bestieSize - CLIENT_PADDING,
    );
  };

  // Fires on viewport resize and orientation change (the zone's size follows the viewport) and on first layout.
  const observer = new ResizeObserver(place);
  observer.observe(element);

  return {
    element,
    setClientPose(pose) {
      if (pose === clientPose) return;
      clientPose = pose;
      clientPortrait.setPose(pose);
      label();
    },
    setClientTalking(talking) {
      clientPortrait.setTalking(talking);
    },
    setCompactClient(next) {
      compact = next;
      place();
    },
    rect,
    setBestieExpression(expression) {
      bestiePortrait.setPose(expression);
    },
    destroy() {
      observer.disconnect();
      clientPortrait.destroy();
      bestiePortrait.destroy();
      element.remove();
    },
  };
}
