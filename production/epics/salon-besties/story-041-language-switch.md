# Story 041: Home page language switch

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

- [x] A visible EN | VI toggle in the top corner of the title screen switches the whole interface language at once (the same setting as full Vietnamese mode) and is remembered.
- [x] The current language is marked (aria-pressed); the labels are never translated (EN, VI).
- [x] e2e: switching changes the menu's text immediately and survives a reload (en + vi).

## Test Evidence

**Status**: [x] e2e (en + vi): the switch changes the menu's text and <html lang> at once, marks the current language, and survives a reload; the switch and the tagline stay inside the screen and clear of Start. Screens: `production/qa/evidence/story-041-042-title/` (en + vi, 320 px).

## Completion Notes (2026-11-14)

- 041 and 042 share the title menu and were committed together. The tagline moved from the canvas to HTML; one line per visit (page load); the first-time greeting no longer ends with "Let's practice English together!".
- **OWNER:** the 24 lines are in `src/game/config/taglines.json`: pick favourites, cut or add.
