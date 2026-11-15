# Story 057b: Juice — sounds, bounce, bursts, a progress bar, companion faces

> **Epic**: Salon Besties (MVP)
> **Status**: Done (owner signs: Visual/Feel)
> **Layer**: Presentation
> **Type**: Visual/Feel
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-15

## Context

Owner playtest 3: the game feels plain. Round 3 adds the small rewards that daily learning games use (sounds, bounce,
bursts, a visible sense of progress), in Salon Besties' own look and sounds. Nothing is copied from another app. The
players are mid-age ladies: nothing needs fast reflexes, every effect is short and can be muted or reduced.

## Acceptance Criteria

- [x] **Short sound effects**, synthesized from `config/audio.json`:
  - tap (buttons)
  - correct (a good English line)
  - coin (coins collected)
  - level up (the existing sound)
  - streak (the streak moves on)
  The existing Settings sound-effects slider and mute turn them all off.
- [x] **Bouncy buttons**: a short squash on press. None with Reduce motion.
- [x] **Bursts**:
  - coins fly out when the gift is collected
  - confetti for a level-up and for a "Perfect line!"
  None with Reduce motion. Counts are in config.
- [x] **"Perfect line!"**: when the line check finds nothing to fix, a short badge pops over the chat with a small
  confetti burst, and the companion cheers.
- [x] **Appointment progress bar**: a thin bar under the phase steps. It fills as the visit moves through its phases
  and lines, and is full at the end. The step math is unit-tested; the lines per phase are in config.
- [x] **Companion expressions**: happy, cheering, thinking and a new **sad** (gentle, for a client walk-out). The
  placeholder art is simple. A sprite slot in `config/mascot.json` lets the designer's Mai and Long art drop in per
  expression, with no code change.
- [x] **Smooth on mid-range phones**: frame time is measured before and after (CPU 4× throttle) with no new long
  tasks. Bursts are a few CSS-animated elements that are removed when they finish.

- [x] Overseer nits on 057a part 2:
  - **EN | VI is compact** (36 px segments), so the account button's ✓ has a clear gap at 320 px; e2e checks
    a gap of 6 px or more.
  - **The welcome page has one companion**: the icon logo is gone, "Salon Besties" is the title in words, the big face
    stays, and the last line fits at 320×568.

## Frame time (CPU 4×, 320×568, software GPU)

Juice on, compared with Reduce motion (no effects) as the baseline on the same build, two runs each:

| Moment | Median frame, effects on | Median frame, baseline | Long tasks, on | Long tasks, baseline |
|---|---|---|---|---|
| Gift coin burst | 50 ms | 33–50 ms | 1 | 1 |
| Perfect line + confetti | 50 ms | 50 ms | 0 | 0–2 |

There are no new long tasks. The p95 and worst frames are noisy under software rendering. A burst is 10–16 elements
that are removed after 0.9 s.

## Tests

- Unit tests (`tests/juice.test.ts`):
  - the bar's step math (an equal share per phase, never completing a phase early, full at the end)
  - the "Perfect line!" rule (no fix needed, at least 3 words, never a helped line)
  - the config refuses bad values
  - the four new sounds are short
  - the sad face differs from idle and thinking
- Unit test (`tests/audio.test.ts`): the sfx list.
- e2e test (`game-flows.spec.ts` "juice"), en + vi:
  - the gap before EN | VI
  - the gift's coin burst appears and is cleaned up
  - a good line shows the badge and confetti
  - the bar fills, and reads 100 at the results

## Evidence

`production/qa/evidence/story-057b/`, en + vi at 320×568:

1. the welcome page
2. the welcome page scrolled to its end
3. the signed-in top bar
4. the gift coin burst
5. a perfect line with confetti, Mai cheering and the bar

Also `faces-placeholder.png`: happy, celebrating, thinking and sad, for Mai and Long.
