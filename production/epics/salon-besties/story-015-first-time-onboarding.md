# Story 015: First-time onboarding with Mai

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review)
> **Layer**: Feature
> **Type**: UI
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-10

## Context

**GDD**: `design/game-brief.md` (the companion pillar; testers get the link with no one to explain the game)
**Requirement**: owner request via the overseer, 2026-11-10.

---

## Acceptance Criteria

- [x] On the first appointment the companion (name and gender from story 013) walks the player through it with short coach marks, one at a time, each pointing at the real control:
  1. the chat and how to reply (type, then Send; or the mic),
  2. Help me say it and tap-to-translate,
  3. the mood bar,
  4. the nail station: paint, Clean up, Done,
  5. the results.
- [x] Each mark shows the companion's face, one or two short lines, Next / Got it, and "Skip tour".
- [x] Skippable at any step; shown only once; "Replay the tour" in Settings shows it again on the next appointment.
- [x] Beginner English level gets extra-simple wording; full Vietnamese mode shows Vietnamese.
- [x] Works at 320 px in en and vi: a mark never pushes the layout and never hides the control it points at.
- [x] No AI calls of its own; nothing blocks play (the player can keep chatting while a mark shows).
- [x] The step order and wording live in config/i18n, not code.

## Implementation Notes

- The tour watches the page for each step's target (a selector in config) and shows the step once that target is on screen and the step before it is done. It does not touch the appointment's logic.

## Out of Scope

- Final companion art (story 013, designer).

## Test Evidence

**Required evidence**: unit tests for the tour state (order, once only, skip, replay) and 320 px screenshots in en and vi of each step.

**Status**: [x] `src/tests/onboarding.test.ts` and `production/qa/evidence/story-015-onboarding/`.

## Completion Notes (2026-11-10)

- `game/onboarding.ts` (pure state: `salon.tour.v1`), `config/onboarding.json` (step order and the control each points at), `game/ui/tour.ts` (coach marks: the companion's face and name, one or two lines, Next / Got it, Skip tour, "n of 5").
- The tour watches the page and shows a step once its control is on screen and the previous step is dismissed; it places its card below the control if it fits, else above, so it never covers it. Only the card takes taps.
- It steps aside while a celebration card (rank-up, badge) is showing.
- Beginner (English) gets the short wording; full Vietnamese mode shows Vietnamese.
- Settings → "Replay the tour" shows it again on the next appointment.
- **OWNER:** wording of the five steps (en and vi), and whether a 6th step for the companion bubble (💡 hints) is wanted.

## Dependencies

- Depends on: story 013 (companion name and gender), story 005 (nail station), story 002 (results).
