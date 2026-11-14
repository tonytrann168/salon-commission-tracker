import { describe, expect, it } from 'vitest';
import { EMPTY_TIPS, addTip, openTips, tipCueShown } from '../game/mai-tips';
import type { Tip } from '../game/mai-tips';
import { ACCESSORY_SLOTS, MASCOT_CONFIG, MASCOT_EXPRESSIONS, getSkin, parseMascotConfig, skinIds } from '../game/mascot';

/** Owner, 2026-11-10: Mai is an on-demand bubble (tips wait behind a badge) drawn by a swappable mascot skin. */

const tip = (said: string): Tip => ({ praise: 'Nice!', said, better: { en: `${said} (better)`, vi: 'câu hay hơn', topic: 'consultation' }, reason: 'Polite.', language: 'en' });

describe("Mai's waiting tips", () => {
  it('queues corrections behind a badge instead of showing them', () => {
    const queue = addTip(addTip(EMPTY_TIPS, tip('one'), 3), tip('two'), 3);
    expect(queue.tips.map((item) => item.said)).toEqual(['one', 'two']);
    expect(queue.unseen).toBe(2);
  });

  it('the tip cue (glow ring and label) shows only while a tip waits unopened (story 040)', () => {
    const waiting = addTip(EMPTY_TIPS, tip('one'), 3);
    expect(tipCueShown(EMPTY_TIPS, false)).toBe(false);
    expect(tipCueShown(waiting, false)).toBe(true);
    expect(tipCueShown(waiting, true)).toBe(false);
    expect(tipCueShown(openTips(waiting).queue, false)).toBe(false);
  });

  it('keeps the per-appointment cap', () => {
    let queue = EMPTY_TIPS;
    for (const said of ['a', 'b', 'c', 'd']) queue = addTip(queue, tip(said), 3);
    expect(queue.tips).toHaveLength(3);
    expect(addTip(queue, tip('e'), 3)).toBe(queue);
  });

  it('opening Mai clears the badge and hands back only the new tips', () => {
    const first = openTips(addTip(EMPTY_TIPS, tip('one'), 3));
    expect(first.fresh.map((item) => item.said)).toEqual(['one']);
    expect(first.queue.unseen).toBe(0);
    const second = openTips(addTip(first.queue, tip('two'), 3));
    expect(second.fresh.map((item) => item.said)).toEqual(['two']);
    expect(second.queue.tips).toHaveLength(2);
  });
});

describe('mascot skin', () => {
  it('loads mascot.json with free accessories only, one per slot type', () => {
    expect(MASCOT_CONFIG.name).toBe('Mai');
    expect(MASCOT_CONFIG.accessories.every((item) => item.free)).toBe(true);
    expect(new Set(MASCOT_CONFIG.accessories.map((item) => item.slot))).toEqual(new Set(ACCESSORY_SLOTS));
  });

  it('refuses a paid accessory (no payments in v1) and a wrong-slot equip', () => {
    const raw = structuredClone(MASCOT_CONFIG) as Record<string, any>;
    raw.accessories[0].free = false;
    expect(() => parseMascotConfig(raw)).toThrow(/no payments/);
    const wrongSlot = structuredClone(MASCOT_CONFIG) as Record<string, any>;
    wrongSlot.equipped = { face: 'bow-pink' };
    expect(() => parseMascotConfig(wrongSlot)).toThrow(/equipped\.face/);
  });

  it('every registered skin draws every expression, with and without accessories', () => {
    expect(skinIds()).toContain(MASCOT_CONFIG.skin);
    const all = Object.fromEntries(MASCOT_CONFIG.accessories.map((item) => [item.slot, item.id]));
    for (const id of skinIds()) {
      for (const expression of MASCOT_EXPRESSIONS) {
        const plain = getSkin(id).draw(expression, {});
        expect(plain).toMatch(/<(circle|ellipse|path|rect)/);
        expect(getSkin(id).draw(expression, all).length).toBeGreaterThan(plain.length);
      }
    }
  });
});

