import { readStored, writeStored } from './safe-storage';
import type { Translate } from './types';

/**
 * English-to-Vietnamese translations of client lines, cached per line text. A line is never sent to the AI twice in a
 * session. Fixed lines (the persona's opening line) are also saved on the device. Story: story-010.
 */

/**
 * v3 (story 036): translations are kept per client, because the pronouns follow who is speaking (Tom says "anh",
 * Brenda "chị"). v2 (one per line, always chị/em) and older are ignored.
 */
const STORAGE_PREFIX = 'salon.translation.v3.en-vi.';

export interface TranslationCache {
  /** The cached translation, or `undefined` when there is none yet. Instant, no AI call. */
  peek(text: string): string | undefined;
  /** The translation: from the cache, or one AI call (shared by callers who ask for the same line at the same time). */
  get(text: string): Promise<string>;
}

/** `translate` is the injected transport; lines in `persistentTexts` are also read from and saved to localStorage. */
export function createTranslationCache(translate: Translate, persistentTexts: readonly string[] = [], currentClientId: () => string | undefined = () => undefined): TranslationCache {
  const memory = new Map<string, string>();
  const inFlight = new Map<string, Promise<string>>();
  const persistent = new Set(persistentTexts);

  /** One entry per client and line. */
  const keyOf = (text: string): string => `${currentClientId() ?? ''}|${text}`;
  const peek = (text: string): string | undefined => {
    const key = keyOf(text);
    const cached = memory.get(key);
    if (cached !== undefined) return cached;
    if (!persistent.has(text)) return undefined;
    const saved = readStored(STORAGE_PREFIX + key);
    if (saved !== null && saved.trim() !== '') memory.set(key, saved);
    return memory.get(key);
  };

  return {
    peek,
    get(text) {
      const cached = peek(text);
      if (cached !== undefined) return Promise.resolve(cached);
      const key = keyOf(text);
      const running = inFlight.get(key);
      if (running) return running;
      const request = translate(text, 'en-to-vi', undefined, currentClientId())
        .then((translation) => {
          memory.set(key, translation);
          if (persistent.has(text)) writeStored(STORAGE_PREFIX + key, translation);
          return translation;
        })
        .finally(() => inFlight.delete(key));
      inFlight.set(key, request);
      return request;
    },
  };
}
