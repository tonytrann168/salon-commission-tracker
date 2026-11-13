# Story 026: Soak & scrub — the pedicure prep step

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review)
> **Layer**: Feature
> **Type**: Feature
> **Estimate**: S
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-13

## Context

Owner (via overseer, 2026-11-13), from story 024's open question: a pedicure starts with a short prep before
painting. Swipe to scrub, a soak timer, a client reaction line, and an optional skip for easy clients.

## Acceptance Criteria

- [x] For a pedicure (`service: "pedicure"`), the first time the station opens it shows the prep step over the foot
  area instead of the paint tools: **Soak** (tap Start; a timer fills, `soakSeconds` from data) then **Scrub** (swipe
  back and forth over the foot; a bar fills with the distance swiped, `scrubWidths` × the area's width).
- [x] Finishing gives the client a small mood lift (`moodBonus`) and a short **reaction line** from data (English,
  with Vietnamese help when full Vietnamese mode is on). Then the paint tools open as before.
- [x] **Skip** is offered only for the difficulties listed in data (easy): no bonus, no penalty, a neutral line.
- [x] Manicures are unchanged. Reopening the station later never repeats the prep.
- [x] Logic in a small state machine with an explicit transition table, timed with delta time, all values in
  `config/pedicure-prep.json`; unit tests for it. Reduced motion: no bubble animation. Tap-only alternative for
  scrub (a "Scrub" button that counts as a swipe) so it works without swiping (switch access, screen readers).
- [x] 320 px: fits inside the existing foot area; evidence in en + vi.

## Test Evidence

**Status**: [x] Created — `tests/pedicure-prep.test.ts` (4 tests: data file, soak by delta time whatever the frame
rate, scrub by distance and taps, skip only for easy clients and final states). Screens:
`production/qa/evidence/story-026-soak-scrub/` (en: swiping; vi: the tap-only Scrub button), 320 px: soak ready, soaking,
scrubbing, the client's reaction, paint tools back. Both: mood 67 → 71, no overflow, prep not repeated on reopen.

## Completion Notes (2026-11-13)

- `nail-art/prep.ts` (state machine + transition table), `ui/pedicure-prep.ts` (overlay in the foot area; the paint
  tools are hidden while it runs), `config/pedicure-prep.json` (4 s soak, 8 widths of swiping or 8 taps, +4 mood).
- Found while taking evidence: pointer capture on the overlay swallowed taps on the Scrub/Skip buttons; presses on
  buttons are no longer captured.
- **OWNER:** reaction lines are the client speaking to the stylist (chị/em in the vi help); review the wording.
