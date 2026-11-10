import mascotJson from '../config/mascot.json';

/**
 * Mai's look as a swappable SKIN (owner, 2026-11-10): the game asks for "Mai, happy, 56 px, wearing X" and the active
 * skin draws her. A different mascot (the owner's pick of the A/B/C concepts, or a hair-salon mascot later) is one
 * new skin module plus a config change, with no change anywhere else. Accessory slots are here now (data only) so
 * dress-up (story 013) and a later cosmetic shop slot in without rework.
 */

export const MASCOT_EXPRESSIONS = ['idle', 'talking', 'happy', 'thinking', 'tipWaiting', 'celebrating'] as const;
export type MascotExpression = (typeof MASCOT_EXPRESSIONS)[number];

/**
 * The designer's moods (owner, 2026-11-10) on top of the six the game uses today. A skin that doesn't draw one gets
 * its closest face: proud → happy, encouraging → talking, worried (gentle) → thinking, sleepy → idle. Final art can
 * supply every mood as an image (see `imageSkins` in config/mascot.json).
 */
export const EXTRA_MOODS = ['proud', 'encouraging', 'worried', 'sleepy'] as const;
export type MascotMood = MascotExpression | (typeof EXTRA_MOODS)[number];
export const MOOD_FALLBACK: Record<(typeof EXTRA_MOODS)[number], MascotExpression> = { proud: 'happy', encouraging: 'talking', worried: 'thinking', sleepy: 'idle' };

/** `nails`: Mai's own painted ear and claw tips ("do Mai's nails", the most on-theme customization). */
export const ACCESSORY_SLOTS = ['head', 'face', 'neck', 'held', 'outfit', 'nails'] as const;
export type AccessorySlot = (typeof ACCESSORY_SLOTS)[number];

export interface Accessory {
  id: string;
  slot: AccessorySlot;
  name: { en: string; vi: string };
  /** v1: every accessory is free, earned by playing (owner: no payments in v1). */
  free: boolean;
  /** How it is earned (story 013 turns these into unlock rules). */
  unlock: string;
}

/** Accessories worn, one per slot at most. */
export type Equipped = Partial<Record<AccessorySlot, string>>;

/** A skin draws the mascot as SVG markup inside a 100x100 viewBox. Markup is built from code, never from player text. */
export interface MascotSkin {
  id: string;
  /** Short description for the concept page. */
  concept: string;
  draw(expression: MascotExpression, equipped: Equipped): string;
  /** Moods this skin draws itself beyond the six (image skins list theirs); others use MOOD_FALLBACK. */
  extraMoods?: readonly MascotMood[];
  /** Draw one of `extraMoods` (image skins). */
  drawMood?(mood: MascotMood, equipped: Equipped): string;
  /** Optional one-colour logo (app icon): shapes in `fg`, eye and mouth cut-outs in `bg`. */
  logo?(fg: string, bg: string): string;
}

/**
 * Final art as files, no code (owner, 2026-11-10: an outside designer is drawing Mai). Each expression or mood is an
 * image or SVG path (served from src/public/), drawn in the same 100x100 box; `anchors` say where each accessory slot
 * sits on this art (x, y in that box); `accessoryImages` optionally swap an accessory's built-in drawing for a file.
 */
export interface ImageSkinConfig {
  id: string;
  /** Required: at least `idle`. Any of the six expressions and the extra moods. */
  images: Partial<Record<MascotMood, string>>;
  anchors: Record<'head' | 'face' | 'neck' | 'hand', [number, number]>;
  accessoryImages?: Record<string, string>;
}

