import { describe, expect, it } from 'vitest';
import { helpLanguageAfterLevelChoice } from '../game/english-level';
import { chooseEnglishLevel, getEnglishLevel, getHelpLanguage, setHelpLanguage } from '../game/settings';

/** Owner decision 2026-11-10: picking Beginner turns full Vietnamese mode on; a manual off sticks. */

describe('Beginner turns on full Vietnamese mode', () => {
  it('on the first level pick and when switching to Beginner from another level', () => {
    expect(helpLanguageAfterLevelChoice(null, 'beginner', 'tap')).toBe('full');
    expect(helpLanguageAfterLevelChoice('some', 'beginner', 'tap')).toBe('full');
  });

  it('not when re-choosing Beginner, and never for other levels', () => {
    expect(helpLanguageAfterLevelChoice('beginner', 'beginner', 'tap')).toBe('tap');
    expect(helpLanguageAfterLevelChoice(null, 'some', 'tap')).toBe('tap');
    expect(helpLanguageAfterLevelChoice('beginner', 'some', 'full')).toBe('full');
  });

  it('saves the level, and a player who turns it off keeps it off until they switch to Beginner again', () => {
    // Node has no localStorage: settings fall back to the in-memory store, which is what a fresh device looks like.
    expect(getEnglishLevel()).toBeNull();
    expect(chooseEnglishLevel('beginner')).toBe(true);
    expect(getEnglishLevel()).toBe('beginner');
    expect(getHelpLanguage()).toBe('full');

    setHelpLanguage('tap');
    expect(chooseEnglishLevel('beginner')).toBe(false);
    expect(getHelpLanguage()).toBe('tap');

    expect(chooseEnglishLevel('some')).toBe(false);
    expect(getHelpLanguage()).toBe('tap');
    expect(chooseEnglishLevel('beginner')).toBe(true);
    expect(getHelpLanguage()).toBe('full');
  });
});
