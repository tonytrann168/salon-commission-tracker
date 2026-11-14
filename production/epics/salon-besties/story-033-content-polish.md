# Story 033: Content polish

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review)
> **Layer**: Content
> **Type**: Config/Data
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-13

## Context

Overseer (release-candidate push): less repetition, more to learn, two more situations.

## Acceptance Criteria

- [x] **Anti-repetition**: the companion's canned corner lines never repeat within the last N picks (N in
  `config/corner.json`, kept across visits on the device); the same picker serves the pedicure reaction lines.
- [x] **Starter phrases**: 10 useful salon phrases per phrasebook topic (greeting, consultation, price, booking,
  problems), each with Vietnamese, in `config/phrase-starters.json`; shown in the phrasebook as "Useful phrases" with
  Practice, apart from the player's own phrases.
- [x] **Two scenarios**: "Rainy day" (wet, cold, worried about chipping; umbrella, quick-dry top coat) and "Colour
  redo" (after painting, the client is unhappy with the colour and asks for a redo mid-appointment; the station takes
  one more Done, and the latest design counts).
- [x] Unit tests (picker never repeats within N and is fair over time; starters complete, no duplicates; scenarios
  parse; the redo allows exactly one more Done); evidence en + vi at 320 px.

## Test Evidence

**Status**: [x] `tests/content-polish.test.ts` (5 tests: no repeat within N over 500 picks, fairness, corner window,
starters complete with no duplicates, new scenarios + `redo` validation); updated scenario and prep tests. e2e (en + vi):
colour redo (Done → ↺ Redo → ✓ → no more), phrasebook starters (5 topics × 10). Screens:
`production/qa/evidence/story-033-content-polish/`.

## Completion Notes (2026-11-13)

- `game/fresh-lines.ts` (pickFresh + recent picks per kind in `salon.lines.v1`); corner `noRepeatWithin: 3`; pedicure
  reactions avoid the last ones too.
- `config/phrase-starters.json` + `game/learning/starters.ts`; the phrasebook shows "Useful phrases" folds with Practice.
- `scenarios/rainy-day.json` (easy+), `scenarios/colour-redo.json` (medium+, `redo: true` → station `redos: 1`).
- **OWNER:** have a Vietnamese speaker check the 50 starter translations (the client is "chị" in them).
