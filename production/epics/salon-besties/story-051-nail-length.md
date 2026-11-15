# Story 051: Nail length

> **Epic**: Salon Besties (MVP)
> **Status**: Done
> **Layer**: Feature
> **Type**: Gameplay
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-15

## Context

Owner round 2: "there is no option to choose the nail length; some want short, some want long."

## Acceptance Criteria

- [x] A **Length** step: Short / Medium / Long, plus Extra long for hard clients (or when she asks for it), each a
  drawn fingertip with its word. The nail is drawn longer past the fingertip (the cuticle stays put, the free edge
  grows); the hand keeps room for the longest length on offer so it never jumps (`config/nail-art.json` lengths).
- [x] The path is now 1 Shape › 2 Length › 3 Colour › 4 Art (number over word so four fit 320 px), with the ✓ when
  the length matches her order; the how-to and the walk-through include it.
- [x] Every client's order has a length (client and scenario data); the order chip shows it ("Almond · Long /
  Extra long"); the AI client and the grader hear it ("short or medium nails").
- [x] Scoring: length weight 15 in `matchWeights`; her length scores 100, 45 less per step away.
- [x] The fix flow can change the length: "Can you make them a little shorter, please?" (and the same ask in her own
  words) opens a length fix with the lengths in the Fix row; shorter (or longer, if she asked for longer) fixes it.
  She never asks for a length that can't be done (shorter than short).

OWNER: lengths drawn at 1 / 1.22 / 1.45 / 1.7 × a short nail, the length weight (15) and the 45-points-a-step are in
`config/nail-art.json` and `game/nail-art/match.ts`.

Note (overseer on 049): the "Almond shape in red, please!" bubble in the 049/051 shots is the evidence script's mock
reply. In a real game the AI client is given the same request the order chip shows.

## Test Evidence

**Status**: [x] Created

- Unit: `tests/nail-art-match.test.ts` (length score, the nail grows past the fingertip, bad config),
  `tests/fix-requests.test.ts` (length fixes, lines that only sound like them), `tests/station-steps.test.ts`.
- e2e (en + vi): the Length step, the order chip, the ✓, "a little shorter" → Fix it with lengths → Medium → her
  thanks; the 049 steps test now checks four steps.
- Screens at 320 px: `production/qa/evidence/story-051/`.
