/**
 * 055 fix (overseer): the smoke checks ask whether the companion calls herself or the player "chị" when she must not.
 * Good Vietnamese also says "chị" about the CLIENTS ("các chị khách", "chị ấy") and inside a quoted or bracketed line
 * the player could say to a client ("(Màu hồng này rất hợp với chị đó.)"). Those are not about the companion or the
 * player, so they are left out before looking. Pure; used by scripts/smoke-api.mjs and its unit tests.
 */

const WORD = (w: string): RegExp => new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, 'iu');

/** The reply without quoted or bracketed lines, and without "chị" that clearly means a client or someone else. */
export function companionVoiceOnly(text: string): string {
  return text
    .replace(/"[^"]*"|“[^”]*”|'[^']*'|‘[^’]*’|\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/(các|những|mấy|vị|cô)\s+chị/giu, ' ')
    .replace(/chị\s+(khách|ấy|kia|đó|này|ta|nhân viên)/giu, ' ');
}

/** True when the companion (or the player, when addressed) is called `word` in her own words. */
export const saysWord = (text: string, word: string): boolean => WORD(word).test(companionVoiceOnly(text));
