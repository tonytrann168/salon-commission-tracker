# Story 040: Companion help stands out

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review)
> **Layer**: Feature
> **Type**: UI
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-14

## Context

Owner playtest (2026-11-13).

## Acceptance Criteria

- [x] A waiting tip shows as a pulsing glow ring around the companion's bubble plus a small speech-tail label ("Tip for you! 💡" / "{Self} có mẹo nè! 💡", tokens) on the side away from the screen edge; the count stays small in the corner.
- [x] The bubble bounces once when a new tip arrives. Reduced motion: a static ring, no bounce.
- [x] The label and ring go away when the tips are opened. Unit test for the cue state; evidence en + vi at 320 px.

## Test Evidence

**Status**: [x] `tests/mai-bubble.test.ts` (the cue state). e2e (en + vi): a tip → ring + label inside the screen →
opening the companion clears both. Screens: `production/qa/evidence/story-040-tip-cue/` (chat and service, 320 px).

## Completion Notes (2026-11-14)

- Found by the new e2e test: on the full-screen service (035) the painting layer covered the companion's bubble, so she
  could not be tapped while painting. Her layer is now above it.
- In the chat view the label partly covers the client's face while a tip waits (it goes when opened).
