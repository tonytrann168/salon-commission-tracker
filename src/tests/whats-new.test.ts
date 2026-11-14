import { describe, expect, it } from 'vitest';
import pkg from '../package.json';
import { WHATS_NEW, notesFor, parseWhatsNew, shouldShowWhatsNew } from '../game/whats-new';
import { APP_VERSION } from '../game/feedback';

/** Story 034: the release candidate's version and its What's new notes. */

describe('release 1.0.0-rc.1', () => {
  it('has one version everywhere (package.json → the app, feedback and error reports)', () => {
    expect(pkg.version).toBe('1.0.0-rc.1');
    expect(APP_VERSION).toBe(pkg.version);
  });

  it('has notes for this version in English and Vietnamese', () => {
    const notes = notesFor(APP_VERSION);
    expect(notes?.items.length).toBeGreaterThanOrEqual(3);
    expect(notes!.items.every((item) => item.en.trim() && item.vi.trim())).toBe(true);
    expect(() => parseWhatsNew({ releases: [{ version: 'x', items: [{ en: 'only English' }] }] })).toThrow();
  });

  it('shows once after an update, never on a first run, never for a version without notes', () => {
    expect(shouldShowWhatsNew('1.0.0-rc.1', '0.1.0', false)).toBe(true);
    expect(shouldShowWhatsNew('1.0.0-rc.1', null, false)).toBe(true);
    expect(shouldShowWhatsNew('1.0.0-rc.1', '1.0.0-rc.1', false)).toBe(false);
    expect(shouldShowWhatsNew('1.0.0-rc.1', null, true)).toBe(false);
    expect(shouldShowWhatsNew('9.9.9', '0.1.0', false, WHATS_NEW)).toBe(false);
  });
});