describe('final art drops in as files (owner, 2026-11-10)', () => {
  const art = {
    id: 'mai-final',
    images: {
      idle: { full: '/mascot/mai/idle.svg', bust: '/mascot/mai/idle-bust.svg' },
      happy: '/mascot/mai/happy.png',
      proud: { full: '/mascot/mai/proud.webp' },
      sleepy: '/mascot/mai/sleepy.svg',
    },
    anchors: { head: [50, 8], face: [50, 22], neck: [50, 32], handLeft: [20, 55], hand: [80, 55], feet: [50, 96], tail: [78, 78] },
    nailTips: { idle: [{ x: 18, y: 58, r: 1.5 }, { x: 82, y: 58, r: 1.5 }] },
    accessoryImages: { 'bow-pink': '/mascot/acc/bow.svg' },
  };
  const parse = (change: Record<string, unknown>) => () => parseMascotConfig({ ...structuredClone(MASCOT_CONFIG), imageSkins: [{ ...art, ...change }] });

  it('accepts a full-body + bust skin with hand, feet and tail anchors and fingertip regions', () => {
    const skin = parseMascotConfig({ ...structuredClone(MASCOT_CONFIG), imageSkins: [art] }).imageSkins[0];
    expect(skin?.images.idle).toEqual({ full: '/mascot/mai/idle.svg', bust: '/mascot/mai/idle-bust.svg' });
    expect(skin?.images.happy).toEqual({ full: '/mascot/mai/happy.png' });
    expect(skin?.anchors.handRight).toEqual([80, 55]);
    expect(skin?.anchors.tail).toEqual([78, 78]);
    expect(skin?.nailTips?.idle).toHaveLength(2);
  });

  it('refuses a bust without its full-body image, unknown anchors, and bad files, anchors or tips', () => {
    expect(parse({ images: { idle: { bust: '/mascot/mai/idle-bust.svg' } } })).toThrow(/full" is required/);
    expect(parse({ anchors: { ...art.anchors, horns: [50, 2] } })).toThrow(/anchors\.horns" is not an anchor/);
    expect(parse({ images: { happy: '/a.svg' } })).toThrow(/images\.idle/);
    expect(parse({ images: { idle: 'javascript:alert(1)' } })).toThrow(/must be a \/path/);
    expect(parse({ anchors: { head: [50, 8], face: [50, 22], neck: [50, 32] } })).toThrow(/handRight" is required/);
    expect(parse({ nailTips: { idle: [{ x: 18, y: 58, r: 40 }] } })).toThrow(/nailTips\.idle\[0\]/);
    expect(parse({ nailTips: { talking: [] } })).toThrow(/no image for that mood/);
  });
});

describe('image skin drawing', async () => {
  const { imageMarkup } = await import('../game/mascot/image-skins');
  const config = parseMascotConfig({
    ...structuredClone(MASCOT_CONFIG),
    imageSkins: [{ id: 'mai-final', images: { idle: { full: '/m/idle.svg', bust: '/m/idle-bust.svg' }, happy: '/m/happy.svg' }, anchors: { head: [50, 8], face: [50, 22], neck: [50, 32], hand: [80, 55] } }],
  }).imageSkins[0]!;

  it('the bubble uses the bust, else zooms into the top of the full body; bigger views use the full body', () => {
    expect(imageMarkup(config, 'idle', {}, 'bust')).toContain('/m/idle-bust.svg');
    expect(imageMarkup(config, 'happy', {}, 'bust')).toMatch(/<g transform="translate\(-41 0\) scale\(1\.82\)"><image href="\/m\/happy\.svg"/);
    expect(imageMarkup(config, 'idle', { head: 'bow-pink' })).toContain('/m/idle.svg');
    // A mood without art shows idle.
    expect(imageMarkup(config, 'sleepy', {})).toContain('/m/idle.svg');
  });
});

describe('accessories on a drawn bust (bustAnchors)', async () => {
  const { imageMarkup } = await import('../game/mascot/image-skins');
  const skin = (extra: Record<string, unknown>) =>
    parseMascotConfig({
      ...structuredClone(MASCOT_CONFIG),
      imageSkins: [{ id: 'mai-final', images: { idle: { full: '/m/idle.svg', bust: '/m/idle-bust.svg' } }, anchors: { head: [50, 8], face: [50, 22], neck: [50, 32], hand: [80, 55] }, accessoryImages: { 'bow-pink': '/m/acc/bow.svg' }, ...extra }],
    }).imageSkins[0]!;

  it('places head, face and neck accessories on the bust when bustAnchors exist (a bought hat shows in the bubble)', () => {
    const withAnchors = skin({ bustAnchors: { head: [50, 12], face: [50, 50], neck: [50, 88] } });
    const markup = imageMarkup(withAnchors, 'idle', { head: 'bow-pink', held: 'brush-gold' }, 'bust');
    expect(markup).toContain('/m/idle-bust.svg');
    expect(markup).toContain('<image href="/m/acc/bow.svg" x="35" y="-3"');
    expect(markup).not.toContain('#e0b44a'); // the held gold brush stays on the full body
  });

  it('keeps the bust bare without bustAnchors, and refuses bad bust anchors', () => {
    expect(imageMarkup(skin({}), 'idle', { head: 'bow-pink' }, 'bust')).not.toContain('/m/acc/bow.svg');
    expect(() => skin({ bustAnchors: { head: [50, 12], face: [50, 50], neck: [50, 88], hand: [1, 1] } })).toThrow(/bustAnchors\.hand" is not a bust anchor/);
    expect(() => skin({ bustAnchors: { head: [50, 12], face: [50, 50] } })).toThrow(/bustAnchors\.neck/);
  });
});
