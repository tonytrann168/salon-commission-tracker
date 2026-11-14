import { describe, expect, it } from 'vitest';
import { companionParams, fillTemplate } from '../game/i18n';
import { writeStored } from '../game/safe-storage';
import { TAGLINES, nextTagline, parseTaglines, taglineText } from '../game/taglines';

/** Story 042: the title's rotating taglines. */

describe('taglines', () => {
  it('has 12 lines in each language, none repeated, each short enough for the title', () => {
    expect(TAGLINES.en).toHaveLength(12);
    expect(TAGLINES.vi).toHaveLength(12);
    expect(new Set([...TAGLINES.en, ...TAGLINES.vi]).size).toBe(24);
    expect([...TAGLINES.en, ...TAGLINES.vi].every((line) => line.length <= 70)).toBe(true);
    expect(() => parseTaglines({ ...TAGLINES, vi: TAGLINES.vi.slice(1) })).toThrow(/same number/);
    expect(() => parseTaglines({ ...TAGLINES, noRepeatWithin: 12 })).toThrow(/noRepeatWithin/);
  });

  it('never shows one of the last 3 again, visit after visit', () => {
    let recent: number[] = [];
    for (let visit = 0; visit < 300; visit++) {
      const next = nextTagline(recent, (visit * 0.37) % 1);
      expect(recent).not.toContain(next.pick);
      recent = next.recent;
      expect(recent.length).toBeLessThanOrEqual(TAGLINES.noRepeatWithin);
    }
  });

  it('the same pick is that visit\'s line in both languages; Vietnamese tokens follow the companion', () => {
    expect(taglineText(1, 'en')).toBe('Polish your nails. Polish your English.');
    expect(taglineText(1, 'vi')).toBe('Sơn đẹp, nói hay, tip đầy túi! 💅');
    writeStored('salon.companion.v1', JSON.stringify({ chosen: true, gender: 'female', name: 'Mai', equipped: {}, relation: 'younger', playerTitle: 'anh' }));
    expect(fillTemplate(taglineText(8, 'vi'), companionParams())).toBe('Em với anh cùng lên tay nghề, lên tiếng Anh nha!');
    writeStored('salon.companion.v1', JSON.stringify({ chosen: true, gender: 'female', name: 'Mai', equipped: {} }));
    expect(fillTemplate(taglineText(8, 'vi'), companionParams())).toBe('Chị với em cùng lên tay nghề, lên tiếng Anh nha!');
    // No leftover tokens in any line.
    for (const line of TAGLINES.vi) expect(fillTemplate(line, companionParams())).not.toMatch(/\{\w+\}/);
  });
});
