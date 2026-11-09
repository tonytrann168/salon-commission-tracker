import { createPlaceholderFace } from './placeholder-faces';
import type { Portrait, PortraitKind, PortraitPalette, Pose } from './portrait';

/** Portrait definitions and renderer registry. Story: story-009. Characters name a definition by id. */

export interface PortraitDefinition {
  id: string;
  name: string;
  kind: PortraitKind;
  palette: PortraitPalette;
}

type PortraitFactory = (definition: PortraitDefinition, size: number) => Portrait;

/** One entry per renderer kind. Final art adds a kind and an entry here; callers do not change. */
const RENDERERS: Record<PortraitKind, PortraitFactory> = {
  'placeholder-face': (definition, size) => createPlaceholderFace(definition.palette, size),
};

export const PORTRAIT_DEFINITIONS: Readonly<Record<string, PortraitDefinition>> = {
  dana: { id: 'dana', name: 'Dana', kind: 'placeholder-face', palette: { skin: 0xe8b596, hair: 0x5b3a29, accent: 0xff8fb1 } },
  bestie: { id: 'bestie', name: 'Bestie', kind: 'placeholder-face', palette: { skin: 0xffd9c2, hair: 0xb98cf0, accent: 0xff5c9a } },
};

/** Look up a definition by id. Throws when the id is unknown (a bad reference in character data). */
export function getPortraitDefinition(id: string): PortraitDefinition {
  const definition = PORTRAIT_DEFINITIONS[id];
  if (!definition) throw new Error(`Unknown portrait id "${id}"`);
  return definition;
}

/** Create a portrait for the character's portrait id, already showing `pose`. */
export function createPortrait(id: string, size: number, pose: Pose): Portrait {
  const definition = getPortraitDefinition(id);
  const portrait = RENDERERS[definition.kind](definition, size);
  portrait.setPose(pose);
  return portrait;
}
