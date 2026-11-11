import { describe, expect, it } from 'vitest';
import en from '../game/i18n/en.json';
import vi from '../game/i18n/vi.json';
import { FRESH_TOUR, TOUR_STEPS, afterStep, loadTour, nextStep, parseOnboardingConfig, parseTour, replayTour, saveTour, skipTour } from '../game/onboarding';

/** Story 015: the first-appointment tour's state. */

describe('the first-appointment tour', () => {
  it('goes through the steps in order: reply, help, mood, nails, results', () => {
    expect(TOUR_STEPS.map((s) => s.id)).toEqual(['reply', 'help', 'mood', 'nails', 'results']);
    let state = FRESH_TOUR;
    const order: string[] = [];
    for (let step = nextStep(state); step; step = nextStep(state)) {
      order.push(step.id);
      state = afterStep(state, step.id);
    }
    expect(order).toEqual(['reply', 'help', 'mood', 'nails', 'results']);
    expect(state.done).toBe(true);
  });

  it('shows only once, stops when skipped, and starts again after Replay', () => {
    saveTour(afterStep(FRESH_TOUR, 'reply'));
    expect(nextStep(loadTour())?.id).toBe('help');
    saveTour(skipTour(loadTour()));
    expect(nextStep(loadTour())).toBeNull();
    replayTour();
    expect(nextStep(loadTour())?.id).toBe('reply');
  });

  it('reads a damaged save safely and refuses a bad step list', () => {
    expect(parseTour('{oops')).toEqual(FRESH_TOUR);
    expect(parseTour(JSON.stringify({ done: 'yes', seen: ['reply', 3] }))).toEqual({ done: false, seen: ['reply'] });
    expect(() => parseOnboardingConfig({ steps: [{ id: 'a' }] })).toThrow(/onboarding\.json: "steps\[0\]"/);
    expect(() => parseOnboardingConfig({ steps: [{ id: 'a', target: '.x' }, { id: 'a', target: '.y' }] })).toThrow(/unique/);
  });

  it('every step has normal and Beginner wording in English and Vietnamese', () => {
    for (const step of TOUR_STEPS) {
      for (const key of [`tour.${step.id}`, `tour.${step.id}Simple`]) {
        expect((en as Record<string, string>)[key], key).toBeTruthy();
        expect((vi as Record<string, string>)[key], key).toBeTruthy();
      }
      expect((en as Record<string, string>)[`tour.${step.id}Simple`]!.length).toBeLessThan((en as Record<string, string>)[`tour.${step.id}`]!.length);
    }
  });
});
