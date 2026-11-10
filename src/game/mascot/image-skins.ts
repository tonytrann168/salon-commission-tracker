import { EXTRA_MOODS, MASCOT_CONFIG, registerSkin } from './mascot';
import type { Equipped, ImageSkinConfig, MascotMood } from './mascot';
import { accessories } from './shared';

/**
 * Register every `imageSkins` entry of config/mascot.json as a skin: final art drops in as files plus a config entry,
 * with no code change. A missing mood shows `idle`. Accessories sit at the skin's anchors (built-in drawings, or the
 * skin's own accessory images).
 */
const escapeAttr = (value: string): string => value.replace(/[&"<>]/g, (c) => `&#${c.charCodeAt(0)};`);

function imageMarkup(config: ImageSkinConfig, mood: MascotMood, equipped: Equipped): string {
  const file = config.images[mood] ?? config.images.idle ?? '';
  const base = `<image href="${escapeAttr(file)}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet"/>`;
  const custom = Object.entries(equipped)
    .map(([slot, id]) => {
      const art = id ? config.accessoryImages?.[id] : undefined;
      if (!art) return '';
      const [x, y] = slot === 'held' ? config.anchors.hand : config.anchors[slot as 'head' | 'face' | 'neck'] ?? config.anchors.face;
      return `<image href="${escapeAttr(art)}" x="${x - 15}" y="${y - 15}" width="30" height="30"/>`;
    })
    .join('');
  // Accessories without their own art fall back to the built-in drawings at this skin's anchors.
  const builtIn = Object.fromEntries(Object.entries(equipped).filter(([, id]) => id && !config.accessoryImages?.[id])) as Equipped;
  return base + accessories(builtIn, config.anchors) + custom;
}

for (const config of MASCOT_CONFIG.imageSkins) {
  registerSkin({
    id: config.id,
    concept: `Final art (${config.id}): image files from config/mascot.json.`,
    extraMoods: EXTRA_MOODS.filter((mood) => config.images[mood] !== undefined),
    draw: (expression, equipped) => imageMarkup(config, expression, equipped),
    drawMood: (mood, equipped) => imageMarkup(config, mood, equipped),
  });
}
