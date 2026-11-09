import { readStored, writeStored } from './safe-storage';
import type { Translate } from './types';

/**
 * English-to-Vietnamese translations of client lines, cached per line text. A line is never sent to the AI twice in a
 * session. Fixed lines (the persona's opening line) are also saved on the device. Story: story-010.
 */

/** v2: the salon-pronoun (chị/em) translations; older saved ones used "tôi" and are ignored. */
const STORAGE_PREFIX = 'salon.translation.v2.en-vi.';

export interface TranslationCache {
  /** The cached translation, or `undefined` when there is none yet. Instant, no AI call. */
  peek(text: string): string | undefined;
  /** The translation: from the cache, or one AI call (shared by callers who ask for the same line at the same time). */
  get(text: string): Promise<string>;
}

/** `translate` is the injected transport; lines in `persistentTexts` are also read from and saved to localStorage. */
export function createTranslationCache(translate: Translate, persistentTexts: readonly string[] = []): TranslationCache {
  const memory = new Map<string, string>();
  const inFlight = new Map<string, Promise<string>>();
  const persistent = new Set(persistentTexts);

  const peek = (text: string): string | undefined => {
    const cached = memory.get(text);
    if (cached !== undefined) return cached;
    if (!persistent.has(text)) return undefined;
    const saved = readStored(STORAGE_PREFIX + text);
    if (saved !== null && saved.trim() !== '') memory.set(text, saved);
    return memory.get(text);
  };

  return {
    peek,
    get(text) {
      const cached = peek(text);
      if (cached !== undefined) return Promise.resolve(cached);
      const running = inFlight.get(text);
      if (running) return running;
      const request = translate(text, 'en-to-vi')
        .then((translation) => {
          memory.set(text, translation);
          if (persistent.has(text)) writeStored(STORAGE_PREFIX + text, translation);
          return translation;
        })
        .finally(() => inFlight.delete(text));
      inFlight.set(text, request);
      return request;
    },
  };
}
