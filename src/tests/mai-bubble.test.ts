import { describe, expect, it } from 'vitest';
import { EMPTY_TIPS, addTip, openTips } from '../game/mai-tips';
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
