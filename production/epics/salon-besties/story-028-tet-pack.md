# Story 028: Tết pack (seasonal)

> **Epic**: Salon Besties (MVP)
> **Status**: Complete (review)
> **Layer**: Feature
> **Type**: Feature
> **Estimate**: M
> **Manifest Version**: N/A (minimal — no control manifest)
> **Last Updated**: 2026-11-13

## Context

Owner (via overseer, 2026-11-13): a seasonal pack around Lunar New Year, all free, never real money. Data-driven
and date-gated, with a dev override so it can be seen any day.

## Acceptance Criteria

- [x] `config/seasons.json` holds the season: its date windows (Tết 2027, 2028, 2029), name, polishes, sticker,
  outfit and daily gift. Active only inside a window (the player's local date), or with the dev override
  (`?season=tet` in a dev build only; production ignores it).
- [x] While active: two free polishes (lucky red, lucky gold) in the station palette; a **hoa mai** sticker (five
  yellow petals) in the sticker cycle. Outside the season they are not offered (designs already painted keep them).
- [x] An **áo dài-inspired** companion outfit (placeholder: red with a gold collar, outfit slot), given free with
  the first lì xì and kept after the season.
- [x] **Lì xì** daily gift: once a day during the season, the title offers a red envelope with a few tips (in-game
  only) and a short wish from the companion (en/vi, through the 025b tokens). Never sold, never real money.
- [x] Unit tests (windows and override, daily gift once a day, outfit kept, palette/sticker gating); evidence en + vi
  at 320 px with the override. Folded in: story 027's cue waits for the stage (watched failing first).

## Test Evidence

**Status**: [x] Created — `tests/seasons.test.ts` (5 tests: windows, dev override only in dev, bad data,
palette/sticker gating, the daily lì xì once a day with the outfit kept and wearable). Screens:
`production/qa/evidence/story-028-tet-pack/` (en + vi, 320 px, `?season=tet` on the dev server): the lì xì card, opened
(+8 tips, áo dài), the companion wearing it, the station with Lucky red / Lucky gold and a hoa mai sticker.
Cue gate (027): `vi-320-03-before-stage.png` / `vi-320-04-after-stage.png` in story-027's evidence; the check failed
before the fix (cue visible with no canvas) and passes after.

## Completion Notes (2026-11-13)

- `config/seasons.json` + `game/seasons.ts`; Tết windows: 2027-01-30…02-20, 2028-01-19…02-09, 2029-02-06…02-27.
- Seasonal colours live in `nail-art.json` (not shop items) and are filtered by the season; `hoa-mai` is a new sticker
  kind drawn by the station; `ao-dai-red` is an outfit accessory with the new `gift` unlock rule (owned → wearable).
- **OWNER:** the áo dài is a placeholder (red body, gold mandarin collar) for the designer; the title shows the
  companion's head only, so the outfit shows in the chat bubble and dress-up, not on the title.
- **OWNER:** gift size (8 tips a day) and the windows are in `config/seasons.json`.
