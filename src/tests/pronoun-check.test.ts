import { describe, expect, it } from 'vitest';
import { companionVoiceOnly, saysWord } from '../game/pronoun-check';

/** 055 fix: the smoke checks never fail on good Vietnamese that says "chị" about a client. */

describe('the companion pronoun check', () => {
  it('passes the two real replies that failed as false alarms', () => {
    // Real (overseer, smoke:api): "chị" meant the clients, and a line the player could say to a client, in brackets.
    const younger = 'Dạ, em cũng thích màu hồng nhạt lắm anh! Các chị khách hay chọn màu này cho mùa hè đó.';
    const male = 'Anh cũng thích màu hồng nhạt đó em! Em thử nói với khách thế này nha: (Màu hồng này rất hợp với chị đó.)';
    expect(saysWord(younger, 'chị')).toBe(false);
    expect(saysWord(younger, 'em') && saysWord(younger, 'anh')).toBe(true);
    expect(saysWord(male, 'chị')).toBe(false);
    expect(saysWord(male, 'anh')).toBe(true);
  });

  it('still catches the companion calling herself or the player "chị"', () => {
    expect(saysWord('Chị cũng thích màu hồng nhạt đó em!', 'chị')).toBe(true);
    expect(saysWord('Em thích màu nào hả chị?', 'chị')).toBe(true);
  });

  it('leaves out "chị ấy", "những chị", quotes and brackets only', () => {
    expect(companionVoiceOnly('Chị ấy thích đỏ. "Chị muốn màu gì?" [chị] những chị khách').includes('chị')).toBe(false);
    expect(saysWord('Chị ấy đẹp, còn chị thì sao?', 'chị')).toBe(true);
  });
});