export interface MascotConfig {
  name: string;
  skin: string;
  accessories: Accessory[];
  equipped: Equipped;
  imageSkins: ImageSkinConfig[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Validate the raw mascot file. Throws a clear `mascot.json: ...` error when it is malformed. */
export function parseMascotConfig(raw: unknown): MascotConfig {
  const fail = (problem: string): never => {
    throw new Error(`mascot.json: ${problem}`);
  };
  if (!isRecord(raw)) fail('root must be an object');
  const root = raw as Record<string, unknown>;
  if (typeof root.name !== 'string' || root.name.trim() === '') fail('"name" must be text');
  if (typeof root.skin !== 'string' || root.skin === '') fail('"skin" must be a skin id');
  const items = Array.isArray(root.accessories) ? root.accessories : fail('"accessories" must be a list');
  const accessories = items.map((item, index): Accessory => {
    if (!isRecord(item)) return fail(`"accessories[${index}]" must be an object`);
    const slot = ACCESSORY_SLOTS.find((candidate) => candidate === item.slot) ?? fail(`"accessories[${index}].slot" must be one of ${ACCESSORY_SLOTS.join(', ')}`);
    const name = isRecord(item.name) && typeof item.name.en === 'string' && typeof item.name.vi === 'string' ? { en: item.name.en, vi: item.name.vi } : fail(`"accessories[${index}].name" needs en and vi`);
    if (typeof item.id !== 'string' || item.id === '') fail(`"accessories[${index}].id" must be text`);
    if (item.free !== true) fail(`"accessories[${index}].free" must be true in v1 (no payments)`);
    return { id: item.id as string, slot, name, free: true, unlock: typeof item.unlock === 'string' ? item.unlock : '' };
  });
  const ids = new Set(accessories.map((item) => item.id));
  if (ids.size !== accessories.length) fail('accessory ids must be unique');
  const equipped: Equipped = {};
  if (isRecord(root.equipped)) {
    for (const [slot, id] of Object.entries(root.equipped)) {
      const known = accessories.find((item) => item.id === id);
      if (!known || known.slot !== slot) fail(`"equipped.${slot}" must name an accessory for that slot`);
      equipped[slot as AccessorySlot] = id as string;
    }
  }
  const imageSkins = (Array.isArray(root.imageSkins) ? root.imageSkins : []).map((item, index): ImageSkinConfig => {
    const path = `imageSkins[${index}]`;
    if (!isRecord(item) || typeof item.id !== 'string' || item.id === '') return fail(`"${path}.id" must be text`);
    const moods = [...MASCOT_EXPRESSIONS, ...EXTRA_MOODS] as readonly string[];
    const images = isRecord(item.images) ? item.images : fail(`"${path}.images" must be an object`);
    for (const [mood, file] of Object.entries(images)) {
      if (!moods.includes(mood)) fail(`"${path}.images.${mood}" is not a mood (${moods.join(', ')})`);
      if (typeof file !== 'string' || !/^\/[\w./-]+\.(svg|png|webp)$/.test(file)) fail(`"${path}.images.${mood}" must be a /path/to/file.svg|png|webp`);
    }
    if (typeof images.idle !== 'string') fail(`"${path}.images.idle" is required`);
    const anchors = isRecord(item.anchors) ? item.anchors : fail(`"${path}.anchors" must be an object`);
    const point = (key: string): [number, number] => {
      const value = anchors[key];
      return Array.isArray(value) && value.length === 2 && value.every((n) => typeof n === 'number' && n >= 0 && n <= 100) ? [value[0], value[1]] : fail(`"${path}.anchors.${key}" must be [x, y] in 0-100`);
    };
    const accessoryImages = isRecord(item.accessoryImages) ? (item.accessoryImages as Record<string, string>) : undefined;
    return { id: item.id, images: images as ImageSkinConfig['images'], anchors: { head: point('head'), face: point('face'), neck: point('neck'), hand: point('hand') }, ...(accessoryImages ? { accessoryImages } : {}) };
  });
  return { name: root.name as string, skin: root.skin as string, accessories, equipped, imageSkins };
}

export const MASCOT_CONFIG: MascotConfig = parseMascotConfig(mascotJson);

const SKINS = new Map<string, MascotSkin>();

/** Register a skin module (each skin file calls this). */
export function registerSkin(skin: MascotSkin): void {
  SKINS.set(skin.id, skin);
}

export function getSkin(id: string): MascotSkin {
  const skin = SKINS.get(id);
  if (!skin) throw new Error(`Unknown mascot skin "${id}"`);
  return skin;
}

export const skinIds = (): string[] => [...SKINS.keys()];

/** Mai as an element, `size` px square. `skinId` defaults to the configured skin (concept pages pass their own). */
export function renderMascot(mood: MascotMood, size: number, options: { skinId?: string; equipped?: Equipped; label?: string } = {}): HTMLElement {
  const skin = getSkin(options.skinId ?? MASCOT_CONFIG.skin);
  const own = skin.extraMoods?.includes(mood) && skin.drawMood;
  const expression: MascotExpression = (MASCOT_EXPRESSIONS as readonly string[]).includes(mood) ? (mood as MascotExpression) : MOOD_FALLBACK[mood as keyof typeof MOOD_FALLBACK];
  const box = document.createElement('span');
  box.className = `mascot mascot-${skin.id} mascot-${expression}`;
  box.style.width = `${size}px`;
  box.style.height = `${size}px`;
  box.innerHTML = `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">${own ? skin.drawMood!(mood, options.equipped ?? MASCOT_CONFIG.equipped) : skin.draw(expression, options.equipped ?? MASCOT_CONFIG.equipped)}</svg>`;
  if (options.label) {
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', options.label);
  }
  return box;
}
