# Story 017: Harder nail requests (art tools, both hands)

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review)
> **Layer**: Feature
> **Type**: Feature
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-10

## Context

Owner request via the overseer, 2026-11-10: medium and hard clients should test the art tools, and hard clients can ask for both hands. The hand is already data (story 005 follow-up).

## Acceptance Criteria

- [x] Medium and hard clients ask for designs that use the art tools (gradient, gems, stickers, specific shapes): Priya (almond coral fading at the tips, a few gems), Kim (square mint, a few gems), Brenda (round hot pink fading at the tips, a couple of heart stickers, both hands), Victoria (stiletto black, lots of gems, both hands). Dana stays the simple default; Tom wants a natural manicure on both hands.
- [x] Hard clients can ask for both hands (`nailRequest.hands: 2`, 10 nails), with a time-pressure note in their persona (Victoria, Tom).
- [x] matchDesign covers both hands: coverage and neatness average over all 10 nails, so one hand done scores lower; the client and the review hear "both hands: …".
- [x] The station shows one hand at a time with a ✋ switch (only for two-hand clients); the left hand is the right hand mirrored from the same finger data.
- [x] 320 px chat space unchanged (213 px, latest messages visible); ✓ Done stays on screen.

## Test Evidence

**Status**: [x] `src/tests/nail-art-match.test.ts` ("harder nail requests": art tools per difficulty, two-hand clients are hard, bad `hands` refused, 10 nails, mirroring, one hand done scores lower, "both hands" in the descriptions) and `production/qa/evidence/story-017-both-hands/`.

## Completion Notes (2026-11-10)

- **OWNER:** the decoration levels ("few" 1-4, "lots" 5-15) count across the whole design, so with both hands "lots" is easier to reach per nail. Keep, or double the ranges for two hands?
- **OWNER:** which clients should ask for both hands (now Brenda, Victoria, Tom).
- Note: this story file was written after the build, not before (the overseer asked for story files first).
