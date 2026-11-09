import { Ticker } from 'pixi.js';
import type { TalkingConfig } from '../portraits/portrait';

/** Progressive text reveal at speaking pace, on Pixi's shared ticker. Story: story-009 (talking state). */

const SENTENCE_END = '.!?…';
const CLAUSE_END = ',;:';

export interface TextReveal {
  /** Show all the remaining text now and finish (calls `onDone`). Does nothing once finished or cancelled. */
  finish(): void;
  /** Stop without showing the rest and without calling `onDone`. */
  cancel(): void;
}

/** Pause owed after the character at `index`: only when it ends a word (next is a space or newline). */
function pauseAfter(text: string, index: number, config: TalkingConfig): number {
  const next = text[index + 1];
  if (next !== ' ' && next !== '\n') return 0;
  const char = text.charAt(index);
  if (SENTENCE_END.includes(char)) return config.sentencePauseMs;
  if (CLAUSE_END.includes(char)) return config.clausePauseMs;
  return 0;
}

/**
 * Append `text` to `node` a few characters per frame (time-based, so frame-rate independent). `onProgress` runs after
 * each append; `onDone` runs once when everything is shown. The ticker runs only while text is still being revealed.
 */
export function startTextReveal(
  node: Text,
  text: string,
  config: TalkingConfig,
  onProgress: () => void,
  onDone: () => void,
): TextReveal {
  const charMs = 1000 / config.charsPerSecond;
  let index = 0;
  let budget = 0;
  let active = true;

  const end = (): void => {
    active = false;
    Ticker.shared.remove(tick);
  };

  function tick(ticker: Ticker): void {
    budget += ticker.deltaMS;
    const start = index;
    while (index < text.length) {
      const cost = charMs + (index > 0 ? pauseAfter(text, index - 1, config) : 0);
      if (budget < cost) break;
      budget -= cost;
      index++;
    }
    if (index > start) {
      node.appendData(text.slice(start, index));
      onProgress();
    }
    if (index >= text.length) {
      end();
      onDone();
    }
  }

  Ticker.shared.add(tick);

  return {
    finish() {
      if (!active) return;
      end();
      node.appendData(text.slice(index));
      index = text.length;
      onProgress();
      onDone();
    },
    cancel() {
      if (active) end();
    },
  };
}
