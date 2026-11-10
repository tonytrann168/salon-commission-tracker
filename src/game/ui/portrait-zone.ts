import type { Container } from 'pixi.js';
import { createPortrait, getPortraitDefinition } from '../portraits/definitions';
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
const BESTIE_ID = 'bestie';

export interface PortraitZone {
  element: HTMLElement;
  /** Show the client's pose. */
  setClientPose(pose: Pose): void;
  /** Start or stop the client talking (mouth moving over her current pose). */
  setClientTalking(talking: boolean): void;
  /** Show the bestie's expression (story 003 drives this later). */
  setBestieExpression(expression: Expression): void;
  destroy(): void;
}

/** Create the zone element (the caller mounts it) and put the client and bestie portraits on `layer`, over the zone. */
export function createPortraitZone(host: HTMLElement, layer: Container, client: ClientPersona, initialPose: Pose): PortraitZone {
  const element = document.createElement('div');
  element.className = 'portrait-zone';
  element.setAttribute('role', 'img');

  const clientName = getPortraitDefinition(client.portraitId).name;
  const clientPortrait = createPortrait(client.portraitId, 1, initialPose);
  const bestiePortrait: Portrait = createPortrait(BESTIE_ID, 1, 'neutral');
  layer.addChild(clientPortrait.view, bestiePortrait.view);

  let clientPose = initialPose;
  const label = (): void =>
    element.setAttribute('aria-label', t('portrait.label', { name: clientName, pose: t(`pose.${clientPose}`) }));
  label();

  const place = (): void => {
    const zone = element.getBoundingClientRect();
    const origin = host.getBoundingClientRect();
    const left = zone.left - origin.left;
    const top = zone.top - origin.top;
    const clientSize = Math.max(1, zone.height - CLIENT_PADDING * 2);
    clientPortrait.setSize(clientSize);
    clientPortrait.view.position.set(left + (zone.width - clientSize) / 2, top + CLIENT_PADDING);
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
