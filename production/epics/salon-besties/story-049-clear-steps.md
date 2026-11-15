# Story 049: Clear game flow, step by step

> **Epic**: Salon Besties (MVP)
> **Status**: Done
> **Layer**: Feature
> **Type**: UI
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-15

## Context

Owner round 2: "the game part still needs to be corrected; I want a smooth experience and clear instructions/buttons."
Audience: a 45–60-year-old nail tech: words next to icons, 16 px+, one clear next step.

## Acceptance Criteria

- [x] The station's steps are a numbered path at the top of the toolbar: **1 Shape › 2 Colour › 3 Art** (Art marked
  "optional" when the client asked for no art) and ✓ Done on the right of the bottom row. The steps are the tabs: the
  player can jump between them. The current step is filled pink. (Story 051 adds 2 Length.)
- [x] A one-line instruction (16 px) for the current step ("Step 2: Pick a colour, paint each nail."), floating over
  the empty palm so the toolbar stays short and the hand stays big; a short message (spill, a fix, a tool) takes its
  place for a few seconds. Messages are 16 px now (were 12 px).
- [x] A green ✓ on a step when it matches her order (`game/nail-art/steps.ts`): shape = one of her shapes; colour = one
  of her colours with every nail fully painted; art = the extras she asked for.
- [x] **? Help / Hướng dẫn** in the bottom row opens a 3-picture how-to (drawn in code): pick shape and colour, paint
  each nail to the edges, clean the skin and tap Done.
- [x] First appointment: the companion's tour walks the same steps (Shape, Colour, Art, Done) instead of one "nails"
  card.
- [x] Every station label checked in vi: "Sticker" (unused) removed; unused redo strings removed; English step lines
  say "the client" (clients can be he/they).
- [x] Overseer follow-up on 048: with a fix left open, the companion's cheer says so kindly ("Next time, fix what the
  client asks for first") and the come-back line is "She might come back, if the next visit goes better."
- [x] The full-screen hand layout holds with the taller toolbar (the threshold is now 220 px).

Overseer follow-up 1 on 048 (spill drawn as a soft smudge, not beads) goes to story 052 with the easier clean-up.

## Test Evidence

**Status**: [x] Created

- Unit: `tests/station-steps.test.ts`; `tests/onboarding.test.ts` (the tour's new steps).
- e2e (en + vi): the path with numbers and whole words at 320 px, the instruction, the ✓ on Shape after her shape,
  the how-to with 3 pictures; the open-fix test checks the cheer and the come-back line.
- Screens at 320 px: `production/qa/evidence/story-049/`.
