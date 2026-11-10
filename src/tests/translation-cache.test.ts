import { describe, expect, it } from 'vitest';
import { createTranslationCache } from '../game/translation-cache';
import type { Translate } from '../game/types';

/** Story 010 translation cache: every client line gets its own Vietnamese (overseer check after story 011). */

const fakeTranslate = (): { translate: Translate; calls: string[] } => {
  const calls: string[] = [];
  const translate: Translate = async (text) => {
    calls.push(text);
    return `VI(${text})`;
  };
  return { translate, calls };
};

describe('translation cache', () => {
  it('gives two different client lines their own translations', async () => {
    const { translate, calls } = fakeTranslate();
    const cache = createTranslationCache(translate);
    const [first, second] = await Promise.all([cache.get('Hi, I booked a manicure.'), cache.get('Pink, please. Short and round.')]);
    expect(first).toBe('VI(Hi, I booked a manicure.)');
    expect(second).toBe('VI(Pink, please. Short and round.)');
    expect(cache.peek('Hi, I booked a manicure.')).toBe(first);
    expect(cache.peek('Pink, please. Short and round.')).toBe(second);
    expect(calls).toEqual(['Hi, I booked a manicure.', 'Pink, please. Short and round.']);
  });

  it('asks once for a line, even when asked twice at the same time or again later', async () => {
    const { translate, calls } = fakeTranslate();
    const cache = createTranslationCache(translate);
    await Promise.all([cache.get('Pink, please.'), cache.get('Pink, please.')]);
    await cache.get('Pink, please.');
    expect(calls).toEqual(['Pink, please.']);
  });

  it('has nothing for a line it has not translated', () => {
    expect(createTranslationCache(fakeTranslate().translate).peek('Never seen.')).toBeUndefined();
  });
});
