# Story 042: Catchy rotating taglines

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

- [x] The title shows a catchy line that changes each visit: 12 in English and 12 in Vietnamese (fun + nail salon + learn English + level up), in data, with the companion tokens where the companion speaks.
- [x] No repeat of the last 3 (kept on the device, story 033's picker).
- [x] The line is plain HTML (it shows before PixiJS and follows the language switch at once). Unit test (12 each, no duplicates, tokens resolve, no repeats); evidence en + vi.

## Test Evidence

**Status**: [x] `tests/title.test.ts` (3 tests: 12 + 12 lines with no duplicates, no repeat of the last 3 over 300 visits, the same pick in both languages with tokens filled). e2e: the tagline shows and changes language with the switch. Screens: `production/qa/evidence/story-041-042-title/` (en + vi, 320 px).

## Completion Notes (2026-11-14)

- 041 and 042 share the title menu and were committed together. The tagline moved from the canvas to HTML; one line per visit (page load); the first-time greeting no longer ends with "Let's practice English together!".
- **OWNER:** the 24 lines are in `src/game/config/taglines.json`: pick favourites, cut or add.
