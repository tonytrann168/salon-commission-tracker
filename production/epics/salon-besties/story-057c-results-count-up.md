# Story 057c: The results count up

> **Epic**: Salon Besties (MVP)
> **Status**: Done (owner signs: Visual/Feel)
> **Layer**: Presentation
> **Type**: Visual/Feel
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-15

## Context

Round 3, the last story: the end of an appointment should feel like a reward. Before this story, the XP, tips and
streak came as one plain line below the review.

## Acceptance Criteria

- [x] **A rewards card opens the results**, at the top, before the existing polaroid. In order:
  1. the stars
  2. +XP, +coins and +$ tips counting up together from 0 (short: under a second)
  3. the streak moving on (🔥 3 → 4) with the streak sound, when this is the first appointment today
  4. the existing polaroid, payment moment, review and so on, below it
- [x] **Fast to skip**: a tap on the card shows the final numbers at once. With Reduce motion they show at once, and
  nothing counts.
- [x] The card keeps the rank bar and the daily-challenge streak line from the old progress section.
- [x] The timings are in config (`config/juice.json`: `results`). The count-up maths is unit-tested.
- [x] 320×568 en + vi: one row of four tiles that fits.

## Tests

- Unit tests (`tests/juice.test.ts`): the count-up value over time (eased, starting at 0, exact at the end, whole
  numbers).
- e2e test (`game-flows.spec.ts` "results count up"), en + vi:
  - the card is the first thing in the results
  - after a tap the four tiles show the final stars, XP, coins and tips
  - the streak chip shows 0 → 1 on the first appointment of the day
  - the card fits at 320 px

## Evidence

`production/qa/evidence/story-057c/`, en + vi at 320×568: the results top (the rewards card above the polaroid) and the done state with the streak chip. With the instant test grading, the count (0.9 s) has finished before the first shot; it is visible on a phone.
