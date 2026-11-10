import { EXTRA_MOODS, MASCOT_CONFIG, registerSkin } from './mascot';
import type { Equipped, ImageSkinConfig, MascotMood } from './mascot';
import { accessories } from './shared';

/**
 * Register every `imageSkins` entry of config/mascot.json as a skin: final art drops in as files plus a config entry,
 * with no code change. A missing mood shows `idle`. Full body by default; the bubble asks for the bust (the bust
 * image, or else the top of the full image, zoomed in). Accessories sit at the skin's anchors.
 */
const escapeAttr = (value: string): string => value.replace(/[&"<>]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Automatic bust crop: show the top 55% of the full image, centred, filling the box. */
const AUTO_BUST = 'translate(-41 0) scale(1.82)';

export function imageMarkup(config: ImageSkinConfig, mood: MascotMood, equipped: Equipped, crop: 'bust' | 'full' = 'full'): string {
  const art = config.images[mood] ?? config.images.idle;
  if (!art) return '';
  // A drawn bust has its own framing, so accessories (placed for the full body) are left off it.
  if (crop === 'bust' && art.bust) return `<image href="${escapeAttr(art.bust)}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet"/>`;
  const anchors = { head: config.anchors.head, face: config.anchors.face, neck: config.anchors.neck, hand: config.anchors.handRight };
  const base = `<image href="${escapeAttr(art.full)}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet"/>`;
  const custom = Object.entries(equipped)
    .map(([slot, id]) => {
      const file = id ? config.accessoryImages?.[id] : undefined;
      if (!file) return '';
      const [x, y] = slot === 'held' ? anchors.hand : anchors[slot as 'head' | 'face' | 'neck'] ?? anchors.face;
      return `<image href="${escapeAttr(file)}" x="${x - 15}" y="${y - 15}" width="30" height="30"/>`;
    })
    .join('');
  const builtIn = Object.fromEntries(Object.entries(equipped).filter(([, id]) => id && !config.accessoryImages?.[id])) as Equipped;
  const everything = base + accessories(builtIn, anchors) + custom;
  return crop === 'bust' ? `<g transform="${AUTO_BUST}">${everything}</g>` : everything;
}

for (const config of MASCOT_CONFIG.imageSkins) {
  registerSkin({
    id: config.id,
    concept: `Final art (${config.id}): image files from config/mascot.json.`,
    extraMoods: EXTRA_MOODS.filter((mood) => config.images[mood] !== undefined),
    draw: (expression, equipped, crop) => imageMarkup(config, expression, equipped, crop),
    drawMood: (mood, equipped, crop) => imageMarkup(config, mood, equipped, crop),
  });
}
